import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';

export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { data, error } = await guard.supabase
    .from('outbound_scripts')
    .select('*')
    .order('stage')
    .order('sort_order')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scripts: data });
}
