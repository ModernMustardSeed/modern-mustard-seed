import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** The signed-in client's own credentials (metadata only, never the secret). */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ credentials: [] });

  try {
    const { data } = await supabase
      .from('client_credentials')
      .select('id, label, username, url, created_at')
      .ilike('client_email', session.email)
      .order('created_at', { ascending: false });
    return NextResponse.json({ credentials: data ?? [] });
  } catch {
    return NextResponse.json({ credentials: [] });
  }
}
