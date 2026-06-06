import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { createClientRequest } from '@/lib/client-requests';

export const runtime = 'nodejs';

/** Client submits a change request / edit / note to Sarah from their portal. */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const text = (body.body || '').trim();
  if (!text) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: 'That is a bit long. Trim it down.' }, { status: 400 });

  const result = await createClientRequest({ email: session.email, body: text, source: 'note' });
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Could not send.' }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.id });
}

/** The client's own request history (for their portal). */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ requests: [] });

  try {
    const { data } = await supabase
      .from('client_requests')
      .select('id, body, source, status, created_at')
      .eq('client_email', session.email)
      .order('created_at', { ascending: false })
      .limit(20);
    return NextResponse.json({ requests: data ?? [] });
  } catch {
    return NextResponse.json({ requests: [] });
  }
}
