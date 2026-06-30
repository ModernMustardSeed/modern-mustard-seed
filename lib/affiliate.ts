import { getSupabase } from './supabase';
import { normalizeEmail } from './client-auth';
import { SITE } from './seo';
import { products } from '@/data/products';

/**
 * Affiliate engine core. 50 percent on every product sale and, as of
 * 2026-06-30, 10 percent of every build/service fee (down from 50%). A product
 * commission is created only on a cleared, server-verified payment, and an
 * affiliate can never earn on their own purchase (self-referral block). Build
 * commissions are attributed by Sarah in admin when a referred build is closed
 * and paid, and the admin can override the rate per entry to honor founding
 * partners (Polly, Chloe) who are grandfathered at 50% on builds.
 */

export const COMMISSION_PRODUCT_RATE = 0.5;
export const COMMISSION_BUILD_RATE = 0.1;

export type AffiliateStatus = 'pending' | 'approved' | 'rejected';
export type Affiliate = {
  id: string;
  email: string;
  name: string | null;
  code: string | null;
  status: AffiliateStatus;
  promote_where: string | null;
  audience: string | null;
  why: string | null;
  created_at: string;
  approved_at: string | null;
};

/** A readable, unique-enough referral code from a name or email. */
export function makeCodeSeed(nameOrEmail: string): string {
  const base = (nameOrEmail.split('@')[0] || 'partner')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8) || 'PARTNER';
  const rand = Math.abs(hashStr(nameOrEmail + base)).toString(36).toUpperCase().slice(0, 4);
  return `${base}${rand}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export async function getAffiliateByEmail(email: string): Promise<Affiliate | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data } = await client.from('affiliates').select('*').eq('email', normalizeEmail(email)).maybeSingle();
    return (data as Affiliate) ?? null;
  } catch {
    return null;
  }
}

export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  const client = getSupabase();
  if (!client || !code) return null;
  try {
    const { data } = await client.from('affiliates').select('*').eq('code', code).eq('status', 'approved').maybeSingle();
    return (data as Affiliate) ?? null;
  } catch {
    return null;
  }
}

export async function recordClick(code: string, path: string): Promise<void> {
  const client = getSupabase();
  if (!client || !code) return;
  try {
    await client.from('affiliate_clicks').insert({ code: code.slice(0, 64), path: path.slice(0, 256) });
  } catch {
    /* best effort */
  }
}

/**
 * Record a 50% product commission for a referred, cleared purchase. Idempotent
 * by Stripe session. Blocks self-referral (affiliate buying via their own code).
 */
export async function recordProductCommission(args: {
  affiliateCode: string;
  orderEmail: string;
  productSlug: string;
  amountCents: number;
  stripeSessionId: string;
}): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const affiliate = await getAffiliateByCode(args.affiliateCode);
  if (!affiliate || !affiliate.code) return;

  // Self-referral guard.
  if (normalizeEmail(args.orderEmail) === normalizeEmail(affiliate.email)) return;

  const amount = Math.round(args.amountCents * COMMISSION_PRODUCT_RATE);
  try {
    const { data, error } = await client
      .from('commissions')
      .insert({
        affiliate_code: affiliate.code,
        affiliate_email: affiliate.email,
        order_email: normalizeEmail(args.orderEmail),
        product_slug: args.productSlug,
        kind: 'product',
        amount_cents: amount,
        status: 'pending',
        stripe_session_id: args.stripeSessionId,
      })
      .select('id')
      .single();
    // Only celebrate a genuinely new commission (a duplicate webhook throws on
    // the unique stripe_session_id index, so this never double-emails).
    if (!error && data) {
      await notifyEarnings({ affiliate, amountCents: amount, productSlug: args.productSlug });
    }
  } catch {
    // Unique index on stripe_session_id makes a duplicate webhook a no-op.
  }
}

/** "You just earned $X" email to the partner. Best effort, never blocks payment. */
async function notifyEarnings(args: { affiliate: Affiliate; amountCents: number; productSlug: string }): Promise<void> {
  if (!process.env.RESEND_API_KEY || !args.affiliate.email) return;
  try {
    const { Resend } = await import('resend');
    const { affiliateEarningsEmail } = await import('./email');
    const product = products.find((p) => p.slug === args.productSlug)?.name;
    const amount = `$${(args.amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: args.affiliate.email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `You just earned ${amount} with Modern Mustard Seed`,
      html: affiliateEarningsEmail({
        toName: args.affiliate.name || undefined,
        amount,
        product,
        dashboardUrl: `${SITE.url}/partners/hq`,
      }),
    });
  } catch (err) {
    console.error('notifyEarnings failed', err);
  }
}
