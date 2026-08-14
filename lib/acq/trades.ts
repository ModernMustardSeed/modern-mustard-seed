/**
 * THE TRADE REGISTRY.
 *
 * Everything the engine knows about an industry, in one block per industry:
 * how to find them, how to tell a real one from a keyword collision, what a job
 * is worth, what their customers call about, and how Mr. Mustard answers the
 * phone as their receptionist.
 *
 * Adding an industry is one entry here. It was previously five edits across
 * four files with the parts that had to agree sitting hundreds of lines apart.
 *
 * ── WHAT QUALIFIES AN INDUSTRY ───────────────────────────────────────────────
 * Every trade in here clears four tests, because a list of industries we cannot
 * actually sell to is worse than a short one:
 *
 *   1. THE PHONE IS THE FRONT DOOR. Customers call. They do not fill in a form
 *      and wait, so a missed call is a lost job rather than a delayed one.
 *   2. A JOB IS WORTH REAL MONEY. $397 a month has to be obviously smaller than
 *      one saved job, or the arithmetic in email 2 does not survive contact.
 *   3. THE OWNER ANSWERS. Local and owner-operated, so the person who picks up
 *      our call can also say yes. No franchise call centres, no procurement.
 *   4. AFTER HOURS IS REAL. Either emergencies or a booking window that outlasts
 *      the front desk. If nobody calls after five, the pitch has no teeth.
 *
 * ── WHAT IS DELIBERATELY MISSING ─────────────────────────────────────────────
 * DENTAL, MEDICAL, MED SPA. They fit commercially and they are excluded anyway.
 * An agent that answers those calls hears protected health information, which
 * means a BAA and a HIPAA posture we have not built. Selling a $397 voice agent
 * into a PHI environment without one puts the practice at risk, not just us.
 * Veterinary IS included: animal records are not PHI.
 *
 * LAW FIRMS. Personal injury intake is the single best fit for the speed-to-lead
 * argument, and it needs a confidentiality and conflict-check design that a
 * general receptionist agent does not have. Worth building on purpose later.
 *
 * LOCKSMITHS, TOWING. Both verticals are saturated with lead-gen fronts and
 * fake local listings. We would spend the sourcing budget grading scams.
 */

import type { Trade } from '@/lib/acq/types';

export type TradeEconomics = {
  /** A typical completed job, conservative. If we are wrong we want to be low. */
  avgJobValue: number;
  /** Share of genuine inbound enquiries that become work. */
  closeRatePct: number;
  /**
   * Calls per public review. The lever the whole estimate hangs on: reviews are
   * the only volume signal we can see from outside, so this converts what is
   * public into what is probable. Higher means chattier customers who call more
   * and review less.
   */
  callsPerReview: number;
};

export type TradeDef = {
  key: Exclude<Trade, 'other'>;
  label: string;
  /** Overpass patterns. POSIX, no word boundaries, so deliberately loose. */
  osm: { craft: string; name: string };
  /** What a human would type into Google Maps to find these businesses. */
  maps: string[];
  /** The strict JS filter that runs after discovery. This is the real gate. */
  match: RegExp;
  /**
   * Words that mean "not this trade" for THIS trade specifically. The global
   * NOT_A_CONTRACTOR list catches suppliers and schools; this catches the
   * neighbouring trade that shares vocabulary.
   */
  notThis?: RegExp;
  /**
   * Terms on the global exclusion list that this trade legitimately uses. An
   * auto shop is allowed to say "auto", a vet is allowed to say "hospital".
   * Without this, adding a trade silently filters out its entire industry.
   */
  allowGlobal?: RegExp;
  economics: TradeEconomics;
  /** True when customers genuinely call at 11pm. Drives the roleplay and copy. */
  emergency: boolean;
  /** What a customer calls about when it is urgent and expensive. */
  scenarios: string[];
  /** How Mr. Mustard answers as their receptionist. */
  roleplay: string;
};

/* ────────────────────────────── the industries ───────────────────────────── */

