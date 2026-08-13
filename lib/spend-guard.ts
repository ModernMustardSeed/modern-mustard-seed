/**
 * THE WALLET GUARD.
 *
 * Two layers in front of any public route that spends real Anthropic credits.
 *
 * Layer 1, `ipAllowed()`: a per-instance in-memory throttle. It costs nothing,
 * it is not global (Vercel runs several instances), and it is not meant to stop
 * a determined attacker. It stops the thing that actually happens: one visitor,
 * one bot, or one broken retry loop hammering a free tool in a tight loop.
 *
 * Layer 2, `claimDailySpend()`: the durable one. It rides `claim_forge_slot`
 * (migration 047), which does the read, the compare and the increment in ONE
 * statement, so concurrent callers serialise instead of all passing the same
 * stale check. It is global across instances because it lives in Postgres, and
 * it FAILS CLOSED: any error, any missing Supabase, and the answer is no.
 *
 * WHY BOTH. The IP throttle alone leaks under a distributed or rotating-IP
 * load, because each new IP gets a fresh allowance. The daily cap alone lets a
 * single visitor burn the whole day's budget in ninety seconds. Together the
 * throttle shapes the traffic and the cap bounds the bill.
 *
 * The caps are deliberately set at "a real day of real demand, doubled" rather
 * than at the largest number the wallet could survive. A cap that never fires
 * is not a cap.
 */
import { getSupabase } from '@/lib/supabase';

/** The proxy header Vercel populates. Falls back to a shared bucket. */
export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

type Hit = { count: number; reset: number };
const buckets = new Map<string, Map<string, Hit>>();

/**
 * True if this IP may proceed. `bucket` keeps routes from sharing an allowance,
 * so somebody running a website audit does not lose their chat turns.
 */
export function ipAllowed(bucket: string, ip: string, max: number, windowMs = 60 * 60 * 1000): boolean {
  let hits = buckets.get(bucket);
  if (!hits) {
    hits = new Map<string, Hit>();
    buckets.set(bucket, hits);
  }

  const now = Date.now();
  const hit = hits.get(ip);
  if (!hit || now > hit.reset) {
    hits.set(ip, { count: 1, reset: now + windowMs });

    // Keep a long-lived instance from growing the map forever. Cheap sweep,
    // only when the map is already large enough to be worth sweeping.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    }
    return true;
  }

  hit.count += 1;
  return hit.count <= max;
}

/**
 * Claim one unit of today's global budget for `name`. Returns false when the
 * cap is reached, when the RPC errors, and when there is no Supabase at all.
 *
 * Fails closed on purpose: a spend guard that opens when its own database is
 * unreachable is not a guard, and "the audit is busy, try again" is a far
 * cheaper failure than an emptied wallet.
 */
export async function claimDailySpend(name: string, cap: number): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.rpc('claim_forge_slot', {
      p_key: `${name}:day:${new Date().toISOString().slice(0, 10)}`,
      p_cap: cap,
    });
    if (error) {
      console.error(`spend-guard: ${name} claim failed, standing down:`, error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error(`spend-guard: ${name} claim threw, standing down:`, (err as Error).message);
    return false;
  }
}
