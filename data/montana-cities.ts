import { SITE } from '@/lib/seo';

/**
 * THE FLATHEAD VALLEY FLEET: one local landing page per city at /montana/[city].
 *
 * Why this exists: as of 2026-07-25 the site had ~116 indexable URLs and not ONE
 * of them targeted a place. Every product page competed nationally against
 * venture-funded competitors for terms like "voice agent," which is not a
 * winnable fight. "Web design Kalispell" and "AI phone answering Whitefish" are.
 *
 * ⚠️ THE DOORWAY-PAGE RULE. Google demotes near-duplicate city pages where only
 * the place name is swapped, and rightly so. Every city below therefore carries
 * its OWN economy, its OWN reason the phone goes unanswered, and its OWN FAQ
 * answers. If you add a city, you must write real copy for it. Do not clone a
 * neighbor and change the name. If you cannot say something true and specific
 * about how business actually works there, that city does not get a page.
 *
 * Everything here is qualitative and verifiable. No invented statistics, no
 * fake customer counts, no "97% of businesses in Kalispell..." numbers. We do
 * not have that data and neither does anyone else.
 */

export type MontanaCity = {
  slug: string;
  /** "Kalispell" */
  name: string;
  /** "Kalispell, MT" for titles */
  nameWithState: string;
  /** Where it sits, in one honest line. */
  locale: string;
  /** What the local economy actually runs on. */
  economy: string;
  /** The specific reason calls get missed HERE. This is the whole page. */
  phoneProblem: string;
  /** The seasonal shape of the year, which drives staffing pain. */
  season: string;
  /** Businesses that most obviously benefit, named honestly. */
  fits: string[];
  /** Neighboring towns this page legitimately serves. */
  alsoServes: string[];
  /** Approximate center, for LocalBusiness geo on the page. */
  lat: number;
  lng: number;
};

