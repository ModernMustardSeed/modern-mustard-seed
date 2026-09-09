/**
 * Facebook Page photo post, the way the Rolodex posts: one call to
 * /{page-id}/photos with the image URL and the caption, published now.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessToken, markAccount } from '../accounts';
import type { PostResult } from '../types';

const GRAPH = 'https://graph.facebook.com/v21.0';

export async function publishFacebook(sb: SupabaseClient, clientEmail: string, caption: string, imageUrl: string | null): Promise<PostResult> {
  const at = new Date().toISOString();
  const acct = await accessToken(sb, clientEmail, 'facebook');
  if (!acct) return { ok: false, error: 'Facebook is not connected.', at, pending: true };
  const pageId = acct.row.external_id;
  if (!pageId) return { ok: false, error: 'No Page id on the connection. Reconnect Facebook.', at };

  const form = new URLSearchParams();
  form.set('access_token', acct.token);
  form.set('published', 'true');
  let endpoint: string;
  if (imageUrl) {
    endpoint = `${GRAPH}/${pageId}/photos`;
    form.set('url', imageUrl);
    form.set('message', caption);
  } else {
    endpoint = `${GRAPH}/${pageId}/feed`;
    form.set('message', caption);
  }

  try {
    const res = await fetch(endpoint, { method: 'POST', body: form, signal: AbortSignal.timeout(60_000) });
    const j = (await res.json().catch(() => ({}))) as { id?: string; post_id?: string; error?: { message?: string; code?: number } };
    if (!res.ok || j.error) {
      const msg = j.error?.message ?? `HTTP ${res.status}`;
      if (j.error?.code === 190) await markAccount(sb, clientEmail, 'facebook', 'revoked', msg);
      return { ok: false, error: msg, at };
    }
    const id = j.post_id ?? j.id ?? '';
    return { ok: true, id, url: id ? `https://www.facebook.com/${id}` : undefined, at };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error', at };
  }
}
