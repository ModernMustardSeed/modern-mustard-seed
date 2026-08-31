/**
 * A lead row becomes a believable website, deterministically, for free.
 *
 * The real demo build is 24 to 60 minutes of headless Claude (median 29). At
 * that price the offer can never run ahead of demand: 12,500 postcards would be
 * 6,000 hours of compute. So the card does not show a built site. It shows a
 * PREVIEW: a real, rendered, trade-correct homepage assembled from the lead row
 * by pure functions in about two milliseconds, at zero marginal cost.
 *
 * Everything here is derived from the lead's own id, so the same business
 * always renders the same site. The card in their hand and the page at
 * /y/<code> are the same picture, months apart, on two different machines.
 *
 * THE SIGNAGE LAW HOLDS HERE (see the demo builder): we never letter a business
 * name onto a building, a truck, a sign or a shirt in imagery. Their name
 * appears in the site's own chrome, which is honest, and nowhere else.
 *
 * Nothing in this file may claim a fact we did not read. Hours, address, rating
 * and review count are printed only when the lead row actually carries them.
 */

export type MailerLead = {
  id: string;
  business_name: string;
  trade: string | null;
  niche: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  emergency_service: boolean | null;
  open_24_7: boolean | null;
};

export type Palette = {
  name: string;
  ink: string;
  paper: string;
  accent: string;
  /** Text that sits ON the accent. Locked per palette so nothing ever renders
   *  light-on-light: the admin cream screens learned this the hard way. */
  onAccent: string;
  muted: string;
};

export type PreviewSpec = {
  business: string;
  /** "Kalispell, MT", or just the city, or empty. Never a fabricated place. */
  place: string;
  trade: TradeKey;
  tradeLabel: string;
  palette: Palette;
  layout: 'editorial' | 'bold' | 'calm';
  headline: string;
  subhead: string;
  cta: string;
  services: string[];
  proof: string[];
  phone: string | null;
  heroImage: string;
};

export type TradeKey =
  | 'roofing' | 'hvac' | 'plumbing' | 'electrical' | 'landscaping' | 'painting'
  | 'flooring' | 'garage_door' | 'pest_control' | 'pool_service' | 'restoration'
  | 'auto_repair' | 'veterinary' | 'general';

/** Every palette is checked for contrast at authoring time, not at render. */
const PALETTES: Palette[] = [
  { name: 'ironwork',  ink: '#12151B', paper: '#F7F5F0', accent: '#C2410C', onAccent: '#FFFFFF', muted: '#5B6270' },
  { name: 'deep water',ink: '#0B1A2A', paper: '#F4F7FA', accent: '#0E7490', onAccent: '#FFFFFF', muted: '#4A5B6B' },
  { name: 'field',     ink: '#14261A', paper: '#F5F7F2', accent: '#15803D', onAccent: '#FFFFFF', muted: '#4C5D50' },
  { name: 'signal',    ink: '#171310', paper: '#FBF7EF', accent: '#B91C1C', onAccent: '#FFFFFF', muted: '#5E554C' },
  { name: 'graphite',  ink: '#101114', paper: '#F2F3F5', accent: '#1D4ED8', onAccent: '#FFFFFF', muted: '#565A63' },
  { name: 'harvest',   ink: '#1A1408', paper: '#FCF8EE', accent: '#B45309', onAccent: '#FFFFFF', muted: '#635947' },
];

const LAYOUTS: PreviewSpec['layout'][] = ['editorial', 'bold', 'calm'];

type TradeProfile = {
  label: string;
  /** Palette indexes that suit the trade, in preference order. */
  palettes: number[];
  headlines: string[];
  subhead: string;
  cta: string;
  services: string[];
  /** Files under /public/mailer/hero/. Three per trade so a drop into one ZIP
   *  code does not print the same photograph six times on one street. */
  heroes: string[];
};

