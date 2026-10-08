import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed keys for the bootcamp's two private doors: a host's dashboard and a
 * registration's own page. Signed with ADMIN_SESSION_SECRET under a bootcamp
 * prefix, so a key can never be replayed as a white label sheet or an admin
 * session. No secret, no keys: every check fails closed.
 */

export function bootcampSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function secret(): string | null {
  const s = (process.env.ADMIN_SESSION_SECRET || '').trim();
  return s.length >= 16 ? s : null;
}

function sign(scope: string, id: string): string | null {
  const s = secret();
  if (!s || !id) return null;
  return createHmac('sha256', s).update(`bootcamp:v1:${scope}:${id}`).digest('base64url').slice(0, 22);
}

function valid(scope: string, id: string, key: string | null | undefined): boolean {
  const want = sign(scope, id);
  if (!want || !key) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(key.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A host's dashboard key, minted on approval and sent in the welcome email. */
export const hostKey = (slug: string) => sign('host', slug);
export const hostKeyValid = (slug: string, key: string | null | undefined) => valid('host', slug, key);

/** A registration's own key: the unsubscribe link and the ticket page use it. */
export const regKey = (id: string) => sign('reg', id);
export const regKeyValid = (id: string, key: string | null | undefined) => valid('reg', id, key);

export function hostLinks(base: string, slug: string) {
  const key = hostKey(slug);
  return {
    share: `${base}/bootcamp/r/${slug}`,
    masterclass: `${base}/bootcamp/masterclass?via=${slug}`,
    dashboard: key ? `${base}/bootcamp/host/${slug}?k=${key}` : null,
  };
}

export function unsubscribeLink(base: string, id: string): string | null {
  const key = regKey(id);
  return key ? `${base}/api/bootcamp/unsubscribe?id=${id}&k=${key}` : null;
}
