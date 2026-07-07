import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { mailboxForLogin } from '@/lib/mailboxes';

export const runtime = 'nodejs';

/** Full email body, scoped to the signed-in teammate's mailbox. Marks it read. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const box = mailboxForLogin(user.email);
  if (!box) return NextResponse.json({ error: 'No mailbox' }, { status: 404 });
  const { id } = await params;

  const { data: email } = await sb
    .from('emails')
    .select('*')
    .eq('id', id)
    .eq('mailbox', box.address)
    .maybeSingle();
  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!email.is_read) {
    await sb.from('emails').update({ is_read: true }).eq('id', id);
  }
  return NextResponse.json({ email });
}

/** Mark read/unread or star, scoped to the teammate's mailbox. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const box = mailboxForLogin(user.email);
  if (!box) return NextResponse.json({ error: 'No mailbox' }, { status: 404 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body.is_read === 'boolean') patch.is_read = body.is_read;
  if (typeof body.starred === 'boolean') patch.starred = body.starred;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { error } = await sb.from('emails').update(patch).eq('id', id).eq('mailbox', box.address);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
