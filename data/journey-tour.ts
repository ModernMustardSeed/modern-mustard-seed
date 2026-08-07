/**
 * AVA'S SCRIPT FOR THE FLATHEAD JOURNEY LANDING PAGE.
 *
 * Hand-written like data/mms-tour.ts, and for the same reason: this is OUR
 * copy on OUR site, and extraction would flatten it. Same house rules: no em
 * dashes, no hedging, no prices. Her job is to drive the car; Mr. Mustard is
 * allowed to talk numbers.
 *
 * ⛔ THE CLOSE IS THE POINT. She is pre-recorded and one-way; he is live. The
 * last beat hands the visitor to the button in the corner, always.
 *
 * Rebuild the audio after editing: node scripts/site-tour/build-journey.mjs
 */
export type JourneyTourBeat = { id: string; anchor: string; text: string };

export const JOURNEY_TOUR: JourneyTourBeat[] = [
  {
    id: 'welcome',
    anchor: 'top',
    text:
      'Welcome to Modern Mustard Seed. Hop in, the top is down. ' +
      'We are taking the scenic route, and by the end of this drive you will know exactly what we can grow for you. ' +
      'Scroll when you are ready.',
  },
  {
    id: 'orchard',
    anchor: 'tour-orchard',
    text:
      'First, the orchards. Everything we build starts the same three ways: a website that talks, a voice agent that answers, and the command center that runs them both. ' +
      'Planted once, tended every day, and live in about a week.',
  },
  {
    id: 'signs',
    anchor: 'tour-signs',
    text:
      'Now watch the roadside. Every sign out here is something real that you can walk into today. ' +
      'The Talking Website, voice sidekicks, commercials, and free tools you can try before you spend a single dollar.',
  },
  {
    id: 'gate',
    anchor: 'tour-gate',
    text:
      'There it is. The gate at Mustard Seed Ranch. ' +
      'Everything this studio does comes from one verse about one seed, and this is the ground where we plant it.',
  },
  {
    id: 'planting',
    anchor: 'tour-planting',
    text:
      'The smallest seed in the field. That is how every great business starts. Including yours.',
  },
  {
    id: 'tree',
    anchor: 'tour-tree',
    text:
      'And this is how it grows. A tree the birds come home to. ' +
      'Your customers, your calls, your bookings, all finding their way back to you, day and night.',
  },
  {
    id: 'doors',
    anchor: 'tour-doors',
    text:
      'Four doors, and every one of them is open. ' +
      'Press the gold button in the corner and talk to Mr. Mustard right now. He can answer anything about how this works, show you a live demo, forge a custom demo for your business while you watch, or book you straight onto Sarah’s calendar. ' +
      'The drive is over. The growing starts now.',
  },
];
