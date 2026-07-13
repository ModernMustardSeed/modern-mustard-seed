import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { displayForIso } from '@/lib/booking';

export const runtime = 'nodejs';

/**
 * The command-center aggregate. One call powers the whole owner overview:
 * revenue, sales, lead pipeline, upcoming calls, what needs attention, and
 * the trailing series for the charts. Every block is best-effort so a missing
 * table (e.g. orders not migrated yet) degrades to zeros instead of a 500.
 */

type Attention = {
  kind: 'lead' | 'call' | 'buyer' | 'message';
  title: string;
  detail: string;
  whenIso: string;
  leadId?: string;
  severity: 'high' | 'medium';
  /** Tie-breaker inside a severity band, high wins. The rail is oldest-first
   *  (staleness is the whole point of nagging), which would bury the one thing
   *  that is urgent BECAUSE it is new: a self-serve signup who is on their hub
   *  right now. Anything time-critical on arrival sets this. */
  priority?: number;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  // ── Orders / revenue ──────────────────────────────────────────────
  let revenue = { month: 0, allTime: 0, monthCount: 0, allTimeCount: 0 };
  let recentOrders: Array<{ name: string | null; email: string; product_name: string; price_paid_cents: number; created_at: string }> = [];
  const revenueByMonth = new Map<string, number>();
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('name, email, product_name, price_paid_cents, created_at, status')
      .eq('status', 'paid')
      .order('created_at', { ascending: false });
    if (orders) {
      for (const o of orders) {
        const cents = Number(o.price_paid_cents) || 0;
        revenue.allTime += cents;
        revenue.allTimeCount += 1;
        const created = new Date(o.created_at as string);
        if (created >= monthStart) {
          revenue.month += cents;
          revenue.monthCount += 1;
        }
        if (created >= sixMonthsAgo) {
          const key = `${created.getUTCFullYear()}-${created.getUTCMonth()}`;
          revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + cents);
        }
      }
      recentOrders = orders.slice(0, 8).map((o) => ({
        name: (o.name as string | null) ?? null,
        email: o.email as string,
        product_name: o.product_name as string,
        price_paid_cents: Number(o.price_paid_cents) || 0,
        created_at: o.created_at as string,
      }));
    }
  } catch {
    // orders table not present yet
  }

  // Build the trailing 6-month revenue series (always 6 buckets, in order).
  const revenueSeries: Array<{ month: string; revenue: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    revenueSeries.push({ month: MONTHS[d.getUTCMonth()], revenue: Math.round((revenueByMonth.get(key) ?? 0) / 100) });
  }

  // ── Leads ─────────────────────────────────────────────────────────
  const byStatus: Record<string, number> = { new: 0, replied: 0, booked: 0, won: 0, lost: 0, archived: 0 };
  const byType: Record<string, number> = { 'build-queue': 0, audit: 0, contact: 0, newsletter: 0 };
  let leadsTotal = 0;
  let new7d = 0;
  let new30d = 0;
  const attention: Attention[] = [];
  let recentLeads: Array<{ id: string; name: string | null; email: string; type: string; status: string; created_at: string }> = [];

  const dayMs = 86400 * 1000;
  const ago24 = new Date(now.getTime() - dayMs);
  const ago7 = new Date(now.getTime() - 7 * dayMs);
  const ago30 = new Date(now.getTime() - 30 * dayMs);

  try {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, type, status, name, email, message, idea_description, business_name, source, timeline, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (leads) {
      leadsTotal = leads.length;
      for (const l of leads) {
        const status = l.status as string;
        const type = l.type as string;
        if (status in byStatus) byStatus[status] += 1;
        if (type in byType) byType[type] += 1;
        const created = new Date(l.created_at as string);
        if (created >= ago7) new7d += 1;
        if (created >= ago30) new30d += 1;

        // A Demo Station signup is the hottest lead we get: they came off an ad,
        // typed their own details, and are playing with the demos we just forged
        // them. No 24h grace period, no waiting for them to go cold.
        if (status === 'new' && l.source === 'demo-station') {
          const hours = Math.round((now.getTime() - created.getTime()) / 3600000);
          attention.push({
            kind: 'lead',
            title: `Forged their own demos: ${(l.business_name as string) || l.name || l.email}`,
            detail: hours < 1 ? 'Just now, self-serve from /demos. Call while they are still on the page.' : `${hours}h ago, self-serve from /demos. No order yet.`,
            whenIso: l.created_at as string,
            leadId: l.id as string,
            severity: 'high',
            priority: 2,
          });
        }
        // Attention: a genuinely new lead sitting unreplied for over 24h.
        else if (status === 'new' && created < ago24 && l.source !== 'mustard-seed-booking') {
          const hours = Math.round((now.getTime() - created.getTime()) / 3600000);
          attention.push({
            kind: l.source === 'store-buyer' ? 'buyer' : 'lead',
            title: l.source === 'store-buyer' ? `New buyer, no follow-up: ${l.name ?? l.email}` : `Unreplied lead: ${l.name ?? l.email}`,
            detail: (l.business_name as string) || (l.message as string)?.slice(0, 90) || (l.idea_description as string)?.slice(0, 90) || l.email as string,
            whenIso: l.created_at as string,
            leadId: l.id as string,
            severity: hours > 48 ? 'high' : 'medium',
          });
        }
      }
      recentLeads = leads.slice(0, 8).map((l) => ({
        id: l.id as string,
        name: (l.name as string | null) ?? null,
        email: l.email as string,
        type: l.type as string,
        status: l.status as string,
        created_at: l.created_at as string,
      }));
    }
  } catch {
    // leads table missing
  }

  // ── Upcoming calls (bookings live in leads) ───────────────────────
  let upcoming: Array<{ name: string | null; email: string; whenIso: string; display: string; leadId: string }> = [];
  try {
    const { data: booked } = await supabase
      .from('leads')
      .select('id, name, email, timeline, message')
      .eq('source', 'mustard-seed-booking')
      .eq('status', 'booked')
      .gte('timeline', now.toISOString())
      .order('timeline', { ascending: true })
      .limit(10);
    if (booked) {
      upcoming = booked
        .filter((b) => b.timeline)
        .map((b) => ({
          name: (b.name as string | null) ?? null,
          email: b.email as string,
          whenIso: b.timeline as string,
          display: displayForIso(b.timeline as string).display,
          leadId: b.id as string,
        }));
      // Any call within the next 72h is an attention item.
      const soon = new Date(now.getTime() + 3 * dayMs);
      for (const b of upcoming) {
        if (new Date(b.whenIso) <= soon) {
          attention.push({
            kind: 'call',
            title: `Call with ${b.name ?? b.email}`,
            detail: b.display,
            whenIso: b.whenIso,
            leadId: b.leadId,
            severity: 'high',
          });
        }
      }
    }
  } catch {
    // ignore
  }

  // ── Client messages (change requests / notes from the portal) ─────
  const messages: {
    newCount: number;
    items: Array<{ id: string; email: string; name: string | null; body: string; source: string; status: string; created_at: string; proposed_date: string | null }>;
  } = { newCount: 0, items: [] };
  try {
    const { data: reqs } = await supabase
      .from('client_requests')
      .select('id, client_email, client_name, body, source, status, created_at, proposed_date')
      .order('created_at', { ascending: false })
      .limit(50);
    if (reqs) {
      for (const r of reqs) {
        if (r.status === 'new') {
          messages.newCount += 1;
          const who = (r.client_name as string) || (r.client_email as string);
          attention.push({
            kind: 'message',
            title: `New message from ${who}`,
            detail: (r.body as string)?.slice(0, 90) || '',
            whenIso: r.created_at as string,
            severity: 'high',
          });
        }
      }
      messages.items = reqs
        .filter((r) => r.status !== 'done')
        .slice(0, 8)
        .map((r) => ({
          id: r.id as string,
          email: r.client_email as string,
          name: (r.client_name as string | null) ?? null,
          body: r.body as string,
          source: (r.source as string) || 'note',
          status: (r.status as string) || 'new',
          created_at: r.created_at as string,
          proposed_date: (r.proposed_date as string | null) ?? null,
        }));
    }
  } catch {
    // client_requests not migrated yet
  }

  // ── Capacity: active projects in flight ───────────────────────────
  let activeProjects = 0;
  try {
    const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true }).in('status', ['discovery', 'building', 'review']);
    activeProjects = count ?? 0;
  } catch {
    // projects not present
  }

  // ── Approvals waiting ─────────────────────────────────────────────
  let approvalsPending = 0;
  try {
    const { count } = await supabase.from('approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    approvalsPending = count ?? 0;
  } catch {
    // approvals not migrated yet
  }

  attention.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    if ((a.priority ?? 0) !== (b.priority ?? 0)) return (b.priority ?? 0) - (a.priority ?? 0);
    return new Date(a.whenIso).getTime() - new Date(b.whenIso).getTime();
  });

  // ── Targets ───────────────────────────────────────────────────────
  let targets: { revenue: number; leads: number; calls: number } | null = null;
  try {
    const { data: t } = await supabase
      .from('targets')
      .select('revenue_goal, leads_goal, calls_goal')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (t) {
      targets = {
        revenue: Number(t.revenue_goal) || 0,
        leads: Number(t.leads_goal) || 0,
        calls: Number(t.calls_goal) || 0,
      };
    }
  } catch {
    // targets table not migrated yet
  }

  // ── Proposals + follow-up radar ────────────────────────────────────
  const proposals = { open: 0, openValue: 0, accepted: 0, acceptedValue: 0 };
  let mrr = 0;
  let activePlans = 0;
  let committed = 0; // money owed: signed-unpaid deposits + paid-deposit balances
  const followups: Array<{ kind: string; title: string; detail: string; days: number }> = [];
  try {
    const { data: props } = await supabase
      .from('proposals')
      .select('client_name, client_company, status, one_time_total, monthly_total, subscription_status, updated_at, signed_at, deposit_status, balance_status, deposit_amount');
    if (props) {
      const nowMs = now.getTime();
      for (const p of props) {
        if (p.subscription_status === 'active') {
          mrr += Number(p.monthly_total) || 0;
          activePlans += 1;
        }
        const oneTime = Number(p.one_time_total) || 0;
        const depAmt = Math.round(Number(p.deposit_amount) || oneTime * 0.5);
        if (p.signed_at && p.deposit_status !== 'paid') committed += depAmt;
        else if (p.deposit_status === 'paid' && p.balance_status !== 'paid') committed += Math.max(0, oneTime - depAmt);
        const s = (p.status as string) || 'draft';
        const v = Number(p.one_time_total) || 0;
        if (s === 'draft' || s === 'sent') {
          proposals.open += 1;
          proposals.openValue += v;
        } else if (s === 'accepted') {
          proposals.accepted += 1;
          proposals.acceptedValue += v;
        }
        const who = (p.client_company as string) || (p.client_name as string) || 'a client';
        const days = Math.floor((nowMs - new Date(p.updated_at as string).getTime()) / 86400000);
        // Sent, not signed, going stale.
        if (s === 'sent' && !p.signed_at && days >= 3) {
          followups.push({ kind: 'proposal', title: `Proposal to ${who} unsigned`, detail: `Sent ${days} days ago, no signature yet.`, days });
        }
        // Signed, deposit not paid.
        if (p.signed_at && p.deposit_status !== 'paid' && days >= 2) {
          followups.push({ kind: 'deposit', title: `${who} signed, no deposit`, detail: `Signed ${days} days ago, deposit not paid.`, days });
        }
      }
    }
  } catch {
    // proposals table not migrated yet
  }
  followups.sort((a, b) => b.days - a.days);

  return NextResponse.json({
    generatedAt: now.toISOString(),
    revenue: {
      month: Math.round(revenue.month / 100),
      allTime: Math.round(revenue.allTime / 100),
      monthCount: revenue.monthCount,
      allTimeCount: revenue.allTimeCount,
    },
    leads: { total: leadsTotal, byStatus, byType, new7d, new30d },
    bookings: { upcoming, monthCount: upcoming.filter((u) => new Date(u.whenIso) >= monthStart).length },
    proposals,
    mrr: { monthly: mrr, activePlans },
    cashflow: { committed, openPipeline: proposals.openValue, mrr },
    capacity: { active: activeProjects, limit: Number(process.env.WIP_LIMIT) || 5 },
    approvals: { pending: approvalsPending },
    messages,
    followups: followups.slice(0, 6),
    attention: attention.slice(0, 8),
    recentOrders,
    recentLeads,
    revenueSeries,
    targets,
  });
}
