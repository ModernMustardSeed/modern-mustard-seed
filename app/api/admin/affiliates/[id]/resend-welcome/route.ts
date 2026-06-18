import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { grantAllProducts } from '@/lib/entitlements';
import { sendAffiliateWelcome } from '@/lib/affiliate-notify';
import type { Affiliate } from '@/lib/affiliate';

export const runtime = 'nodejs';

/** Resend an approved partner's welcome email with a fresh login link. The
 *  recovery path when a welcome bounced (bad address) or was never received. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data } = await supabase.from('affiliates').select('*').eq('id', id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const aff = data as Affiliate;
  if (aff.status !== 'approved' || !aff.code) {
    return NextResponse.json({ error: 'Approve the partner before sending a welcome.' }, { status: 400 });
  }

  // Make sure their free access is in place (idempotent), then send.
  await grantAllProducts(aff.email, 'affiliate');
  const origin = new URL(req.url).origin || 'https://modernmustardseed.com';
  const result = await sendAffiliateWelcome({ email: aff.email, name: aff.name, code: aff.code }, origin);
  if (!result.sent) return NextResponse.json({ error: result.error || 'Send failed' }, { status: 502 });
  return NextResponse.json({ ok: true, id: result.id });
}
