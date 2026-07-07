import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { normalizePhone, isOptedOut, withinQuietHours, sendSms, smsConfigured } from '@/lib/sms';
import { buildLeadText } from '@/lib/lead-text';
import type { Prospect } from '@/lib/prospects';

export const runtime = 'nodejs';

const BOOK_URL = 'modernmustardseed.com/book';

/**
 * Text one lead. GET returns the personalized draft (so the composer can preview
 * + let the rep tweak it). POST sends it, with the full compliance screen:
 * opt-out list, do-not-text flag, valid mobile-format number, and quiet hours.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const { data: p } = await sb.from('rep_prospects').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const draft = buildLeadText(p as Prospect, user.name, BOOK_URL, { includeOptOut: true });
  const phone = normalizePhone((p as Prospect).phone);
  return NextResponse.json({
    ...draft,
    phone,
    canText: Boolean(phone) && !(p as Prospect & { do_not_text?: boolean }).do_not_text,
    configured: smsConfigured(),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!smsConfigured()) return NextResponse.json({ error: 'Texting is not wired yet. Add the Twilio credentials to turn it on.' }, { status: 400 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const { data: raw } = await sb.from('rep_prospects').select('*').eq('id', id).maybeSingle();
  if (!raw) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const p = raw as Prospect & { do_not_text?: boolean };

  const phone = normalizePhone(p.phone);
  if (!phone) return NextResponse.json({ error: 'This lead has no textable phone number.' }, { status: 400 });
  if (p.do_not_text) return NextResponse.json({ error: 'This lead is marked do-not-text.' }, { status: 400 });
  if (await isOptedOut(phone)) return NextResponse.json({ error: 'This number has opted out of texts.' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const override = typeof body.body === 'string' ? body.body.trim() : '';
  const message = override || buildLeadText(p, user.name, BOOK_URL, { includeOptOut: true }).body;

  // Quiet hours are a hard block unless the sender explicitly overrides for a
  // known-warm reply (one-off manual texts can override; campaigns cannot).
  if (body.ignoreQuietHours !== true && !withinQuietHours(phone)) {
    return NextResponse.json({ error: 'quiet-hours', message: 'It is outside safe texting hours (9a-8p) where this lead is. Send anyway to override.' }, { status: 409 });
  }

  const res = await sendSms(phone, message);
  const now = new Date().toISOString();

  await sb.from('messages').insert({
    prospect_id: id,
    direction: 'outbound',
    channel: 'sms',
    from_addr: process.env.TWILIO_SMS_FROM || 'MMS',
    to_addr: phone,
    body: message,
    snippet: message.slice(0, 500),
    status: res.ok ? (res.status || 'sent') : 'failed',
    provider_sid: res.sid || null,
    read: true,
    occurred_at: now,
  });

  if (!res.ok) return NextResponse.json({ error: res.error || 'Send failed' }, { status: 502 });

  await sb.from('rep_prospects').update({
    last_sms_at: now,
    ...(p.status === 'to-contact' ? { status: 'contacted' } : {}),
    updated_at: now,
  }).eq('id', id);

  return NextResponse.json({ ok: true, sid: res.sid, body: message });
}
