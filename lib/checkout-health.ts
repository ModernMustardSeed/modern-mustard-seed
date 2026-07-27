/**
 * Money-path watchdog: proves EVERY paid funnel is real and chargeable, always.
 *
 * On 2026-07-21 every demo-order checkout silently failed for days (an ambiguous
 * Supabase embed 404'd the lookup and the error was swallowed). This exists so no
 * pay link can ever break unnoticed again, across all 20 money paths (survey: no
 * static payment links exist; everything is stripe.checkout.sessions).
 *
 * It checks, NON-DESTRUCTIVELY, every ~15 min (GitHub Actions drives the cadence,
 * see .github/workflows/checkout-health.yml, because MMS Vercel is Hobby):
 *   - Stripe + Supabase env, and STRIPE_WEBHOOK_SECRET (no secret = paid orders
 *     never get recorded/fulfilled, i.e. money taken but nothing ships).
 *   - The payment RAIL: mint a real subscription session and a real one-time
 *     payment session (with tax), then expire them immediately (never payable).
 *   - Every INLINE-priced funnel's amounts (sidekick, ads, switchboard, demo,
 *     care plan, portal edit, hatchery) resolve to valid positive cents. Catches
 *     a price silently drifting to 0 / undefined / NaN (the price-drift risk).
 *   - Every ENV-priced funnel (geo, pictures, press, programs, mustard-mode,
 *     mustard-launch) and every hardcoded store price is set AND active in Stripe.
 *   - The demo-order lead embed + demo_orders table (the known 7/21 break points).
 *
 * We do NOT POST the real routes (most write DB rows or need auth); we replicate
 * the create(...) shape and import the same price constants, exactly like the
 * routes do, then expire.
 *
 * BROKEN vs UNPROVEN (2026-07-27). A Stripe rate limit is not an outage. Every
 * Stripe read goes through a bounded pool with its own retries and a wall-clock
 * budget; anything still failing transiently is reported `inconclusive` and does
 * NOT page. Only sustained trouble (ESCALATE_AFTER consecutive all-transient
 * runs, tracked in app_state) escalates, and it pages as UNVERIFIABLE, not DOWN.
 * Hard problems (missing/inactive price, bad amount, dead rail, broken embed)
 * page immediately, as they always have.
 */

import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
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
import {
  createTransientCircuit,
  isTransientStripeError,
  mapPooled,
  startDeadline,
  stripeReadOptions,
  withStripeRetry,
  type Deadline,
  type TransientCircuit,
} from '@/lib/stripe-resilience';

// ---------------------------------------------------------------- config ----

/** Stripe price reads in flight at once. ~30 at once was earning us 429s. */
const READ_CONCURRENCY = 4;
/** Attempts per Stripe call (1 try + 2 retries) before calling it transient. */
const READ_ATTEMPTS = 3;
/** Consecutive all-transient runs before a transient failure becomes a paging outage. */
const ESCALATE_AFTER = 3;
/** Consecutive throttled reads before the sweep stops hammering Stripe and calls the rest unproven. */
const CIRCUIT_TRIP_AFTER = 5;
/** Wall-clock budget for the Stripe half. The Actions curl gives up at 60s. */
const PROBE_BUDGET_MS = 35_000;
/** Do not re-page for the same outage inside this window. */
const ALERT_DEDUPE_MS = 60 * 60 * 1000;
/** Problems listed in a check's detail before it collapses to a count. */
const MAX_DETAIL_ITEMS = 4;
/** app_state row holding outage + streak memory between runs. */
const STATE_KEY = 'checkout_health';

const OWNER_ALERT_PHONE = process.env.OWNER_ALERT_PHONE || '+14062506076';

// ----------------------------------------------------------------- types ----

/**
 * `inconclusive` means the check could not be completed (Stripe throttled or
 * unreachable). That is NOT evidence a funnel is broken, and it must not page.
 */
export type Check = { name: string; ok: boolean; detail?: string; inconclusive?: boolean };

