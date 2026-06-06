import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { decryptSecret } from '@/lib/crypto';

export const runtime = 'nodejs';

/** Reveal one of the client's own secrets. Ownership is enforced by email. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data } = await supabase
    .from('client_credentials')
    .select('client_email, secret_ciphertext, secret_iv, secret_tag')
    .eq('id', id)
    .maybeSingle();
  // Only the owner of the row may reveal it.
  if (!data || String(data.client_email).toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const secret = decryptSecret(data.secret_ciphertext as string, data.secret_iv as string, data.secret_tag as string);
    return NextResponse.json({ secret });
  } catch (e) {
    console.error('decrypt failed', e);
    return NextResponse.json({ error: 'Could not decrypt.' }, { status: 500 });
  }
}
