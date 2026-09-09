/**
 * THE PLANNER. Every submission the client makes becomes one day on the
 * calendar, in the order they made them, starting with the next open day.
 * The edit is queued the moment a day is claimed, so the words are waiting
 * long before the hour. A submission that asked for a graphic is held until
 * a person attaches one. Nothing is planned from a bank: an empty queue is an
 * empty day, and the portal says so.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueCaptions } from './captions';
import { mountainToUtc, addDays, mountainDate } from './time';
import type { MaterialRow, PostRow, SettingsRow } from './types';

async function queue(sb: SupabaseClient, clientEmail: string): Promise<MaterialRow[]> {
  const { data } = await sb.from('posting_materials').select('*').eq('client_email', clientEmail).eq('status', 'fresh').eq('kind', 'post').order('created_at', { ascending: true }).limit(60);
  return (data ?? []) as MaterialRow[];
}

async function takenDays(sb: SupabaseClient, clientEmail: string, from: string): Promise<Set<string>> {
  const { data } = await sb.from('posting_posts').select('scheduled_for').eq('client_email', clientEmail).gte('scheduled_for', from).neq('status', 'skipped');
  return new Set((data ?? []).map((r) => r.scheduled_for as string));
}

export type PlanOutcome = { date: string; action: 'created' | 'held'; materialId: string; jobId?: string | null };

/**
 * Give every fresh submission a day. Idempotent: a submission already on the
 * calendar is not fresh, so a second run plans nothing twice.
 */
export async function planClient(sb: SupabaseClient, s: SettingsRow, opts: { from?: string } = {}): Promise<PlanOutcome[]> {
  const out: PlanOutcome[] = [];
  if (!s.active) return out;
  const today = mountainDate();
  // Today still counts if its hour has not passed; otherwise start tomorrow.
  const todayOpen = mountainToUtc(today, s.post_hour_mt).getTime() > Date.now() + 10 * 60_000;
  let date = opts.from ?? (todayOpen ? today : addDays(today, 1));
  const taken = await takenDays(sb, s.client_email, date);
  const fresh = await queue(sb, s.client_email);

  for (const m of fresh) {
    while (taken.has(date)) date = addDays(date, 1);
    taken.add(date);
    const needsGraphic = m.wants_graphic && !m.url;
    let jobId: string | null = null;
    try {
      jobId = await enqueueCaptions(s, { material: m, dateStr: date });
    } catch {
      jobId = null; // the mechanical editor covers it at publish time
    }
    const values = {
      client_email: s.client_email,
      scheduled_for: date,
      publish_at: mountainToUtc(date, s.post_hour_mt).toISOString(),
      material_id: m.id,
      image_url: m.url,
      headline: (m.text ?? '').split(/[.!?\n]/)[0].trim().slice(0, 60) || 'Post',
      captions: {},
      source: 'material',
      evergreen_key: null,
      status: needsGraphic ? 'held' : 'writing',
      results: needsGraphic ? { note: 'Waiting on the graphic.' } : {},
      llm_job_id: jobId,
      written_by: null,
      edited_by: null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from('posting_posts').upsert(values, { onConflict: 'client_email,scheduled_for' });
    if (error) continue;
    await sb.from('posting_materials').update({ status: 'used', used_count: m.used_count + 1, last_used_on: date }).eq('id', m.id);
    out.push({ date, action: needsGraphic ? 'held' : 'created', materialId: m.id, jobId });
    date = addDays(date, 1);
  }
  return out;
}

/** The days ahead with nothing on them, for the nudge and the portal. */
export async function emptyDaysAhead(sb: SupabaseClient, s: SettingsRow, days = 7): Promise<number> {
  const today = mountainDate();
  const taken = await takenDays(sb, s.client_email, addDays(today, 1));
  let n = 0;
  for (let i = 1; i <= days; i++) if (!taken.has(addDays(today, i))) n++;
  return n;
}

/** When a graphic lands on a held submission, the day is released and the edit re-queued with the image in view. */
export async function releaseForGraphic(sb: SupabaseClient, s: SettingsRow, materialId: string): Promise<void> {
  const { data: m } = await sb.from('posting_materials').select('*').eq('id', materialId).maybeSingle();
  if (!m) return;
  const { data: post } = await sb.from('posting_posts').select('*').eq('material_id', materialId).eq('status', 'held').maybeSingle();
  if (!post) return;
  const row = post as PostRow;
  let jobId: string | null = row.llm_job_id;
  if (!row.captions.facebook) {
    try {
      jobId = await enqueueCaptions(s, { material: m as MaterialRow, dateStr: row.scheduled_for });
    } catch {
      /* the mechanical editor covers it */
    }
  }
  await sb.from('posting_posts').update({ image_url: (m as MaterialRow).url, status: row.captions.facebook ? 'scheduled' : 'writing', results: {}, llm_job_id: jobId, updated_at: new Date().toISOString() }).eq('id', row.id);
}

/** Kept for the desk button: plan now, from today when the hour is still ahead. */
export async function planFromToday(sb: SupabaseClient, s: SettingsRow): Promise<PlanOutcome[]> {
  return planClient(sb, s);
}
