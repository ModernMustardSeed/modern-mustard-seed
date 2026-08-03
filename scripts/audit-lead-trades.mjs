/**
 * WHICH SUITES ARE BUILT ON THE WRONG TRADE?
 *
 * One keyword decides an enormous amount. detectTrade picks a trade from the
 * lead's own words, and that single answer then drives the voice agent's service
 * menu, the command center's entire sample dataset, the hub calculator's average
 * ticket, and a line in the site brief telling the builder who the customers are.
 * Nothing downstream ever re-checks it.
 *
 * On 2026-08-03 an owner wrote "two businesses under one roof" and a chocolatier
 * was filed as a ROOFING company: the voice agent offered emergency tarping, the
 * calculator priced the average job at $12,400 for a shop selling $30 gift boxes.
 * The detector is fixed (idioms scrubbed, business name matched first), but every
 * suite forged BEFORE that fix still carries whatever the old code decided, frozen
 * into outbound_demo_os.config at forge time.
 *
 * So this recomputes the trade with today's logic and reports where the frozen
 * answer disagrees. It CHANGES NOTHING. Repointing a demo is a judgment call and
 * belongs to a human, so this prints the case and the fix rather than applying it.
 *
 * Usage:
 *   node scripts/audit-lead-trades.mjs            # disagreements only
 *   node scripts/audit-lead-trades.mjs --all      # every lead and its trade
 *   node scripts/audit-lead-trades.mjs --json     # machine readable
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* CI */ }

const url = env.supabase_url || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.supabase_service_role_key || env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase credentials missing.');
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const ALL = process.argv.includes('--all');
const JSON_OUT = process.argv.includes('--json');

/* ────────────────────────────────────────────────────────────────────
 * The detector, mirrored from data/demo-os-trades.ts.
 *
 * Mirrored rather than imported because that file is TypeScript behind an `@/`
 * path alias and this is a plain node script. THE TEST BELOW IS WHAT KEEPS THEM
 * HONEST: it re-reads the real file and asserts that every pattern here still
 * matches it character for character, so a drift fails loudly instead of quietly
 * auditing against yesterday's rules.
 * ──────────────────────────────────────────────────────────────────── */
const TRADE_PATTERNS = [
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
  ['cafe_bakery', /bakery|bakehouse|caf[eé]|coffee|donut|doughnut|pastry|espresso|chocolat|\bcocoa\b|confection|creamery|\bcandy\b|candies|\bfudge\b|truffle|ice cream|sweet shop|patisserie/],
  ['restaurant', /restaurant|grill|kitchen|bbq|barbecue|pizz|taco|burger|sushi|diner|bistro|eatery|steak|seafood|fish house|cantina|\bpho\b|thai|deli|catering|\bpub\b|tavern|smokehouse/],
  ['real_estate', /realty|real estate|realtor|properties/],
];

const TRADE_IDIOMS =
  /\bunder (?:one|the same|a single|our|their|its) roof\b|\ba? ?roof over (?:your|their|our|his|her|my) head\b|\b(?:raise|hit|went through) the roof\b|\bpaint (?:a picture|the town)\b|\bground[- ]?floor opportunit/g;

const NICHE_FALLBACK = {
  home_service: 'home_services',
  restaurant: 'restaurant',
  dental_medspa: 'dental',
  real_estate: 'real_estate',
  other: 'professional',
};

function detectTrade(corpus, niche, primary) {
  const scrub = (s) => String(s || '').toLowerCase().replace(TRADE_IDIOMS, ' ');
  const name = scrub(primary).trim();
  if (name) for (const [k, re] of TRADE_PATTERNS) if (re.test(name)) return k;
  const hay = scrub(corpus);
  for (const [k, re] of TRADE_PATTERNS) if (re.test(hay)) return k;
  return NICHE_FALLBACK[niche] ?? 'professional';
}

