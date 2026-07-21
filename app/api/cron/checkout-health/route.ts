/**
 * Checkout health watchdog (the demo-order money path).
 *
 * On 2026-07-21 every real demo-order checkout silently failed for days: a second
 * foreign key (migration 063) made the lead-lookup embed `outbound_reps(name)`
 * ambiguous, PostgREST rejected the whole query (PGRST201), the route swallowed
 * the error, and the buyer got "Checkout hiccuped. Try again in a minute." Nothing
 * alerted because the failure disguised itself as "demo not found." This watchdog
 * exists so that can never go unnoticed again.
 *
 * It exercises the real money path, NON-DESTRUCTIVELY:
 *   1. Stripe + Supabase env present.
 *   2. The exact lead-lookup embed the checkout depends on resolves (this is the
 *      precise thing that broke; a future FK/schema change trips it here first).
 *   3. demo_orders is reachable (the lifecycle table the checkout inserts into).
 *   4. Stripe can actually MINT a Checkout Session with the real route params
 *      (subscription + inline setup line + automatic_tax). The probe session is
 *      expired immediately, so it is never payable and never clutters Stripe.
 * No lead is touched and no demo_orders row is written.
 *
 * Cadence: every ~15 min via .github/workflows/checkout-health.yml. The MMS Vercel
 * project is on Hobby (Vercel cron is daily-only there), so GitHub Actions drives
 * the schedule, exactly like the voice-health watchdog. Auth: optional CRON_SECRET
 * bearer. On failure it emails OWNER_NOTIFY_TO (deduped to once per hour while
 * down, plus a one-time "recovered" note) AND returns HTTP 500 so the failure also
 * lights up red in the Actions log.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Check = { name: string; ok: boolean; detail?: string };

async function runChecks(selftest: boolean): Promise<Check[]> {
  const checks: Check[] = [];

  // Fire-drill: `?selftest=1` (bearer-protected) injects one synthetic failure so
  // the alert email + red Actions run can be verified on demand, without ever
  // breaking real checkout. A normal run right after clears it (recovered note).
  if (selftest) {
    checks.push({ name: 'selftest', ok: false, detail: 'SELFTEST — synthetic failure to verify alerting. Ignore; not a real outage.' });
  }

  const supabase = getSupabase();
  const stripe = getStripe();

  checks.push({ name: 'supabase_env', ok: !!supabase, detail: supabase ? undefined : 'SUPABASE_URL / SERVICE_ROLE_KEY missing in prod' });
  checks.push({ name: 'stripe_env', ok: !!stripe, detail: stripe ? undefined : 'STRIPE_SECRET_KEY missing in prod' });

  if (supabase) {
    // The exact relationship the checkout lead-lookup depends on. If a schema
    // change makes this embed ambiguous or invalid again, `error` is set and we
    // catch it here before a single buyer does.
    try {
      const { error } = await supabase
        .from('outbound_leads')
        .select('id,outbound_reps!owner_rep_id(name)')
        .limit(1);
      checks.push({ name: 'lead_embed_query', ok: !error, detail: error?.message });
    } catch (e) {
      checks.push({ name: 'lead_embed_query', ok: false, detail: e instanceof Error ? e.message : String(e) });
    }

    // The lifecycle table the checkout inserts into.
    try {
      const { error } = await supabase.from('demo_orders').select('id').limit(1);
      checks.push({ name: 'demo_orders_table', ok: !error, detail: error?.message });
    } catch (e) {
      checks.push({ name: 'demo_orders_table', ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  if (stripe) {
    // Mint a session with the SAME shape the real checkout uses, then expire it
    // immediately so it can never be paid and never lingers in the dashboard.
    try {
      const meta = { kind: 'health-probe' };
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          { price_data: { currency: 'usd', product_data: { name: 'Checkout health probe — monthly' }, unit_amount: 19700, recurring: { interval: 'month' } }, quantity: 1 },
          { price_data: { currency: 'usd', product_data: { name: 'Checkout health probe — one-time setup' }, unit_amount: 29700 }, quantity: 1 },
        ],
        success_url: 'https://modernmustardseed.com/api/cron/checkout-health',
        cancel_url: 'https://modernmustardseed.com/api/cron/checkout-health',
        allow_promotion_codes: true,
        automatic_tax: { enabled: true },
        tax_id_collection: { enabled: true },
        billing_address_collection: 'auto',
        metadata: meta,
        subscription_data: { metadata: meta },
      });
      const ok = !!session.url;
      checks.push({ name: 'stripe_session_create', ok, detail: ok ? undefined : 'Stripe returned a session with no checkout URL' });
      if (session.id) {
        try { await stripe.checkout.sessions.expire(session.id); } catch { /* harmless: it expires on its own within 24h */ }
      }
    } catch (e) {
      checks.push({ name: 'stripe_session_create', ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  return checks;
}

/** Email OWNER on failure (deduped 60m) and once on recovery. Best-effort. */
async function notify(failures: Check[]): Promise<void> {
  const down = failures.length > 0;
  const sb = getSupabase();
  let alertedAt: string | null = null;
  let prevDown = false;
  if (sb) {
    try {
      const { data } = await sb.from('app_state').select('value').eq('key', 'checkout_health').maybeSingle();
      const v = (data?.value ?? null) as { down?: boolean; alerted_at?: string } | null;
      if (v) { alertedAt = v.alerted_at ?? null; prevDown = !!v.down; }
    } catch { /* app_state missing: alert un-deduped rather than go silent */ }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const send = async (subject: string, message: string, action: string, fields: { label: string; value: string }[]) => {
    if (!apiKey) return;
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject,
        html: leadNotification({
          type: 'Contact',
          name: 'Checkout health watchdog',
          email: 'sarah@modernmustardseed.com',
          fields,
          message,
          suggestedAction: action,
        }),
      });
    } catch (err) {
      console.error('checkout-health alert email failed', err);
    }
  };

  if (down) {
    const recently = alertedAt && Date.now() - new Date(alertedAt).getTime() < 60 * 60 * 1000;
    if (!recently) {
      await send(
        'URGENT: demo checkout is DOWN',
        `The demo-order checkout money path failed a health probe, so buyers may be seeing "Checkout hiccuped." The failing checks and Stripe/Supabase reasons are below. This is the same money path that silently 404'd every checkout on 2026-07-21.`,
        'Check app/api/demo-order/checkout/route.ts and the failing check below. Run the probe on demand: GET /api/cron/checkout-health with the CRON_SECRET bearer.',
        failures.map((f) => ({ label: f.name, value: f.detail || 'failed' })),
      );
      if (sb) {
        try { await sb.from('app_state').upsert({ key: 'checkout_health', value: { down: true, alerted_at: new Date().toISOString() }, updated_at: new Date().toISOString() }); } catch { /* graceful */ }
      }
    }
  } else if (prevDown) {
    await send(
      'Recovered: demo checkout is working again',
      'The demo-order checkout money path passed the health probe again. Buyers can check out. Nothing to do.',
      'All clear.',
      [{ label: 'Status', value: 'All checks passing' }],
    );
    if (sb) {
      try { await sb.from('app_state').upsert({ key: 'checkout_health', value: { down: false }, updated_at: new Date().toISOString() }); } catch { /* graceful */ }
    }
  }
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
  const failures = checks.filter((c) => !c.ok);
  await notify(failures);

  return NextResponse.json(
    { ok: failures.length === 0, checks },
    { status: failures.length === 0 ? 200 : 500 },
  );
}
