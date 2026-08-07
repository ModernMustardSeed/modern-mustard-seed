import { NextResponse } from 'next/server';
import { completeInterview, getInterview, updateMember } from '@/lib/hundredfold-store';
import { interviewCoverage, type Turn } from '@/lib/hundredfold-interview';
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * The interview is over.
 *
 * Voice calls post their whole transcript here when the call ends; the typed
 * path posts nothing extra because every turn was already saved. Either way the
 * row closes, the member moves to 'interviewed', and Sarah gets told.
 *
 * The heavy synthesis (answers, deep roadmap, offer, build plan) does NOT run
 * here. Three high-effort model calls in sequence run six to eleven minutes,
 * which no serverless request survives, and each one is expensive enough to
 * deserve its own retry. The desk runs them as three steps.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { transcript?: Turn[]; durationSeconds?: number; abandoned?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const interview = await getInterview(id);
  if (!interview) return NextResponse.json({ error: 'That interview has expired.' }, { status: 404 });

  const incoming = Array.isArray(body.transcript) ? body.transcript : null;
  const transcript = incoming?.length ? incoming : interview.transcript ?? [];

  // A call that dropped after four questions is not an interview. Marking it
  // complete would let a confident twelve month plan get built from almost
  // nothing, so a short one is stored and flagged rather than promoted.
  const ownerTurns = transcript.filter((t) => t.role === 'owner').length;
  const tooShort = body.abandoned === true || ownerTurns < 8;

  await completeInterview(id, {
    transcript,
    duration_seconds: typeof body.durationSeconds === 'number' ? Math.round(body.durationSeconds) : undefined,
  });

  if (tooShort) {
    await updateMember(interview.member_id ?? '', { status: 'applicant' }).catch(() => {});
    return NextResponse.json({
      ok: true,
      short: true,
      ownerTurns,
      message:
        'Saved, but that was a short one. Pick it back up whenever you like and Mr. Mustard will carry on from where you stopped.',
    });
  }

  if (interview.member_id) {
    await updateMember(interview.member_id, { status: 'interviewed' });
  }

  // Sarah wants to know the moment one of these lands. This is the hottest lead
  // this business produces: they just spent twenty minutes answering questions
  // about their money.
  try {
    if (process.env.RESEND_API_KEY) {
      const coverage = interviewCoverage(interview.answers ?? {});
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: interview.email ?? undefined,
        subject: `HUNDREDFOLD interview finished: ${interview.business_name ?? interview.email ?? 'someone'}`,
        html: leadNotification({
          type: 'AI Audit',
          name: interview.business_name ?? 'Owner',
          email: interview.email ?? 'unknown',
          fields: [
            { label: 'Business', value: interview.business_name ?? 'not given' },
            { label: 'Channel', value: interview.channel },
            { label: 'Their answers', value: `${ownerTurns} turns` },
            { label: 'Questions covered', value: `${coverage.answered}/${coverage.total}` },
            { label: 'Open it', value: `${SITE.url}/admin/hundredfold/${interview.member_id ?? ''}` },
          ],
          message: 'They finished the interview. Build the plan, then take them the offer.',
          suggestedAction: 'Run the three synthesis steps in the Hundredfold desk, read the plan, then call them.',
        }),
      });
    }
  } catch (err) {
    console.error('hundredfold: completion notify failed', err);
  }

  return NextResponse.json({ ok: true, short: false, ownerTurns });
}
