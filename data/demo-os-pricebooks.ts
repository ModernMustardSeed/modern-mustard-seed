import type { OsTradeKey } from '@/data/demo-os-trades';

/**
 * Per-trade PRICE BOOKS for the Quotes module of the forged BUSINESS OS demo.
 * This is what makes the proposal generator feel like "it knows my business":
 * real line items, real units, believable prices for each trade. Everything is
 * honest sample data (prices are editable in the demo, and the real build loads
 * the owner's actual price list). Zero generation cost, deterministic.
 */

export type OsPriceItem = {
  name: string;
  /** How the trade sells it: 'each', 'per square', 'per hour', 'flat'... */
  unit: string;
  price: number;
  /** Pre-checked in the builder so the first proposal is one tap away. */
  popular?: boolean;
};

export type OsPriceBook = {
  /** What this trade calls the document: Estimate, Proposal, Treatment plan... */
  docWord: string;
  /** One line under the letterhead, in the trade's own voice. {biz} interpolates. */
  intro: string;
  /** Default deposit percent for this trade's paper. 0 = due on completion. */
  depositPct: number;
  items: OsPriceItem[];
  /** Short terms lines printed at the bottom of the document. */
  terms: string[];
};

const STANDARD_TERMS = [
  'This price is good for 30 days from the date above.',
  'Work is scheduled on deposit and confirmed by text the day before.',
];

