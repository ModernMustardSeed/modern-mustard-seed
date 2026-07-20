import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { smsSendable, normalizePhone, isOptedOut, lineType, sendSms } from '@/lib/sms';
import { fetchAllRows } from '@/lib/outbound-server';
import { syncLeadToPipeline } from '@/lib/outbound-pipeline';
import type { OutboundLead } from '@/lib/outbound';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * TEXT-BACK: a website visitor drops their number and gets an instant text
 * from us, opening a real SMS thread instead of a form-and-wait. The visitor
 * typed their own number and tapped a button that says we will text them,
 * which is express consent; the message still carries STOP language and the
 * global opt-out list is checked first.
 *
 * Never-leak guards (fail CLOSED, house pattern from /api/demo-station):
 *   - smsConfigured() gate: with Twilio unset the endpoint refuses politely
 *     and the widget never renders at all (TextBackGate).
 *   - ATOMIC daily cap via claim_forge_slot (one statement checks + claims).
 *   - per-instance IP throttle + honeypot, both soft speed bumps by design.
 *   - opt-out list honored BEFORE any Twilio call; landlines bounced kindly.
 * A successful text files the visitor on the dial floor as a due callback
 * (status 'callback' + next_action_at now), because a fresh 'new' lead scores
 * too low to ever surface in the heat queue (learned 2026-07-14).
 */

const DAILY_CAP = 100;

const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => t > now - 3600_000);
  if (list.length >= 3) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

/** SMS bodies stay plain ASCII: curly quotes force UCS-2 (70 chars/segment). */
function ascii(v: unknown, max: number): string {
  return typeof v === 'string'
    ? v
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[^\x20-\x7e]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
    : '';
}

const digitsOf = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '').slice(-10);

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Honeypot: bots fill everything.
  if (ascii(body.company_url, 10)) return NextResponse.json({ ok: true });

  const name = ascii(body.name, 60);
  const need = ascii(body.need, 200);
  const e164 = normalizePhone(typeof body.phone === 'string' ? body.phone : '');
  if (!e164) {
    return NextResponse.json({ error: 'bad_phone', message: 'That number does not look complete. Ten digits gets you the text.' }, { status: 400 });
  }

  if (!smsSendable()) {
    return NextResponse.json(
      { error: 'not_ready', message: 'Texting is warming up. Call (406) 312-1223 or email sarah@modernmustardseed.com and a human answers today.' },
      { status: 503 },
    );
  }

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (throttled(ip)) {
    return NextResponse.json({ error: 'slow_down', message: 'Easy there. Your text is already on its way, or give it an hour.' }, { status: 429 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  if (await isOptedOut(e164)) {
    return NextResponse.json(
      { error: 'opted_out', message: 'That number asked us not to text it. Email sarah@modernmustardseed.com instead and a human answers today.' },
      { status: 409 },
    );
  }

  // Global daily cap, atomic and fail closed.
  const { data: claimed, error: capErr } = await sb.rpc('claim_forge_slot', {
    p_key: `textback:day:${new Date().toISOString().slice(0, 10)}`,
    p_cap: DAILY_CAP,
  });
  if (capErr || claimed !== true) {
    return NextResponse.json(
      { error: 'capacity', message: 'The text line hit its daily limit. Call (406) 312-1223 and a human answers.' },
      { status: 503 },
    );
  }

  if ((await lineType(e164)) === 'landline') {
    return NextResponse.json(
      { error: 'landline', message: 'That looks like a landline, and landlines do not text. Call us instead: (406) 312-1223.' },
      { status: 400 },
    );
  }

  const smsBody =
    `Hey${name ? ` ${name.split(' ')[0]}` : ''}! Sarah's team at Modern Mustard Seed here. You asked for a text from our site` +
    `${need ? ` about: "${need}"` : ''}. What are you working on? Reply here and a human answers. Reply STOP to opt out.`;

  const sent = await sendSms(e164, smsBody);
  if (!sent.ok) {
    console.error('textback send failed:', sent.error);
    return NextResponse.json(
      { error: 'send_failed', message: 'The text did not go through. Call (406) 312-1223 or email sarah@modernmustardseed.com.' },
      { status: 502 },
    );
  }

  // File the conversation. Existing lead with this phone (any source) keeps the
  // thread; otherwise the visitor becomes a lead, landed as a DUE CALLBACK so
  // the floor actually surfaces them while the thread is warm.
  const now = new Date().toISOString();
  let leadId: string | null = null;
  try {
    const { data: rows } = await fetchAllRows<{ id: string; phone: string | null }>(
      () => sb.from('outbound_leads').select('id, phone').order('id', { ascending: true }),
    );
    leadId = (rows ?? []).find((r) => digitsOf(r.phone) === digitsOf(e164))?.id ?? null;

    if (!leadId) {
      const { data: fresh } = await sb
        .from('outbound_leads')
        .insert({
          business_name: name ? `${name} (text-back)` : 'Website text-back',
          contact_name: name || null,
          phone: e164,
          niche: 'other',
          status: 'callback',
          source: 'textback',
          notes: `TEXTBACK: asked for a text from modernmustardseed.com.${need ? `\nOWNER NOTES: ${need}` : ''}`,
          next_action: 'They texted from the website: keep the thread going',
          next_action_at: now,
        })
        .select('*')
        .single();
      if (fresh) {
        leadId = (fresh as OutboundLead).id;
        try {
          await syncLeadToPipeline(sb, fresh as OutboundLead, { source: 'textback' });
        } catch {
          /* pipeline sync is fail-soft; the lead is already on the floor */
        }
      }
    }

    await sb.from('messages').insert({
      outbound_lead_id: leadId,
      direction: 'outbound',
      channel: 'sms',
      from_addr: process.env.TWILIO_SMS_FROM || 'MMS',
      to_addr: e164,
      body: smsBody,
      snippet: smsBody.slice(0, 500),
      status: sent.status || 'sent',
      provider_sid: sent.sid || null,
      read: true,
      occurred_at: now,
    });
  } catch (err) {
    // Recording must never claw back a text that already sent.
    console.error('textback record failed', err);
  }

  if (process.env.RESEND_API_KEY) {
    try {
      await resendClient().emails.send({
        from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `TEXT-BACK: ${name || e164} asked for a text from the site`,
        html: clientEmail({
          preheader: 'A website visitor asked us to text them. The first message already went out.',
          eyebrow: 'TEXT-BACK',
          greeting: 'The site just started a text thread.',
          body: `<p><strong>${name || 'A visitor'}</strong> (${e164}) tapped Text me back on modernmustardseed.com${need ? ` and said: &ldquo;${need}&rdquo;` : ''}.</p><p>The opener is sent; their reply lands in the cockpit thread. They are on the dial floor as a due callback.</p>`,
          signature: 'The Text Line',
        }),
      });
    } catch (err) {
      console.error('textback notify failed', err);
    }
  }

  return NextResponse.json({ ok: true });
}
