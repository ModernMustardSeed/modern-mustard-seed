/**
 * Google Business Profile update through the Business Profile API, on the
 * Google connection the portal already holds (business.manage scope). Google
 * gates this API behind a per-project quota request; until it is granted the
 * call answers 403 and the result says so in words, so the desk shows the
 * hand-post sheet instead of a green check that lies.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getGoogleAccessToken } from '@/lib/oauth-google';
import type { PostResult } from '../types';

const API = 'https://mybusiness.googleapis.com/v4';
const ACCOUNTS = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const INFO = 'https://mybusinessbusinessinformation.googleapis.com/v1';

/** The locations this Google connection can post to, for the picker. */
export async function listGbpLocations(sb: SupabaseClient, clientEmail: string): Promise<{ ok: true; locations: Array<{ name: string; title: string }> } | { ok: false; error: string }> {
  const token = await getGoogleAccessToken(sb, clientEmail);
  if (!token) return { ok: false, error: 'Google is not connected.' };
  try {
    const a = await fetch(`${ACCOUNTS}/accounts`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) });
    const aj = (await a.json().catch(() => ({}))) as { accounts?: Array<{ name: string }>; error?: { message?: string; status?: string } };
    if (!a.ok) return { ok: false, error: aj.error?.status === 'PERMISSION_DENIED' ? 'Google has not approved Business Profile API access for this project yet.' : (aj.error?.message ?? `HTTP ${a.status}`) };
    const out: Array<{ name: string; title: string }> = [];
    for (const acc of aj.accounts ?? []) {
      const l = await fetch(`${INFO}/${acc.name}/locations?readMask=name,title&pageSize=50`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) });
      const lj = (await l.json().catch(() => ({}))) as { locations?: Array<{ name: string; title: string }> };
      for (const loc of lj.locations ?? []) out.push({ name: `${acc.name}/${loc.name}`, title: loc.title });
    }
    return { ok: true, locations: out };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

export async function publishGbp(sb: SupabaseClient, clientEmail: string, caption: string, imageUrl: string | null, location: string | null, siteUrl: string | null): Promise<PostResult> {
  const at = new Date().toISOString();
  if (!location) return { ok: false, error: 'No Business Profile location chosen.', at, pending: true };
  const token = await getGoogleAccessToken(sb, clientEmail);
  if (!token) return { ok: false, error: 'Google is not connected.', at, pending: true };

  const body: Record<string, unknown> = {
    languageCode: 'en-US',
    summary: caption.slice(0, 1500),
    topicType: 'STANDARD',
  };
  if (siteUrl) body.callToAction = { actionType: 'LEARN_MORE', url: siteUrl };
  if (imageUrl) body.media = [{ mediaFormat: 'PHOTO', sourceUrl: imageUrl }];

  try {
    const res = await fetch(`${API}/${location}/localPosts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const j = (await res.json().catch(() => ({}))) as { name?: string; searchUrl?: string; error?: { message?: string; status?: string } };
    if (!res.ok) {
      const msg = j.error?.status === 'PERMISSION_DENIED' ? 'Google has not approved Business Profile API access for this project yet. Hand-post from the sheet.' : (j.error?.message ?? `HTTP ${res.status}`);
      return { ok: false, error: msg, at, pending: j.error?.status === 'PERMISSION_DENIED' };
    }
    return { ok: true, id: j.name, url: j.searchUrl, at };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error', at };
  }
}
