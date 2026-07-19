import { TRADE_PRESETS, VOICE_SERVICES, TICKET_WORD, type OsTradeKey } from '@/data/demo-os-trades';

/**
 * The receptionist trade fleet: one landing page per trade at
 * /voice-agents/[slug], rendered entirely from the trade intelligence that
 * already powers the forged OS demos (TRADE_PRESETS). No invented facts:
 * ticket values, services, and board names come from the same source the
 * demos use, and sample data is labeled as sample on the page.
 *
 * RELEASE GATE: only slugs in LIVE_TRADE_SLUGS render (dynamicParams=false
 * 404s the rest) and only live slugs enter the sitemap. Sarah approves the
 * template on the first live trade, then the fleet ships by adding slugs
 * here (or swapping in ALL_TRADE_SLUGS).
 */

export type TradePage = {
  slug: string;
  key: OsTradeKey;
  /** Reads naturally after "AI receptionist for ..." */
  forWord: string;
};

export const TRADE_PAGES: TradePage[] = [
  { slug: 'roofers', key: 'roofing', forWord: 'Roofers' },
  { slug: 'hvac', key: 'hvac', forWord: 'HVAC Companies' },
  { slug: 'plumbers', key: 'plumbing', forWord: 'Plumbers' },
  { slug: 'electricians', key: 'electrical', forWord: 'Electricians' },
  { slug: 'restoration', key: 'restoration', forWord: 'Restoration Crews' },
  { slug: 'septic', key: 'septic', forWord: 'Septic Companies' },
  { slug: 'towing', key: 'towing', forWord: 'Towing Operators' },
  { slug: 'locksmiths', key: 'locksmith', forWord: 'Locksmiths' },
  { slug: 'garage-doors', key: 'garage_door', forWord: 'Garage Door Companies' },
  { slug: 'tree-service', key: 'tree_service', forWord: 'Tree Services' },
  { slug: 'landscapers', key: 'landscaping', forWord: 'Landscapers' },
  { slug: 'pools', key: 'pool_spa', forWord: 'Pool and Spa Companies' },
  { slug: 'pest-control', key: 'pest_control', forWord: 'Pest Control Companies' },
  { slug: 'painters', key: 'painting', forWord: 'Painters' },
  { slug: 'movers', key: 'moving', forWord: 'Moving Companies' },
  { slug: 'cleaning', key: 'cleaning', forWord: 'Cleaning Companies' },
  { slug: 'auto-shops', key: 'auto_repair', forWord: 'Auto Shops' },
  { slug: 'med-spas', key: 'medspa', forWord: 'Med Spas' },
  { slug: 'dentists', key: 'dental', forWord: 'Dental Offices' },
  { slug: 'vets', key: 'vet', forWord: 'Veterinary Clinics' },
  { slug: 'law-firms', key: 'attorney', forWord: 'Law Firms' },
  { slug: 'wedding-venues', key: 'wedding', forWord: 'Wedding Venues and Vendors' },
  { slug: 'salons', key: 'salon', forWord: 'Salons and Barbers' },
  { slug: 'bakeries', key: 'cafe_bakery', forWord: 'Cafes and Bakeries' },
  { slug: 'restaurants-247', key: 'restaurant', forWord: 'Restaurants' },
  { slug: 'real-estate-teams', key: 'real_estate', forWord: 'Real Estate Teams' },
  { slug: 'home-services', key: 'home_services', forWord: 'Home Service Pros' },
  { slug: 'professional-offices', key: 'professional', forWord: 'Professional Offices' },
];

export const ALL_TRADE_SLUGS = TRADE_PAGES.map((t) => t.slug);

/** The release gate. Template approval ships the first; Sarah's word ships the fleet. */
export const LIVE_TRADE_SLUGS: string[] = ['roofers'];

export const liveTradePages = () => TRADE_PAGES.filter((t) => LIVE_TRADE_SLUGS.includes(t.slug));

export function getTradePage(slug: string) {
  const page = TRADE_PAGES.find((t) => t.slug === slug);
  if (!page) return null;
  const preset = TRADE_PRESETS[page.key];
  return {
    ...page,
    preset,
    services: VOICE_SERVICES[page.key],
    ticketWord: TICKET_WORD[page.key] ?? preset.jobWord,
  };
}

export const DEMO_LINE = { display: '(406) 312-1223', tel: '+14063121223' };

export function tradeFaqs(forWord: string, services: string, avgTicket: number, ticketWord: string) {
  const ticket = `$${avgTicket.toLocaleString()}`;
  return [
    {
      q: `What does an AI receptionist for ${forWord.toLowerCase()} actually handle?`,
      a: `It answers every call in seconds, day or night, in a natural voice trained on your business. For this trade that means: ${services.toLowerCase()}. It captures the caller's name, number, and job details, books the appointment or estimate, answers common questions, and texts you a summary the moment the call ends. You stay on the tools; nothing goes to voicemail.`,
    },
    {
      q: 'How fast can I hear it answering for my business?',
      a: 'About 60 seconds. Modern Mustard Seed forges a free demo trained on your business name and services, and your own phone rings with the receptionist answering as your company. There is no meeting, no setup call, and no card required for the demo. You judge it with your own ears first.',
    },
    {
      q: 'What does a missed call really cost?',
      a: `The average ${ticketWord} in this trade runs around ${ticket} (sample industry figure; your number may differ). If even a few callers a week hang up and dial the next company, the math compounds fast. The calculator on this page runs your own numbers: calls missed, close rate, and average ${ticketWord}.`,
    },
    {
      q: 'What does it cost once it is installed?',
      a: 'Plans start at $197 a month with a hard minute cap, no free trial games, and no per-seat pricing. The right first step is the free forged demo: hear it answer for your business, then decide. Every install is done by a human at Modern Mustard Seed and includes the setup of your services, hours, and booking flow.',
    },
  ];
}