const TRADES: Record<TradeKey, TradeProfile> = {
  roofing: {
    label: 'Roofing',
    palettes: [0, 4, 3],
    headlines: ['The roof over everything you own.', 'A roof done once, done right.', 'Storm damage does not wait. Neither do we.'],
    subhead: 'Tear-offs, repairs and full replacements, inspected and warrantied.',
    cta: 'Get a free roof inspection',
    services: ['Roof replacement', 'Storm and hail damage', 'Leak repair', 'Gutters and flashing', 'Free inspections'],
    heroes: ['roofing-1.webp', 'roofing-2.webp', 'roofing-3.webp'],
  },
  hvac: {
    label: 'Heating and Cooling',
    palettes: [1, 4, 0],
    headlines: ['Comfortable, every day of the year.', 'Heat when it is cold. Cool when it is not.', 'The system you stop thinking about.'],
    subhead: 'Installation, repair and maintenance on every major system.',
    cta: 'Book a service call',
    services: ['AC repair and install', 'Furnace and heat pump', 'Ductwork', 'Maintenance plans', 'Indoor air quality'],
    heroes: ['hvac-1.webp', 'hvac-2.webp', 'hvac-3.webp'],
  },
  plumbing: {
    label: 'Plumbing',
    palettes: [1, 4, 5],
    headlines: ['Water where it belongs.', 'The plumber you call twice.', 'Fixed today, not Thursday.'],
    subhead: 'Drains, water heaters, repipes and the emergency at 2am.',
    cta: 'Get a plumber out today',
    services: ['Drain cleaning', 'Water heaters', 'Leak detection', 'Repipes', 'Sewer and septic'],
    heroes: ['plumbing-1.webp', 'plumbing-2.webp', 'plumbing-3.webp'],
  },
  electrical: {
    label: 'Electrical',
    palettes: [4, 0, 3],
    headlines: ['Power you can count on.', 'Wired right the first time.', 'Panels, service, and everything downstream.'],
    subhead: 'Licensed electricians for service, upgrades and new construction.',
    cta: 'Schedule an electrician',
    services: ['Panel upgrades', 'Rewires', 'EV chargers', 'Generators', 'Lighting'],
    heroes: ['electrical-1.webp', 'electrical-2.webp', 'electrical-3.webp'],
  },
  landscaping: {
    label: 'Landscaping',
    palettes: [2, 5, 0],
    headlines: ['The yard the street notices.', 'Ground, kept.', 'Design, build, and keep it that way.'],
    subhead: 'Design, installation and season-long maintenance.',
    cta: 'Get a landscape quote',
    services: ['Design and install', 'Weekly maintenance', 'Irrigation', 'Hardscape and patios', 'Snow removal'],
    heroes: ['landscaping-1.webp', 'landscaping-2.webp', 'landscaping-3.webp'],
  },
  painting: {
    label: 'Painting',
    palettes: [5, 3, 0],
    headlines: ['A finish that holds.', 'Clean lines, clean crew, clean exit.', 'The paint job that still looks new in year five.'],
    subhead: 'Interior and exterior, prepped properly and finished clean.',
    cta: 'Get a painting estimate',
    services: ['Interior painting', 'Exterior painting', 'Cabinet refinishing', 'Deck and fence', 'Commercial'],
    heroes: ['painting-1.webp', 'painting-2.webp', 'painting-3.webp'],
  },
  flooring: {
    label: 'Flooring',
    palettes: [5, 0, 4],
    headlines: ['The floor under the whole house.', 'Laid flat, laid right.', 'Hardwood, tile, and everything between.'],
    subhead: 'Supply and installation, measured and finished by our own crews.',
    cta: 'Book a free measure',
    services: ['Hardwood', 'Luxury vinyl', 'Tile and stone', 'Carpet', 'Refinishing'],
    heroes: ['flooring-1.webp', 'flooring-2.webp', 'flooring-3.webp'],
  },
  garage_door: {
    label: 'Garage Doors',
    palettes: [4, 0, 1],
    headlines: ['The door you use more than the front one.', 'Open, close, every time.', 'Springs, openers, and same-day repair.'],
    subhead: 'Repair, replacement and openers, usually same day.',
    cta: 'Get same-day repair',
    services: ['Spring replacement', 'Opener repair', 'New doors', 'Off-track doors', 'Commercial doors'],
    heroes: ['garage_door-1.webp', 'garage_door-2.webp', 'garage_door-3.webp'],
  },
  pest_control: {
    label: 'Pest Control',
    palettes: [2, 5, 1],
    headlines: ['Your house, and nothing else living in it.', 'Out, and kept out.', 'Treated once. Watched all year.'],
    subhead: 'Inspection, treatment and a schedule that keeps them gone.',
    cta: 'Book an inspection',
    services: ['General pest', 'Termites', 'Rodents', 'Mosquito and tick', 'Quarterly plans'],
    heroes: ['pest_control-1.webp', 'pest_control-2.webp', 'pest_control-3.webp'],
  },
  pool_service: {
    label: 'Pool Service',
    palettes: [1, 2, 4],
    headlines: ['Clear water, every week.', 'The pool you never have to think about.', 'Balanced, cleaned, and running.'],
    subhead: 'Weekly service, repairs, openings and closings.',
    cta: 'Start weekly service',
    services: ['Weekly cleaning', 'Chemical balancing', 'Equipment repair', 'Openings and closings', 'Leak detection'],
    heroes: ['pool_service-1.webp', 'pool_service-2.webp', 'pool_service-3.webp'],
  },
  restoration: {
    label: 'Restoration',
    palettes: [3, 0, 4],
    headlines: ['We answer on the worst day.', 'Water, fire, smoke. Back to normal.', 'On site fast, dried out faster.'],
    subhead: 'Water, fire and mold restoration, insurance work welcome.',
    cta: 'Get emergency help now',
    services: ['Water damage', 'Fire and smoke', 'Mold remediation', 'Storm damage', 'Insurance billing'],
    heroes: ['restoration-1.webp', 'restoration-2.webp', 'restoration-3.webp'],
  },
  auto_repair: {
    label: 'Auto Repair',
    palettes: [0, 4, 3],
    headlines: ['The shop that tells you the truth.', 'Diagnosed right, fixed once.', 'Back on the road today.'],
    subhead: 'Diagnostics, repair and maintenance on most makes.',
    cta: 'Book your car in',
    services: ['Diagnostics', 'Brakes and suspension', 'Engine and transmission', 'Oil and maintenance', 'Tires and alignment'],
    heroes: ['auto_repair-1.webp', 'auto_repair-2.webp', 'auto_repair-3.webp'],
  },
  veterinary: {
    label: 'Veterinary',
    palettes: [2, 1, 5],
    headlines: ['Care for the ones who cannot tell you.', 'Gentle hands, straight answers.', 'Your whole animal family, one clinic.'],
    subhead: 'Wellness, dentistry, surgery and urgent care.',
    cta: 'Book an appointment',
    services: ['Wellness exams', 'Vaccinations', 'Dentistry', 'Surgery', 'Urgent care'],
    heroes: ['veterinary-1.webp', 'veterinary-2.webp', 'veterinary-3.webp'],
  },
  general: {
    label: 'Service',
    palettes: [0, 4, 1],
    headlines: ['Work you can point at.', 'Done properly, the first time.', 'The people your neighbors already call.'],
    subhead: 'Straight quotes, clean work and a crew that shows up.',
    cta: 'Request a quote',
    services: ['Free estimates', 'Licensed and insured', 'Residential and commercial', 'Emergency service', 'Warrantied work'],
    heroes: ['general-1.webp', 'general-2.webp', 'general-3.webp'],
  },
};

