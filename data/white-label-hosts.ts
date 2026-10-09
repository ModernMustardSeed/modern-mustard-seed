/**
 * AGENCY HOSTS. A white label agency can carry its demos, its clients' front
 * desks and its own portal on a subdomain of its own site, so nothing a
 * prospect or client opens says modernmustardseed.com.
 *
 * On an agency host, middleware.ts serves three paths and nothing else of
 * ours:
 *   /receptionist           the live receptionist demo  (/white-label/demo)
 *   /desk/<client id>?k=    a client's front desk        (/white-label/hq/<slug>/c/<id>)
 *   /agency?k=              the agency's own portal      (/white-label/hq/<slug>)
 * Every other path on the host redirects to /receptionist.
 *
 * To add an agency:
 *   1. An entry here, with live: false.
 *   2. Its domain in the `has` host pattern of middleware.ts's matcher. Vercel
 *      reads the matcher at build time, so it has to be a literal there.
 *   3. The domain on the Vercel project, and the agency's CNAME to Vercel
 *      (DNS only, never proxied, or the certificate never issues).
 *   4. Once https://<host>/receptionist answers, flip live: true. Only then do
 *      the portal, the emails and the intake reports start handing out links on
 *      the agency's host. Until then they keep using ours, so no link breaks.
 *
 * Plain data, no imports: middleware runs on the edge and reads this file.
 */

export type WlHost = {
  /** white_label_agencies.slug */
  slug: string;
  /** The subdomain, lowercase, no scheme. */
  host: string;
  /** Agency name and brand color (hex, no #), the demo's defaults on this host. */
  agency: string;
  color: string;
  /** True once DNS and the certificate are verified. Gates every generated link. */
  live: boolean;
};

export const WL_HOSTS: WlHost[] = [{ slug: 'jcreative', host: 'agents.jcreativemt.com', agency: 'JCreative', color: '1C0950', live: false }];

/** The agency a request's Host header belongs to, if any. */
export function wlHostFor(hostHeader: string | null | undefined): WlHost | null {
  const h = String(hostHeader ?? '').toLowerCase().split(':')[0];
  return WL_HOSTS.find((x) => x.host === h) ?? null;
}

/** https://<host> for an agency whose host is live, else null (use ours). */
export function wlBaseFor(slug: string): string | null {
  const x = WL_HOSTS.find((h) => h.slug === slug && h.live);
  return x ? `https://${x.host}` : null;
}

/**
 * Paths that only exist on an agency host. The site chrome (nav, footer, chat,
 * cookie bar, house beacon, Riviera type) stays off them exactly as it stays off
 * /white-label/demo, /sheet and /hq, whichever of the two paths a component sees.
 */
export const WL_HOST_PATH = /^\/(receptionist|desk|agency)(\/|$)/;
