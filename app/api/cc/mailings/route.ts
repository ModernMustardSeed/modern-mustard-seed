import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { MAILING_CAP, audience, campaignSender, countFor, listMailings, sendTest, startMailing } from '@/lib/client-mailings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The cap is 400 people at just over two a second, which is under four minutes.
export const maxDuration = 300;

/**
 * CAMPAIGNS. GET reads the book and what has gone out. POST counts a group,
 * sends the person at the desk a test, or sends for real because a person
 * pressed Send. Nothing here runs on a schedule.
 */

/**
 * Where a test lands. When Sarah is looking as the client, the desk signs with
 * the client's own address, and a test sent there would put our draft in their
 * inbox. So a preview tests to the studio instead.
 */
const testAddress = (deskEmail: string, preview: boolean) => (preview ? 'sarah@modernmustardseed.com' : deskEmail);

export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, author, preview } = got.desk;
  const [book, mailings] = await Promise.all([audience(sb, account.clientEmail), listMailings(sb, account.clientEmail)]);
  return NextResponse.json({
    audience: book,
    mailings,
    canSend: Boolean(campaignSender(account.project)),
    sendsFrom: campaignSender(account.project),
    testTo: testAddress(author.email, preview),
    cap: MAILING_CAP,
  });
}

type Body = { action?: 'count' | 'test' | 'send'; subject?: string; body?: string; tags?: string[]; expect?: number };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, author, preview } = got.desk;
  const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [];

  if (body.action === 'count') {
    const n = await countFor(sb, account.clientEmail, tags);
    return NextResponse.json({ count: n });
  }

  const subject = String(body.subject ?? '').trim();
  const text = String(body.body ?? '').trim();
  if (subject.length < 3) return NextResponse.json({ error: 'Give it a subject line.' }, { status: 400 });
  if (subject.length > 140) return NextResponse.json({ error: 'Keep the subject under 140 characters.' }, { status: 400 });
  if (text.length < 20) return NextResponse.json({ error: 'Write the message first.' }, { status: 400 });
  if (text.length > 6000) return NextResponse.json({ error: 'That is longer than an email should be. Keep it under 6,000 characters.' }, { status: 400 });

  if (body.action === 'test') {
    const to = testAddress(author.email, preview);
    const sent = await sendTest(account.project, to, preview ? null : author.name, subject, text);
    if (!sent.ok) return NextResponse.json({ error: sent.error ?? 'The test did not go.' }, { status: 502 });
    return NextResponse.json({ ok: true, to });
  }

  if (body.action === 'send') {
    const started = await startMailing(sb, account.project, account.clientEmail, { subject, body: text, tags, expect: Number(body.expect) || 0, by: author.name });
    if (!started.ok) return NextResponse.json({ error: started.error }, { status: 409 });
    return NextResponse.json({ ok: true, mailing: started.mailing });
  }

  return NextResponse.json({ error: 'Nothing to do.' }, { status: 400 });
}
