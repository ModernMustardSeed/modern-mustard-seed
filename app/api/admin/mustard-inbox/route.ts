import { NextResponse, after } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { RESOURCE_CATALOG } from '@/lib/mustard-send';
import { toE164 } from '@/lib/instant-callback';
import { noDashes, noDashesTitle } from '@/lib/no-dashes';
import {
  collectExtractions,
  getInboxSettings,
  runDueInbox,
  saveInboxSettings,
  type InboxKind,
  type InboxRow,
} from '@/lib/mustard-inbox';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * MR. MUSTARD'S INBOX, for the admin (/admin/calls).
 *
 * GET                       the last 21 days of rows, newest first, plus settings
 * POST  { kind, ... }       Sarah drops in a follow-up. It is queued, not proposed: she wrote it.
 * PATCH { id, action }      approve | dismiss | retry, on one row
 * PUT   { settings }        autoCallbacks, autoLinks, dailyCallbacks
 *
 * Anyone signed in can read it. Only the owner can approve, add, or change what he does alone.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KINDS: InboxKind[] = ['callback', 'send_link', 'email_note'];

async function owner() {
  const user = await getAdminUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (user.role !== 'owner') return { error: NextResponse.json({ error: 'Only the owner can change the inbox.' }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, rows: [], reason: 'no-supabase' });

  // Opening the page also files anything the drainer finished since the last cron.
  await collectExtractions().catch((err) => console.error('mustard-inbox collect on read failed', err));

  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from('mustard_inbox')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    const missing = /relation .* does not exist|42P01|schema cache/i.test(error.message);
    return NextResponse.json({ ok: false, rows: [], reason: missing ? 'table-missing' : 'error' });
  }
  const links = Object.entries(RESOURCE_CATALOG)
    .filter(([k, v]) => !v.admin && k !== 'sidekick')
    .map(([key, v]) => ({ key, label: v.label }));
  return NextResponse.json({
    ok: true,
    rows: (data ?? []) as InboxRow[],
    settings: await getInboxSettings(),
    links,
    canEdit: user.role === 'owner',
  });
}

export async function POST(req: Request) {
  const { user, error } = await owner();
  if (error) return error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kind = String(body.kind ?? '') as InboxKind;
  if (!KINDS.includes(kind)) return NextResponse.json({ error: 'Pick what he should do.' }, { status: 400 });

  const instruction = noDashes(String(body.instruction ?? '').trim()).slice(0, 800);
  const phone = body.phone ? toE164(String(body.phone)) : null;
  const email = String(body.email ?? '').trim().toLowerCase();
  const links = (Array.isArray(body.links) ? body.links : [])
    .map((k) => String(k).trim().toLowerCase())
    .filter((k) => RESOURCE_CATALOG[k] && !RESOURCE_CATALOG[k].admin);
  const note = noDashes(String(body.note ?? '').trim()).slice(0, 1200);

  if (kind === 'callback' && !phone) return NextResponse.json({ error: 'A callback needs a ten digit US number.' }, { status: 400 });
  if (kind !== 'callback' && !EMAIL_RE.test(email)) return NextResponse.json({ error: 'An email needs a real address.' }, { status: 400 });
  if (kind === 'send_link' && !links.length) return NextResponse.json({ error: 'Pick at least one page to send.' }, { status: 400 });
  if (kind === 'email_note' && !note) return NextResponse.json({ error: 'Write the note.' }, { status: 400 });
  if (kind === 'callback' && !instruction) return NextResponse.json({ error: 'Tell him why he is calling.' }, { status: 400 });

  const dueRaw = String(body.dueAt ?? '');
  const due = dueRaw && !Number.isNaN(Date.parse(dueRaw)) ? new Date(dueRaw) : new Date();

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'No database.' }, { status: 500 });
  const { data, error: insertError } = await sb
    .from('mustard_inbox')
    .insert({
      kind,
      status: 'queued',
      source: 'sarah',
      due_at: due.toISOString(),
      name: String(body.name ?? '').trim().slice(0, 120) || null,
      phone,
      email: email || null,
      business: String(body.business ?? '').trim().slice(0, 160) || null,
      instruction: instruction || (kind === 'send_link' ? 'Send the pages Sarah picked.' : 'Send Sarah\'s note.'),
      links,
      subject: kind === 'email_note' ? noDashesTitle(String(body.subject ?? '').trim()) || 'Following up' : null,
      note: kind === 'email_note' ? note : null,
      decided_by: user.email,
      decided_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Due now? Do it now rather than at the next half hour.
  if (due.getTime() <= Date.now()) after(() => runDueInbox({ id: data.id as string }).then(() => undefined));
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  const { user, error } = await owner();
  if (error) return error;
  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  const id = String(body.id ?? '');
  const action = String(body.action ?? '');
  const sb = getSupabase();
  if (!sb || !id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const stamp = { decided_by: user.email, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  let from: string[];
  let to: Record<string, unknown>;
  if (action === 'approve') {
    from = ['proposed'];
    to = { status: 'queued', ...stamp };
  } else if (action === 'dismiss') {
    from = ['proposed', 'queued', 'failed'];
    to = { status: 'dismissed', ...stamp };
  } else if (action === 'retry') {
    from = ['failed'];
    to = { status: 'queued', attempts: 0, due_at: new Date().toISOString(), ...stamp };
  } else {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const { data, error: updateError } = await sb
    .from('mustard_inbox')
    .update(to)
    .eq('id', id)
    .in('status', from)
    .select('id, due_at, status')
    .maybeSingle();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'That one already moved on. Refresh.' }, { status: 409 });

  if (data.status === 'queued' && Date.parse(data.due_at as string) <= Date.now()) {
    after(() => runDueInbox({ id }).then(() => undefined));
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const { error } = await owner();
  if (error) return error;
  const body = (await req.json().catch(() => ({}))) as { settings?: Record<string, unknown> };
  const s = body.settings ?? {};
  const settings = await saveInboxSettings({
    autoCallbacks: typeof s.autoCallbacks === 'boolean' ? s.autoCallbacks : undefined,
    autoLinks: typeof s.autoLinks === 'boolean' ? s.autoLinks : undefined,
    dailyCallbacks: typeof s.dailyCallbacks === 'number' ? s.dailyCallbacks : undefined,
  });
  return NextResponse.json({ ok: true, settings });
}