const TRADE_ALIASES: Record<string, TradeKey> = {
  roofing: 'roofing', roofer: 'roofing',
  hvac: 'hvac', heating: 'hvac', cooling: 'hvac', 'heating_cooling': 'hvac',
  plumbing: 'plumbing', plumber: 'plumbing',
  electrical: 'electrical', electrician: 'electrical',
  landscaping: 'landscaping', lawn: 'landscaping', 'lawn_care': 'landscaping',
  painting: 'painting', painter: 'painting',
  flooring: 'flooring',
  garage_door: 'garage_door', 'garage-doors': 'garage_door',
  pest_control: 'pest_control', pest: 'pest_control',
  pool_service: 'pool_service', pool: 'pool_service',
  restoration: 'restoration', 'water_damage': 'restoration',
  auto_repair: 'auto_repair', auto: 'auto_repair', mechanic: 'auto_repair',
  veterinary: 'veterinary', vet: 'veterinary',
};

/**
 * FNV-1a. A stable 32-bit hash so a lead's design is a property of the lead,
 * not of when it was rendered. Math.random here would mean the postcard and the
 * landing page disagree, which is the one failure a recipient cannot miss.
 */
export function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tradeKeyOf(lead: Pick<MailerLead, 'trade' | 'niche' | 'business_name'>): TradeKey {
  const direct = TRADE_ALIASES[(lead.trade || '').trim().toLowerCase()];
  if (direct) return direct;
  // 'other' and null are 45% of the table. The business name is usually honest
  // about the trade, so read it before falling back to generic.
  const name = (lead.business_name || '').toLowerCase();
  const fromName: [RegExp, TradeKey][] = [
    [/\broof/, 'roofing'],
    [/\b(hvac|heating|air condition|furnace|cooling)\b/, 'hvac'],
    [/\b(plumb|drain|septic|rooter)\b/, 'plumbing'],
    [/\belectric/, 'electrical'],
    [/\b(landscap|lawn|yard|tree|irrigation)\b/, 'landscaping'],
    [/\bpaint/, 'painting'],
    [/\b(floor|carpet|tile)\b/, 'flooring'],
    [/\bgarage door/, 'garage_door'],
    [/\b(pest|exterminat|termite)\b/, 'pest_control'],
    [/\bpool\b/, 'pool_service'],
    [/\b(restoration|water damage|remediation)\b/, 'restoration'],
    [/\b(auto|automotive|transmission|tire|collision)\b/, 'auto_repair'],
    [/\b(veterinar|animal hospital)\b/, 'veterinary'],
  ];
  for (const [re, key] of fromName) if (re.test(name)) return key;
  return 'general';
}

