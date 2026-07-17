import { smsConfigured } from '@/lib/sms';
import TextBack from '@/components/TextBack';

/**
 * Server gate for the TEXT-BACK widget: the site must never show a "text me"
 * button that cannot text. Renders nothing until Twilio is fully armed
 * (account + sender). Note: env is read at build/render time, so after adding
 * the Twilio vars in Vercel a redeploy is what turns the widget on.
 */
export default function TextBackGate() {
  if (!smsConfigured()) return null;
  return <TextBack />;
}
