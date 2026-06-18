import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { makeCodeSeed, type Affiliate } from '@/lib/affiliate';
import { grantAllProducts } from '@/lib/entitlements';
import { normalizeEmail } from '@/lib/client-auth';
import { sendAffiliateWelcome } from '@/lib/affiliate-notify';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Approve, reject, or correct a partner. Approval generates the code, grants
 *  free access to all programs, and sends the welcome email with a login link.
 *  update-email fixes a mistyped address and carries their entitlements over. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { action?: 'approve' | 'reject' | 'update-email'; email?: string };
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

  // Correct a partner's email (e.g. a bad address that bounced). Move their
  // entitlements to the new address first so their free access follows them.
  if (body.action === 'update-email') {
    const newEmail = normalizeEmail(body.email ?? '');
    if (!newEmail || !EMAIL_RE.test(newEmail)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
    if (newEmail === normalizeEmail(aff.email)) return NextResponse.json({ ok: true, email: newEmail });

    const { data: clash } = await supabase.from('affiliates').select('id').eq('email', newEmail).neq('id', id).maybeSingle();
    if (clash) return NextResponse.json({ error: 'Another partner already uses that email.' }, { status: 409 });

    await supabase.from('entitlements').update({ email: newEmail }).eq('email', aff.email);
    const { error } = await supabase.from('affiliates').update({ email: newEmail }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, email: newEmail });
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
  const origin = new URL(req.url).origin || 'https://modernmustardseed.com';
  const result = await sendAffiliateWelcome({ email: aff.email, name: aff.name, code }, origin);
  if (!result.sent) console.error('affiliate welcome email failed', result.error);

  return NextResponse.json({ ok: true, code, emailSent: result.sent });
}