/**
 * "Kalispell, MT". Empty string when we did not read a place, never a guess.
 *
 * The city is title-cased on the way out. The ZIP backfill stores what the
 * Census geocoder standardizes, which is SHOUTED ("SAN ANTONIO") because that
 * is what a mailing label wants. A website that says "Serving SAN ANTONIO, TX"
 * reads as a mail merge, which is exactly the impression this whole channel
 * exists to avoid. The address block on the card still prints the stored form.
 */
export function placeOf(lead: Pick<MailerLead, 'city' | 'state'>): string {
  const city = titleCase((lead.city || '').trim());
  const state = (lead.state || '').trim().toUpperCase();
  if (city && state) return `${city}, ${state}`;
  return city || state || '';
}

/** "SAN ANTONIO" -> "San Antonio". Leaves mixed case alone: a business that
 *  wrote "McAllen" or "DeSoto" knows better than this function does. */
export function titleCase(value: string): string {
  if (!value || value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .replace(/(^|[\s\-'])([a-z])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

/**
 * The whole design, from the row. Pure, deterministic, and safe on a row where
 * every optional field is null.
 */
export function previewFor(lead: MailerLead): PreviewSpec {
  const trade = tradeKeyOf(lead);
  const profile = TRADES[trade];
  const h = stableHash(lead.id || lead.business_name);

  const palette = PALETTES[profile.palettes[h % profile.palettes.length]];
  const layout = LAYOUTS[(h >>> 5) % LAYOUTS.length];
  const headline = profile.headlines[(h >>> 11) % profile.headlines.length];
  const heroImage = `/mailer/hero/${profile.heroes[(h >>> 17) % profile.heroes.length]}`;
  const place = placeOf(lead);

  // Proof lines are printed ONLY from fields we actually read. A rating we do
  // not have is not "4.9 stars", it is absent.
  const proof: string[] = [];
  if (typeof lead.rating === 'number' && lead.rating > 0) {
    const reviews = typeof lead.review_count === 'number' && lead.review_count > 0
      ? ` from ${lead.review_count.toLocaleString('en-US')} reviews`
      : '';
    proof.push(`${lead.rating.toFixed(1)} out of 5${reviews}`);
  }
  if (lead.open_24_7) proof.push('Open 24 hours');
  else if (lead.emergency_service) proof.push('Emergency service available');
  if (place) proof.push(`Serving ${place} and nearby`);
  if (proof.length < 2) proof.push('Licensed and insured');

  return {
    business: lead.business_name,
    place,
    trade,
    tradeLabel: profile.label,
    palette,
    layout,
    headline,
    subhead: place ? `${profile.subhead} Serving ${place}.` : profile.subhead,
    cta: profile.cta,
    services: profile.services,
    proof: proof.slice(0, 3),
    phone: lead.phone,
    heroImage,
  };
}

/** Display form for a US number we stored in any of four shapes. */
export function prettyPhone(raw: string | null | undefined): string | null {
  const d = (raw || '').replace(/\D/g, '');
  const ten = d.length === 11 && d[0] === '1' ? d.slice(1) : d;
  if (ten.length !== 10) return raw ? String(raw) : null;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}