export type HealthReport = {
  ok: boolean;
  failed: number;
  inconclusive: number;
  down: boolean;
  escalated: boolean;
  transientStreak: number;
  checks: Check[];
};

type StripeClient = NonNullable<ReturnType<typeof getStripe>>;
type SupabaseClient = NonNullable<ReturnType<typeof getSupabase>>;
type RailMode = 'subscription' | 'payment';

const isPosInt = (n: unknown): boolean => typeof n === 'number' && Number.isInteger(n) && n > 0;
const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Keep details scannable in an email and a log line; the count carries the rest. */
function summarize(problems: string[]): string | undefined {
  if (problems.length === 0) return undefined;
  const shown = problems.slice(0, MAX_DETAIL_ITEMS).join('; ');
  return problems.length > MAX_DETAIL_ITEMS ? `${shown}; (+${problems.length - MAX_DETAIL_ITEMS} more)` : shown;
}

// -------------------------------------------------- inline price integrity ---

/** Inline-priced funnels (amounts come from code constants). Needs no network. */
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

// ------------------------------------------------------- supabase probes -----

/** The exact break points from the 7/21 silent-checkout incident. */
async function supabaseChecks(supabase: SupabaseClient): Promise<Check[]> {
  // Postgrest builders are thenables, not Promises, hence PromiseLike here.
  const probe = async (name: string, run: () => PromiseLike<{ error: { message: string } | null }>): Promise<Check> => {
    try {
      const { error } = await run();
      return { name, ok: !error, detail: error?.message };
    } catch (e) {
      return { name, ok: false, detail: reason(e) };
    }
  };
  return Promise.all([
    // The exact relationship the demo-order checkout lead lookup depends on.
    probe('lead_embed_query', () => supabase.from('outbound_leads').select('id,outbound_reps!owner_rep_id(name)').limit(1)),
    probe('demo_orders_table', () => supabase.from('demo_orders').select('id').limit(1)),
  ]);
}

// ---------------------------------------------------- stripe price sweep -----

/** Env-priced funnels: the Stripe price id lives in an env var (route 503s if unset). */
const ENV_PRICE_FUNNELS: { funnel: string; envs: string[] }[] = [
  { funnel: 'geo', envs: ['STRIPE_PRICE_GEO_FIXPACK', 'STRIPE_PRICE_GEO_FULLDESK', 'STRIPE_PRICE_GEO_WATCH', 'STRIPE_PRICE_GEO_WATCHPRO'] },
  { funnel: 'pictures', envs: ['STRIPE_PRICE_PICTURES_SPOT', 'STRIPE_PRICE_PICTURES_PREMIERE', 'STRIPE_PRICE_PICTURES_SEASON'] },
  { funnel: 'press', envs: ['STRIPE_PRICE_PRESS_PIECE', 'STRIPE_PRICE_PRESS_KIT', 'STRIPE_PRICE_PRESS_HANDPRESS'] },
  { funnel: 'programs', envs: ['STRIPE_PRICE_IDEA_TO_SPEC', 'STRIPE_PRICE_THE_TERMINAL', 'STRIPE_PRICE_ZERO_TO_ONE'] },
  { funnel: 'mustard-mode', envs: ['STRIPE_PRICE_MUSTARD_PLAYER', 'STRIPE_PRICE_MUSTARD_BUILDER', 'STRIPE_PRICE_MUSTARD_CABINET'] },
  { funnel: 'mustard-launch', envs: ['STRIPE_PRICE_LAUNCH_KIT', 'STRIPE_PRICE_LAUNCH_ROOM'] },
];

type PriceRef = { check: string; label: string; id?: string };
type Verdict = { ok: boolean; detail?: string; transient?: boolean };

/**
 * Every price this site can charge, tagged with the check it belongs to. New
 * funnels and store products belong HERE, not in a separate sweep, so the
 * concurrency cap keeps covering all of them.
 */
function priceRefs(): PriceRef[] {
  return [
    ...ENV_PRICE_FUNNELS.flatMap(({ funnel, envs }) => envs.map((env) => ({ check: `price:${funnel}`, label: env, id: process.env[env] }))),
    ...[...products, ...bundles]
      .map((x) => x.stripePriceId)
      .filter((s): s is string => !!s && s.trim().length > 0)
      .map((id) => ({ check: 'price:store', label: id, id })),
  ];
}

