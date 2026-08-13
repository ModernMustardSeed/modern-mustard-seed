/**
 * Shared abuse guard for the endpoints that dial a real phone from a public
 * form: /api/instant-callback (the contact form) and /api/ring-me (the hero).
 *
 * Both ring a stranger's handset on nothing but a POST body, so an unguarded
 * version of either is a harassment tool. This is not ceremony.
 *
 * The window is per serverless instance, not global. That is enough for what it
 * is for (a refresh loop, a bored script); the per-number dedupe in
 * lib/instant-callback.ts is the backstop that survives a cold start.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_IP = 3;
const hits = new Map<string, number[]>();

/** Best-effort client IP. "unknown" buckets everything we cannot identify together, on purpose. */
export function callerIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/** True once this IP has asked for more than MAX_PER_IP calls inside the window. */
export function callRateLimited(ip: string): boolean {
  const now = Date.now();
  const seen = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  seen.push(now);
  hits.set(ip, seen);
  // Bound the map so a long-lived instance cannot grow one entry per attacker IP.
  if (hits.size > 5000) {
    for (const k of hits.keys()) {
      if (hits.size <= 2500) break;
      hits.delete(k);
    }
  }
  return seen.length > MAX_PER_IP;
}

/** True when the POST did not come from one of our own pages. */
export function isCrossOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  return Boolean(origin && host && !origin.includes(host));
}
