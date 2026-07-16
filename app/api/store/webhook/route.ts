/**
 * Stripe webhook handler for the store.
 *
 * On `checkout.session.completed`:
 *  1. Resolve the item from session metadata (slug)
 *  2. Insert an order row into Supabase `orders`
 *  3. Insert / update the buyer in `leads` with source `store-buyer` and a
 *     bought_products array in notes so the chatbot, audit, and sequence
 *     all recognize them immediately
 *  4. Send the delivery email with signed download URL(s)
 *
 * Webhook URL: https://modernmustardseed.com/api/store/webhook
 * Set STRIPE_WEBHOOK_SECRET to the signing secret from Stripe Dashboard.
 */

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { resendClient } from '@/lib/send-email';
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { syncLeadToPipeline } from '@/lib/outbound-pipeline';
import { provisionDemoOrder } from '@/lib/demo-provision';
import { queueProjectEdit } from '@/lib/site-edit';
import { getProductBySlug, getBundleBySlug, products as ALL_PRODUCTS } from '@/data/products';
import { programBundle } from '@/data/programs';
import { getSignedDownloadUrl } from '@/lib/storage';
import { storeOrderConfirmationEmail, storeOrderNotificationEmail, programAccessEmail, leadNotification, subscriptionPaymentFailedEmail, clientEmail } from '@/lib/email';
import { getSidekickTier, sidekickUsd } from '@/data/sidekick';
import { getPicturesTier, PICTURES } from '@/data/pictures';
import { getPicturesRun } from '@/lib/pictures-store';
import { getPressTier, PRESS } from '@/data/press';
import { getPressRun, consumeHandPressSlot } from '@/lib/press-store';
import { getHatcheryTier, HATCH, HUCK } from '@/data/hatchery';
import { nextHatchNumber } from '@/lib/hatchery-store';
import { renderPressPdf } from '@/lib/press-pdf';
import { getGeoTier } from '@/data/geo';
import { saveGeoWatch, deleteGeoWatch, claimGeoWebhook } from '@/lib/geo-store';
import { SITE } from '@/lib/seo';
import { grantEntitlement, revokeEntitlement, PROGRAM_ASSETS, isProgramSlug, isMustardSlug, isLaunchSlug, type ProgramSlug } from '@/lib/entitlements';
import { getMustardLevel } from '@/data/mustard-mode/offer';
import { getLaunchTierRow } from '@/data/mustard-launch';
import { createMagicToken } from '@/lib/client-auth';
import { insertLead } from '@/lib/supabase';
import { recordProductCommission, recordSubscriptionCommission } from '@/lib/affiliate';
import { provisionFromProposal } from '@/lib/proposal-provision';
import { sendReviewNudge } from '@/lib/review-nudge';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * A $497 program (or the Zero to One bundle) was purchased. Grant entitlement
 * to each included program, record the order + buyer, and email a passwordless
 * access link straight into the gated HQ.
 */
async function handleProgramPurchase(
  req: Request,
  session: Stripe.Checkout.Session,
  slug: string,
  email: string,
  name: string | null,
  itemName: string
) {
  const isBundle = slug === programBundle.slug;
  const grantSlugs: ProgramSlug[] = isBundle
    ? programBundle.programSlugs
    : isProgramSlug(slug)
      ? [slug]
      : [];
  if (grantSlugs.length === 0) {
    console.error('program webhook: unknown program slug', slug);
    return;
  }

  // Grant access to every included program.
  await Promise.all(grantSlugs.map((s) => grantEntitlement(email, s, 'purchase')));

  // Affiliate attribution: 50% product commission on a referred sale.
  const ref = session.metadata?.ref;
  if (ref) {
    await recordProductCommission({
      affiliateCode: ref,
      orderEmail: email,
      productSlug: slug,
      amountCents: session.amount_total ?? 49700,
      stripeSessionId: session.id,
    });
  }

  // Record the order and the buyer so the back office and funnel see it.
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('orders').insert({
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        product_slug: slug,
        product_name: itemName,
        item_type: 'program',
        price_paid_cents: session.amount_total ?? 49700,
        currency: session.currency ?? 'usd',
        email,
        name: name ?? null,
        status: 'paid',
      });
    } catch (err) {
      console.error('program order insert failed', err);
    }
  }
  try {
    await insertLead({ type: 'contact', email, name: name ?? null, source: 'program-buyer', status: 'new', notes: `[bought:${slug}]` });
  } catch (err) {
    console.error('program lead insert failed', err);
  }

  // Passwordless access link into the first granted program's HQ.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const origin = new URL(req.url).origin || 'https://modernmustardseed.com';
    const landing = grantSlugs[0];
    const assets = PROGRAM_ASSETS[landing];
    const token = await createMagicToken(email);
    const url = `${origin}/api/portal/verify?token=${encodeURIComponent(token)}&next=/${landing}/hq`;
    const resend = resendClient();
    const firstName = name?.split(' ')[0];

    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName ? `${firstName}, ` : ''}your ${isBundle ? programBundle.name : assets.programName} access is ready`,
      html: programAccessEmail({
        firstName,
        programName: isBundle ? programBundle.name : assets.programName,
        toolName: assets.toolName,
        url,
      }),
    });

    await resend.emails.send({
      from: 'Modern Mustard Seed Store <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `New program sale. ${itemName}. $${((session.amount_total ?? 49700) / 100).toFixed(0)}.`,
      html: leadNotification({
        type: 'Contact',
        name: name ?? 'unknown',
        email,
        fields: [
          { label: 'Program', value: itemName },
          { label: 'Email', value: email },
          { label: 'Amount', value: `$${((session.amount_total ?? 49700) / 100).toFixed(0)}` },
        ],
        message: `Granted access to: ${grantSlugs.join(', ')}`,
        suggestedAction: 'Access email sent to buyer with their HQ link.',
      }),
    });
  } catch (err) {
    console.error('program access email failed', err);
  }
}

/**
 * A MUSTARD MODE level was purchased (Player, Builder, or the Cabinet
 * subscription). Grant the entitlement, record the order + buyer, attribute
 * any affiliate, and email a passwordless access link into the HQ.
 */
async function handleMustardPurchase(
  req: Request,
  session: Stripe.Checkout.Session,
  slug: string,
  email: string,
  name: string | null,
  itemName: string
) {
  if (!isMustardSlug(slug)) {
    console.error('mustard webhook: unknown slug', slug);
    return;
  }
  const level = getMustardLevel(slug);
  const source = slug === 'mustard-mode-cabinet' ? 'subscription' : 'purchase';
  await grantEntitlement(email, slug, source);

  const ref = session.metadata?.ref;
  if (ref) {
    await recordProductCommission({
      affiliateCode: ref,
      orderEmail: email,
      productSlug: slug,
      amountCents: session.amount_total ?? (level ? level.priceUsd * 100 : 0),
      stripeSessionId: session.id,
    });
  }

  // Cabinet revenue is recorded per cycle by invoice.paid (including month
  // one), so only one-time levels insert an order here. Prevents the first
  // $97 from being double-counted.
  const supabase = getSupabase();
  if (supabase && slug !== 'mustard-mode-cabinet') {
    const { error } = await supabase.from('orders').insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      product_slug: slug,
      product_name: itemName,
      item_type: 'program',
      price_paid_cents: session.amount_total ?? (level ? level.priceUsd * 100 : 0),
      currency: session.currency ?? 'usd',
      email,
      name: name ?? null,
      status: 'paid',
    });
    if (error) console.error('mustard order insert failed', error.message);
  }
  try {
    await insertLead({ type: 'contact', email, name: name ?? null, source: 'mustard-mode-buyer', status: 'new', notes: `[bought:${slug}]` });
  } catch (err) {
    console.error('mustard lead insert failed', err);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const origin = new URL(req.url).origin || 'https://modernmustardseed.com';
    const token = await createMagicToken(email);
    const url = `${origin}/api/portal/verify?token=${encodeURIComponent(token)}&next=/mustard-mode/hq`;
    const resend = resendClient();
    const firstName = name?.split(' ')[0];

    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName ? `${firstName}, ` : ''}[MUSTARD MODE: ON] Your coach is waiting`,
      html: programAccessEmail({
        firstName,
        programName: `MUSTARD MODE ${level?.name ?? ''}`.trim(),
        toolName: 'your HQ (coach, tracks, prompt library)',
        url,
      }),
    });

    await resend.emails.send({
      from: 'Modern Mustard Seed Store <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `New MUSTARD MODE sale. ${itemName}. $${((session.amount_total ?? 0) / 100).toFixed(0)}.`,
      html: leadNotification({
        type: 'Contact',
        name: name ?? 'unknown',
        email,
        fields: [
          { label: 'Level', value: itemName },
          { label: 'Email', value: email },
          { label: 'Amount', value: `$${((session.amount_total ?? 0) / 100).toFixed(0)}` },
        ],
        message: `Granted entitlement: ${slug}`,
        suggestedAction: 'Access email sent to the player with their HQ link.',
      }),
    });
  } catch (err) {
    console.error('mustard access email failed', err);
  }
}

/**
 * A Cabinet subscription was canceled. Revoke the cabinet entitlement so HQ
 * access follows the subscription (Player/Builder one-time grants are never
 * touched here).
 */
async function handleMustardSubscriptionDeleted(stripe: NonNullable<ReturnType<typeof getStripe>>, sub: Stripe.Subscription) {
  try {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (!customerId) return;
    const customer = await stripe.customers.retrieve(customerId);
    const email = !customer.deleted ? customer.email : null;
    if (!email) return;
    const revoked = await revokeEntitlement(email, 'mustard-mode-cabinet');
    if (!revoked) {
      console.error('mustard cabinet revoke FAILED for subscription', sub.id, '- revoke manually in entitlements');
      return;
    }
    console.log('mustard cabinet revoked for subscription', sub.id);
  } catch (err) {
    console.error('mustard cabinet revoke failed', err);
  }
}

/**
 * A MUSTARD LAUNCH tier was purchased (the Launch Kit one-time, or the Launch
 * Room subscription). Grant the entitlement, record the order + buyer, attribute
 * any affiliate, and email a passwordless access link into the Launch Deck.
 */
