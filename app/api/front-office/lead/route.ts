import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordOfficeEvent } from '@/lib/front-office/provision';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * THE WEBSITE'S DOOR INTO THE OFFICE (loop audit, break #4, 2026-08-20).
 *
 * Dalten's command center feels whole because his website forms and his voice
 * agent write into the same store, so the board shows the whole business, not
 * just the phone. The platform office had no website half at all: only the
 * Vapi webhook ever wrote a contact. This route is the shared path,
 * productized: any site we build (or a client's existing site) POSTs its form
 * submissions here and they land in the same fo_contacts the calls land in,
 * on the owner's board, deduped against the person who also called.
 *
 * Trust model mirrors the Vapi webhook's office resolution and the demo hub:
 * the office uuid is the credential, unguessable and per-client. Writes are
 * additive-only into one client's CRM (no reads, no cross-office access), and
 * a per-office daily cap keeps a spammed form from flooding a board.
 *
 * Wire a form to it with three fields and one hidden input:
 *   <input type="hidden" name="office" value="<office uuid>">
 *   POST JSON { office, name?, phone?, email?, message?, source? }
 */
const DAILY_CAP = 100;

export async function POST(req: Request) {
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const officeId = typeof body.office === 'string' ? body.office.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(officeId)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : null;
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : null;
  const email = typeof body.email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(body.email.trim()) ? body.email.trim().toLowerCase().slice(0, 200) : null;
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : null;
  const source = typeof body.source === 'string' ? body.source.trim().slice(0, 80) : 'website';
  if (!phone && !email) return NextResponse.json({ error: 'need_contact', message: 'A phone number or email is required.' }, { status: 400 });

  const { data: office } = await db.from('fo_offices').select('id, status').eq('id', officeId).maybeSingle();
  if (!office) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Per-office daily cap, counted in app_state. A flooded form degrades to
  // 429s, never to a flooded board.
  const day = new Date().toISOString().slice(0, 10);
  const capKey = `folead:${officeId}:${day}`;
  const { data: cap } = await db.from('app_state').select('value').eq('key', capKey).maybeSingle();
  const count = Number((cap?.value as { n?: number } | null)?.n ?? 0);
  if (count >= DAILY_CAP) return NextResponse.json({ error: 'cap' }, { status: 429 });
  await db.from('app_state').upsert({ key: capKey, value: { n: count + 1 } });

  const digits = (phone ?? '').replace(/\D/g, '').slice(-10) || null;
  const stamp = new Date().toISOString();
  const noteLine = `[${stamp.slice(0, 16)}Z web lead via ${source}]${message ? ` ${message}` : ''}`;

  // Same dedupe the calls use: one human, one contact, whether they called or
  // typed. Phone digits first, email second, fresh contact last.
  let contactId: string | null = null;
  if (digits) {
    const { data: byPhone } = await db.from('fo_contacts').select('id, notes').eq('office_id', officeId).eq('phone_digits', digits).maybeSingle();
    if (byPhone) contactId = byPhone.id as string;
  }
  if (!contactId && email) {
    const { data: byEmail } = await db.from('fo_contacts').select('id, notes').eq('office_id', officeId).eq('email', email).limit(1).maybeSingle();
    if (byEmail) contactId = byEmail.id as string;
  }

  if (contactId) {
    const { data: cur } = await db.from('fo_contacts').select('notes').eq('id', contactId).maybeSingle();
    await db
      .from('fo_contacts')
      .update({
        last_seen_at: stamp,
        updated_at: stamp,
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        notes: [((cur?.notes as string) ?? '').slice(0, 4000), noteLine].filter(Boolean).join('\n'),
      })
      .eq('id', contactId);
  } else {
    const { data: fresh } = await db
      .from('fo_contacts')
      .insert({
        office_id: officeId,
        name,
        phone,
        phone_digits: digits,
        email,
        notes: noteLine,
        tags: ['web-lead'],
      })
      .select('id')
      .single();
    contactId = (fresh?.id as string) ?? null;
  }

  await recordOfficeEvent(db, officeId, {
    type: 'web_lead',
    label: `Website lead: ${name || email || phone || 'someone'}${message ? ` — ${message.slice(0, 80)}` : ''}`,
    actor: 'website',
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
