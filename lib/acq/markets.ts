/**
 * THE TARGET MARKETS.
 *
 * Sun Belt metros first, because HVAC demand is weather-driven and a 112 degree
 * Phoenix afternoon is the single best salesperson a voice agent has. Each entry
 * carries a bounding box because Overpass takes a box, not a city name, and
 * geocoding fifteen cities on every run is fifteen chances to fail.
 *
 * Boxes are deliberately metro-sized rather than city-limits sized: a Mesa HVAC
 * company serves Gilbert, and a Fort Worth roofer serves Arlington.
 */

export type Market = {
  key: string;
  city: string;
  state: string;
  /** south,west,north,east — the order Overpass expects. */
  bbox: string;
  /** Rough priority: 1 runs first. */
  tier: 1 | 2 | 3;
};

export const MARKETS: Market[] = [
  { key: 'phoenix', city: 'Phoenix', state: 'AZ', bbox: '33.20,-112.40,33.80,-111.75', tier: 1 },
  { key: 'scottsdale', city: 'Scottsdale', state: 'AZ', bbox: '33.45,-111.98,33.80,-111.75', tier: 1 },
  { key: 'mesa', city: 'Mesa', state: 'AZ', bbox: '33.30,-111.90,33.52,-111.55', tier: 1 },
  { key: 'tucson', city: 'Tucson', state: 'AZ', bbox: '32.05,-111.15,32.40,-110.70', tier: 2 },
  { key: 'lasvegas', city: 'Las Vegas', state: 'NV', bbox: '35.95,-115.40,36.35,-114.90', tier: 1 },
  { key: 'henderson', city: 'Henderson', state: 'NV', bbox: '35.95,-115.15,36.10,-114.90', tier: 3 },
  { key: 'dallas', city: 'Dallas', state: 'TX', bbox: '32.60,-97.00,33.05,-96.55', tier: 1 },
  { key: 'fortworth', city: 'Fort Worth', state: 'TX', bbox: '32.55,-97.55,32.95,-97.05', tier: 1 },
  { key: 'houston', city: 'Houston', state: 'TX', bbox: '29.55,-95.70,30.05,-95.10', tier: 1 },
  { key: 'sanantonio', city: 'San Antonio', state: 'TX', bbox: '29.30,-98.75,29.65,-98.30', tier: 1 },
  { key: 'austin', city: 'Austin', state: 'TX', bbox: '30.15,-97.95,30.50,-97.60', tier: 1 },
  { key: 'tampa', city: 'Tampa', state: 'FL', bbox: '27.85,-82.60,28.10,-82.30', tier: 1 },
  { key: 'stpete', city: 'St. Petersburg', state: 'FL', bbox: '27.68,-82.78,27.90,-82.58', tier: 3 },
  { key: 'orlando', city: 'Orlando', state: 'FL', bbox: '28.35,-81.55,28.70,-81.20', tier: 1 },
  { key: 'jacksonville', city: 'Jacksonville', state: 'FL', bbox: '30.15,-81.85,30.50,-81.40', tier: 2 },
  { key: 'miami', city: 'Miami', state: 'FL', bbox: '25.60,-80.45,26.00,-80.10', tier: 2 },
  { key: 'atlanta', city: 'Atlanta', state: 'GA', bbox: '33.60,-84.60,34.05,-84.15', tier: 1 },
  { key: 'charlotte', city: 'Charlotte', state: 'NC', bbox: '35.10,-81.00,35.40,-80.65', tier: 1 },
  { key: 'raleigh', city: 'Raleigh', state: 'NC', bbox: '35.70,-78.80,35.95,-78.50', tier: 2 },
  { key: 'nashville', city: 'Nashville', state: 'TN', bbox: '36.00,-87.00,36.35,-86.60', tier: 1 },
  { key: 'memphis', city: 'Memphis', state: 'TN', bbox: '35.00,-90.20,35.30,-89.75', tier: 2 },
  { key: 'denver', city: 'Denver', state: 'CO', bbox: '39.60,-105.15,39.90,-104.80', tier: 1 },
  { key: 'coloradosprings', city: 'Colorado Springs', state: 'CO', bbox: '38.72,-104.95,38.98,-104.65', tier: 1 },
  { key: 'saltlake', city: 'Salt Lake City', state: 'UT', bbox: '40.60,-112.10,40.90,-111.75', tier: 2 },
  { key: 'okc', city: 'Oklahoma City', state: 'OK', bbox: '35.30,-97.70,35.65,-97.35', tier: 2 },
  { key: 'kansascity', city: 'Kansas City', state: 'MO', bbox: '38.90,-94.75,39.25,-94.40', tier: 2 },
  { key: 'stlouis', city: 'St. Louis', state: 'MO', bbox: '38.50,-90.40,38.80,-90.10', tier: 2 },
  { key: 'indianapolis', city: 'Indianapolis', state: 'IN', bbox: '39.65,-86.35,39.95,-85.95', tier: 2 },
  { key: 'columbus', city: 'Columbus', state: 'OH', bbox: '39.85,-83.15,40.15,-82.80', tier: 2 },
  { key: 'birmingham', city: 'Birmingham', state: 'AL', bbox: '33.40,-86.95,33.65,-86.60', tier: 3 },
  { key: 'charleston', city: 'Charleston', state: 'SC', bbox: '32.70,-80.15,32.95,-79.85', tier: 3 },
  { key: 'boise', city: 'Boise', state: 'ID', bbox: '43.50,-116.40,43.70,-116.10', tier: 3 },
  { key: 'sacramento', city: 'Sacramento', state: 'CA', bbox: '38.45,-121.60,38.70,-121.30', tier: 3 },
  { key: 'riverside', city: 'Riverside', state: 'CA', bbox: '33.85,-117.55,34.05,-117.25', tier: 3 },
  { key: 'portland', city: 'Portland', state: 'OR', bbox: '45.42,-122.80,45.60,-122.50', tier: 3 },
  { key: 'seattle', city: 'Seattle', state: 'WA', bbox: '47.48,-122.42,47.73,-122.22', tier: 3 },
  { key: 'newOrleans', city: 'New Orleans', state: 'LA', bbox: '29.90,-90.15,30.05,-89.90', tier: 3 },
  { key: 'richmond', city: 'Richmond', state: 'VA', bbox: '37.45,-77.60,37.65,-77.35', tier: 3 },

  // The long tail. A metro box is the unit of work because Overpass answers one
  // in under a minute and answers a whole state in eight, when it answers at
  // all. Breadth beats depth here: a hundred reliable boxes find more real
  // contractors than a dozen ambitious ones that time out.
  { key: 'chandler', city: 'Chandler', state: 'AZ', bbox: '33.22,-111.95,33.36,-111.78', tier: 2 },
  { key: 'glendaleaz', city: 'Glendale', state: 'AZ', bbox: '33.50,-112.30,33.68,-112.13', tier: 2 },
  { key: 'gilbert', city: 'Gilbert', state: 'AZ', bbox: '33.24,-111.83,33.40,-111.68', tier: 2 },
  { key: 'peoria', city: 'Peoria', state: 'AZ', bbox: '33.55,-112.35,33.82,-112.18', tier: 3 },
  { key: 'surprise', city: 'Surprise', state: 'AZ', bbox: '33.58,-112.45,33.75,-112.28', tier: 3 },
  { key: 'plano', city: 'Plano', state: 'TX', bbox: '32.98,-96.85,33.10,-96.62', tier: 2 },
  { key: 'arlingtontx', city: 'Arlington', state: 'TX', bbox: '32.62,-97.22,32.82,-97.02', tier: 2 },
  { key: 'elpaso', city: 'El Paso', state: 'TX', bbox: '31.65,-106.60,31.92,-106.25', tier: 3 },
  { key: 'corpus', city: 'Corpus Christi', state: 'TX', bbox: '27.66,-97.55,27.85,-97.30', tier: 3 },
  { key: 'lubbock', city: 'Lubbock', state: 'TX', bbox: '33.50,-102.00,33.62,-101.78', tier: 3 },
  { key: 'katy', city: 'Katy / Sugar Land', state: 'TX', bbox: '29.50,-95.90,29.85,-95.60', tier: 3 },
  { key: 'thewoodlands', city: 'The Woodlands', state: 'TX', bbox: '30.10,-95.60,30.30,-95.35', tier: 3 },
  { key: 'mckinney', city: 'McKinney / Frisco', state: 'TX', bbox: '33.08,-96.90,33.25,-96.55', tier: 3 },
  { key: 'newbraunfels', city: 'New Braunfels', state: 'TX', bbox: '29.65,-98.20,29.78,-98.00', tier: 3 },
  { key: 'fortlauderdale', city: 'Fort Lauderdale', state: 'FL', bbox: '26.05,-80.30,26.25,-80.10', tier: 2 },
  { key: 'westpalm', city: 'West Palm Beach', state: 'FL', bbox: '26.60,-80.20,26.85,-80.02', tier: 2 },
  { key: 'sarasota', city: 'Sarasota', state: 'FL', bbox: '27.25,-82.60,27.45,-82.40', tier: 3 },
  { key: 'fortmyers', city: 'Fort Myers', state: 'FL', bbox: '26.50,-81.95,26.72,-81.75', tier: 3 },
  { key: 'lakeland', city: 'Lakeland', state: 'FL', bbox: '27.95,-82.02,28.12,-81.85', tier: 3 },
  { key: 'ocala', city: 'Ocala', state: 'FL', bbox: '29.12,-82.25,29.25,-82.02', tier: 3 },
  { key: 'tallahassee', city: 'Tallahassee', state: 'FL', bbox: '30.38,-84.42,30.55,-84.15', tier: 3 },
  { key: 'naples', city: 'Naples', state: 'FL', bbox: '26.05,-81.85,26.30,-81.65', tier: 3 },
  { key: 'daytona', city: 'Daytona Beach', state: 'FL', bbox: '29.13,-81.15,29.30,-80.98', tier: 3 },
  { key: 'marietta', city: 'Marietta / Cobb', state: 'GA', bbox: '33.85,-84.65,34.05,-84.40', tier: 2 },
  { key: 'savannah', city: 'Savannah', state: 'GA', bbox: '31.98,-81.25,32.15,-81.02', tier: 3 },
  { key: 'augusta', city: 'Augusta', state: 'GA', bbox: '33.35,-82.10,33.52,-81.90', tier: 3 },
  { key: 'columbusga', city: 'Columbus', state: 'GA', bbox: '32.42,-85.00,32.55,-84.85', tier: 3 },
  { key: 'greenville', city: 'Greenville', state: 'SC', bbox: '34.78,-82.48,34.92,-82.30', tier: 3 },
  { key: 'columbiasc', city: 'Columbia', state: 'SC', bbox: '33.95,-81.12,34.10,-80.92', tier: 3 },
  { key: 'myrtle', city: 'Myrtle Beach', state: 'SC', bbox: '33.62,-79.05,33.80,-78.82', tier: 3 },
  { key: 'winstonsalem', city: 'Winston-Salem', state: 'NC', bbox: '36.02,-80.35,36.15,-80.18', tier: 3 },
  { key: 'greensboro', city: 'Greensboro', state: 'NC', bbox: '36.00,-79.90,36.15,-79.70', tier: 3 },
  { key: 'durham', city: 'Durham / Chapel Hill', state: 'NC', bbox: '35.85,-79.10,36.08,-78.80', tier: 3 },
  { key: 'wilmington', city: 'Wilmington', state: 'NC', bbox: '34.15,-77.98,34.32,-77.80', tier: 3 },
  { key: 'asheville', city: 'Asheville', state: 'NC', bbox: '35.50,-82.65,35.65,-82.45', tier: 3 },
  { key: 'knoxville', city: 'Knoxville', state: 'TN', bbox: '35.88,-84.10,36.05,-83.85', tier: 3 },
  { key: 'chattanooga', city: 'Chattanooga', state: 'TN', bbox: '34.98,-85.35,35.15,-85.15', tier: 3 },
  { key: 'murfreesboro', city: 'Murfreesboro', state: 'TN', bbox: '35.78,-86.50,35.92,-86.32', tier: 3 },
  { key: 'auroraco', city: 'Aurora', state: 'CO', bbox: '39.60,-104.90,39.78,-104.65', tier: 2 },
  { key: 'fortcollins', city: 'Fort Collins', state: 'CO', bbox: '40.50,-105.15,40.65,-104.95', tier: 3 },
  { key: 'pueblo', city: 'Pueblo', state: 'CO', bbox: '38.20,-104.70,38.32,-104.55', tier: 3 },
  { key: 'provo', city: 'Provo / Orem', state: 'UT', bbox: '40.18,-111.75,40.35,-111.60', tier: 3 },
  { key: 'stgeorge', city: 'St. George', state: 'UT', bbox: '37.02,-113.65,37.15,-113.48', tier: 3 },
  { key: 'reno', city: 'Reno', state: 'NV', bbox: '39.40,-119.90,39.62,-119.70', tier: 3 },
  { key: 'albuquerque', city: 'Albuquerque', state: 'NM', bbox: '35.02,-106.75,35.22,-106.50', tier: 3 },
  { key: 'tulsa', city: 'Tulsa', state: 'OK', bbox: '36.02,-96.05,36.22,-95.82', tier: 3 },
  { key: 'wichita', city: 'Wichita', state: 'KS', bbox: '37.60,-97.45,37.78,-97.20', tier: 3 },
  { key: 'omaha', city: 'Omaha', state: 'NE', bbox: '41.20,-96.15,41.35,-95.90', tier: 3 },
  { key: 'desmoines', city: 'Des Moines', state: 'IA', bbox: '41.53,-93.75,41.65,-93.55', tier: 3 },
  { key: 'springfieldmo', city: 'Springfield', state: 'MO', bbox: '37.12,-93.35,37.25,-93.20', tier: 3 },
  { key: 'littlerock', city: 'Little Rock', state: 'AR', bbox: '34.68,-92.45,34.82,-92.25', tier: 3 },
  { key: 'jackson', city: 'Jackson', state: 'MS', bbox: '32.25,-90.30,32.40,-90.10', tier: 3 },
  { key: 'mobile', city: 'Mobile', state: 'AL', bbox: '30.62,-88.20,30.75,-88.02', tier: 3 },
  { key: 'huntsville', city: 'Huntsville', state: 'AL', bbox: '34.65,-86.72,34.80,-86.52', tier: 3 },
  { key: 'montgomery', city: 'Montgomery', state: 'AL', bbox: '32.30,-86.40,32.45,-86.20', tier: 3 },
  { key: 'batonrouge', city: 'Baton Rouge', state: 'LA', bbox: '30.38,-91.20,30.52,-91.02', tier: 3 },
  { key: 'shreveport', city: 'Shreveport', state: 'LA', bbox: '32.42,-93.85,32.55,-93.68', tier: 3 },
  { key: 'louisville', city: 'Louisville', state: 'KY', bbox: '38.15,-85.85,38.32,-85.58', tier: 3 },
  { key: 'lexington', city: 'Lexington', state: 'KY', bbox: '37.95,-84.60,38.08,-84.40', tier: 3 },
  { key: 'cincinnati', city: 'Cincinnati', state: 'OH', bbox: '39.05,-84.65,39.25,-84.35', tier: 3 },
  { key: 'cleveland', city: 'Cleveland', state: 'OH', bbox: '41.42,-81.82,41.58,-81.55', tier: 3 },
  { key: 'dayton', city: 'Dayton', state: 'OH', bbox: '39.68,-84.30,39.82,-84.10', tier: 3 },
  { key: 'toledo', city: 'Toledo', state: 'OH', bbox: '41.58,-83.72,41.72,-83.48', tier: 3 },
  { key: 'fortwayne', city: 'Fort Wayne', state: 'IN', bbox: '40.98,-85.22,41.15,-85.02', tier: 3 },
  { key: 'detroit', city: 'Detroit', state: 'MI', bbox: '42.25,-83.30,42.45,-82.92', tier: 3 },
  { key: 'grandrapids', city: 'Grand Rapids', state: 'MI', bbox: '42.88,-85.75,43.02,-85.55', tier: 3 },
  { key: 'milwaukee', city: 'Milwaukee', state: 'WI', bbox: '42.95,-88.05,43.15,-87.85', tier: 3 },
  { key: 'madison', city: 'Madison', state: 'WI', bbox: '43.00,-89.50,43.15,-89.28', tier: 3 },
  { key: 'minneapolis', city: 'Minneapolis / St. Paul', state: 'MN', bbox: '44.88,-93.35,45.05,-93.02', tier: 3 },
  { key: 'chicago', city: 'Chicago', state: 'IL', bbox: '41.72,-87.85,42.02,-87.55', tier: 3 },
  { key: 'naperville', city: 'Naperville / DuPage', state: 'IL', bbox: '41.70,-88.25,41.88,-87.95', tier: 3 },
  { key: 'stlouiscounty', city: 'St. Charles', state: 'MO', bbox: '38.70,-90.75,38.90,-90.45', tier: 3 },
  { key: 'pittsburgh', city: 'Pittsburgh', state: 'PA', bbox: '40.36,-80.08,40.52,-79.85', tier: 3 },
  { key: 'philadelphia', city: 'Philadelphia', state: 'PA', bbox: '39.88,-75.28,40.08,-75.02', tier: 3 },
  { key: 'baltimore', city: 'Baltimore', state: 'MD', bbox: '39.20,-76.72,39.38,-76.52', tier: 3 },
  { key: 'nova', city: 'Northern Virginia', state: 'VA', bbox: '38.70,-77.45,38.95,-77.10', tier: 3 },
  { key: 'virginiabeach', city: 'Virginia Beach / Norfolk', state: 'VA', bbox: '36.75,-76.35,36.92,-75.98', tier: 3 },
  { key: 'newark', city: 'Newark / Essex', state: 'NJ', bbox: '40.68,-74.28,40.82,-74.12', tier: 3 },
  { key: 'longisland', city: 'Long Island', state: 'NY', bbox: '40.68,-73.60,40.85,-73.20', tier: 3 },
  { key: 'buffalo', city: 'Buffalo', state: 'NY', bbox: '42.85,-78.92,42.98,-78.75', tier: 3 },
  { key: 'hartford', city: 'Hartford', state: 'CT', bbox: '41.72,-72.75,41.82,-72.62', tier: 3 },
  { key: 'boise2', city: 'Nampa / Meridian', state: 'ID', bbox: '43.55,-116.65,43.68,-116.35', tier: 3 },
  { key: 'spokane', city: 'Spokane', state: 'WA', bbox: '47.62,-117.50,47.75,-117.28', tier: 3 },
  { key: 'tacoma', city: 'Tacoma', state: 'WA', bbox: '47.18,-122.55,47.32,-122.35', tier: 3 },
  { key: 'salem', city: 'Salem / Eugene', state: 'OR', bbox: '44.02,-123.15,44.98,-122.85', tier: 3 },
  { key: 'fresno', city: 'Fresno', state: 'CA', bbox: '36.68,-119.90,36.88,-119.65', tier: 3 },
  { key: 'bakersfield', city: 'Bakersfield', state: 'CA', bbox: '35.28,-119.15,35.45,-118.90', tier: 3 },
  { key: 'sandiego', city: 'San Diego', state: 'CA', bbox: '32.65,-117.25,32.90,-116.95', tier: 3 },
  { key: 'anaheim', city: 'Anaheim / Orange County', state: 'CA', bbox: '33.68,-118.02,33.88,-117.75', tier: 3 },
  { key: 'santarosa', city: 'Santa Rosa', state: 'CA', bbox: '38.38,-122.80,38.52,-122.62', tier: 3 },
];

export function marketsByTier(maxTier: 1 | 2 | 3 = 3): Market[] {
  return MARKETS.filter((m) => m.tier <= maxTier).sort((a, b) => a.tier - b.tier);
}

export function findMarket(key: string): Market | undefined {
  return MARKETS.find((m) => m.key === key || m.city.toLowerCase() === key.toLowerCase());
}
