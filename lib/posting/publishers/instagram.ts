/**
 * Instagram feed photo through the Graph API: create a media container from a
 * public JPEG URL, wait for it to be ready, then publish it. Text-only posts
 * do not exist on Instagram, so a day with no image is skipped here and the
 * result says so.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessToken, markAccount } from '../accounts';
import type { PostResult } from '../types';

const GRAPH = 'https://graph.facebook.com/v21.0';

export async function publishInstagram(sb: SupabaseClient, clientEmail: string, caption: string, imageUrl: string | null): Promise<PostResult> {
  const at = new Date().toISOString();
  const acct = await accessToken(sb, clientEmail, 'instagram');
  if (!acct) return { ok: false, error: 'Instagram is not connected.', at, pending: true };
  const igId = acct.row.external_id;
  if (!igId) return { ok: false, error: 'No Instagram account id on the connection. Reconnect Facebook.', at };
  if (!imageUrl) return { ok: false, error: 'Instagram needs a photo. No image on this post.', at };

  try {
    const create = new URLSearchParams({ image_url: imageUrl, caption, access_token: acct.token });
    const c = await fetch(`${GRAPH}/${igId}/media`, { method: 'POST', body: create, signal: AbortSignal.timeout(60_000) });
    const cj = (await c.json().catch(() => ({}))) as { id?: string; error?: { message?: string; code?: number } };
    if (!c.ok || !cj.id) {
      const msg = cj.error?.message ?? `HTTP ${c.status}`;
      if (cj.error?.code === 190) await markAccount(sb, clientEmail, 'instagram', 'revoked', msg);
      return { ok: false, error: msg, at };
    }

    // The container finishes in a few seconds for a JPEG. Give it up to a minute.
    for (let i = 0; i < 12; i++) {
      const s = await fetch(`${GRAPH}/${cj.id}?fields=status_code,status&access_token=${encodeURIComponent(acct.token)}`, { signal: AbortSignal.timeout(20_000) });
      const sj = (await s.json().catch(() => ({}))) as { status_code?: string; status?: string };
      if (sj.status_code === 'FINISHED') break;
      if (sj.status_code === 'ERROR') return { ok: false, error: `Instagram rejected the image: ${sj.status ?? 'unknown'}`, at };
      await new Promise((r) => setTimeout(r, 5000));
    }

    const pub = new URLSearchParams({ creation_id: cj.id, access_token: acct.token });
    const p = await fetch(`${GRAPH}/${igId}/media_publish`, { method: 'POST', body: pub, signal: AbortSignal.timeout(60_000) });
    const pj = (await p.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
    if (!p.ok || !pj.id) return { ok: false, error: pj.error?.message ?? `HTTP ${p.status}`, at };

    // The permalink is one more read; worth it so the calendar links to the live post.
    let url: string | undefined;
    try {
      const l = await fetch(`${GRAPH}/${pj.id}?fields=permalink&access_token=${encodeURIComponent(acct.token)}`, { signal: AbortSignal.timeout(20_000) });
      const lj = (await l.json().catch(() => ({}))) as { permalink?: string };
      url = lj.permalink;
    } catch {
      /* the post is live without it */
    }
    return { ok: true, id: pj.id, url, at };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error', at };
  }
}
