/**
 * THE HOSTESS SCRIPT FOR OUR OWN FRONT DOOR.
 *
 * Sarah 2026-08-07: *"i want you to make the same thing for modern mustard
 * seed. i want the girl voice for the tour still, i like the handoff... i love
 * how it suggests to call mr mustard, as it can answer any questions, and can
 * book a call with us."*
 *
 * ⚠️ WRITTEN BY HAND, unlike a forged client site.
 *
 * `lib/site-tour.mjs` extracts a client's tour from their own markup because we
 * must never put a sentence in a stranger's mouth. That constraint does not
 * apply here: this is OUR copy, on OUR site, and Sarah's brand voice is the
 * product. Extraction would flatten it into something merely accurate. Every
 * line below is either lifted verbatim from the page it sits on or written to
 * sound like the person who wrote the rest.
 *
 * House rules that apply: no em dashes, no hedging, and no price. The tour's
 * only job is to make them want the thing and then hand them to Mr. Mustard,
 * who is allowed to talk numbers.
 *
 * ⛔ THE CLOSE IS THE POINT. She is one-way and pre-recorded; he is live and can
 * actually take their name. Ending anywhere but the handoff wastes the visit.
 */
export type MmsTourBeat = { id: string; anchor: string; text: string };

export const MMS_TOUR: MmsTourBeat[] = [
  {
    id: 'welcome',
    anchor: 'top',
    text:
      'Welcome to Modern Mustard Seed. We build websites, voice agents, and the command centers that run them, and they go live in about a week. ' +
      'Let me show you around. This takes about a minute.',
  },
  {
    id: 'flagship',
    anchor: 'tour-flagship',
    text:
      'Start with the flagship. A voice agent, a website, and the brain that runs them. ' +
      'Tell us about your business and we forge all three before you pay anything, in about a minute. Keep whatever you love.',
  },
  {
    id: 'build',
    anchor: 'tour-build',
    text:
      'Everything here is fixed scope and fixed quote, agreed before the work starts. ' +
      'No hourly billing, and no surprise at the end.',
  },
  {
    id: 'doors',
    anchor: 'tour-doors',
    text:
      'There are three ways in, depending on how much you want to hand over. ' +
      'Sarah answers you personally, and fast. And Mr. Mustard, the studio AI, is on call around the clock in between.',
  },
  {
    id: 'close',
    anchor: 'tour-close',
    text:
      'Your idea deserves to ship. One person with the right tools can now build what used to take a team of fifty, so bring the seed you have. ' +
      'And you do not have to wait for me. Press the button in the corner and talk to Mr. Mustard right now. ' +
      'He can answer anything about how this works, scope your idea on the spot, and book you straight onto Sarah’s calendar.',
  },
];
