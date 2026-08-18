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
 * The outbound line. Same 406 exchange as the studio number, one digit group
 * apart, and attached to Mr. Mustard in Vapi so a person who calls back the
 * number that rang them reaches him rather than a dead end.
 *
 * ⚠️ IT IS A VAPI NUMBER, NOT TWILIO, AND THAT IS DELIBERATE. The Twilio route
 * was tried first and reverted within the hour on 2026-08-18. Two reasons, both
 * Sarah's: her Twilio account is still a TRIAL, so every inbound call opened
 * with Twilio's own recorded notice and a "press any key" before Mr. Mustard
 * ever spoke, which is a terrible first impression on a sales line; and she does
 * not want a third vendor billing per call when Vapi already provides numbers.
 *
 * The cost of staying inside Vapi is the ten-outbound-calls-per-day cap that
 * every Vapi-provisioned number carries. That is why this is a SEPARATE number
 * from the studio line: the two caps do not share, so callbacks can burn their
 * ten without touching the line people actually dial, and inbound is never
 * capped on either.
 *
 * This number was idle. It was pointing at assistant ebf00e6e, which returns a
 * 404, so it had been answering for a deleted agent. Vapi refuses to hand out
 * more free numbers on this plan ("You have reached the maximum number of free
 * phone numbers"), so when ten callbacks a day is no longer enough the choices
 * are: take Twilio off trial and import a number, or move up a Vapi plan.
 */
export const CALLBACK_NUMBER = '(406) 312-1316';
export const CALLBACK_NUMBER_E164 = '+14063121316';

/** Env wins, so a line can be swapped in an emergency without a deploy. */
export const CALLBACK_NUMBER_ID =
  real(process.env.VAPI_CALLBACK_NUMBER_ID) || 'a87446b2-8308-48ce-b384-a75038138982';
