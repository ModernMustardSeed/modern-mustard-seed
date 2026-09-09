/**
 * THE PUBLISHER. Runs every hour. For every post whose first hour has come:
 *   1. Make sure it has words: Claude's edit if it landed, the mechanical
 *      editor (their text, verbatim, platform-shaped) if it did not. A post
 *      never waits on the model, and it is always their words.
 *   2. Fire every platform whose own hour has passed and is connected by API.
 *      A platform whose hour is still ahead waits; the row stays open until
 *      the last one fires.
 *   3. Hand the rest to Sarah as a sheet, once, at the first hour, and record it.
 *   4. Record every result on the row, so both desks show the truth.
 * Idempotent: a platform that already succeeded is never posted twice, and a
 * row is claimed with a status flip before any network call, so two overlapping
 * ticks cannot both publish it. A held post (graphic, approval) is never picked
 * up by the clock.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { captionsFromJson, scrub, templateCaptions, type Brief } from './captions';
import { getSettings } from './settings';
import { sendFailureNote, sendHandPostSheet } from './notify';
import { publishFacebook } from './publishers/facebook';
import { publishInstagram } from './publishers/instagram';
import { publishX } from './publishers/x';
import { publishLinkedIn } from './publishers/linkedin';
import { publishGbp } from './publishers/gbp';
import { accountViews } from './accounts';
import { mountainToUtc } from './time';
import { platformsFor } from './planner';
import { API_PLATFORMS, hourFor, type Captions, type MaterialRow, type Notes, type Platform, type PostResult, type PostRow, type SettingsRow } from './types';

async function materialFor(sb: SupabaseClient, post: PostRow): Promise<MaterialRow | null> {
  if (!post.material_id) return null;
  const { data } = await sb.from('posting_materials').select('*').eq('id', post.material_id).maybeSingle();
  return (data as MaterialRow | null) ?? null;
}

/** Fill captions from the drainer or the mechanical editor. Returns the row as it now stands. */
export async function ensureWords(sb: SupabaseClient, s: SettingsRow, post: PostRow): Promise<PostRow> {
  const has = post.captions && post.captions.facebook && post.captions.instagram;
  if (has && post.status !== 'writing') return post;

  let headline = post.headline;
  let captions: Captions | null = null;
  let notes: Notes | null = null;
  let writtenBy: string | null = null;

  if (post.llm_job_id) {
    const { data: job } = await sb.from('llm_jobs').select('status, result_json').eq('id', post.llm_job_id).maybeSingle();
    if (job?.status === 'done' && job.result_json) {
      const parsed = captionsFromJson(job.result_json);
      if (parsed) {
        captions = parsed.captions;
        notes = parsed.notes;
        headline = parsed.headline;
        writtenBy = 'claude';
      }
    }
  }

  if (!captions) {
    const material = await materialFor(sb, post);
    const brief: Brief = { material: material ?? { text: post.headline, note: null, url: post.image_url, wants_graphic: false, graphic_brief: null, link: post.link, platforms: post.platforms }, dateStr: post.scheduled_for };
    const t = templateCaptions(s, brief);
    captions = t.captions;
    notes = t.notes;
    headline = headline ?? t.headline;
    writtenBy = 'template';
  }

  const patch = { captions: scrub(captions), notes, headline, written_by: writtenBy, status: post.status === 'writing' ? 'scheduled' : post.status, updated_at: new Date().toISOString() };
  await sb.from('posting_posts').update(patch).eq('id', post.id);
  return { ...post, ...patch, status: patch.status as PostRow['status'] };
}

/** Try once more to swap the mechanical edit for Claude's, for rows still ahead of their hour. */
export async function upgradeWords(sb: SupabaseClient, post: PostRow): Promise<void> {
  if (!post.llm_job_id || post.written_by !== 'template' || post.edited_by) return;
  const { data: job } = await sb.from('llm_jobs').select('status, result_json').eq('id', post.llm_job_id).maybeSingle();
  if (job?.status !== 'done' || !job.result_json) return;
  const parsed = captionsFromJson(job.result_json);
  if (!parsed) return;
  await sb.from('posting_posts').update({ captions: parsed.captions, notes: parsed.notes, headline: parsed.headline, written_by: 'claude', updated_at: new Date().toISOString() }).eq('id', post.id).eq('written_by', 'template');
}

