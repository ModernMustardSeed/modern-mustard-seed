/**
 * REAL GOOGLE REVIEWS, COPIED OFF THE REAL PROFILE.
 *
 * Sarah 2026-08-08: *"add my google reviews to my landing page toward the
 * bottom."*
 *
 * ⛔ NOTHING IN THIS FILE IS WRITTEN BY US. Every entry is transcribed verbatim
 * from the live Google Business Profile (CID 8255098141806810627), read
 * 2026-08-08. A homepage that quotes a named person is the exact page where an
 * invented quote costs the most, and fabricated review content is an FTC
 * fake-review-rule problem on top of that. See [[mms-proof-testimonials]]: the
 * settled call is real quotes only, and hidden placeholders never go live.
 *
 * ⚠️ NO Review OR AggregateRating JSON-LD ANYWHERE NEAR THIS SECTION. Google
 * disallows self-serving review markup on your own organization, and the
 * downside is a structured-data manual action that suppresses rich results
 * SITEWIDE, which would take out the FAQ results on every guide and local page.
 * The rating belongs on the Google profile, where Google sources it itself.
 * (Removed once already from ProofBand on 2026-07-27. Do not add it back here.)
 *
 * To refresh: open the profile, read the reviews tab, and transcribe. Adding a
 * second entry needs no layout work; the band grids at two or more.
 */
import { googleProfileUrl, googleReviewUrl } from '@/data/socials';

export type GoogleReview = {
  /** Exactly as Google displays it. Never expand an initial into a full name. */
  name: string;
  stars: 1 | 2 | 3 | 4 | 5;
  /** Month and year, since Google's own "2 weeks ago" goes stale on the page. */
  when: string;
  text: string;
};

export const GOOGLE_PROFILE = {
  rating: '5.0',
  count: 3,
  /** The public listing. Opens the profile with its reviews. */
  profileUrl: googleProfileUrl,
  /** One tap straight into the review box, not the listing. */
  writeUrl: googleReviewUrl,
  /**
   * Re-read on the live profile 2026-09-22: 5.0 across three public reviews,
   * all five stars. Surfaces show the rating and the reviews, never the count.
   */
  readAt: '2026-09-22',
};

export const GOOGLE_REVIEWS: GoogleReview[] = [
  {
    name: 'Easton Parker',
    stars: 5,
    when: 'September 2026',
    text:
      'Modern mustard seed has the best customer service and thoroughness of any company I’ve used for my websites and AI agents. They are Very professional, quick and reliable. I waited to make this because I wanted to see how they handled everything over time and I’ve been using them for 2 months now, last week I wanted to add in an extra automated quote feature to my website along with the AI agent being able to walk my clients through the project process and answer any questions they may have.  I reached out to them on a Tuesday morning, and by the time I went to sleep that night, my AI agent and website were already updated and running smoothly.',
  },
  {
    name: 'Jaxson Smitty',
    stars: 5,
    when: 'September 2026',
    text:
      'Sarah’s team worked with us several months ago on a project for my company integrating AI into 3 aspects of my business.  Since then I have closed 80% more deals and the best part is I havre more time to grow the business. We will be implementing more soon. Thank you Modern Mustard Seed!!',
  },
  {
    name: 'Beverly P.',
    stars: 5,
    when: 'July 2026',
    text:
      'The website and app they built exceeded our expectations! Our new back office saved my team from drowning, and now days of work is literally only thirty minutes. Super helpful & quick with my million questions- thank you!!',
  },
];