/** Fail loudly if the mirror above has drifted from the real detector. */
function assertMirrorMatchesSource() {
  let src;
  try {
    src = readFileSync(path.join(process.cwd(), 'data', 'demo-os-trades.ts'), 'utf8');
  } catch {
    console.error('Could not read data/demo-os-trades.ts to verify the mirror.');
    process.exit(2);
  }
  const drift = TRADE_PATTERNS.filter(([key, re]) => !src.includes(re.source)).map(([key]) => key);
  if (drift.length) {
    console.error(
      `\nMIRROR DRIFT. These patterns no longer match data/demo-os-trades.ts: ${drift.join(', ')}.\n` +
        `Update TRADE_PATTERNS in this script before trusting a single line of its output.\n`
    );
    process.exit(2);
  }
  if (!src.includes(TRADE_IDIOMS.source)) {
    console.error('\nMIRROR DRIFT: TRADE_IDIOMS no longer matches the source. Update it.\n');
    process.exit(2);
  }
}
assertMirrorMatchesSource();

/* ── read every lead that has a forged suite ─────────────────────────── */
const { data: leads, error } = await sb
  .from('outbound_leads')
  .select('id, business_name, notes, website, niche, source, status, os_demo_id, demo_run_id, site_demo_id, hub_demo_url, created_at')
  .not('os_demo_id', 'is', null)
  .order('created_at', { ascending: false })
  .limit(500);
if (error) {
  console.error(error.message);
  process.exit(2);
}

// The frozen answer lives on the OS config, written at forge time.
const osIds = leads.map((l) => l.os_demo_id).filter(Boolean);
const frozen = new Map();
for (let i = 0; i < osIds.length; i += 50) {
  const { data } = await sb.from('outbound_demo_os').select('id, config').in('id', osIds.slice(i, i + 50));
  for (const row of data ?? []) frozen.set(row.id, row.config?.trade ?? null);
}

const rows = [];
for (const l of leads) {
  const corpus = [l.business_name, l.notes ?? '', l.website ?? ''].join(' ');
  const now = detectTrade(corpus, l.niche ?? 'other', l.business_name ?? '');
  const was = frozen.get(l.os_demo_id) ?? null;
  rows.push({
    id: l.id,
    business: l.business_name,
    status: l.status,
    source: l.source,
    frozen: was,
    correct: now,
    disagrees: Boolean(was) && was !== now,
    hub: l.hub_demo_url,
    // The nastiest case: the frozen trade came from the NOTES, not the name.
    // That is the exact shape of the "under one roof" defect.
    fromNotesOnly: Boolean(was) && was !== now && detectTrade(l.business_name ?? '', l.niche ?? 'other', l.business_name ?? '') === now,
  });
}

const bad = rows.filter((r) => r.disagrees);

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: rows.length, disagreements: bad.length, rows: ALL ? rows : bad }, null, 1));
  process.exit(bad.length ? 1 : 0);
}

console.log(`\nChecked ${rows.length} forged suite(s). ${bad.length} carry a trade the current detector disagrees with.\n`);
for (const r of ALL ? rows : bad) {
  const flag = r.disagrees ? '🔴' : '  ';
  console.log(`${flag} ${(r.business || '(unnamed)').padEnd(38)} frozen=${String(r.frozen).padEnd(14)} correct=${r.correct}`);
  if (r.disagrees) {
    console.log(`     lead ${r.id}`);
    if (r.hub) console.log(`     ${r.hub}`);
    console.log(`     ${r.fromNotesOnly ? 'the old answer came from the NOTES, not the business name (the "under one roof" shape)' : 'the detector itself changed'}`);
  }
}
if (bad.length) {
  console.log(`\nNothing was changed. To repoint one, use the trade override on the Forge board,`);
  console.log(`which rewrites the OS config and the voice agent brief without a rebuild.`);
} else {
  console.log('Every forged suite agrees with the current detector.');
}
process.exit(bad.length ? 1 : 0);
