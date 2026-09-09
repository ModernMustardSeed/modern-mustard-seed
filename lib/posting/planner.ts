/**
 * THE PLANNER. Every submission the client makes becomes one day on the
 * calendar, in the order they made them, starting with the next open day.
 * The edit is queued the moment a day is claimed, so the words are waiting
 * long before the hour. A submission that asked for a graphic is held until
 * a person attaches one; on an approve-first account every day is held
 * until the client taps Approve. Nothing is planned from a bank: an empty
 * queue is an empty day, and the portal says so.
 *
 * Each platform posts at its own hour (the feed's best hour, or the client's
 * choice). The row's publish_at is the earliest of them, so the hourly tick
 * picks the post up in time for the first platform and the publisher fires
 * each platform as its hour comes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueCaptions } from './captions';
import { mountainToUtc, addDays, mountainDate } from './time';
import { hourFor, type MaterialRow, type Platform, type PostRow, type SettingsRow } from './types';

async function queue(sb: SupabaseClient, clientEmail: string): Promise<MaterialRow[]> {
  const { data } = await sb.from('posting_materials').select('*').eq('client_email', clientEmail).eq('status', 'fresh').eq('kind', 'post').order('created_at', { ascending: true }).limit(60);
  return (data ?? []) as MaterialRow[];
}

async function takenDays(sb: SupabaseClient, clientEmail: string, from: string): Promise<Set<string>> {
  const { data } = await sb.from('posting_posts').select('scheduled_for').eq('client_email', clientEmail).gte('scheduled_for', from).neq('status', 'skipped');
  return new Set((data ?? []).map((r) => r.scheduled_for as string));
}

/** The platforms a post goes to: its own pick, or every platform on the account. */
export function platformsFor(s: SettingsRow, pick: Platform[] | null | undefined): Platform[] {
  const chosen = (pick ?? []).filter((p) => s.platforms.includes(p));
  return chosen.length ? chosen : s.platforms;
}

/** The first hour any of the post's platforms fires, as a UTC instant. */
export function firstPublishAt(s: SettingsRow, date: string, platforms: Platform[]): Date {
  const hours = platforms.map((p) => hourFor(s, p));
  return mountainToUtc(date, Math.min(...(hours.length ? hours : [s.post_hour_mt])));
}

export type PlanOutcome = { date: string; action: 'created' | 'held'; materialId: string; jobId?: string | null; reason?: 'graphic' | 'approval' };

/**
 * Give every fresh submission a day. Idempotent: a submission already on the
 * calendar is not fresh, so a second run plans nothing twice.
 */
