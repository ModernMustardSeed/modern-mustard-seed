import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { COMMISSION_BUILD_RATE, type Affiliate } from '@/lib/affiliate';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * Attribute a build to a partner. Sarah enters the build fee; we record a
 * commission at COMMISSION_BUILD_RATE (10%) of it, or an optional override rate
 * (e.g. 0.5 for founding partners grandfathered at 50%). It flows through the same
 * ledger as product commissions: pending -> payable (via the commissions cron,
 * or immediately if markPayable) -> paid (via the payout action). The partner's
 * dashboard and the admin earnings columns pick it up automatically.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { buildFeeUsd?: number; clientLabel?: string; markPayable?: boolean; notify?: boolean; rate?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { data: affiliate } = await supabase.from('affiliates').select('*').eq('id', id).maybeSingle();
  if (!affiliate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const aff = affiliate as Affiliate;
  if (aff.status !== 'approved' || !aff.code) {
    return NextResponse.json({ error: 'Partner must be approved first.' }, { status: 400 });
  }

  const fee = Number(body.buildFeeUsd);
  if (!Number.isFinite(fee) || fee <= 0) {
    return NextResponse.json({ error: 'Enter the build fee in dollars.' }, { status: 400 });
  }

  const rate = typeof body.rate === 'number' && body.rate > 0 && body.rate <= 1 ? body.rate : COMMISSION_BUILD_RATE;
  const commissionCents = Math.round(fee * 100 * rate);
  if (commissionCents <= 0) return NextResponse.json({ error: 'Commission would be zero.' }, { status: 400 });

  const status = body.markPayable ? 'payable' : 'pending';
  const clientLabel = (body.clientLabel ?? '').trim().slice(0, 200) || null;

  try {
    const { error } = await supabase.from('commissions').insert({
      affiliate_code: aff.code,
      affiliate_email: aff.email,
      order_email: clientLabel,
      product_slug: null,
      kind: 'build',
      amount_cents: commissionCents,
      status,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not record the commission.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Tell the partner they earned (best effort, never blocks the record).
  let emailSent = false;
  if (body.notify !== false && process.env.RESEND_API_KEY && aff.email) {
    try {
      const { Resend } = await import('resend');
      const { affiliateEarningsEmail } = await import('@/lib/email');
      const amount = `$${(commissionCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: aff.email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `You just earned ${amount} on a build with Modern Mustard Seed`,
        html: affiliateEarningsEmail({
          toName: aff.name || undefined,
          amount,
          product: clientLabel ? `a build for ${clientLabel}` : 'a build you referred',
          dashboardUrl: `${SITE.url.replace(/\/$/, '')}/partners/hq`,
        }),
      });
      emailSent = true;
    } catch (err) {
      console.error('build commission notify failed', err);
    }
  }

  return NextResponse.json({ ok: true, commissionCents, status, emailSent });
}
