/**
 * Money-path watchdog: proves EVERY paid funnel is real and chargeable, always.
 *
 * On 2026-07-21 every demo-order checkout silently failed for days (an ambiguous
 * Supabase embed 404'd the lookup and the error was swallowed). This watchdog
 * exists so no pay link can ever break unnoticed again, across all 20 money paths
 * (survey: no static payment links exist; everything is stripe.checkout.sessions).
 *
 * It checks, NON-DESTRUCTIVELY, every ~15 min:
 *   - Stripe + Supabase env, and STRIPE_WEBHOOK_SECRET (no secret = paid orders
 *     never get recorded/fulfilled, i.e. money taken but nothing ships).
 *   - The payment RAIL: mint a real subscription session and a real one-time
 *     payment session (with tax), then expire them immediately (never payable).
 *   - Every INLINE-priced funnel's amounts (sidekick, ads, switchboard, demo,
 *     care plan, portal edit, hatchery) resolve to valid positive cents. Catches
 *     a price silently drifting to 0 / undefined / NaN (the price-drift risk).
 *   - Every ENV-priced funnel (geo, pictures, press, programs, mustard-mode,
 *     mustard-launch) has its Stripe price set AND active in Stripe.
 *   - Every hardcoded store price ID is set AND active in Stripe.
 *   - The demo-order lead embed + demo_orders table (the known 7/21 break points).
 *
 * We do NOT POST the real routes (most write DB rows or need auth); we replicate
 * the create(...) shape and import the same price constants, exactly like the
 * routes do, then expire. Cadence is driven by GitHub Actions (MMS Vercel is
 * Hobby = daily-only cron), see .github/workflows/checkout-health.yml.
 *
 * On any failure: emails OWNER_NOTIFY_TO AND texts OWNER_ALERT_PHONE (deduped to
 * once per hour via app_state key `checkout_health`), plus a recovered note, and
 * returns HTTP 500 so the failure also shows red in the Actions log. `?selftest=1`
 * (bearer-only) fires a synthetic failure to verify the alerts on demand.
 *
 * Transient Stripe errors are NOT outages (fixed 2026-07-27). The probe used to
 * fire ~32 Stripe calls in one unbounded burst, and Stripe's SDK does not retry
 * 429s (it retries only connection errors, 409 and 5xx), so a single throttled
 * read paged Sarah with "buyers may be unable to pay" when checkout was fine.
 * Now: price reads run at bounded concurrency, each retries transient errors with
 * backoff, and a still-transient failure is INCONCLUSIVE (no page, HTTP 200). It
 * escalates to a real, paging failure only after ESCALATE_AFTER consecutive runs,
 * so a genuine sustained Stripe outage still gets through.
 */

import { NextResponse } from 'next/server';
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { sendSms } from '@/lib/sms';
import { sidekickTiers } from '@/data/sidekick';
import { broadcastTiers } from '@/data/ads';
import { BUILD_FEE_USD, PRICE_TIERS } from '@/data/switchboard';
import { HATCH } from '@/data/hatchery';
import { products, bundles } from '@/data/products';
import { PAID_EDIT_PRICE_CENTS, CARE_PLAN_PRICE_CENTS } from '@/lib/site-edit';
import { DEMO_PRODUCTS, DEMO_BUNDLE } from '@/lib/demo-order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const OWNER_ALERT_PHONE = process.env.OWNER_ALERT_PHONE || '+14062506076';

/** Max Stripe price reads in flight at once. ~30 at once was tripping Stripe's rate limit. */
const READ_CONCURRENCY = 4;
/** Attempts per price read (1 try + 2 retries) before calling it transient. */
const READ_ATTEMPTS = 3;
/** Consecutive all-transient runs before a transient failure becomes a paging outage. */
const ESCALATE_AFTER = 3;

/** `inconclusive`: the check could not be completed (Stripe throttled/unreachable), which is NOT proof a funnel is broken. */
type Check = { name: string; ok: boolean; detail?: string; inconclusive?: boolean };
type StripeClient = NonNullable<ReturnType<typeof getStripe>>;