/** Confirm a price exists and is active (a read; mints no session). */
async function verifyPrice(stripe: StripeClient, id: string, deadline: Deadline, circuit: TransientCircuit): Promise<Verdict> {
  if (circuit.open()) {
    return { ok: false, transient: true, detail: `${id} not checked: Stripe was throttling this batch — unproven, not a known break` };
  }
  try {
    const price = await withStripeRetry(() => stripe.prices.retrieve(id, stripeReadOptions), { attempts: READ_ATTEMPTS, deadline, label: id });
    circuit.recordSuccess();
    return price.active ? { ok: true } : { ok: false, detail: `${id} is INACTIVE in Stripe` };
  } catch (e) {
    const transient = isTransientStripeError(e);
    if (transient) circuit.recordTransient();
    return {
      ok: false,
      transient,
      detail: transient ? `${id} could not be verified (Stripe transient: ${reason(e)}) — unproven, not a known break` : `${id} retrieve failed: ${reason(e)}`,
    };
  }
}

/**
 * One check per funnel. Ids shared by several funnels are fetched once, so
 * adding products cannot quietly multiply the request count.
 */
async function priceChecks(stripe: StripeClient, deadline: Deadline): Promise<Check[]> {
  const refs = priceRefs();
  const uniqueIds = [...new Set(refs.map((r) => r.id).filter((id): id is string => !!id))];
  const circuit = createTransientCircuit(CIRCUIT_TRIP_AFTER);
  const verdicts = new Map(
    await mapPooled(uniqueIds, READ_CONCURRENCY, async (id) => [id, await verifyPrice(stripe, id, deadline, circuit)] as const),
  );

  const byCheck = new Map<string, PriceRef[]>();
  for (const ref of refs) {
    const group = byCheck.get(ref.check);
    if (group) group.push(ref);
    else byCheck.set(ref.check, [ref]);
  }

  return [...byCheck].map(([name, group]) => {
    const problems: { hard: boolean; detail: string }[] = [];
    for (const ref of group) {
      if (!ref.id) {
        problems.push({ hard: true, detail: `${ref.label} not set` });
        continue;
      }
      const verdict = verdicts.get(ref.id)!;
      if (!verdict.ok) problems.push({ hard: !verdict.transient, detail: verdict.detail || `${ref.label} invalid` });
    }

    const hard = problems.filter((p) => p.hard);
    const soft = problems.filter((p) => !p.hard);
    return {
      name,
      ok: problems.length === 0,
      // Unproven only when nothing hard was found; a real break outranks a throttle.
      inconclusive: problems.length > 0 && hard.length === 0,
      // Hard problems first: they are what a human should read and act on.
      detail: summarize([...hard, ...soft].map((p) => p.detail)),
    };
  });
}

// ---------------------------------------------------------- payment rail -----

/**
 * The probe reuses two dedicated prices found by lookup_key. It used to pass
 * inline `price_data` on every run, which minted a throwaway Product + Price
 * each time (~192/day of dashboard litter). Created once, then reused forever.
 */
const PROBE_LOOKUP_KEY: Record<RailMode, string> = {
  subscription: 'mms_watchdog_probe_monthly',
  payment: 'mms_watchdog_probe_once',
};
const PROBE_AMOUNT_CENTS = 19_700;
const PROBE_META = { kind: 'health-probe' };
const probePriceCache = new Map<RailMode, string>();