async function handleLaunchPurchase(
  req: Request,
  session: Stripe.Checkout.Session,
  slug: string,
  email: string,
  name: string | null,
  itemName: string
) {
  if (!isLaunchSlug(slug)) {
    console.error('launch webhook: unknown slug', slug);
    return;
  }
  const tier = getLaunchTierRow(slug);
  const source = slug === 'mustard-launch-room' ? 'subscription' : 'purchase';
  await grantEntitlement(email, slug, source);

  const ref = session.metadata?.ref;
  if (ref) {
    await recordProductCommission({
      affiliateCode: ref,
      orderEmail: email,
      productSlug: slug,
      amountCents: session.amount_total ?? (tier ? tier.priceUsd * 100 : 0),
      stripeSessionId: session.id,
    });
  }

  // Room revenue is recorded per cycle by invoice.paid (including month one), so
  // only the one-time Kit inserts an order here. Prevents a double count.
  const supabase = getSupabase();
  if (supabase && slug !== 'mustard-launch-room') {
    const { error } = await supabase.from('orders').insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      product_slug: slug,
      product_name: itemName,
      item_type: 'program',
      price_paid_cents: session.amount_total ?? (tier ? tier.priceUsd * 100 : 0),
      currency: session.currency ?? 'usd',
      email,
      name: name ?? null,
      status: 'paid',
    });
    if (error) console.error('launch order insert failed', error.message);
  }
  try {
    await insertLead({ type: 'contact', email, name: name ?? null, source: 'mustard-launch-buyer', status: 'new', notes: `[bought:${slug}]` });
  } catch (err) {
    console.error('launch lead insert failed', err);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const origin = new URL(req.url).origin || 'https://modernmustardseed.com';
    const token = await createMagicToken(email);
    const url = `${origin}/api/portal/verify?token=${encodeURIComponent(token)}&next=/mustard-launch/hq`;
    const resend = resendClient();
    const firstName = name?.split(' ')[0];

    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName ? `${firstName}, ` : ''}you are cleared for launch`,
      html: programAccessEmail({
        firstName,
        programName: `MUSTARD LAUNCH ${tier?.name ?? ''}`.trim(),
        toolName: 'your Launch Deck (your Kit, the mission map, and your coach)',
        url,
      }),
    });

    await resend.emails.send({
      from: 'Modern Mustard Seed Store <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `New MUSTARD LAUNCH sale. ${itemName}. $${((session.amount_total ?? 0) / 100).toFixed(0)}.`,
      html: leadNotification({
        type: 'Contact',
        name: name ?? 'unknown',
        email,
        fields: [
          { label: 'Tier', value: itemName },
          { label: 'Email', value: email },
          { label: 'Amount', value: `$${((session.amount_total ?? 0) / 100).toFixed(0)}` },
        ],
        message: `Granted entitlement: ${slug}`,
        suggestedAction: 'Access email sent to the founder with their Launch Deck link.',
      }),
    });
  } catch (err) {
    console.error('launch access email failed', err);
  }
}

/**
 * A Launch Room subscription was canceled. Revoke the room entitlement so Deck
 * access follows the subscription (the one-time Kit grant is never touched).
 */
async function handleLaunchSubscriptionDeleted(stripe: NonNullable<ReturnType<typeof getStripe>>, sub: Stripe.Subscription) {
  try {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (!customerId) return;
    const customer = await stripe.customers.retrieve(customerId);
    const email = !customer.deleted ? customer.email : null;
    if (!email) return;
    const revoked = await revokeEntitlement(email, 'mustard-launch-room');
    if (!revoked) {
      console.error('launch room revoke FAILED for subscription', sub.id, '- revoke manually in entitlements');
      return;
    }
    console.log('launch room revoked for subscription', sub.id);
  } catch (err) {
    console.error('launch room revoke failed', err);
  }
}

/**
 * A proposal deposit was paid via the admin-generated Stripe link. Mark the
 * proposal paid, record the revenue, and win the linked lead. Idempotent: the
 * unique stripe_session_id on orders prevents a double count.
 */
async function handleDepositPaid(session: Stripe.Checkout.Session, email: string | null, name: string | null) {
  const supabase = getSupabase();
  if (!supabase) return;
  const proposalId = session.metadata?.proposal_id;
  if (!proposalId) return;

  const { data: p } = await supabase.from('proposals').select('*').eq('id', proposalId).maybeSingle();

  try {
    await supabase.from('orders').insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      product_name: session.metadata?.item_name || 'Deposit',
      item_type: 'deposit',
      price_paid_cents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      email: email || (p?.client_email as string) || 'client@unknown',
      name: name || (p?.client_name as string) || null,
      status: 'paid',
    });
  } catch (err) {
    console.error('deposit order insert failed (may be duplicate)', err);
  }

  await supabase
    .from('proposals')
    .update({ deposit_status: 'paid', deposit_paid_at: new Date().toISOString() })
    .eq('id', proposalId);

  // Make sure the client + project exist even if they paid without signing.
  await provisionFromProposal(proposalId);

  if (p?.lead_id) {
    try {
      await supabase.from('leads').update({ status: 'won' }).eq('id', p.lead_id);
    } catch {
      /* ignore */
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: `Deposit paid. ${session.metadata?.item_name || 'Deposit'}. $${((session.amount_total ?? 0) / 100).toFixed(0)}.`,
        html: leadNotification({
          type: 'Contact',
          name: name || (p?.client_name as string) || 'client',
          email: email || (p?.client_email as string) || 'unknown',
          fields: [
            { label: 'Amount', value: `$${((session.amount_total ?? 0) / 100).toFixed(0)}` },
            { label: 'Proposal', value: proposalId },
          ],
          message: 'Deposit cleared. The build is on the calendar.',
          suggestedAction: 'Kick off the project.',
        }),
      });
    } catch (err) {
      console.error('deposit notify failed', err);
    }
  }
}

/** The final balance on a proposal was paid. Record it and notify Sarah. */
async function handleBalancePaid(session: Stripe.Checkout.Session, email: string | null, name: string | null) {
  const supabase = getSupabase();
  if (!supabase) return;
  const proposalId = session.metadata?.proposal_id;
  if (!proposalId) return;

  const { data: p } = await supabase.from('proposals').select('*').eq('id', proposalId).maybeSingle();

  try {
    await supabase.from('orders').insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      product_name: session.metadata?.item_name || 'Balance',
      item_type: 'balance',
      price_paid_cents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      email: email || (p?.client_email as string) || 'client@unknown',
      name: name || (p?.client_name as string) || null,
      status: 'paid',
    });
  } catch (err) {
    console.error('balance order insert failed (may be duplicate)', err);
  }

  await supabase
    .from('proposals')
    .update({ balance_status: 'paid', balance_paid_at: new Date().toISOString() })
    .eq('id', proposalId);

  // Paid in full = delivered. Ask for a review (deduped).
  await sendReviewNudge({ email: email || (p?.client_email as string), name: name || (p?.client_name as string) });

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: `Balance paid in full. $${((session.amount_total ?? 0) / 100).toFixed(0)}.`,
        html: leadNotification({
          type: 'Contact',
          name: name || (p?.client_name as string) || 'client',
          email: email || (p?.client_email as string) || 'unknown',
          fields: [{ label: 'Amount', value: `$${((session.amount_total ?? 0) / 100).toFixed(0)}` }],
          message: 'The final balance cleared. The engagement is paid in full.',
          suggestedAction: 'Confirm handoff is complete.',
        }),
      });
    } catch (err) {
      console.error('balance notify failed', err);
    }
  }
}

/** A monthly subscription checkout completed. Mark the plan active, link the
 *  subscription to the proposal, and make sure the project exists. Revenue is
 *  recorded per cycle via invoice.paid, so we do not record it here. */
async function handleSubscriptionStarted(session: Stripe.Checkout.Session) {
  const supabase = getSupabase();
  if (!supabase) return;
  const proposalId = session.metadata?.proposal_id;
  if (!proposalId) return;
  const subId = typeof session.subscription === 'string' ? session.subscription : null;
  const customerId = typeof session.customer === 'string' ? session.customer : null;
  await supabase
    .from('proposals')
    .update({ subscription_status: 'active', stripe_subscription_id: subId, stripe_customer_id: customerId, subscription_started_at: new Date().toISOString() })
    .eq('id', proposalId);
  await provisionFromProposal(proposalId);

  if (process.env.RESEND_API_KEY) {
    try {
      const { data: p } = await supabase.from('proposals').select('client_name, client_email').eq('id', proposalId).maybeSingle();
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: 'Monthly plan started',
        html: leadNotification({
          type: 'Contact',
          name: (p?.client_name as string) || 'client',
          email: (p?.client_email as string) || 'unknown',
          fields: [{ label: 'Proposal', value: proposalId }],
          message: 'A client started their monthly plan. Recurring revenue is live.',
          suggestedAction: 'Keep building and running it.',
        }),
      });
    } catch (err) {
      console.error('subscription start notify failed', err);
    }
  }
}

/** Each paid subscription invoice (including the first) records recurring revenue. */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = getSupabase();
  if (!supabase) return;
  // Only subscription invoices.
  const subId = typeof (invoice as { subscription?: unknown }).subscription === 'string'
    ? ((invoice as { subscription?: string }).subscription as string)
    : null;
  if (!subId) return;
  const amount = invoice.amount_paid ?? 0;
  if (amount < 1) return;
  const email = invoice.customer_email || 'client@unknown';
  const subMetaAll = (invoice as { subscription_details?: { metadata?: Record<string, string> } }).subscription_details?.metadata;
  const proposalId = subMetaAll?.proposal_id || null;

  // Recurring affiliate commission: any referred subscription (its metadata
  // carries a ref) pays the partner a share of THIS invoice, for a capped
  // window, idempotent by invoice id. This is what makes a referred Sidekick
  // subscription pay the partner every month, not just at signup.
  if (subMetaAll?.ref && invoice.id) {
    await recordSubscriptionCommission({
      affiliateCode: subMetaAll.ref,
      orderEmail: email,
      subscriptionId: subId,
      invoiceId: invoice.id,
      amountCents: amount,
      kind: subMetaAll.kind,
    });
  }

  try {
    await supabase.from('orders').insert({
      stripe_session_id: invoice.id,
      product_name: 'Monthly plan',
      item_type: 'subscription',
      price_paid_cents: amount,
      currency: invoice.currency ?? 'usd',
      email,
      name: invoice.customer_name ?? null,
      status: 'paid',
    });
  } catch (err) {
    console.error('subscription invoice order insert failed (may be duplicate)', err);
  }

  // Ensure the proposal is marked active (covers the first-invoice race).
  try {
    if (proposalId) {
      await supabase.from('proposals').update({ subscription_status: 'active', stripe_subscription_id: subId }).eq('id', proposalId);
    } else {
      await supabase.from('proposals').update({ subscription_status: 'active' }).eq('stripe_subscription_id', subId);
    }
  } catch {
    /* ignore */
  }
}

/** A subscription payment failed. Flag past-due and nudge the client to update their card. */
async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const supabase = getSupabase();
  if (!supabase) return;
  const subId = typeof (invoice as { subscription?: unknown }).subscription === 'string'
    ? ((invoice as { subscription?: string }).subscription as string)
    : null;
  if (!subId) return;

  // Sidekick renewals get their own recovery note (the /portal link below is
  // for proposal clients and means nothing to a Sidekick buyer).
  const subMeta = (invoice as { subscription_details?: { metadata?: Record<string, string> } }).subscription_details?.metadata;
  if (subMeta?.kind === 'sidekick') {
    const skEmail = invoice.customer_email;
    if (process.env.RESEND_API_KEY && skEmail) {
      const business = escapeHtmlSafe(subMeta.business || 'your business');
      try {
        const resend = resendClient();
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: skEmail,
          replyTo: 'sarah@modernmustardseed.com',
          subject: 'Quick payment hiccup on your Sidekick',
          html: clientEmail({
            preheader: 'Your card needs a quick update so he stays on the phones.',
            eyebrow: 'SIDEKICK',
            greeting: 'A quick card hiccup.',
            body: `<p>The monthly payment for ${business}'s Sidekick did not go through. It happens (expired card, bank hiccup, gremlin).</p><p>Stripe will retry automatically, or just reply to this email and I will send a fresh payment link. He stays on the phones in the meantime.</p>`,
            signature: 'Sarah',
          }),
        });
        await resend.emails.send({
          from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
          to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
          subject: `SIDEKICK payment failed: ${subMeta.business || skEmail}`,
          html: clientEmail({
            preheader: 'A Sidekick renewal failed.',
            eyebrow: 'SIDEKICK DUNNING',
            greeting: 'A renewal bounced.',
            body: `<p>Subscription ${subId}${subMeta.business ? ` (business: <strong>${business}</strong>)` : ''} failed to renew for ${escapeHtmlSafe(skEmail)}.</p><p>Stripe retries on its own. If it does not recover in a few days, pause the line before the minutes leak.</p>`,
            signature: 'The Forge',
          }),
        });
      } catch (err) {
        console.error('sidekick dunning email failed', err);
      }
    }
    return;
  }

  // Demo-order renewals get their own note (the generic /portal dunning link
  // below is for proposal clients and means nothing to a demo-order buyer).
  if (subMeta?.kind === 'demo-order') {
    const dEmail = invoice.customer_email;
    if (process.env.RESEND_API_KEY && dEmail) {
      const what = escapeHtmlSafe(subMeta.item_name || 'your system');
      try {
        const resend = resendClient();
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: dEmail,
          replyTo: 'sarah@modernmustardseed.com',
          subject: 'Quick payment hiccup on your monthly',
          html: clientEmail({
            preheader: 'Your card needs a quick update. Nothing switches off today.',
            eyebrow: 'PAYMENT',
            greeting: 'A quick card hiccup.',
            body: `<p>This month's payment for ${what} did not go through. It happens (expired card, bank hiccup, gremlin).</p><p>Stripe will retry on its own, or reply to this email and I will send a fresh payment link. Nothing switches off in the meantime.</p>`,
            signature: 'Sarah',
          }),
        });
        await resend.emails.send({
          from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
          to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
          subject: `DEMO ORDER payment failed: ${subMeta.item_name || dEmail}`,
          html: clientEmail({
            preheader: 'A demo-order renewal failed.',
            eyebrow: 'DEMO ORDER DUNNING',
            greeting: 'A renewal bounced.',
            body: `<p>Subscription ${subId} (${what}) failed to renew for ${escapeHtmlSafe(dEmail)}.</p><p>Stripe retries on its own. If it does not recover in a few days, pause their receptionist minutes before they leak.</p>`,
            signature: 'The Demo Hub',
          }),
        });
      } catch (err) {
        console.error('demo-order dunning email failed', err);
      }
    }
    return;
  }

  // GEO Watch renewals get their own recovery note.
  if (subMeta?.kind === 'geo') {
    const gEmail = invoice.customer_email;
    if (process.env.RESEND_API_KEY && gEmail) {
      try {
        const resend = resendClient();
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: gEmail,
          replyTo: 'sarah@modernmustardseed.com',
          subject: 'Quick payment hiccup on your Watch',
          html: clientEmail({
            preheader: 'A quick card update keeps the monthly re-grades coming.',
            eyebrow: 'GEO DESK',
            greeting: 'A quick card hiccup.',
            body: `<p>The monthly payment for your site Watch did not go through (expired card, bank hiccup, gremlin).</p><p>Stripe retries automatically, or reply and I will send a fresh payment link so this month's re-grade ships on time.</p>`,
            signature: 'Sarah',
          }),
        });
        await resend.emails.send({
          from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
          to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
          subject: `GEO WATCH payment failed: ${gEmail}`,
          html: clientEmail({
            preheader: 'A Watch renewal failed.',
            eyebrow: 'GEO DUNNING',
            greeting: 'A renewal bounced.',
            body: `<p>Subscription ${subId} failed to renew for ${escapeHtmlSafe(gEmail)}. Stripe retries on its own; pause the watch row if it does not recover.</p>`,
            signature: 'The Desk',
          }),
        });
      } catch (err) {
        console.error('geo dunning email failed', err);
      }
    }
    return;
  }

  // Season Pass renewals likewise get their own recovery note.
  if (subMeta?.kind === 'pictures') {
    const pxEmail = invoice.customer_email;
    if (process.env.RESEND_API_KEY && pxEmail) {
      const business = escapeHtmlSafe(subMeta.business || 'your business');
      try {
        const resend = resendClient();
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: pxEmail,
          replyTo: 'sarah@modernmustardseed.com',
          subject: 'Quick payment hiccup on your Season Pass',
          html: clientEmail({
            preheader: 'A quick card update keeps the monthly spots coming.',
            eyebrow: 'MUSTARD PICTURES',
            greeting: 'A quick card hiccup.',
            body: `<p>The monthly payment for ${business}'s Season Pass did not go through (expired card, bank hiccup, gremlin).</p><p>Stripe retries automatically, or reply to this email and I will send a fresh payment link so this month's spot ships on time.</p>`,
            signature: 'Sarah',
          }),
        });
        await resend.emails.send({
          from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
          to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
          subject: `SEASON PASS payment failed: ${subMeta.business || pxEmail}`,
          html: clientEmail({
            preheader: 'A Season Pass renewal failed.',
            eyebrow: 'PICTURES DUNNING',
            greeting: 'A renewal bounced.',
            body: `<p>Subscription ${subId}${subMeta.business ? ` (business: <strong>${business}</strong>)` : ''} failed to renew for ${escapeHtmlSafe(pxEmail)}.</p><p>Hold this month's production until it recovers.</p>`,
            signature: 'The Studio',
          }),
        });
      } catch (err) {
        console.error('pictures dunning email failed', err);
      }
    }
    return;
  }

  // Care Plan renewals get their own note (the generic /portal dunning below is fine
  // too, but a Care Plan client should hear it in their own words).
  if (subMeta?.kind === 'care-plan') {
    const cEmail = invoice.customer_email;
    if (process.env.RESEND_API_KEY && cEmail) {
      try {
        const resend = resendClient();
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: cEmail,
          replyTo: 'sarah@modernmustardseed.com',
          subject: 'Quick payment hiccup on your Care Plan',
          html: clientEmail({
            preheader: 'A quick card update keeps your edits included.',
            eyebrow: 'THE CARE PLAN',
            greeting: 'A quick card hiccup.',
            body: `<p>This month's Care Plan payment did not go through (expired card, bank hiccup, gremlin).</p><p>Stripe retries automatically, or reply and I will send a fresh link. Your edits stay included in the meantime.</p>`,
            signature: 'Sarah',
          }),
        });
      } catch (err) {
        console.error('care-plan dunning email failed', err);
      }
    }
    return;
  }

  let proposal: { id?: string; client_name?: string | null; client_email?: string | null; client_company?: string | null } | null = null;
  try {
    const { data } = await supabase
      .from('proposals')
      .select('id, client_name, client_email, client_company')
      .eq('stripe_subscription_id', subId)
      .maybeSingle();
    proposal = data;
    await supabase.from('proposals').update({ subscription_status: 'past_due' }).eq('stripe_subscription_id', subId);
  } catch {
    /* ignore */
  }

  const email = invoice.customer_email || (proposal?.client_email as string) || null;
  if (process.env.RESEND_API_KEY && email) {
    const label = (proposal?.client_company as string) || (proposal?.client_name as string) || 'your plan';
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'Quick payment hiccup on your plan',
        html: subscriptionPaymentFailedEmail({ toName: (proposal?.client_name as string) || undefined, label, manageUrl: `${SITE.url}/portal` }),
      });
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: `Subscription payment failed: ${label}`,
        html: leadNotification({
          type: 'Contact',
          name: (proposal?.client_name as string) || 'client',
          email,
          fields: [{ label: 'Status', value: 'past_due' }],
          message: 'A subscription payment failed. The client was asked to update their card.',
          suggestedAction: 'Follow up if it does not recover.',
        }),
      });
    } catch (err) {
      console.error('payment failed email error', err);
    }
  }
}

