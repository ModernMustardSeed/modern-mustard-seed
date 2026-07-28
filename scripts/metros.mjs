/**
 * METRO PLAYBOOKS for the Google Maps sourcing pipeline.
 *
 * A metro is picked on four tests, in order:
 *   1. we have NO coverage there yet (check the floor before adding one)
 *   2. it is big enough to carry 300+ qualified leads
 *   3. the trades are emergency-shaped, where one missed call is a four-figure job
 *   4. the owners answer their phone, which rules out the saturated coastal metros
 *
 * `trades` are Google Maps search terms, not our niche enum. They are deliberately
 * home-services-heavy with a short tail of high-ticket local pros (med spa, dental,
 * vet, law) that MMS already sells into. No retail, no restaurants: those were the
 * hardest email vertical on the floor and the weakest pitch.
 *
 * `anchors` are the geographic phrases appended to each trade. Maps already spreads
 * a single city query across the whole metro, so 3 anchors is depth, not breadth.
 */

const HOME_SERVICES = [
  'plumbers',
  'HVAC contractors',
  'roofing contractors',
  'electricians',
  'garage door repair',
  'landscaping companies',
  'tree service',
  'pest control',
  'painting contractors',
  'flooring contractors',
  'remodeling contractors',
  'fence companies',
  'concrete contractors',
  'gutter installation',
  'siding contractors',
  'window replacement',
  'deck builders',
  'junk removal',
  'moving companies',
  'appliance repair',
  'water damage restoration',
  'septic tank service',
  'chimney sweep',
  'insulation contractors',
  'handyman services',
  'foundation repair',
  'paving contractors',
  'carpet cleaning',
  'house cleaning service',
  'pool service',
  'locksmith',
  'excavating contractors',
];

// High-ticket local pros MMS already sells into. One missed call is still a
// large lost job, and they buy marketing without a committee.
const ADJACENT = [
  'med spa',
  'dentist',
  'veterinarian',
  'personal injury lawyer',
  'auto repair shop',
  'towing service',
];

export const METROS = {
  indy: {
    label: 'Indianapolis metro, IN',
    state: 'IN',
    tz: 'America/Indiana/Indianapolis',
    // Sarah owns everything outside Polly's South, and IN is outside it.
    owner: 'Sarah',
    anchors: ['Indianapolis IN', 'Carmel IN', 'Greenwood IN'],
    trades: [...HOME_SERVICES, ...ADJACENT],
    // City attribution: a Maps card gives a street address, not a city, so leads
    // land under the metro's primary city unless the address resolves elsewhere.
    primaryCity: 'Indianapolis',
    // Indiana area codes. A business advertising in Indianapolis on a 209 (CA),
    // 224 (IL) or 516 (NY) number is a lead-gen middleman or a national call
    // centre reselling the job, not the local owner who can sign.
    areaCodes: ['317', '463', '765', '812', '930', '574', '260', '219'],
    // Suburb names we can recognise inside a street address line.
    suburbs: [
      'Carmel', 'Fishers', 'Noblesville', 'Westfield', 'Zionsville', 'Greenwood',
      'Avon', 'Plainfield', 'Brownsburg', 'Franklin', 'Mooresville', 'Danville',
      'Greenfield', 'McCordsville', 'Lawrence', 'Speedway', 'Beech Grove',
      'Whitestown', 'Bargersville', 'New Palestine', 'Pittsboro', 'Cicero',
    ],
  },

  // Queued for the next wave. Same four tests, all currently uncovered.
  okc: {
    label: 'Oklahoma City metro, OK',
    state: 'OK',
    tz: 'America/Chicago',
    owner: 'Polly', // OK is in the South
    anchors: ['Oklahoma City OK', 'Edmond OK', 'Norman OK'],
    trades: [...HOME_SERVICES, ...ADJACENT],
    primaryCity: 'Oklahoma City',
    areaCodes: ['405', '572', '580', '918', '539'],
    suburbs: ['Edmond', 'Norman', 'Moore', 'Yukon', 'Midwest City', 'Del City', 'Mustang', 'Bethany', 'Choctaw', 'Piedmont'],
  },
  columbus: {
    label: 'Columbus metro, OH',
    state: 'OH',
    tz: 'America/New_York',
    owner: 'Sarah',
    anchors: ['Columbus OH', 'Dublin OH', 'Westerville OH'],
    trades: [...HOME_SERVICES, ...ADJACENT],
    primaryCity: 'Columbus',
    areaCodes: ['614', '380', '740', '937', '419'],
    suburbs: ['Dublin', 'Westerville', 'Hilliard', 'Grove City', 'Gahanna', 'Reynoldsburg', 'Pickerington', 'Powell', 'Delaware', 'Lewis Center', 'Worthington', 'Upper Arlington'],
  },
};
