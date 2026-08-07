import { NextResponse } from 'next/server';
import { appendTurns, getInterview, saveInterviewProgress } from '@/lib/hundredfold-store';
import { nextCoachTurn } from '@/lib/hundredfold-synthesis';
import { QUESTIONS, coveredKeys, type Turn } from '@/lib/hundredfold-interview';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * One turn of the typed interview.
 *
 * The owner's answer goes in, Mr. Mustard's next line comes out. The whole
 * conversation lives in the row rather than in the browser, so a closed tab
 * costs them nothing: they reopen the link and he is still mid-sentence.
 *
 * The systemPrompt is sent by the client (it was handed out at start) so his
 * character and their website context survive a page reload without another
 * round trip to rebuild it.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { answer?: string; systemPrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const interview = await getInterview(id);
  if (!interview) return NextResponse.json({ error: 'That interview has expired.' }, { status: 404 });
  if (interview.status === 'complete') {
    return NextResponse.json({ error: 'That interview is already finished.' }, { status: 409 });
  }

  const answer = (body.answer ?? '').trim().slice(0, 4000);
  const turns: Turn[] = answer ? [{ role: 'owner', text: answer, at: new Date().toISOString() }] : [];

  const history = [...(interview.transcript ?? []), ...turns];

  // Which questions he has actually put to them, read off the keys stamped on
  // his own turns. A reload or a retry never loses or repeats the place.
  const asked = new Set(coveredKeys(history));

  let next: { say: string; question_key: string; done: boolean };
  try {
    next = await nextCoachTurn({
      systemPrompt: body.systemPrompt ?? '',
      turns: history,
      covered: [...asked],
    });
  } catch (err) {
    console.error('hundredfold turn failed', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Mr. Mustard lost his train of thought. Send that again.' },
      { status: 503 }
    );
  }

  const saved = await appendTurns(id, [
    ...turns,
    { role: 'coach', text: next.say, at: new Date().toISOString(), key: next.question_key || undefined },
  ]);

  if (next.done) {
    await saveInterviewProgress(id, { status: 'open' });
  }

  const covered = asked.size + (next.question_key && !asked.has(next.question_key) ? 1 : 0);


  return NextResponse.json({
    ok: true,
    say: next.say,
    questionKey: next.question_key,
    done: next.done,
    progress: { covered: Math.min(covered, QUESTIONS.length), total: QUESTIONS.length },
    turns: saved ?? history,
  });
}
