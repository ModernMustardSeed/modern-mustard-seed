import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';
import { roomRegistration } from '@/lib/bootcamp/room-auth';
import { askQuestion, QUESTION_MAX } from '@/lib/bootcamp/stage';
import { isLive, questionSession, roomNow } from '@/lib/bootcamp/sessions';
import { countEventsToday, recordEvent } from '@/lib/bootcamp/store';

/**
 * The questions box. During a session a question joins that session's queue
 * on the Stage tab, where Sarah reads them live. Between sessions it queues
 * for the next session the person has a seat in, and Sarah gets a note (the
 * first thirty a day), because a question asked on a Saturday deserves to be
 * seen before Tuesday.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTES_PER_DAY = 30;

export async function POST(req: Request) {
  let body: { id?: string; k?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const text = String(body.text ?? '').trim();
  if (text.length < 3) return NextResponse.json({ error: 'A question, a few words at least.' }, { status: 400 });
  if (text.length > QUESTION_MAX) return NextResponse.json({ error: `Keep it under ${QUESTION_MAX} characters.` }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const reg = await roomRegistration(sb, body.id, body.k);
    if (!reg) return NextResponse.json({ error: 'This room link is not valid.' }, { status: 404 });
    const now = roomNow();
    const session = questionSession(reg.tier, now);
    if (!session) return NextResponse.json({ error: 'There is no session to ask into.' }, { status: 400 });

    const result = await askQuestion(sb, reg, session.key, text);
    if (result === 'limit') return NextResponse.json({ error: 'That is five for this session. Sarah is working through them.' }, { status: 429 });

    const live = isLive(session, now);
    if (!live && (await countEventsToday(sb, 'room:question-note')) < NOTES_PER_DAY) {
      const note = await sendViaResend({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: reg.email,
        subject: `Bootcamp question for ${session.label}: ${reg.name ?? reg.email}`,
        html: leadNotification({
          type: 'Contact',
          name: reg.name ?? reg.email,
          email: reg.email,
          fields: [
            { label: 'Seat', value: reg.tier },
            { label: 'For', value: session.label },
            ...(reg.business ? [{ label: 'Business', value: reg.business }] : []),
            { label: 'Stage', value: `${SITE.url}/admin/bootcamp#stage`, isLink: true },
          ],
          message: text,
          suggestedAction: `Queued on the Stage tab for ${session.label}. Reply to this email to answer now instead.`,
        }),
      });
      if (note.ok) await recordEvent(sb, 'room:question-note', { email: reg.email, registrationId: reg.id, detail: { session: session.key } });
    }

    return NextResponse.json({ ok: true, session: session.key, label: session.label, live });
  } catch (err) {
    console.error('bootcamp ask failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'That did not go through. Try once more.' }, { status: 500 });
  }
}
