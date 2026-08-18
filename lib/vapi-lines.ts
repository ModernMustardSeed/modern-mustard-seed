/**
 * THE TWO PHONE LINES, IN ONE PLACE.
 *
 * Mr. Mustard answers one number and calls out on another, and until
 * 2026-08-18 that fact was spread across four files as copied ids, which is
 * how the outbound line silently stayed on a capped number in two of them.
 *
 * ── WHY THERE ARE TWO ────────────────────────────────────────────────────────
 * A number PROVISIONED INSIDE VAPI stops placing outbound calls after ten per
 * UTC day. Inbound is untouched. On 2026-08-18 a real visitor filling in
 * /mustard was the eleventh outbound call of the day and her callback never
 * happened: "Numbers Bought On Vapi Have A Daily Outbound Call Limit. Import
 * Your Own Twilio Numbers To Scale Without Limits."
 *
 * So the studio's published line stays where it is, and every outbound call
 * moves to an imported TWILIO number, which has no such cap. Proved by placing
 * a call through it on the same day the studio line was refusing everything.
 *
 * ⚠️ Both numbers are spoken out loud by the agent (see the "Your two lines"
 * section in scripts/setup-vapi-mustard.mjs). If an id or a number changes
 * here, that prompt changes in the same commit, or he reads a number that does
 * not reach him.
 */

const real = (...values: (string | undefined)[]): string => {
  for (const v of values) {
    const t = (v ?? '').trim();
    if (t && !/^\[SENSITIVE\]$/i.test(t)) return t;
  }
  return '';
};

/** The published line. On the website, on his business card, inbound only. */
export const STUDIO_NUMBER = '(406) 312-1223';
export const STUDIO_NUMBER_E164 = '+14063121223';

/**
 * THE OUTBOUND LINE, AND WHY IT IS NOT THE STUDIO LINE.
 *
 * Sarah's own Twilio number, imported into Vapi on 2026-08-18 and attached to
 * Mr. Mustard, so a person who calls back the number that rang them reaches him.
 * Every outbound call he places goes out on it.
 *
 * ⚠️ THE VAPI DAILY OUTBOUND CAP IS PER ACCOUNT, NOT PER NUMBER, and that fact
 * is why this exists. Measured, not assumed: a second VAPI number that had
 * placed ZERO calls that day was refused with the identical
 * "Numbers Bought On Vapi Have A Daily Outbound Call Limit" error the moment the
 * account's ten were gone. So no arrangement of Vapi numbers raises the ceiling,
 * and Vapi will not sell more free ones anyway. An IMPORTED carrier number is
 * outside that accounting entirely, which was proved by placing a call through
 * this line on a day when the Vapi numbers were still refusing everything.
 *
 * The earlier attempt with Huck's Twilio number failed for a reason that had
 * nothing to do with any of this: that account was on a TRIAL, so inbound calls
 * opened with Twilio's own recorded notice and a "press any key" before the
 * agent spoke. This account is type Full and active, so no notice.
 *
 * Inbound has never been capped on any line. The studio number keeps answering
 * as it always has, and it stays the number printed on the website.
 */
export const CALLBACK_NUMBER = '(406) 709-6593';
export const CALLBACK_NUMBER_E164 = '+14067096593';

/** Env wins, so a line can be swapped in an emergency without a deploy. */
export const CALLBACK_NUMBER_ID =
  real(process.env.VAPI_CALLBACK_NUMBER_ID) || '93647a40-4eff-4ac7-9ada-a57f7a9f1f5b';