/** A subscription was canceled. Mark the proposal so the portal reflects it. */
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('proposals').update({ subscription_status: 'canceled' }).eq('stripe_subscription_id', sub.id);
  } catch {
    /* ignore */
  }
}

/** On refund, claw back the affiliate commission for that purchase. */
async function handleRefundClawback(stripe: ReturnType<typeof getStripe>, charge: Stripe.Charge) {
  if (!stripe) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  if (!pi) return;
  try {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 1 });
    const sessionId = sessions.data[0]?.id;
    if (!sessionId) return;
    await supabase
      .from('commissions')
      .update({ status: 'clawed_back' })
      .eq('stripe_session_id', sessionId)
      .in('status', ['pending', 'payable']);
  } catch (err) {
    console.error('refund clawback failed', err);
  }
}

/**
 * A Sidekick was kept. Revenue (setup + month one) is recorded by the
 * invoice.paid handler like every other subscription, so this only records
 * the buyer, tells Sarah to PROVISION, and welcomes the client. Fulfillment
 * is hand-installed within 7 days.
 */
async function handleSidekickPurchase(
  session: Stripe.Checkout.Session,
  slug: string,
  email: string,
  name: string | null
) {
  const tier = getSidekickTier(slug);
  const businessRaw = (session.metadata?.business || '').trim();
  const business = escapeHtmlSafe(businessRaw);
  const firstName = name?.split(' ')[0];
  const safeName = name ? escapeHtmlSafe(name) : null;

  try {
    await insertLead({
      type: 'contact',
      email,
      name: name ?? null,
      source: 'sidekick-buyer',
      status: 'new',
      notes: `[bought:${slug}]${businessRaw ? ` business: ${businessRaw}` : ''} PROVISION within 7 days`,
    });
  } catch (err) {
    console.error('sidekick lead insert failed', err);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = resendClient();

  try {
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `PROVISION ${tier?.name ?? 'SIDEKICK'}: ${businessRaw || email}`,
      html: clientEmail({
        preheader: 'A Sidekick was kept. Install within 7 days.',
        eyebrow: 'SIDEKICK ORDER',
        greeting: 'He got hired.',
        body: `<p><strong>${safeName ?? escapeHtmlSafe(email)}</strong> just kept their Sidekick${business ? ` for <strong>${business}</strong>` : ''}.</p><p>Plan: ${tier?.name ?? slug} (${tier ? `$${sidekickUsd(tier.setupCents)} setup + $${sidekickUsd(tier.monthlyCents)}/mo, ${tier.minutesCap} min cap` : slug}).</p><p>Email: ${escapeHtmlSafe(email)}. Stripe session: ${session.id}.</p><p>Promise on the page: live within 7 days, installed by hand. Their forge run and transcript are in Vapi under metadata kind=sidekick-demo.</p>`,
        signature: 'The Forge',
      }),
    });
  } catch (err) {
    console.error('sidekick provision email failed', err);
  }

  try {
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName ? `${firstName}, ` : ''}your Sidekick got the job`,
      html: clientEmail({
        preheader: 'He starts within 7 days. Here is what happens next.',
        eyebrow: tier?.name ?? 'SIDEKICK',
        greeting: firstName ? `${firstName}, he got the job.` : 'He got the job.',
        body: `<p>Your Sidekick${business ? ` for <strong>${business}</strong>` : ''} is officially hired. Here is exactly what happens next:</p><p><strong>1.</strong> Within one business day, I will email you personally to confirm the details he learned in the forge and how you want your line handled (new local number, or forwarding your existing one).</p><p><strong>2.</strong> I hand-tune his training, wire up bookings and call summaries, and test him on real scenarios.</p><p><strong>3.</strong> Within 7 days he is live, answering ${business || 'your business'} around the clock. ${tier ? `Your plan includes ${tier.minutesCap} answered minutes a month; at the cap he switches to message-taking, so there is never a surprise bill.` : ''}</p><p>Month to month, cancel anytime, and your setup fee is credited in full toward any custom build over $2,500 if you ever go bigger.</p>`,
        cta: { label: 'Reply to this email with questions', url: 'mailto:sarah@modernmustardseed.com' },
        signature: 'Sarah',
      }),
    });
  } catch (err) {
    console.error('sidekick welcome email failed', err);
  }
}

function escapeHtmlSafe(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A SWITCHBOARD franchise deal closed (subscription: per-location monthly + a
 * one-time build on the first invoice). Recurring revenue is recorded per
 * invoice by handleInvoicePaid like every subscription; here we record the buyer
 * and tell Sarah to PROVISION the whole chain.
 */
async function handleSwitchboardPurchase(
  session: Stripe.Checkout.Session,
  email: string,
  name: string | null
) {
  const businessRaw = (session.metadata?.business || '').trim();
  const business = escapeHtmlSafe(businessRaw);
  const locations = session.metadata?.locations || '?';
  const perLoc = session.metadata?.per_location || '?';
  const firstName = name?.split(' ')[0];

  try {
    await insertLead({
      type: 'contact',
      email,
      name: name ?? businessRaw ?? null,
      source: 'switchboard-buyer',
      status: 'won',
      notes: `[switchboard] ${businessRaw || 'a brand'} · ${locations} locations at $${perLoc}/mo each. PROVISION the whole chain: brand voice template + master routing + Command Board.`,
    });
  } catch (err) {
    console.error('switchboard lead insert failed', err);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = resendClient();

  try {
    await resend.emails.send({
      from: 'The Switchboard <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `SWITCHBOARD SOLD: ${businessRaw || email} · ${locations} locations`,
      html: leadNotification({
        type: 'Contact',
        name: name ?? businessRaw ?? 'A brand',
        email,
        fields: [
          { label: 'Brand', value: businessRaw || 'not given' },
          { label: 'Locations', value: String(locations) },
          { label: 'Per location', value: `$${perLoc}/mo` },
          { label: 'First invoice', value: `$${((session.amount_total ?? 0) / 100).toFixed(0)}` },
        ],
        message: 'A multi-location brand bought the Switchboard. PROVISION the whole chain.',
        suggestedAction: 'Build the brand voice template, wire master routing, and open their Command Board.',
      }),
    });
  } catch (err) {
    console.error('switchboard sale notify failed', err);
  }

  try {
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName ? `${firstName}, ` : ''}your Switchboard is on`,
      html: clientEmail({
        preheader: 'One voice, every location. Here is what happens next.',
        eyebrow: 'THE SWITCHBOARD',
        greeting: firstName ? `${firstName}, every door is covered now.` : 'Every door is covered now.',
        body: `<p>You just put one AI concierge on all ${locations} locations of <strong>${business || 'your brand'}</strong>. Here is what happens next:</p><p><strong>1.</strong> Within one business day I reach out to map your brand voice, hours, and booking rules.</p><p><strong>2.</strong> We build one concierge template and clone it to every location, with the master number routing.</p><p><strong>3.</strong> Your Command Board goes live, and you watch the recovered revenue climb across every location.</p>`,
        signature: 'Sarah',
      }),
    });
  } catch (err) {
    console.error('switchboard welcome email failed', err);
  }
}