/** Resolve both probe prices in ONE list call, creating either if it is missing. */
async function probePrices(stripe: StripeClient, deadline: Deadline): Promise<Record<RailMode, string>> {
  const modes: RailMode[] = ['subscription', 'payment'];
  if (modes.every((m) => probePriceCache.has(m))) {
    return { subscription: probePriceCache.get('subscription')!, payment: probePriceCache.get('payment')! };
  }

  const existing = await withStripeRetry(
    () => stripe.prices.list({ lookup_keys: modes.map((m) => PROBE_LOOKUP_KEY[m]), active: true, limit: 10 }, stripeReadOptions),
    { attempts: READ_ATTEMPTS, deadline, label: 'probe price lookup' },
  );

  for (const mode of modes) {
    const wantsRecurring = mode === 'subscription';
    const hit = existing.data.find((p) => p.lookup_key === PROBE_LOOKUP_KEY[mode] && Boolean(p.recurring) === wantsRecurring);
    if (hit) {
      probePriceCache.set(mode, hit.id);
      continue;
    }
    const created = await withStripeRetry(
      () =>
        stripe.prices.create(
          {
            currency: 'usd',
            unit_amount: PROBE_AMOUNT_CENTS,
            lookup_key: PROBE_LOOKUP_KEY[mode],
            // Reclaim the key if an older probe price was archived by hand.
            transfer_lookup_key: true,
            product_data: { name: `MMS watchdog probe (${wantsRecurring ? 'monthly' : 'one-time'}), never sold`, metadata: PROBE_META },
            metadata: PROBE_META,
            ...(wantsRecurring ? { recurring: { interval: 'month' as const } } : {}),
          },
          stripeReadOptions,
        ),
      { attempts: READ_ATTEMPTS, deadline, label: `probe price create (${mode})` },
    );
    probePriceCache.set(mode, created.id);
  }

  return { subscription: probePriceCache.get('subscription')!, payment: probePriceCache.get('payment')! };
}

/** Mint a real session in the given mode, then expire it (proves the rail + tax). */
async function mintAndExpire(stripe: StripeClient, mode: RailMode, price: string, deadline: Deadline): Promise<Check> {
  const name = `rail:${mode}`;
  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode,
      payment_method_types: ['card'],
      line_items: [{ price, quantity: 1 }],
      success_url: 'https://modernmustardseed.com/api/cron/checkout-health',
      cancel_url: 'https://modernmustardseed.com/api/cron/checkout-health',
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      metadata: PROBE_META,
      ...(mode === 'subscription' ? { subscription_data: { metadata: PROBE_META } } : { payment_intent_data: { metadata: PROBE_META } }),
    };
    // One idempotency key per probe, generated OUTSIDE the retried closure so every
    // attempt reuses it: a retried create returns the original session instead of
    // leaving a duplicate behind.
    const idempotencyKey = `health-probe-${mode}-${randomUUID()}`;
    const session = await withStripeRetry(() => stripe.checkout.sessions.create(params, { ...stripeReadOptions, idempotencyKey }), {
      attempts: READ_ATTEMPTS,
      deadline,
      label: name,
    });
    if (!session.url) return { name, ok: false, detail: 'Stripe returned a session with no checkout URL' };
    // Never payable. If this fails it expires on its own within 24h anyway.
    try { await stripe.checkout.sessions.expire(session.id, stripeReadOptions); } catch { /* best effort */ }
    return { name, ok: true };
  } catch (e) {
    const transient = isTransientStripeError(e);
    return { name, ok: false, inconclusive: transient, detail: transient ? `unproven (Stripe transient: ${reason(e)})` : reason(e) };
  }
}

/** True when the rail failed because the probe price itself is gone, not because the rail is broken. */
const probePriceMissing = (checks: Check[]): boolean =>
  checks.some((c) => !c.ok && !c.inconclusive && /resource_missing|No such price|not active|inactive/i.test(c.detail ?? ''));

