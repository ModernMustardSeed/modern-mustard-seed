import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { encryptSecret } from '@/lib/crypto';

export const runtime = 'nodejs';

/** List a client's credential entries (metadata only, never the secret). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ credentials: [] });

  try {
    const { data } = await supabase
      .from('client_credentials')
      .select('id, label, username, url, created_at')
      .ilike('client_email', email)
      .order('created_at', { ascending: false });
    return NextResponse.json({ credentials: data ?? [] });
  } catch {
    return NextResponse.json({ credentials: [] });
  }
}

/** Add a credential. The secret is encrypted before it touches the database. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { client_email?: string; label?: string; username?: string; url?: string; secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const client_email = String(body.client_email ?? '').trim().toLowerCase();
  const label = String(body.label ?? '').trim();
  const secret = String(body.secret ?? '');
  const username = String(body.username ?? '').trim() || null;
  let url = String(body.url ?? '').trim();
  if (!client_email || !label || !secret) {
    return NextResponse.json({ error: 'Client, label, and the secret are required.' }, { status: 400 });
  }
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;

  let enc;
  try {
    enc = encryptSecret(secret);
  } catch (e) {
    console.error('encrypt failed', e);
    return NextResponse.json({ error: 'Vault not configured (missing encryption secret).' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('client_credentials')
    .insert({
      client_email,
      label,
      username,
      url: url || null,
      secret_ciphertext: enc.ciphertext,
      secret_iv: enc.iv,
      secret_tag: enc.tag,
    })
    .select('id')
    .single();
  if (error) {
    console.error('client_credentials insert error', error);
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