const isPosInt = (n: unknown): boolean => typeof n === 'number' && Number.isInteger(n) && n > 0;

/** Throttled/unreachable/Stripe-side error: tells us nothing about whether the funnel works. */
function isTransientStripeError(e: unknown): boolean {
  const err = e as { type?: string; statusCode?: number; code?: string; message?: string } | null;
  if (!err) return false;
  if (err.type === 'StripeRateLimitError' || err.type === 'StripeConnectionError' || err.type === 'StripeAPIError') return true;
  if (err.statusCode === 429 || (typeof err.statusCode === 'number' && err.statusCode >= 500)) return true;
  if (err.code === 'lock_timeout') return true;
  return /rate limit|too many requests|timeout|socket hang up|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(err.message ?? '');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry a Stripe read on transient errors only (the SDK itself does not retry 429s). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= READ_ATTEMPTS || !isTransientStripeError(e)) throw e;
      // 400ms, 800ms, with jitter, so retries of a burst do not re-collide.
      await sleep(400 * 2 ** (attempt - 1) * (0.5 + Math.random()));
    }
  }
}

/** Map with a bounded number of tasks in flight (keeps us under Stripe's rate limit). */
async function mapPooled<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Inline-priced funnels (amounts come from code constants). Catches price drift. */
function inlinePriceChecks(): Check[] {
  const groups: { funnel: string; amounts: number[] }[] = [
    ...sidekickTiers.map((t, i) => ({ funnel: `sidekick-tier-${i + 1}`, amounts: [t.monthlyCents, t.setupCents] })),
    ...broadcastTiers.map((t, i) => ({ funnel: `ads-tier-${i + 1}`, amounts: [t.monthlyCents, t.setupCents] })),
    { funnel: 'switchboard', amounts: [BUILD_FEE_USD, ...PRICE_TIERS.map((p) => p.perLocationUsd)] },
    // Every demo piece is individually purchasable, so each has a real positive
    // price (the command center's is waived at quote time when paired, never $0
    // in the constants). All are validated.
    ...Object.entries(DEMO_PRODUCTS).map(([k, p]) => ({ funnel: `demo-${k}`, amounts: [p.monthlyCents, p.setupCents] })),
    { funnel: 'demo-bundle', amounts: [DEMO_BUNDLE.monthlyCents, DEMO_BUNDLE.setupCents] },
    { funnel: 'care-plan', amounts: [CARE_PLAN_PRICE_CENTS] },
    { funnel: 'portal-paid-edit', amounts: [PAID_EDIT_PRICE_CENTS] },
    { funnel: 'hatchery', amounts: [HATCH.priceUsd] },
  ];
  return groups.map(({ funnel, amounts }) => {
    const bad = amounts.filter((a) => !isPosInt(a));
    return { name: `price:${funnel}`, ok: bad.length === 0, detail: bad.length ? `invalid amount(s): ${JSON.stringify(bad)}` : undefined };
  });
}

/** Env-priced funnels: the Stripe price id lives in an env var (route 503s if unset). */
const ENV_PRICE_FUNNELS: { funnel: string; envs: string[] }[] = [
  { funnel: 'geo', envs: ['STRIPE_PRICE_GEO_FIXPACK', 'STRIPE_PRICE_GEO_FULLDESK', 'STRIPE_PRICE_GEO_WATCH', 'STRIPE_PRICE_GEO_WATCHPRO'] },
  { funnel: 'pictures', envs: ['STRIPE_PRICE_PICTURES_SPOT', 'STRIPE_PRICE_PICTURES_PREMIERE', 'STRIPE_PRICE_PICTURES_SEASON'] },
  { funnel: 'press', envs: ['STRIPE_PRICE_PRESS_PIECE', 'STRIPE_PRICE_PRESS_KIT', 'STRIPE_PRICE_PRESS_HANDPRESS'] },
  { funnel: 'programs', envs: ['STRIPE_PRICE_IDEA_TO_SPEC', 'STRIPE_PRICE_THE_TERMINAL', 'STRIPE_PRICE_ZERO_TO_ONE'] },
  { funnel: 'mustard-mode', envs: ['STRIPE_PRICE_MUSTARD_PLAYER', 'STRIPE_PRICE_MUSTARD_BUILDER', 'STRIPE_PRICE_MUSTARD_CABINET'] },
  { funnel: 'mustard-launch', envs: ['STRIPE_PRICE_LAUNCH_KIT', 'STRIPE_PRICE_LAUNCH_ROOM'] },
];

