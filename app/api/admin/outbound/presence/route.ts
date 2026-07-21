import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOutboundAdmin, parseBody, resolveRequestRep, fetchAllRows } from '@/lib/outbound-server';
import { denverToday } from '@/lib/outbound';

export const runtime = 'nodejs';

/**
 * The floor's live state: who is online, which lead each caller has open right
 * now, how far they are through their batch, and their dials today. Polled by the
 * dashboard on a short interval so presence feels live without re-running the
 * whole heat queue every time.
 *
 * "Online" is a 4-minute window: a caller heartbeats every ~20s while the
 * cockpit is open, so 4 minutes keeps them showing as live across a genuine
 * pause — reading a script, a slow ring-out, jotting a note, a quick tab-away —
 * without the dot flickering off the moment they stop clicking. Anyone past that
 * shows their last position instead of a live one. Drives both the online dot
 * (GET) and the double-dial collision check (POST), so one constant tunes both.
 */
const ONLINE_MS = 4 * 60 * 1000;

export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const [{ data: reps }, me] = await Promise.all([
    guard.supabase
      .from('outbound_reps')
      .select('id, name, role, daily_dial_goal, last_seen_at, current_lead_id, batch_lead_ids, batch_cursor, batch_started_at')
      .eq('active', true)
      .order('name'),
    resolveRequestRep(guard.supabase),
  ]);
  const repRows = reps ?? [];

  // Resolve the "on: <business>" labels in one round trip.
  const leadIds = [...new Set(repRows.map((r) => r.current_lead_id).filter(Boolean))] as string[];
  const nameById: Record<string, string> = {};
  if (leadIds.length) {
    const { data: leads } = await guard.supabase
      .from('outbound_leads')
      .select('id, business_name')
      .in('id', leadIds);
    for (const l of leads ?? []) nameById[l.id] = l.business_name;
  }

  // Dials today, per rep, from the same Denver-day view the dashboard uses.
  const today = denverToday();
  const { data: stats } = await guard.supabase
    .from('outbound_daily_rep_stats')
    .select('rep_id, dials, day')
    .eq('day', today);
  const dialsToday: Record<string, number> = {};
  for (const s of stats ?? []) dialsToday[s.rep_id] = (dialsToday[s.rep_id] ?? 0) + (s.dials ?? 0);

  const now = Date.now();
  const presence = repRows.map((r) => {
    const online = !!r.last_seen_at && now - new Date(r.last_seen_at).getTime() <= ONLINE_MS;
    const batch = Array.isArray(r.batch_lead_ids) ? (r.batch_lead_ids as string[]) : [];
    return {
      id: r.id,
      name: r.name,
      role: r.role,
      online,
      last_seen_at: r.last_seen_at ?? null,
      current_lead: r.current_lead_id ? { id: r.current_lead_id, business_name: nameById[r.current_lead_id] ?? '' } : null,
      batch: batch.length ? { cursor: Math.min(r.batch_cursor ?? 0, batch.length - 1) + 1, total: batch.length } : null,
      dials_today: dialsToday[r.id] ?? 0,
      is_me: !!me && me.id === r.id,
    };
  });

  return NextResponse.json({ presence, meId: me?.id ?? null });
}

/**
 * Heartbeat. The open cockpit posts this every ~20s with the lead on screen. It
 * stamps last_seen_at (drives the online dot) and current_lead_id (drives "on: X"
 * and the no-double-dial guard), and, if that lead is inside the rep's persisted
 * batch, advances the saved cursor so "pick up where you left off" lands exactly.
 *
 * A rep can only ever write their OWN presence: the rep is resolved from the
 * signed-in session, never from the request body.
 */
const beatSchema = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  clear: z.boolean().optional(), // sent on cockpit unmount / batch end
});

export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, beatSchema);
  if ('error' in parsed) return parsed.error;
  const { lead_id, clear } = parsed.data;

  const me = await resolveRequestRep(guard.supabase);
  if (!me) return NextResponse.json({ ok: false, reason: 'not-a-rep' }); // admin without a rep row: no-op, not an error

  const update: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
  if (clear) {
    update.current_lead_id = null;
  } else if (lead_id) {
    update.current_lead_id = lead_id;
    const batch = Array.isArray(me.batch_lead_ids) ? (me.batch_lead_ids as string[]) : [];
    const idx = batch.indexOf(lead_id);
    // Only ever move the cursor FORWARD, so jumping back to review an earlier
    // lead doesn't rewind where "pick up" resumes.
    if (idx >= 0 && idx > (Number(me.batch_cursor) || 0)) update.batch_cursor = idx;
  }

  await guard.supabase.from('outbound_reps').update(update).eq('id', me.id);

  // Tell the caller if someone else is (recently) on this same lead, so the
  // cockpit can warn before two people dial the same business.
  let onSameLead: string[] = [];
  if (lead_id && !clear) {
    const cutoff = new Date(Date.now() - ONLINE_MS).toISOString();
    const { data: others } = await guard.supabase
      .from('outbound_reps')
      .select('name, last_seen_at')
      .eq('current_lead_id', lead_id)
      .neq('id', me.id)
      .gte('last_seen_at', cutoff);
    onSameLead = (others ?? []).map((o) => o.name);
  }

  return NextResponse.json({ ok: true, onSameLead });
}
