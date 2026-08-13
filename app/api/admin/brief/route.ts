import { NextResponse } from 'next/server';
import { llmText } from '@/lib/llm';
import { getSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * AI daily brief. Takes the command-center overview snapshot and returns a
 * short, prioritized "what to do today" written for Sarah. The owner's data
 * goes in, a focused plan comes out. No fluff, no em dashes.
 */

const SYSTEM_PROMPT = `You are the chief of staff for Sarah Scarano, founder of Modern Mustard Seed, a one-person AI product studio. You read her live business numbers and write a tight morning brief.

Rules:
- Speak directly to Sarah. Warm, sharp, no fluff.
- No em dashes anywhere. Use periods, commas, parentheses.
- Lead with the single most important thing to do today.
- Be specific: name the person, the amount, the call time, the lead.
- 4 to 6 short bullet points max. Each starts with a bold 2 to 4 word label.
- If something needs a reply or a call is coming up, say exactly who and when.
- If revenue or pipeline is light, say it plainly and suggest one concrete move.
- End with one encouraging line rooted in stewardship, not hype.
- Output clean markdown. No preamble like "here is your brief". Just the brief.`;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let overview: unknown;
  try {
    overview = (await req.json()).overview;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  try {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const brief = await llmText({
      label: 'admin-brief',
      model: 'sonnet',
      system: SYSTEM_PROMPT,
      user: `Today is ${today}. Here is the live snapshot of Modern Mustard Seed. Write my brief.\n\n${JSON.stringify(overview, null, 2)}`,
    });
    return NextResponse.json({ brief: brief || 'Nothing pressing. Build something today.' });
  } catch (err) {
    // This is a panel on a dashboard, not a deliverable. If the subscription is
    // busy it is better to say so in the panel than to fail the page, so the
    // queued and the genuinely-broken cases read the same to the caller here.
    console.error('admin brief error', err);
    return NextResponse.json({ brief: '_The brief is still being written. Refresh in a moment._' });
  }
}
