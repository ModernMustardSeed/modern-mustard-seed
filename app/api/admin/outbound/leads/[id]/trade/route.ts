import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { leadTrade, redriveLeadDemos } from '@/lib/outbound-demo';
import { TRADE_PRESETS } from '@/data/demo-os-trades';
import type { OsTradeKey } from '@/data/demo-os-trades';
import type { OutboundLead } from '@/lib/outbound';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * SEE AND CORRECT THE TRADE A SUITE WAS BUILT ON.
 *
 * The trade is detected from the lead's own words and then decides an enormous
 * amount: the voice agent's service menu, the command center's whole sample
 * dataset, the hub calculator's average ticket, and a line in the site brief
 * naming who the customers are. Until now that guess was invisible and
 * uncorrectable. One idiom in an owner's notes ("two businesses under one roof")
 * filed a chocolatier as a roofing company, and a fleet sweep found four more
 * live suites on the wrong trade including a restaurant filed as a wedding venue.
 *
 * GET  -> what trade this lead is on, what the detector says now, and the menu.
 * POST -> set it. `{trade: "salon"}` to choose, `{trade: "auto"}` to re-derive.
 *
 * Correcting is cheap and safe: no tokens, no rebuild, and the shareable links
 * do not change. The website is NOT rebuilt, because that is a real artifact
 * that costs half an hour; if the site is wrong too, rebuild it deliberately.
 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const l = lead as OutboundLead;

  let frozen: string | null = null;
  if (l.os_demo_id) {
    const { data } = await guard.supabase.from('outbound_demo_os').select('config').eq('id', l.os_demo_id).maybeSingle();
    frozen = ((data?.config ?? {}) as { trade?: string }).trade ?? null;
  }
  const detected = leadTrade(l);

  return NextResponse.json({
    ok: true,
    frozen,
    frozenLabel: frozen && frozen in TRADE_PRESETS ? TRADE_PRESETS[frozen as OsTradeKey].label : null,
    detected,
    detectedLabel: TRADE_PRESETS[detected].label,
    // The one thing worth showing loudly: the suite in front of a prospect right
    // now disagrees with what we would build today.
    disagrees: Boolean(frozen) && frozen !== detected,
    options: Object.entries(TRADE_PRESETS)
      .map(([key, preset]) => ({ key, label: preset.label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  });
}

export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  let body: { trade?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const wanted = (body.trade || '').trim();
  if (!wanted) return NextResponse.json({ error: 'Pick a trade, or send "auto" to re-derive.' }, { status: 400 });
  if (wanted !== 'auto' && !(wanted in TRADE_PRESETS)) {
    return NextResponse.json({ error: `Unknown trade "${wanted}".` }, { status: 400 });
  }

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const l = lead as OutboundLead;

  const result = await redriveLeadDemos(guard.supabase, l, wanted === 'auto' ? undefined : { trade: wanted as OsTradeKey });
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Could not re-derive.' }, { status: 500 });

  return NextResponse.json({
    ok: true,
    trade: result.trade,
    label: TRADE_PRESETS[result.trade].label,
    was: result.was,
    changed: result.changed,
    note:
      result.changed.length === 0
        ? 'Nothing to re-derive: this lead has no built voice agent or command center.'
        : `Rebuilt ${result.changed.join(' + ')}. Links unchanged, website untouched.`,
  });
}
