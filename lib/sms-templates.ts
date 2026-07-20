/**
 * Preloaded campaign copy. Every template here is written to survive a carrier
 * compliance review: plain ASCII (so it encodes as cheap single-segment GSM-7,
 * never UCS-2), names the sender and the business, stays conversational rather
 * than blast-shaped, and ends with the STOP opt-out line that A2P requires.
 *
 * Templates are the SAME token language the campaign engine renders per lead
 * (see renderTemplate in lib/sms-campaigns.ts), so a preset can be edited in the
 * builder before it is frozen onto each recipient.
 *
 * Tokens: {{business}} {{city}} {{sender}} {{score}} {{book}} {{link}}
 */

export const OPT_OUT_LINE = 'Reply STOP to opt out.';

export type SmsTemplate = {
  /** Stored on the campaign as template_key, so we know which preset produced it. */
  key: string;
  label: string;
  /** One line on when to reach for this one. */
  hint: string;
  /** True when the copy expects a {{link}}, so the builder can require the URL. */
  needsLink: boolean;
  body: string;
};

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    key: 'auto',
    label: 'Auto-personalized (Cahill)',
    hint: 'Best default. Each lead gets its own hook: the real audit score if we scored their site, otherwise the missed-calls angle for their business type.',
    needsLink: false,
    body: '',
  },
  {
    key: 'audit-offer',
    label: 'Free website breakdown',
    hint: 'Opens with the score we already pulled. Use on audited leads only.',
    needsLink: false,
    body:
      "Hi {{business}}, it's {{sender}} with Modern Mustard Seed here in {{city}}. " +
      'We scored your site a {{score}} out of 100 and found a few things costing you calls. ' +
      'Want the free 60-second breakdown? Reply YES and I will send it over. ' +
      OPT_OUT_LINE,
  },
  {
    key: 'missed-calls',
    label: 'Missed calls angle',
    hint: 'The workhorse cold opener. No audit needed, works on any local business.',
    needsLink: false,
    body:
      "Hi {{business}}, it's {{sender}} with Modern Mustard Seed. " +
      'Most shops in {{city}} lose a few jobs a week to calls that go to voicemail after hours. ' +
      'We build an AI receptionist that answers every one. Worth a look? Reply YES. ' +
      OPT_OUT_LINE,
  },
  {
    key: 'demo-link',
    label: 'Send a demo link',
    hint: 'For leads who asked to see it. Drops a real link they can tap.',
    needsLink: true,
    body:
      "Hi {{business}}, {{sender}} at Modern Mustard Seed. " +
      'Here is the demo we put together for you: {{link}} ' +
      'Give it a tap and reply with what you think. A human answers here. ' +
      OPT_OUT_LINE,
  },
  {
    key: 'book-call',
    label: 'Book a call',
    hint: 'Straight to the calendar. Best after a reply or a demo view.',
    needsLink: false,
    body:
      "Hi {{business}}, {{sender}} at Modern Mustard Seed. " +
      'Happy to walk you through what we would build and what it costs, no pitch. ' +
      'Grab any slot that works: {{book}} ' +
      OPT_OUT_LINE,
  },
  {
    key: 'follow-up',
    label: 'Soft follow-up',
    hint: 'Second touch when the first got no reply. Short, easy to ignore or answer.',
    needsLink: false,
    body:
      "Hi {{business}}, {{sender}} at Modern Mustard Seed again. " +
      'Circling back once in case this got buried. Still happy to send the free breakdown. ' +
      'Want it? Reply YES, or tell me to buzz off and I will. ' +
      OPT_OUT_LINE,
  },
  {
    key: 'reactivate',
    label: 'Reactivate a cold lead',
    hint: 'For leads that went quiet weeks ago. Leads with news, not a nag.',
    needsLink: true,
    body:
      "Hi {{business}}, {{sender}} at Modern Mustard Seed. " +
      'We shipped something since we last talked that I think fits you: {{link}} ' +
      'Worth two minutes? Reply and I will explain. ' +
      OPT_OUT_LINE,
  },
  {
    key: 'custom',
    label: 'Write my own',
    hint: 'Start from a blank compliant shell and write it yourself.',
    needsLink: false,
    body:
      "Hi {{business}}, it's {{sender}} at Modern Mustard Seed. " +
      '<your message here> ' +
      OPT_OUT_LINE,
  },
];

export function templateByKey(key: string): SmsTemplate | undefined {
  return SMS_TEMPLATES.find((t) => t.key === key);
}

/**
 * Compliance guard. Carriers expect an opt-out on campaign traffic, so a body
 * that lost its STOP line (hand-edited, most likely) gets it back rather than
 * shipping non-compliant. Matches any STOP phrasing, not just ours.
 */
export function ensureOptOut(body: string): string {
  const trimmed = body.trim();
  if (/\bstop\b/i.test(trimmed)) return trimmed;
  return `${trimmed} ${OPT_OUT_LINE}`.trim();
}

/**
 * Strips characters that would force the whole message into UCS-2 encoding,
 * which halves the segment budget to 70 chars and costs more per send. Curly
 * quotes and dashes are the usual culprits when copy is pasted from a doc.
 */
export function toGsmAscii(body: string): string {
  return body
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '');
}
