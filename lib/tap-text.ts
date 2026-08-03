/**
 * Tap-to-text: send a personalized text from Sarah's OWN phone, with the whole
 * message already written.
 *
 * Why this exists instead of Twilio. Sending texts from an application to a US
 * handset requires A2P 10DLC registration with the carriers, which is a
 * carrier-level rule every provider enforces (Twilio, Telnyx, Bandwidth, all of
 * them). MMS spent weeks stuck in that vetting queue and the whole SMS stack was
 * retired 2026-08-01.
 *
 * A message that genuinely leaves from a human's own phone is person-to-person,
 * not application-to-person, so none of that applies. This module builds an
 * `sms:` deep link carrying a pre-written body. The admin taps it, their Messages
 * app opens with the number and text already filled in, and they hit send. Zero
 * registration, zero cost, and it cannot be carrier-filtered.
 *
 * The tradeoff, stated plainly: a human taps send, and replies land in that
 * human's phone rather than threading back into the cockpit. We log the touch on
 * our side so the follow-up loop still knows the lead was worked.
 */

/** Strip a US phone down to E.164 (+1XXXXXXXXXX). Returns null if unusable. */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // Already international, or something we should not guess at.
  if (phone.trim().startsWith('+') && digits.length > 10) return `+${digits}`;
  return null;
}

/** Pretty US display form, e.g. (406) 250-6076. Falls back to the raw input. */
export function displayPhone(phone: string | null | undefined): string {
  const e164 = toE164(phone);
  if (!e164 || !e164.startsWith('+1') || e164.length !== 12) return phone?.trim() || '';
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/**
 * Build the `sms:` deep link.
 *
 * The `?&body=` separator is deliberate and is NOT a typo. iOS historically
 * wanted `&body=` while Android wanted `?body=`; `?&body=` is the one form both
 * parse correctly, and it is what shipped and was verified on the old /contact
 * tap-to-text card. Do not "clean it up" to a single `?`.
 */
export function smsHref(phone: string | null | undefined, body: string): string | null {
  const e164 = toE164(phone);
  if (!e164) return null;
  return `sms:${e164}?&body=${encodeURIComponent(body)}`;
}

/**
 * There is deliberately no segment counter here. Segment math mattered when
 * Twilio billed per segment; a text leaving a personal unlimited plan costs the
 * same whether it is one segment or three. `lib/lead-text.ts` still counts them
 * for the cold-outreach templates it owns.
 *
 * Scrubbing to ASCII is still worth doing, though, and not for cost: curly
 * quotes, em dashes and ellipses dragged in by a rich-text paste render
 * inconsistently across handsets. This flattens them.
 */
export function toAscii(body: string): string {
  return body
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x00-\x7F]/g, '');
}
