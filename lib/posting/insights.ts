/**
 * HOW IT DID. Once a post is out, the numbers come back from the platforms
 * that give them by API (Facebook and Instagram on the Page token, X on the
 * user token) and sit on the post row, so the client sees reach and
 * reactions on the same card that shows the words. Refreshed daily for a
 * week after each post, then left alone.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessToken } from './accounts';
import type { PlatformStats, Platform, PostRow } from './types';

const GRAPH = 'https://graph.facebook.com/v21.0';

async function facebookStats(sb: SupabaseClient, clientEmail: string, postId: string): Promise<PlatformStats | null> {
  const acct = await accessToken(sb, clientEmail, 'facebook');
  if (!acct) return null;
  try {
    const res = await fetch(`${GRAPH}/${postId}?fields=likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions_unique)&access_token=${encodeURIComponent(acct.token)}`, { signal: AbortSignal.timeout(20_000) });
    const j = (await res.json().catch(() => ({}))) as { likes?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } }; shares?: { count?: number }; insights?: { data?: Array<{ name: string; values?: Array<{ value?: number }> }> }; error?: unknown };
    if (!res.ok || j.error) return null;
    const reach = j.insights?.data?.find((d) => d.name === 'post_impressions_unique')?.values?.[0]?.value;
    return { reach, likes: j.likes?.summary?.total_count, comments: j.comments?.summary?.total_count, shares: j.shares?.count, at: new Date().toISOString() };
  } catch {
    return null;
  }
}

async function instagramStats(sb: SupabaseClient, clientEmail: string, mediaId: string): Promise<PlatformStats | null> {
  const acct = await accessToken(sb, clientEmail, 'instagram');
  if (!acct) return null;
  try {
    const res = await fetch(`${GRAPH}/${mediaId}?fields=like_count,comments_count,insights.metric(reach,saved)&access_token=${encodeURIComponent(acct.token)}`, { signal: AbortSignal.timeout(20_000) });
    const j = (await res.json().catch(() => ({}))) as { like_count?: number; comments_count?: number; insights?: { data?: Array<{ name: string; values?: Array<{ value?: number }> }> }; error?: unknown };
    if (!res.ok || j.error) return null;
    const metric = (n: string) => j.insights?.data?.find((d) => d.name === n)?.values?.[0]?.value;
    return { reach: metric('reach'), saves: metric('saved'), likes: j.like_count, comments: j.comments_count, at: new Date().toISOString() };
  } catch {
    return null;
  }
}

async function xStats(sb: SupabaseClient, clientEmail: string, tweetId: string): Promise<PlatformStats | null> {
  const acct = await accessToken(sb, clientEmail, 'x');
  if (!acct) return null;
  try {
    const res = await fetch(`https://api.x.com/2/tweets/${tweetId}?tweet.fields=public_metrics`, { headers: { Authorization: `Bearer ${acct.token}` }, signal: AbortSignal.timeout(20_000) });
    const j = (await res.json().catch(() => ({}))) as { data?: { public_metrics?: { impression_count?: number; like_count?: number; reply_count?: number; retweet_count?: number } } };
    const m = j.data?.public_metrics;
    if (!res.ok || !m) return null;
    return { reach: m.impression_count, likes: m.like_count, comments: m.reply_count, shares: m.retweet_count, at: new Date().toISOString() };
  } catch {
    return null;
  }
}

/** Refresh the numbers on one post for every platform that posted by API. */
export async function refreshStats(sb: SupabaseClient, post: PostRow): Promise<Partial<Record<Platform, PlatformStats>>> {
  const stats: Partial<Record<Platform, PlatformStats>> = { ...(post.stats ?? {}) };
  const results = post.results ?? {};
  const fb = results.facebook;
  if (fb?.ok && fb.id && !fb.manual) {
    const s = await facebookStats(sb, post.client_email, fb.id);
    if (s) stats.facebook = s;
  }
  const ig = results.instagram;
  if (ig?.ok && ig.id && !ig.manual) {
    const s = await instagramStats(sb, post.client_email, ig.id);
    if (s) stats.instagram = s;
  }
  const x = results.x;
  if (x?.ok && x.id && !x.manual) {
    const s = await xStats(sb, post.client_email, x.id);
    if (s) stats.x = s;
  }
  await sb.from('posting_posts').update({ stats, stats_at: new Date().toISOString() }).eq('id', post.id);
  return stats;
}

/** Every post from the last eight days that went out by API, refreshed. Bounded. */
export async function refreshRecentStats(sb: SupabaseClient, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 8 * 86_400_000).toISOString();
  const { data } = await sb.from('posting_posts').select('*').in('status', ['published', 'partial']).gte('published_at', since).order('published_at', { ascending: false }).limit(40);
  let n = 0;
  for (const row of data ?? []) {
    const post = row as PostRow;
    const anyApi = (['facebook', 'instagram', 'x'] as Platform[]).some((p) => post.results?.[p]?.ok && !post.results?.[p]?.manual);
    if (!anyApi) continue;
    await refreshStats(sb, post);
    n++;
  }
  return n;
}