export const MONTANA_CITIES: MontanaCity[] = [
  {
    slug: 'kalispell',
    name: 'Kalispell',
    nameWithState: 'Kalispell, MT',
    locale: 'the Flathead County seat and the commercial center of the valley',
    economy:
      'Kalispell is where the valley does business. It carries the regional hospital, the airport, the big retail corridor along Highway 93, and most of the contractors, suppliers, and professional offices that serve every town from Polson to the Canadian border. If a trade works in the Flathead, there is a good chance it is dispatched from Kalispell.',
    phoneProblem:
      'The Kalispell problem is windshield time. A contractor here does not work one town, they work the whole valley, which means an hour of driving between a job in Lakeside and a bid in Columbia Falls. The phone rings while you are on 93 with a trailer behind you, and the person calling is getting quotes from three companies that morning. Whoever picks up first usually wins the job, and it is almost never the one driving.',
    season:
      'Kalispell has the steadiest year in the valley, but it still swings: construction and trades compress into the building season, retail and medical stay busy year round, and the fall shoulder is when everyone finally tries to catch up on the office work they ignored all summer.',
    fits: [
      'Contractors and trades dispatching across the valley',
      'Medical, dental, and professional offices',
      'Retail and service businesses on the 93 corridor',
      'Real estate and property management',
    ],
    alsoServes: ['Evergreen', 'Somers', 'Lakeside', 'Creston'],
    lat: 48.1958,
    lng: -114.3129,
  },
  {
    slug: 'whitefish',
    name: 'Whitefish',
    nameWithState: 'Whitefish, MT',
    locale: 'the resort town at the base of Whitefish Mountain Resort',
    economy:
      'Whitefish runs on visitors and on the people who own second homes here. Restaurants, lodging, short-term rentals, guides and outfitters, galleries, salons, and the whole trade layer that maintains houses lived in eight weeks a year. It is the most design-conscious market in the valley, and the customer expectations match.',
    phoneProblem:
      'Whitefish gets called from other time zones. A family in Chicago books a trip at nine at night their time, which is seven here, and a homeowner in California calls about a frozen pipe on a Sunday. The caller is not local, has no loyalty yet, and is working down a list of search results. Voicemail from a business they have never used reads as closed, and they simply call the next one.',
    season:
      'Two peaks and two dead spots. Ski season and high summer both run flat out, then April and November empty the town. That shape makes a front desk almost impossible to staff honestly: hire for the peak and you carry payroll through mud season, staff for the average and you drop calls exactly when the money is on the phone.',
    fits: [
      'Restaurants, lodging, and short-term rental managers',
      'Guides, outfitters, and tour operators',
      'Property managers and caretakers for second homes',
      'Salons, spas, and appointment-based services',
    ],
    alsoServes: ['Olney', 'Coram', 'the Big Mountain corridor'],
    lat: 48.4111,
    lng: -114.3376,
  },
  {
    slug: 'columbia-falls',
    name: 'Columbia Falls',
    nameWithState: 'Columbia Falls, MT',
    locale: 'the gateway town on the road to the west entrance of Glacier National Park',
    economy:
      'Columbia Falls sits where working Montana meets park tourism. It kept a real trades and light-manufacturing backbone while the highway through town turned into the main artery for millions of Glacier visitors a year. The result is a split economy: crews and shops that serve locals year round, and businesses that make their year between June and September.',
    phoneProblem:
      'Here the phone rings from two directions at once and both go unanswered for the same reason: the people who own these businesses are doing the work themselves. A crew is out in the field with no cell service up the North Fork, and meanwhile a visitor two hours from the park entrance is calling about a rental, a repair, or a table. Neither caller waits, and the field crew cannot exactly stop pouring concrete to take a booking.',
    season:
      'The park sets the calendar. Going-to-the-Sun Road opening and closing are the real fiscal quarters here, and the summer surge lands on the same small crews who handle the quiet winter. There is no seasonal front desk to hire, so the overflow goes to voicemail.',
    fits: [
      'Trades, excavation, and construction crews working in the field',
      'Vacation rentals and lodging near the park corridor',
      'Restaurants and seasonal retail',
      'Auto, equipment, and repair shops',
    ],
    alsoServes: ['Hungry Horse', 'Martin City', 'West Glacier', 'Coram'],
    lat: 48.3722,
    lng: -114.1817,
  },
  {
    slug: 'bigfork',
    name: 'Bigfork',
    nameWithState: 'Bigfork, MT',
    locale: 'the village on the northeast shore of Flathead Lake',
    economy:
      'Bigfork is a small village with an outsized reputation: galleries, the summer playhouse, restaurants people drive from Kalispell for, marinas, and the trades that keep lakefront property standing. Most businesses here are one owner, maybe a couple of employees, and the owner is on the floor.',
    phoneProblem:
      'Bigfork businesses are small enough that the person who answers the phone is the person doing the work. When the gallery owner is hanging a show or the shop is three deep at the counter, the phone is simply not going to get answered, and in a village this size the caller often just drives to the next town instead. Missing a call here is not an inconvenience, it is the whole ticket walking to Kalispell.',
    season:
      'The most extreme swing in the valley. Summer packs the village and the lake, then the off-season empties it to the point where some businesses close outright. A single owner cannot cover a July phone volume and also justify staff in February.',
    fits: [
      'Galleries, boutiques, and village retail',
      'Restaurants and seasonal hospitality',
      'Marinas, boat services, and lake trades',
      'Landscaping, caretaking, and lakefront property services',
    ],
    alsoServes: ['Ferndale', 'Woods Bay', 'Swan Lake', 'Creston'],
    lat: 48.0633,
    lng: -114.0725,
  },
  {
    slug: 'polson',
    name: 'Polson',
    nameWithState: 'Polson, MT',
    locale: 'the town at the south end of Flathead Lake, in the Mission Valley',
    economy:
      'Polson anchors the south lake and the Mission Valley, where agriculture, cherry orchards, lake tourism, and a steady local trade economy all overlap. It serves a genuinely spread-out area, and businesses here routinely drive a long way to reach a customer.',
    phoneProblem:
      'Distance is the issue in the Mission Valley. Service areas are wide, drive times are long, and a business owner can lose most of a day to two calls at opposite ends of the lake. Every mile driven is a mile not spent near a phone, and a caller who reaches voicemail at a business forty minutes away has very little reason to wait for a callback.',
    season:
      'Summer on the lake and the cherry harvest stack the calendar, agriculture sets its own rhythm, and the winter is genuinely quiet. The busy weeks are the ones where nobody has a spare minute to answer a phone, which is also when the calls are worth the most.',
    fits: [
      'Trades and services covering a wide rural area',
      'Agriculture, orchards, and equipment services',
      'Lake tourism, rentals, and marinas',
      'Clinics, offices, and appointment-based businesses',
    ],
    alsoServes: ['Ronan', 'Pablo', 'Big Arm', 'Charlo'],
    lat: 47.6935,
    lng: -114.163,
  },
];

