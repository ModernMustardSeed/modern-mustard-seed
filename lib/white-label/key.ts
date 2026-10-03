import { createHmac, timingSafeEqual } from 'node:crypto';

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

/** Access keys have separate scopes. A price sheet never opens a portal. */
export function accessKey(scope: 'portal' | 'review', id: string): string | null {
  const s = secret();
  if (!s || !id) return null;
  return createHmac('sha256', s).update(`white-label:${scope}:v2:${id}`).digest('base64url');
}

export function accessKeyValid(scope: 'portal' | 'review', id: string, key: string | null | undefined): boolean {
  const want = accessKey(scope, id);
  if (!want || typeof key !== 'string') return false;
  const a = Buffer.from(want);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The two links Sarah takes into a meeting. */
export function wlLinks(base: string, p: { agency: string; color: string; city: string; sample: string; site?: string }) {
  const key = wlKey(p.agency);
  const q = new URLSearchParams({ agency: p.agency, color: p.color.replace('#', ''), city: p.city, sample: p.sample });
  if (p.site) q.set('site', p.site);
  const demoPublic = `${base}/white-label/demo?${q.toString()}`;
  if (!key) return { demoPublic, demo: null, sheet: null };
  q.set('k', key);
  return {
    demoPublic,
    demo: `${base}/white-label/demo?${q.toString()}`,
    sheet: `${base}/white-label/sheet?${new URLSearchParams({ agency: p.agency, k: key }).toString()}`,
  };
}
