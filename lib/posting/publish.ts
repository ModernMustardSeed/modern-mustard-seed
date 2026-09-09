/**
 * THE PUBLISHER. Runs every hour. For every post whose time has come:
 *   1. Make sure it has words: the drainer's answer if it landed, the template
 *      writer if it did not. A post never waits on the model.
 *   2. Put it on every API-connected platform the client has turned on.
 *   3. Hand the rest to Sarah as a sheet, once, and record that.
 *   4. Record every result on the row, so both desks show the truth.
 * Idempotent: a platform that already succeeded is never posted twice, and a
 * row is claimed with a status flip before any network call, so two overlapping
 * ticks cannot both publish it.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { captionsFromJson, scrub, templateCaptions, type Brief } from './captions';
import { evergreenFor } from './evergreen';
import { getSettings } from './settings';
import { sendFailureNote, sendHandPostSheet } from './notify';
import { publishFacebook } from './publishers/facebook';
import { publishInstagram } from './publishers/instagram';
import { publishX } from './publishers/x';
import { publishLinkedIn } from './publishers/linkedin';
import { publishGbp } from './publishers/gbp';
import { accountViews } from './accounts';
import { API_PLATFORMS, type Captions, type MaterialRow, type Platform, type PostResult, type PostRow, type SettingsRow } from './types';

/** Fill captions from the drainer or the template. Returns the row as it now stands. */
export async function ensureWords(sb: SupabaseClient, s: SettingsRow, post: PostRow): Promise<PostRow> {
  const has = post.captions && post.captions.facebook && post.captions.instagram;
  if (has && post.status !== 'writing') return post;

  let headline = post.headline;
  let captions: Captions | null = null;
  let writtenBy: string | null = null;

  if (post.llm_job_id) {
    const { data: job } = await sb.from('llm_jobs').select('status, result_json, error').eq('id', post.llm_job_id).maybeSingle();
    if (job?.status === 'done' && job.result_json) {
      const parsed = captionsFromJson(job.result_json);
      if (parsed) {
        captions = parsed.captions;
        headline = parsed.headline;
        writtenBy = 'claude';
      }
    }
  }

  if (!captions) {
    let material: MaterialRow | null = null;
    if (post.material_id) {
      const { data } = await sb.from('posting_materials').select('*').eq('id', post.material_id).maybeSingle();
      material = (data as MaterialRow | null) ?? null;
    }
    const brief: Brief =
      post.source === 'material' && material
        ? { kind: 'material', material, dateStr: post.scheduled_for }
        : { kind: 'evergreen', evergreen: evergreenFor(s, post.scheduled_for), dateStr: post.scheduled_for };
    const t = templateCaptions(s, brief);
    captions = t.captions;
    headline = headline ?? t.headline;
    writtenBy = 'template';
  }

  const patch = { captions: scrub(captions), headline, written_by: writtenBy, status: post.status === 'writing' ? 'scheduled' : post.status, updated_at: new Date().toISOString() };
  await sb.from('posting_posts').update(patch).eq('id', post.id);
  return { ...post, ...patch, status: patch.status as PostRow['status'] };
}

/** Try once more to swap template words for Claude's, for rows still ahead of their hour. */
export async function upgradeWords(sb: SupabaseClient, post: PostRow): Promise<void> {
  if (!post.llm_job_id || post.written_by !== 'template' || post.edited_by) return;
  const { data: job } = await sb.from('llm_jobs').select('status, result_json').eq('id', post.llm_job_id).maybeSingle();
  if (job?.status !== 'done' || !job.result_json) return;
  const parsed = captionsFromJson(job.result_json);
  if (!parsed) return;
  await sb.from('posting_posts').update({ captions: parsed.captions, headline: parsed.headline, written_by: 'claude', updated_at: new Date().toISOString() }).eq('id', post.id).eq('written_by', 'template');
}

export type PublishOutcome = { postId: string; client: string; date: string; status: PostRow['status']; results: Partial<Record<Platform, PostResult>>; sheet: Platform[] };

