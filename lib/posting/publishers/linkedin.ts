/**
 * LinkedIn company page post through the Posts API, on the page admin's token
 * (w_organization_social). Image first: register an upload, PUT the bytes,
 * then create the post that references it.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessToken, markAccount } from '../accounts';
import type { PostResult } from '../types';

const API = 'https://api.linkedin.com/rest';
const VERSION = '202508';

function headers(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'LinkedIn-Version': VERSION, 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' };
}

export async function publishLinkedIn(sb: SupabaseClient, clientEmail: string, caption: string, imageUrl: string | null): Promise<PostResult> {
  const at = new Date().toISOString();
  const acct = await accessToken(sb, clientEmail, 'linkedin');
  if (!acct) return { ok: false, error: 'LinkedIn is not connected.', at, pending: true };
  const org = acct.row.external_id; // urn:li:organization:123
  if (!org) return { ok: false, error: 'No company page chosen on the LinkedIn connection.', at };

  try {
    let imageUrn: string | null = null;
    if (imageUrl) {
      const init = await fetch(`${API}/images?action=initializeUpload`, {
        method: 'POST',
        headers: headers(acct.token),
        body: JSON.stringify({ initializeUploadRequest: { owner: org } }),
        signal: AbortSignal.timeout(30_000),
      });
      const ij = (await init.json().catch(() => ({}))) as { value?: { uploadUrl?: string; image?: string }; message?: string };
      if (init.ok && ij.value?.uploadUrl && ij.value.image) {
        const img = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
        if (img.ok) {
          const bytes = Buffer.from(await img.arrayBuffer());
          const put = await fetch(ij.value.uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${acct.token}`, 'Content-Type': 'application/octet-stream' }, body: bytes, signal: AbortSignal.timeout(60_000) });
          if (put.ok || put.status === 201) imageUrn = ij.value.image;
        }
      }
    }

    const body: Record<string, unknown> = {
      author: org,
      commentary: caption,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
    if (imageUrn) body.content = { media: { id: imageUrn } };

    const res = await fetch(`${API}/posts`, { method: 'POST', headers: headers(acct.token), body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
    if (res.status === 401) {
      await markAccount(sb, clientEmail, 'linkedin', 'revoked', 'LinkedIn token expired. Reconnect.');
      return { ok: false, error: 'LinkedIn token expired. Reconnect.', at };
    }
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, error: j.message ?? `HTTP ${res.status}`, at };
    }
    const id = res.headers.get('x-restli-id') ?? '';
    return { ok: true, id, url: id ? `https://www.linkedin.com/feed/update/${id}` : undefined, at, ...(imageUrl && !imageUrn ? { error: 'Posted without the image.' } : {}) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error', at };
  }
}
