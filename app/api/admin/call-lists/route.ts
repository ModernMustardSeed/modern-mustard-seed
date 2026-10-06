import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';

/** Every row on every call list, newest list first, each list in dialing order. */
export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const { data, error } = await guard.supabase
    .from('call_list_rows')
    .select('*')
    .order('created_at', { ascending: false })
    .order('position', { ascending: true })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}
