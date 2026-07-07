import twilio from 'twilio';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Twilio delivery-status callback. Updates the carrier status on the lead's
 * message row and on any campaign recipient, keyed by the provider Message SID.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  const token = process.env.TWILIO_AUTH_TOKEN;
  const sig = req.headers.get('x-twilio-signature');
  if (token && sig) {
    const url = `${process.env.PUBLIC_BASE_URL || 'https://modernmustardseed.com'}/api/sms/status`;
    if (!twilio.validateRequest(token, sig, url, params)) return new Response('Invalid signature', { status: 403 });
  }

  const sid = params.MessageSid || params.SmsSid;
  const raw = (params.MessageStatus || params.SmsStatus || '').toLowerCase();
  if (!sid || !raw) return new Response('ok');
  const status = raw === 'undelivered' ? 'failed' : raw; // normalize

  const sb = getSupabase();
  if (!sb) return new Response('ok');
  const now = new Date().toISOString();

  await sb.from('messages').update({ status }).eq('provider_sid', sid);

  // Campaign recipient: reflect delivered/failed, but never clobber a 'replied'.
  const recipStatus = status === 'delivered' ? 'delivered' : status === 'failed' ? 'failed' : null;
  if (recipStatus) {
    await sb.from('sms_campaign_recipients')
      .update({ status: recipStatus, updated_at: now })
      .eq('provider_sid', sid)
      .in('status', ['sent', 'delivered']);
  }

  return new Response('ok');
}
