import type { Niche } from '@/lib/outbound';
import { OS_PRESETS } from '@/data/demo-os';
import type { OsPreset } from '@/data/demo-os';

/**
 * TRADE-SPECIFIC presets for the forged BUSINESS OS demo.
 *
 * The cockpit's `niche` field is five broad buckets, which made every roofer
 * see water-heater jobs. This layer detects the SPECIFIC trade from the
 * lead's own data (business name, mined notes, website) at forge time, zero
 * tokens, and backs it with deep authentic content: real ticket values,
 * trade-true pipeline scenarios, and a per-trade SIGNATURE BOARD (the module
 * that makes an owner say "it knows my business"). Legacy configs frozen
 * before this layer existed resolve at render time from the business name,
 * so every already-forged demo upgrades itself.
 */

export type OsTradeKey =
  | 'roofing'
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'restoration'
  | 'septic'
  | 'towing'
  | 'locksmith'
  | 'garage_door'
  | 'tree_service'
  | 'landscaping'
  | 'pool_spa'
  | 'pest_control'
  | 'painting'
  | 'moving'
  | 'cleaning'
  | 'auto_repair'
  | 'medspa'
  | 'dental'
  | 'vet'
  | 'attorney'
  | 'wedding'
  | 'salon'
  | 'cafe_bakery'
  | 'restaurant'
  | 'real_estate'
  | 'home_services'
  | 'professional';

export type OsSignatureRow = {
  title: string;
  sub: string;
  /** Dollar amount, or a short non-dollar string like '9:00 AM'. */
  amount: number | string;
  tag: string;
  tone: 'hot' | 'won' | 'wait';
};

export type OsSignature = {
  /** Sidebar / tab label, one short word if possible. */
  tabLabel: string;
  title: string;
  sub: string;
  metricLabel: string;
  metricValue: string;
  rows: OsSignatureRow[];
  footer: string;
};

export type OsTradePreset = OsPreset & {
  label: string;
  avgTicket: number;
  signature: OsSignature;
  /** Trade-specific automations, shown above the shared base set. {job} interpolates. */
  extraAutomations: { icon: string; title: string; desc: string; on: boolean }[];
};

/* ------------------------------------------------------------------------ */
/* Detection: business name + notes + website -> specific trade.            */
/* Ordered most-specific first; first match wins.                           */
/* ------------------------------------------------------------------------ */

const TRADE_PATTERNS: [OsTradeKey, RegExp][] = [
  ['restoration', /restorat|water damage|fire damage|flood|mitigation|\bmold\b/],
  ['roofing', /roof|shingle|gutter/],
  ['hvac', /hvac|heating|cooling|air\s?cond|furnace|climate control|heat pump|\bac repair/],
  ['septic', /septic/],
  ['plumbing', /plumb|drain|rooter|sewer/],
  ['electrical', /electric/],
  ['towing', /towing|\btow\b|wrecker|roadside/],
  ['locksmith', /locksmith|lock\s?smith|key service/],
  ['garage_door', /garage door|overhead door/],
  ['tree_service', /\btree\b|arborist|stump/],
  ['landscaping', /landscap|lawn|turf|mowing|irrigation|sprinkler|hardscap/],
  ['pool_spa', /\bpools?\b|hot tub/],
  ['pest_control', /pest|exterminat|termite|mosquito|wildlife removal/],
  ['painting', /painting|painter|\bpaint\b/],
  ['moving', /moving|movers|relocat/],
  ['cleaning', /cleaning|maid|janitorial|carpet clean|pressure wash|power wash/],
  ['auto_repair', /auto repair|auto body|collision|transmission|\btires?\b|mechanic|automotive|\bgarage\b|muffler|oil change/],
  ['medspa', /med\s?spa|aesthetic|botox|laser|skincare|skin care/],
  ['dental', /dental|dentist|orthodont|oral surgery|implant|\bsmile/],
  ['vet', /veterinar|animal hospital|animal clinic|pet clinic|pet hospital|\bpaws\b/],
  ['attorney', /attorney|law firm|\blaw\b|lawyer|legal|injury/],
  ['wedding', /wedding|bridal|photograph|event venue|\bvenue\b/],
  ['salon', /salon|barber|hair studio|\bnails?\b|lash|beauty/],
  ['cafe_bakery', /bakery|bakehouse|caf[eé]|coffee|donut|doughnut|pastry|espresso/],
  [
    'restaurant',
    /restaurant|grill|kitchen|bbq|barbecue|pizz|taco|burger|sushi|diner|bistro|eatery|steak|seafood|fish house|cantina|\bpho\b|thai|deli|catering|\bpub\b|tavern|smokehouse/,
  ],
  ['real_estate', /realty|real estate|realtor|properties/],
];

const NICHE_FALLBACK: Record<Niche, OsTradeKey> = {
  home_service: 'home_services',
  restaurant: 'restaurant',
  dental_medspa: 'dental',
  real_estate: 'real_estate',
  other: 'professional',
};

/** Detect the specific trade from the lead's own words. Pure, zero tokens. */
export function detectTrade(corpus: string, niche: Niche): OsTradeKey {
  const hay = corpus.toLowerCase();
  for (const [key, re] of TRADE_PATTERNS) if (re.test(hay)) return key;
  return NICHE_FALLBACK[niche] ?? 'professional';
}

/**
 * Resolve the preset for a frozen config. Configs forged after this layer
 * carry `trade`; older ones are re-detected from the business name so every
 * existing demo upgrades itself at render time with no re-forge.
 */
export function resolveTrade(config: { trade?: string | null; business: string; niche: Niche }): OsTradePreset {
  const key =
    config.trade && config.trade in TRADE_PRESETS
      ? (config.trade as OsTradeKey)
      : detectTrade(config.business, config.niche);
  return TRADE_PRESETS[key];
}

/* ------------------------------------------------------------------------ */
/* The library. All figures are honest sample data; the app labels them.    */
/* ------------------------------------------------------------------------ */