export async function planClient(sb: SupabaseClient, s: SettingsRow, opts: { from?: string } = {}): Promise<PlanOutcome[]> {
  const out: PlanOutcome[] = [];
  if (!s.active) return out;
  const today = mountainDate();
  const fresh = await queue(sb, s.client_email);
  if (!fresh.length) return out;

  // Today still counts if its earliest platform hour is more than ten minutes away; otherwise start tomorrow.
  const firstPick = platformsFor(s, fresh[0].platforms);
  const todayOpen = firstPublishAt(s, today, firstPick).getTime() > Date.now() + 10 * 60_000;
  let date = opts.from ?? (todayOpen ? today : addDays(today, 1));
  const taken = await takenDays(sb, s.client_email, date);

  for (const m of fresh) {
    while (taken.has(date)) date = addDays(date, 1);
    taken.add(date);
    const platforms = platformsFor(s, m.platforms);
    const needsGraphic = m.wants_graphic && !m.url;
    const reason: 'graphic' | 'approval' | null = needsGraphic ? 'graphic' : s.approve_first ? 'approval' : null;
    let jobId: string | null = null;
    try {
      jobId = await enqueueCaptions(s, { material: m, dateStr: date });
    } catch {
      jobId = null; // the mechanical editor covers it at publish time
    }
    const values = {
      client_email: s.client_email,
      scheduled_for: date,
      publish_at: firstPublishAt(s, date, platforms).toISOString(),
      material_id: m.id,
      image_url: m.url,
      link: m.link,
      platforms,
      headline: (m.text ?? '').split(/[.!?\n]/)[0].trim().slice(0, 60) || 'Post',
      captions: {},
      notes: null,
      source: 'material',
      evergreen_key: null,
      status: reason ? 'held' : 'writing',
      results: reason === 'graphic' ? { note: 'Waiting on the graphic.' } : reason === 'approval' ? { note: 'Waiting on your approval.' } : {},
      approved_at: null,
      approved_by: null,
      llm_job_id: jobId,
      written_by: null,
      edited_by: null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from('posting_posts').upsert(values, { onConflict: 'client_email,scheduled_for' });
    if (error) continue;
    await sb.from('posting_materials').update({ status: 'used', used_count: m.used_count + 1, last_used_on: date }).eq('id', m.id);
    out.push({ date, action: reason ? 'held' : 'created', materialId: m.id, jobId, reason: reason ?? undefined });
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

/** When a graphic lands on a held submission, the day is released (or moves to approval) and the edit re-queued with the image in view. */
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
  const stillHeld = s.approve_first && !row.approved_at;
  await sb
    .from('posting_posts')
    .update({
      image_url: (m as MaterialRow).url,
      status: stillHeld ? 'held' : row.captions.facebook ? 'scheduled' : 'writing',
      results: stillHeld ? { note: 'Waiting on your approval.' } : {},
      llm_job_id: jobId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);
}

/** The client (or Sarah for them) approves a held day. A graphic still missing keeps it held. */
export async function approvePost(sb: SupabaseClient, postId: string, by: string): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const { data } = await sb.from('posting_posts').select('*').eq('id', postId).maybeSingle();
  if (!data) return { ok: false, error: 'No such post.' };
  const row = data as PostRow;
  if (['published', 'publishing', 'partial'].includes(row.status)) return { ok: false, error: 'That one has already gone out.' };
  let waitingGraphic = false;
  if (row.material_id) {
    const { data: m } = await sb.from('posting_materials').select('wants_graphic, url').eq('id', row.material_id).maybeSingle();
    waitingGraphic = Boolean(m?.wants_graphic && !m?.url);
  }
  const status = waitingGraphic ? 'held' : row.captions.facebook ? 'scheduled' : 'writing';
  await sb
    .from('posting_posts')
    .update({ approved_at: new Date().toISOString(), approved_by: by, status, results: waitingGraphic ? { note: 'Approved. Waiting on the graphic.' } : {}, updated_at: new Date().toISOString() })
    .eq('id', row.id);
  return { ok: true, status };
}

/** A past post, said again: a fresh submission from the same words and image, in the queue. */
export async function repost(sb: SupabaseClient, s: SettingsRow, postId: string, by: string): Promise<PlanOutcome[] | { error: string }> {
  const { data } = await sb.from('posting_posts').select('*').eq('id', postId).eq('client_email', s.client_email).maybeSingle();
  if (!data) return { error: 'No such post.' };
  const row = data as PostRow;
  let text: string | null = null;
  if (row.material_id) {
    const { data: m } = await sb.from('posting_materials').select('text').eq('id', row.material_id).maybeSingle();
    text = (m?.text as string | null) ?? null;
  }
  if (!text) text = row.captions.facebook ?? row.headline;
  if (!text) return { error: 'Nothing to say again.' };
  const { error } = await sb.from('posting_materials').insert({ client_email: s.client_email, kind: 'post', text, url: row.image_url, link: row.link, platforms: row.platforms, note: 'Said again from an earlier post.', uploaded_by: by, status: 'fresh' });
  if (error) return { error: error.message };
  return planClient(sb, s);
}

/** Kept for the desk button. */
export async function planFromToday(sb: SupabaseClient, s: SettingsRow): Promise<PlanOutcome[]> {
  return planClient(sb, s);
}
