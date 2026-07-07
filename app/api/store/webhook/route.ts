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
import { Resend } from 'resend';
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { getProductBySlug, getBundleBySlug, products as ALL_PRODUCTS } from '@/data/products';
import { programBundle } from '@/data/programs';
import { getSignedDownloadUrl } from '@/lib/storage';
import { storeOrderConfirmationEmail, storeOrderNotificationEmail, programAccessEmail, leadNotification, subscriptionPaymentFailedEmail, clientEmail } from '@/lib/email';
import { getSidekickTier } from '@/data/sidekick';
import { SITE } from '@/lib/seo';
import { grantEntitlement, revokeEntitlement, PROGRAM_ASSETS, isProgramSlug, isMustardSlug, type ProgramSlug } from '@/lib/entitlements';
import { getMustardLevel } from '@/data/mustard-mode/offer';
import { createMagicToken } from '@/lib/client-auth';
import { insertLead } from '@/lib/supabase';
import { recordProductCommission } from '@/lib/affiliate';
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
    const resend = new Resend(apiKey);
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
      to: 'sarah@modernmustardseed.com',
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
    const resend = new Resend(apiKey);
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
      to: 'sarah@modernmustardseed.com',
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
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
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
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
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
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
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
  const proposalId = (invoice as { subscription_details?: { metadata?: Record<string, string> } }).subscription_details?.metadata?.proposal_id || null;

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
        const resend = new Resend(process.env.RESEND_API_KEY);
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
          to: 'sarah@modernmustardseed.com',
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
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'Quick payment hiccup on your plan',
        html: subscriptionPaymentFailedEmail({ toName: (proposal?.client_name as string) || undefined, label, manageUrl: `${SITE.url}/portal` }),
      });
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
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
  const business = escapeHtmlSafe(session.metadata?.business || '');
  const firstName = name?.split(' ')[0];
  const safeName = name ? escapeHtmlSafe(name) : null;

  try {
    await insertLead({
      type: 'contact',
      email,
      name: name ?? null,
      source: 'sidekick-buyer',
      status: 'new',
      notes: `[bought:${slug}]${business ? ` business: ${business}` : ''} PROVISION within 7 days`,
    });
  } catch (err) {
    console.error('sidekick lead insert failed', err);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      subject: `PROVISION ${tier?.name ?? 'SIDEKICK'}: ${business || email}`,
      html: clientEmail({
        preheader: 'A Sidekick was kept. Install within 7 days.',
        eyebrow: 'SIDEKICK ORDER',
        greeting: 'He got hired.',
        body: `<p><strong>${safeName ?? escapeHtmlSafe(email)}</strong> just kept their Sidekick${business ? ` for <strong>${business}</strong>` : ''}.</p><p>Plan: ${tier?.name ?? slug} (${tier ? `$${tier.setupUsd} setup + $${tier.monthlyUsd}/mo, ${tier.minutesCap} min cap` : slug}).</p><p>Email: ${escapeHtmlSafe(email)}. Stripe session: ${session.id}.</p><p>Promise on the page: live within 7 days, installed by hand. Their forge run and transcript are in Vapi under metadata kind=sidekick-demo.</p>`,
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

/** A Sidekick subscription ended: Sarah decommissions the line by hand. */
async function handleSidekickSubscriptionDeleted(sub: Stripe.Subscription) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
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
    if (sub.metadata?.kind === 'sidekick') {
      await handleSidekickSubscriptionDeleted(sub);
      return NextResponse.json({ received: true, kind: 'sidekick_subscription_canceled' });
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

  if (!slug || !email) {
    console.error('Webhook missing slug or email:', session.id);
    return NextResponse.json({ error: 'missing_fields' }, { status: 200 });
  }

  // ── MUSTARD MODE level purchase (Player, Builder, Cabinet) ──
  if (session.metadata?.kind === 'mustard-mode') {
    await handleMustardPurchase(req, session, slug, email, name ?? null, itemName ?? slug);
    return NextResponse.json({ received: true, kind: 'mustard-mode' });
  }

  // ── SIDEKICK subscription started (setup fee rides the first invoice) ──
  if (session.metadata?.kind === 'sidekick') {
    await handleSidekickPurchase(session, slug, email, name ?? null);
    return NextResponse.json({ received: true, kind: 'sidekick' });
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
    const resend = new Resend(process.env.RESEND_API_KEY);
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
        to: 'sarah@modernmustardseed.com',
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
