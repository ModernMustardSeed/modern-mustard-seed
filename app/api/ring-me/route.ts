import { NextRequest, NextResponse } from 'next/server';
import { placeInstantCallback, toE164 } from '@/lib/instant-callback';
import { callerIp, callRateLimited, isCrossOrigin } from '@/lib/callback-guard';
import { insertLead } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { trackServerConversion } from '@/lib/meta-capi';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';

/**
 * THE HERO RING. One field, one number, and the phone rings.
 *
 * The hero box (components/RingMeNow.tsx) asks for a phone number and nothing
 * else, so unlike the contact form there is no earlier POST that saved the lead.
 * This route owns the whole moment: save the number FIRST, then dial. If Vapi is
 * down we still have the lead and Sarah still gets the email, which is the
 * difference between a bad minute and a lost customer.
 *
 * Everything they did not type (name, email, business, what they need) is
 * collected by Mr. Mustard on the call itself with capture_lead. A phone number
 * is the only thing a stranger will give you in one gesture, so it is the only
 * thing the page asks for.
 *
 * Always returns 200. `ringing:false` with a reason lets the form tell the truth
 * ("that number does not look right") without ever looking broken.
 */

type Body = { phone?: string; source?: string; metaEventId?: string; fbp?: string; fbc?: string };

export async function POST(req: NextRequest) {
  if (isCrossOrigin(req)) {
    return NextResponse.json({ ringing: false, reason: 'cross-origin' }, { status: 403 });
  }
  if (callRateLimited(callerIp(req))) {
    return NextResponse.json({ ringing: false, reason: 'rate-limited' });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ringing: false, reason: 'bad-body' });
  }

  const phone = toE164(String(body.phone || ''));
  if (!phone) return NextResponse.json({ ringing: false, reason: 'bad-phone' });

  const source = body.source || 'hero-ring';
  const pretty = `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;

  // 1. Save it. This happens before anything that can fail interestingly.
  await insertLead({
    type: 'callback',
    email: null,
    phone,
    source,
    message: 'Asked Mr. Mustard to call them from the site. Name, email, and business come from the call.',
  });

  // 2. Tell Sarah, whatever the phone does next.
  const notify = (async () => {
    if (!process.env.RESEND_API_KEY) return;
    try {
      await resendClient().emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `Ring request: ${pretty}`,
        html: leadNotification({
          type: 'Callback',
          name: pretty,
          email: '',
          fields: [
            { label: 'Phone', value: pretty },
            { label: 'Where', value: source },
          ],
          message: 'They dropped their number in the hero and Mr. Mustard is calling them now about a voice agent. His transcript lands in the admin when the call ends.',
          suggestedAction: 'Read the transcript, then follow up personally if he did not book it',
        }),
      });
    } catch (err) {
      console.error('ring-me notify failed', err);
    }
  })();

  // 3. Ring them.
  const call = await placeInstantCallback({
    phone,
    source,
    intent: 'voice-agent',
  });

  await Promise.allSettled([
    notify,
    trackServerConversion(req, {
      eventName: 'Lead',
      phone,
      eventId: body.metaEventId,
      fbp: body.fbp,
      fbc: body.fbc,
      customData: { lead_source: source },
    }),
  ]);

  if (!call.ok) {
    console.error('ring-me call failed', call.reason, call.detail ?? '');
    return NextResponse.json({ ringing: false, reason: call.reason });
  }
  return NextResponse.json({ ringing: true });
}