/**
 * A client bought ONE self-serve website edit ($29), after their two free ones.
 * Payment has cleared, so queue the edit now: it builds into a draft, and the
 * client previews and ships it themselves from their portal. paid:true so a
 * discard never refunds a free revision they did not spend.
 */
async function handlePaidEditPurchase(session: Stripe.Checkout.Session) {
  const projectId = session.metadata?.project_id;
  const instruction = (session.metadata?.instruction || '').trim();
  const clientEmailAddr = session.metadata?.client_email || null;
  if (!projectId || !instruction) {
    console.error('paid-edit webhook missing project_id or instruction');
    return;
  }
  const sb = getSupabase();
  if (!sb) return;

  const { data: project } = await sb
    .from('projects')
    .select('id, name, site_html, edit_status')
    .eq('id', projectId)
    .maybeSingle();
  if (!project?.site_html) {
    console.error('paid-edit: project has no site to edit', projectId);
    return;
  }
  // Do not stack on an edit already moving (a double webhook, or a race).
  if (project.edit_status === 'queued' || project.edit_status === 'building') return;

  const { data: order } = await sb
    .from('demo_orders')
    .select('outbound_lead_id, business_name')
    .eq('project_id', projectId)
    .maybeSingle();

  const business = String(order?.business_name ?? project.name ?? 'the business').replace(/:.*$/, '').trim();
  const queued = await queueProjectEdit(sb, {
    projectId: String(project.id),
    leadId: (order?.outbound_lead_id as string | null) ?? null,
    business,
    currentHtml: project.site_html as string,
    instruction,
    requestedBy: clientEmailAddr ?? 'client',
    paid: true,
  });
  if (!queued.ok) {
    console.error('paid-edit queue failed', queued.error);
    return;
  }

  // Count it, so the portal can say "you have spent $X on edits" and offer the Care
  // Plan. A read-then-write is fine here: paid edits arrive one cleared payment at a
  // time, never concurrently for the same project.
  const { data: cur } = await sb.from('projects').select('paid_edits_count').eq('id', projectId).maybeSingle();
  await sb.from('projects').update({ paid_edits_count: Number(cur?.paid_edits_count ?? 0) + 1 }).eq('id', projectId);

  if (process.env.RESEND_API_KEY) {
    try {
      await resendClient().emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        subject: `Paid edit ($29): ${business}`,
        html: leadNotification({
          type: 'Contact',
          name: business,
          email: clientEmailAddr ?? 'a client',
          fields: [{ label: 'Edit', value: instruction.slice(0, 300) }],
          message: 'A client bought a self-serve edit. The forge is building it into a draft for them to preview and ship.',
          suggestedAction: 'It publishes when they ship it. Oversee on /admin/delivery.',
        }),
      });
    } catch { /* never block the queue on email */ }
  }
}

/**
 * A client started their CARE PLAN ($97/mo). Turn it on for their project, store the
 * subscription + customer ids (so the cancel webhook finds the row), and open a fresh
 * fair-use window. Recurring revenue is recorded per invoice by handleInvoicePaid
 * like every subscription. Welcome them and tell Sarah.
 */
async function handleCarePlanStarted(session: Stripe.Checkout.Session, email: string | null, name: string | null) {
  const projectId = session.metadata?.project_id;
  if (!projectId) {
    console.error('care-plan webhook missing project_id');
    return;
  }
  const sb = getSupabase();
  if (!sb) return;
  const subId = typeof session.subscription === 'string' ? session.subscription : null;
  const customerId = typeof session.customer === 'string' ? session.customer : null;

  const { data: proj, error } = await sb
    .from('projects')
    .update({
      care_plan: true,
      care_sub_id: subId,
      care_customer_id: customerId,
      care_edits_used: 0,
      care_period_start: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select('name, client_email')
    .maybeSingle();
  if (error) {
    console.error('care-plan activate failed', error.message, '- sub', subId, 'must be reconciled by hand');
    return;
  }
  const business = String(proj?.name ?? 'their site').replace(/:.*$/, '').trim();
  const to = email || (proj?.client_email as string) || null;
  const firstName = name?.split(' ')[0];

  if (!process.env.RESEND_API_KEY) return;
  const resend = resendClient();
  try {
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `CARE PLAN started: ${business}`,
      html: leadNotification({
        type: 'Contact',
        name: business,
        email: to ?? 'a client',
        fields: [{ label: 'Plan', value: 'Care Plan · $97/mo' }, { label: 'Project', value: projectId }],
        message: 'A client turned on the Care Plan. Every edit is included now, recurring revenue is live.',
        suggestedAction: 'Their edits still land as drafts they preview and ship; oversee on /admin/delivery.',
      }),
    });
  } catch (err) {
    console.error('care-plan notify failed', err);
  }
  if (to) {
    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `${firstName ? `${firstName}, ` : ''}your Care Plan is on`,
        html: clientEmail({
          preheader: 'Every edit is included now. Change your site as often as you like.',
          eyebrow: 'THE CARE PLAN',
          greeting: firstName ? `${firstName}, you are covered.` : 'You are covered.',
          body: `<p>Your Care Plan for <strong>${escapeHtmlSafe(business)}</strong> is active. From today, every edit is included, and none of them count against anything.</p><p>It works exactly the way it did before: type the change in your portal, we build it in minutes, you preview it and ship it yourself. The only difference is you never pay per edit again. Month to month, cancel anytime.</p>`,
          cta: { label: 'Make an edit', url: `${SITE.url}/portal` },
          signature: 'Sarah',
        }),
      });
    } catch (err) {
      console.error('care-plan welcome failed', err);
    }
  }
}