/** Confirm a Stripe price id exists and is active (a read; mints no session). */
async function priceActive(stripe: StripeClient, id: string): Promise<{ ok: boolean; detail?: string; transient?: boolean }> {
  try {
    const p = await withRetry(() => stripe.prices.retrieve(id));
    return p.active ? { ok: true } : { ok: false, detail: `${id} is INACTIVE in Stripe` };
  } catch (e) {
    const transient = isTransientStripeError(e);
    const why = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      transient,
      detail: transient
        ? `${id} could not be verified (Stripe transient: ${why}) — unproven, not a known break`
        : `${id} retrieve failed: ${why}`,
    };
  }
}

/** Mint a real session in the given mode, then expire it (proves the rail + tax). */
async function mintAndExpire(stripe: StripeClient, mode: 'subscription' | 'payment'): Promise<Check> {
  const name = `rail:${mode}`;
  try {
    const meta = { kind: 'health-probe' };
    const line =
      mode === 'subscription'
        ? [{ price_data: { currency: 'usd', product_data: { name: 'Rail probe — monthly' }, unit_amount: 19700, recurring: { interval: 'month' as const } }, quantity: 1 }]
        : [{ price_data: { currency: 'usd', product_data: { name: 'Rail probe — one-time' }, unit_amount: 19700 }, quantity: 1 }];
    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ['card'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      line_items: line as any,
      success_url: 'https://modernmustardseed.com/api/cron/checkout-health',
      cancel_url: 'https://modernmustardseed.com/api/cron/checkout-health',
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      metadata: meta,
      ...(mode === 'subscription' ? { subscription_data: { metadata: meta } } : { payment_intent_data: { metadata: meta } }),
    });
    if (!session.url) return { name, ok: false, detail: 'Stripe returned a session with no checkout URL' };
    if (session.id) {
      try { await stripe.checkout.sessions.expire(session.id); } catch { /* expires on its own within 24h */ }
    }
    return { name, ok: true };
  } catch (e) {
    const transient = isTransientStripeError(e);
    const why = e instanceof Error ? e.message : String(e);
    return { name, ok: false, inconclusive: transient, detail: transient ? `unproven (Stripe transient: ${why})` : why };
  }
}

