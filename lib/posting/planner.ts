/**
 * THE PLANNER. Every evening it makes sure the next three days each have a
 * post row: the freshest photo the client dropped, or an evergreen brief when
 * the bin is empty. It queues the writing and records the job id; the
 * publisher collects the words later. Idempotent: a day that already has a
 * row is left alone unless a fresh photo arrived and the row was evergreen,
 * in which case the photo takes the day (the client's own material always
 * wins over the bank).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueCaptions, type Brief } from './captions';
import { evergreenFor } from './evergreen';
import { mountainToUtc, addDays, mountainDate } from './time';
import type { MaterialRow, PostRow, SettingsRow } from './types';

export const PLAN_AHEAD_DAYS = 3;

async function freshMaterial(sb: SupabaseClient, clientEmail: string, excludeIds: string[]): Promise<MaterialRow | null> {
  let q = sb.from('posting_materials').select('*').eq('client_email', clientEmail).eq('status', 'fresh').eq('kind', 'photo').order('created_at', { ascending: true }).limit(1);
  if (excludeIds.length) q = q.not('id', 'in', `(${excludeIds.join(',')})`);
  const { data } = await q;
  return ((data ?? [])[0] as MaterialRow | undefined) ?? null;
}

/** A brand photo for an evergreen day: the one used least, longest ago. */
async function brandImage(sb: SupabaseClient, clientEmail: string): Promise<MaterialRow | null> {
  const { data } = await sb
    .from('posting_materials')
    .select('*')
    .eq('client_email', clientEmail)
    .eq('kind', 'brand')
    .neq('status', 'archived')
    .order('used_count', { ascending: true })
    .order('last_used_on', { ascending: true, nullsFirst: true })
    .limit(1);
  return ((data ?? [])[0] as MaterialRow | undefined) ?? null;
}

export type PlanOutcome = { date: string; action: 'kept' | 'created' | 'replaced' | 'skipped'; source?: string; jobId?: string | null };

export async function planClient(sb: SupabaseClient, s: SettingsRow, opts: { from?: string; days?: number; force?: boolean } = {}): Promise<PlanOutcome[]> {
  const out: PlanOutcome[] = [];
  if (!s.active) return out;
  const start = opts.from ?? addDays(mountainDate(), 1);
  const days = opts.days ?? PLAN_AHEAD_DAYS;
  const claimed: string[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const { data: existing } = await sb.from('posting_posts').select('*').eq('client_email', s.client_email).eq('scheduled_for', date).maybeSingle();
    const row = existing as PostRow | null;
    if (row?.material_id) claimed.push(row.material_id);

    // A person's own words or a published post are never overwritten.
    if (row && (row.edited_by || ['published', 'partial', 'publishing', 'skipped'].includes(row.status)) && !opts.force) {
      out.push({ date, action: 'kept', source: row.source });
      continue;
    }

    const photo = await freshMaterial(sb, s.client_email, claimed);
    if (row && !photo && !opts.force) {
      out.push({ date, action: 'kept', source: row.source });
      continue;
    }
    if (row && row.source === 'material' && !opts.force) {
      out.push({ date, action: 'kept', source: row.source });
      continue;
    }

    const brief: Brief = photo
      ? { kind: 'material', material: photo, dateStr: date }
      : { kind: 'evergreen', evergreen: evergreenFor(s, date), dateStr: date };
    const image = photo ?? (await brandImage(sb, s.client_email));
    let jobId: string | null = null;
    try {
      jobId = await enqueueCaptions(s, brief);
    } catch {
      jobId = null; // the template writer covers it at publish time
    }

    const publishAt = mountainToUtc(date, s.post_hour_mt).toISOString();
    const values = {
      client_email: s.client_email,
      scheduled_for: date,
      publish_at: publishAt,
      material_id: image?.id ?? null,
      image_url: image?.url ?? null,
      headline: photo ? (photo.note ?? '').split(/[.!?\n]/)[0].slice(0, 60) || 'A new photo' : null,
      captions: {},
      source: photo ? 'material' : 'evergreen',
      evergreen_key: photo ? null : brief.evergreen?.key ?? null,
      status: 'writing',
      results: {},
      llm_job_id: jobId,
      written_by: null,
      edited_by: null,
      updated_at: new Date().toISOString(),
    };
    if (row) {
      await sb.from('posting_posts').update(values).eq('id', row.id);
      out.push({ date, action: 'replaced', source: values.source, jobId });
    } else {
      await sb.from('posting_posts').insert(values);
      out.push({ date, action: 'created', source: values.source, jobId });
    }
    if (photo) {
      claimed.push(photo.id);
      // Claimed for a day. It goes back to fresh only if the day is skipped by a person.
      await sb.from('posting_materials').update({ status: 'used', used_count: photo.used_count + 1, last_used_on: date }).eq('id', photo.id);
    }
  }
  return out;
}

/** Plan today as well, for a brand-new client whose first post should not wait until tomorrow. */
export async function planFromToday(sb: SupabaseClient, s: SettingsRow): Promise<PlanOutcome[]> {
  const today = mountainDate();
  const nowUtc = Date.now();
  const todayPublish = mountainToUtc(today, s.post_hour_mt).getTime();
  // If today's hour has passed, today's post publishes on the next publisher tick instead of waiting a day.
  const results = await planClient(sb, s, { from: today, days: PLAN_AHEAD_DAYS + 1 });
  if (todayPublish < nowUtc) {
    await sb.from('posting_posts').update({ publish_at: new Date(nowUtc + 5 * 60_000).toISOString() }).eq('client_email', s.client_email).eq('scheduled_for', today).in('status', ['writing', 'scheduled']);
  }
  return results;
}