/** A Care Plan was canceled. Turn it off so edits go back to the two-free / pay-per
 *  model. The forever-included window simply stops; nothing already shipped changes. */
async function handleCarePlanDeleted(sub: Stripe.Subscription) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('projects').update({ care_plan: false }).eq('care_sub_id', sub.id);
  } catch (err) {
    console.error('care-plan deactivate failed', err);
  }
}

/**
 * A MUSTARD HATCHERY hatch was purchased ($497, flat and evergreen). Record the
 * order + buyer with a hand-numbered certificate, tell Sarah to BIRTH the
 * mascot, and welcome the founder. Generation itself is hand-run.
 */
async function handleHatcheryPurchase(
  session: Stripe.Checkout.Session,
  slug: string,
  email: string,
  name: string | null
) {
  const tier = getHatcheryTier(slug);
  const businessRaw = (session.metadata?.business || '').trim();
  const business = escapeHtmlSafe(businessRaw);
  const firstName = name?.split(' ')[0];

  const supabase = getSupabase();
  let num: number | null = null;
  if (supabase) {
    num = await nextHatchNumber(supabase);
    const { error } = await supabase.from('orders').insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      product_slug: slug,
      product_name: `The Mustard Hatchery — ${tier?.name ?? 'The Hatch'}${num ? ` (No. ${String(num).padStart(3, '0')})` : ''}`,
      item_type: 'program',
      price_paid_cents: session.amount_total ?? HATCH.priceUsd * 100,
      currency: session.currency ?? 'usd',
      email,
      name: name ?? null,
      status: 'paid',
    });
    if (error) console.error('hatchery order insert failed', error.message);
  }

  const certLabel = num ? `Birth Certificate No. ${String(num).padStart(3, '0')}` : 'a hand-numbered Birth Certificate';

  try {
    await insertLead({
      type: 'contact',
      email,
      name: name ?? null,
      source: 'hatchery-buyer',
      status: 'new',
      notes: `[bought:${slug}] ${certLabel}.${businessRaw ? ` business: ${businessRaw}.` : ''} BIRTH this mascot: get direction approval, then schedule the Birth Day.`,
    });
  } catch (err) {
    console.error('hatchery lead insert failed', err);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = resendClient();

  try {
    await resend.emails.send({
      from: 'The Mustard Hatchery <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `BIRTH a mascot: ${businessRaw || email} (${certLabel})`,
      html: leadNotification({
        type: 'Contact',
        name: name ?? businessRaw ?? 'A founder',
        email,
        fields: [
          { label: 'Business', value: businessRaw || 'not given' },
          { label: 'Certificate', value: certLabel },
          { label: 'Amount', value: `$${((session.amount_total ?? HATCH.priceUsd * 100) / 100).toFixed(0)}` },
          { label: 'Email', value: email },
        ],
        message: 'A mascot was purchased. Confirm the direction with them before any art is made, then schedule the Birth Day.',
        suggestedAction: 'Reply to start their Character Storybook direction.',
      }),
    });
  } catch (err) {
    console.error('hatchery birth email failed', err);
  }

  try {
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName ? `${firstName}, ` : ''}your mascot is on its way`,
      html: clientEmail({
        preheader: 'Here is exactly what happens between now and your Birth Day.',
        eyebrow: 'THE MUSTARD HATCHERY',
        greeting: firstName ? `${firstName}, it is happening.` : 'It is happening.',
        body: `<p>You just hatched a mascot for <strong>${business || 'your business'}</strong>${num ? ` (${escapeHtmlSafe(certLabel)})` : ''}. Here is what happens next:</p><p><strong>1.</strong> Within one business day I email you personally to learn your shop, so your mascot grows out of your real story.</p><p><strong>2.</strong> I send you a direction to approve. Nothing is drawn until you love it.</p><p><strong>3.</strong> We schedule your Birth Day. The egg cracks live, the film plays, and your mascot answers its own phone in front of everyone you invite.</p><p>Want to feel it before then? Call Huck, our pilot mascot, at ${HUCK.phone}.</p>`,
        signature: 'Sarah',
      }),
    });
  } catch (err) {
    console.error('hatchery welcome email failed', err);
  }
}

/**
 * A DEMO ORDER landed: someone bought straight off their forged demo
 * (voice / site / OS / bundle, monthly + setup on the first invoice).
 * Flip the lifecycle row to paid, mark the outbound lead won, note the
 * thread, and fire the provision + welcome emails. Revenue itself is
 * recorded per paid invoice by handleInvoicePaid (subscription rule).
 */
async function handleDemoOrderPaid(
  session: Stripe.Checkout.Session,
  email: string | null,
  name: string | null
) {
  const supabase = getSupabase();
  if (!supabase) return;
  const orderId = session.metadata?.demo_order_id;
  const hubId = session.metadata?.hub_demo_id;
  const label = session.metadata?.item_name || 'Demo order';
  if (!orderId) {
    console.error('demo-order webhook missing demo_order_id:', session.id);
    return;
  }

  // IDEMPOTENT: Stripe retries, and the dashboard can resend an event by hand.
  // Only a real pending -> paid transition may write, or a replay would regress
  // an intake_done order back to paid (buyer sees the empty form again, cockpit
  // state lost), resurrect a canceled order as live, and re-fire BOTH emails.
  // The .eq('status','pending') filter makes the transition the lock: a replay
  // matches no row, returns null, and falls through to the no-op below.
  const subId = typeof session.subscription === 'string' ? session.subscription : null;
  const { data: order } = await supabase
    .from('demo_orders')
    .update({
      status: 'paid',
      stripe_subscription_id: subId,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id,outbound_lead_id,business_name,products,setup_cents,monthly_cents,phone,email,name,project_id')
    .maybeSingle();

  if (!order) {
    // Already processed (replay) or the row is gone. Never re-email.
    console.log('demo-order webhook: no pending row for', orderId, '(replay or already handled)');
    return;
  }

  const intakeUrl = `${SITE.url}/demo/order/${hubId}/thanks?session_id=${session.id}`;
  const products = Array.isArray(order?.products) ? (order?.products as string[]).join(', ') : '';
  const money = order ? `$${Math.round((order.setup_cents || 0) / 100)} setup + $${Math.round((order.monthly_cents || 0) / 100)}/mo` : '';

  // Mark the dial-floor lead WON and note the thread so the cockpit shows it.
  if (order?.outbound_lead_id) {
    try {
      const { data: wonLead } = await supabase
        .from('outbound_leads')
        .update({ status: 'won', next_action: 'Deliver demo order within 7 days' })
        .eq('id', order.outbound_lead_id)
        .select('*')
        .maybeSingle();
      await supabase.from('messages').insert({
        outbound_lead_id: order.outbound_lead_id,
        direction: 'inbound',
        channel: 'note',
        subject: 'ORDERED from the demo hub',
        body: `${label} (${products}) — ${money}. Stripe ${session.id}. Deliver within 7 days.`,
        snippet: `ORDERED: ${label}`,
      });
      // Carry the win into the CRM pipeline, or the command center would still
      // be nagging about an "unreplied lead" who has already paid.
      if (wonLead) {
        const synced = await syncLeadToPipeline(supabase, wonLead, { source: 'demo-station' });
        if (!synced.ok) console.error('demo-order pipeline sync failed:', synced.error);
      }
    } catch (err) {
      console.error('demo-order lead update failed', err);
    }
  }

  // OPEN THEIR PORTAL. Until this existed the funnel simply stopped at the money:
  // a buyer never became a client or a project, so signing in at /portal showed
  // them the guest empty state. Best-effort on purpose. If it throws, the money is
  // already banked and a Stripe retry would re-run the whole handler, so we log and
  // let the admin screen surface any order that never got a project.
  let provisioned = false;
  try {
    const result = await provisionDemoOrder(supabase, {
      ...order,
      email: order.email ?? email,
      name: order.name ?? name,
    });
    if (result.ok) {
      provisioned = true;
      console.log('demo-order provisioned:', result.projectId, result.created ? '(new)' : '(existing)');
    } else {
      console.error('demo-order provisioning failed:', result.error);
    }
  } catch (err) {
    console.error('demo-order provisioning threw', err);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = resendClient();
  const business = escapeHtmlSafe(order?.business_name || '');
  const firstName = name?.split(' ')[0];

  try {
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `DEMO ORDER: ${order?.business_name || email || session.id} bought ${products || 'a demo'}`,
      html: clientEmail({
        preheader: 'A demo just sold itself. Release within 7 days.',
        eyebrow: 'DEMO ORDER',
        greeting: 'The demo closed the deal.',
        body: `<p><strong>${escapeHtmlSafe(name || email || 'A prospect')}</strong>${business ? ` at <strong>${business}</strong>` : ''} ordered straight from their demo hub.</p><p>Ordered: <strong>${escapeHtmlSafe(label)}</strong> (${money}).</p><p>Their customization intake ${order ? 'is' : 'will be'} attached to the order in the cockpit; promise on the page is released within 7 days.</p><p>Stripe session: ${session.id}.</p>`,
        signature: 'The Demo Hub',
      }),
    });
  } catch (err) {
    console.error('demo-order provision email failed', err);
  }

  if (email) {
    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `${firstName ? `${firstName}, ` : ''}it's yours. Here is what happens next`,
        html: clientEmail({
          preheader: 'We customize everything and release it within 7 days.',
          eyebrow: 'ORDER CONFIRMED',
          greeting: firstName ? `${firstName}, welcome aboard.` : 'Welcome aboard.',
          body: `<p>Your <strong>${escapeHtmlSafe(label)}</strong> is officially in production. What you saw in the demo becomes the real thing, customized to ${business || 'your business'}.</p><p><strong>1.</strong> Tell us about your business with the form below: your logo, your photos, your hours, the details only you know.</p><p><strong>2.</strong> We build it for real, then you get <strong>two free edits</strong>. You look at it, tell us what to change, twice, before it ever goes live.</p><p><strong>3.</strong> Within 7 days it is live. Month to month, cancel anytime, never a surprise bill.</p>${provisioned ? `<p>Everything from here happens in <strong>your portal</strong>: your progress, your edits, your files, and a direct line to me. No password to remember, just enter this email address at the door.</p>` : ''}`,
          cta: { label: 'Start with your details', url: intakeUrl },
          ...(provisioned ? { secondary: { label: 'Open my portal', url: `${SITE.url}/portal/login` } } : {}),
          signature: 'Sarah',
        }),
      });
    } catch (err) {
      console.error('demo-order welcome email failed', err);
    }
  }
}