async function runChecks(selftest: boolean): Promise<Check[]> {
  const checks: Check[] = [];

  if (selftest) {
    checks.push({ name: 'selftest', ok: false, detail: 'SELFTEST — synthetic failure to verify alerting. Ignore; not a real outage.' });
  }

  const supabase = getSupabase();
  const stripe = getStripe();

  checks.push({ name: 'supabase_env', ok: !!supabase, detail: supabase ? undefined : 'SUPABASE_URL / SERVICE_ROLE_KEY missing in prod' });
  checks.push({ name: 'stripe_env', ok: !!stripe, detail: stripe ? undefined : 'STRIPE_SECRET_KEY missing in prod' });
  checks.push({ name: 'webhook_secret', ok: !!STRIPE_WEBHOOK_SECRET(), detail: STRIPE_WEBHOOK_SECRET() ? undefined : 'STRIPE_WEBHOOK_SECRET missing — paid orders would not be recorded/fulfilled' });

  // Inline-price integrity (no Stripe/network needed).
  checks.push(...inlinePriceChecks());

  if (supabase) {
    // The exact relationship the demo-order checkout lead lookup depends on.
    try {
      const { error } = await supabase.from('outbound_leads').select('id,outbound_reps!owner_rep_id(name)').limit(1);
      checks.push({ name: 'lead_embed_query', ok: !error, detail: error?.message });
    } catch (e) {
      checks.push({ name: 'lead_embed_query', ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
    try {
      const { error } = await supabase.from('demo_orders').select('id').limit(1);
      checks.push({ name: 'demo_orders_table', ok: !error, detail: error?.message });
    } catch (e) {
      checks.push({ name: 'demo_orders_table', ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  if (stripe) {
    const railP = Promise.all([mintAndExpire(stripe, 'subscription'), mintAndExpire(stripe, 'payment')]);

    // Every env-priced and store price read goes through ONE bounded pool, so the
    // total in-flight count stays under Stripe's rate limit no matter how many
    // funnels or store products get added later.
    const tasks = [
      ...ENV_PRICE_FUNNELS.flatMap(({ funnel, envs }) =>
        envs.map((env) => ({ check: `price:${funnel}`, label: env, id: process.env[env] })),
      ),
      ...[...products, ...bundles]
        .map((x) => x.stripePriceId)
        .filter((s): s is string => !!s && s.trim().length > 0)
        .map((id) => ({ check: 'price:store', label: id, id: id as string | undefined })),
    ];

    const results = await mapPooled(tasks, READ_CONCURRENCY, async (t) => {
      if (!t.id) return { ...t, ok: false, transient: false, detail: `${t.label} not set` };
      const r = await priceActive(stripe, t.id);
      return { ...t, ok: r.ok, transient: !!r.transient, detail: r.detail };
    });

    // One check per funnel, in the original order. A funnel is only DOWN on a hard
    // problem (missing/inactive/bad id). If its only problems are transient, the
    // check is inconclusive: reported, but it does not page and does not 500.
    const grouped = new Map<string, typeof results>();
    for (const r of results) {
      const list = grouped.get(r.check) ?? [];
      list.push(r);
      grouped.set(r.check, list);
    }
    const priceChecks: Check[] = [...grouped.entries()].map(([name, rs]) => {
      const hard = rs.filter((r) => !r.ok && !r.transient);
      const soft = rs.filter((r) => !r.ok && r.transient);
      const problems = [...hard, ...soft].map((r) => r.detail || `${r.label} invalid`);
      return {
        name,
        ok: problems.length === 0,
        inconclusive: hard.length === 0 && soft.length > 0,
        detail: problems.length ? problems.join('; ') : undefined,
      };
    });

    checks.push(...(await railP), ...priceChecks);
  }

  return checks;
}

/**
 * Email OWNER + text OWNER_ALERT_PHONE on failure (deduped 60m); recovered note once.
 * Inconclusive checks (Stripe throttled/unreachable) do not page on their own; they
 * only escalate after ESCALATE_AFTER consecutive runs, tracked in app_state.
 * Returns whether this run should be treated as a real outage by the caller.
 */
async function notify(failures: Check[], inconclusive: Check[]): Promise<{ down: boolean; escalated: boolean; transientStreak: number }> {
  const sb = getSupabase();
  let alertedAt: string | null = null;
  let prevDown = false;
  let prevStreak = 0;
  if (sb) {
    try {
      const { data } = await sb.from('app_state').select('value').eq('key', 'checkout_health').maybeSingle();
      const v = (data?.value ?? null) as { down?: boolean; alerted_at?: string; transient_streak?: number } | null;
      if (v) { alertedAt = v.alerted_at ?? null; prevDown = !!v.down; prevStreak = v.transient_streak ?? 0; }
    } catch { /* app_state missing: alert un-deduped rather than go silent */ }
  }

  const transientStreak = inconclusive.length > 0 ? prevStreak + 1 : 0;
  // Stripe throttling for 45+ minutes straight is no longer "transient" — page on it.
  const escalated = transientStreak >= ESCALATE_AFTER;
  const effective = escalated ? [...failures, ...inconclusive] : failures;
  const down = effective.length > 0;
  const transientOnly = escalated && failures.length === 0;

  const apiKey = process.env.RESEND_API_KEY;
  const sendEmail = async (subject: string, message: string, action: string, fields: { label: string; value: string }[]) => {
    if (!apiKey) return;
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject,
        html: leadNotification({ type: 'Contact', name: 'Money-path watchdog', email: 'sarah@modernmustardseed.com', fields, message, suggestedAction: action }),
      });
    } catch (err) {
      console.error('checkout-health alert email failed', err);
    }
  };
  const sendText = async (body: string) => {
    try {
      const r = await sendSms(OWNER_ALERT_PHONE, body, { statusCallback: false });
      if (!r.ok) console.error('checkout-health alert SMS failed', r.error);
    } catch (err) {
      console.error('checkout-health alert SMS threw', err);
    }
  };

  let justAlerted = false;
  if (down) {
    const recently = alertedAt && Date.now() - new Date(alertedAt).getTime() < 60 * 60 * 1000;
    if (!recently) {
      const names = effective.map((f) => f.name).slice(0, 5).join(', ');
      if (transientOnly) {
        await sendEmail(
          `URGENT: MMS money paths UNVERIFIABLE for ${transientStreak} runs`,
          `Stripe has been throttling or failing the watchdog's reads for ${transientStreak} runs in a row, so no paid funnel can be confirmed working. Checkout is not known to be broken, but it is no longer being watched.`,
          'Check status.stripe.com and the Vercel logs for /api/cron/checkout-health. If Stripe is healthy, the probe is being rate limited and READ_CONCURRENCY in the route needs to come down.',
          effective.map((f) => ({ label: f.name, value: f.detail || 'unverifiable' })),
        );
        await sendText(`MMS: Stripe has been unreachable/throttled for ${transientStreak} watchdog runs (${names}). Checkout is UNVERIFIED, not confirmed down. Check email.`);
      } else {
        await sendEmail(
          `URGENT: an MMS money path is DOWN (${effective.length})`,
          `A paid funnel failed the health probe, so buyers may be unable to check out or pay. The failing checks and reasons are below.`,
          'Fix the failing check below. Run the probe on demand: GET /api/cron/checkout-health with the CRON_SECRET bearer.',
          effective.map((f) => ({ label: f.name, value: f.detail || 'failed' })),
        );
        await sendText(`MMS ALERT: a money path failed the health check (${effective.length}): ${names}. Check email for details. Buyers may be unable to pay.`);
      }
      justAlerted = true;
    }
  } else if (prevDown) {
    await sendEmail('Recovered: MMS money paths are working again', 'All paid funnels passed the health probe again. Buyers can check out and pay. Nothing to do.', 'All clear.', [{ label: 'Status', value: 'All checks passing' }]);
    await sendText('MMS: recovered. All checkout and pay links are working again.');
  }

  // Always persist, even on a clean run: the transient streak is what makes a real
  // sustained Stripe outage escalate instead of staying quiet forever.
  if (sb) {
    const value = {
      down,
      alerted_at: justAlerted ? new Date().toISOString() : down ? alertedAt : null,
      transient_streak: transientStreak,
    };
    try { await sb.from('app_state').upsert({ key: 'checkout_health', value, updated_at: new Date().toISOString() }); } catch { /* graceful */ }
  }

  return { down, escalated, transientStreak };
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const selftest = new URL(req.url).searchParams.get('selftest') === '1';
  const checks = await runChecks(selftest);
  const failures = checks.filter((c) => !c.ok && !c.inconclusive);
  const inconclusive = checks.filter((c) => !c.ok && c.inconclusive);
  if (inconclusive.length) {
    // Visible in Vercel logs without paging anyone.
    console.warn('checkout-health inconclusive (Stripe transient):', inconclusive.map((c) => `${c.name}: ${c.detail}`).join(' | '));
  }
  const { down, escalated, transientStreak } = await notify(failures, inconclusive);

  // Green unless a funnel is really broken (or Stripe has been unverifiable for
  // ESCALATE_AFTER runs). A one-off Stripe throttle must not turn the money-path
  // watchdog into a boy-who-cried-wolf.
  return NextResponse.json(
    {
      ok: failures.length === 0 && inconclusive.length === 0,
      failed: failures.length,
      inconclusive: inconclusive.length,
      transient_streak: transientStreak,
      escalated,
      checks,
    },
    { status: down ? 500 : 200 },
  );
}
