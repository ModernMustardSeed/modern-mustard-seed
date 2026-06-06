import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { decryptSecret } from '@/lib/crypto';

export const runtime = 'nodejs';

/** Reveal one credential's secret (admin). Decrypted on demand, never listed. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data } = await supabase
    .from('client_credentials')
    .select('secret_ciphertext, secret_iv, secret_tag')
    .eq('id', id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const secret = decryptSecret(data.secret_ciphertext as string, data.secret_iv as string, data.secret_tag as string);
    return NextResponse.json({ secret });
  } catch (e) {
    console.error('decrypt failed', e);
    return NextResponse.json({ error: 'Could not decrypt.' }, { status: 500 });
  }
}