export type PublishOutcome = { postId: string; client: string; date: string; status: PostRow['status']; results: Partial<Record<Platform, PostResult>>; sheet: Platform[]; waiting: Platform[] };

/** Has this platform's own hour on the post's day passed? */
function due(s: SettingsRow, post: PostRow, p: Platform, now: Date): boolean {
  return mountainToUtc(post.scheduled_for, hourFor(s, p)).getTime() <= now.getTime();
}

/** Publish one post now: every platform whose hour has come, or all of them when forced. */
export async function publishPost(sb: SupabaseClient, postId: string, opts: { force?: boolean; now?: Date } = {}): Promise<PublishOutcome | { error: string }> {
  const now = opts.now ?? new Date();
  const { data } = await sb.from('posting_posts').select('*').eq('id', postId).maybeSingle();
  if (!data) return { error: 'No such post.' };
  let post = data as PostRow;
  const s = await getSettings(sb, post.client_email);
  if (!s) return { error: 'No posting settings for this client.' };
  if (post.status === 'skipped') return { error: 'This post was skipped.' };
  if (post.status === 'held' && !opts.force) return { error: 'This post is held.' };

  // Claim it. The status flip is the lock; a second tick sees 'publishing' and leaves it.
  const { data: claimed } = await sb
    .from('posting_posts')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', post.id)
    .in('status', opts.force ? ['writing', 'scheduled', 'held', 'partial', 'failed'] : ['writing', 'scheduled', 'partial', 'failed'])
    .select('id');
  if (!claimed?.length) return { error: 'Already publishing.' };
  post = { ...post, status: 'publishing' };

  post = await ensureWords(sb, s, post);
  const accounts = await accountViews(sb, post.client_email);
  const connected = new Set(accounts.filter((a) => a.connected).map((a) => a.provider));
  const platforms = platformsFor(s, post.platforms);
  const results: Partial<Record<Platform, PostResult>> & { note?: string } = { ...(post.results ?? {}) };
  delete results.note;
  const failed: Array<{ platform: Platform; error: string }> = [];
  const sheet: Platform[] = [];
  const waiting: Platform[] = [];
  const gbpLocation = accounts.find((a) => a.provider === 'gbp')?.externalId ?? null;

  for (const p of platforms) {
    if (results[p]?.ok) continue; // never twice
    if (!opts.force && !due(s, post, p, now)) {
      waiting.push(p);
      continue;
    }
    const caption = post.captions[p] ?? post.captions.facebook ?? '';
    if (!API_PLATFORMS.includes(p) || !connected.has(p)) {
      if (!results[p]?.manual) {
        results[p] = { ok: false, pending: true, at: new Date().toISOString(), error: p === 'houzz' ? 'Hand-posted from the sheet.' : 'Not connected. Hand-posted from the sheet.' };
        sheet.push(p);
      }
      continue;
    }
    let r: PostResult;
    switch (p) {
      case 'facebook':
        r = await publishFacebook(sb, post.client_email, caption, post.image_url);
        break;
      case 'instagram':
        r = await publishInstagram(sb, post.client_email, caption, post.image_url);
        break;
      case 'x':
        r = await publishX(sb, post.client_email, caption, post.image_url);
        break;
      case 'linkedin':
        r = await publishLinkedIn(sb, post.client_email, caption, post.image_url);
        break;
      case 'gbp':
        r = await publishGbp(sb, post.client_email, caption, post.image_url, gbpLocation, post.link ?? s.site_url);
        break;
      default:
        continue;
    }
    results[p] = r;
    if (!r.ok) {
      if (r.pending) sheet.push(p);
      else failed.push({ platform: p, error: r.error ?? 'unknown' });
    }
  }

  const apiTried = platforms.filter((p) => API_PLATFORMS.includes(p) && connected.has(p) && !waiting.includes(p));
  const apiOk = apiTried.filter((p) => results[p]?.ok);
  const manualOk = platforms.filter((p) => results[p]?.manual);
  let status: PostRow['status'];
  if (waiting.length) status = apiOk.length || manualOk.length ? 'partial' : 'scheduled';
  else if (apiTried.length === 0) status = manualOk.length === platforms.length ? 'published' : 'partial';
  else if (apiOk.length === apiTried.length) status = 'published';
  else if (apiOk.length > 0) status = 'partial';
  else status = 'failed';

  const patch: Record<string, unknown> = { status, results, updated_at: new Date().toISOString() };
  if (apiOk.length || manualOk.length) patch.published_at = post.published_at ?? new Date().toISOString();
  // Platforms still ahead: the row comes back at the next hour that matters.
  if (waiting.length) patch.publish_at = new Date(Math.min(...waiting.map((p) => mountainToUtc(post.scheduled_for, hourFor(s, p)).getTime()))).toISOString();

  // The sheet goes once per post. A retry after a fix does not re-send it.
  if (sheet.length && !post.sheet_sent_at) {
    const sent = await sendHandPostSheet(s, { ...post, results }, sheet);
    if (sent) patch.sheet_sent_at = new Date().toISOString();
  }
  await sb.from('posting_posts').update(patch).eq('id', post.id);
  if (failed.length) await sendFailureNote(s, post, failed);

  return { postId: post.id, client: post.client_email, date: post.scheduled_for, status, results, sheet, waiting };
}