/** Rail probe for both charge types, plus the price sweep, together. */
async function stripeChecks(stripe: StripeClient, deadline: Deadline): Promise<Check[]> {
  const rail = (async (): Promise<Check[]> => {
    const mintBoth = async (): Promise<Check[]> => {
      const price = await probePrices(stripe, deadline);
      return Promise.all([mintAndExpire(stripe, 'subscription', price.subscription, deadline), mintAndExpire(stripe, 'payment', price.payment, deadline)]);
    };
    try {
      const checks = await mintBoth();
      // Someone archiving the probe price in the dashboard (it does look like
      // clutter) must not read as a dead payment rail. Re-resolve once and retry.
      if (!probePriceMissing(checks)) return checks;
      probePriceCache.clear();
      return await mintBoth();
    } catch (e) {
      const transient = isTransientStripeError(e);
      const detail = `probe price unavailable: ${reason(e)}`;
      return (['subscription', 'payment'] as RailMode[]).map((mode) => ({ name: `rail:${mode}`, ok: false, inconclusive: transient, detail }));
    }
  })();

  const [railChecks, prices] = await Promise.all([rail, priceChecks(stripe, deadline)]);
  return [...railChecks, ...prices];
}

// ---------------------------------------------------------------- alerts -----

type State = { down: boolean; alertedAt: string | null; transientStreak: number };

async function readState(sb: SupabaseClient | null): Promise<State> {
  const empty: State = { down: false, alertedAt: null, transientStreak: 0 };
  if (!sb) return empty;
  try {
    const { data } = await sb.from('app_state').select('value').eq('key', STATE_KEY).maybeSingle();
    const v = (data?.value ?? null) as { down?: boolean; alerted_at?: string; transient_streak?: number } | null;
    return v ? { down: !!v.down, alertedAt: v.alerted_at ?? null, transientStreak: v.transient_streak ?? 0 } : empty;
  } catch {
    return empty; // app_state missing: alert un-deduped rather than go silent
  }
}

async function writeState(sb: SupabaseClient | null, state: State): Promise<void> {
  if (!sb) return;
  try {
    await sb.from('app_state').upsert({
      key: STATE_KEY,
      value: { down: state.down, alerted_at: state.alertedAt, transient_streak: state.transientStreak },
      updated_at: new Date().toISOString(),
    });
  } catch { /* graceful: a missing state row must never break the probe */ }
}

async function emailOwner(subject: string, message: string, action: string, fields: { label: string; value: string }[]): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await resendClient().emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      subject,
      html: leadNotification({ type: 'Contact', name: 'Money-path watchdog', email: 'sarah@modernmustardseed.com', fields, message, suggestedAction: action }),
    });
  } catch (err) {
    console.error('checkout-health alert email failed', err);
  }
}

async function textOwner(body: string): Promise<void> {
  try {
    const r = await sendSms(OWNER_ALERT_PHONE, body, { statusCallback: false });
    if (!r.ok) console.error('checkout-health alert SMS failed', r.error);
  } catch (err) {
    console.error('checkout-health alert SMS threw', err);
  }
}

/**
 * Decide what this run means, page if it warrants paging, and remember it.
 * Paging rules, in order:
 *   - hard failures        -> page now (deduped for an hour), HTTP 500
 *   - transient only       -> stay quiet, HTTP 200, count the streak
 *   - streak >= ESCALATE   -> page as UNVERIFIABLE, HTTP 500
 *   - clean after an alert -> one recovered note
 */
