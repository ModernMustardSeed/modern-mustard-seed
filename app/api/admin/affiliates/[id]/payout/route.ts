import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Manual payout: mark all of a partner's payable commissions as paid. This is
 * the fallback for paying however Sarah chooses (Connect transfers are a later
 * addition). Records the transition; the dashboard reflects it immediately.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data: affiliate } = await supabase.from('affiliates').select('code').eq('id', id).maybeSingle();
  const code = affiliate?.code as string | undefined;
  if (!code) return NextResponse.json({ error: 'Affiliate has no code' }, { status: 400 });

  const { data, error } = await supabase
    .from('commissions')
    .update({ status: 'paid' })
    .eq('affiliate_code', code)
    .eq('status', 'payable')
    .select('amount_cents');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const paidCents = (data ?? []).reduce((s, c) => s + (Number(c.amount_cents) || 0), 0);
  return NextResponse.json({ ok: true, count: data?.length ?? 0, paidCents });
}