/** Everything whose next hour has come, oldest first, bounded so a tick always finishes. */
export async function publishDue(sb: SupabaseClient, now = new Date(), limit = 10): Promise<PublishOutcome[]> {
  const { data } = await sb
    .from('posting_posts')
    .select('id')
    .in('status', ['writing', 'scheduled', 'partial'])
    .lte('publish_at', now.toISOString())
    .order('publish_at', { ascending: true })
    .limit(limit);
  const out: PublishOutcome[] = [];
  for (const row of data ?? []) {
    const r = await publishPost(sb, row.id as string, { now });
    if (!('error' in r)) out.push(r);
  }
  return out;
}

/** Retry the failed platforms of a post whose failure has been fixed (a reconnect, usually). */
export async function retryFailed(sb: SupabaseClient, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 36 * 3600_000).toISOString();
  const { data } = await sb.from('posting_posts').select('id').eq('status', 'failed').gte('publish_at', since).lte('publish_at', now.toISOString()).limit(10);
  let n = 0;
  for (const row of data ?? []) {
    const r = await publishPost(sb, row.id as string, { now });
    if (!('error' in r)) n++;
  }
  return n;
}

/** Mark a hand-posted platform done, with the live link when there is one. */
export async function markManual(sb: SupabaseClient, postId: string, platform: Platform, url: string | null, by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await sb.from('posting_posts').select('results, status, published_at, client_email, platforms').eq('id', postId).maybeSingle();
  if (!data) return { ok: false, error: 'No such post.' };
  const results = { ...((data.results as PostRow['results']) ?? {}) };
  results[platform] = { ok: true, manual: true, url: url || undefined, at: new Date().toISOString(), id: by };
  const s = await getSettings(sb, data.client_email as string);
  const platforms = s ? platformsFor(s, data.platforms as Platform[] | null) : [];
  const all = platforms.length ? platforms.every((p) => results[p]?.ok) : false;
  const anyApiFailed = platforms.some((p) => results[p] && !results[p]?.ok && !results[p]?.pending);
  const status = all ? 'published' : anyApiFailed ? (data.status as string) : 'partial';
  await sb.from('posting_posts').update({ results, status, published_at: (data.published_at as string | null) ?? new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', postId);
  return { ok: true };
}
