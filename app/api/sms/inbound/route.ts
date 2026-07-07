import twilio from 'twilio';
import { getSupabase } from '@/lib/supabase';
import { normalizePhone, isStopKeyword, addOptOut } from '@/lib/sms';

export const runtime = 'nodejs';

/**
 * Twilio inbound SMS webhook. Two jobs, both compliance-critical:
 *  1) STOP/UNSUBSCRIBE → add the number to the opt-out list so it is never texted
 *     again (Twilio's Messaging Service also blocks it at the carrier).
 *  2) A real reply → thread it onto the lead's conversation, flag any campaign
 *     recipient as replied, and nudge a cold lead to "contacted".
 * Returns empty TwiML so Twilio does not auto-append a message.
 */
function twiml(body = ''): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
  return new Response(xml, { headers: { 'Content-Type': 'text/xml' } });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  // Validate the request came from Twilio when a signature is present.
  const token = process.env.TWILIO_AUTH_TOKEN;
  const sig = req.headers.get('x-twilio-signature');
  if (token && sig) {
    const url = `${process.env.PUBLIC_BASE_URL || 'https://modernmustardseed.com'}/api/sms/inbound`;
    const valid = twilio.validateRequest(token, sig, url, params);
    if (!valid) return new Response('Invalid signature', { status: 403 });
  }

  const from = normalizePhone(params.From);
  const bodyText = params.Body || '';
  if (!from) return twiml();

  const sb = getSupabase();
  if (!sb) return twiml();
  const now = new Date().toISOString();

  // 1) Opt-out.
  if (isStopKeyword(bodyText)) {
    await addOptOut(from, 'stop-reply', 'inbound');
    // Suppress future texting on any matching lead + count it on live campaigns.
    const { data: leads } = await sb.from('rep_prospects').select('id,phone').not('phone', 'is', null);
    const hit = (leads || []).find((l) => normalizePhone(l.phone as string) === from);
    if (hit) await sb.from('rep_prospects').update({ do_not_text: true, updated_at: now }).eq('id', hit.id);
    await sb.from('sms_campaign_recipients').update({ status: 'opted_out', updated_at: now }).eq('phone', from).in('status', ['sent', 'delivered', 'queued']);
    return twiml();
  }

  // 2) A real reply. Match the number to a lead and thread it.
  const { data: leads } = await sb.from('rep_prospects').select('id,phone,status').not('phone', 'is', null);
  const lead = (leads || []).find((l) => normalizePhone(l.phone as string) === from);

  await sb.from('messages').insert({
    prospect_id: lead ? lead.id : null,
    direction: 'inbound',
    channel: 'sms',
    from_addr: from,
    to_addr: params.To || (process.env.TWILIO_SMS_FROM || 'MMS'),
    body: bodyText.slice(0, 20_000),
    snippet: bodyText.replace(/\s+/g, ' ').trim().slice(0, 500),
    status: 'received',
    provider_sid: params.MessageSid || null,
    read: false,
    occurred_at: now,
  });

  if (lead && lead.status === 'to-contact') {
    await sb.from('rep_prospects').update({ status: 'contacted', updated_at: now }).eq('id', lead.id);
  }
  // Mark any live campaign recipient replied (campaign stats are recomputed from
  // the recipients table on read, so no counter to maintain here).
  await sb.from('sms_campaign_recipients')
    .update({ status: 'replied', updated_at: now })
    .eq('phone', from)
    .in('status', ['sent', 'delivered']);

  return twiml();
}
