/**
 * NATIONAL CHAIN DETECTION — keep corporate locations out of the outbound pipeline.
 *
 * Found 2026-07-22 while fixing the enrichment: the lead list contained "Walmart
 * Pharmacy", "Walmart Vision Center", "Walmart Auto Care Center", "Target", "Ace
 * Hardware" and a Starbucks. None of them can buy a website from a Kalispell studio.
 * A store manager cannot sign a contract, there is no owner to pitch, and every dial
 * and every forged demo spent on one is spend that produced nothing.
 *
 * Plain .mjs on purpose so the sourcing scripts (.mjs) and the app (.ts, allowJs) can
 * share ONE list. The enrichment keeps its own domain blocklist for a different job:
 * that one asks "is this URL their website", this one asks "is this business even a
 * prospect".
 *
 * DELIBERATELY CONSERVATIVE. A missed chain costs one wasted dial. A false positive
 * silently deletes a real local business from the pipeline, which is far worse and
 * invisible. So single-word brands only match when the name is essentially JUST the
 * brand plus a department word ("Sonic Plumbing" is a plumber, not a drive-in), and
 * multi-word brands must appear as a contiguous run of tokens.
 */

/** Brands distinctive enough that a contiguous token match is safe. */
const MULTI_WORD = [
  'ace hardware', 'jiffy lube', 'great clips', 'sport clips', 'cost cutters', 'fantastic sams',
  'supercuts', 'planet fitness', 'anytime fitness', 'snap fitness', '24 hour fitness',
  'orangetheory fitness', 'massage envy', 'european wax center', 'aspen dental', 'western dental',
  'banfield pet hospital', 'vca animal hospital', 'petsmart', 'pet supplies plus',
  'discount tire', 'les schwab', 'tires plus', 'firestone complete auto care', 'big o tires',
  'gerber collision', 'caliber collision', 'maaco collision', 'valvoline instant oil change',
  'take 5 oil change', 'grease monkey', 'auto zone', 'autozone', 'advance auto parts',
  'o reilly auto parts', 'napa auto parts', 'pep boys',
  // NOTE: insurance agencies, Edward Jones advisors, tax offices and the like are
  // deliberately NOT here. Those franchisees personally own their book of business,
  // buy their own local marketing, and are exactly the prospect we want. "Jamie
  // Anderson - State Farm Insurance Agent" is a local business owner, not a corporate
  // branch, and this filter flagged her on the first pass. Do not add them back.
  'ups store', 'the ups store', 'fedex office', 'post office', 'us post office', 'united states postal service',
  'public storage', 'extra space storage', 'cubesmart', 'life storage', 'u haul', 'uhaul',
  'dollar general', 'dollar tree', 'family dollar', 'five below', 'big lots', 'tractor supply',
  'home depot', 'the home depot', 'harbor freight', 'sherwin williams', 'benjamin moore',
  'best buy', 'game stop', 'gamestop', 'sally beauty', 'ulta beauty', 'bath and body works',
  'vitamin shoppe', 'sam s club', 'whole foods market', 'trader joe s', 'natural grocers',
  'buffalo wild wings', 'olive garden', 'cracker barrel', 'red lobster', 'texas roadhouse',
  'panda express', 'panera bread', 'jimmy john s', 'firehouse subs', 'jersey mike s',
  'little caesars', 'papa john s', 'pizza hut', 'domino s pizza', 'taco bell', 'burger king',
  'dairy queen', 'dunkin donuts', 'baskin robbins', 'cold stone creamery', 'jamba juice',
  'chick fil a', 'raising cane s', 'five guys', 'in n out burger', 'shake shack',
  'wells fargo', 'bank of america', 'chase bank', 'us bank', 'first interstate bank',
  'kumon math', 'sylvan learning', 'goddard school', 'kiddie academy', 'primrose school',
  'salvation army', 'goodwill industries', 'planet smoothie', 'smoothie king',
  'verizon wireless', 't mobile', 'boost mobile', 'cricket wireless', 'metro by t mobile',
  'enterprise rent a car', 'avis car rental', 'hertz rent a car', 'budget car rental',
  'holiday inn', 'hampton inn', 'best western', 'super 8', 'comfort inn', 'days inn',
  'la quinta', 'quality inn', 'motel 6', 'travelodge', 'americinn', 'fairfield inn',
  'walmart supercenter', 'walmart neighborhood market', 'sams club',
];

/** Single-word brands. Only flagged when the name is the brand plus department words. */
const SINGLE_WORD = [
  'walmart', 'target', 'costco', 'kroger', 'safeway', 'albertsons', 'publix', 'aldi', 'meijer',
  'menards', 'lowes', 'petco', 'walgreens', 'cvs', 'riteaid', 'starbucks', 'subway',
  'mcdonalds', 'wendys', 'arbys', 'sonic', 'culvers', 'chipotle', 'ihop', 'dennys',
  'applebees', 'chilis', 'hooters', 'kfc', 'popeyes', 'zaxbys', 'whataburger',
  'gnc', 'staples', 'officemax', 'michaels', 'joann', 'hobbylobby', 'petsmart',
  'safelite', 'midas', 'meineke', 'monro', 'ziebart', 'earthfare',
];

const DEPARTMENT = new Set([
  'supercenter', 'super', 'center', 'centre', 'pharmacy', 'vision', 'optical', 'auto', 'care',
  'tire', 'tires', 'lube', 'garden', 'nursery', 'photo', 'deli', 'bakery', 'market', 'grocery',
  'store', 'shop', 'express', 'drive', 'thru', 'cafe', 'coffee', 'restaurant', 'location',
  'store', 'gas', 'fuel', 'station', 'atm', 'bank', 'money', 'services', 'service', 'dept',
  'department', 'of', 'the', 'at', 'and', 'in', 'on', 'a', 'no', 'number', 'inc', 'llc', 'co',
]);

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Is this lead a national-chain location rather than a local business?
 * Returns the matched brand, or null.
 */
export function chainBrand(businessName) {
  const n = norm(businessName);
  if (!n) return null;

  for (const brand of MULTI_WORD) {
    if (n === brand || n.startsWith(`${brand} `) || n.includes(` ${brand} `) || n.endsWith(` ${brand}`)) {
      return brand;
    }
  }

  const tokens = n.split(' ');
  for (const brand of SINGLE_WORD) {
    const i = tokens.indexOf(brand);
    if (i === -1) continue;
    // Everything else in the name has to be a department or filler word, or this is a
    // local business that merely shares a word with a chain.
    const rest = tokens.filter((_, j) => j !== i);
    if (rest.every((t) => DEPARTMENT.has(t) || /^\d+$/.test(t))) return brand;
  }
  return null;
}

/** One line a human can read in a log or a lead note. */
export function chainReason(businessName) {
  const brand = chainBrand(businessName);
  return brand ? `looks like a ${brand} location, not a local business` : null;
}
