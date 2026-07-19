/**
 * The Partner Flywheel telemetry funnel (judge-panel ruling, 2026-07-17).
 *
 * One read of the whole partner engine: recruited -> activated -> mints ->
 * hub opens -> checkouts started -> attributed installs -> attributed MRR,
 * per partner and in total, rendered at the top of /admin/partners.
 *
 * Sources, all service-role reads:
 *  - affiliates: the recruited pool (approved partners) + can_forge (activation
 *    eligibility) + code (the attribution key on paid orders).
 *  - demo_events (054): the funnel spine. Every partner-minted lead carries the
 *    minting partner's affiliate_id and origin='partner' onto its hub_viewed and
 *    checkout_started events, so the mid-funnel is grouped by affiliate_id. The
 *    whole funnel is scoped to origin='partner' so the totals equal the sum of
 *    the per-partner rows (rep_mint volume is surfaced separately, never mixed
 *    into a partner's numbers).
 *  - demo_orders (046): the money floor. A paid order (paid/intake_done/
 *    delivered) carries the resolved partner code in `ref` and the real business
 *    monthly in monthly_cents. Attributed install = such an order whose ref is a
 *    listed partner's code; attributed MRR = the sum of those monthly_cents.
 *    Honest zeros when nothing has been attributed yet, never fabricated.
 *
 * Best effort: a failure here returns zeros so the partners page still renders.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const FUNNEL_EVENTS = ['partner_mint', 'rep_mint', 'hub_viewed', 'checkout_started'] as const;
const PAID_STATUSES = ['paid', 'intake_done', 'delivered'] as const;
const PAGE = 1000;
const MAX_ROWS = 100_000; // safety cap on the demo_events sweep

type PartnerFunnel = {
  id: string;
  name: string | null;
  email: string;
  code: string | null;
  canForge: boolean;
  mints: number;
  hubOpens: number;
  checkouts: number;
  installs: number;
  mrrCents: number;
  activated: boolean;
};

type FlywheelTotals = {
  recruited: number;
  activated: number;
  mints: number;
  hubOpens: number;
  checkouts: number;
  installs: number;
  mrrCents: number;
  repMints: number;
};

const EMPTY: { totals: FlywheelTotals; partners: PartnerFunnel[] } = {
  totals: { recruited: 0, activated: 0, mints: 0, hubOpens: 0, checkouts: 0, installs: 0, mrrCents: 0, repMints: 0 },
  partners: [],
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    // Recruited pool: approved partners. code is the attribution key on orders.
    const { data: affiliates, error: affErr } = await supabase
      .from('affiliates')
      .select('id, email, name, code, status, can_forge')
      .eq('status', 'approved');
    if (affErr) throw affErr;

    // Funnel spine. Only the four funnel event types, paged to a true total.
    type Ev = { event: string; origin: string | null; affiliate_id: string | null };
    const events: Ev[] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await supabase
        .from('demo_events')
        .select('event, origin, affiliate_id')
        .in('event', FUNNEL_EVENTS as unknown as string[])
        .order('created_at', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = (data || []) as Ev[];
      events.push(...rows);
      if (rows.length < PAGE) break;
    }

    // Money floor. Paid demo-order lifecycle rows carry ref + monthly_cents.
    const { data: orders, error: ordErr } = await supabase
      .from('demo_orders')
      .select('ref, monthly_cents, status')
      .in('status', PAID_STATUSES as unknown as string[]);
    if (ordErr) throw ordErr;

    // Per-affiliate mid-funnel tallies (scoped to origin='partner' so totals
    // equal the sum of the rows). partner_mint is inherently partner-origin.
    const byAff = new Map<string, { mints: number; hubOpens: number; checkouts: number }>();
    const bump = (id: string, k: 'mints' | 'hubOpens' | 'checkouts') => {
      const cur = byAff.get(id) || { mints: 0, hubOpens: 0, checkouts: 0 };
      cur[k] += 1;
      byAff.set(id, cur);
    };
    let repMints = 0;
    for (const e of events) {
      if (e.event === 'rep_mint') { repMints += 1; continue; }
      const partnerOrigin = e.origin === 'partner';
      if (!e.affiliate_id || !partnerOrigin) continue;
      if (e.event === 'partner_mint') bump(e.affiliate_id, 'mints');
      else if (e.event === 'hub_viewed') bump(e.affiliate_id, 'hubOpens');
      else if (e.event === 'checkout_started') bump(e.affiliate_id, 'checkouts');
    }

    // Paid installs + real MRR grouped by the ref code stamped at checkout.
    const byCode = new Map<string, { installs: number; mrrCents: number }>();
    for (const o of (orders || []) as { ref: string | null; monthly_cents: number | null }[]) {
      const code = (o.ref || '').trim();
      if (!code) continue;
      const cur = byCode.get(code) || { installs: 0, mrrCents: 0 };
      cur.installs += 1;
      cur.mrrCents += Number(o.monthly_cents) || 0;
      byCode.set(code, cur);
    }

    const partners: PartnerFunnel[] = (affiliates || []).map((a) => {
      const mid = byAff.get(a.id as string) || { mints: 0, hubOpens: 0, checkouts: 0 };
      const money = (a.code ? byCode.get((a.code as string).trim()) : null) || { installs: 0, mrrCents: 0 };
      const canForge = Boolean(a.can_forge);
      return {
        id: a.id as string,
        name: (a.name as string | null) ?? null,
        email: a.email as string,
        code: (a.code as string | null) ?? null,
        canForge,
        mints: mid.mints,
        hubOpens: mid.hubOpens,
        checkouts: mid.checkouts,
        installs: money.installs,
        mrrCents: money.mrrCents,
        activated: canForge && mid.mints > 0,
      };
    });

    // The flywheel cohort: partners who can mint or already have. Others (a
    // partner who only ever earned a product commission) are not in this funnel.
    const cohort = partners
      .filter((p) => p.canForge || p.mints > 0)
      .sort((a, b) => b.mints - a.mints || b.hubOpens - a.hubOpens || b.mrrCents - a.mrrCents);

    const totals: FlywheelTotals = {
      recruited: partners.length,
      activated: partners.filter((p) => p.activated).length,
      mints: cohort.reduce((s, p) => s + p.mints, 0),
      hubOpens: cohort.reduce((s, p) => s + p.hubOpens, 0),
      checkouts: cohort.reduce((s, p) => s + p.checkouts, 0),
      installs: cohort.reduce((s, p) => s + p.installs, 0),
      mrrCents: cohort.reduce((s, p) => s + p.mrrCents, 0),
      repMints,
    };

    return NextResponse.json({ totals, partners: cohort });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ ...EMPTY, error: msg }, { status: 500 });
  }
}