/**
 * A MUSTARD PICTURES order landed. One-time tiers insert the order here
 * (subscription cycles are recorded by invoice.paid); Sarah gets the full
 * production brief (the buyer's Screen Test storyboard), the buyer gets the
 * "you're in production" welcome.
 */
async function handlePicturesPurchase(
  session: Stripe.Checkout.Session,
  slug: string,
  email: string,
  name: string | null
) {
  const tier = getPicturesTier(slug);
  // Raw for plain-text contexts (email subject, CRM notes); escaped for HTML bodies.
  const businessRaw = (session.metadata?.business || '').trim();
  const business = escapeHtmlSafe(businessRaw);
  const runId = session.metadata?.run_id || '';
  const firstName = name?.split(' ')[0];
  const isSub = tier?.mode === 'subscription';

  const supabase = getSupabase();
  if (supabase && !isSub) {
    const { error } = await supabase.from('orders').insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      product_slug: slug,
      product_name: `MUSTARD PICTURES ${tier?.name ?? slug}`,
      item_type: 'program',
      price_paid_cents: session.amount_total ?? (tier ? tier.priceUsd * 100 : 0),
      currency: session.currency ?? 'usd',
      email,
      name: name ?? null,
      status: 'paid',
    });
    if (error) console.error('pictures order insert failed', error.message);
  }

  try {
    await insertLead({
      type: 'contact',
      email,
      name: name ?? null,
      source: 'pictures-buyer',
      status: 'new',
      notes: `[bought:${slug}]${businessRaw ? ` business: ${businessRaw}` : ''} PRODUCE (run ${runId || 'no screen test'})`,
    });
  } catch (err) {
    console.error('pictures lead insert failed', err);
  }

  // The production brief: pull their Screen Test so Sarah can start rolling.
  let brief = 'No Screen Test on file (bought cold). Reply to the buyer for intake, then run the studio pipeline.';
  if (runId && supabase) {
    const run = await getPicturesRun(supabase, runId);
    if (run) {
      brief = `<p><strong>Their story:</strong> ${escapeHtmlSafe(run.profile.story)}</p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtmlSafe(run.storyboard)}</pre>${run.frameUrl ? `<p>Approved hero frame: <a href="${run.frameUrl}">frame</a></p>` : '<p>No hero frame yet (darkroom). Generate during production.</p>'}`;
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = resendClient();

  try {
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `PRODUCE ${tier?.name ?? 'PICTURES'}: ${businessRaw || email}`,
      html: clientEmail({
        preheader: 'A commercial was greenlit. Pipeline runbook: ~/launch-studio.',
        eyebrow: 'MUSTARD PICTURES ORDER',
        greeting: 'Lights. Camera.',
        body: `<p><strong>${escapeHtmlSafe(name ?? email)}</strong> greenlit <strong>${tier?.name ?? slug}</strong>${business ? ` for <strong>${business}</strong>` : ''} ($${tier?.priceUsd ?? '?'}${isSub ? '/mo' : ''}).</p><p>Email: ${escapeHtmlSafe(email)}. Stripe session: ${session.id}.</p><p>Promise: ${slug === 'pictures-premiere' ? PICTURES.deliveryPromisePremiere : PICTURES.deliveryPromiseSpot}. Pipeline: clone ~/launch-studio/projects/sidekick-commercial, swap the shots for their storyboard below.</p>${brief}`,
        signature: 'The Studio',
      }),
    });
  } catch (err) {
    console.error('pictures produce email failed', err);
  }

  try {
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName ? `${firstName}, ` : ''}your commercial is in production`,
      html: clientEmail({
        preheader: 'Greenlit. Here is what happens next.',
        eyebrow: `MUSTARD PICTURES ${tier?.name ?? ''}`.trim(),
        greeting: firstName ? `${firstName}, you're in production.` : "You're in production.",
        body: `<p>Your commercial${business ? ` for <strong>${business}</strong>` : ''} is officially greenlit. Here is how it goes:</p><p><strong>1.</strong> Mr. Mustard shoots from your approved treatment${runId ? '' : ' (I will email you a short intake first since you bought without a Screen Test)'}.</p><p><strong>2.</strong> I personally review every frame before it ships. Nothing leaves the studio that I would not run for my own business.</p><p><strong>3.</strong> ${isSub ? 'Your first spot lands within 2 business days, then a fresh one every month.' : `Delivery ${slug === 'pictures-premiere' ? PICTURES.deliveryPromisePremiere : PICTURES.deliveryPromiseSpot} to this email: the cuts, the poster frame, and everything ready to upload.`}</p><p>The files are yours forever, full commercial rights. Questions or a detail you want in the film? Just reply, it reaches me directly.</p>`,
        cta: { label: 'Reply with any must-have details', url: 'mailto:sarah@modernmustardseed.com' },
        signature: 'Sarah',
      }),
    });
  } catch (err) {
    console.error('pictures welcome email failed', err);
  }
}

/**
 * A MUSTARD PRESS order landed. THE PIECE fulfills INSTANTLY: the clean PDF
 * is generated here and attached to the buyer's email (the success page also
 * serves it via session_id). KIT and HAND PRESS notify Sarah to produce, and
 * HAND PRESS consumes one of the five weekly slots.
 */
async function handlePressPurchase(
  session: Stripe.Checkout.Session,
  slug: string,
  email: string,
  name: string | null
) {
  const tier = getPressTier(slug);
  const businessRaw = (session.metadata?.business || '').trim();
  const business = escapeHtmlSafe(businessRaw);
  const runId = session.metadata?.run_id || '';
  const firstName = name?.split(' ')[0];

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('orders').insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      product_slug: slug,
      product_name: `MUSTARD PRESS ${tier?.name ?? slug}`,
      item_type: 'program',
      price_paid_cents: session.amount_total ?? (tier ? tier.priceUsd * 100 : 0),
      currency: session.currency ?? 'usd',
      email,
      name: name ?? null,
      status: 'paid',
    });
    if (error) console.error('press order insert failed', error.message);
  }

  try {
    await insertLead({
      type: 'contact',
      email,
      name: name ?? null,
      source: 'press-buyer',
      status: 'new',
      notes: `[bought:${slug}]${businessRaw ? ` business: ${businessRaw}` : ''}${slug === 'press-piece' ? ' fulfilled instantly' : ' PRODUCE'} (run ${runId || 'none'})`,
    });
  } catch (err) {
    console.error('press lead insert failed', err);
  }

  if (slug === 'press-handpress' && supabase) {
    const slot = await consumeHandPressSlot(supabase, PRESS.weeklyHandPressSlots);
    if (slot === 'sold_out') {
      // Paid after the week filled (checkout race). Sarah refunds by hand.
      try {
        const alertKey = process.env.RESEND_API_KEY;
        if (alertKey) {
          await resendClient().emails.send({
            from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
            to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
            subject: `HAND PRESS OVERSOLD: ${businessRaw || email}`,
            html: clientEmail({
              preheader: 'A sixth Hand Press slot was paid this week.',
              eyebrow: 'MUSTARD PRESS OVERSOLD',
              greeting: 'The week filled mid-checkout.',
              body: `<p><strong>${escapeHtmlSafe(name ?? email)}</strong> paid for THE HAND PRESS after the five weekly slots were claimed (Stripe session ${session.id}).</p><p>Either honor it as a sixth (your call) or refund from the Stripe dashboard and offer next week's first slot.</p>`,
              signature: 'The Press',
            }),
          });
        }
      } catch (err) {
        console.error('press oversold alert failed', err);
      }
    } else if (slot !== null) {
      console.log('press hand-press slot consumed:', slot, 'of', PRESS.weeklyHandPressSlots);
    }
  }

  const run = runId && supabase ? await getPressRun(supabase, runId) : null;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = resendClient();

  // Generate the PIECE's clean PDF FIRST so both emails tell the truth about
  // it. A render failure must never eat the paying customer's receipt.
  let attachments: { filename: string; content: string }[] | undefined;
  if (slug === 'press-piece' && run) {
    try {
      const bytes = await renderPressPdf(run.profile, run.catalog, { watermark: false });
      const fileSlug = run.profile.business.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'piece';
      attachments = [{ filename: `${fileSlug}-print-ready.pdf`, content: Buffer.from(bytes).toString('base64') }];
    } catch (err) {
      console.error('press clean pdf render failed (receipt still sends)', err);
    }
  }
  const attached = Boolean(attachments);

  // Sarah: FYI for PIECE (instant), PRODUCE brief for KIT / HAND PRESS.
  try {
    const produce = slug !== 'press-piece';
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `${produce ? 'PRODUCE' : 'SOLD'} ${tier?.name ?? 'PRESS'}: ${cleanHeader(businessRaw) || email}`,
      html: clientEmail({
        preheader: produce ? 'A Press order needs your hands.' : 'A Piece sold and fulfilled itself.',
        eyebrow: 'MUSTARD PRESS ORDER',
        greeting: produce ? 'Ink up.' : 'The press paid for itself again.',
        body: `<p><strong>${escapeHtmlSafe(name ?? email)}</strong> bought <strong>${tier?.name ?? slug}</strong>${business ? ` for <strong>${business}</strong>` : ''} ($${tier?.priceUsd ?? '?'}).</p><p>Email: ${escapeHtmlSafe(email)}. Stripe session: ${session.id}.</p>${
          produce
            ? `<p>${slug === 'press-handpress' ? 'HAND PRESS: email them within one business day to book the working session. One weekly slot consumed.' : 'KIT: assemble the matching set within 2 business days.'}</p>${run ? `<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px">${escapeHtmlSafe(JSON.stringify(run.catalog, null, 1).slice(0, 2000))}</pre>` : '<p>No run on file; start from their reply.</p>'}`
            : attached
              ? '<p>Clean PDF generated and attached to their receipt email automatically. Nothing to do (that is the point).</p>'
              : '<p>HEADS UP: the clean PDF failed to render for the receipt email. Their re-download link still works if the run is intact; check the logs and send the file by hand if they reply.</p>'
        }`,
        signature: 'The Press',
      }),
    });
  } catch (err) {
    console.error('press produce email failed', err);
  }

  // Buyer receipt. Always sends; the attachment rides along when it exists.
  try {
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName ? `${cleanHeader(firstName)}, ` : ''}${slug === 'press-piece' ? (attached ? 'your print-ready file is attached' : 'your print-ready file is ready to download') : 'your press order is confirmed'}`,
      html: clientEmail({
        preheader: slug === 'press-piece' ? 'The watermark is lifted. Print it anywhere.' : 'Here is what happens next.',
        eyebrow: `MUSTARD PRESS ${tier?.name ?? ''}`.trim(),
        greeting: firstName ? `${firstName}, hot off the press.` : 'Hot off the press.',
        body:
          slug === 'press-piece'
            ? `<p>Your clean, print-ready file${business ? ` for <strong>${business}</strong>` : ''} is ${attached ? 'attached, and you can also re-download it' : 'ready at the button below, yours to download'} anytime. Full commercial rights, yours forever.</p><p>Print it at any local shop, on the office printer, or upload it to an online printer. If anything looks off, reply and Sarah will make it right.</p>`
            : slug === 'press-kit'
              ? `<p>Your KIT${business ? ` for <strong>${business}</strong>` : ''} is on the bench: the piece plus a matching flyer, business card, and window piece, assembled by hand and delivered within 2 business days. One revision pass is included; reply with any must-haves.</p>`
              : `<p>You claimed one of this week's five Hand Press slots${business ? ` for <strong>${business}</strong>` : ''}. Sarah will email you within one business day to book the working session (your offer, your prices, what to feature, what to charge more for), then set two concept directions before the final files.</p>`,
        cta: slug === 'press-piece' && runId
          ? { label: attached ? 'Re-download the clean file' : 'Download the clean file', url: `https://modernmustardseed.com/api/press/pdf?session_id=${encodeURIComponent(session.id)}` }
          : { label: 'Reply with any must-have details', url: 'mailto:sarah@modernmustardseed.com' },
        signature: 'Sarah',
      }),
      ...(attachments ? { attachments } : {}),
    });
  } catch (err) {
    console.error('press buyer email failed', err);
  }
}

