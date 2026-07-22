/**
 * THE UNIFIED PURCHASE PIPELINE.
 *
 * One function that runs for EVERY paid Stripe checkout, before the per-`kind`
 * handlers do their specialized work. It guarantees the three things Sarah wants
 * to be true no matter what someone buys:
 *
 *   1. They become a real `clients` row (so /portal recognizes them by email).
 *   2. What they bought is written once to `client_products` (so it shows up in
 *      their portal as a first-class thing they own, with a status and a home).
 *   3. It is idempotent and best-effort: a Stripe retry never double-provisions,
 *      and a hiccup here never fails the webhook (the money path is already done).
 *
 * It does NOT replace the specialized provisioners (provisionDemoOrder,
 * provisionFromProposal, grantEntitlement, chief_clients). Those keep running and
 * own the deep records. This is the uniform ownership layer they all point back to,
 * so the portal and the back office have one place to read every relationship.
 */
import type Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

export type ProductStatus = 'provisioning' | 'building' | 'in_production' | 'active' | 'delivered';

type ProductSpec = {
  kind: string;
  label: string;
  tier: string | null;
  status: ProductStatus;
  homeUrl: string | null;
  detail: string | null;
};

/**
 * Map a checkout `kind` (+ its metadata) to the thing the client now owns.
 * Returns null for kinds that are add-ons or internal money moves and should NOT
 * mint an ownership card: paying a balance, a $29 edit, a care-plan sub, a raw
 * subscription-started event. Those attach to an existing product, not a new one.
 */
export function productSpecFor(kind: string, session: Stripe.Checkout.Session): ProductSpec | null {
  const tier = (session.metadata?.item_name || '').trim() || null;
  const slug = (session.metadata?.slug || '').trim();

  switch (kind) {
    case 'demo-order':
      return {
        kind,
        label: 'Your Modern Mustard Seed build',
        tier,
        status: 'building',
        homeUrl: '/portal',
        detail: 'We are building your real site around your brand. Two free edits before it goes live.',
      };
    case 'chief':
      return {
        kind,
        label: 'The Chief',
        tier: tier ?? 'The Chief',
        status: 'provisioning',
        homeUrl: '/chief/hq',
        detail: 'Live within 7 days. Your command center is open right now.',
      };
    case 'sidekick':
      return {
        kind,
        label: 'Your AI Receptionist',
        tier: tier ?? 'Sidekick',
        status: 'provisioning',
        homeUrl: '/portal',
        detail: 'Live within 7 days, installed by hand. I email you within one business day.',
      };
    case 'switchboard':
      return {
        kind,
        label: 'The Switchboard',
        tier,
        status: 'provisioning',
        homeUrl: '/portal',
        detail: 'We are provisioning your locations. I reach out to set up the chain.',
      };
    case 'pictures':
      return {
        kind,
        label: 'Mustard Pictures',
        tier,
        status: 'in_production',
        homeUrl: '/portal',
        detail: 'Your commercial is in production. You review it before it ships.',
      };
    case 'ads':
      return {
        kind,
        label: 'Mustard Broadcast',
        tier,
        status: 'in_production',
        homeUrl: '/portal',
        detail: 'Your spot and campaign are in production. We run it in your own ad account.',
      };
    case 'press': {
      // The instant PIECE is delivered on the spot; the Kit and Hand Press are made by hand.
      const piece = slug.includes('piece');
      return {
        kind,
        label: 'Mustard Press',
        tier,
        status: piece ? 'delivered' : 'in_production',
        homeUrl: '/portal',
        detail: piece ? 'Your press piece is ready in your inbox and portal.' : 'Your press run is in production.',
      };
    }
    case 'hatchery':
      return {
        kind,
        label: 'Mustard Hatchery',
        tier,
        status: 'in_production',
        homeUrl: '/portal',
        detail: 'Your hand-numbered mascot is being born. I send it over when it hatches.',
      };
    case 'geo':
      return {
        kind,
        label: 'GEO Desk',
        tier,
        status: 'active',
        homeUrl: '/website-audit',
        detail: 'Your fix pack is live and re-graded automatically.',
      };
    case 'program':
      return {
        kind,
        label: tier ?? 'Your program',
        tier,
        status: 'active',
        homeUrl: '/portal',
        detail: 'Your program access is open. Check your welcome email for the direct link.',
      };
    case 'mustard-mode':
      return {
        kind,
        label: 'Mustard Mode',
        tier,
        status: 'active',
        homeUrl: '/mustard-mode/hq',
        detail: 'Your Mustard Mode HQ is open.',
      };
    case 'mustard-launch':
      return {
        kind,
        label: 'Mustard Launch',
        tier,
        status: 'active',
        homeUrl: '/mustard-launch/hq',
        detail: 'Your Launch HQ is open.',
      };
    case 'deposit':
      return {
        kind: 'engagement',
        label: 'Your engagement',
        tier,
        status: 'building',
        homeUrl: '/portal',
        detail: 'Your build is underway. Everything lives in your portal.',
      };
    case 'store':
      if (!slug) return null; // a real store checkout always carries its slug
      return {
        kind: 'store',
        label: tier ?? 'Your playbooks',
        tier,
        status: 'delivered',
        homeUrl: '/portal',
        detail: 'Your playbooks are ready to download in your portal.',
      };
    // Add-ons and internal money moves: no new ownership card.
    case 'balance':
    case 'subscription':
    case 'care-plan':
    case 'paid-edit':
    default:
      return null;
  }
}

