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
      'First, the orchards. We grow four things: a website that talks, a voice agent that answers, the command center that runs them both, and custom software when your idea needs its own row. ' +
      'Full apps, stores, agentic systems. Planted once, tended every day, and the first three go live in about a week.',
  },
  {
    id: 'signs',
    anchor: 'tour-signs',
    text:
      'Now watch the roadside. Every sign out here is something real that you can walk into today. ' +
      'The Talking Website, voice sidekicks, commercials, and free tools you can try before you spend a single dollar.',
  },
  {
    id: 'square',
    anchor: 'tour-square',
    text:
      'Pull over a second, because this is the part nobody tells you. The town square moved onto the internet, and being found in it is its own trade. ' +
      'We wire up your Google Business Profile, we collect and answer your reviews for you, and we put the same true facts about you everywhere people look now, right down to the AI they ask instead of searching. ' +
      'Then the quieter half: one obvious next move on every page, and a follow up that runs without you. All of it inside a Talking Website, and none of it a line item.',
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
  // ⚠️ NO COMMENTS INSIDE A BEAT OBJECT. build-journey.mjs matches
  // `id` then `anchor` then `text` with \s* between them, so a comment line in
  // the middle drops the whole beat from the render with no error at all.
  // Caught 2026-08-08 when this stop rendered as eight beats instead of nine.
  {
    id: 'reviews',
    anchor: 'tour-reviews',
    text:
      'Before you go, the word around town. This is real, and it lives on Google, where we cannot edit a word of it. ' +
      'And the review system running underneath it is the same one we install for you.',
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
