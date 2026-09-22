import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { resendClient } from '@/lib/send-email';
import { getProspect, logEvent, updateProspect } from '@/lib/partner-desk/store';
import { SEQUENCE, letterFor } from '@/lib/partner-desk/letters';

export const runtime = 'nodejs';

const FROM = 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>';
const DAY = 86_400_000;

/**
 * Send the current letter to one prospect, by hand, from Sarah's own address.
 *
 * One-to-one mail on the root domain: no pixel, no unsubscribe header, no bulk.
 * The desk passes the subject and body Sarah read (edited or not); the route
 * never sends a template she has not seen. On success the step advances, the
 * status goes to emailed, and next_at says when the following letter is due.
 * The desk shows "due"; nothing sends on its own.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const p = await getProspect(id);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!p.email) return NextResponse.json({ error: `${p.name} has no email on file. Add one, or send a DM instead.` }, { status: 400 });
  if (p.status === 'joined' || p.status === 'passed') return NextResponse.json({ error: `${p.name} is marked ${p.status}. Nothing more to send.` }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 503 });

  let body: { subject?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const fallback = letterFor(p, p.step);
  if (!fallback) return NextResponse.json({ error: `All ${SEQUENCE.length} letters have gone to ${p.name}. Mark them replied, joined or passed.` }, { status: 400 });
  const subject = (body.subject || fallback.subject).trim().slice(0, 200);
  const text = (body.body || fallback.body).trim();
  if (!subject || !text) return NextResponse.json({ error: 'The letter is empty.' }, { status: 400 });

  try {
    const resend = resendClient();
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: p.email,
      replyTo: 'sarah@modernmustardseed.com',
      subject,
      text,
    });
    if (error) return NextResponse.json({ error: error.message || String(error) }, { status: 502 });

    const nextStep = p.step + 1;
    const next = SEQUENCE[nextStep];
    const now = Date.now();
    await logEvent(id, { type: 'email', detail: `${fallback.label} sent: ${subject}` });
    const updated = await updateProspect(id, {
      status: 'emailed',
      step: nextStep,
      last_contacted_at: new Date(now).toISOString(),
      next_at: next ? new Date(now + next.delayDays * DAY).toISOString() : null,
    });
    return NextResponse.json({ ok: true, id: data?.id, prospect: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 });
  }
}
