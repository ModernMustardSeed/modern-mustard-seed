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
import { storeOrderConfirmationEmail, storeOrderNotificationEmail, programAccessEmail, leadNotification } from '@/lib/email';
import { grantEntitlement, PROGRAM_ASSETS, isProgramSlug, type ProgramSlug } from '@/lib/entitlements';
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
  await supabase
    .from('proposals')
    .update({ subscription_status: 'active', stripe_subscription_id: subId, subscription_started_at: new Date().toISOString() })
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
  if (event.type === 'customer.subscription.deleted') {
    await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
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
