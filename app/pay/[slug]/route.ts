/**
 * PAY WITHOUT A DEMO HUB.
 *
 * One link a person can be handed on a phone call and open on their phone:
 * https://modernmustardseed.com/pay/talking-website mints a live Stripe
 * Checkout Session and 302s straight into it. No page to load, no form to
 * fill, no built demo required.
 *
 * WHY IT EXISTS (2026-08-17, Sarah): "he needs to be able to email payment
 * links and the actual product so they can just pay for it if they want to."
 * Mr. Mustard could email a marketing page and he could email a demo hub, but
 * a caller who said "just take my money" had nowhere to pay unless a demo had
 * already been built for them. This is that missing door.
 *
 * PRICING IS DERIVED, NEVER TYPED. Every amount comes from
 * quoteDemoOrder() over lib/demo-order.ts, the same function the hub checkout
 * uses, so the price on this link can never drift from the price on the site or
 * the price Mr. Mustard says out loud.
 *
 * The command center is priced like anything else now: nothing is waived
 * anywhere since 2026-08-22, so /pay/command-center is its own
 * price and /pay/talking-website includes it at zero. Nothing here re-implements
 * that decision.
 *
 * Shape of the money: subscription mode, one recurring monthly line plus a
 * one-time setup line on the first invoice, exactly like the hub checkout, so a
 * direct buyer and a demo buyer land in the same billing shape and the same
 * webhook handlers.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { quoteDemoOrder, formatUsd, resolveSiteRung, type DemoProductKey } from '@/lib/demo-order';
import { SUBSCRIPTION_SLUGS, type SubscriptionProduct } from '@/data/posting';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * The spoken names map to product keys here and nowhere else. A caller says
 * "the talking website", Mr. Mustard emails /pay/talking-website, and the
 * combination is resolved on this side of the wire so a bad slug can never mint
 * a checkout for the wrong thing. Aliases are generous on purpose: the slug is
 * read aloud on a phone call and typed by a person, not by a program.
 *
 * PAGE RUNGS (2026-09-08): a slug may end in the page floor, so
 * /pay/talking-website-20 and /pay/website-50 mint the bigger site at its own
 * price. A bare slug is the entry rung, exactly what it always was. The number
 * is parsed off the end and resolved by lib/demo-order.ts, so "-30" still
 * lands on the 20-and-up rung rather than nowhere.
 */
const SLUGS: Record<string, DemoProductKey[]> = {
  'talking-website': ['voice', 'site'],
  'the-talking-website': ['voice', 'site'],
  everything: ['voice', 'site'],
  bundle: ['voice', 'site'],
  'voice-agent': ['voice'],
  voice: ['voice'],
  receptionist: ['voice'],
  website: ['site'],
  site: ['site'],
  'command-center': ['os'],
  'business-command-center': ['os'],
  os: ['os'],
  'website-and-voice': ['voice', 'site'],
  'voice-and-website': ['voice', 'site'],
};

/** "talking-website-20" splits into the product slug and the page floor. */
function splitSlug(raw: string): { base: string; pages: number | null } {
  const m = raw.match(/^(.*?)-(\d{1,3})(?:-pages?)?$/);
  if (m && SLUGS[m[1]]) return { base: m[1], pages: parseInt(m[2], 10) };
  return { base: raw, pages: null };
}

/**
 * Attribution: a partner's cookie still pays them on a link they shared.
 * A malformed cookie degrades to no ref, never to a crash on the money path.
 */
function readRef(req: Request): string {
  const cookieRef = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mms_ref=([^;]+)/);
  if (!cookieRef) return '';
  try {
    return decodeURIComponent(cookieRef[1]).trim().slice(0, 64);
  } catch {
    return cookieRef[1].replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  }
}

/**
 * `email` rides along when Mr. Mustard already has it, so the buyer does not
 * retype an address he just confirmed on the call. It only ever prefills.
 */
function readEmail(req: Request): string {
  const emailParam = new URL(req.url).searchParams.get('email') || '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParam) ? emailParam.slice(0, 200) : '';
}

/**
 * SUBSCRIPTION-ONLY PRODUCTS (2026-09-08, Daily Posting first). One recurring
 * line, no setup line, same metadata shape as every other direct pay so the
 * webhook's direct-pay handler records it without a special case. Priced from
 * data/posting.ts and nowhere else.
 */
async function subscriptionCheckout(req: Request, product: SubscriptionProduct, slug: string) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.redirect(`${SITE.url}/work-with-us?pay=unavailable`, 302);
  const ref = readRef(req);
  const email = readEmail(req);
  const metadata = {
    kind: 'direct-pay',
    item_name: product.name,
    products: product.key,
    slug,
    ...(ref ? { ref } : {}),
  };
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${product.name}: monthly`, description: product.description },
            unit_amount: product.monthlyCents,
            recurring: { interval: 'month' as const },
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE.url}/built?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/work-with-us`,
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: {
          message: `${formatUsd(product.monthlyCents)} a month, month to month, cancel anytime, no setup fee. ${product.pitch} Posting starts the week your first photos land in your portal.`,
        },
      },
    });
    if (!session.url) return NextResponse.redirect(`${SITE.url}/work-with-us?pay=unavailable`, 302);
    return NextResponse.redirect(session.url, 302);
  } catch (err) {
    console.error('subscription pay checkout failed:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${SITE.url}/work-with-us?pay=error`, 302);
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const raw = String(slug || '').toLowerCase().trim();

  // Subscription-only products first: they have no page rung and no setup line.
  const subscription = SUBSCRIPTION_SLUGS[raw];
  if (subscription) return subscriptionCheckout(req, subscription, raw);

  const { base: key, pages } = splitSlug(raw);
  const products = SLUGS[key];

  // An unknown slug sends them to the offer page rather than a 404. Somebody
  // mistyping a link Mr. Mustard read to them out loud should still land
  // somewhere that sells.
  if (!products) return NextResponse.redirect(`${SITE.url}/work-with-us`, 302);

  const rung = pages === null ? undefined : resolveSiteRung(pages);
  const quote = quoteDemoOrder(products, rung?.key);
  const stripe = getStripe();
  if (!quote || !stripe) {
    return NextResponse.redirect(`${SITE.url}/work-with-us?pay=unavailable`, 302);
  }

  const ref = readRef(req);
  const email = readEmail(req);

  const metadata = {
    kind: 'direct-pay',
    item_name: quote.label,
    products: quote.products.join(','),
    slug: key,
    ...(quote.rung ? { pages: String(quote.rung.pages) } : {}),
    ...(ref ? { ref } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${quote.label}: monthly` },
            unit_amount: quote.monthlyCents,
            recurring: { interval: 'month' as const },
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${quote.label}: one-time setup and customization` },
            unit_amount: quote.setupCents,
          },
          quantity: 1,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      success_url: `${SITE.url}/built?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/work-with-us`,
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      metadata,
      subscription_data: { metadata },
      custom_text: {
        submit: {
          message: `Month to month, cancel anytime. ${formatUsd(quote.setupCents)} one-time setup covers your customization, and we release everything within 7 days. No trials, no surprise bills.`,
        },
      },
    });
    if (!session.url) return NextResponse.redirect(`${SITE.url}/work-with-us?pay=unavailable`, 302);
    return NextResponse.redirect(session.url, 302);
  } catch (err) {
    console.error('direct pay checkout failed:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${SITE.url}/work-with-us?pay=error`, 302);
  }
}
