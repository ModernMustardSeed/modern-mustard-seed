import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { listTrades, needingCert, removeTrade, saveTrade, tradeFromContact } from '@/lib/cc-trades';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE BENCH's endpoint.
 *
 *   GET           every trade, and whose certificate needs a person
 *   save          add or change one
 *   from-contact  bring somebody in from the book rather than typing them twice
 *   delete        drop the working relationship, never the contact
 */
export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;
  try {
    const trades = await listTrades(sb, account.clientEmail);
    return NextResponse.json({ trades, needing: needingCert(trades) });
  } catch {
    // The table arrives with migration 144.
    return NextResponse.json({ trades: [], needing: [] });
  }
}

export async function POST(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }

  const action = String(body.action ?? 'save');

  if (action === 'save') {
    const r = await saveTrade(sb, account.clientEmail, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    const trades = await listTrades(sb, account.clientEmail);
    return NextResponse.json({ ok: true, trade: r.trade, trades, needing: needingCert(trades) });
  }

  if (action === 'from-contact') {
    const r = await tradeFromContact(sb, account.clientEmail, String(body.contactId ?? ''), body.trade ? String(body.trade) : null);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    const trades = await listTrades(sb, account.clientEmail);
    return NextResponse.json({ ok: true, trade: r.trade, trades, needing: needingCert(trades) });
  }

  // THE BENCH FROM THE BOOK. Everyone filed as a subcontractor or supplier
  // comes over at once, keeping the tag as their trade, so nobody is typed twice.
  if (action === 'from-book') {
    const { data: people } = await sb.from('client_contacts').select('id, tags').eq('client_email', account.clientEmail).limit(5000);
    let made = 0;
    for (const p of (people ?? []) as Array<{ id: string; tags: string[] | null }>) {
      const tag = (p.tags ?? []).find((t) => /subcontract|supplier|vendor|trade/i.test(t));
      if (!tag) continue;
      const r = await tradeFromContact(sb, account.clientEmail, p.id, /supplier|vendor/i.test(tag) ? 'Supplier' : 'Subcontractor');
      if (r.ok) made += 1;
    }
    const trades = await listTrades(sb, account.clientEmail);
    return NextResponse.json({ ok: true, made, trades, needing: needingCert(trades) });
  }

  if (action === 'delete') {
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Which one?' }, { status: 400 });
    await removeTrade(sb, account.clientEmail, id);
    const trades = await listTrades(sb, account.clientEmail);
    return NextResponse.json({ ok: true, trades, needing: needingCert(trades) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
