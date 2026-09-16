import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';
import { CATEGORIES, collectSorted, connectMailbox, disconnectMailbox, mailStatus, saveDraft, sendReply, syncMailbox, type MailRow } from '@/lib/mail-desk';
import { resendClient } from '@/lib/send-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * THE OWNER'S MAIL, in their portal. GET: status and the sorted list, reply
 * needed first. POST actions: connect, disconnect, sync, send, draft, done,
 * skip, edit. Every write is scoped by the signed-in email, and the only
 * thing that ever sends is the owner's own "send".
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project) return NextResponse.json({ mail: null });
  const status = await mailStatus(sb, session.email);
  if (!status.connected) return NextResponse.json({ mail: { status, items: [], counts: {} } });
  try {
    await collectSorted(sb, session.email);
  } catch {
    /* the list still renders */
  }
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await sb
    .from('client_mail')
    .select('id, from_addr, from_name, subject, snippet, body_text, received_at, category, summary, needs_reply, draft, status, replied_at')
    .eq('client_email', session.email)
    .gte('received_at', since)
    .neq('category', 'spam')
    .order('received_at', { ascending: false })
    .limit(200);
  const items = ((data ?? []) as MailRow[]).map((m) => ({ ...m, body_text: (m.body_text ?? '').slice(0, 4000) }));
  items.sort((a, b) => {
    const ra = a.status === 'new' && a.needs_reply ? 0 : a.status === 'new' ? 1 : 2;
    const rb = b.status === 'new' && b.needs_reply ? 0 : b.status === 'new' ? 1 : 2;
    if (ra !== rb) return ra - rb;
    return b.received_at.localeCompare(a.received_at);
  });
  const counts: Record<string, number> = {};
  for (const m of items) if (m.status === 'new') counts[m.category ?? 'sorting'] = (counts[m.category ?? 'sorting'] ?? 0) + 1;
  return NextResponse.json({ mail: { status, items, counts, categories: CATEGORIES } });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project) return NextResponse.json({ error: 'Not on a project.' }, { status: 404 });
  let body: { action?: string; address?: string; appPassword?: string; id?: string; text?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const action = String(body.action ?? '');

  if (action === 'connect') {
    const r = await connectMailbox(sb, session.email, String(body.address ?? ''), String(body.appPassword ?? ''));
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    // First read now, so the card is not empty on the first open.
    const s = await syncMailbox(sb, project);
    try {
      const resend = resendClient();
      await resend.emails.send({ from: 'Modern Mustard Seed <sarah@modernmustardseed.com>', to: ['sarah@modernmustardseed.com'], subject: `${project.business} connected their mailbox`, text: `${session.email} connected ${String(body.address).toLowerCase()} for the mail desk. First read: ${s.fetched} messages, ${s.queued} queued for sorting.` });
    } catch {
      /* connected either way */
    }
    return NextResponse.json({ ok: true, fetched: s.fetched });
  }
  if (action === 'disconnect') {
    await disconnectMailbox(sb, session.email);
    return NextResponse.json({ ok: true });
  }
  if (action === 'sync') {
    const s = await syncMailbox(sb, project);
    const sorted = await collectSorted(sb, session.email);
    return NextResponse.json({ ok: s.ok, fetched: s.fetched, sorted, error: s.error ?? null });
  }

  const id = String(body.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Which message?' }, { status: 400 });
  if (action === 'send') {
    const r = await sendReply(sb, session.email, id, String(body.text ?? ''));
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 400 });
  }
  if (action === 'draft') {
    const r = await saveDraft(sb, session.email, id, String(body.text ?? ''));
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 400 });
  }
  if (action === 'edit') {
    await sb.from('client_mail').update({ draft: String(body.text ?? '').slice(0, 4000), updated_at: new Date().toISOString() }).eq('id', id).eq('client_email', session.email);
    return NextResponse.json({ ok: true });
  }
  if (action === 'done' || action === 'skip' || action === 'reopen') {
    const status = action === 'done' ? 'done' : action === 'skip' ? 'skipped' : 'new';
    await sb.from('client_mail').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('client_email', session.email);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
