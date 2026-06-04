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
  kind: 'lead' | 'call' | 'buyer';
  title: string;
  detail: string;
  whenIso: string;
  leadId?: string;
  severity: 'high' | 'medium';
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

        // Attention: a genuinely new lead sitting unreplied for over 24h.
        if (status === 'new' && created < ago24 && l.source !== 'mustard-seed-booking') {
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

  attention.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
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

  // ── Proposals ─────────────────────────────────────────────────────
  const proposals = { open: 0, openValue: 0, accepted: 0, acceptedValue: 0 };
  try {
    const { data: props } = await supabase.from('proposals').select('status, one_time_total');
    if (props) {
      for (const p of props) {
        const s = (p.status as string) || 'draft';
        const v = Number(p.one_time_total) || 0;
        if (s === 'draft' || s === 'sent') {
          proposals.open += 1;
          proposals.openValue += v;
        } else if (s === 'accepted') {
          proposals.accepted += 1;
          proposals.acceptedValue += v;
        }
      }
    }
  } catch {
    // proposals table not migrated yet
  }

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
    attention: attention.slice(0, 8),
    recentOrders,
    recentLeads,
    revenueSeries,
    targets,
  });
}
