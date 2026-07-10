import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { mailboxForLogin, mailboxesConfigured } from '@/lib/mailboxes';

export const runtime = 'nodejs';

/**
 * The signed-in teammate's mailbox, scoped to them: Sarah sees sarah@, Polly sees
 * polly.thompson@. ?folder=inbox|sent, ?q= search, ?unread=1 to filter unread.
 */
export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const box = mailboxForLogin(user.email);
  if (!box) {
    return NextResponse.json({
      configured: mailboxesConfigured(),
      mailbox: null,
      items: [],
      unread: 0,
      note: mailboxesConfigured()
        ? 'No mailbox is mapped to your login yet. Add it to the MAILBOXES env var.'
        : 'Team mail is not wired yet. Add the MAILBOXES env var to turn it on.',
    });
  }

  const url = new URL(req.url);
  const folder = url.searchParams.get('folder') === 'sent' ? 'sent' : 'inbox';
  const q = (url.searchParams.get('q') || '').trim();
  const unreadOnly = url.searchParams.get('unread') === '1';

  let query = sb
    .from('emails')
    .select('id,folder,direction,from_addr,from_name,to_addrs,subject,snippet,is_read,starred,has_attachments,prospect_id,occurred_at,status,provider,delivered_at')
    .eq('mailbox', box.address)
    .eq('folder', folder)
    .order('occurred_at', { ascending: false })
    .limit(200);
  if (unreadOnly) query = query.eq('is_read', false);
  if (q) query = query.or(`subject.ilike.%${q}%,from_addr.ilike.%${q}%,snippet.ilike.%${q}%`);
  const { data: items } = await query;

  const { count: unread } = await sb
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('mailbox', box.address)
    .eq('folder', 'inbox')
    .eq('is_read', false);

  return NextResponse.json({
    configured: true,
    mailbox: { address: box.address, name: box.name },
    items: items ?? [],
    unread: unread ?? 0,
  });
}
