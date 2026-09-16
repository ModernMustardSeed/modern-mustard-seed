import type { SupabaseClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import type { ClientProject } from '@/lib/client-leads';

/**
 * A SIGN THAT KNOWS IT WAS SCANNED.
 *
 * Every QR the owner prints carries a short code in its link. The site notes
 * the code when someone lands, and carries it on any lead that follows. So a
 * yard sign in Bigfork, the truck door and the Chamber ad each get their own
 * scan count and their own lead count, and the question "which of these is
 * working" is answered by a number and not a feeling.
 */

export type Campaign = { id: string; code: string; label: string; medium: string; path: string; scans: number; leads: number; archived_at: string | null; created_at: string };

export const MEDIA = ['sign', 'jobsite', 'truck', 'card', 'print', 'ad', 'mail', 'other'] as const;
export const MEDIUM_WORD: Record<string, string> = { sign: 'Yard sign', jobsite: 'Jobsite sign', truck: 'Truck or trailer', card: 'Business card', print: 'Flyer or brochure', ad: 'Ad', mail: 'Mailer', other: 'Other' };

/** The link the QR opens. Always the real domain: signs outlive hosting. */
export function campaignUrl(p: ClientProject, c: { code: string; path: string }): string {
  const base = p.publicUrl.replace(/\/$/, '');
  const path = c.path.startsWith('/') ? c.path : `/${c.path}`;
  return `${base}${path}${path.includes('?') ? '&' : '?'}src=${encodeURIComponent(c.code)}`;
}

/** A code from a label: short, lowercase, letters digits and dashes, unique per client. */
export async function mintCode(sb: SupabaseClient, clientEmail: string, label: string): Promise<string> {
  const base =
    label
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'code';
  const { data } = await sb.from('client_campaigns').select('code').eq('client_email', clientEmail).like('code', `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.code as string));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}

export function isCode(s: unknown): s is string {
  return typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(s);
}

/** PNG bytes for print, at a size that stays crisp on a yard sign. */
export async function qrPng(url: string, size = 1200): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: 'png', width: size, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#161616', light: '#ffffff' } });
}

/** SVG for the print shop: scales to any size with no blur. */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'H', color: { dark: '#161616', light: '#ffffff' } });
}

/** Count a landing against its campaign; a code we never issued counts for nothing. */
export async function recordVisit(sb: SupabaseClient, clientEmail: string, code: string, path: string | null, referrer: string | null, uaHash: string | null): Promise<boolean> {
  const { data: c } = await sb.from('client_campaigns').select('id, scans').eq('client_email', clientEmail).eq('code', code).is('archived_at', null).maybeSingle();
  if (!c) return false;
  await Promise.all([
    sb.from('client_visits').insert({ client_email: clientEmail, campaign_code: code, path, referrer, ua_hash: uaHash }),
    sb.from('client_campaigns').update({ scans: (Number(c.scans) || 0) + 1 }).eq('id', c.id),
  ]);
  return true;
}

/** A lead arrived carrying a code: count it on the campaign. */
export async function creditLead(sb: SupabaseClient, clientEmail: string, code: string): Promise<void> {
  const { data: c } = await sb.from('client_campaigns').select('id, leads').eq('client_email', clientEmail).eq('code', code).maybeSingle();
  if (!c) return;
  await sb.from('client_campaigns').update({ leads: (Number(c.leads) || 0) + 1 }).eq('id', c.id);
}
