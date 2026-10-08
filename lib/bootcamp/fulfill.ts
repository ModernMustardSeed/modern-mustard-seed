import type Stripe from 'stripe';
import { BOOTCAMP, OPERATOR, getBootcampTier, usd, type BootcampTierSlug } from '@/data/bootcamp';
import { getSupabase, insertLead } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';
import { operatorWelcome, ticketWelcome } from '@/lib/bootcamp/emails';
import {
  firstNameOf,
  getHostBySlug,
  insertOrder,
  normEmail,
  orderExists,
  recordEvent,
  upsertRegistration,
  type RegistrationTier,
} from '@/lib/bootcamp/store';

/**
 * A PAID CHECKOUT BECOMES A SEAT.
 *
 * Called from the store webhook for metadata.kind 'bootcamp' (a ticket) and
 * 'operator' (a cohort seat). It never throws: the webhook has already been
 * told the money moved, and a 500 here would make Stripe retry a charge that
 * is already recorded. Each step logs its own failure and the next one runs,
 * so a dead database still gets the buyer their welcome email.
 *
 * Idempotent on the Stripe session id through the shared orders ledger, which
 * carries a unique index on it: a replayed webhook finds the row and leaves.
 *
 * Money is read from amount_subtotal, the price before tax. Automatic tax is
 * on, so amount_total can carry a few dollars of sales tax that is neither
 * revenue nor the host's to earn.
 */

const FROM_ROOT = 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>';
const REPLY_TO = 'sarah@modernmustardseed.com';

function resolveTier(session: Stripe.Checkout.Session): RegistrationTier | null {
  const kind = session.metadata?.kind;
  if (kind === 'operator') return 'operator';
  if (kind === 'bootcamp') {
    const slug = session.metadata?.slug ?? '';
    return getBootcampTier(slug) ? (slug as BootcampTierSlug) : null;
  }
  return null;
}

function customField(session: Stripe.Checkout.Session, key: string): string | null {
  const f = session.custom_fields?.find((c) => c.key === key);
  const v = f?.text?.value?.trim();
  return v ? v.slice(0, 160) : null;
}

