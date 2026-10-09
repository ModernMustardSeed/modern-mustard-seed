import { createHmac, timingSafeEqual } from 'node:crypto';
import { WL_PRICES_HELD } from '@/data/white-label';

/**
 * A key signed for one agency. It unlocks that agency's wholesale prices on
 * /white-label/sheet and the margin panel on /white-label/demo, and nothing
 * else. Sarah mints it on /admin/white-label before a meeting.
 *
 * Signed with ADMIN_SESSION_SECRET under a white-label prefix, so a key can
 * never be replayed as anything but a price sheet. No secret, no keys: every
 * check fails closed and the pages show suggested retail only.
 */

export function wlSlug(agency: string): string {
  return agency
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function secret(): string | null {
  const s = (process.env.ADMIN_SESSION_SECRET || '').trim();
  return s.length >= 16 ? s : null;
}

export function wlKey(agency: string): string | null {
  const s = secret();
  const slug = wlSlug(agency);
  if (!s || !slug) return null;
  return createHmac('sha256', s).update(`white-label:v1:${slug}`).digest('base64url').slice(0, 22);
}

export function wlKeyValid(agency: string, key: string | null | undefined): boolean {
  const want = wlKey(agency);
  if (!want || !key) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(key.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when this agency's prices are held back (data/white-label.ts). */
export function wlPricesHeld(agency: string): boolean {
  return WL_PRICES_HELD.includes(wlSlug(agency));
}

/** A signed key that may also open prices: valid, and the agency is not held. */
export function wlPricesKeyValid(agency: string, key: string | null | undefined): boolean {
  return !wlPricesHeld(agency) && wlKeyValid(agency, key);
}

/**
 * A key for one client's desk, separate from the agency's: the office gets a
 * link that opens its own calls and nothing of the agency's, and the agency's
 * portal key cannot be cut down into it.
 */
export function wlClientKey(clientId: string): string | null {
  const s = secret();
  if (!s || !clientId) return null;
  return createHmac('sha256', s).update(`white-label:client:v1:${clientId}`).digest('base64url').slice(0, 22);
}

export function wlClientKeyValid(clientId: string, key: string | null | undefined): boolean {
  const want = wlClientKey(clientId);
  if (!want || !key) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(key.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The two links Sarah takes into a meeting. */
/**
 * `demoAt` is the full demo URL without a query, for an agency whose own host
 * is live (https://ai.agency.com/receptionist). The price sheet always stays on
 * `base`: it is ours to issue, not the agency's to show.
 */
export function wlLinks(base: string, p: { agency: string; color: string; city: string; sample: string; site?: string }, demoAt?: string) {
  const key = wlKey(p.agency);
  const demoUrl = demoAt ?? `${base}/white-label/demo`;
  const q = new URLSearchParams({ agency: p.agency, color: p.color.replace('#', ''), city: p.city, sample: p.sample });
  if (p.site) q.set('site', p.site);
  const demoPublic = `${demoUrl}?${q.toString()}`;
  if (!key) return { demoPublic, demo: null, sheet: null };
  q.set('k', key);
  return {
    demoPublic,
    demo: `${demoUrl}?${q.toString()}`,
    sheet: `${base}/white-label/sheet?${new URLSearchParams({ agency: p.agency, k: key }).toString()}`,
  };
}
