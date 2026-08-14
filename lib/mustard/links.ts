/**
 * MAGIC LINKS: the typing goes away, the consent does not.
 *
 * Sarah gets somebody to yes on a human call and sends a link that already
 * knows their number and their business. They open it, the field is filled, and
 * all they do is check the box and press the button.
 *
 * ⚠️ THE LINE THAT MATTERS: generating a link is not permission. The token
 * prefills a form. It never consents, it never dials, and there is deliberately
 * no code path anywhere that places a call because a link was opened. A link
 * that called on open would be an unsolicited AI telemarketing call wearing a
 * convenience feature as a disguise.
 *
 * Only the SHA-256 of the token is stored, so a leaked database row cannot be
 * replayed as a working link.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';

/** Short enough to be a real courtesy, long enough to survive a slow callback. */
export const DEFAULT_TTL_HOURS = 72;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type MintedLink = { url: string; token: string; expiresAt: string; id: string };

export async function mintLink(
  db: SupabaseClient | null,
  args: { leadId: string; source?: string; campaign?: string | null; createdBy?: string | null; ttlHours?: number; surfaceId?: string | null },
): Promise<MintedLink | null> {
  const client = db ?? getSupabase();
  if (!client) return null;

  // 32 bytes, base64url. The token is returned to the caller exactly once.
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (args.ttlHours ?? DEFAULT_TTL_HOURS) * 3600_000).toISOString();

  const { data, error } = await client
    .from('mustard_links')
    .insert({
      surface_id: args.surfaceId ?? null,
      lead_id: args.leadId,
      token_hash: hashToken(token),
      source: args.source ?? 'human-call',
      campaign: args.campaign ?? null,
      created_by: args.createdBy ?? null,
      expires_at: expiresAt,
    })
    .select('id')
    .single();
  if (error || !data) return null;

  const url = new URL(`${SITE.url}/mustard`);
  url.searchParams.set('t', token);
  return { url: url.toString(), token, expiresAt, id: data.id as string };
}

export type LinkPrefill = {
  linkId: string;
  leadId: string;
  source: string;
  campaign: string | null;
  businessName: string | null;
  contactName: string | null;
  phone: string | null;
  website: string | null;
};

export type LinkLookup =
  | { ok: true; prefill: LinkPrefill }
  | { ok: false; reason: 'unknown' | 'expired' | 'revoked' };

/**
 * Resolve a token to what it may prefill. Constant-time on the hash comparison,
 * and it returns only the fields that go into the form. It never returns
 * anything that would let a holder of the link act on the prospect's behalf.
 */
export async function resolveLink(db: SupabaseClient | null, token: string): Promise<LinkLookup> {
  const client = db ?? getSupabase();
  if (!client || !token) return { ok: false, reason: 'unknown' };

  const hash = hashToken(token);
  const { data } = await client
    .from('mustard_links')
    .select('id,lead_id,source,campaign,token_hash,expires_at,revoked_at')
    .eq('token_hash', hash)
    .maybeSingle();
  if (!data) return { ok: false, reason: 'unknown' };

  // Belt and braces after the indexed lookup, so a future change to the query
  // cannot turn this into a prefix match.
  const a = Buffer.from(String(data.token_hash));
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'unknown' };

  if (data.revoked_at) return { ok: false, reason: 'revoked' };
  if (new Date(data.expires_at as string).getTime() < Date.now()) return { ok: false, reason: 'expired' };

  const { data: lead } = await client
    .from('outbound_leads')
    .select('id,business_name,contact_name,phone,website')
    .eq('id', data.lead_id as string)
    .maybeSingle();

  return {
    ok: true,
    prefill: {
      linkId: data.id as string,
      leadId: data.lead_id as string,
      source: (data.source as string) ?? 'human-call',
      campaign: (data.campaign as string) ?? null,
      businessName: (lead?.business_name as string) ?? null,
      contactName: (lead?.contact_name as string) ?? null,
      phone: (lead?.phone as string) ?? null,
      website: (lead?.website as string) ?? null,
    },
  };
}

/** Links are not single use: a prospect may reasonably open it twice. */
export async function markLinkUsed(db: SupabaseClient | null, linkId: string): Promise<void> {
  const client = db ?? getSupabase();
  if (!client) return;
  const { data } = await client.from('mustard_links').select('use_count').eq('id', linkId).maybeSingle();
  await client
    .from('mustard_links')
    .update({ used_at: new Date().toISOString(), use_count: Number(data?.use_count ?? 0) + 1 })
    .eq('id', linkId);
}

export async function revokeLink(db: SupabaseClient | null, linkId: string): Promise<void> {
  const client = db ?? getSupabase();
  if (!client) return;
  await client.from('mustard_links').update({ revoked_at: new Date().toISOString() }).eq('id', linkId);
}
