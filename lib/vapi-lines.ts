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
 * The outbound line IS the studio line, and that is the finished answer after
 * trying both alternatives on 2026-08-18.
 *
 * ⚠️ THE DAILY OUTBOUND CAP IS PER ACCOUNT, NOT PER NUMBER. This is the fact
 * everything else follows from, and it was measured, not assumed: a second Vapi
 * number that had placed ZERO calls that day was refused with the identical
 * error the moment the account's ten were gone. So splitting callbacks onto
 * their own number buys exactly nothing, and buying more numbers buys nothing
 * either. Vapi will not sell more free ones anyway ("You have reached the
 * maximum number of free phone numbers").
 *
 * Since a second number adds no capacity, it only costs identity, so calls go
 * out on the number that is printed on the website. Somebody who gets rung sees
 * the same number they would have dialled, and calling it back reaches him.
 *
 * Twilio was tried first and reverted the same hour. Sarah's account is on a
 * TRIAL, so an inbound call opened with Twilio's own recorded notice and a
 * "press any key" before the agent ever spoke, and she does not want a third
 * vendor billing per call. An upgraded Twilio account removes both the notice
 * and the cap, and that is the ONLY way past ten a day short of a Vapi plan
 * change. Inbound has never been capped on any of this.
 */
export const CALLBACK_NUMBER = STUDIO_NUMBER;
export const CALLBACK_NUMBER_E164 = STUDIO_NUMBER_E164;

/** Env wins, so a line can be swapped in an emergency without a deploy. */
export const CALLBACK_NUMBER_ID =
  real(process.env.VAPI_CALLBACK_NUMBER_ID) || '462f988d-ce3a-4961-b652-dfc1fb1ac5d0';
