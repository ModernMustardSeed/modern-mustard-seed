import type { SupabaseClient } from '@supabase/supabase-js';
import { getGoogleAccessToken } from '@/lib/oauth-google';
import { CHANNEL_KEY } from '@/lib/youtube';
import { tierFor, type CreatorTier, type ProspectInput } from './store';

/**
 * THE PARTNER DESK, the finder.
 *
 * Creator discovery through the YouTube Data API v3: the one free, documented
 * source that returns audience size and a public description (where creators
 * publish their business email) for a keyword search. Instagram and TikTok
 * expose neither without a paid vendor.
 *
 * Two ways to be allowed in, tried in this order:
 *   1. YOUTUBE_API_KEY (Google Cloud > APIs > YouTube Data API v3; free,
 *      10,000 units a day, a search page costs about 100).
 *   2. The @modernmustardseed channel connected at /admin/youtube. Its OAuth
 *      grant already carries youtube.readonly, which is all a search needs.
 * Neither present: discoverConfigured() is false and the desk says exactly
 * which of the two to set up. It never fakes results.
 */

export type DiscoveredCreator = {
  channelId: string;
  name: string;
  handle?: string;
  url: string;
  description: string;
  subscribers: number;
  videos: number;
  views: number;
  email?: string;
  tier: CreatorTier | null;
  country?: string;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function extractEmail(text: string): string | undefined {
  const all = (text.match(EMAIL_RE) || []).map((e) => e.toLowerCase());
  return all.find((e) => !/example\.|\.png$|\.jpg$|noreply|no-reply|sentry|wixpress/.test(e));
}

type Auth = { key: string } | { token: string };

async function resolveAuth(sb: SupabaseClient | null): Promise<Auth | null> {
  const key = (process.env.YOUTUBE_API_KEY || '').trim();
  if (key) return { key };
  if (!sb) return null;
  try {
    const token = await getGoogleAccessToken(sb, CHANNEL_KEY);
    if (token) return { token };
  } catch {
    /* not connected */
  }
  return null;
}

export async function discoverConfigured(sb: SupabaseClient | null): Promise<{ ok: boolean; via: 'key' | 'channel' | null }> {
  const auth = await resolveAuth(sb);
  if (!auth) return { ok: false, via: null };
  return { ok: true, via: 'key' in auth ? 'key' : 'channel' };
}

async function yt(auth: Auth, path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams('key' in auth ? { ...params, key: auth.key } : params);
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`, {
    cache: 'no-store',
    headers: 'token' in auth ? { Authorization: `Bearer ${auth.token}` } : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok) {
    const err = j.error as { message?: string } | undefined;
    throw new Error(err?.message || `YouTube ${path} failed (${r.status})`);
  }
  return j;
}

/** Search channels for a query, hydrate statistics and description, largest first. */
export async function discoverCreators(
  sb: SupabaseClient | null,
  opts: { query: string; minSubscribers?: number; pages?: number }
): Promise<DiscoveredCreator[]> {
  const auth = await resolveAuth(sb);
  if (!auth) throw new Error('YouTube discovery is not set up');
  const min = opts.minSubscribers ?? 10_000;
  const pages = Math.min(Math.max(opts.pages ?? 2, 1), 4);
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < pages; i++) {
    const s = (await yt(auth, 'search', {
      part: 'snippet',
      type: 'channel',
      q: opts.query,
      maxResults: '50',
      relevanceLanguage: 'en',
      regionCode: 'US',
      ...(pageToken ? { pageToken } : {}),
    })) as { items?: { snippet: { channelId: string } }[]; nextPageToken?: string };
    for (const it of s.items || []) ids.push(it.snippet.channelId);
    pageToken = s.nextPageToken;
    if (!pageToken) break;
  }
  const uniq = Array.from(new Set(ids));
  const out: DiscoveredCreator[] = [];
  for (let i = 0; i < uniq.length; i += 50) {
    const c = (await yt(auth, 'channels', {
      part: 'snippet,statistics',
      id: uniq.slice(i, i + 50).join(','),
      maxResults: '50',
    })) as {
      items?: {
        id: string;
        snippet: { title: string; description: string; customUrl?: string; country?: string };
        statistics: { subscriberCount?: string; videoCount?: string; viewCount?: string };
      }[];
    };
    for (const ch of c.items || []) {
      const subs = Number(ch.statistics.subscriberCount || 0);
      if (subs < min) continue;
      const handle = ch.snippet.customUrl?.replace(/^@/, '');
      out.push({
        channelId: ch.id,
        name: ch.snippet.title,
        handle,
        url: handle ? `https://www.youtube.com/@${handle}` : `https://www.youtube.com/channel/${ch.id}`,
        description: ch.snippet.description || '',
        subscribers: subs,
        videos: Number(ch.statistics.videoCount || 0),
        views: Number(ch.statistics.viewCount || 0),
        email: extractEmail(ch.snippet.description || ''),
        tier: tierFor(subs),
        country: ch.snippet.country,
      });
    }
  }
  return out.sort((a, b) => b.subscribers - a.subscribers);
}

export function toProspect(c: DiscoveredCreator, query: string): ProspectInput {
  return {
    name: c.name,
    kind: 'creator',
    handle: c.handle || null,
    platform: 'YouTube',
    niche: query,
    email: c.email || null,
    youtube: c.url,
    followers: c.subscribers,
    source: 'youtube',
    notes: c.description ? c.description.slice(0, 600) : null,
  };
}

/**
 * Queries that surface the people whose audience runs a small business. The
 * desk runs them one at a time; each is a search page or two against the quota.
 */
export const DISCOVERY_QUERIES = [
  'small business marketing',
  'local business marketing',
  'how to get more customers small business',
  'marketing for contractors',
  'landscaping business owner',
  'salon owner',
  'restaurant owner',
  'real estate agent tips',
  'bookkeeping for small business',
  'small business owner day in the life',
  'AI for small business',
  'AI tools for business',
  'christian entrepreneur',
  'church leadership',
  'side hustle',
  'trades business',
];