/**
 * Run the universal layer for one paid checkout session. Call this ONCE at the top
 * of `checkout.session.completed`, before the per-kind handlers. Never throws.
 */
export async function provisionPurchase(session: Stripe.Checkout.Session): Promise<void> {
  try {
    const kind = (session.metadata?.kind || 'store').trim();
    const spec = productSpecFor(kind, session);
    if (!spec) return; // add-on / internal: nothing to own

    const email = (session.customer_details?.email || session.customer_email || '').toLowerCase().trim();
    if (!email) return; // cannot open a portal for nobody

    const name = session.customer_details?.name || null;
    const company = (session.metadata?.business || '').trim() || null;
    const supabase = getSupabase();
    if (!supabase) return;

    // 1. The client. Minimal, additive upsert: we only touch identity columns, so a
    //    richer row already written by demo/proposal provisioning (welcome_note, tier)
    //    is preserved. name/company are only set when we actually have them.
    //    Store/playbook buyers are recognized by their order alone (see 003) and do
    //    NOT get an engagement `clients` row, so a $30 PDF sale never reads as a new
    //    engagement client or triggers the agency onboarding flow. Their ownership
    //    still shows via the product card below.
    if (spec.kind !== 'store') {
      try {
        const clientRow: Record<string, unknown> = { email, status: 'active' };
        if (name) clientRow.name = name;
        if (company) clientRow.company = company;
        await supabase.from('clients').upsert(clientRow, { onConflict: 'email' });
      } catch (err) {
        console.error('provisionPurchase: client upsert failed', err);
      }
    }

    // 2. The ownership card, once per Stripe session. Insert-if-absent so a replay
    //    can never reset a status we have since advanced.
    try {
      const { data: existing } = await supabase
        .from('client_products')
        .select('id')
        .eq('order_session_id', session.id)
        .maybeSingle();
      if (existing) return;

      await supabase.from('client_products').insert({
        client_email: email,
        kind: spec.kind,
        label: spec.label,
        tier: spec.tier,
        status: spec.status,
        home_url: spec.homeUrl,
        detail: spec.detail,
        order_session_id: session.id,
        amount_cents: session.amount_total ?? null,
      });
    } catch (err) {
      // Unique-violation on a racing retry is expected and fine.
      console.error('provisionPurchase: product insert skipped', err);
    }
  } catch (err) {
    console.error('provisionPurchase failed (non-fatal)', err);
  }
}