/** Email subject headers must never carry newlines or control characters. */
function cleanHeader(s: string): string {
  return s.replace(/[\r\n\t\x00-\x1f\x7f]+/g, ' ').trim();
}

/**
 * A GEO DESK order landed. Fix Pack / Full Desk generate the pack right here
 * (the pack page also lazily regenerates, so a failure here never strands the
 * buyer). Full Desk and the Watch subs create monitoring rows for the daily
 * cron. Installed gets a PRODUCE email to Sarah.
 */
async function handleGeoPurchase(
  session: Stripe.Checkout.Session,
  slug: string,
  email: string,
  name: string | null
) {
  const tier = getGeoTier(slug);
  const url = (session.metadata?.url || '').trim();
  const firstName = name?.split(' ')[0];
  const isSub = tier?.mode === 'subscription';
  const supabase = getSupabase();

  // Idempotency: Stripe retries this event; only the first attempt acts.
  if (supabase) {
    const once = await claimGeoWebhook(supabase, session.id);
    if (once === 'taken') return;
  }

  if (supabase && !isSub) {
    const { error } = await supabase.from('orders').insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      product_slug: slug,
      product_name: `GEO DESK ${tier?.name ?? slug}`,
      item_type: 'program',
      price_paid_cents: session.amount_total ?? (tier ? tier.priceUsd * 100 : 0),
      currency: session.currency ?? 'usd',
      email,
      name: name ?? null,
      status: 'paid',
    });
    if (error) console.error('geo order insert failed', error.message);
  }

  try {
    await insertLead({
      type: 'contact',
      email,
      name: name ?? null,
      source: 'geo-buyer',
      status: 'new',
      notes: `[bought:${slug}] url: ${url}${slug === 'geo-installed' ? ' INSTALL within 1 business day contact' : ''}`,
    });
  } catch (err) {
    console.error('geo lead insert failed', err);
  }

  // Pack generation deliberately does NOT happen here: Stripe fails webhook
  // responses slower than ~20s, and the pipeline takes minutes. The pack page
  // triggers /api/geo/generate (300s budget, idempotent) on first open.

  // Monitoring rows: Full Desk gets 100 days (3 monthly re-grades fit with
  // margin); Watch subs run until canceled.
  if (supabase && url) {
    const inThirty = new Date(Date.now() + 30 * 86400_000).toISOString();
    if (slug === 'geo-fulldesk') {
      await saveGeoWatch(supabase, session.id, {
        urls: [url],
        email,
        kind: 'fulldesk',
        nextAt: inThirty,
        expiresAt: new Date(Date.now() + 100 * 86400_000).toISOString(),
        lastScores: {},
        createdAt: new Date().toISOString(),
      });
    }
    if (isSub && typeof session.subscription === 'string') {
      await saveGeoWatch(supabase, session.subscription, {
        urls: [url],
        email,
        kind: slug === 'geo-watchpro' ? 'watchpro' : 'watch',
        nextAt: new Date().toISOString(), // baseline report on the next cron pass
        expiresAt: null,
        lastScores: {},
        createdAt: new Date().toISOString(),
      });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = resendClient();

  try {
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `${slug === 'geo-installed' ? 'INSTALL' : 'SOLD'} GEO ${tier?.name ?? slug}: ${url || email}`,
      html: clientEmail({
        preheader: slug === 'geo-installed' ? 'A white-glove install booked.' : 'The desk sold a pack.',
        eyebrow: 'GEO DESK ORDER',
        greeting: slug === 'geo-installed' ? 'White glove time.' : 'The examiner collected.',
        body: `<p><strong>${escapeHtmlSafe(name ?? email)}</strong> bought <strong>${tier?.name ?? slug}</strong> for <strong>${escapeHtmlSafe(url)}</strong> ($${tier?.priceUsd ?? '?'}${isSub ? '/mo' : ''}).</p><p>Email: ${escapeHtmlSafe(email)}. Stripe session: ${session.id}.</p>${
          slug === 'geo-installed'
            ? '<p>Contact within one business day to schedule the install. Their pack is on the pack page under this session id.</p>'
            : isSub
              ? '<p>Monitoring row created; the daily cron sends their baseline within 24h. WATCH PRO: reply to their welcome asking for their other sites, then add urls to the geo:watch row.</p>'
              : '<p>Nothing to do; the pack self-delivered.</p>'
        }`,
        signature: 'The Desk',
      }),
    });
  } catch (err) {
    console.error('geo sarah email failed', err);
  }

  try {
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `${firstName ? `${firstName}, ` : ''}${isSub ? 'the Watch is on your site' : slug === 'geo-installed' ? 'your install is booked' : 'your GEO Fix Pack is ready'}`,
      html: clientEmail({
        preheader: isSub ? 'First re-grade lands within a day.' : 'Open your pack; everything is ready to paste.',
        eyebrow: `GEO DESK ${tier?.name ?? ''}`.trim(),
        greeting: firstName ? `${firstName}, consider it graded.` : 'Consider it graded.',
        body: isSub
          ? `<p>THE WATCH is now on <strong>${escapeHtmlSafe(url)}</strong>. Your baseline graded report lands within a day, then a fresh re-grade every month: score deltas, what moved, what to fix, and drift alerts if anything breaks.</p>${slug === 'geo-watchpro' ? '<p>WATCH PRO covers up to three sites: reply with the other two and they join the watch.</p>' : ''}<p>Month to month, cancel anytime. We report honestly; nobody can promise what AI engines will say, and we never will.</p>`
          : slug === 'geo-installed'
            ? `<p>Your white-glove install for <strong>${escapeHtmlSafe(url)}</strong> is booked. I will email you within one business day to schedule it; after the install you get a before/after graded report with every signal verified live.</p>`
            : `<p>Your Fix Pack for <strong>${escapeHtmlSafe(url)}</strong> is ready to open: llms.txt, ai.txt, structured data, meta rewrites, and your citable FAQ block, each with a copy button and an install guide matched to your platform. It finishes writing itself on first open (about a minute; it reads your live site).</p><p>You have 3 re-scans included: install, re-scan, and watch the grade climb.</p>`,
        cta: isSub || slug === 'geo-installed'
          ? { label: 'Reply with questions anytime', url: 'mailto:sarah@modernmustardseed.com' }
          : { label: 'Open your Fix Pack', url: `https://modernmustardseed.com/geo/pack?session_id=${encodeURIComponent(session.id)}` },
        signature: 'Sarah',
      }),
    });
  } catch (err) {
    console.error('geo buyer email failed', err);
  }
}

/** A Season Pass ended: stop monthly production. */
async function handlePicturesSubscriptionDeleted(sub: Stripe.Subscription) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `SEASON PASS CANCELED: ${sub.metadata?.business || sub.id}`,
      html: clientEmail({
        preheader: 'A Pictures Season Pass ended.',
        eyebrow: 'MUSTARD PICTURES OFFBOARD',
        greeting: 'A season wrapped.',
        body: `<p>Subscription ${sub.id}${sub.metadata?.business ? ` (business: <strong>${escapeHtmlSafe(sub.metadata.business)}</strong>)` : ''} was canceled. No more monthly spots; send the wrap-party goodbye note.</p>`,
        signature: 'The Studio',
      }),
    });
  } catch (err) {
    console.error('pictures offboard email failed', err);
  }
}