export const TRADE_DEFS: Record<Exclude<Trade, 'other'>, TradeDef> = {
  hvac: {
    key: 'hvac',
    label: 'HVAC',
    osm: { craft: '^(hvac|heating_engineer|air_conditioning|ventilation)$', name: 'hvac|heating|air condition|airconditioning|a/?c |furnace|climate|comfort|cooling|refrigerat|mechanical' },
    maps: ['hvac contractor', 'air conditioning repair', 'heating contractor'],
    match: /\b(hvac|heating|air[\s-]?conditioning|a\/c|furnace|heat pump|cooling|refrigeration|climate control|comfort (systems?|air|solutions|specialists?)|mechanical (services?|contractors?|systems?)|air conditioner)\b/i,
    economics: { avgJobValue: 450, closeRatePct: 35, callsPerReview: 9 },
    emergency: true,
    scenarios: [
      'the AC stopped cooling and the house is 88 degrees',
      'no heat overnight with a baby in the house',
      'a furnace making a noise it has never made before',
      'a quote on replacing a twenty year old system',
      'a maintenance tune-up before summer',
    ],
    roleplay:
      'HVAC MODE. You know no-cool, no-heat, emergency HVAC, repair vs replacement, maintenance plans, thermostats, AC tune-ups and scheduling. Ask about the system age and whether anyone in the house is medically vulnerable to the temperature. Never diagnose the equipment.',
  },

  plumbing: {
    key: 'plumbing',
    label: 'Plumbing',
    osm: { craft: '^(plumber)$', name: 'plumb|drain|rooter|sewer|water heater|septic|leak|pipe|hydro ?jet|backflow' },
    maps: ['plumber', 'plumbing contractor', 'drain cleaning'],
    match: /\b(plumber|plumbers|plumbing|drain(s|age)?|rooter|sewer|water heaters?|septic|leak detection|re-?pipe|backflow|hydro[\s-]?jet|pipefitt)\b/i,
    economics: { avgJobValue: 400, closeRatePct: 35, callsPerReview: 9 },
    emergency: true,
    scenarios: [
      'a burst pipe running water under the kitchen',
      'a water heater leaking across the garage floor',
      'a main line backing up into the shower',
      'a clogged drain that will not clear',
      'a running toilet and a dripping faucet on the same visit',
    ],
    roleplay:
      'PLUMBING MODE. You know burst pipes, active leaks, clogged drains, sewer and main line backups, water heaters, toilets, faucets, emergency plumbing and scheduling. On an active leak, the first thing out of your mouth is where the shutoff valve is. Never diagnose the plumbing.',
  },

  roofing: {
    key: 'roofing',
    label: 'Roofing',
    osm: { craft: '^(roofer)$', name: 'roof|shingle|gutter|exteriors?|siding|storm restoration|metal roof' },
    maps: ['roofing contractor', 'roof repair'],
    match: /\b(roof|roofs|roofer|roofers|roofing|shingles?|gutters?|siding|metal roof|storm restoration|exteriors?)\b/i,
    economics: { avgJobValue: 1200, closeRatePct: 25, callsPerReview: 7 },
    emergency: true,
    scenarios: [
      'an active leak in the ceiling during a storm',
      'hail damage the insurance adjuster wants documented',
      'a missing section of shingles after wind',
      'an inspection before closing on a house',
      'a full replacement quote on a twenty five year old roof',
    ],
    roleplay:
      'ROOFING MODE. You know active roof leaks, storm and hail damage, inspections, repair vs replacement, insurance claim questions, and commercial versus residential. On an active leak you take the address and get somebody out; you never quote a price sight unseen. Never speculate about what insurance will cover.',
  },

  electrical: {
    key: 'electrical',
    label: 'Electrical',
    osm: { craft: '^(electrician)$', name: 'electric|electrical|wiring|generator|panel' },
    maps: ['electrician', 'electrical contractor', 'emergency electrician'],
    match: /\b(electric(ian|ians|al)?|wiring|rewire|panel upgrades?|generators?|ev chargers?)\b/i,
    // "Electric" is also how half the utilities and every e-bike shop name
    // themselves, and a co-op is not buying a receptionist.
    notThis: /\b(utility|utilities|co-?op|cooperative|power (company|authority)|municipal|bikes?|scooters?|vehicles?|motors?|guitars?|tattoo|beach)\b/i,
    economics: { avgJobValue: 350, closeRatePct: 35, callsPerReview: 9 },
    emergency: true,
    scenarios: [
      'half the house lost power and the breaker will not reset',
      'a burning smell coming from an outlet',
      'a panel upgrade quote before a remodel',
      'a generator that failed to start in an outage',
      'adding an EV charger in the garage',
    ],
    roleplay:
      'ELECTRICAL MODE. You know outages, dead circuits, breakers that trip or will not reset, panel upgrades, generators, EV chargers, lighting and code inspections. Anything involving a burning smell, smoke, sparking or a hot outlet is an emergency: tell them to shut that breaker off and get someone out. Never diagnose the wiring.',
  },

  garage_door: {
    key: 'garage_door',
    label: 'Garage doors',
    osm: { craft: '^(door_construction)$', name: 'garage door|overhead door|door company' },
    maps: ['garage door repair', 'overhead door company'],
    match: /\b(garage doors?|overhead doors?|door (company|systems?|solutions?)|door(s)? (repair|service))\b/i,
    notThis: /\b(cabinet|shower|screen|storm door|entry door|interior)\b/i,
    economics: { avgJobValue: 450, closeRatePct: 45, callsPerReview: 10 },
    emergency: true,
    scenarios: [
      'the door will not open and a car is trapped inside',
      'a broken spring that came apart with a bang',
      'a door that closes halfway and reverses',
      'an opener that stopped responding to the remote',
      'a quote on replacing a dented door',
    ],
    roleplay:
      'GARAGE DOOR MODE. You know broken springs and cables, openers, remotes and keypads, off-track doors, sensors, and replacement quotes. A car trapped inside or a door stuck open overnight is urgent, because an open garage is an unlocked house. Never tell anyone to work on a spring themselves; they are under extreme tension.',
  },

  appliance_repair: {
    key: 'appliance_repair',
    label: 'Appliance repair',
    osm: { craft: '^(electronics_repair)$', name: 'appliance|refrigerat|washer|dryer' },
    maps: ['appliance repair', 'refrigerator repair', 'washer dryer repair'],
    match: /\bappliance(s)?( repair| service| doctor| pro| tech| guy)?\b|\b(refrigerator|washer|dryer|dishwasher|oven|range) repair\b/i,
    notThis: /\b(store|outlet|used|scratch and dent|liquidat\w*)\b/i,
    // These businesses trade in appliance SALES words constantly, and the
    // global filter throws out anything that says "parts" or "sales".
    allowGlobal: /\b(parts|sales)\b/i,
    economics: { avgJobValue: 250, closeRatePct: 40, callsPerReview: 12 },
    emergency: false,
    scenarios: [
      'a fridge that stopped cooling with a full freezer',
      'a washer that will not drain and is holding water',
      'an oven that quit two days before a holiday',
      'a dryer making a metal-on-metal noise',
      'whether a ten year old dishwasher is worth fixing',
    ],
    roleplay:
      'APPLIANCE REPAIR MODE. You know refrigerators, washers, dryers, dishwashers, ovens and ranges. Always get the brand, the model if they can find it, and what it is doing. A fridge full of food that stopped cooling is same-day if at all possible. Never quote a repair price or promise a part is in stock.',
  },

  restoration: {
    key: 'restoration',
    label: 'Water and fire restoration',
    osm: { craft: '^(restoration)$', name: 'restoration|water damage|fire damage|mold|remediation|flood' },
    maps: ['water damage restoration', 'fire damage restoration', 'mold remediation'],
    match: /\b(restorations?|water damage|fire damage|smoke damage|flood|mold (remediation|removal)|remediation|mitigation|biohazard)\b/i,
    // Furniture and classic-car restoration share the word and share nothing else.
    notThis: /\b(furniture|antique|auto|car|vehicle|classic|hardwood floors? refinish|photo|art|dental|hair|ecolog\w*|habitat|wetland|prairie|historic(al)? (society|preservation))\b/i,
    economics: { avgJobValue: 3500, closeRatePct: 30, callsPerReview: 5 },
    emergency: true,
    scenarios: [
      'two inches of water across a finished basement at midnight',
      'a burst supply line that soaked three rooms while they were away',
      'smoke damage through a whole floor after a kitchen fire',
      'mold found behind drywall during a remodel',
      'an insurance adjuster asking for documentation tomorrow',
    ],
    roleplay:
      'RESTORATION MODE. You know water, fire, smoke and mold, emergency extraction, drying equipment, and insurance claims. These calls come in at the worst moment of someone\'s year, so you are calm and you move fast: get the address, whether the water is still running, whether anyone is displaced, and get a crew moving. Never estimate what insurance will pay.',
  },

  pest_control: {
    key: 'pest_control',
    label: 'Pest control',
    osm: { craft: '^(pest_control)$', name: 'pest|exterminat|termite|wildlife|rodent' },
    maps: ['pest control', 'exterminator', 'termite inspection'],
    match: /\b(pest (control|management|solutions?|services?)|exterminat\w*|termites?|bed ?bugs?|rodents?|wildlife (control|removal)|mosquito)\b/i,
    economics: { avgJobValue: 250, closeRatePct: 40, callsPerReview: 13 },
    emergency: false,
    scenarios: [
      'bed bugs found in a guest room the day before visitors arrive',
      'a wasp nest by the front door with a child allergic to stings',
      'a termite inspection needed to close on a house this week',
      'rodents in the attic keeping the household awake',
      'a recurring quarterly service quote',
    ],
    roleplay:
      'PEST CONTROL MODE. You know general pest, termites, bed bugs, rodents, wildlife and mosquito treatment, one-off versus recurring plans, and real estate inspection letters. Get the pest, the property type, and whether there are children, pets or allergies in the home. Never promise a treatment is safe for a specific person or animal.',
  },

  landscaping: {
    key: 'landscaping',
    label: 'Landscaping and lawn care',
    osm: { craft: '^(gardener|landscape_gardener)$', name: 'landscap|lawn|irrigation|sprinkler|yard|turf|hardscape' },
    maps: ['landscaping company', 'lawn care service', 'sprinkler repair'],
    match: /\b(landscap\w*|lawn (care|service|maintenance)|irrigation|sprinklers?|hardscap\w*|turf|grounds ?keeping|yard (care|service))\b/i,
    notThis: /\b(supply|nursery|garden cent(er|re)|sod farm|equipment)\b/i,
    economics: { avgJobValue: 350, closeRatePct: 30, callsPerReview: 12 },
    emergency: false,
    scenarios: [
      'a sprinkler line broken and running across the driveway',
      'a quote on weekly maintenance for a rental property',
      'a full front yard redesign before a house goes on the market',
      'storm cleanup after a night of wind',
      'a sprinkler system that needs winterizing before a freeze',
    ],
    roleplay:
      'LANDSCAPING MODE. You know maintenance schedules, one-off cleanups, irrigation and sprinkler repair, design and installation, and seasonal work. Get the property address and size, whether it is residential or commercial, and whether they want recurring service or a single job. Never quote a per-visit price sight unseen.',
  },

  tree_service: {
    key: 'tree_service',
    label: 'Tree service',
    osm: { craft: '^(tree_surgeon|arborist)$', name: 'tree|arborist|stump' },
    maps: ['tree service', 'tree removal', 'arborist'],
    match: /\b(tree (service|care|removal|experts?|surgeons?|works?)|arborists?|stump (grinding|removal)|treecare)\b/i,
    notThis: /\b(farm|orchard|nursery|christmas|family tree|genealog\w*|tree house|treehouse)\b/i,
    economics: { avgJobValue: 900, closeRatePct: 30, callsPerReview: 8 },
    emergency: true,
    scenarios: [
      'a limb down on the roof after a storm',
      'a tree leaning over a neighbour\'s fence after heavy rain',
      'a dead tree that needs removing before it falls',
      'stump grinding after a removal last month',
      'a quote on trimming back from the power line',
    ],
    roleplay:
      'TREE SERVICE MODE. You know removals, trimming, storm damage, emergency limb work, and stump grinding. A tree on a house, a car or a power line is an emergency: get the address and whether anyone is hurt or anything is touching a line, and tell them to stay well clear. Never quote a removal price over the phone; it depends on access and what it is near.',
  },

  pool_service: {
    key: 'pool_service',
    label: 'Pool service',
    osm: { craft: '^(pool_maintenance)$', name: 'pool|spa service|pool service' },
    maps: ['pool service', 'pool cleaning', 'pool repair'],
    match: /\b(pools?( and spas?)? (service|cleaning|care|repair|maintenance|company|pros?)|pool ?man|poolside|swimming pool)\b/i,
    notThis: /\b(supply|supplies|store|billiards?|pool hall|carpool|motor pool|talent pool)\b/i,
    // A pool company saying "spa" means a hot tub, not a nail salon.
    allowGlobal: /\bspa\b/i,
    economics: { avgJobValue: 250, closeRatePct: 35, callsPerReview: 12 },
    emergency: false,
    scenarios: [
      'a green pool three days before a party',
      'a pump that stopped running in the middle of summer',
      'a heater that will not fire for the season',
      'a leak somewhere between the pool and the equipment pad',
      'a quote on weekly service for the season',
    ],
    roleplay:
      'POOL SERVICE MODE. You know weekly maintenance, chemistry and green pools, pumps, filters and heaters, leak detection, and seasonal openings and closings. Get the pool type and size, whether it is a repair or recurring service, and how soon they need it. Never diagnose the equipment or give chemical dosing over the phone.',
  },

  chimney: {
    key: 'chimney',
    label: 'Chimney and fireplace',
    osm: { craft: '^(chimney_sweeper)$', name: 'chimney|fireplace|hearth|sweep' },
    maps: ['chimney sweep', 'chimney repair', 'fireplace service'],
    match: /\b(chimneys?|chimney sweeps?|fireplaces?|hearths?|flue|wood stoves?|dryer vent)\b/i,
    economics: { avgJobValue: 400, closeRatePct: 40, callsPerReview: 9 },
    emergency: false,
    scenarios: [
      'smoke backing up into the living room when the fire is lit',
      'an inspection needed before closing on a house',
      'a first sweep of the season before it gets cold',
      'a cracked chimney crown letting water in',
      'a gas fireplace that will not light',
    ],
    roleplay:
      'CHIMNEY MODE. You know sweeps and inspections, draft problems, liners and caps, masonry repair, wood and gas fireplaces, and dryer vents. Smoke coming into the room or any suspicion of carbon monoxide is urgent: tell them to put the fire out, open windows, and leave if anyone feels unwell. Never assess a flue over the phone.',
  },

  painting: {
    key: 'painting',
    label: 'Painting',
    osm: { craft: '^(painter)$', name: 'paint|painting|painters' },
    maps: ['painting contractor', 'house painters', 'commercial painting'],
    match: /\b(paint(ing|ers?)?( (company|contractors?|services?|pros?|plus))?|repaint)\b/i,
    // Auto body, powder coating and art studios all paint, and none of them
    // are quoting a house.
    notThis: /\b(auto|car|collision|body shop|powder ?coat\w*|art|artist|gallery|studio|nail|face|pottery|ceramic|sip|paintball)\b/i,
    economics: { avgJobValue: 2800, closeRatePct: 25, callsPerReview: 7 },
    emergency: false,
    scenarios: [
      'an interior repaint before a house goes on the market',
      'exterior paint failing on the south side of the house',
      'a rental turnover that needs painting this week',
      'cabinets they want refinished rather than replaced',
      'a commercial space that has to be painted overnight',
    ],
    roleplay:
      'PAINTING MODE. You know interior and exterior, residential and commercial, cabinets, drywall repair and prep work, and timelines. Get the address, roughly how many rooms or which elevations, whether it is occupied, and when they need it done. Never quote a square foot price over the phone.',
  },

  flooring: {
    key: 'flooring',
    label: 'Flooring',
    osm: { craft: '^(floorer|parquet_layer)$', name: 'floor|flooring|carpet|hardwood|tile' },
    maps: ['flooring contractor', 'hardwood floor installation', 'carpet installation'],
    match: /\b(floor(ing|s)?( (company|contractors?|centers?|gallery|pros?|America))?|hardwoods?|carpets?|tile( and stone)?|laminate|vinyl plank|lvp|refinish\w* floors?)\b/i,
    notThis: /\b(supply|supplies|wholesale|liquidat\w*|first floor|second floor|ground floor|dance|gym)\b/i,
    economics: { avgJobValue: 3500, closeRatePct: 25, callsPerReview: 6 },
    emergency: false,
    scenarios: [
      'carpet ruined by a water leak that insurance is covering',
      'hardwood they want refinished rather than replaced',
      'a whole house of flooring before they move in next month',
      'tile coming loose in a bathroom',
      'a quote on a commercial space that has to stay open',
    ],
    roleplay:
      'FLOORING MODE. You know hardwood, laminate, luxury vinyl, tile and carpet, installation and refinishing, subfloor problems, and insurance work. Get the square footage if they know it, what is down now, whether furniture needs moving, and their timeline. Never quote a material or install price over the phone.',
  },

  auto_repair: {
    key: 'auto_repair',
    label: 'Auto repair',
    osm: { craft: '^(car_repair)$', name: 'auto repair|automotive|transmission|muffler|brake|tire' },
    maps: ['auto repair shop', 'mechanic', 'transmission repair'],
    match: /\b(auto(motive)? (repair|service|care|clinic|center|centre|works?|shop)|mechanics?|transmissions?|mufflers?|brakes? (and|&) |tire (and|&) auto|smog|collision (center|repair)|body shop)\b/i,
    // A dealership has a service department and a switchboard already.
    notThis: /\b(dealership|dealers?|chevrolet|ford|toyota|honda|nissan|hyundai|kia|subaru|jeep|dodge|ram\b|gmc|buick|cadillac|lexus|bmw|mercedes|audi|volkswagen|mazda|volvo|used cars?|car sales|auto sales|rent[\s-]?a[\s-]?car|salvage|junk|parts? (store|house)|napa|autozone|o'?reilly)\b/i,
    // The global filter throws out anything saying "auto sales" or "dealership",
    // which is right, but it also throws out the word "auto" doing honest work.
    allowGlobal: /\bauto\b/i,
    economics: { avgJobValue: 500, closeRatePct: 55, callsPerReview: 16 },
    emergency: false,
    scenarios: [
      'a check engine light that came on this morning before a road trip',
      'a car that will not start in the driveway',
      'brakes grinding on the way to work',
      'a quote on a transmission before deciding to keep the car',
      'whether they can get it in before the shop closes Friday',
    ],
    roleplay:
      'AUTO REPAIR MODE. You know diagnostics, brakes, transmissions, engines, tires and scheduled maintenance. Get the year, make, model, what it is doing and whether it is drivable or needs towing. Booking the bay is the whole job: tell them the next opening and what to expect for the diagnostic. Never guess at what is wrong or what it will cost to fix.',
  },

  veterinary: {
    key: 'veterinary',
    label: 'Veterinary',
    osm: { craft: '^(veterinary)$', name: 'veterinar|animal hospital|animal clinic|pet clinic' },
    maps: ['veterinarian', 'animal hospital', 'emergency vet'],
    match: /\b(veterinar(y|ian|ians)|animal (hospital|clinic|care|medical)|pet (clinic|hospital)|vet clinic)\b/i,
    notThis: /\b(veterans?|va (hospital|clinic)|supply|pharmacy|grooming only|boarding only|shelter|humane society|rescue|spca)\b/i,
    // A vet practice IS a clinic and IS a hospital. Without this the global
    // filter deletes the entire industry.
    allowGlobal: /\b(clinic|hospital)\b/i,
    economics: { avgJobValue: 250, closeRatePct: 60, callsPerReview: 18 },
    emergency: true,
    scenarios: [
      'a dog that ate something it should not have an hour ago',
      'a cat that has not eaten in two days',
      'a limping dog after a walk this morning',
      'annual shots and a wellness visit for two pets',
      'whether they take walk-ins before closing',
    ],
    roleplay:
      'VETERINARY MODE. You know appointments, wellness visits, vaccinations, and triage for urgent calls. Get the pet\'s name, species, breed and age, what is happening and for how long. Anything involving a possible poisoning, difficulty breathing, a seizure, bloating, or trauma goes straight to a human or to the emergency line, immediately, no questions first. You are a front desk, not a clinician: never give medical advice, dosing, or an opinion on whether a symptom is serious.',
  },
};

/** Every industry we can source, in a stable order. */
export const SOURCEABLE_TRADES = Object.keys(TRADE_DEFS) as Exclude<Trade, 'other'>[];

/**
 * The three we have proven. Sourcing defaults to these unless Sarah picks
 * others, so a routine top-up does not quietly spend the budget on an
 * industry whose yield we have never measured.
 */
export const PROVEN_TRADES: Exclude<Trade, 'other'>[] = ['hvac', 'plumbing', 'roofing'];

export function tradeDef(trade: Trade): TradeDef | null {
  return trade === 'other' ? null : (TRADE_DEFS[trade] ?? null);
}
