import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { confirmFact, knownFacts, proposedFacts, remember, retireFact } from '@/lib/cc-facts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WHAT THE DESK KNOWS, and the screen where a person corrects it.
 *
 * Memory nobody can read is a liability: the day it is wrong, nothing tells
 * the owner what it believes or why it believed it. So everything is listed,
 * a noticed fact shows its evidence, and both "yes that is right" and "no,
 * drop it" are one press.
 */
export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;
  try {
    const [known, proposed] = await Promise.all([knownFacts(sb, account.clientEmail), proposedFacts(sb, account.clientEmail)]);
    return NextResponse.json({ known, proposed });
  } catch {
    // The table arrives with migration 145.
    return NextResponse.json({ known: [], proposed: [] });
  }
}

export async function POST(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, author } = got.desk;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }

  const action = String(body.action ?? '');
  const id = String(body.id ?? '');

  if (action === 'remember') {
    const r = await remember(sb, account.clientEmail, { fact: body.fact, kind: body.kind, subject: body.subject, source: 'said', by: author.name });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  } else if (action === 'confirm' && id) {
    await confirmFact(sb, account.clientEmail, id, author.name);
  } else if (action === 'retire' && id) {
    await retireFact(sb, account.clientEmail, id, String(body.reason ?? ''), author.name);
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const [known, proposed] = await Promise.all([knownFacts(sb, account.clientEmail), proposedFacts(sb, account.clientEmail)]);
  return NextResponse.json({ ok: true, known, proposed });
}