async function resolveAndAlert(sb: SupabaseClient | null, failures: Check[], inconclusive: Check[]): Promise<Pick<HealthReport, 'down' | 'escalated' | 'transientStreak'>> {
  const prev = await readState(sb);
  const transientStreak = inconclusive.length > 0 ? prev.transientStreak + 1 : 0;
  // Stripe throttling for 45+ minutes straight is no longer "transient".
  const escalated = transientStreak >= ESCALATE_AFTER;
  const effective = escalated ? [...failures, ...inconclusive] : failures;
  const down = effective.length > 0;

  let alertedAt = down ? prev.alertedAt : null;
  const recently = prev.alertedAt && Date.now() - new Date(prev.alertedAt).getTime() < ALERT_DEDUPE_MS;

  if (down && !recently) {
    const names = effective.map((c) => c.name).slice(0, 5).join(', ');
    const fields = effective.map((c) => ({ label: c.name, value: c.detail || 'failed' }));
    if (failures.length === 0) {
      // Escalated transients: nothing is known to be broken, but nothing is being watched either.
      await emailOwner(
        `URGENT: MMS money paths UNVERIFIABLE for ${transientStreak} runs`,
        `Stripe has been throttling or failing the watchdog's reads for ${transientStreak} runs in a row, so no paid funnel can be confirmed working. Checkout is not known to be broken, but it is no longer being watched.`,
        'Check status.stripe.com and the Vercel logs for /api/cron/checkout-health. If Stripe is healthy, the probe is being rate limited and READ_CONCURRENCY in lib/checkout-health.ts needs to come down.',
        fields,
      );
      await textOwner(`MMS: Stripe has been unreachable or throttled for ${transientStreak} watchdog runs (${names}). Checkout is UNVERIFIED, not confirmed down. Check email.`);
    } else {
      await emailOwner(
        `URGENT: an MMS money path is DOWN (${effective.length})`,
        'A paid funnel failed the health probe, so buyers may be unable to check out or pay. The failing checks and reasons are below.',
        'Fix the failing check below. Run the probe on demand: GET /api/cron/checkout-health with the CRON_SECRET bearer.',
        fields,
      );
      await textOwner(`MMS ALERT: a money path failed the health check (${effective.length}): ${names}. Check email for details. Buyers may be unable to pay.`);
    }
    alertedAt = new Date().toISOString();
  } else if (!down && prev.down) {
    await emailOwner('Recovered: MMS money paths are working again', 'All paid funnels passed the health probe again. Buyers can check out and pay. Nothing to do.', 'All clear.', [
      { label: 'Status', value: 'All checks passing' },
    ]);
    await textOwner('MMS: recovered. All checkout and pay links are working again.');
  }

  // Always persisted, clean runs included: the streak is what makes a sustained
  // Stripe outage escalate instead of staying quiet forever.
  await writeState(sb, { down, alertedAt, transientStreak });
  return { down, escalated, transientStreak };
}

// ----------------------------------------------------------- orchestrator ----

/** Run every money-path check, alert if warranted, and report what was found. */
export async function runCheckoutHealth({ selftest = false }: { selftest?: boolean } = {}): Promise<HealthReport> {
  const deadline = startDeadline(PROBE_BUDGET_MS);
  const supabase = getSupabase();
  const stripe = getStripe();

  const config: Check[] = [
    { name: 'supabase_env', ok: !!supabase, detail: supabase ? undefined : 'SUPABASE_URL / SERVICE_ROLE_KEY missing in prod' },
    { name: 'stripe_env', ok: !!stripe, detail: stripe ? undefined : 'STRIPE_SECRET_KEY missing in prod' },
    { name: 'webhook_secret', ok: !!STRIPE_WEBHOOK_SECRET(), detail: STRIPE_WEBHOOK_SECRET() ? undefined : 'STRIPE_WEBHOOK_SECRET missing — paid orders would not be recorded/fulfilled' },
  ];

  // The Supabase and Stripe halves are independent; run them together.
  const [supabaseResults, stripeResults] = await Promise.all([
    supabase ? supabaseChecks(supabase) : Promise.resolve<Check[]>([]),
    stripe ? stripeChecks(stripe, deadline) : Promise.resolve<Check[]>([]),
  ]);

  const checks: Check[] = [
    ...(selftest ? [{ name: 'selftest', ok: false, detail: 'SELFTEST — synthetic failure to verify alerting. Ignore; not a real outage.' }] : []),
    ...config,
    ...inlinePriceChecks(),
    ...supabaseResults,
    ...stripeResults,
  ];

  const failures = checks.filter((c) => !c.ok && !c.inconclusive);
  const inconclusive = checks.filter((c) => !c.ok && c.inconclusive);
  if (inconclusive.length > 0) {
    // Visible in the logs without paging anyone.
    console.warn(`checkout-health: ${inconclusive.length} check(s) unproven (Stripe transient) —`, inconclusive.map((c) => c.name).join(', '));
  }

  const outcome = await resolveAndAlert(supabase, failures, inconclusive);
  return { ok: failures.length === 0 && inconclusive.length === 0, failed: failures.length, inconclusive: inconclusive.length, checks, ...outcome };
}
