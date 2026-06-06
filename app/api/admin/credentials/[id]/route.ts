import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** Delete a credential entry. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { error } = await supabase.from('client_credentials').delete().eq('id', id);
  if (error) {
    console.error('client_credentials delete error', error);
    return NextResponse.json({ error: 'Could not delete.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
