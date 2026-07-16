import { NextResponse } from 'next/server';
import { requireOutboundAdmin, outboundRepScope, fetchAllRows } from '@/lib/outbound-server';
import { denverToday, denverWeekStart } from '@/lib/outbound';
import type { DailyRepStat, HeatReason } from '@/lib/outbound';

export const runtime = 'nodejs';

/**
 * One fetch for the dashboard AND the dial order. The queue is heat-ranked,
 * not FIFO: an unread reply outranks everything, someone reading the audit
 * email right now outranks a due callback, due callbacks and retries outrank
 * cold starts, and among cold starts the worst audit scores go first (the
 * 4/100 site is the easiest conversation in the list).
 */

type Candidate = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string;
  niche: string;
  city: string | null;
  status: string;
  owner_rep_id: string | null;
  dnc_checked: boolean;
  next_action_at: string | null;
  next_action: string | null;
  audit_score: number | null;
  last_open_at: string | null;
  last_seen_at: string | null;
  email_open_count: number;
  demo_url: string | null;
  source: string | null;
  origin: string | null;
  created_at: string;
};

export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const today = denverToday();
  const weekStart = denverWeekStart();
  const now = Date.now();

  // A 'caller' rep (part-time helper) sees only their own leads/dashboard; owners see the whole floor.
  const { reps, scopeRepId } = await outboundRepScope(guard.supabase);

  // We page through EVERY active candidate (fetchAllRows), not a capped slice.
  // The old single-request `.limit(5000)` was silently truncated to PostgREST's
  // 1000-row cap: once the floor passed 1000 active leads, a due callback or a
  // hot signal on an older lead could never reach the queue no matter how it
  // scored. Ordered newest-first with an `id` tiebreaker so range paging is
  // stable. If the ACTIVE floor ever grows into the tens of thousands, optimize
  // by splitting the fetch (due callbacks + signals first, then a fresh slice)
  // rather than pulling the whole set every 60s poll.
  const makeCandQuery = () => {
    let qb = guard.supabase
      .from('outbound_leads')
      .select(
        'id, business_name, contact_name, phone, niche, city, status, owner_rep_id, dnc_checked, next_action_at, next_action, audit_score, last_open_at, last_seen_at, email_open_count, demo_url, source, origin, created_at',
      )
      .in('status', ['new', 'contacted', 'callback'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: true });
    if (scopeRepId) qb = qb.eq('owner_rep_id', scopeRepId);
    return qb;
  };

  let lockedQuery = guard.supabase
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .eq('dnc_checked', false)
    .in('status', ['new', 'contacted', 'callback']);
  if (scopeRepId) lockedQuery = lockedQuery.eq('owner_rep_id', scopeRepId);

  const [statsRes, candRes, unreadRes, pilotsRes, lockedRes] = await Promise.all([
    guard.supabase.from('outbound_daily_rep_stats').select('*').gte('day', weekStart),
    fetchAllRows<Candidate>(makeCandQuery),
    guard.supabase.from('messages').select('outbound_lead_id').eq('direction', 'inbound').eq('read', false).not('outbound_lead_id', 'is', null),
    guard.supabase
      .from('outbound_pilots')
      .select('*, lead:outbound_leads(id, business_name)')
      .eq('status', 'running')
      .order('ends_at', { ascending: true }),
    lockedQuery,
  ]);

  for (const res of [statsRes, candRes, unreadRes, pilotsRes]) {
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  const zero = { dials: 0, conversations: 0, demos_booked: 0 };
  const todayByRep: Record<string, typeof zero> = {};
  const weekByRep: Record<string, typeof zero> = {};
  for (const row of (statsRes.data ?? []) as DailyRepStat[]) {
    const w = (weekByRep[row.rep_id] ??= { ...zero });
    w.dials += row.dials;
    w.conversations += row.conversations;
    w.demos_booked += row.demos_booked;
    if (row.day === today) {
      const t = (todayByRep[row.rep_id] ??= { ...zero });
      t.dials += row.dials;
      t.conversations += row.conversations;
      t.demos_booked += row.demos_booked;
    }
  }

  const replied = new Set((unreadRes.data ?? []).map((m) => m.outbound_lead_id as string));

  const queue = ((candRes.data ?? []) as Candidate[])
    .map((l) => {
      let score = 0;
      let reason: HeatReason = 'fresh';

      if (replied.has(l.id)) {
        score += 1000;
        reason = 'replied';
      }

      // Live presence beats from the demo hub (054): they are LOOKING AT their
      // own suite this minute. Only a live reply outranks a live viewer; a
      // human dialing at this exact peak is the whole point of the beat.
      if (l.last_seen_at && now - new Date(l.last_seen_at).getTime() <= 15 * 60000) {
        score += 850;
        if (reason === 'fresh') reason = 'watching_now';
      }

      if (l.last_open_at) {
        const minsAgo = (now - new Date(l.last_open_at).getTime()) / 60000;
        if (minsAgo <= 15) {
          score += 800;
          if (reason === 'fresh') reason = 'reading_now';
        } else if (minsAgo <= 48 * 60) {
          score += Math.max(120, 500 - (minsAgo / 60) * 8);
          if (reason === 'fresh') reason = 'opened_recently';
        }
      }

      const due = l.next_action_at ? new Date(l.next_action_at).getTime() <= now + 60 * 60000 : false;
      if (l.status === 'callback') {
        if (!due && score === 0) return null; // scheduled for later, stays out of the way
        if (due) {
          const overdueHrs = l.next_action_at ? Math.max(0, (now - new Date(l.next_action_at).getTime()) / 3600000) : 0;
          score += 400 + Math.min(100, overdueHrs * 4);
          if (reason === 'fresh') reason = 'callback_due';
        }
      } else if (l.status === 'contacted') {
        if (due) {
          score += 350;
          if (reason === 'fresh') reason = 'retry_due';
        } else if (score === 0) {
          return null; // contacted, nothing due, no signal: rests until the cadence wakes it
        }
      }

      if (l.audit_score != null) {
        score += Math.max(0, 100 - l.audit_score) * 2;
        if (reason === 'fresh' && l.audit_score <= 50) reason = 'worst_audit';
      }
      // A self-serve Demo Station signup is the hottest cold lead that exists:
      // they came from an ad, typed their own details, and are (or just were)
      // playing with their demos. Outranks everything except a live reply for
      // the first two days, then stays elevated until someone works it.
      if (l.source === 'demo-station') {
        const ageHrs = (now - new Date(l.created_at).getTime()) / 3600000;
        score += ageHrs <= 48 ? 900 : 300;
        if (reason === 'fresh') reason = 'self_serve';
      }
      // Review-mined leads carry public proof that customers cannot reach
      // them, the exact wound we treat: hotter than a cold start.
      if (l.source === 'review-mining') {
        score += 180;
        if (reason === 'fresh') reason = 'review_pain';
      }
      // Website-mined leads verifiably have no (working) site: a build pitch
      // with the evidence already in hand.
      if (l.source === 'website-mining') {
        score += 170;
        if (reason === 'fresh') reason = 'no_website';
      }
      // Partner-minted suites (054) are warm intros: someone the owner trusts
      // asked for this build by name. Same curve as self-serve; the hand-off
      // conversation is happening in the first two days or not at all.
      if (l.source === 'partner-forge') {
        const ageHrs = (now - new Date(l.created_at).getTime()) / 3600000;
        score += ageHrs <= 48 ? 900 : 300;
        if (reason === 'fresh') reason = 'partner_forge';
      }
      // Rep pre-forges surface gently: the minting rep planned the dial, the
      // queue just needs to not lose it.
      if (l.source === 'rep-forge') {
        score += 200;
        if (reason === 'fresh') reason = 'rep_forge';
      }
      if (l.status === 'new') score += 50;

      return { ...l, heat: Math.round(score), reason };
    })
    .filter((l): l is Candidate & { heat: number; reason: HeatReason } => l !== null)
    .sort((a, b) => b.heat - a.heat || a.created_at.localeCompare(b.created_at))
    .slice(0, 40);

  // Self-serve signups get their own counter on the dashboard. A heat chip
  // buried in the queue is not an arrival notice, and these are the leads that
  // go cold fastest: they are on their hub RIGHT NOW.
  const cands = (candRes.data ?? []) as Candidate[];
  const selfServe = {
    today: cands.filter((l) => l.source === 'demo-station' && now - new Date(l.created_at).getTime() <= 86400000).length,
    waiting: cands.filter((l) => l.source === 'demo-station' && l.status === 'new').length,
  };

  const pilots = pilotsRes.data ?? [];
  const totalRecovered = pilots.reduce((sum, p) => sum + Number(p.revenue_recovered ?? 0), 0);
  const soonCutoff = now + 3 * 86400000;
  const endingSoon = pilots.filter((p) => new Date(p.ends_at).getTime() <= soonCutoff);

  return NextResponse.json({
    reps,
    today: todayByRep,
    week: weekByRep,
    queue,
    // DNC scrubbing is an owner task; a part-time caller shouldn't see a scary "locked" counter.
    lockedUnscrubbed: scopeRepId ? 0 : (lockedRes.count ?? 0),
    selfServe,
    pilots: {
      running: pilots.length,
      totalRecovered,
      endingSoon: endingSoon.map((p) => ({ id: p.id, ends_at: p.ends_at, business_name: p.lead?.business_name ?? '' })),
    },
    day: today,
    weekStart,
  });
}
