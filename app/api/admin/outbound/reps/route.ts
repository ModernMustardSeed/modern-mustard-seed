import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';

export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { data, error } = await guard.supabase
    .from('outbound_reps')
    .select('*')
    .eq('active', true)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reps: data });
}
