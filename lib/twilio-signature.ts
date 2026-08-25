import crypto from 'node:crypto';

/**
 * PROVING A WEBHOOK CAME FROM TWILIO.
 *
 * Both SMS hooks are public URLs that write to the lead database and to the
 * do-not-text list. Unverified, anyone who learns the path can forge a customer
 * reply onto a lead's thread, or forge a STOP that permanently silences a real
 * customer. So the signature is checked on both.
 *
 * This lives in lib/ rather than beside the route because Next validates the
 * exports of a route file against its own known set; a helper exported from
 * `route.ts` and imported by a sibling route is the kind of thing that builds
 * locally and fails on Vercel.
 */

/**
 * Twilio signs with HMAC-SHA1 over the full request URL followed by every POST
 * field, sorted by name, concatenated as name+value with no separator between
 * them and none between the pairs.
 */
export function verifyTwilio(token: string, url: string, params: Record<string, string>, signature: string): boolean {
  if (!token || !signature) return false;
  try {
    let payload = url;
    for (const key of Object.keys(params).sort()) payload += key + params[key];
    const expected = crypto.createHmac('sha1', token).update(Buffer.from(payload, 'utf8')).digest('base64');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * The URL Twilio actually called, rebuilt from the forwarded headers.
 *
 * On Vercel `req.url` is the internal origin, not the public one. Signing
 * against it makes every legitimate request fail the check, which looks exactly
 * like an attack and is in fact a proxy. If the webhook is registered with a
 * trailing query string, that has to be here too, which is why `search` is kept.
 */
export function twilioRequestUrl(req: Request): string {
  const h = req.headers;
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  const { pathname, search } = new URL(req.url);
  return `${proto}://${host}${pathname}${search}`;
}

/** Parse a Twilio form post into a plain map, preserving the raw body for signing. */
export function twilioParams(raw: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;
  return params;
}
