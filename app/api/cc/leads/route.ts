import { NextResponse } from 'next/server';
import { getDesk, logLeadEvent } from '@/lib/cc-desk';
import { EVENT_COLUMNS, type LeadEvent } from '@/lib/cc-lead-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE LEAD DESK. The same rows the portal reads, plus the two things a shared
 * desk needs: who has each lead, and everything anyone has written about it.
 *
 * Order is consequence, not recency: waiting before called, the best priority
 * first, then whoever has waited longest. The newest lead is the one least at
 * risk of being lost, so it does not get the top of the list for free.
 *
 * Every write here is a person pressing a button. "Tried, no answer" is kept
 * as its own mark and never sets called: a call that nobody picked up is not
 * a call that happened.
 */

const LEAD_COLUMNS =
  'id, source, sources, name, phone, email, town, project_type, land, message, page, referrer_name, referrer_phone, answers, priority, campaign, handled_at, handled_by, owner_key, owner_name, owner_at, created_at';

type LeadRow = Record<string, unknown> & { id: string; created_at: string; handled_at: string | null; priority: number | null };

export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, people, who } = got.desk;
  const email = account.clientEmail;

  const [leadRes, eventRes] = await Promise.all([
    sb.from('client_leads').select(LEAD_COLUMNS).eq('client_email', email).order('created_at', { ascending: false }).limit(300),
    sb.from('client_lead_events').select(EVENT_COLUMNS).eq('client_email', email).order('created_at', { ascending: false }).limit(2000),
  ]);
  if (leadRes.error) return NextResponse.json({ error: 'The lead list did not load.' }, { status: 500 });

  const events = new Map<string, LeadEvent[]>();
  for (const e of (eventRes.data ?? []) as LeadEvent[]) events.set(e.lead_id, [...(events.get(e.lead_id) ?? []), e]);

  const leads = ((leadRes.data ?? []) as unknown as LeadRow[])
    .map((l) => ({ ...l, events: events.get(l.id) ?? [] }))
    .sort((a, b) => {
      const ha = a.handled_at ? 1 : 0;
      const hb = b.handled_at ? 1 : 0;
      if (ha !== hb) return ha - hb;
      if (ha === 1) return String(b.handled_at).localeCompare(String(a.handled_at));
      const pa = a.priority ?? 9;
      const pb = b.priority ?? 9;
      if (pa !== pb) return pa - pb;
      return String(a.created_at).localeCompare(String(b.created_at));
    });

  const since = Date.now() - 30 * 86_400_000;
  const recent = leads.filter((l) => Date.parse(l.created_at) >= since);
  const tally = (pick: (l: LeadRow) => string[] | string | null) => {
    const m = new Map<string, number>();
    for (const l of recent) {
      const v = pick(l);
      for (const k of Array.isArray(v) ? v : v ? [v] : []) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
  };

  return NextResponse.json({
    leads,
    people,
    who,
    summary: {
      days: 30,
      total: recent.length,
      waiting: leads.filter((l) => !l.handled_at).length,
      bySource: tally((l) => (((l.sources as string[] | null) ?? []).length ? (l.sources as string[]) : ((l.source as string | null) ?? null))),
      byTown: tally((l) => (l.town as string | null) ?? null).slice(0, 8),
    },
  });
}

type Action = 'note' | 'tried' | 'called' | 'uncalled' | 'take' | 'hand' | 'release';

export async function POST(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, people, who, author } = got.desk;
  const email = account.clientEmail;

  let body: { id?: string; action?: Action; body?: string; to?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const id = String(body.id ?? '');
  const action = body.action;
  if (!id || !action) return NextResponse.json({ error: 'Which lead, and what happened?' }, { status: 400 });

  const { data: lead } = await sb.from('client_leads').select('id, handled_at, owner_key').eq('id', id).eq('client_email', email).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'That lead is not on this account.' }, { status: 404 });

  const text = (body.body ?? '').trim();
  const now = new Date().toISOString();
  let patch: Record<string, unknown> | null = null;
  // The row changes first and the log second, so the log never records a
  // mark that did not save.
  let spec: Parameters<typeof logLeadEvent>[4];

  if (action === 'note') {
    if (!text) return NextResponse.json({ error: 'Write the note first.' }, { status: 400 });
    spec = { kind: 'note', body: text };
  } else if (action === 'tried') {
    spec = { kind: 'tried', body: text };
  } else if (action === 'called') {
    patch = { handled_at: now, handled_by: author.email };
    spec = { kind: 'called', body: text };
  } else if (action === 'uncalled') {
    patch = { handled_at: null, handled_by: null };
    spec = { kind: 'uncalled' };
  } else if (action === 'take') {
    if (!who) return NextResponse.json({ error: 'Say who you are first.' }, { status: 400 });
    patch = { owner_key: who.key, owner_name: who.name, owner_at: now };
    spec = { kind: 'taken' };
  } else if (action === 'hand') {
    const to = people.find((p) => p.key === body.to);
    if (!to) return NextResponse.json({ error: 'That name is not on this account.' }, { status: 400 });
    patch = { owner_key: to.key, owner_name: to.name, owner_at: now };
    spec = who?.key === to.key ? { kind: 'taken' } : { kind: 'handed', to };
  } else if (action === 'release') {
    patch = { owner_key: null, owner_name: null, owner_at: null };
    spec = { kind: 'released' };
  } else {
    return NextResponse.json({ error: 'That is not something this desk does.' }, { status: 400 });
  }

  if (patch) {
    const { error } = await sb.from('client_leads').update(patch).eq('id', id).eq('client_email', email);
    if (error) return NextResponse.json({ error: 'That did not save. Try again.' }, { status: 500 });
  }
  const event: LeadEvent | null = await logLeadEvent(sb, email, id, author, spec);
  if (!event) return NextResponse.json({ error: 'That did not save. Try again.' }, { status: 500 });
  return NextResponse.json({ ok: true, patch: patch ?? {}, event });
}
