/**
 * What the "built while you watch" hero builds for each kind of business: the
 * site's headline, three services, and the conversation its AI receptionist
 * has with a customer. Sample content, labeled as a preview on the page.
 */

export type TradeKey = 'roofing' | 'landscaping' | 'salon' | 'restaurant' | 'builder' | 'cleaning' | 'shop';

export type Trade = {
  label: string;
  tagline: string;
  services: [string, string, string];
  cta: string;
  chat: [string, string, string, string];
  booked: string;
};

export const TRADES: Record<TradeKey, Trade> = {
  roofing: {
    label: 'Roofing',
    tagline: 'Roofs built to outlast the weather.',
    services: ['Roof replacement', 'Storm repair', 'Free inspections'],
    cta: 'Book an inspection',
    chat: ['Can someone look at my roof this week?', 'Absolutely. I have Thursday at 9:00 or Friday at 1:00. Which works?', 'Thursday.', 'Booked for Thursday at 9:00. A confirmation text is on its way.'],
    booked: 'New inspection booked · Thu 9:00',
  },
  landscaping: {
    label: 'Landscaping',
    tagline: 'Yards the whole street notices.',
    services: ['Lawn care', 'Garden design', 'Spring cleanup'],
    cta: 'Get a free quote',
    chat: ['Do you do weekly mowing?', 'We do. Want a free quote visit first? I have Tuesday at 10:00.', 'Yes please.', 'Done. Tuesday at 10:00 for your quote visit.'],
    booked: 'New quote visit · Tue 10:00',
  },
  salon: {
    label: 'Salon',
    tagline: 'Walk in tired. Walk out new.',
    services: ['Cut and style', 'Color', 'Blowouts'],
    cta: 'Book a chair',
    chat: ['Any openings Saturday?', 'Yes, 11:30 or 2:00 with Jess. Which one?', '2:00.', 'You are booked with Jess at 2:00 on Saturday. See you then.'],
    booked: 'New appointment · Sat 2:00',
  },
  restaurant: {
    label: 'Restaurant',
    tagline: 'A table worth the drive.',
    services: ['Dinner', 'Private events', 'Takeout'],
    cta: 'Reserve a table',
    chat: ['Table for four tonight?', 'I have 6:45 or 8:15 on the patio. Which do you like?', '6:45.', 'Reserved for four at 6:45. We will hold it fifteen minutes.'],
    booked: 'New reservation · 6:45 tonight',
  },
  builder: {
    label: 'Builder',
    tagline: 'Homes built to be lived in for generations.',
    services: ['Custom homes', 'Remodels', 'Additions'],
    cta: 'Start your build',
    chat: ['We want to build next spring. Where do we start?', 'With a site walk. I can book one with the owner Thursday afternoon.', 'Perfect.', 'Booked: site walk Thursday at 3:00. I sent a planning checklist.'],
    booked: 'New site walk · Thu 3:00',
  },
  cleaning: {
    label: 'Cleaning',
    tagline: 'Come home to clean.',
    services: ['Home cleaning', 'Move-out cleans', 'Vacation rentals'],
    cta: 'Book a clean',
    chat: ['Can you deep clean a three bedroom this week?', 'Yes. I can book Friday morning and text you the exact quote.', 'Book it.', 'Booked for Friday at 9:00. Your quote is on its way by text.'],
    booked: 'New clean booked · Fri 9:00',
  },
  shop: {
    label: 'Something else',
    tagline: 'Your neighborhood favorite, now open online.',
    services: ['Shop online', 'Local pickup', 'Gift cards'],
    cta: 'Visit us',
    chat: ['Are you open Sunday?', 'We are, 10 to 4. Want me to hold something for you?', 'Yes, the blue one.', 'It is on hold under your name until Sunday at 4.'],
    booked: 'New hold · Sunday pickup',
  },
};

export const TRADE_ORDER: TradeKey[] = ['roofing', 'landscaping', 'salon', 'restaurant', 'builder', 'cleaning', 'shop'];

/** Guess the trade from the name someone types, so the right site appears without a click. */
export function guessTrade(name: string): TradeKey | null {
  const n = name.toLowerCase();
  if (/roof|gutter|siding/.test(n)) return 'roofing';
  if (/lawn|landscap|yard|garden|tree|snow|turf|mow/.test(n)) return 'landscaping';
  if (/salon|hair|spa\b|nail|beauty|barber|lash|brow/.test(n)) return 'salon';
  if (/restaurant|cafe|café|bistro|grill|pizza|bar\b|kitchen|coffee|bakery|diner|taco|brew/.test(n)) return 'restaurant';
  if (/build|construct|homes?\b|remodel|contract|custom|framing|concrete/.test(n)) return 'builder';
  if (/clean|maid|janitor|wash|detail/.test(n)) return 'cleaning';
  return null;
}

/** "Flathead Roofing" becomes flatheadroofing.com for the pretend address bar. */
export function domainFor(name: string): string {
  const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '').slice(0, 28);
  return `${slug || 'yourbusiness'}.com`;
}
