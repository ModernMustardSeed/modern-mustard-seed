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
 * The outbound line: Twilio, imported into Vapi, no daily cap. Attached to Mr.
 * Mustard in Vapi as well, so a person who calls back the number that rang them
 * reaches him rather than a dead end. It used to be Huck's, the parked Hatchery
 * mascot.
 */
export const CALLBACK_NUMBER = '(406) 747-0139';
export const CALLBACK_NUMBER_E164 = '+14067470139';

/** Env wins, so a line can be swapped in an emergency without a deploy. */
export const CALLBACK_NUMBER_ID =
  real(process.env.VAPI_CALLBACK_NUMBER_ID) || '7ae36c4d-e877-45d4-8d96-5d2058be8c07';