export async function fulfillBootcampCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const tier = resolveTier(session);
  if (!tier) {
    console.error('bootcamp fulfill: unknown tier', session.id, session.metadata);
    return;
  }

  const rawEmail = session.customer_details?.email || session.customer_email || '';
  const email = normEmail(rawEmail);
  if (!email.includes('@')) {
    console.error('bootcamp fulfill: no buyer email on session', session.id);
    return;
  }

  const name = session.customer_details?.name?.trim() || null;
  const firstName = firstNameOf(name);
  const business = customField(session, 'business') || session.metadata?.business?.trim() || null;
  const hostSlug = (session.metadata?.host || '').trim().slice(0, 48) || null;
  const cents = session.amount_subtotal ?? session.amount_total ?? (tier === 'operator' ? OPERATOR.priceCents : getBootcampTier(tier)?.priceCents ?? 0);
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
  const tierName = tier === 'operator' ? OPERATOR.name : getBootcampTier(tier)?.name ?? tier;
  const itemName = session.metadata?.item_name || `${BOOTCAMP.name}: ${tierName}`;

  const sb = getSupabase();

  // Ledger first. If this session is already there the whole thing already ran.
  if (sb) {
    try {
      if (await orderExists(sb, session.id)) return;
    } catch (err) {
      console.error('bootcamp fulfill: order lookup failed', err);
    }
  } else {
    console.error('bootcamp fulfill: database not configured; sending the welcome without a record');
  }

  let registrationId: string | null = null;
  if (sb) {
    try {
      const replayDays = tier === 'operator' ? null : getBootcampTier(tier)?.replayDays ?? null;
      const replayUntil = replayDays ? new Date(new Date(BOOTCAMP.dates.day3).getTime() + replayDays * 86400000).toISOString() : null;
      const { row } = await upsertRegistration(sb, {
        email,
        name,
        business,
        hostSlug,
        source: hostSlug ? 'host' : 'checkout',
        tier,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        amountCents: cents,
        replayUntil,
      });
      registrationId = row.id;
    } catch (err) {
      console.error('bootcamp fulfill: registration upsert failed', err);
    }

    try {
      await insertOrder(sb, {
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        productSlug: tier,
        productName: itemName,
        pricePaidCents: session.amount_total ?? cents,
        currency: session.currency ?? 'usd',
        email,
        name,
      });
    } catch (err) {
      // A unique violation here is the replay case racing the lookup above.
      // The order is in the ledger either way; carry on.
      console.error('bootcamp fulfill: order insert failed', err);
    }

    try {
      await recordEvent(sb, 'sale', {
        email,
        registrationId,
        hostSlug,
        detail: { tier, cents, sessionId: session.id, business },
      });
    } catch (err) {
      console.error('bootcamp fulfill: sale event failed', err);
    }

    if (hostSlug) {
      try {
        const host = await getHostBySlug(sb, hostSlug);
        const pct = tier === 'operator' ? host?.program_pct ?? 20 : host?.ticket_pct ?? 100;
        const owedCents = Math.round((cents * pct) / 100);
        await recordEvent(sb, 'host-sale', {
          email,
          registrationId,
          hostSlug,
          detail: { tier, cents, owedCents, pct, sessionId: session.id, hostKnown: Boolean(host) },
        });
      } catch (err) {
        console.error('bootcamp fulfill: host-sale event failed', err);
      }
    }
  }

  // The welcome. One-to-one, from the root address, no unsubscribe.
  try {
    const letter = tier === 'operator' ? operatorWelcome({ firstName, email }) : ticketWelcome(tier as 'ga' | 'vip' | 'platinum', { firstName, email });
    const sent = await sendViaResend({
      from: FROM_ROOT,
      to: email,
      replyTo: REPLY_TO,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
    });
    if (!sent.ok) console.error('bootcamp fulfill: welcome email failed', sent.error);
    else if (sb) {
      try {
        await recordEvent(sb, tier === 'operator' ? 'op-welcome' : 'ticket-welcome', { email, registrationId, hostSlug, detail: { id: sent.id } });
      } catch {
        /* the welcome went; the log line is the lesser thing */
      }
    }
  } catch (err) {
    console.error('bootcamp fulfill: welcome email threw', err);
  }

  // Sarah's heads-up.
  try {
    const fields = [
      { label: 'Bought', value: `${tierName} (${usd(cents)})` },
      { label: 'Tier', value: tier },
      ...(business ? [{ label: 'Business', value: business }] : []),
      ...(hostSlug ? [{ label: 'Host', value: hostSlug }] : []),
      { label: 'Stripe', value: session.id },
      { label: 'Desk', value: `${SITE.url}/admin/bootcamp`, isLink: true },
    ];
    const sent = await sendViaResend({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      replyTo: email,
      subject: `Bootcamp ${tier === 'operator' ? 'cohort seat' : 'ticket'}: ${name ?? email} bought ${tierName}`,
      html: leadNotification({
        type: 'Contact',
        name: name ?? email,
        email,
        fields,
        suggestedAction:
          tier === 'operator'
            ? 'A cohort seat. Reply within the day with a personal welcome; the receipt and calendar link already went.'
            : 'The welcome, the dates and the calendar links already went. Nothing to send unless you want to say hello.',
      }),
    });
    if (!sent.ok) console.error('bootcamp fulfill: owner note failed', sent.error);
  } catch (err) {
    console.error('bootcamp fulfill: owner note threw', err);
  }

  try {
    await insertLead({
      type: 'contact',
      email,
      name,
      business_name: business,
      source: 'bootcamp-buyer',
      status: 'new',
      notes: `[bought:${tier}] ${tierName}, ${usd(cents)}${hostSlug ? `, via host ${hostSlug}` : ''}`,
    });
  } catch (err) {
    console.error('bootcamp fulfill: lead insert failed', err);
  }
}