export const TRADE_PRESETS: Record<OsTradeKey, OsTradePreset> = {
  /* --------------------------------- ROOFING ---------------------------- */
  roofing: {
    label: 'Roofing',
    jobWord: 'job',
    stages: ['New lead', 'Inspected', 'On the schedule', 'Done'],
    accent: '#e07a3f',
    accentSoft: 'rgba(224,122,63,0.14)',
    weekRevenue: 38400,
    avgTicket: 12400,
    customers: [
      { name: 'The Hendersons', need: 'Hail damage, State Farm claim filed', value: 14200, stage: 1 },
      { name: 'Rita M.', need: 'Leak over the kitchen, tarp is on', value: 850, stage: 2 },
      { name: 'Creekside Storage', need: 'TPO recoat bid, 14,000 sq ft', value: 32000, stage: 0 },
      { name: 'D. Whitaker', need: 'Full replacement, architectural shingle', value: 13600, stage: 2 },
      { name: 'Palmer Rentals', need: '3 units, insurance inspection', value: 9400, stage: 1 },
      { name: 'The Boones', need: 'Replaced after the June storm', value: 15800, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Rita M.', time: '9:12 PM', need: 'Ceiling dripping over the stove', outcome: 'Tarp crew booked, 7 AM' },
      { caller: 'Dale S.', time: '10:38 PM', need: 'Hail last night, is my roof OK?', outcome: 'Free inspection set, Thursday' },
      { caller: 'Unknown', time: '5:52 AM', need: 'Does insurance cover this?', outcome: 'Claim questions answered, details captured' },
    ],
    todayJobs: [
      { time: '7:00', title: 'Emergency tarp, kitchen leak', who: 'Rita M.' },
      { time: '9:30', title: 'Adjuster meeting on site', who: 'The Hendersons' },
      { time: '1:00', title: 'Tear-off day 1 of 2', who: 'D. Whitaker' },
    ],
    ads: [
      { headline: 'That hail did more than dent the truck.', body: '{biz} inspects {city} roofs free and walks the claim with you. Call before the deadline passes.' },
      { headline: 'A roof done right, documented to the shingle.', body: '{biz} photographs every stage and answers every call. {city} storm season is coming. Get ahead of it.' },
    ],
    reviewAsk: 'The crew just wrapped up and your roof looks brand new! If we earned it, a quick Google review means everything to a local crew like ours: ',
    signature: {
      tabLabel: 'Claims',
      title: 'Storm & claims board',
      sub: 'Every insurance claim, adjuster meeting, and supplement in one place. This is where roofing money hides.',
      metricLabel: 'Claim value in motion',
      metricValue: '$61,400',
      rows: [
        { title: 'Henderson claim, State Farm', sub: 'Approved. Materials land Thursday, build Friday', amount: 14200, tag: 'Approved', tone: 'won' },
        { title: 'Palmer Rentals, Allstate', sub: 'Adjuster meeting today 9:30 AM, you + adjuster on site', amount: 9400, tag: 'Adjuster today', tone: 'hot' },
        { title: 'Supplement: decking replacement', sub: 'Filed Monday on the Whitaker job, carrier reviewing', amount: 2340, tag: 'Supplement', tone: 'wait' },
        { title: 'Creekside Storage, commercial bid', sub: 'TPO recoat, walking it with the owner Wednesday', amount: 32000, tag: 'Bid out', tone: 'wait' },
        { title: 'June storm list', sub: '11 past customers in the hail path have not called back yet', amount: 'Text them', tag: 'Follow up', tone: 'hot' },
      ],
      footer: 'In the real build this board fills itself: claims sync from your calls, supplements get deadline reminders, and the storm list texts itself.',
    },
    extraAutomations: [
      { icon: 'bolt', title: 'Storm alert blast', desc: 'When hail hits a zip you serve, every past customer in it gets a free-inspection text within the hour. First truck in the neighborhood wins the street.', on: true },
      { icon: 'bell', title: 'Adjuster meeting shield', desc: 'Adjuster meetings get confirmed the day before, and the claim photo packet is ready before you park.', on: true },
      { icon: 'chart', title: 'Supplement deadline watch', desc: 'Every open supplement gets tracked against the carrier clock so approved money never expires unclaimed.', on: false },
    ],
  },

  /* ---------------------------------- HVAC ------------------------------ */
  hvac: {
    label: 'HVAC',
    jobWord: 'job',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#5aa7d6',
    accentSoft: 'rgba(90,167,214,0.14)',
    weekRevenue: 21600,
    avgTicket: 6800,
    customers: [
      { name: 'Gary P.', need: 'AC dead, house at 89 degrees', value: 420, stage: 2 },
      { name: 'The Ortegas', need: 'Full system replacement quote', value: 8400, stage: 1 },
      { name: 'Lakeview Dental', need: 'Rooftop unit service contract', value: 3600, stage: 1 },
      { name: 'M. Reyes', need: 'New patient on the comfort plan', value: 240, stage: 0 },
      { name: 'B. Callahan', need: 'Furnace + AC combo, financing', value: 11200, stage: 2 },
      { name: 'S. Nguyen', need: 'Mini-split install, garage office', value: 4300, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Gary P.', time: '8:41 PM', need: 'AC quit, elderly mother in the house', outcome: 'First slot held, 8 AM, you were texted' },
      { caller: 'Dana K.', time: '10:02 PM', need: 'Weird smell from the furnace', outcome: 'Safety questions asked, visit booked' },
      { caller: 'Unknown', time: '6:14 AM', need: 'Do you do financing?', outcome: 'Answered, quote visit set' },
    ],
    todayJobs: [
      { time: '8:00', title: 'No-cool call, priority', who: 'Gary P.' },
      { time: '10:30', title: 'System replacement quote', who: 'The Ortegas' },
      { time: '2:00', title: 'Mini-split startup + walkthrough', who: 'S. Nguyen' },
    ],
    ads: [
      { headline: 'It hit 95 today. Your AC noticed.', body: '{biz} answers 24/7 and shows up same-day in {city}. One call before the weekend rush.' },
      { headline: 'The comfort plan {city} actually uses.', body: 'Two tune-ups a year, priority scheduling, no overtime rates. {biz} keeps you off the emergency list.' },
    ],
    reviewAsk: 'Enjoy the cool air! If today went well, a quick Google review helps your neighbors find us before the next heat wave: ',
    signature: {
      tabLabel: 'Plans',
      title: 'Maintenance plan engine',
      sub: 'Recurring revenue and the replacement pipeline, the two numbers that decide an HVAC year.',
      metricLabel: 'Plan revenue per year',
      metricValue: '$38,880',
      rows: [
        { title: '162 comfort-plan members', sub: '$20/mo each. 9 joined this month from overnight calls', amount: 38880, tag: 'Recurring', tone: 'won' },
        { title: 'Spring tune-up backlog', sub: '41 members due, auto-scheduling is filling the gaps', amount: '41 due', tag: 'Book them', tone: 'wait' },
        { title: 'Aging-unit list', sub: '17 members with 12+ year systems, replacement offers queued', amount: 142800, tag: 'Pipeline', tone: 'hot' },
        { title: 'Callahan combo install', sub: 'Financing approved yesterday, crew set for Monday', amount: 11200, tag: 'Won', tone: 'won' },
      ],
      footer: 'In the real build the plan engine renews, schedules, and upsells by itself. Plans are the moat; this board grows it.',
    },
    extraAutomations: [
      { icon: 'bolt', title: 'Season flip campaign', desc: 'First cold snap and first heat wave each trigger a tune-up push to every member. The schedule fills before the phones melt.', on: true },
      { icon: 'chart', title: 'Aging unit radar', desc: 'Systems past 12 years get flagged and their owners get a replacement quote offer before the mid-July failure.', on: true },
    ],
  },

  /* -------------------------------- PLUMBING ---------------------------- */
  plumbing: {
    label: 'Plumbing',
    jobWord: 'job',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#5fb8c9',
    accentSoft: 'rgba(95,184,201,0.14)',
    weekRevenue: 14800,
    avgTicket: 850,
    customers: [
      { name: 'Greg H.', need: 'Water heater replacement, 50 gal', value: 1850, stage: 0 },
      { name: 'Mia C.', need: 'Slow drain, kitchen + bath', value: 340, stage: 1 },
      { name: 'Bright Path HOA', need: '12-unit repipe walkthrough', value: 5400, stage: 1 },
      { name: 'Tom & Ana', need: 'Remodel rough-in quote', value: 3200, stage: 2 },
      { name: 'L. Whitfield', need: 'Burst pipe repair follow-up', value: 480, stage: 3 },
      { name: 'Parkside Dental', need: 'Backflow test, annual', value: 275, stage: 2 },
    ],
    overnightCalls: [
      { caller: 'Greg H.', time: '8:58 PM', need: 'No hot water', outcome: 'Booked, 8 AM slot' },
      { caller: 'Sandra', time: '11:20 PM', need: 'Water at the base of the toilet', outcome: 'Shutoff walked through, visit booked' },
      { caller: 'Unknown', time: '5:47 AM', need: 'Leak under the sink', outcome: 'Emergency flagged, you were texted' },
    ],
    todayJobs: [
      { time: '8:00', title: 'Water heater install', who: 'Greg H.' },
      { time: '11:00', title: 'Remodel rough-in walk', who: 'Tom & Ana' },
      { time: '2:30', title: 'Drain clearing', who: 'Mia C.' },
    ],
    ads: [
      { headline: 'The 2 AM pipe burst has a number now.', body: '{biz} answers every call in {city}, day or night, and walks you to the shutoff while the truck rolls.' },
      { headline: 'Fixed right, priced straight.', body: '{biz} quotes before the work starts and stands behind every joint. {city} has our number saved.' },
    ],
    reviewAsk: 'Thanks for trusting us with the job today! If everything is flowing right, a quick Google review helps more than you know: ',
    signature: {
      tabLabel: 'On call',
      title: 'After-hours board',
      sub: 'Emergencies are the highest-margin work in plumbing. This board makes sure you never sleep through one again.',
      metricLabel: 'After-hours revenue this month',
      metricValue: '$6,240',
      rows: [
        { title: '14 emergencies caught after 6 PM', sub: 'Every one answered by the AI, triaged, and booked or escalated', amount: 6240, tag: 'Captured', tone: 'won' },
        { title: 'Water heater age list', sub: '23 past customers with heaters past 10 years, offers queued', amount: 42550, tag: 'Pipeline', tone: 'hot' },
        { title: 'Bright Path HOA repipe', sub: 'Walkthrough Thursday, 12 units, decision by the board Friday', amount: 5400, tag: 'Bid out', tone: 'wait' },
        { title: 'Membership drain checks', sub: '31 annual-plan members, 6 due this month', amount: '6 due', tag: 'Book them', tone: 'wait' },
      ],
      footer: 'In the real build the AI receptionist triages every night call, texts you only the true emergencies, and books the rest for morning.',
    },
    extraAutomations: [
      { icon: 'bolt', title: 'Shutoff coach', desc: 'Panicked night callers get walked to the water shutoff by the AI while the on-call text goes out. Less damage, calmer customer, easier job.', on: true },
      { icon: 'chart', title: 'Water heater birthday list', desc: 'Every installed heater gets tracked by age; at year 9 the owner starts hearing from you before it floods the garage.', on: true },
    ],
  },

  /* ------------------------------- ELECTRICAL --------------------------- */
  electrical: {
    label: 'Electrical',
    jobWord: 'job',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#e6c34a',
    accentSoft: 'rgba(230,195,74,0.14)',
    weekRevenue: 16200,
    avgTicket: 1100,
    customers: [
      { name: 'K. Sutton', need: 'Panel upgrade, 200 amp', value: 3400, stage: 1 },
      { name: 'The Brauns', need: 'EV charger install, garage', value: 1250, stage: 2 },
      { name: 'Hilltop Brewing', need: 'Buildout wiring, permit filed', value: 8800, stage: 2 },
      { name: 'D. Okafor', need: 'Flickering lights, half the house', value: 380, stage: 0 },
      { name: 'R. Sandoval', need: 'Hot tub circuit + GFCI', value: 940, stage: 1 },
      { name: 'M. Tran', need: 'Recessed lighting, done Tuesday', value: 1150, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'D. Okafor', time: '9:24 PM', need: 'Breaker keeps tripping, burning smell?', outcome: 'Safety triage done, first slot held, you were texted' },
      { caller: 'Priya', time: '7:55 PM', need: 'EV charger quote', outcome: 'Panel questions asked, quote visit booked' },
      { caller: 'Unknown', time: '6:31 AM', need: 'Do you pull permits?', outcome: 'Answered, details captured' },
    ],
    todayJobs: [
      { time: '8:00', title: 'Tripping breaker, priority', who: 'D. Okafor' },
      { time: '10:30', title: 'EV charger install', who: 'The Brauns' },
      { time: '1:30', title: 'Brewery rough-in, day 3', who: 'Hilltop Brewing' },
    ],
    ads: [
      { headline: 'A burning smell is not a wait-and-see.', body: '{biz} answers {city} around the clock and triages the scary stuff on the phone. Licensed, insured, on time.' },
      { headline: 'Your EV needs a better outlet.', body: 'Level 2 chargers installed clean and permitted by {biz}. One call, one visit, done.' },
    ],
    reviewAsk: 'Everything is powered up and safe! If the work earned it, a quick Google review helps your neighbors find a licensed electrician: ',
    signature: {
      tabLabel: 'Permits',
      title: 'Permit & inspection board',
      sub: 'Every permit, inspection window, and utility coordination in one glance. Nothing stalls a job like paperwork nobody watched.',
      metricLabel: 'Job value waiting on paperwork',
      metricValue: '$12,200',
      rows: [
        { title: 'Hilltop Brewing buildout', sub: 'Rough-in inspection scheduled Thursday 8 to 11 AM window', amount: 8800, tag: 'Inspection Thu', tone: 'hot' },
        { title: 'Sutton panel upgrade', sub: 'Permit approved yesterday, utility disconnect requested', amount: 3400, tag: 'Approved', tone: 'won' },
        { title: 'EV charger, the Brauns', sub: 'Same-day permit, final inspection auto-requested at completion', amount: 1250, tag: 'On track', tone: 'won' },
        { title: 'Panel upgrade waitlist', sub: '9 quote requests mention "old panel" this month. Offer day set?', amount: 30600, tag: 'Pipeline', tone: 'wait' },
      ],
      footer: 'In the real build permits file from the job record and inspection windows land on the crew calendar automatically.',
    },
    extraAutomations: [
      { icon: 'bell', title: 'Inspection window guard', desc: 'Inspection days get confirmed with the county the day before and the homeowner gets the arrival window text.', on: true },
      { icon: 'bolt', title: 'Safety triage script', desc: 'Night callers describing burning smells or hot outlets get a safety walkthrough and an instant escalation text to you.', on: true },
    ],
  },

  /* ------------------------------- RESTORATION -------------------------- */
  restoration: {
    label: 'Water & fire restoration',
    jobWord: 'job',
    stages: ['New loss', 'On site', 'Drying / rebuild', 'Closed'],
    accent: '#4fb6a6',
    accentSoft: 'rgba(79,182,166,0.14)',
    weekRevenue: 46200,
    avgTicket: 9800,
    customers: [
      { name: 'The Kimbles', need: 'Washer line burst, 3 rooms wet', value: 8400, stage: 1 },
      { name: 'Bayside Dental', need: 'Sprinkler discharge, after-hours', value: 14600, stage: 1 },
      { name: 'R. Ellison', need: 'Kitchen fire, smoke through HVAC', value: 22400, stage: 2 },
      { name: 'Hargrove Rentals', need: 'Tenant leak, unit 4B', value: 5200, stage: 0 },
      { name: 'M. Castillo', need: 'Crawlspace mold assessment', value: 3800, stage: 2 },
      { name: 'The Duprees', need: 'Basement flood, rebuild done', value: 11900, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'The Kimbles', time: '11:52 PM', need: 'Water everywhere, washer line burst', outcome: 'Crew dispatched, on site 12:40 AM' },
      { caller: 'Bayside Dental', time: '2:17 AM', need: 'Sprinkler went off in the office', outcome: 'Emergency confirmed, ETA given, you were called' },
      { caller: 'Unknown', time: '6:05 AM', need: 'Does insurance cover mold?', outcome: 'Coverage questions answered, assessment booked' },
    ],
    todayJobs: [
      { time: '7:30', title: 'Moisture readings, day 2', who: 'The Kimbles' },
      { time: '10:00', title: 'Adjuster walk, sprinkler loss', who: 'Bayside Dental' },
      { time: '1:00', title: 'Rebuild scope meeting', who: 'R. Ellison' },
    ],
    ads: [
      { headline: 'The first hour decides the claim.', body: '{biz} answers {city} at 2 AM, dispatches in minutes, and documents everything the carrier will ask for.' },
      { headline: 'Water finds everything. So do we.', body: 'Certified drying, honest moisture readings, insurance handled. {biz} gets your building back.' },
    ],
    reviewAsk: 'Your home is dry and the rebuild is done! If we took good care of you during a hard week, a quick Google review helps the next family in a flood: ',
    signature: {
      tabLabel: 'Claims',
      title: 'Carrier & drying board',
      sub: 'Losses, carriers, moisture logs, and TPA deadlines. Restoration is won at 2 AM and paid in the paperwork.',
      metricLabel: 'Open claim value',
      metricValue: '$54,400',
      rows: [
        { title: 'Ellison kitchen fire, USAA', sub: 'Scope approved, rebuild crew starts Monday', amount: 22400, tag: 'Approved', tone: 'won' },
        { title: 'Bayside Dental, Travelers', sub: 'Adjuster walk today 10 AM, doc packet ready', amount: 14600, tag: 'Adjuster today', tone: 'hot' },
        { title: 'Kimble water loss, State Farm', sub: 'Day 2 drying, readings trending down, dry by Friday', amount: 8400, tag: 'Drying', tone: 'wait' },
        { title: 'TPA response clock', sub: 'Program job accepted 41 min ago. Response due within the hour', amount: '18 min left', tag: 'Beat the clock', tone: 'hot' },
      ],
      footer: 'In the real build moisture readings log from the field, carrier packets assemble themselves, and TPA clocks alert before they expire.',
    },
    extraAutomations: [
      { icon: 'bolt', title: 'First-to-answer dispatch', desc: 'A 2 AM loss call gets answered instantly, address captured, and the on-call crew texted before the caller hangs up. First truck on site wins the job.', on: true },
      { icon: 'chart', title: 'Carrier packet builder', desc: 'Photos, readings, and scope notes compile into the format each carrier wants, ready before the adjuster asks.', on: true },
    ],
  },

  /* --------------------------------- SEPTIC ----------------------------- */
  septic: {
    label: 'Septic',
    jobWord: 'job',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#96a85c',
    accentSoft: 'rgba(150,168,92,0.14)',
    weekRevenue: 11800,
    avgTicket: 620,
    customers: [
      { name: 'The Vances', need: 'Pump-out, 3 years since last', value: 495, stage: 2 },
      { name: 'C. Reilly', need: 'Backup in the basement drain', value: 780, stage: 0 },
      { name: 'Lakeshore Campground', need: 'Commercial pump contract', value: 4200, stage: 1 },
      { name: 'The Muellers', need: 'Inspection for home sale', value: 425, stage: 2 },
      { name: 'B. Hollis', need: 'Drain field assessment', value: 3600, stage: 1 },
      { name: 'K. Draper', need: 'Riser install, done Monday', value: 850, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'C. Reilly', time: '9:33 PM', need: 'Sewage backing up in the basement', outcome: 'First slot held, do-not-flush guidance given' },
      { caller: 'Realtor Kim', time: '7:48 PM', need: 'Inspection before Friday closing', outcome: 'Booked Thursday 9 AM' },
      { caller: 'Unknown', time: '6:20 AM', need: 'Pump-out pricing', outcome: 'Quoted range, details captured' },
    ],
    todayJobs: [
      { time: '8:00', title: 'Emergency backup call', who: 'C. Reilly' },
      { time: '11:00', title: 'Pump-out + baffle check', who: 'The Vances' },
      { time: '2:00', title: 'Sale inspection + report', who: 'The Muellers' },
    ],
    ads: [
      { headline: 'Out of sight is not out of trouble.', body: 'A $495 pump-out beats a $9,000 drain field. {biz} keeps {city} systems healthy on a schedule.' },
      { headline: 'Selling the house? The tank talks first.', body: 'Same-week septic inspections with written reports from {biz}. Realtors in {city} keep us on speed dial.' },
    ],
    reviewAsk: 'All pumped and inspected! If we did right by you, a quick Google review helps neighbors on wells and tanks find us: ',
    signature: {
      tabLabel: 'Recalls',
      title: 'Pump-out recall engine',
      sub: 'Every tank you have ever pumped is future revenue on a 3-year clock. This board runs that clock.',
      metricLabel: 'Recall revenue due this quarter',
      metricValue: '$21,780',
      rows: [
        { title: '44 tanks due for pump-out', sub: 'Past customers crossing the 3-year mark this quarter', amount: 21780, tag: 'Text them', tone: 'hot' },
        { title: '12 booked from last recall blast', sub: 'Sent Tuesday, 27% booked within 48 hours', amount: 5940, tag: 'Working', tone: 'won' },
        { title: 'Lakeshore Campground contract', sub: 'Quarterly commercial pumping, decision this week', amount: 4200, tag: 'Bid out', tone: 'wait' },
        { title: 'Inspection season', sub: 'Home-sale inspections up 40% this month, realtor list warm', amount: '9 this month', tag: 'Trend', tone: 'won' },
      ],
      footer: 'In the real build every completed pump-out schedules its own 3-year recall. The truck stays full without a single cold call.',
    },
    extraAutomations: [
      { icon: 'star', title: 'Realtor rapid lane', desc: 'Calls mentioning a closing date get priority slots and the written report emails itself to the realtor same day.', on: true },
      { icon: 'bolt', title: '3-year recall clock', desc: 'Every tank pumped starts a quiet 3-year timer. At the mark, the owner gets a friendly text before the backup happens.', on: true },
    ],
  },

  /* --------------------------------- TOWING ----------------------------- */
  towing: {
    label: 'Towing',
    jobWord: 'call',
    stages: ['Incoming', 'Dispatched', 'On the hook', 'Delivered'],
    accent: '#e0b13f',
    accentSoft: 'rgba(224,177,63,0.14)',
    weekRevenue: 9400,
    avgTicket: 285,
    customers: [
      { name: 'Marcus (I-90 mm 34)', need: 'Breakdown, shoulder, wants nearest shop', value: 265, stage: 1 },
      { name: 'Kelsey D.', need: 'Lockout, office parking garage', value: 95, stage: 2 },
      { name: 'Hertz local', need: 'Fleet move, 3 units Thursday', value: 540, stage: 0 },
      { name: 'T. Barrett', need: 'Winch-out, muddy easement', value: 380, stage: 1 },
      { name: 'PD rotation', need: 'Accident scene, 2 vehicles', value: 620, stage: 3 },
      { name: 'Reyes Auto Body', need: 'Shop-to-shop flatbed run', value: 190, stage: 2 },
    ],
    overnightCalls: [
      { caller: 'Marcus', time: '12:47 AM', need: 'Broke down on I-90, mile 34', outcome: 'Location captured, driver dispatched, ETA texted' },
      { caller: 'Kelsey D.', time: '11:15 PM', need: 'Keys locked in, garage closes at midnight', outcome: 'Nearest driver routed, arrived 11:38' },
      { caller: 'Unknown', time: '4:22 AM', need: 'How much to tow 12 miles?', outcome: 'Quoted, callback captured' },
    ],
    todayJobs: [
      { time: 'Now', title: 'I-90 shoulder pickup', who: 'Marcus' },
      { time: '10:00', title: 'Fleet move, 3 units', who: 'Hertz local' },
      { time: '1:30', title: 'Winch-out, bring chains', who: 'T. Barrett' },
    ],
    ads: [
      { headline: 'Stranded is a 20-minute problem now.', body: '{biz} answers on the first ring, tracks the truck to you, and quotes straight. Save this number, {city}.' },
      { headline: 'The tow truck that texts you an ETA.', body: 'No dispatcher hold music. {biz} picks up 24/7 and the driver is moving before you hang up.' },
    ],
    reviewAsk: 'Glad we got you off the shoulder safe! If the driver did right by you, a quick Google review helps the next stranded driver find us: ',
    signature: {
      tabLabel: 'Dispatch',
      title: 'Live dispatch board',
      sub: 'Every truck, every hook, every ETA. In towing the answer speed IS the business; this board keeps it under 60 seconds.',
      metricLabel: 'Average answer-to-dispatch',
      metricValue: '52 sec',
      rows: [
        { title: 'Truck 1, Denny', sub: 'En route to I-90 mm 34, ETA 12 min, customer tracking link live', amount: 265, tag: 'Rolling', tone: 'hot' },
        { title: 'Truck 2, Alicia', sub: 'On the hook, delivering to Reyes Auto Body', amount: 190, tag: 'On hook', tone: 'won' },
        { title: 'PD rotation slot', sub: 'Next in rotation, radio checked, scene kit stocked', amount: 'Standing by', tag: 'Rotation', tone: 'wait' },
        { title: 'Motor club invoices', sub: '$2,340 outstanding past 30 days, chaser emails queued', amount: 2340, tag: 'Chase', tone: 'hot' },
      ],
      footer: 'In the real build calls capture location automatically, the nearest driver gets pinged, and the customer watches the truck come to them.',
    },
    extraAutomations: [
      { icon: 'bolt', title: '60-second dispatch', desc: 'Caller location gets captured on the call, the nearest driver pinged, and an ETA text sent before they can call a competitor.', on: true },
      { icon: 'chart', title: 'Motor club invoice chaser', desc: 'Club and insurance invoices past 30 days get polite automatic follow-ups until they pay. Stop hauling for free.', on: true },
    ],
  },

  /* -------------------------------- LOCKSMITH --------------------------- */
  locksmith: {
    label: 'Locksmith',
    jobWord: 'call',
    stages: ['Incoming', 'Dispatched', 'On site', 'Done'],
    accent: '#c9a25f',
    accentSoft: 'rgba(201,162,95,0.14)',
    weekRevenue: 6800,
    avgTicket: 240,
    customers: [
      { name: 'Renee W.', need: 'Locked out, apartment, ID ready', value: 145, stage: 1 },
      { name: 'Corner Pharmacy', need: 'Rekey after employee exit', value: 380, stage: 2 },
      { name: 'H. Osman', need: 'Car lockout, grocery lot', value: 120, stage: 0 },
      { name: 'Fairfield Property Mgmt', need: '8-unit master key system', value: 1650, stage: 1 },
      { name: 'The Delgados', need: 'Smart lock install, both doors', value: 420, stage: 2 },
      { name: 'J. Pruitt', need: 'Safe opened, combo recovered', value: 310, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Renee W.', time: '11:58 PM', need: 'Locked out of my apartment', outcome: 'ID verification explained, tech dispatched, ETA 25 min' },
      { caller: 'H. Osman', time: '9:20 PM', need: 'Keys in the trunk', outcome: 'Quoted flat rate, tech routed' },
      { caller: 'Unknown', time: '5:36 AM', need: 'Do you rekey businesses?', outcome: 'Answered, morning callback set' },
    ],
    todayJobs: [
      { time: 'Now', title: 'Apartment lockout', who: 'Renee W.' },
      { time: '10:00', title: 'Pharmacy rekey, 4 doors', who: 'Corner Pharmacy' },
      { time: '2:00', title: 'Smart lock install', who: 'The Delgados' },
    ],
    ads: [
      { headline: 'Locked out is not a night ruined.', body: '{biz} answers 24/7 in {city}, quotes a flat rate on the phone, and shows up with ID checks done right.' },
      { headline: 'New tenant? New keys. Ten minutes.', body: 'Rekeys, master systems, smart locks. {biz} keeps {city} property managers on schedule.' },
    ],
    reviewAsk: 'Glad we got you back in! If the visit went well, a quick Google review helps the next locked-out neighbor find a legit local locksmith: ',
    signature: {
      tabLabel: 'Dispatch',
      title: 'Night dispatch board',
      sub: 'Lockouts are won by whoever answers first and quotes straight. This board does both while you sleep.',
      metricLabel: 'After-hours calls captured this month',
      metricValue: '31',
      rows: [
        { title: 'Tech 1 rolling', sub: 'Renee W. lockout, ETA 25 min, flat rate quoted on the call', amount: 145, tag: 'Rolling', tone: 'hot' },
        { title: 'Fairfield master key system', sub: '8 units, proposal sent, decision Friday', amount: 1650, tag: 'Bid out', tone: 'wait' },
        { title: 'Commercial rekey lane', sub: '3 employee-exit rekeys this week from property managers', amount: 1140, tag: 'Trend', tone: 'won' },
        { title: 'Scam-call shield', sub: '2 "$19 lockout" bait callers identified and priced honestly', amount: 'Protected', tag: 'Shield', tone: 'won' },
      ],
      footer: 'In the real build every night call gets answered, ID requirements explained, flat rate quoted, and the tech routed automatically.',
    },
    extraAutomations: [
      { icon: 'bolt', title: 'Flat-rate honesty script', desc: 'Every lockout caller hears the real price on the phone. Beats the bait-and-switch chains at their own game.', on: true },
      { icon: 'star', title: 'Property manager lane', desc: 'Known property managers skip the queue and their rekeys auto-generate invoices to the office.', on: true },
    ],
  },

  /* ------------------------------- GARAGE DOOR -------------------------- */
  garage_door: {
    label: 'Garage door',
    jobWord: 'job',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#b9885a',
    accentSoft: 'rgba(185,136,90,0.14)',
    weekRevenue: 12600,
    avgTicket: 950,
    customers: [
      { name: 'The Ferrells', need: 'Spring snapped, car trapped', value: 380, stage: 1 },
      { name: 'A. Kowalski', need: 'New opener, wifi + camera', value: 620, stage: 2 },
      { name: 'Summit Storage', need: '6 commercial rollups, service', value: 2800, stage: 1 },
      { name: 'The Ibarras', need: 'Full door replacement quote', value: 2400, stage: 0 },
      { name: 'N. Fox', need: 'Off-track, bent panel', value: 450, stage: 2 },
      { name: 'B. Sherwood', need: 'Two doors installed Tuesday', value: 4600, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'The Ferrells', time: '7:05 AM', need: 'Spring broke, car stuck inside, work at 8', outcome: 'First slot held 7:45, release walkthrough given' },
      { caller: 'Gina', time: '9:30 PM', need: 'Door opens 6 inches and stops', outcome: 'Safety check done on phone, visit booked' },
      { caller: 'Unknown', time: '10:12 PM', need: 'Price for a new double door?', outcome: 'Range quoted, measure visit set' },
    ],
    todayJobs: [
      { time: '7:45', title: 'Spring replacement, car trapped', who: 'The Ferrells' },
      { time: '10:00', title: 'Opener install + app setup', who: 'A. Kowalski' },
      { time: '1:00', title: 'Commercial rollup service', who: 'Summit Storage' },
    ],
    ads: [
      { headline: 'The car is trapped and work starts at 8.', body: '{biz} answers early, carries the springs on the truck, and gets {city} out of the driveway same morning.' },
      { headline: 'Your garage door is 30% of the house people see.', body: 'New doors, quiet openers, straight quotes from {biz}. Curb appeal that opens itself.' },
    ],
    reviewAsk: 'Rolling smooth again! If we earned it, a quick Google review helps your neighbors find us before their spring snaps: ',
    signature: {
      tabLabel: 'Springs',
      title: 'Same-day rescue board',
      sub: 'Snapped springs mean trapped cars and same-day money. This board keeps the morning rescue lane open.',
      metricLabel: 'Same-day jobs this month',
      metricValue: '19',
      rows: [
        { title: 'Ferrell spring rescue', sub: 'Booked 7:45 AM, both springs on truck 2, car out by 8:15', amount: 380, tag: 'This morning', tone: 'hot' },
        { title: 'Summit Storage contract', sub: '6 rollups quarterly, proposal in, worth the wait', amount: 11200, tag: 'Annual value', tone: 'wait' },
        { title: 'Door replacement pipeline', sub: '4 measure visits this week, showroom links sent', amount: 9800, tag: 'Pipeline', tone: 'won' },
        { title: 'Opener upgrade list', sub: '28 past customers with pre-wifi openers, offer queued', amount: 17360, tag: 'Text them', tone: 'hot' },
      ],
      footer: 'In the real build early panic calls get the first truck, spring sizes ride on the job record, and old openers age into upgrade offers.',
    },
    extraAutomations: [
      { icon: 'bolt', title: 'Trapped-car priority', desc: 'Callers with a car stuck inside jump the queue and get the earliest truck with the spring walkthrough texted.', on: true },
      { icon: 'bell', title: 'Annual tune-up recall', desc: 'Every install books its own next-year tune-up reminder. Quiet doors, recurring visits.', on: false },
    ],
  },

  /* ------------------------------- TREE SERVICE ------------------------- */
  tree_service: {
    label: 'Tree service',
    jobWord: 'job',
    stages: ['New lead', 'Bid out', 'On the schedule', 'Done'],
    accent: '#6fae5c',
    accentSoft: 'rgba(111,174,92,0.14)',
    weekRevenue: 18400,
    avgTicket: 2400,
    customers: [
      { name: 'The Merricks', need: 'Oak over the roofline, removal', value: 3800, stage: 1 },
      { name: 'S. Abbott', need: 'Storm limb on the fence', value: 950, stage: 2 },
      { name: 'Fairway Twelve HOA', need: 'Seasonal trim contract, 40 trees', value: 8600, stage: 1 },
      { name: 'D. Lund', need: 'Stump grinding, 3 stumps', value: 420, stage: 0 },
      { name: 'The Yarboroughs', need: 'Crane removal, done Monday', value: 5200, stage: 3 },
      { name: 'K. Winters', need: 'Health assessment, browning pine', value: 275, stage: 2 },
    ],
    overnightCalls: [
      { caller: 'S. Abbott', time: '10:20 PM', need: 'Limb came down on the fence line', outcome: 'Photos requested by text, crew visit booked' },
      { caller: 'Neil', time: '8:44 PM', need: 'Big oak leaning after the wind', outcome: 'Hazard triage done, priority bid set' },
      { caller: 'Unknown', time: '6:40 AM', need: 'Stump grinding price', outcome: 'Quoted range, address captured' },
    ],
    todayJobs: [
      { time: '8:00', title: 'Storm limb removal', who: 'S. Abbott' },
      { time: '10:30', title: 'Bid walk: oak over roof', who: 'The Merricks' },
      { time: '1:00', title: 'Stump grinding route', who: 'D. Lund' },
    ],
    ads: [
      { headline: 'That lean was not there last year.', body: '{biz} assesses hazard trees in {city} fast, bids straight, and carries the insurance to prove it.' },
      { headline: 'Storm season books out. Beat it.', body: 'Trims and removals done clean by {biz}, certified crew, real cleanup. The yard looks better than we found it.' },
    ],
    reviewAsk: 'The crew is done and the yard is clean! If we earned it, a quick Google review helps your neighbors find a crew they can trust around the house: ',
    signature: {
      tabLabel: 'Bids',
      title: 'Bid & crane board',
      sub: 'Big removals are won in the bid and scheduled around the crane. Both live here.',
      metricLabel: 'Bids waiting on a yes',
      metricValue: '$13,350',
      rows: [
        { title: 'Fairway Twelve HOA', sub: '40-tree seasonal contract, board votes Thursday', amount: 8600, tag: 'Decision Thu', tone: 'hot' },
        { title: 'Merrick oak removal', sub: 'Bid delivered with photos and rigging plan, follow-up set', amount: 3800, tag: 'Bid out', tone: 'wait' },
        { title: 'Crane day, next Friday', sub: '2 removals stacked on the crane rental, 1 slot open', amount: '1 slot', tag: 'Fill it', tone: 'hot' },
        { title: 'Winters pine assessment', sub: 'Likely beetle kill, removal bid to follow the report', amount: 950, tag: 'Upsell', tone: 'wait' },
      ],
      footer: 'In the real build bids follow up on themselves, crane days auto-fill from the removal list, and storm calls jump the queue.',
    },
    extraAutomations: [
      { icon: 'bolt', title: 'Storm surge mode', desc: 'After a wind event, calls triage by hazard, past customers in the storm path get a check-in text, and the bid queue reorders itself.', on: true },
      { icon: 'chart', title: 'Bid follow-up ladder', desc: 'Every bid gets a day-3 text and a day-7 call reminder. Money stops leaking from "I meant to call them back."', on: true },
    ],
  },

  /* ------------------------------- LANDSCAPING -------------------------- */
  landscaping: {
    label: 'Landscaping',
    jobWord: 'job',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#7fbf5f',
    accentSoft: 'rgba(127,191,95,0.14)',
    weekRevenue: 13200,
    avgTicket: 480,
    customers: [
      { name: 'The Pattersons', need: 'Weekly mow + edge, half acre', value: 65, stage: 2 },
      { name: 'Juniper Office Park', need: 'Commercial grounds contract', value: 2400, stage: 1 },
      { name: 'R. Beaumont', need: 'Paver patio + fire pit design', value: 8400, stage: 1 },
      { name: 'M. Sandhu', need: 'Spring cleanup + mulch', value: 640, stage: 0 },
      { name: 'The Wallers', need: 'Irrigation startup, 6 zones', value: 180, stage: 2 },
      { name: 'K. Otto', need: 'Sod install, backyard done', value: 2900, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'M. Sandhu', time: '8:15 PM', need: 'Cleanup quote before the party', outcome: 'Walkthrough booked, Wednesday' },
      { caller: 'The Pattersons', time: '9:40 PM', need: 'Add trimming to the weekly visit', outcome: 'Route updated, price confirmed' },
      { caller: 'Unknown', time: '6:55 AM', need: 'Do you do paver patios?', outcome: 'Design visit set, inspiration photos requested' },
    ],
    todayJobs: [
      { time: '7:30', title: 'Route A: 11 weekly yards', who: 'Crew 1' },
      { time: '9:00', title: 'Patio design walkthrough', who: 'R. Beaumont' },
      { time: '1:00', title: 'Irrigation startup', who: 'The Wallers' },
    ],
    ads: [
      { headline: 'Your Saturday back, every Saturday.', body: '{biz} keeps {city} yards sharp on a weekly route. One call and the mower is never your problem again.' },
      { headline: 'The backyard you keep almost building.', body: 'Patios, fire pits, sod, lighting. {biz} designs it, builds it, and maintains it after.' },
    ],
    reviewAsk: 'The yard is looking sharp! If the crew earned it, a quick Google review helps your neighbors find us: ',
    signature: {
      tabLabel: 'Routes',
      title: 'Route & renewal board',
      sub: 'Recurring routes are the backbone; design builds are the margin. This board protects both.',
      metricLabel: 'Recurring revenue per month',
      metricValue: '$9,840',
      rows: [
        { title: '87 weekly & biweekly yards', sub: 'Routes A through D, 96% retention this season', amount: 9840, tag: 'Recurring', tone: 'won' },
        { title: 'Juniper Office Park', sub: 'Commercial grounds bid, decision end of month', amount: 28800, tag: 'Annual value', tone: 'hot' },
        { title: 'Beaumont patio build', sub: 'Design approved, deposit invoice out, crew window July 22', amount: 8400, tag: 'Deposit out', tone: 'wait' },
        { title: 'Fall aeration presale', sub: 'Route customers get first slots, 31 said yes last fall', amount: 4030, tag: 'Queue it', tone: 'wait' },
      ],
      footer: 'In the real build routes optimize themselves, renewals auto-invoice, and every route customer hears about the next seasonal service first.',
    },
    extraAutomations: [
      { icon: 'bell', title: 'Rain-day rescheduler', desc: 'Weather pushes the route, every affected customer gets the new day by text, nobody calls asking where you are.', on: true },
      { icon: 'chart', title: 'Seasonal presale ladder', desc: 'Cleanups, mulch, aeration, and lighting get offered to route customers in season, automatically.', on: true },
    ],
  },

  /* --------------------------------- POOL / SPA ------------------------- */
  pool_spa: {
    label: 'Pool & spa',
    jobWord: 'visit',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#4fc3d9',
    accentSoft: 'rgba(79,195,217,0.14)',
    weekRevenue: 9600,
    avgTicket: 380,
    customers: [
      { name: 'The Calverts', need: 'Weekly service, new build', value: 190, stage: 0 },
      { name: 'B. Rosen', need: 'Green pool rescue', value: 450, stage: 1 },
      { name: 'Vista Suites', need: 'Commercial route, 2 pools + spa', value: 1400, stage: 1 },
      { name: 'The Ogdens', need: 'Heater not firing', value: 680, stage: 2 },
      { name: 'D. Vann', need: 'Salt cell replacement', value: 890, stage: 2 },
      { name: 'K. Cross', need: 'Opened + balanced Monday', value: 340, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'B. Rosen', time: '7:50 PM', need: 'Pool went green before the weekend', outcome: 'Rescue visit booked, chem plan started' },
      { caller: 'The Ogdens', time: '9:05 PM', need: 'Spa heater dead, guests Saturday', outcome: 'Priority slot held, model captured' },
      { caller: 'Unknown', time: '6:35 AM', need: 'Weekly service pricing', outcome: 'Quoted, route check promised' },
    ],
    todayJobs: [
      { time: '8:00', title: 'Route: 14 weekly pools', who: 'Tech 1' },
      { time: '10:30', title: 'Green pool rescue, day 1', who: 'B. Rosen' },
      { time: '2:00', title: 'Heater diagnostic', who: 'The Ogdens' },
    ],
    ads: [
      { headline: 'Swim in it. Stop working on it.', body: '{biz} keeps {city} pools clear on a weekly route: chemistry, filters, and a photo report every visit.' },
      { headline: 'Green by Friday? Clear by Monday.', body: 'Pool rescues, heater fixes, salt systems. {biz} answers fast and shows up with the chemicals on the truck.' },
    ],
    reviewAsk: 'Crystal clear and swim-ready! If the service earned it, a quick Google review helps your neighbors skip the green-pool weekend: ',
    signature: {
      tabLabel: 'Routes',
      title: 'Route & chemistry board',
      sub: 'Weekly routes with photo-proof visits, plus every repair the route techs spot. The route feeds the repair desk.',
      metricLabel: 'Route revenue per month',
      metricValue: '$11,400',
      rows: [
        { title: '60 pools on weekly routes', sub: 'Every visit logs chemistry + a photo the owner actually gets', amount: 11400, tag: 'Recurring', tone: 'won' },
        { title: 'Repairs spotted on route', sub: '3 this week: cracked skimmer lid, weeping valve, tired pump', amount: 2210, tag: 'From routes', tone: 'hot' },
        { title: 'Vista Suites commercial', sub: '2 pools + spa, health-code logs included in the bid', amount: 16800, tag: 'Annual value', tone: 'wait' },
        { title: 'Heater season backlog', sub: '4 diagnostics booked this week, parts pre-ordered', amount: 2720, tag: 'Booked', tone: 'won' },
      ],
      footer: 'In the real build route visits log themselves with photos, spotted repairs become quotes on the spot, and chemistry history rides with the pool.',
    },
    extraAutomations: [
      { icon: 'star', title: 'Photo-proof visits', desc: 'Every route stop sends the owner a photo and the chem readings. Nobody wonders if you actually came.', on: true },
      { icon: 'bolt', title: 'Route-to-repair pipe', desc: 'A tech spotting a failing pump on route creates the quote before the truck leaves the driveway.', on: true },
    ],
  },

  /* ------------------------------- PEST CONTROL ------------------------- */
  pest_control: {
    label: 'Pest control',
    jobWord: 'visit',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#c96a4a',
    accentSoft: 'rgba(201,106,74,0.14)',
    weekRevenue: 8200,
    avgTicket: 160,
    customers: [
      { name: 'The Hutchins', need: 'Ants in the kitchen, quarterly?', value: 129, stage: 0 },
      { name: 'Bluebird Bakery', need: 'Commercial monthly contract', value: 220, stage: 1 },
      { name: 'R. Templeton', need: 'Wasp nests, both eaves', value: 185, stage: 2 },
      { name: 'M. Escobar', need: 'Termite inspection for closing', value: 145, stage: 2 },
      { name: 'The Lindquists', need: 'Mice in the garage, exclusion', value: 340, stage: 1 },
      { name: 'K. Aldana', need: 'Quarterly visit done Tuesday', value: 129, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'The Hutchins', time: '8:22 PM', need: 'Ant trail across the kitchen counter', outcome: 'Quarterly plan explained, first visit booked' },
      { caller: 'Realtor Dana', time: '7:15 PM', need: 'Termite letter before Friday', outcome: 'Inspection booked Thursday 9 AM' },
      { caller: 'Unknown', time: '6:12 AM', need: 'Something scratching in the attic', outcome: 'Wildlife triage done, visit set' },
    ],
    todayJobs: [
      { time: '8:30', title: 'Quarterly route: 9 homes', who: 'Tech 1' },
      { time: '11:00', title: 'Wasp nest removal x2', who: 'R. Templeton' },
      { time: '2:30', title: 'Termite inspection + letter', who: 'M. Escobar' },
    ],
    ads: [
      { headline: 'The ants found the kitchen. We find the colony.', body: '{biz} treats the source, not the trail, and the quarterly plan keeps {city} homes quiet year-round.' },
      { headline: 'One visit is a fix. Quarterly is peace.', body: 'Ants, wasps, mice, spiders, handled on a schedule by {biz}. First visit usually books within a day.' },
    ],
    reviewAsk: 'All treated and quieting down! If the visit went well, a quick Google review helps your neighbors find us before the ants find them: ',
    signature: {
      tabLabel: 'Plans',
      title: 'Quarterly plan engine',
      sub: 'One-time sprays pay once. Quarterly plans pay four times a year, forever. This board converts and keeps them.',
      metricLabel: 'Plan revenue per year',
      metricValue: '$47,988',
      rows: [
        { title: '93 quarterly plan members', sub: '$129/visit, 4 visits a year, 91% renewal', amount: 47988, tag: 'Recurring', tone: 'won' },
        { title: 'One-time to plan converts', sub: '6 of 11 one-time visits took the plan pitch this month', amount: 3096, tag: 'Converting', tone: 'won' },
        { title: 'Termite letter lane', sub: 'Realtor season: 7 closing inspections this month', amount: 1015, tag: 'Trend', tone: 'wait' },
        { title: 'Lapsed member win-back', sub: '12 plans lapsed this year, "we miss you" offer queued', amount: 6192, tag: 'Text them', tone: 'hot' },
      ],
      footer: 'In the real build every one-time visit gets the plan pitch, renewals bill themselves, and lapsed members hear from you automatically.',
    },
    extraAutomations: [
      { icon: 'star', title: 'Plan pitch on every visit', desc: 'One-time customers get the quarterly math texted after the visit while the dead ants are still visible.', on: true },
      { icon: 'bell', title: 'Season pest calendar', desc: 'Wasp season, ant season, and mouse season each trigger the right reminder to the right customers.', on: true },
    ],
  },

  /* --------------------------------- PAINTING --------------------------- */
  painting: {
    label: 'Painting',
    jobWord: 'job',
    stages: ['New lead', 'Estimated', 'Scheduled', 'Done'],
    accent: '#9a7fd1',
    accentSoft: 'rgba(154,127,209,0.14)',
    weekRevenue: 15600,
    avgTicket: 3800,
    customers: [
      { name: 'The Raines', need: 'Exterior repaint, 2-story', value: 7800, stage: 1 },
      { name: 'K. Moreau', need: 'Kitchen cabinets, white to sage', value: 3400, stage: 2 },
      { name: 'Elm Street Dental', need: 'Office refresh, weekend work', value: 4600, stage: 1 },
      { name: 'B. Sloan', need: 'Interior, 3 bedrooms + hall', value: 2900, stage: 0 },
      { name: 'The Vermas', need: 'Deck stain + rail repair', value: 1850, stage: 2 },
      { name: 'D. Quinn', need: 'Accent walls done Monday', value: 980, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'B. Sloan', time: '8:05 PM', need: 'Interior quote, 3 bedrooms', outcome: 'Estimate walk booked, color consult offered' },
      { caller: 'The Raines', time: '9:47 PM', need: 'Is the exterior estimate still good?', outcome: 'Confirmed, schedule options texted' },
      { caller: 'Unknown', time: '6:28 AM', need: 'Do you paint cabinets?', outcome: 'Answered, photos requested by text' },
    ],
    todayJobs: [
      { time: '8:00', title: 'Cabinet spray day 2', who: 'K. Moreau' },
      { time: '10:00', title: 'Estimate walk: exterior', who: 'The Raines' },
      { time: '1:30', title: 'Deck stain, weather window', who: 'The Vermas' },
    ],
    ads: [
      { headline: 'The color is the easy part. The edges are ours.', body: '{biz} preps right, cuts clean lines, and leaves {city} rooms looking like the inspiration photo.' },
      { headline: 'Cabinets: replaced costs $14k. Painted costs $3k.', body: '{biz} sprays factory-smooth finishes on the cabinets you already own. Free color consult with every estimate.' },
    ],
    reviewAsk: 'The paint is cured and the tape is off! If the finish earned it, a quick Google review helps your neighbors find us: ',
    signature: {
      tabLabel: 'Estimates',
      title: 'Estimate & win-rate board',
      sub: 'Painting is an estimate game: speed to quote and follow-up discipline decide the month.',
      metricLabel: 'Estimates waiting on a yes',
      metricValue: '$15,300',
      rows: [
        { title: 'Raines exterior repaint', sub: 'Estimate day 6, second follow-up queued with color mockup', amount: 7800, tag: 'Follow up', tone: 'hot' },
        { title: 'Elm Street Dental refresh', sub: 'Weekend-work bid, office manager deciding this week', amount: 4600, tag: 'Bid out', tone: 'wait' },
        { title: 'Sloan interior estimate', sub: 'Walk booked tomorrow 10 AM, prep sheet ready', amount: 2900, tag: 'Walk tomorrow', tone: 'wait' },
        { title: 'Win rate this quarter', sub: '14 of 23 estimates closed. Follow-ups win 4 of those', amount: '61%', tag: 'Win rate', tone: 'won' },
      ],
      footer: 'In the real build estimates go out same-day with color mockups, and every quote follows up on itself until it gets an answer.',
    },
    extraAutomations: [
      { icon: 'chart', title: 'Same-day estimate rule', desc: 'Every walk becomes a written estimate before dinner, with a color mockup attached. Speed wins bids.', on: true },
      { icon: 'star', title: 'Season repaint radar', desc: 'Exteriors painted 6+ years ago get a friendly check-in each spring, photos of their own house included.', on: false },
    ],
  },

  /* ---------------------------------- MOVING ---------------------------- */
  moving: {
    label: 'Moving',
    jobWord: 'move',
    stages: ['New lead', 'Quoted', 'Booked', 'Done'],
    accent: '#d98e4a',
    accentSoft: 'rgba(217,142,74,0.14)',
    weekRevenue: 17400,
    avgTicket: 1450,
    customers: [
      { name: 'The Fitzgeralds', need: '4BR house, cross-town, packing', value: 3200, stage: 1 },
      { name: 'R. Chandra', need: '1BR apartment, 3rd floor walk-up', value: 780, stage: 2 },
      { name: 'Cornerstone Law', need: 'Office move, weekend, 22 desks', value: 5400, stage: 1 },
      { name: 'M. Doyle', need: 'Piano + safe, specialty', value: 950, stage: 0 },
      { name: 'The Ashbys', need: 'Storage unit to new build', value: 1250, stage: 2 },
      { name: 'K. Fontaine', need: 'Studio move done Saturday', value: 640, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'The Fitzgeralds', time: '8:34 PM', need: 'Quote for a 4-bedroom, end of month', outcome: 'Video walkthrough booked, inventory started' },
      { caller: 'R. Chandra', time: '10:11 PM', need: 'Can you do the 28th?', outcome: 'Date held, deposit link texted' },
      { caller: 'Unknown', time: '7:02 AM', need: 'Do you move pianos?', outcome: 'Answered, specialty quote set' },
    ],
    todayJobs: [
      { time: '8:00', title: 'Load day: 3rd floor walk-up', who: 'R. Chandra' },
      { time: '12:30', title: 'Video walkthrough quote', who: 'The Fitzgeralds' },
      { time: '3:00', title: 'Storage-to-house delivery', who: 'The Ashbys' },
    ],
    ads: [
      { headline: 'Month-end books out first. So do we.', body: '{biz} quotes by video walkthrough, shows up padded and on time, and treats {city} furniture like our own.' },
      { headline: 'The move without the horror story.', body: 'Licensed, insured, flat quotes honored. {biz} carries the day so you carry the keys.' },
    ],
    reviewAsk: 'Welcome to the new place! If the crew took good care of you, a quick Google review helps the next family pick a mover they can trust: ',
    signature: {
      tabLabel: 'Calendar',
      title: 'Truck & crew calendar',
      sub: 'Moving is a calendar business: month-end fills first and empty truck days eat margin. This board balances both.',
      metricLabel: 'Month-end capacity booked',
      metricValue: '84%',
      rows: [
        { title: 'June 27 to 30 crunch', sub: '11 of 13 crew slots booked, 2 trucks at capacity', amount: '84%', tag: 'Nearly full', tone: 'won' },
        { title: 'Cornerstone Law office move', sub: 'Weekend job, site visit Wednesday, elevator reserved', amount: 5400, tag: 'Site visit', tone: 'hot' },
        { title: 'Mid-month gap, June 16 to 19', sub: '3 open truck days, mid-month discount campaign queued', amount: '3 open days', tag: 'Fill them', tone: 'hot' },
        { title: 'Deposit outstanding', sub: '2 booked moves have not paid the deposit link yet', amount: 640, tag: 'Chase', tone: 'wait' },
      ],
      footer: 'In the real build quotes come from video walkthroughs, deposits chase themselves, and slow days trigger their own fill campaigns.',
    },
    extraAutomations: [
      { icon: 'bell', title: 'Move-week countdown', desc: 'Booked customers get the packing checklist, arrival window, and parking reminders on a schedule. Fewer surprises, faster loads.', on: true },
      { icon: 'chart', title: 'Empty-day filler', desc: 'Open truck days within 2 weeks trigger a mid-month discount to the quote list that has not booked yet.', on: true },
    ],
  },

  /* --------------------------------- CLEANING --------------------------- */
  cleaning: {
    label: 'Cleaning',
    jobWord: 'clean',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#5fc9a8',
    accentSoft: 'rgba(95,201,168,0.14)',
    weekRevenue: 7800,
    avgTicket: 220,
    customers: [
      { name: 'The Winslows', need: 'Biweekly house clean, 4BR', value: 190, stage: 2 },
      { name: 'Hartley Dental', need: 'Nightly office clean contract', value: 1400, stage: 1 },
      { name: 'R. Patel', need: 'Move-out deep clean, Friday', value: 380, stage: 2 },
      { name: 'M. Combs', need: 'First-time deep clean quote', value: 320, stage: 0 },
      { name: 'Alder Street Rentals', need: 'Turnover cleans, 3 units/mo', value: 690, stage: 1 },
      { name: 'K. Whitley', need: 'Weekly clean done Tuesday', value: 145, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'M. Combs', time: '8:12 PM', need: 'Deep clean before in-laws Saturday', outcome: 'Quote given from room count, Friday slot held' },
      { caller: 'R. Patel', time: '9:55 PM', need: 'Move-out clean, deposit on the line', outcome: 'Checklist explained, booked Friday 9 AM' },
      { caller: 'Unknown', time: '6:44 AM', need: 'Weekly pricing for a 3BR', outcome: 'Quoted, walkthrough offered' },
    ],
    todayJobs: [
      { time: '9:00', title: 'Biweekly clean', who: 'The Winslows' },
      { time: '12:00', title: 'Move-out deep clean', who: 'R. Patel' },
      { time: '3:00', title: 'Turnover: unit 2C', who: 'Alder Street Rentals' },
    ],
    ads: [
      { headline: 'Come home to done.', body: '{biz} cleans {city} homes on a schedule you never think about. Photo checklist after every visit.' },
      { headline: 'The deposit-saving move-out clean.', body: 'Landlord checklist covered, receipts included. {biz} books move-outs within 48 hours.' },
    ],
    reviewAsk: 'The place is sparkling! If the clean earned it, a quick Google review helps your neighbors come home to done too: ',
    signature: {
      tabLabel: 'Roster',
      title: 'Recurring roster board',
      sub: 'Recurring homes are the whole business. This board guards the roster and turns one-time cleans into regulars.',
      metricLabel: 'Recurring revenue per month',
      metricValue: '$8,360',
      rows: [
        { title: '52 homes on the roster', sub: 'Weekly and biweekly, 94% retention this year', amount: 8360, tag: 'Recurring', tone: 'won' },
        { title: 'One-time to recurring', sub: '4 of 9 deep cleans took the biweekly offer this month', amount: 760, tag: 'Converting', tone: 'won' },
        { title: 'Hartley Dental nightly contract', sub: 'Walk-through done, proposal out, decision Friday', amount: 16800, tag: 'Annual value', tone: 'hot' },
        { title: 'Cancellation saves', sub: '2 pause requests offered a skip instead. Both stayed', amount: 'Saved 2', tag: 'Retention', tone: 'won' },
      ],
      footer: 'In the real build every one-time clean gets the recurring pitch, pauses become skips, and turnover units book themselves from the landlord portal.',
    },
    extraAutomations: [
      { icon: 'star', title: 'Deep-clean to recurring pitch', desc: 'The day after a one-time clean, the customer gets the recurring math while the house still smells like lemon.', on: true },
      { icon: 'bell', title: 'Visit-day heads-up', desc: 'Every roster home gets tonight-before and on-the-way texts. Locked doors stop eating crew hours.', on: true },
    ],
  },

  /* -------------------------------- AUTO REPAIR ------------------------- */
  auto_repair: {
    label: 'Auto repair',
    jobWord: 'ticket',
    stages: ['Checked in', 'Diagnosed', 'Approved / in bay', 'Ready'],
    accent: '#d1584a',
    accentSoft: 'rgba(209,88,74,0.14)',
    weekRevenue: 19200,
    avgTicket: 720,
    customers: [
      { name: 'C. Redmond, Silverado', need: 'Brakes grinding, front end', value: 640, stage: 1 },
      { name: 'A. Foster, Outback', need: 'Check engine, misfire code', value: 890, stage: 2 },
      { name: 'Kettle Creek Delivery', need: 'Fleet: 3 vans, rotation + oil', value: 540, stage: 2 },
      { name: 'M. Ivers, Civic', need: 'AC blows warm', value: 480, stage: 0 },
      { name: 'D. Barnes, F-150', need: 'Transmission slipping', value: 3400, stage: 1 },
      { name: 'R. Cho, CX-5', need: 'Timing service done, picked up', value: 1150, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'C. Redmond', time: '7:41 PM', need: 'Brakes grinding, safe to drive?', outcome: 'Safety guidance given, 8 AM drop-off booked' },
      { caller: 'A. Foster', time: '9:26 PM', need: 'Check engine light came on', outcome: 'Symptoms captured, diagnostic slot held' },
      { caller: 'Unknown', time: '6:50 AM', need: 'Do you do AC recharges?', outcome: 'Answered, appointment offered' },
    ],
    todayJobs: [
      { time: '8:00', title: 'Brake job, front axle', who: 'C. Redmond' },
      { time: '10:00', title: 'Misfire diagnostic', who: 'A. Foster' },
      { time: '1:00', title: 'Fleet rotation x3', who: 'Kettle Creek Delivery' },
    ],
    ads: [
      { headline: 'The light is on. The answer is a text away.', body: '{biz} diagnoses straight, quotes before wrenching, and texts photos of what we found. {city} drives on us.' },
      { headline: 'Approved by text, ready by five.', body: 'No mystery invoices at {biz}. See the photo, approve the fix, pick up the keys.' },
    ],
    reviewAsk: 'She is running right again! If we earned your trust, a quick Google review helps your neighbors find an honest shop: ',
    signature: {
      tabLabel: 'Bays',
      title: 'Bay & approval board',
      sub: 'A shop makes money when bays turn and approvals come back fast. Both live on this board.',
      metricLabel: 'Waiting on customer approval',
      metricValue: '$4,930',
      rows: [
        { title: 'Barnes F-150 transmission', sub: 'Estimate texted with video 2 hrs ago, nudge queued', amount: 3400, tag: 'Awaiting OK', tone: 'hot' },
        { title: 'Foster Outback misfire', sub: 'Coil pack diagnosed, photo sent, approved in 11 minutes', amount: 890, tag: 'Approved', tone: 'won' },
        { title: 'Redmond brake job', sub: 'In bay 2, parts on shelf, ready by 3 PM promised', amount: 640, tag: 'In bay', tone: 'won' },
        { title: 'Parts arriving today', sub: 'AC compressor for the Civic lands 11 AM, bay 3 reserved', amount: 480, tag: 'Parts 11 AM', tone: 'wait' },
      ],
      footer: 'In the real build estimates go out with photos and videos, approvals come back by text, and ready-for-pickup texts itself.',
    },
    extraAutomations: [
      { icon: 'bolt', title: 'Photo estimate approvals', desc: 'Every diagnosis becomes a photo-backed text estimate the customer can approve from work. Bays stop waiting on phone tag.', on: true },
      { icon: 'bell', title: 'Service due reminders', desc: 'Mileage-based reminders bring last year’s customers back for the next oil change, rotation, and brake check.', on: true },
    ],
  },

  /* ---------------------------------- MEDSPA ---------------------------- */
  medspa: {
    label: 'Med spa',
    jobWord: 'appointment',
    stages: ['New inquiry', 'Consult set', 'Booked', 'Seen'],
    accent: '#d98bb8',
    accentSoft: 'rgba(217,139,184,0.14)',
    weekRevenue: 14200,
    avgTicket: 450,
    customers: [
      { name: 'Hannah B.', need: 'Tox consult, first time', value: 380, stage: 0 },
      { name: 'Priya S.', need: 'Filler touch-up, returning', value: 650, stage: 1 },
      { name: 'M. Delacroix', need: 'Laser series, package of 6', value: 1800, stage: 1 },
      { name: 'Alyssa G.', need: 'Membership signup, monthly', value: 199, stage: 2 },
      { name: 'J. Romero', need: 'Hydrafacial before the gala', value: 240, stage: 2 },
      { name: 'K. Whitmore', need: 'Microneedling session 2 of 4', value: 350, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Hannah B.', time: '7:36 PM', need: 'First-time tox pricing', outcome: 'Consult booked Thursday, intake form texted' },
      { caller: 'Priya S.', time: '9:02 PM', need: 'Squeeze me in before Saturday?', outcome: 'Cancellation slot held, confirmed by text' },
      { caller: 'Unknown', time: '6:22 AM', need: 'Do you do laser hair removal?', outcome: 'Series pricing explained, consult offered' },
    ],
    todayJobs: [
      { time: '9:00', title: 'Tox consult + treatment', who: 'Hannah B.' },
      { time: '11:30', title: 'Laser series, session 1', who: 'M. Delacroix' },
      { time: '3:00', title: 'Hydrafacial', who: 'J. Romero' },
    ],
    ads: [
      { headline: 'Booked out is not the same as unreachable.', body: '{biz} answers every call, holds cancellation slots, and gets {city} in before the event, not after.' },
      { headline: 'The glow has a waitlist. Skip it.', body: 'Members at {biz} get priority booking, monthly credits, and first call on cancellations.' },
    ],
    reviewAsk: 'You looked amazing walking out today! If your visit earned it, a quick Google review helps others find us: ',
    signature: {
      tabLabel: 'Members',
      title: 'Membership & series board',
      sub: 'Memberships smooth the revenue and series keep the calendar full. This board grows both.',
      metricLabel: 'Membership revenue per month',
      metricValue: '$13,533',
      rows: [
        { title: '68 active members', sub: '$199/mo credits + priority booking, 3 joined this week', amount: 13533, tag: 'Recurring', tone: 'won' },
        { title: 'Series in progress', sub: '14 laser and microneedling series, next sessions auto-booked', amount: 9400, tag: 'Booked ahead', tone: 'won' },
        { title: 'Lapsed 90-day list', sub: '21 past clients past their usual rebook window', amount: 7350, tag: 'Win back', tone: 'hot' },
        { title: 'Cancellation waitlist', sub: '6 clients want earlier slots. Tonight’s opening already offered', amount: 'Filled', tag: 'Waitlist', tone: 'won' },
      ],
      footer: 'In the real build memberships bill themselves, series auto-book the next session, and every cancellation fills from the waitlist in minutes.',
    },
    extraAutomations: [
      { icon: 'star', title: 'Rebook rhythm', desc: 'Tox at 90 days, filler at 6 months, facials monthly. Every client gets the right nudge at their right interval.', on: true },
      { icon: 'bolt', title: 'Cancellation flash fill', desc: 'An opening today goes to the waitlist by text instantly. Empty chairs stop costing money.', on: true },
    ],
  },

  /* ---------------------------------- DENTAL ---------------------------- */
  dental: {
    ...OS_PRESETS.dental_medspa,
    label: 'Dental',
    avgTicket: 850,
    signature: {
      tabLabel: 'Recalls',
      title: 'Recall & membership board',
      sub: 'The money in a practice hides in overdue recalls and unscheduled treatment. This board surfaces both.',
      metricLabel: 'Overdue recall value',
      metricValue: '$18,540',
      rows: [
        { title: '103 patients overdue for hygiene', sub: 'Past their 6-month mark, reactivation texts queued', amount: 18540, tag: 'Text them', tone: 'hot' },
        { title: 'Unscheduled treatment plans', sub: '9 diagnosed crowns and fillings never got booked', amount: 11250, tag: 'Follow up', tone: 'hot' },
        { title: 'Membership plan patients', sub: '41 uninsured patients on the in-house plan, renewals auto-bill', amount: 15990, tag: 'Recurring', tone: 'won' },
        { title: 'Tomorrow’s confirmations', sub: '14 of 16 confirmed, 2 got the second nudge', amount: '14 / 16', tag: 'Confirmed', tone: 'won' },
      ],
      footer: 'In the real build recalls chase themselves, unscheduled treatment gets a gentle ladder of reminders, and no-shows fill from the short-notice list.',
    },
    extraAutomations: [
      { icon: 'star', title: 'Recall resurrection', desc: 'Patients past their 6-month mark get a friendly text ladder until they book. An empty hygiene chair is the most expensive seat in town.', on: true },
      { icon: 'bell', title: 'Treatment plan follow-up', desc: 'Diagnosed-but-unscheduled treatment gets a caring check-in at day 7 and day 30. Health first, schedule second.', on: true },
    ],
  },

  /* ------------------------------------ VET ----------------------------- */
  vet: {
    label: 'Veterinary',
    jobWord: 'appointment',
    stages: ['New patient', 'Triage', 'Booked', 'Seen'],
    accent: '#7fb0d9',
    accentSoft: 'rgba(127,176,217,0.14)',
    weekRevenue: 16800,
    avgTicket: 320,
    customers: [
      { name: 'Biscuit (Lab, 6y)', need: 'Limping after the dog park', value: 280, stage: 1 },
      { name: 'Mochi (cat, 2y)', need: 'Not eating since yesterday', value: 340, stage: 1 },
      { name: 'Duke (Shepherd, 9y)', need: 'Senior panel + dental quote', value: 890, stage: 2 },
      { name: 'Pepper (new puppy)', need: 'First visit + vaccine series', value: 210, stage: 0 },
      { name: 'Luna (Husky, 4y)', need: 'Ate something, monitoring', value: 450, stage: 2 },
      { name: 'Baxter (Beagle, 7y)', need: 'Dental cleaning done Tuesday', value: 620, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Mochi’s owner', time: '10:42 PM', need: 'Cat has not eaten all day, worried', outcome: 'Triage questions asked, first slot held, ER criteria explained' },
      { caller: 'Luna’s owner', time: '11:58 PM', need: 'She ate a sock, what do I do?', outcome: 'Escalation guidance given, morning check booked' },
      { caller: 'Unknown', time: '6:37 AM', need: 'New puppy, first visit cost?', outcome: 'Answered, new-patient packet texted' },
    ],
    todayJobs: [
      { time: '9:00', title: 'Inappetence workup', who: 'Mochi' },
      { time: '10:30', title: 'Limp exam + rads', who: 'Biscuit' },
      { time: '2:00', title: 'New puppy first visit', who: 'Pepper' },
    ],
    ads: [
      { headline: 'The 11 PM "should I worry?" call, answered.', body: '{biz} picks up around the clock, triages honestly, and holds the first morning slot for the scary ones.' },
      { headline: 'New puppy? We have a plan for that.', body: 'Vaccine series, spay timing, the works, mapped out at {biz}. {city} pets grow up on our schedule.' },
    ],
    reviewAsk: 'Give them a treat from us! If the visit went well, a quick Google review helps other pet parents find us: ',
    signature: {
      tabLabel: 'Triage',
      title: 'Overnight triage board',
      sub: 'Worried owners call at night. The ones triaged well at 11 PM become the loyal clients of the next decade.',
      metricLabel: 'Night calls triaged this month',
      metricValue: '47',
      rows: [
        { title: 'Luna, foreign body watch', sub: 'Sock ingestion 11:58 PM, ER criteria given, morning check booked', amount: 450, tag: 'Monitoring', tone: 'hot' },
        { title: 'Mochi, inappetence', sub: 'First slot held from the night call, owner reassured', amount: 340, tag: 'Booked', tone: 'won' },
        { title: 'Vaccine reminders due', sub: '58 patients due this month, texts going out in waves', amount: 8120, tag: 'Recurring', tone: 'won' },
        { title: 'Dental month pipeline', sub: '11 quoted dentals unscheduled, gentle follow-up queued', amount: 6820, tag: 'Follow up', tone: 'wait' },
      ],
      footer: 'In the real build night calls get real triage, true emergencies route to the ER with your blessing, and everything else books itself for morning.',
    },
    extraAutomations: [
      { icon: 'bell', title: 'Vaccine + preventive waves', desc: 'Due patients get their reminders in weekly waves sized to open slots, not all at once.', on: true },
      { icon: 'star', title: 'New puppy journey', desc: 'Every new puppy visit schedules the whole vaccine series and the spay conversation at the right weeks.', on: true },
    ],
  },

  /* --------------------------------- ATTORNEY --------------------------- */
  attorney: {
    label: 'Law practice',
    jobWord: 'consult',
    stages: ['New inquiry', 'Consult set', 'Retained', 'Resolved'],
    accent: '#8f9fd1',
    accentSoft: 'rgba(143,159,209,0.14)',
    weekRevenue: 24500,
    avgTicket: 8500,
    customers: [
      { name: 'R. Calloway', need: 'Rear-ended on Hwy 12, injured', value: 12000, stage: 1 },
      { name: 'M. Britt', need: 'Slip and fall, grocery store', value: 8500, stage: 0 },
      { name: 'D. Nakamura', need: 'DUI arraignment Friday', value: 4500, stage: 2 },
      { name: 'The Egans', need: 'Estate plan, both wills + trust', value: 2800, stage: 1 },
      { name: 'K. Prescott', need: 'Custody modification', value: 5200, stage: 2 },
      { name: 'J. Ambrose', need: 'Settlement disbursed Monday', value: 21000, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'R. Calloway', time: '8:19 PM', need: 'Accident today, insurance already calling', outcome: 'Do-not-sign guidance given, consult booked 9 AM' },
      { caller: 'D. Nakamura', time: '11:47 PM', need: 'Arrested tonight, arraignment Friday', outcome: 'Intake captured, urgent flag, you were texted' },
      { caller: 'Unknown', time: '6:15 AM', need: 'Do you take contingency cases?', outcome: 'Answered, screening questions captured' },
    ],
    todayJobs: [
      { time: '9:00', title: 'Injury consult (from night call)', who: 'R. Calloway' },
      { time: '11:00', title: 'Deposition prep', who: 'K. Prescott' },
      { time: '2:30', title: 'Estate plan signing', who: 'The Egans' },
    ],
    ads: [
      { headline: 'The insurance company already has a lawyer.', body: 'Now you do too. {biz} answers day and night, and the consult costs nothing until we win.' },
      { headline: 'Arrested is not convicted.', body: '{biz} picks up at midnight, explains the next 48 hours, and stands next to you Friday morning.' },
    ],
    reviewAsk: 'It was an honor to stand with you. If our work earned it, a quick Google review helps the next person find counsel they can trust: ',
    signature: {
      tabLabel: 'Intake',
      title: 'Intake & deadline board',
      sub: 'A practice lives on signed retainers and dies on missed deadlines. This board watches both.',
      metricLabel: 'Potential case value in intake',
      metricValue: '$30,200',
      rows: [
        { title: 'Calloway injury intake', sub: 'Night call captured, consult 9 AM, crash report requested', amount: 12000, tag: 'Consult 9 AM', tone: 'hot' },
        { title: 'Britt slip and fall', sub: 'Incident report + photos requested, screening passed', amount: 8500, tag: 'Screening', tone: 'wait' },
        { title: 'Nakamura arraignment', sub: 'FRIDAY 9 AM, calendar blocked, discovery request drafted', amount: 4500, tag: 'Deadline Fri', tone: 'hot' },
        { title: 'Unsigned retainers', sub: '2 consults this week left without signing, follow-up queued', amount: 7000, tag: 'Chase', tone: 'wait' },
      ],
      footer: 'In the real build intake screens itself on the first call, statutes and court dates land on the calendar with alarms, and unsigned retainers get followed up.',
    },
    extraAutomations: [
      { icon: 'bolt', title: 'Midnight intake', desc: 'The 11 PM arrest call gets full intake, urgency flagging, and a morning slot while competitors ring to voicemail.', on: true },
      { icon: 'bell', title: 'Deadline sentinel', desc: 'Statutes of limitation and court dates get triple alarms: 30 days, 7 days, 48 hours. Nothing slips.', on: true },
    ],
  },

  /* ---------------------------------- WEDDING --------------------------- */
  wedding: {
    label: 'Weddings & events',
    jobWord: 'booking',
    stages: ['New inquiry', 'Toured / quoted', 'Booked', 'Celebrated'],
    accent: '#d9a4c4',
    accentSoft: 'rgba(217,164,196,0.14)',
    weekRevenue: 16400,
    avgTicket: 3200,
    customers: [
      { name: 'Emma & Cole', need: 'Oct 18 inquiry, 120 guests', value: 4800, stage: 0 },
      { name: 'The Reyes wedding', need: 'Tour Saturday, June date', value: 5200, stage: 1 },
      { name: 'Hartley 50th anniversary', need: 'Private dinner, 40 guests', value: 2400, stage: 1 },
      { name: 'Simone & Drew', need: 'Booked May 9, menu tasting next', value: 6100, stage: 2 },
      { name: 'Corporate holiday party', need: 'December Friday, holds 2 dates', value: 3800, stage: 1 },
      { name: 'Nadia & Ben', need: 'Celebrated Saturday, gallery due', value: 4300, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Emma', time: '9:28 PM', need: 'Is October 18 still open?', outcome: 'Date confirmed open, tour booked, brochure texted' },
      { caller: 'Marcus (best man)', time: '10:55 PM', need: 'Surprise party for 30, next month', outcome: 'Options given, hold placed' },
      { caller: 'Unknown', time: '7:08 AM', need: 'Pricing for a small wedding', outcome: 'Range shared, tour offered' },
    ],
    todayJobs: [
      { time: '10:00', title: 'Venue tour', who: 'The Reyes wedding' },
      { time: '1:00', title: 'Menu tasting', who: 'Simone & Drew' },
      { time: '4:00', title: 'Gallery delivery + review ask', who: 'Nadia & Ben' },
    ],
    ads: [
      { headline: 'The date you want is being asked about.', body: 'Popular {city} dates go 12 to 18 months out. {biz} answers at 9 PM when you are both finally looking.' },
      { headline: 'One venue answer changes the whole plan.', body: '{biz} confirms dates, holds them honestly, and tours on your schedule. Start with the yes.' },
    ],
    reviewAsk: 'It was beautiful and we were honored to be part of it! When the dust settles, a quick Google review helps the next couple find us: ',
    signature: {
      tabLabel: 'Dates',
      title: 'Date & deposit board',
      sub: 'Inventory is dates. Every hold, deposit, and expiring option in one glance, because a lost Saturday never comes back.',
      metricLabel: 'Booked season revenue',
      metricValue: '$61,300',
      rows: [
        { title: 'Oct 18: Emma & Cole', sub: 'Inquiry last night 9:28 PM, tour booked, only Oct date left', amount: 4800, tag: 'Hot date', tone: 'hot' },
        { title: 'Dec corporate holds', sub: '2 Fridays held by the same company, decision due in 5 days', amount: 3800, tag: 'Hold expiring', tone: 'wait' },
        { title: 'Deposits outstanding', sub: 'Reyes wedding toured happy, contract sent, deposit link live', amount: 1560, tag: 'Chase', tone: 'hot' },
        { title: '2027 season pace', sub: '14 Saturdays booked vs 9 this time last year', amount: '+55%', tag: 'Ahead', tone: 'won' },
      ],
      footer: 'In the real build date inquiries get instant honest answers, holds expire themselves politely, and deposits chase until the date is truly saved.',
    },
    extraAutomations: [
      { icon: 'bell', title: 'Hold expiry etiquette', desc: 'Date holds get gracious countdown reminders, and expired holds reopen to the waitlist automatically.', on: true },
      { icon: 'star', title: 'Season review harvest', desc: 'Two weeks after each event, the couple gets a warm review ask with their favorite photo attached.', on: true },
    ],
  },

  /* ---------------------------------- SALON ----------------------------- */
  salon: {
    label: 'Salon & barber',
    jobWord: 'appointment',
    stages: ['New client', 'Consulted', 'Booked', 'Styled'],
    accent: '#c98fd1',
    accentSoft: 'rgba(201,143,209,0.14)',
    weekRevenue: 6400,
    avgTicket: 85,
    customers: [
      { name: 'Talia R.', need: 'Balayage consult, new client', value: 240, stage: 0 },
      { name: 'M. Okafor', need: 'Fade + beard, regular', value: 55, stage: 2 },
      { name: 'Bridal party of 5', need: 'June 14 morning block', value: 620, stage: 1 },
      { name: 'J. Castellano', need: 'Color correction, box-dye rescue', value: 310, stage: 1 },
      { name: 'Deb W.', need: 'Standing biweekly set', value: 65, stage: 2 },
      { name: 'A. Finch', need: 'Cut + gloss done Tuesday', value: 120, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Talia R.', time: '8:47 PM', need: 'Balayage pricing and openings', outcome: 'Consult booked, inspo photos requested' },
      { caller: 'Bride Kayla', time: '9:52 PM', need: 'Hair for 5, wedding morning', outcome: 'Block held, trial booked' },
      { caller: 'Unknown', time: '7:12 AM', need: 'Walk-ins today?', outcome: 'First opening offered, name captured' },
    ],
    todayJobs: [
      { time: '9:00', title: 'Balayage consult', who: 'Talia R.' },
      { time: '11:30', title: 'Color correction, 3 hrs', who: 'J. Castellano' },
      { time: '3:30', title: 'Fade + beard', who: 'M. Okafor' },
    ],
    ads: [
      { headline: 'Your stylist saw the photo already.', body: 'Send the inspo, get the consult, book the chair. {biz} makes {city} hair appointments this easy.' },
      { headline: 'The chair that remembers you.', body: 'Your formula, your usual, your standing slot. {biz} keeps regulars feeling like regulars.' },
    ],
    reviewAsk: 'You left looking amazing! If today earned it, a quick Google review helps new clients find the chair: ',
    signature: {
      tabLabel: 'Chairs',
      title: 'Chair & rebook board',
      sub: 'Empty chair time is the only real cost in a salon. This board fills gaps and rebooks before they leave the chair.',
      metricLabel: 'Rebooked before leaving',
      metricValue: '71%',
      rows: [
        { title: 'Tomorrow: 2 open slots', sub: '11:00 and 2:30 open, waitlist of 4 already texted', amount: '2 gaps', tag: 'Filling', tone: 'hot' },
        { title: 'Standing appointments', sub: '34 clients on standing slots, auto-confirmed weekly', amount: 2890, tag: 'Recurring', tone: 'won' },
        { title: 'Bridal party block', sub: 'June 14, 5 heads, trial run booked, deposit paid', amount: 620, tag: 'Deposit in', tone: 'won' },
        { title: '8-week ghost list', sub: '19 regulars past their usual gap, "we miss you" queued', amount: 1615, tag: 'Win back', tone: 'wait' },
      ],
      footer: 'In the real build every checkout offers the next slot, gaps fill from the waitlist, and lapsed regulars get missed before they find another chair.',
    },
    extraAutomations: [
      { icon: 'star', title: 'Rebook at checkout', desc: 'Every finished appointment offers the next one while they are still in the chair loving it.', on: true },
      { icon: 'bolt', title: 'Gap-day flash list', desc: 'A cancellation texts the waitlist instantly. The 2:30 gap is gone before the broom is out.', on: true },
    ],
  },

  /* ------------------------------- CAFE / BAKERY ------------------------ */
  cafe_bakery: {
    label: 'Cafe & bakery',
    jobWord: 'order',
    stages: ['New inquiry', 'Quoted', 'Confirmed', 'Picked up'],
    accent: '#d9a05f',
    accentSoft: 'rgba(217,160,95,0.14)',
    weekRevenue: 7200,
    avgTicket: 380,
    customers: [
      { name: 'Meredith C.', need: 'Wedding cake tasting, 90 guests', value: 850, stage: 1 },
      { name: 'Oak & Iron Co.', need: 'Standing Friday pastry order', value: 140, stage: 2 },
      { name: 'The Palmers', need: 'Graduation sheet cake + cookies', value: 260, stage: 2 },
      { name: 'Ivy H.', need: 'Custom birthday cake, unicorn', value: 145, stage: 0 },
      { name: 'St. Anne’s school', need: 'Teacher week, 8 dozen assorted', value: 310, stage: 1 },
      { name: 'D. Foley', need: 'Anniversary cake picked up', value: 120, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Ivy H.', time: '8:31 PM', need: 'Unicorn cake for Saturday?', outcome: 'Availability confirmed, design details captured' },
      { caller: 'Meredith C.', time: '9:14 PM', need: 'Tasting appointment options', outcome: 'Booked Saturday 10 AM, flavor list texted' },
      { caller: 'Unknown', time: '6:02 AM', need: 'Do you do gluten-free?', outcome: 'Answered, menu texted' },
    ],
    todayJobs: [
      { time: '6:00', title: 'Bake: cases + standing orders', who: 'Kitchen' },
      { time: '10:00', title: 'Wedding cake tasting', who: 'Meredith C.' },
      { time: '4:00', title: 'Sheet cake decoration', who: 'The Palmers' },
    ],
    ads: [
      { headline: 'The cake they will photograph before they cut.', body: 'Custom cakes and morning pastry from {biz}. {city} celebrates on our flour.' },
      { headline: 'Friday croissants, standing order.', body: 'Offices around {city} get {biz} boxes delivered warm. Set it once, look forward to it weekly.' },
    ],
    reviewAsk: 'Hope it was delicious! If we made the celebration sweeter, a quick Google review helps the next party find us: ',
    signature: {
      tabLabel: 'Orders',
      title: 'Custom order board',
      sub: 'Walk-ins pay the lights; custom orders and standing accounts pay the rent. This board keeps the big orders moving.',
      metricLabel: 'Custom orders this month',
      metricValue: '$4,120',
      rows: [
        { title: 'Meredith wedding cake', sub: 'Tasting Saturday 10 AM, 3 flavors prepped, contract ready', amount: 850, tag: 'Tasting Sat', tone: 'hot' },
        { title: 'Standing wholesale accounts', sub: '6 offices + 2 restaurants on weekly pastry orders', amount: 1960, tag: 'Recurring', tone: 'won' },
        { title: 'Saturday pickup board', sub: '7 custom cakes due, decoration schedule set', amount: 1240, tag: 'This week', tone: 'wait' },
        { title: 'St. Anne’s school order', sub: '8 dozen assorted, quote sent, decision tomorrow', amount: 310, tag: 'Quoted', tone: 'wait' },
      ],
      footer: 'In the real build custom inquiries capture the design details on the first call, deposits collect themselves, and pickup day runs off a checklist.',
    },
    extraAutomations: [
      { icon: 'bell', title: 'Pickup-day reminders', desc: 'Every custom order gets a night-before reminder with the pickup window. No more melted-buttercream waits.', on: true },
      { icon: 'chart', title: 'Standing order engine', desc: 'Weekly wholesale orders confirm, adjust, and invoice themselves. The Friday croissant run never gets dropped.', on: true },
    ],
  },

  /* -------------------------------- RESTAURANT --------------------------- */
  restaurant: {
    ...OS_PRESETS.restaurant,
    label: 'Restaurant',
    avgTicket: 45,
    signature: {
      tabLabel: 'Events',
      title: 'Event & catering board',
      sub: 'The tables feed the week; private events and catering feed the year. This board keeps the big tickets moving.',
      metricLabel: 'Event revenue this month',
      metricValue: '$6,890',
      rows: [
        { title: 'Rehearsal dinner, Elena R.', sub: 'Menu chosen, deposit paid, 28 guests Friday', amount: 900, tag: 'Deposit in', tone: 'won' },
        { title: 'Riverside Church trays', sub: 'Monthly youth-night standing order, invoice automated', amount: 620, tag: 'Recurring', tone: 'won' },
        { title: 'Office lunch pipeline', sub: '3 catering quotes out from this week’s calls', amount: 1440, tag: 'Quoted', tone: 'hot' },
        { title: 'Holiday party inquiries', sub: 'First 2 December requests already in. Book the room early', amount: 2400, tag: 'Early birds', tone: 'wait' },
      ],
      footer: 'In the real build event inquiries capture the guest count and date on the first call, deposits collect themselves, and the kitchen gets the prep sheet.',
    },
    extraAutomations: [
      { icon: 'bell', title: 'Big-party confirmations', desc: 'Parties of 8+ get a confirmation text the morning of. Empty ten-tops stop happening.', on: true },
      { icon: 'chart', title: 'Catering quote follow-up', desc: 'Every catering quote follows up on itself at day 2 and day 5, right when offices are deciding.', on: true },
    ],
  },

  /* ------------------------------- REAL ESTATE --------------------------- */
  real_estate: {
    ...OS_PRESETS.real_estate,
    label: 'Real estate',
    avgTicket: 8900,
    signature: {
      tabLabel: 'Escrow',
      title: 'Listing & escrow board',
      sub: 'Commissions live and die in the escrow timeline. Every listing, deadline, and pending dollar in one glance.',
      metricLabel: 'Pending commission',
      metricValue: '$28,800',
      rows: [
        { title: 'Maple St, the Harmons', sub: 'Clear to close, signing Thursday 2 PM', amount: 10400, tag: 'Closing Thu', tone: 'won' },
        { title: 'Beth & Ryan offer', sub: 'Inspection Friday, repair addendum drafted and ready', amount: 8200, tag: 'Inspection Fri', tone: 'hot' },
        { title: 'Elm St listing', sub: '11 showings, 2 second looks, price-review call set', amount: 6900, tag: 'Active', tone: 'wait' },
        { title: 'CMA requests this week', sub: '3 sellers asked "what is my house worth" after hours', amount: 3300, tag: 'New listings?', tone: 'hot' },
      ],
      footer: 'In the real build escrow deadlines land on the calendar with alarms, showings get feedback requests, and every after-hours CMA call becomes a listing appointment.',
    },
    extraAutomations: [
      { icon: 'bell', title: 'Escrow deadline sentinel', desc: 'Inspection, appraisal, and financing deadlines get tracked with 48-hour alarms. No commission dies of a missed date.', on: true },
      { icon: 'star', title: 'Showing feedback chase', desc: 'Every showing agent gets a feedback text 2 hours after. Sellers hear real signal, you look like a machine.', on: true },
    ],
  },

  /* ------------------------- LEGACY NICHE FALLBACKS ---------------------- */
  home_services: {
    ...OS_PRESETS.home_service,
    label: 'Home services',
    avgTicket: 850,
    signature: {
      tabLabel: 'Jobs',
      title: 'Job & quote board',
      sub: 'Every quote out the door and every job on the calendar, ranked by what pays.',
      metricLabel: 'Quotes waiting on a yes',
      metricValue: '$8,840',
      rows: [
        { title: 'Bright Path HOA contract', sub: '12-unit maintenance bid, board decides Friday', amount: 5400, tag: 'Decision Fri', tone: 'hot' },
        { title: 'Tom & Ana remodel', sub: 'Rough-in quote delivered, follow-up queued day 3', amount: 3200, tag: 'Follow up', tone: 'wait' },
        { title: 'Emergency lane this week', sub: '5 after-hours calls answered, 4 booked, 1 escalated', amount: 2280, tag: 'Captured', tone: 'won' },
        { title: 'Annual service plans', sub: '38 members on the maintenance plan, renewals automated', amount: 9120, tag: 'Recurring', tone: 'won' },
      ],
      footer: 'In the real build quotes follow up on themselves, emergencies route by urgency, and the maintenance plan renews without a phone call.',
    },
    extraAutomations: [
      { icon: 'chart', title: 'Quote follow-up ladder', desc: 'Every quote gets a day-3 text and day-7 call reminder. The money stops leaking from "I meant to call back."', on: true },
    ],
  },

  professional: {
    ...OS_PRESETS.other,
    label: 'Local business',
    avgTicket: 380,
    signature: {
      tabLabel: 'Pipeline',
      title: 'Client pipeline board',
      sub: 'Every inquiry, quote, and repeat client in one honest view of the month.',
      metricLabel: 'Open pipeline value',
      metricValue: '$2,730',
      rows: [
        { title: 'Northside Gym weekly service', sub: 'Recurring account, renewal conversation set for Friday', amount: 1200, tag: 'Renewal', tone: 'won' },
        { title: 'Casey L. quote', sub: 'Sent Tuesday, opened twice, follow-up queued', amount: 540, tag: 'Follow up', tone: 'hot' },
        { title: 'New inquiries this week', sub: '5 calls captured, 3 booked, 2 quoted', amount: 990, tag: 'This week', tone: 'won' },
        { title: 'Repeat client rhythm', sub: '12 clients due for their usual booking window', amount: 'Text them', tag: 'Win back', tone: 'wait' },
      ],
      footer: 'In the real build quotes follow up on themselves and regulars get remembered before they drift.',
    },
    extraAutomations: [
      { icon: 'star', title: 'Regulars radar', desc: 'Clients past their usual return window get a friendly nudge before they forget you exist.', on: true },
    ],
  },
};
