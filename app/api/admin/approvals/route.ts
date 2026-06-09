import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { scanFollowups, scanNurture } from '@/lib/approvals';

export const runtime = 'nodejs';

/** List approvals (pending first). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: pending } = await supabase.from('approvals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  const { data: recent } = await supabase.from('approvals').select('*').neq('status', 'pending').order('decided_at', { ascending: false }).limit(20);
  return NextResponse.json({ pending: pending ?? [], recent: recent ?? [] });
}

/** Run the producers (follow-up + nurture operators) to create drafts. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [f, n] = await Promise.all([scanFollowups(), scanNurture()]);
  return NextResponse.json({ ok: true, created: f + n });
}
