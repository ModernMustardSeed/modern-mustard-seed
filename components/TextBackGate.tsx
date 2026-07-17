import { smsConfigured } from '@/lib/sms';
import TextBack from '@/components/TextBack';

/**
 * Sarah's cell, approved for the public tap-to-text fallback (2026-07-17). This
 * is where a "Text us" tap on the contact page opens the visitor's Messages app
 * until Twilio A2P is registered and the automated sender takes over.
 */
const TAP_TEXT_NUMBER = '+14062506076';

/**
 * Server gate for the TEXT-BACK widget. Two modes, decided here:
 *  - Twilio armed (smsConfigured): the automated widget that texts the visitor
 *    from our number and logs the thread in the cockpit.
 *  - not armed yet: a tap-to-text deep link to Sarah's cell, so the widget is
 *    useful today with zero registration.
 * Env is read at render time, so once the Twilio vars are set in Vercel, a
 * redeploy flips the widget from tap-to-text to the automated sender on its own.
 */
export default function TextBackGate() {
  const mode = smsConfigured() ? 'auto' : 'tap';
  return <TextBack mode={mode} tapNumber={TAP_TEXT_NUMBER} />;
}