export const PRICE_BOOKS: Record<OsTradeKey, OsPriceBook> = {
  roofing: {
    docWord: 'Proposal',
    intro: 'Scope of work prepared by {biz}. Every stage photographed, every line explained before we start.',
    depositPct: 40,
    items: [
      { name: 'Architectural shingle, installed', unit: 'per square', price: 475, popular: true },
      { name: 'Tear-off and haul away', unit: 'per square', price: 115, popular: true },
      { name: 'Synthetic underlayment', unit: 'per square', price: 85, popular: true },
      { name: 'Ridge vent, installed', unit: 'per lin ft', price: 14 },
      { name: 'Drip edge, color matched', unit: 'per lin ft', price: 6 },
      { name: 'Emergency tarp service', unit: 'flat', price: 450 },
      { name: 'Seamless gutter, installed', unit: 'per lin ft', price: 12 },
    ],
    terms: [
      '10-year workmanship warranty on top of the 30-year manufacturer warranty.',
      'Insurance claims: we meet the adjuster on site and document every supplement.',
      ...STANDARD_TERMS,
    ],
  },
  hvac: {
    docWord: 'Estimate',
    intro: 'System recommendation from {biz}, sized to the house, not the sales quota.',
    depositPct: 50,
    items: [
      { name: '3-ton 16 SEER AC system, installed', unit: 'flat', price: 6800, popular: true },
      { name: '80k BTU gas furnace, installed', unit: 'flat', price: 4900 },
      { name: 'Single-zone mini-split, installed', unit: 'flat', price: 4200 },
      { name: 'Smart thermostat, installed', unit: 'each', price: 329, popular: true },
      { name: 'Duct sealing and balance', unit: 'flat', price: 1400 },
      { name: 'Seasonal tune-up', unit: 'per visit', price: 149 },
      { name: 'Refrigerant recharge', unit: 'per lb', price: 95 },
    ],
    terms: [
      'Includes permit, crane if needed, and haul-away of the old equipment.',
      '10-year parts warranty registered in your name before we leave the driveway.',
      ...STANDARD_TERMS,
    ],
  },
  plumbing: {
    docWord: 'Estimate',
    intro: 'Straight numbers from {biz}. The price we quote is the price you pay.',
    depositPct: 0,
    items: [
      { name: '50-gal water heater, installed', unit: 'flat', price: 1850, popular: true },
      { name: 'Tankless conversion, installed', unit: 'flat', price: 3900 },
      { name: 'Main line drain clearing', unit: 'flat', price: 385, popular: true },
      { name: 'Sewer camera inspection', unit: 'flat', price: 295 },
      { name: 'Sump pump replacement', unit: 'flat', price: 725 },
      { name: 'Fixture install', unit: 'each', price: 240 },
      { name: 'Pressure regulator replacement', unit: 'flat', price: 465 },
    ],
    terms: [
      'Licensed and insured. All work to current code, permits pulled where required.',
      '1-year labor warranty on every repair, manufacturer warranty on parts.',
      ...STANDARD_TERMS,
    ],
  },
  electrical: {
    docWord: 'Estimate',
    intro: 'Prepared by {biz}. Safe, permitted, inspected, and priced before we start.',
    depositPct: 30,
    items: [
      { name: '200A panel upgrade', unit: 'flat', price: 3200, popular: true },
      { name: 'EV charger circuit + install', unit: 'flat', price: 1150, popular: true },
      { name: 'Whole-home surge protection', unit: 'flat', price: 485 },
      { name: 'Recessed light, installed', unit: 'each', price: 185 },
      { name: 'Ceiling fan, installed', unit: 'each', price: 245 },
      { name: 'Outlet or switch', unit: 'per point', price: 120 },
      { name: 'Generator interlock kit', unit: 'flat', price: 650 },
    ],
    terms: [
      'Permit and inspection included where required. No surprises at the panel.',
      'Lifetime warranty on workmanship, manufacturer warranty on fixtures.',
      ...STANDARD_TERMS,
    ],
  },
  restoration: {
    docWord: 'Scope of work',
    intro: 'Mitigation scope from {biz}, written to Xactimate line items your carrier recognizes.',
    depositPct: 0,
    items: [
      { name: 'Emergency water extraction', unit: 'per room', price: 550, popular: true },
      { name: 'Structural drying, 3 days', unit: 'per room', price: 1150, popular: true },
      { name: 'Mold remediation', unit: 'per area', price: 2800 },
      { name: 'Contents pack-out and storage', unit: 'flat', price: 1900 },
      { name: 'Dehumidifier', unit: 'per day', price: 95 },
      { name: 'Antimicrobial treatment', unit: 'per room', price: 325 },
    ],
    terms: [
      'We bill your insurance carrier directly and document to IICRC standard.',
      'Moisture readings logged daily and shared with you and the adjuster.',
      'Emergency response is 24/7. This scope may be amended as drying progresses.',
    ],
  },
  septic: {
    docWord: 'Estimate',
    intro: 'From {biz}. We tell you what the tank actually needs, not what sells.',
    depositPct: 0,
    items: [
      { name: 'Tank pumping, up to 1,000 gal', unit: 'flat', price: 425, popular: true },
      { name: 'Hydro jetting', unit: 'flat', price: 650 },
      { name: 'Baffle repair', unit: 'flat', price: 375 },
      { name: 'Drain field camera inspection', unit: 'flat', price: 295 },
      { name: 'Riser install', unit: 'each', price: 485 },
      { name: 'Point-of-sale inspection + report', unit: 'flat', price: 550 },
    ],
    terms: [
      'Locating, digging, and lid access included in the pumping price.',
      'Written condition report with photos after every service.',
      ...STANDARD_TERMS,
    ],
  },
  towing: {
    docWord: 'Rate sheet',
    intro: 'Posted rates from {biz}. The price on this sheet is the price on the invoice.',
    depositPct: 0,
    items: [
      { name: 'Local tow, first 10 miles', unit: 'flat', price: 125, popular: true },
      { name: 'Additional mileage', unit: 'per mile', price: 5 },
      { name: 'Winch-out recovery', unit: 'flat', price: 185 },
      { name: 'Jump start', unit: 'flat', price: 75 },
      { name: 'Lockout service', unit: 'flat', price: 85 },
      { name: 'Flatbed transport', unit: 'per mile', price: 7 },
      { name: 'After-hours dispatch', unit: 'flat', price: 45 },
    ],
    terms: [
      'ETA quoted at dispatch and texted live to your phone.',
      'Cash, card, and most motor clubs accepted on scene.',
    ],
  },
  locksmith: {
    docWord: 'Estimate',
    intro: 'Up-front pricing from {biz}. Quoted before the drive, honored on arrival.',
    depositPct: 0,
    items: [
      { name: 'Residential lockout', unit: 'flat', price: 95, popular: true },
      { name: 'Rekey', unit: 'per cylinder', price: 35, popular: true },
      { name: 'Smart lock, installed', unit: 'each', price: 185 },
      { name: 'Car key fob, cut + programmed', unit: 'each', price: 165 },
      { name: 'Commercial master key system', unit: 'per door', price: 145 },
      { name: 'Safe opening', unit: 'flat', price: 225 },
    ],
    terms: [
      'Licensed, bonded, and background-checked technicians.',
      'No-damage entry methods first, always.',
      ...STANDARD_TERMS,
    ],
  },
  garage_door: {
    docWord: 'Estimate',
    intro: 'From {biz}. Springs, openers, and doors priced straight, fixed same week.',
    depositPct: 0,
    items: [
      { name: 'Torsion spring pair, replaced', unit: 'flat', price: 385, popular: true },
      { name: 'Opener, installed', unit: 'each', price: 585, popular: true },
      { name: 'Panel replacement', unit: 'per panel', price: 425 },
      { name: 'Roller + hinge tune-up', unit: 'flat', price: 165 },
      { name: 'Cable replacement', unit: 'flat', price: 225 },
      { name: 'New 16x7 insulated door, installed', unit: 'flat', price: 2450 },
    ],
    terms: [
      'Lifetime warranty on springs we install, 5 years on openers.',
      'Same-day service on broken springs where the schedule allows.',
      ...STANDARD_TERMS,
    ],
  },
  tree_service: {
    docWord: 'Estimate',
    intro: 'Walked and bid by {biz}. Insured climbers, clean yard when we leave.',
    depositPct: 25,
    items: [
      { name: 'Tree removal, up to 30 ft', unit: 'per tree', price: 850, popular: true },
      { name: 'Tree removal, 30-60 ft', unit: 'per tree', price: 1900 },
      { name: 'Stump grinding', unit: 'per stump', price: 225, popular: true },
      { name: 'Crown thinning', unit: 'per tree', price: 525 },
      { name: 'Storm damage emergency call', unit: 'flat', price: 1400 },
      { name: 'Lot clearing', unit: 'per 1/4 acre', price: 3200 },
    ],
    terms: [
      'Fully insured for tree work specifically. Certificate available on request.',
      'Haul-away and cleanup included in every line above.',
      ...STANDARD_TERMS,
    ],
  },
  landscaping: {
    docWord: 'Proposal',
    intro: 'Prepared by {biz}. A yard plan with real numbers, not a guess over the phone.',
    depositPct: 30,
    items: [
      { name: 'Weekly mowing + edge + blow', unit: 'per visit', price: 65, popular: true },
      { name: 'Spring cleanup', unit: 'flat', price: 425, popular: true },
      { name: 'Mulch, delivered + installed', unit: 'per yard', price: 95 },
      { name: 'Irrigation startup + check', unit: 'flat', price: 120 },
      { name: 'Sod, installed', unit: 'per pallet', price: 385 },
      { name: 'Landscape lighting, 6 fixtures', unit: 'flat', price: 1850 },
      { name: 'Paver patio, installed', unit: 'per sq ft', price: 22 },
    ],
    terms: [
      'Weekly service runs March through November and pauses for hard freeze.',
      'Plant material carries a one-season replacement guarantee.',
      ...STANDARD_TERMS,
    ],
  },
  pool_spa: {
    docWord: 'Estimate',
    intro: 'From {biz}. Chemistry logged every visit, photos texted before we latch the gate.',
    depositPct: 0,
    items: [
      { name: 'Weekly service', unit: 'per month', price: 185, popular: true },
      { name: 'Green-to-clean rescue', unit: 'flat', price: 450 },
      { name: 'Filter replacement', unit: 'each', price: 385 },
      { name: 'Pump motor replacement', unit: 'flat', price: 685 },
      { name: 'Heater, installed', unit: 'flat', price: 3400 },
      { name: 'Salt cell replacement', unit: 'each', price: 725 },
      { name: 'Season opening or closing', unit: 'flat', price: 325 },
    ],
    terms: [
      'Chemicals included in weekly service. Equipment repairs quoted before work.',
      ...STANDARD_TERMS,
    ],
  },
  pest_control: {
    docWord: 'Treatment plan',
    intro: 'Prepared by {biz}. What we treat, when we return, and what it costs, in writing.',
    depositPct: 0,
    items: [
      { name: 'Initial knockdown service', unit: 'flat', price: 225, popular: true },
      { name: 'Quarterly protection plan', unit: 'per visit', price: 125, popular: true },
      { name: 'Termite liquid barrier treatment', unit: 'flat', price: 1350 },
      { name: 'Mosquito season, 6 treatments', unit: 'flat', price: 475 },
      { name: 'Rodent exclusion + baiting', unit: 'flat', price: 685 },
      { name: 'Bed bug heat treatment', unit: 'per room', price: 1150 },
    ],
    terms: [
      'Free re-treats between quarterly visits if anything comes back.',
      'Products are EPA-registered and applied by licensed technicians.',
      ...STANDARD_TERMS,
    ],
  },
  painting: {
    docWord: 'Proposal',
    intro: 'Prepared by {biz}. Prep is the job; the paint is the reward. Both are in this price.',
    depositPct: 30,
    items: [
      { name: 'Interior room, walls', unit: 'per room', price: 425, popular: true },
      { name: 'Trim + doors package', unit: 'per room', price: 265 },
      { name: 'Accent wall', unit: 'each', price: 285 },
      { name: 'Exterior repaint, up to 2,000 sq ft', unit: 'flat', price: 5800 },
      { name: 'Cabinet refinishing, kitchen', unit: 'flat', price: 3200 },
      { name: 'Deck stain + seal', unit: 'flat', price: 1150 },
      { name: 'Drywall repair + blend', unit: 'per patch', price: 325 },
    ],
    terms: [
      'Two coats standard, premium paint included, furniture covered and floors masked.',
      '2-year peel warranty on every surface we prep.',
      ...STANDARD_TERMS,
    ],
  },
  moving: {
    docWord: 'Quote',
    intro: 'From {biz}. The crew, the truck, and the price, locked before moving day.',
    depositPct: 20,
    items: [
      { name: '2 movers + truck', unit: 'per hour', price: 145, popular: true },
      { name: '3 movers + truck', unit: 'per hour', price: 195 },
      { name: 'Packing service', unit: 'per hour', price: 85 },
      { name: 'Full packing materials kit', unit: 'flat', price: 325 },
      { name: 'Piano or safe handling', unit: 'each', price: 385 },
      { name: 'Storage', unit: 'per month', price: 185 },
    ],
    terms: [
      'Licensed and insured; basic valuation coverage included, full-value available.',
      'The clock starts at your door, not at our lot.',
      ...STANDARD_TERMS,
    ],
  },
  cleaning: {
    docWord: 'Quote',
    intro: 'From {biz}. Same team, same checklist, same shine, every visit.',
    depositPct: 0,
    items: [
      { name: 'Standard house clean', unit: 'per visit', price: 165, popular: true },
      { name: 'Deep clean', unit: 'flat', price: 325, popular: true },
      { name: 'Move-out clean', unit: 'flat', price: 385 },
      { name: 'Carpet cleaning', unit: 'per room', price: 65 },
      { name: 'Interior windows', unit: 'per pane', price: 8 },
      { name: 'Office nightly service', unit: 'per month', price: 850 },
      { name: 'Driveway pressure wash', unit: 'flat', price: 225 },
    ],
    terms: [
      'Bonded and insured. Supplies and equipment included.',
      'Not happy with a spot? We re-clean it free within 24 hours.',
      ...STANDARD_TERMS,
    ],
  },
  auto_repair: {
    docWord: 'Estimate',
    intro: 'Written estimate from {biz}. Approved by you before a single bolt turns.',
    depositPct: 0,
    items: [
      { name: 'Front brake pads + rotors', unit: 'per axle', price: 385, popular: true },
      { name: 'Full synthetic oil service', unit: 'flat', price: 89, popular: true },
      { name: 'Diagnostic scan + report', unit: 'flat', price: 125 },
      { name: 'Alternator replacement', unit: 'flat', price: 525 },
      { name: 'Transmission service', unit: 'flat', price: 285 },
      { name: 'Timing belt kit', unit: 'flat', price: 850 },
      { name: 'AC recharge', unit: 'flat', price: 195 },
    ],
    terms: [
      '24-month / 24,000-mile parts and labor warranty.',
      'Photos of worn parts texted with every recommendation.',
      ...STANDARD_TERMS,
    ],
  },
  medspa: {
    docWord: 'Treatment plan',
    intro: 'Personalized plan from {biz}. Discussed in consult, priced in writing, never rushed.',
    depositPct: 20,
    items: [
      { name: 'Botox', unit: 'per unit', price: 13, popular: true },
      { name: 'Dermal filler', unit: 'per syringe', price: 685 },
      { name: 'Laser hair removal, package of 6', unit: 'flat', price: 1150 },
      { name: 'Hydrafacial', unit: 'per session', price: 225, popular: true },
      { name: 'Microneedling, series of 3', unit: 'flat', price: 950 },
      { name: 'Chemical peel', unit: 'per session', price: 185 },
      { name: 'Membership', unit: 'per month', price: 159 },
    ],
    terms: [
      'All injectables administered by licensed medical providers.',
      'Deposit applies to your treatment; 24-hour reschedule courtesy.',
      ...STANDARD_TERMS,
    ],
  },
  dental: {
    docWord: 'Treatment plan',
    intro: 'Prepared by {biz}. Every option explained, insurance estimated before you decide.',
    depositPct: 0,
    items: [
      { name: 'New patient exam + x-rays', unit: 'flat', price: 149, popular: true },
      { name: 'Adult cleaning', unit: 'per visit', price: 125, popular: true },
      { name: 'Composite filling', unit: 'per tooth', price: 285 },
      { name: 'Porcelain crown', unit: 'per tooth', price: 1250 },
      { name: 'Implant + crown', unit: 'per tooth', price: 3900 },
      { name: 'In-office whitening', unit: 'flat', price: 425 },
      { name: 'Clear aligner full case', unit: 'flat', price: 4800 },
    ],
    terms: [
      'Insurance benefits verified and estimated before treatment begins.',
      'Interest-free payment plans available on treatment over $500.',
      ...STANDARD_TERMS,
    ],
  },
  vet: {
    docWord: 'Treatment plan',
    intro: 'From the team at {biz}. What your pet needs, what it costs, decided together.',
    depositPct: 0,
    items: [
      { name: 'Wellness exam', unit: 'per visit', price: 68, popular: true },
      { name: 'Core vaccine bundle', unit: 'flat', price: 95, popular: true },
      { name: 'Dental cleaning under anesthesia', unit: 'flat', price: 585 },
      { name: 'Spay or neuter', unit: 'flat', price: 285 },
      { name: 'X-ray, 2 views', unit: 'flat', price: 195 },
      { name: 'Senior bloodwork panel', unit: 'flat', price: 185 },
      { name: 'After-hours emergency exam', unit: 'flat', price: 145 },
    ],
    terms: [
      'Estimates are ranges until we examine your pet; we call before anything changes.',
      'CareCredit and wellness plans accepted.',
    ],
  },
  attorney: {
    docWord: 'Engagement letter',
    intro: 'From {biz}. Scope, fees, and what happens next, in plain English.',
    depositPct: 50,
    items: [
      { name: 'Initial consultation', unit: 'flat', price: 0, popular: true },
      { name: 'Hourly representation', unit: 'per hour', price: 325 },
      { name: 'Flat-fee misdemeanor defense', unit: 'flat', price: 2500 },
      { name: 'Estate plan package', unit: 'flat', price: 1850, popular: true },
      { name: 'LLC formation + operating agreement', unit: 'flat', price: 1200 },
      { name: 'Demand letter', unit: 'flat', price: 450 },
    ],
    terms: [
      'Injury matters are contingency: no fee unless we recover for you.',
      'Retainer is held in trust and billed against monthly with itemized statements.',
      'This letter is an offer of engagement, not legal advice, until countersigned.',
    ],
  },
  wedding: {
    docWord: 'Proposal',
    intro: 'Prepared by {biz} for your day. Locked pricing, no surprise fees in June.',
    depositPct: 30,
    items: [
      { name: '8-hour photography coverage', unit: 'flat', price: 3400, popular: true },
      { name: 'Second shooter', unit: 'flat', price: 650 },
      { name: 'Engagement session', unit: 'flat', price: 450, popular: true },
      { name: 'Heirloom album, 30 pages', unit: 'each', price: 850 },
      { name: 'Highlight film', unit: 'flat', price: 2800 },
      { name: 'Rehearsal dinner coverage', unit: 'flat', price: 750 },
    ],
    terms: [
      'Your date is held only on signed proposal and deposit.',
      'Full gallery delivered within 6 weeks, sneak peeks within 72 hours.',
      'Balance due 14 days before the wedding.',
    ],
  },
  salon: {
    docWord: 'Quote',
    intro: 'From {biz}. Consultation first, honest pricing, hair you do not have to fix at home.',
    depositPct: 20,
    items: [
      { name: 'Cut + style', unit: 'per visit', price: 55, popular: true },
      { name: 'Full color', unit: 'per visit', price: 145, popular: true },
      { name: 'Balayage', unit: 'per visit', price: 225 },
      { name: 'Keratin treatment', unit: 'per visit', price: 285 },
      { name: 'Lash full set', unit: 'per visit', price: 165 },
      { name: 'Gel manicure', unit: 'per visit', price: 48 },
      { name: 'Bridal party', unit: 'per person', price: 125 },
    ],
    terms: [
      'Color corrections are quoted in person after a strand test.',
      'Bridal bookings hold with deposit; trial run scheduled 4 weeks out.',
      ...STANDARD_TERMS,
    ],
  },
  cafe_bakery: {
    docWord: 'Catering quote',
    intro: 'Baked fresh by {biz}. Order by Wednesday, on your table by the weekend.',
    depositPct: 25,
    items: [
      { name: 'Custom cake, 2 tier', unit: 'each', price: 285, popular: true },
      { name: 'Specialty donuts', unit: 'per dozen', price: 38, popular: true },
      { name: 'Pastry platter, serves 20', unit: 'each', price: 95 },
      { name: 'Coffee traveler, serves 10', unit: 'each', price: 32 },
      { name: 'Wedding cake', unit: 'per serving', price: 8 },
      { name: 'Office breakfast drop, serves 12', unit: 'each', price: 145 },
    ],
    terms: [
      'Custom orders need 5 days notice; wedding cakes book 6 weeks out.',
      'Delivery included inside city limits on orders over $75.',
      ...STANDARD_TERMS,
    ],
  },
  restaurant: {
    docWord: 'Catering quote',
    intro: 'From the kitchen at {biz}. Made from scratch, delivered hot, set up for you.',
    depositPct: 25,
    items: [
      { name: 'Buffet catering', unit: 'per person', price: 24, popular: true },
      { name: 'Taco or pasta bar', unit: 'per person', price: 18 },
      { name: 'Party platter, large', unit: 'each', price: 120, popular: true },
      { name: 'Family meal, serves 6', unit: 'each', price: 85 },
      { name: 'Private room, 3 hours', unit: 'flat', price: 350 },
      { name: 'Bartender + setup', unit: 'per event', price: 385 },
    ],
    terms: [
      'Final headcount locks 72 hours before the event.',
      'Dietary accommodations happily made with 5 days notice.',
      ...STANDARD_TERMS,
    ],
  },
  real_estate: {
    docWord: 'Listing proposal',
    intro: 'Prepared by {biz}. How your home gets marketed, shown, and sold, in writing.',
    depositPct: 0,
    items: [
      { name: 'Professional photo + drone package', unit: 'flat', price: 425, popular: true },
      { name: 'Staging consultation', unit: 'flat', price: 350 },
      { name: '3D walkthrough tour', unit: 'flat', price: 285, popular: true },
      { name: 'Pre-list deep clean', unit: 'flat', price: 385 },
      { name: 'Featured listing ad budget', unit: 'per month', price: 500 },
      { name: 'Twilight photo add-on', unit: 'flat', price: 185 },
    ],
    terms: [
      'Commission is discussed and agreed in the listing agreement, not buried here.',
      'Marketing package launches within 5 days of signed listing.',
      'Weekly showing + feedback report every Monday morning.',
    ],
  },
  home_services: {
    docWord: 'Estimate',
    intro: 'From {biz}. One crew, one call, the whole list handled.',
    depositPct: 0,
    items: [
      { name: 'Handyman service', unit: 'per hour', price: 95, popular: true },
      { name: 'Half-day rate', unit: 'flat', price: 360, popular: true },
      { name: 'Full-day rate', unit: 'flat', price: 680 },
      { name: 'Gutter cleaning', unit: 'flat', price: 165 },
      { name: 'Fence repair', unit: 'per section', price: 145 },
      { name: 'Deck board replacement', unit: 'per board', price: 38 },
      { name: 'TV mount + cord conceal', unit: 'each', price: 185 },
    ],
    terms: [
      'Materials billed at cost with the receipt attached, no markup games.',
      '1-year warranty on all workmanship.',
      ...STANDARD_TERMS,
    ],
  },
  professional: {
    docWord: 'Proposal',
    intro: 'Prepared by {biz}. Scope, timeline, and price agreed before the work starts.',
    depositPct: 30,
    items: [
      { name: 'Initial consultation', unit: 'flat', price: 0, popular: true },
      { name: 'Hourly engagement', unit: 'per hour', price: 185 },
      { name: 'Project, flat fee', unit: 'flat', price: 2400, popular: true },
      { name: 'Monthly retainer', unit: 'per month', price: 1200 },
      { name: 'Rush delivery', unit: 'flat', price: 600 },
      { name: 'Annual partnership plan', unit: 'per year', price: 9800 },
    ],
    terms: [
      'Scope changes are quoted in writing before any additional billing.',
      'Retainers renew monthly and can be paused with 15 days notice.',
      ...STANDARD_TERMS,
    ],
  },
};

/** The book for a resolved trade, with a safe fallback. */
export function priceBookFor(trade: OsTradeKey): OsPriceBook {
  return PRICE_BOOKS[trade] ?? PRICE_BOOKS.professional;
}