/** Publish one post now, whatever its clock says. Used by the cron and by the desk's "post now". */
export async function publishPost(sb: SupabaseClient, postId: string, opts: { force?: boolean } = {}): Promise<PublishOutcome | { error: string }> {
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
  const results: Partial<Record<Platform, PostResult>> = { ...(post.results ?? {}) };
  const failed: Array<{ platform: Platform; error: string }> = [];
  const sheet: Platform[] = [];
  const gbpLocation = accounts.find((a) => a.provider === 'gbp')?.externalId ?? null;

  for (const p of s.platforms) {
    if (results[p]?.ok) continue; // never twice
    const caption = post.captions[p] ?? post.captions.facebook ?? '';
    if (!API_PLATFORMS.includes(p) || !connected.has(p)) {
      // No API path: it goes on the sheet. Keep a prior manual tick if one exists.
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
        r = await publishGbp(sb, post.client_email, caption, post.image_url, gbpLocation, s.site_url);
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

  const apiTried = s.platforms.filter((p) => API_PLATFORMS.includes(p) && connected.has(p));
  const apiOk = apiTried.filter((p) => results[p]?.ok);
  const manualOk = s.platforms.filter((p) => results[p]?.manual);
  let status: PostRow['status'];
  if (apiTried.length === 0) status = manualOk.length === s.platforms.length ? 'published' : 'partial';
  else if (apiOk.length === apiTried.length) status = 'published';
  else if (apiOk.length > 0) status = 'partial';
  else status = 'failed';

  const patch: Record<string, unknown> = { status, results, updated_at: new Date().toISOString() };
  if (apiOk.length || manualOk.length) patch.published_at = post.published_at ?? new Date().toISOString();

  // The sheet goes once per post. A retry after a fix does not re-send it.
  if (sheet.length && !post.sheet_sent_at) {
    const sent = await sendHandPostSheet(s, { ...post, results }, sheet);
    if (sent) patch.sheet_sent_at = new Date().toISOString();
  }
  await sb.from('posting_posts').update(patch).eq('id', post.id);
  if (failed.length) await sendFailureNote(s, post, failed);

  return { postId: post.id, client: post.client_email, date: post.scheduled_for, status, results, sheet };
}

/** Everything whose hour has come, oldest first, bounded so a tick always finishes. */
export async function publishDue(sb: SupabaseClient, now = new Date(), limit = 10): Promise<PublishOutcome[]> {
  const { data } = await sb
    .from('posting_posts')
    .select('id')
    .in('status', ['writing', 'scheduled'])
    .lte('publish_at', now.toISOString())
    .order('publish_at', { ascending: true })
    .limit(limit);
  const out: PublishOutcome[] = [];
  for (const row of data ?? []) {
    const r = await publishPost(sb, row.id as string);
    if (!('error' in r)) out.push(r);
  }
  return out;
}

/** Retry the failed platforms of a post whose failure has been fixed (a reconnect, usually). */
export async function retryFailed(sb: SupabaseClient, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 36 * 3600_000).toISOString();
  const { data } = await sb.from('posting_posts').select('id').in('status', ['failed', 'partial']).gte('publish_at', since).lte('publish_at', now.toISOString()).limit(10);
  let n = 0;
  for (const row of data ?? []) {
    const r = await publishPost(sb, row.id as string);
    if (!('error' in r)) n++;
  }
  return n;
}

/** Mark a hand-posted platform done, with the live link when there is one. */
export async function markManual(sb: SupabaseClient, postId: string, platform: Platform, url: string | null, by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await sb.from('posting_posts').select('results, status, published_at, client_email').eq('id', postId).maybeSingle();
  if (!data) return { ok: false, error: 'No such post.' };
  const results = { ...((data.results as PostRow['results']) ?? {}) };
  results[platform] = { ok: true, manual: true, url: url || undefined, at: new Date().toISOString(), id: by };
  const s = await getSettings(sb, data.client_email as string);
  const all = s ? s.platforms.every((p) => results[p]?.ok) : false;
  const anyApiFailed = Object.values(results).some((r) => r && !r.ok && !r.pending);
  const status = all ? 'published' : anyApiFailed ? (data.status as string) : 'partial';
  await sb.from('posting_posts').update({ results, status, published_at: (data.published_at as string | null) ?? new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', postId);
  return { ok: true };
}