export const getCity = (slug: string) => MONTANA_CITIES.find((c) => c.slug === slug) ?? null;
export const cityPaths = () => MONTANA_CITIES.map((c) => `/montana/${c.slug}`);

/**
 * FAQ per city. Written per-city on purpose (see the doorway rule above): the
 * answers reference that city's actual economy and service area, so the FAQPage
 * schema on each page is genuinely distinct rather than a find-and-replace.
 */
export function cityFaqs(city: MontanaCity): { q: string; a: string }[] {
  return [
    {
      q: `Do you actually work with businesses in ${city.name}?`,
      a: `Yes. Modern Mustard Seed is based in Kalispell, ${city.slug === 'kalispell' ? 'so this is home' : `about a ${driveTime(city)} drive from ${city.name}`}, and we work across the Flathead Valley including ${city.alsoServes.slice(0, 3).join(', ')}. You can call us at ${SITE.phone} and talk to a person, or to the voice agent after hours, which is one of the things we build.`,
    },
    {
      q: `How much does a website cost in ${city.name}?`,
      a: `The productized website is $497 to set up and $97 a month, which covers the domain, hosting, care, and the business command center. That is the same price whether you are in ${city.name} or anywhere else: we do not price by zip code. Larger custom builds (booking systems, an embedded CRM, a store) are scoped and quoted after a free call. Month to month, cancel anytime, and no trials.`,
    },
    {
      q: `Will a voice agent sound right for a ${city.name} business?`,
      a: `It is trained on your business specifically: your services, your hours, your service area, and how you talk about the work. ${city.phoneProblem.split('. ')[0]}. The voice agent answers in that gap. The fastest way to judge it is to hear it, so forge a free demo and it will answer as your business in about a minute.`,
    },
    {
      q: `What happens to calls that come in after hours in ${city.name}?`,
      a: `That is exactly the gap this closes. ${city.season} The voice agent answers every hour of every day, books the appointment, takes the message, flags the emergencies, and texts you a summary when the call ends. Nothing goes to voicemail unless you want it to.`,
    },
    {
      q: `Can I see something before I pay anything?`,
      a: `Yes, and you should. Enter your business once at the demo station and you get three working demos free: a voice agent you can talk to, a website designed from scratch for your business, and a command center wired to both. No card, no meeting, no sales call to sit through. Keep what you love or keep nothing.`,
    },
  ];
}

/** Honest, rounded drive times from Kalispell. Used only in FAQ prose. */
function driveTime(city: MontanaCity): string {
  switch (city.slug) {
    case 'whitefish':
      return '20 minute';
    case 'columbia-falls':
      return '20 minute';
    case 'bigfork':
      return '30 minute';
    case 'polson':
      return 'an hour';
    default:
      return 'short';
  }
}