/** A Sidekick subscription ended: Sarah decommissions the line by hand. */
async function handleSidekickSubscriptionDeleted(sub: Stripe.Subscription) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
      subject: `SIDEKICK CANCELED: ${sub.metadata?.business || sub.id}`,
      html: clientEmail({
        preheader: 'A Sidekick subscription ended.',
        eyebrow: 'SIDEKICK OFFBOARD',
        greeting: 'A Sidekick clocked out.',
        body: `<p>Subscription ${sub.id}${sub.metadata?.business ? ` (business: <strong>${escapeHtmlSafe(sub.metadata.business)}</strong>)` : ''} was canceled.</p><p>Decommission the line: unassign or park the Vapi number, archive the assistant, and send the goodbye note.</p>`,
        signature: 'The Forge',
      }),
    });
  } catch (err) {
    console.error('sidekick offboard email failed', err);
  }
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = STRIPE_WEBHOOK_SECRET();
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid';
    console.error('Webhook signature failed:', msg);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  // Refund: claw back any affiliate commission tied to this charge's session.
  if (event.type === 'charge.refunded') {
    await handleRefundClawback(stripe, event.data.object as Stripe.Charge);
    return NextResponse.json({ received: true, kind: 'refund' });
  }

  // Recurring subscription revenue, per paid invoice.
  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
    await handleInvoicePaid(event.data.object as Stripe.Invoice);
    return NextResponse.json({ received: true, kind: 'invoice' });
  }
  if (event.type === 'invoice.payment_failed') {
    await handleInvoiceFailed(event.data.object as Stripe.Invoice);
    return NextResponse.json({ received: true, kind: 'invoice_failed' });
  }
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    if (sub.metadata?.kind === 'mustard-mode') {
      await handleMustardSubscriptionDeleted(stripe, sub);
      return NextResponse.json({ received: true, kind: 'mustard_subscription_canceled' });
    }
    if (sub.metadata?.kind === 'mustard-launch') {
      await handleLaunchSubscriptionDeleted(stripe, sub);
      return NextResponse.json({ received: true, kind: 'launch_subscription_canceled' });
    }
    if (sub.metadata?.kind === 'sidekick') {
      await handleSidekickSubscriptionDeleted(sub);
      return NextResponse.json({ received: true, kind: 'sidekick_subscription_canceled' });
    }
    if (sub.metadata?.kind === 'pictures') {
      await handlePicturesSubscriptionDeleted(sub);
      return NextResponse.json({ received: true, kind: 'pictures_subscription_canceled' });
    }
    if (sub.metadata?.kind === 'geo') {
      const db = getSupabase();
      if (db) await deleteGeoWatch(db, sub.id);
      return NextResponse.json({ received: true, kind: 'geo_subscription_canceled' });
    }
    if (sub.metadata?.kind === 'demo-order') {
      const db = getSupabase();
      if (db) {
        await db
          .from('demo_orders')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
      }
      return NextResponse.json({ received: true, kind: 'demo_order_canceled' });
    }
    if (sub.metadata?.kind === 'care-plan') {
      await handleCarePlanDeleted(sub);
      return NextResponse.json({ received: true, kind: 'care_plan_canceled' });
    }
    await handleSubscriptionDeleted(sub);
    return NextResponse.json({ received: true, kind: 'subscription_canceled' });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const slug = session.metadata?.slug;
  const itemName = session.metadata?.item_name;
  const email = session.customer_details?.email || session.customer_email;
  const name = session.customer_details?.name;

  // ── Proposal deposit (admin money loop) ──
  if (session.metadata?.kind === 'deposit') {
    await handleDepositPaid(session, email ?? null, name ?? null);
    return NextResponse.json({ received: true, kind: 'deposit' });
  }

  // ── Proposal balance (final 50%) ──
  if (session.metadata?.kind === 'balance') {
    await handleBalancePaid(session, email ?? null, name ?? null);
    return NextResponse.json({ received: true, kind: 'balance' });
  }

  // ── Monthly subscription started ──
  if (session.metadata?.kind === 'subscription') {
    await handleSubscriptionStarted(session);
    return NextResponse.json({ received: true, kind: 'subscription' });
  }

  // ── DEMO ORDER: bought straight off a forged demo (no slug; id in metadata) ──
  if (session.metadata?.kind === 'demo-order') {
    await handleDemoOrderPaid(session, email ?? null, name ?? null);
    return NextResponse.json({ received: true, kind: 'demo-order' });
  }

  // ── SWITCHBOARD franchise deal (subscription, per-location, no slug) ──
  if (session.metadata?.kind === 'switchboard') {
    if (email) await handleSwitchboardPurchase(session, email, name ?? null);
    return NextResponse.json({ received: true, kind: 'switchboard' });
  }

  // ── CARE PLAN ($97/mo, portal subscription, no slug) ──
  if (session.metadata?.kind === 'care-plan') {
    await handleCarePlanStarted(session, email ?? null, name ?? null);
    return NextResponse.json({ received: true, kind: 'care-plan' });
  }

  if (!slug || !email) {
    console.error('Webhook missing slug or email:', session.id);
    return NextResponse.json({ error: 'missing_fields' }, { status: 200 });
  }

  // ── MUSTARD MODE level purchase (Player, Builder, Cabinet) ──
  if (session.metadata?.kind === 'mustard-mode') {
    await handleMustardPurchase(req, session, slug, email, name ?? null, itemName ?? slug);
    return NextResponse.json({ received: true, kind: 'mustard-mode' });
  }

  // ── MUSTARD LAUNCH purchase (the Launch Kit, or the Launch Room sub) ──
  if (session.metadata?.kind === 'mustard-launch') {
    await handleLaunchPurchase(req, session, slug, email, name ?? null, itemName ?? slug);
    return NextResponse.json({ received: true, kind: 'mustard-launch' });
  }

  // ── SIDEKICK subscription started (setup fee rides the first invoice) ──
  if (session.metadata?.kind === 'sidekick') {
    await handleSidekickPurchase(session, slug, email, name ?? null);
    return NextResponse.json({ received: true, kind: 'sidekick' });
  }

  // ── MUSTARD PICTURES order (SPOT, PREMIERE, or SEASON PASS start) ──
  if (session.metadata?.kind === 'pictures') {
    await handlePicturesPurchase(session, slug, email, name ?? null);
    return NextResponse.json({ received: true, kind: 'pictures' });
  }

  // ── MUSTARD PRESS order (PIECE instant, KIT, HAND PRESS) ──
  if (session.metadata?.kind === 'press') {
    await handlePressPurchase(session, slug, email, name ?? null);
    return NextResponse.json({ received: true, kind: 'press' });
  }

  // ── MUSTARD HATCHERY hatch ($497 one-time, evergreen) ──
  if (session.metadata?.kind === 'hatchery') {
    await handleHatcheryPurchase(session, slug, email, name ?? null);
    return NextResponse.json({ received: true, kind: 'hatchery' });
  }

  // ── Self-serve website edit ($29 one-time, after the two free ones) ──
  if (session.metadata?.kind === 'paid-edit') {
    await handlePaidEditPurchase(session);
    return NextResponse.json({ received: true, kind: 'paid-edit' });
  }

  // ── GEO DESK order (fix pack, full desk, watch subs, installed) ──
  if (session.metadata?.kind === 'geo') {
    await handleGeoPurchase(session, slug, email, name ?? null);
    return NextResponse.json({ received: true, kind: 'geo' });
  }

  // ── Flagship $497 program purchase (The Terminal, Idea to Spec, bundle) ──
  if (session.metadata?.kind === 'program') {
    await handleProgramPurchase(req, session, slug, email, name ?? null, itemName ?? slug);
    return NextResponse.json({ received: true, kind: 'program' });
  }

  const product = getProductBySlug(slug);
  const bundle = getBundleBySlug(slug);
  const item = product ?? bundle;
  if (!item) {
    console.error('Webhook unknown slug:', slug);
    return NextResponse.json({ error: 'unknown_item' }, { status: 200 });
  }

  // Affiliate attribution: 50% product commission on a referred store sale
  // (playbooks + bundles). Idempotent by session id, blocks self-referral.
  const storeRef = session.metadata?.ref;
  if (storeRef) {
    await recordProductCommission({
      affiliateCode: storeRef,
      orderEmail: email,
      productSlug: slug,
      amountCents: session.amount_total ?? item.priceUsd * 100,
      stripeSessionId: session.id,
    });
  }

  // Resolve all PDFs to deliver (single product = 1, bundle = N)
  const pdfFiles: { name: string; fileName: string }[] = product
    ? [{ name: product.name, fileName: product.pdfFileName }]
    : (bundle?.productSlugs || [])
        .map((s) => ALL_PRODUCTS.find((p) => p.slug === s))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({ name: p.name, fileName: p.pdfFileName }));

  // Mint signed URLs in parallel
  const downloads = await Promise.all(
    pdfFiles.map(async ({ name: n, fileName }) => ({
      name: n,
      url: (await getSignedDownloadUrl(fileName)) || '',
      fileName,
    }))
  );

  // 1. Insert order
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('orders').insert({
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        product_slug: slug,
        product_name: itemName ?? item.name,
        item_type: product ? 'product' : 'bundle',
        price_paid_cents: session.amount_total ?? item.priceUsd * 100,
        currency: session.currency ?? 'usd',
        email,
        name: name ?? null,
        status: 'paid',
      });
    } catch (err) {
      console.error('Order insert failed:', err);
    }

    // 2. Insert / update buyer in leads table
    try {
      const { data: existing } = await supabase
        .from('leads')
        .select('id, notes, source')
        .eq('email', email)
        .maybeSingle();

      const buyerTag = `[bought:${slug}]`;
      if (existing) {
        const notes = (existing.notes as string | null) ?? '';
        if (!notes.includes(buyerTag)) {
          await supabase
            .from('leads')
            .update({ notes: `${notes}${notes ? ' ' : ''}${buyerTag}` })
            .eq('id', existing.id);
        }
      } else {
        await supabase.from('leads').insert({
          type: 'contact',
          email,
          name: name ?? null,
          source: 'store-buyer',
          status: 'new',
          notes: buyerTag,
        });
      }
    } catch (err) {
      console.error('Lead upsert failed:', err);
    }
  }

  // 3. Send delivery email + Sarah notification
  if (process.env.RESEND_API_KEY) {
    const resend = resendClient();
    const firstName = name?.split(' ')[0] || 'there';
    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `Your ${item.name} is ready.`,
        html: storeOrderConfirmationEmail({
          firstName,
          itemName: item.name,
          downloads,
          priceUsd: item.priceUsd,
        }),
      });
      await resend.emails.send({
        from: 'Modern Mustard Seed Store <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: `New store sale. ${item.name}. $${item.priceUsd}.`,
        html: storeOrderNotificationEmail({
          name: name ?? 'unknown',
          email,
          itemName: item.name,
          priceUsd: item.priceUsd,
          sessionId: session.id,
        }),
      });
    } catch (err) {
      console.error('Resend send failed:', err);
    }
  }

  return NextResponse.json({ received: true });
}
