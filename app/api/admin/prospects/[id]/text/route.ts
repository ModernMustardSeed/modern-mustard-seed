import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { buildLeadText } from '@/lib/lead-text';
import { smsHref, toE164, toAscii } from '@/lib/tap-text';
import type { Prospect } from '@/lib/prospects';

export const runtime = 'nodejs';

const BOOK_URL = 'https://modernmustardseed.com/book';

/**
 * Tap-to-text for one prospect. This route does NOT send anything.
 *
 * GET  -> the personalized draft plus the `sms:` deep link to open Messages.
 * POST -> records that the text was actually sent, from the admin's own phone.
 *
 * The previous version of this file sent through Twilio and was deleted
 * 2026-08-01 when texting was retired over A2P 10DLC vetting. Sending from the
 * admin's own handset is person-to-person, so it needs no carrier registration.
 * See lib/tap-text.ts for the full reasoning before reintroducing a provider.
 */

async function loadProspect(id: string) {
  const sb = getSupabase();
  if (!sb) return { error: NextResponse.json({ error: 'Database not configured' }, { status: 500 }) } as const;
  const { data, error } = await sb.from('rep_prospects').select('*').eq('id', id).single();
  if (error || !data) return { error: NextResponse.json({ error: 'Prospect not found' }, { status: 404 }) } as const;
  return { sb, prospect: data as Prospect } as const;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const loaded = await loadProspect(id);
  if ('error' in loaded) return loaded.error;
  const { prospect } = loaded;

  const phone = toE164(prospect.phone);
  // No opt-out line: this is a human texting from their own phone, not a
  // registered A2P campaign, so the STOP boilerplate would be both wrong and
  // a waste of the segment budget.
  const draft = buildLeadText(prospect, prospect.rep_name || 'Sarah', BOOK_URL, { includeOptOut: false });
  const body = toAscii(draft.body);

  return NextResponse.json({
    body,
    kind: draft.kind,
    phone,
    hasPhone: !!phone,
    href: smsHref(prospect.phone, body),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  let payload: { body?: string } = {};
  try { payload = await req.json(); } catch { /* validated below */ }
  const body = (payload.body ?? '').trim();
  if (!body) return NextResponse.json({ error: 'Nothing to log.' }, { status: 400 });

  const loaded = await loadProspect(id);
  if ('error' in loaded) return loaded.error;
  const { sb, prospect } = loaded;

  const phone = toE164(prospect.phone);
  if (!phone) return NextResponse.json({ error: 'No phone number on file for this lead.' }, { status: 400 });

  const now = new Date().toISOString();
  await sb.from('messages').insert({
    prospect_id: id, direction: 'outbound', channel: 'sms',
    to_addr: phone, subject: null,
    snippet: body.slice(0, 500), body: body.slice(0, 20_000), read: true,
    occurred_at: now,
  });

  // Only advance an untouched lead. A lead already marked booked or won must not
  // be walked backwards to 'contacted' just because a follow-up text went out.
  const patch: Record<string, string> = { last_sms_at: now, updated_at: now };
  if (prospect.status === 'to-contact') patch.status = 'contacted';
  await sb.from('rep_prospects').update(patch).eq('id', id);

  return NextResponse.json({ ok: true, status: patch.status ?? prospect.status, last_sms_at: now });
}
