import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { verifyTwilio, twilioRequestUrl, twilioParams } from '@/lib/twilio-signature';
import {
  toE164,
  keywordOf,
  optOut,
  optIn,
  matchThread,
  recordSms,
  numberFor,
  HELP_REPLY,
  STOP_REPLY,
} from '@/lib/sms-thread';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * INBOUND SMS. Somebody texted a number we own.
 *
 * This is the endpoint that did not exist, and its absence is why every reply to
 * every text this business ever sent landed on a personal handset and stopped
 * there. See lib/sms-thread.ts for why it works before A2P clears rather than
 * after.
 *
 * ── WIRING IT UP ─────────────────────────────────────────────────────────────
 * Twilio Console -> Phone Numbers -> the number -> Messaging:
 *   "A message comes in"  webhook  POST  https://modernmustardseed.com/api/hooks/sms
 * or run scripts/sms-webhook-setup.mjs, which sets it over the API and also
 * registers the delivery callback. If the number is in a Messaging Service, set
 * it on the SERVICE's Integration tab instead; a service overrides the number.
 *
 * ── WHY IT ALWAYS ANSWERS 200 ────────────────────────────────────────────────
 * Anything but a 2xx makes Twilio retry, and a retry after we already wrote the
 * row is a duplicate text on the thread. So every failure below is caught,
 * logged and answered 200 EXCEPT a bad signature, which is answered 403 because
 * that is not Twilio and must not be quietly accepted.
 */

/** TwiML. An empty <Response/> means "received, say nothing back". */
function twiml(message?: string): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string)}</Message></Response>`
    : '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } });
}

export async function POST(req: Request) {
  const params = twilioParams(await req.text());

  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const signature = req.headers.get('x-twilio-signature') || '';

  if (token) {
    if (!verifyTwilio(token, twilioRequestUrl(req), params, signature)) {
      console.warn('[sms-hook] signature rejected', { from: params.From, url: twilioRequestUrl(req) });
      return NextResponse.json({ error: 'Bad signature' }, { status: 403 });
    }
  } else {
    // No token means the stack is half-configured. Accept and shout, rather than
    // dropping a real customer's text during a setup window.
    console.warn('[sms-hook] TWILIO_AUTH_TOKEN unset: accepting an UNVERIFIED inbound text');
  }

  const from = toE164(params.From || '');
  const to = toE164(params.To || '') ?? (params.To || null);
  const body = (params.Body || '').trim();
  const sid = params.MessageSid || params.SmsMessageSid || null;

  if (!from) {
    console.warn('[sms-hook] unusable From', params.From);
    return twiml();
  }

  const sb = getSupabase();
  const keyword = keywordOf(body);

  try {
    const owner = await matchThread(sb, from);

    // The message is written FIRST, before any keyword handling, so the record
    // of what they actually said survives even if the opt-out write fails. A
    // STOP we acted on but cannot show is not a defensible record.
    const messageId = await recordSms(sb, {
      phoneE164: from,
      direction: 'inbound',
      body: body || '(no text)',
      viaNumber: to,
      providerSid: sid,
      status: 'received',
      owner,
    });

    // recordSms returns null on a duplicate SID, which means this is a Twilio
    // retry of something already handled. Say nothing and answer 200; replying
    // again would send the customer a second copy of the STOP confirmation.
    if (messageId === null && sid) return twiml();

    if (keyword === 'stop') {
      await optOut(sb, {
        phoneE164: from,
        reason: 'stop-reply',
        source: 'inbound',
        keyword: body.slice(0, 40),
        viaNumber: to,
        messageId,
      });
      // Flag the lead too, so the dial floor and every campaign builder see it
      // without joining to the opt-out table.
      if (sb && owner.prospectId) {
        await sb.from('rep_prospects').update({ do_not_text: true }).eq('id', owner.prospectId);
      }
      return twiml(autoReplyEnabled() ? STOP_REPLY : undefined);
    }

    if (keyword === 'start') {
      await optIn(sb, from);
      if (sb && owner.prospectId) {
        await sb.from('rep_prospects').update({ do_not_text: false }).eq('id', owner.prospectId);
      }
      return twiml();
    }

    if (keyword === 'help') {
      return twiml(autoReplyEnabled() ? HELP_REPLY : undefined);
    }

    // A real reply from a first-time texter can get one canned line, if the
    // number carries one. This is how a client's missed-call-textback answers
    // out of hours without a human. Anything beyond one line is a conversation,
    // and a conversation belongs to a person.
    const line = to ? (await numberFor(sb, to))?.auto_reply : null;
    if (line && !owner.outboundLeadId && !owner.prospectId) return twiml(line);

    return twiml();
  } catch (err) {
    // Swallow and 200. Twilio retrying into a broken database just multiplies
    // the damage, and the text is already lost either way; the log is what gets
    // it back.
    console.error('[sms-hook] failed', { from, to, sid, err: (err as Error)?.message });
    return twiml();
  }
}

/**
 * Off by default, and that default is the safe one.
 *
 * A Twilio Messaging Service with Advanced Opt-Out enabled answers STOP and HELP
 * itself. If we ALSO answer, the customer gets two texts for one word, and the
 * second one bills. Turn SMS_KEYWORD_AUTOREPLY=1 on only for a number that is
 * not behind a service handling its own keywords.
 */
function autoReplyEnabled(): boolean {
  return /^(1|true|yes)$/i.test((process.env.SMS_KEYWORD_AUTOREPLY || '').trim());
}

/** Twilio pings with GET when you paste the URL into the console. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'sms-inbound' });
}
