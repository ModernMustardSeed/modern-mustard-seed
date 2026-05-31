import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Daily: promote affiliate commissions from `pending` to `payable` once the
 * refund window has passed, so only cleared, refund-safe earnings become
 * payable. Authenticated with CRON_SECRET (Vercel cron sends it as a bearer).
 */
const REFUND_WINDOW_DAYS = 14;

function authed(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // allow in environments without the secret set
  return req.headers.get('authorization') === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 500 });

  const cutoff = new Date(Date.now() - REFUND_WINDOW_DAYS * 86400 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from('commissions')
      .update({ status: 'payable' })
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, promoted: data?.length ?? 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
