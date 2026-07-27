/**
 * Shared resilience for code that makes many Stripe calls at once.
 *
 * Three sharp edges this exists to blunt (all hit us on 2026-07-27, when the
 * checkout watchdog paged "buyers may be unable to pay" over a plain rate limit):
 *
 *  1. The Stripe SDK does NOT retry 429s. `RequestSender._shouldRetry` retries
 *     connection errors, 409 and 5xx only, so a throttled read fails outright.
 *  2. Firing an unbounded burst of reads is what earns the 429 in the first place.
 *  3. The SDK's default per-request timeout is 80s, longer than the whole budget
 *     of most cron routes, so one hung call can eat the entire function.
 *
 * Any route that sweeps a lot of Stripe objects should read through these.
 */

/** Per-request cap. Well under a cron's own budget, unlike the SDK's 80s default. */
export const STRIPE_TIMEOUT_MS = 8_000;

/** Request options for a swept read: short timeout, SDK retries off (we own retries). */
export const stripeReadOptions = { timeout: STRIPE_TIMEOUT_MS, maxNetworkRetries: 0 } as const;

/**
 * Throttled, unreachable, or Stripe-side error. The distinction matters: these
 * say nothing about whether the thing being checked is healthy, so callers should
 * report them as unproven rather than broken.
 */
export function isTransientStripeError(e: unknown): boolean {
  const err = e as { type?: string; statusCode?: number; code?: string; message?: string } | null;
  if (!err) return false;
  if (err.type === 'StripeRateLimitError' || err.type === 'StripeConnectionError' || err.type === 'StripeAPIError') return true;
  if (err.statusCode === 429 || (typeof err.statusCode === 'number' && err.statusCode >= 500)) return true;
  if (err.code === 'lock_timeout') return true;
  return /rate limit|too many requests|timeout|socket hang up|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(err.message ?? '');
}

/** Wall-clock budget shared by a batch of calls, so a slow Stripe cannot outlast the caller. */
export type Deadline = { expired: () => boolean; remainingMs: () => number };

export function startDeadline(budgetMs: number): Deadline {
  const endsAt = Date.now() + budgetMs;
  return { expired: () => Date.now() >= endsAt, remainingMs: () => Math.max(0, endsAt - Date.now()) };
}

export class DeadlineExpiredError extends Error {
  readonly type = 'StripeConnectionError'; // classified transient: unproven, not broken
  constructor(what: string) {
    super(`${what} skipped: the batch ran out of time before Stripe answered`);
    this.name = 'DeadlineExpiredError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry a Stripe call on transient errors only, with jittered exponential backoff.
 * Hard errors (missing resource, bad key, bad params) throw on the first attempt:
 * retrying them just burns the rate limit we are trying to stay under.
 */
export async function withStripeRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, deadline, label = 'stripe call' }: { attempts?: number; deadline?: Deadline; label?: string } = {},
): Promise<T> {
  if (deadline?.expired()) throw new DeadlineExpiredError(label);
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= attempts || !isTransientStripeError(e)) throw e;
      // 400ms, 800ms, jittered so a retried burst does not re-collide in lockstep.
      const backoff = 400 * 2 ** (attempt - 1) * (0.5 + Math.random());
      if (deadline && backoff > deadline.remainingMs()) throw e;
      await sleep(backoff);
    }
  }
}

/**
 * Circuit breaker for a batch of Stripe calls. When Stripe is throttling
 * everything, retrying every item is both pointless and the very thing keeping
 * us throttled: it turns a 5s sweep into a 40s one and learns nothing new. After
 * `threshold` consecutive transient failures the circuit opens and callers skip
 * the rest of the batch as unproven. Any success closes it again.
 */
export function createTransientCircuit(threshold: number) {
  let consecutive = 0;
  return {
    open: (): boolean => consecutive >= threshold,
    recordSuccess: (): void => { consecutive = 0; },
    recordTransient: (): void => { consecutive += 1; },
  };
}
export type TransientCircuit = ReturnType<typeof createTransientCircuit>;

/**
 * Map with a bounded number of tasks in flight. Results keep input order.
 * `fn` must not throw: a rejection aborts the whole batch.
 */
export async function mapPooled<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < items.length; i = next++) out[i] = await fn(items[i], i);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
