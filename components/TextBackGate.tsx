import { smsSendable } from '@/lib/sms';
import TextBack from '@/components/TextBack';

/**
 * Sarah's cell, approved for the public tap-to-text fallback (2026-07-17). This
 * is where a "Text us" tap on the contact page opens the visitor's Messages app
 * until Twilio A2P is registered and the automated sender takes over.
 */
const TAP_TEXT_NUMBER = '+14062506076';

/**
 * Server gate for the TEXT-BACK widget. Two modes, decided here:
 *  - Twilio armed AND A2P approved (smsSendable): the automated widget that
 *    texts the visitor from our number and logs the thread in the cockpit.
 *  - anything less: a tap-to-text deep link to Sarah's cell, so the widget is
 *    useful today with zero registration.
 * The gate is smsSendable, not smsConfigured, on purpose: with credentials set
 * but the A2P campaign still pending, every automated send is carrier-bounced
 * (error 30034) and the visitor sees a failure. Tap-to-text always works, so it
 * stays until carriers actually accept our traffic.
 * Env is read at render time, so setting SMS_A2P_READY=true in Vercel and
 * redeploying flips the widget to the automated sender on its own.
 */
export default function TextBackGate() {
  const mode = smsSendable() ? 'auto' : 'tap';
  return <TextBack mode={mode} tapNumber={TAP_TEXT_NUMBER} />;
}
