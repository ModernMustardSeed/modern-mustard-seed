import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { makeCodeSeed, type Affiliate } from '@/lib/affiliate';
import { grantAllProducts } from '@/lib/entitlements';
import { createMagicToken } from '@/lib/client-auth';
import { affiliateWelcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';

/** Approve or reject a pending affiliate. Approval generates the code, grants
 *  free access to all programs, and sends the welcome email with a login link. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { action?: 'approve' | 'reject' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { data: affiliate } = await supabase.from('affiliates').select('*').eq('id', id).maybeSingle();
  if (!affiliate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const aff = affiliate as Affiliate;

  if (body.action === 'reject') {
    await supabase.from('affiliates').update({ status: 'rejected' }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  if (body.action !== 'approve') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  // Generate a unique referral code.
  let code = aff.code || makeCodeSeed(aff.name || aff.email);
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabase.from('affiliates').select('id').eq('code', code).neq('id', id).maybeSingle();
    if (!clash) break;
    code = `${makeCodeSeed(aff.name || aff.email)}${i + 1}`;
  }

  await supabase.from('affiliates').update({ status: 'approved', code, approved_at: new Date().toISOString() }).eq('id', id);

  // Free access to every product (both programs and all playbooks).
  await grantAllProducts(aff.email, 'affiliate');

  // Welcome email with a passwordless link to the partner dashboard.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const origin = new URL(req.url).origin || 'https://modernmustardseed.com';
      const token = await createMagicToken(aff.email);
      const url = `${origin}/api/portal/verify?token=${encodeURIComponent(token)}&next=/partners/hq`;
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: aff.email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'You are in. Welcome to the Modern Mustard Seed partner program',
        html: affiliateWelcomeEmail({ firstName: aff.name?.split(' ')[0], code, url }),
      });
    } catch (err) {
      console.error('affiliate welcome email failed', err);
    }
  }

  return NextResponse.json({ ok: true, code });
}
