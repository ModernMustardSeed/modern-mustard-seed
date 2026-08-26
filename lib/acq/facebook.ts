/**
 * Where a prospect's Facebook page is, and how to get to it in one click.
 *
 * Every lead gets a link. If the page is known (`facebook_url`) the link opens
 * it. If it is not, the link opens Facebook's own page search for the business
 * name and town, which is the fastest reliable path there is: search engines
 * index almost none of these pages, Facebook's search finds nearly all of them.
 */

const FB_HOST = /^https?:\/\/(?:m\.|www\.|web\.|business\.)?(?:facebook\.com|fb\.com)\//i;

export function isFacebookUrl(url: string | null | undefined): boolean {
  return !!url && FB_HOST.test(url.trim());
}

/**
 * `https://www.facebook.com/<page>` with tracking, locale and mobile hosts
 * stripped. Returns null for anything that is not a page (search, groups,
 * a single post, login walls, the profile.php form without an id).
 */
export function normalizeFacebookUrl(url: string | null | undefined): string | null {
  if (!url || !isFacebookUrl(url)) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  let path = u.pathname.replace(/\/+$/, '').replace(/^\/+/, '');
  path = path.replace(/^(?:[a-z]{2}(?:-[A-Za-z]{2})?\/)?/, ''); // en-US/ style locale prefixes
  if (!path) return null;
  const head = path.split('/')[0].toLowerCase();
  if (['search', 'groups', 'events', 'marketplace', 'login', 'sharer', 'sharer.php', 'dialog', 'hashtag', 'watch', 'reel', 'stories', 'photo', 'photo.php', 'help', 'policies', 'privacy', 'public', 'plugins'].includes(head)) return null;
  if (head === 'profile.php') {
    const id = u.searchParams.get('id');
    return id && /^\d+$/.test(id) ? `https://www.facebook.com/profile.php?id=${id}` : null;
  }
  if (head === 'people') {
    // /people/Name/<numeric id>/ is a page, keep the whole thing
    const parts = path.split('/');
    return parts.length >= 3 && /^\d+$/.test(parts[2]) ? `https://www.facebook.com/people/${parts[1]}/${parts[2]}/` : null;
  }
  if (head === 'pages') {
    // /pages/Name/<id> and /pages/category/.../Name-<id>/ both resolve
    return `https://www.facebook.com/${path}/`;
  }
  // A post, photo, review or about tab under a page: keep the page only.
  return `https://www.facebook.com/${path.split('/')[0]}/`;
}

/** Facebook's page search for this business, for when the page is not on file. */
export function facebookSearchUrl(businessName: string, city?: string | null, state?: string | null): string {
  const q = [businessName, city, state].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return `https://www.facebook.com/search/pages/?q=${encodeURIComponent(q)}`;
}

export type FacebookLink = { href: string; direct: boolean };

/** The one link a row or a card shows: the page if known, the search if not. */
export function facebookLinkFor(lead: { facebook_url?: string | null; website?: string | null; business_name: string; city?: string | null; state?: string | null }): FacebookLink {
  const known = normalizeFacebookUrl(lead.facebook_url) ?? normalizeFacebookUrl(lead.website);
  if (known) return { href: known, direct: true };
  return { href: facebookSearchUrl(lead.business_name, lead.city, lead.state), direct: false };
}

/** A website that is really a Facebook page counts as no website. */
export function hasRealWebsite(lead: { website?: string | null }): boolean {
  return !!lead.website && !isFacebookUrl(lead.website);
}
