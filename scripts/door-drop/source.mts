/**
 * FIND MORE MAIN STREET. Broad local sourcing for a door drop.
 *
 * The acquisition Lead Finder sources HVAC, plumbing and roofing, because those
 * three are where a cold email campaign pays. A door drop is a different animal:
 * somebody is walking a street and handing paper to whoever is behind the
 * counter, and the street is cafes, salons, body shops, dentists, florists and
 * feed stores. So this searches the categories a town actually has.
 *
 * It reuses `runQuery`, `parseCard`, `parseRating` and `cityFrom` from
 * scripts/acq-maps.mts rather than writing a second card reader. That file has
 * already paid for two lessons this one would otherwise re-learn: the Website
 * button's href is Google's own answer to "what is this business's website", so
 * there is no guessing; and the review count comes off the star element's label,
 * never the first parenthesised number on the card, which is the area code.
 *
 * WHAT IT WILL NOT WRITE:
 *
 *   A business with no street address. This is a walking campaign. An address is
 *   the whole point and a row without one cannot be printed.
 *   A national chain, by the door drop's own two-list rule.
 *   Anything whose "website" fails badDomain: a Facebook page is recorded as
 *   presence, not as a website, the same way the Maps address pass does it.
 *   Anything we already have, matched on domain, on phone digits, or on name
 *   within the same town.
 *
 * Pacing is the same as every other Maps job here: one tab, a wait between
 * queries, and a stop when the feed starts coming back empty. It is slow on
 * purpose. Start it and leave it.
 *
 *   npx tsx scripts/door-drop/source.mts --region florida --target 100
 *   npx tsx scripts/door-drop/source.mts --region florida --target 100 --apply
 *   npx tsx scripts/door-drop/source.mts --region montana --target 50 --apply
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
import { openBrowser, runQuery, parseCard, parseRating, cityFrom } from '../acq-maps.mts';
import { REGIONS, loadEnv, supabase, gate, type Region } from './select.mts';

/**
 * What a main street is made of.
 *
 * Ordered by how likely the category is to have a website worth grading and an
 * owner who can say yes on the spot. Restaurants and salons first because every
 * town has a dozen; professional services later because there are fewer of them
 * and they are slower to decide.
 */
const CATEGORIES = [
  'restaurant', 'cafe', 'coffee shop', 'bar', 'bakery', 'pizza',
  'hair salon', 'barber shop', 'nail salon', 'day spa', 'massage',
  'gym', 'yoga studio', 'martial arts school',
  'auto repair', 'tire shop', 'auto body shop', 'car detailing', 'towing service',
  'dentist', 'chiropractor', 'optometrist', 'veterinarian', 'physical therapy',
  'landscaping', 'lawn care', 'tree service', 'pest control', 'cleaning service',
  'electrician', 'plumber', 'hvac contractor', 'roofing contractor', 'general contractor',
  'flooring store', 'furniture store', 'hardware store', 'nursery garden center',
  'florist', 'jeweler', 'boutique clothing store', 'gift shop', 'pet store',
  'insurance agency', 'real estate agency', 'accountant', 'law firm', 'title company',
  'photographer', 'print shop', 'sign company', 'self storage', 'moving company',
  'daycare', 'dance studio', 'music lessons', 'tutoring',
  'catering', 'event venue', 'wedding planner', 'brewery', 'winery',
];

const argv = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? d);
};
const has = (n: string) => argv.includes(`--${n}`);

const REGION: Region = REGIONS[(flag('region', 'florida') || 'florida').toLowerCase()] ?? REGIONS.florida;
const TARGET = Number(flag('target', '100'));
const APPLY = has('apply');
const HEADED = has('headed');

loadEnv(process.cwd());
const sb = supabase();

const BUNDLE = path.join(process.cwd(), '.door-drop-source.mjs');
execFileSync(
  'npx',
  ['--no-install', 'esbuild', 'lib/enrich.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${BUNDLE}`],
  { stdio: 'pipe', shell: process.platform === 'win32' },
);
const { badDomain, hostOf } = (await import(pathToFileURL(BUNDLE).href)) as {
  badDomain: (h: string) => string | null;
  hostOf: (u: string) => string | null;
};

/** The same cache the route sheet reads, so a sourced lead arrives already pinned. */
const GEO = path.join('artifacts', 'door-drop', '.geocache.json');
mkdirSync(path.dirname(GEO), { recursive: true });
const geo: Record<string, { lat: number; lon: number } | null> =
  existsSync(GEO) ? JSON.parse(readFileSync(GEO, 'utf8')) : {};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const phoneKey = (p: string | null) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};
const nameKey = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Everything we already hold, so nothing is inserted twice. */
async function existing() {
  const domains = new Set<string>();
  const phones = new Set<string>();
  const names = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from('outbound_leads')
      .select('business_name, city, website, phone')
      .range(from, from + 999);
    if (!data?.length) break;
    for (const l of data) {
      const h = l.website ? hostOf(l.website) : null;
      if (h) domains.add(h);
      const p = phoneKey(l.phone as string | null);
      if (p.length >= 10) phones.add(p);
      names.add(`${nameKey(String(l.business_name ?? ''))}|${String(l.city ?? '').toLowerCase()}`);
    }
    if (data.length < 1000) break;
  }
  return { domains, phones, names };
}

/**
 * THE SECOND PASS, and why it is not optional.
 *
 * The search feed this environment is served carries a name and an address and
 * almost nothing else: no phone, and no website button. A first run kept twelve
 * Tallahassee restaurants and every one of them had a blank phone and a blank
 * website, which is a lead nobody can audit and nobody can call.
 *
 * The place page has all three. And because each card hands back its OWN
 * `mapsUrl`, this navigates straight to that business rather than searching for
 * it by name, so there is no identity problem to gate against: it is the same
 * result we already read. That is a stronger guarantee than the address pass
 * gets, which starts from a name and has to prove the place it found is right.
 *
 * It also lifts the coordinate out of the place URL, so a business sourced this
 * way arrives with its pin already known and the route sheet never has to
 * geocode it.
 */
async function readPlace(page: Page, mapsUrl: string) {
  await page.goto(`${mapsUrl}${mapsUrl.includes('?') ? '&' : '?'}hl=en&gl=us`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  await sleep(5200);
  /**
   * NO NAMED FUNCTION INSIDE page.evaluate, and this is not a style note.
   *
   * tsx compiles this file with esbuild's keepNames on, which wraps every named
   * function in a `__name(...)` helper. That helper exists in Node and does not
   * exist in the browser, so the moment a `const q = (sel) => ...` is declared in
   * here, every evaluate throws `ReferenceError: __name is not defined` and the
   * page reads as an empty panel. It cost six leads and looked exactly like
   * Google throttling. scripts/door-drop/addresses.mjs never hit it because
   * plain .mjs is not transformed at all.
   *
   * So: querySelector inline, no helpers, no arrow functions declared in scope.
   */
  const got = await page.evaluate(`(() => ({
    h1: document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : null,
    website: document.querySelector('a[data-item-id="authority"]') ? document.querySelector('a[data-item-id="authority"]').href : null,
    phoneItem: document.querySelector('button[data-item-id^="phone"]') ? document.querySelector('button[data-item-id^="phone"]').getAttribute('data-item-id') : null,
    addressLabel: document.querySelector('button[data-item-id="address"]') ? document.querySelector('button[data-item-id="address"]').getAttribute('aria-label') : null,
    href: location.href,
  }))()`) as { h1: string | null; website: string | null; phoneItem: string | null; addressLabel: string | null; href: string };
  const m = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(got.href);
  return {
    h1: got.h1,
    landed: got.href.slice(0, 90),
    ok: Boolean(got.h1) && !/^results$/i.test(got.h1 ?? ''),
    website: got.website,
    phone: got.phoneItem ? got.phoneItem.replace(/^phone:tel:/, '') : null,
    address: got.addressLabel ? got.addressLabel.replace(/^Address:\s*/i, '').trim() : null,
    coord: m ? { lat: Number(m[1]), lon: Number(m[2]) } : null,
  };
}

type Found = {
  business_name: string;
  phone: string | null;
  website: string | null;
  city: string;
  state: string;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  source: string;
  source_urls: string[];
  notes: string | null;
  coord?: { lat: number; lon: number } | null;
};

async function main() {
  console.log(`Region ${REGION.key}: ${REGION.towns.join(', ')}`);
  console.log(`Target ${TARGET} new businesses${APPLY ? '' : '   (DRY RUN, nothing will be written)'}\n`);

  const have = await existing();
  console.log(`already on file: ${have.names.size} businesses, ${have.domains.size} domains\n`);

  const { browser, page } = await openBrowser(HEADED);
  const found: Found[] = [];
  const seen = new Set<string>();
  let blanks = 0;
  /** Why a card was not kept. 116 cards and 0 new is a bug, not a result. */
  const why: Record<string, number> = { noName: 0, closed: 0, noAddress: 0, dupName: 0, dupPhone: 0, dupDomain: 0, noPlace: 0 };
  type Pending = { name: string; address: string; town: string; card: Awaited<ReturnType<typeof runQuery>>[number] };
  const pending: Pending[] = [];

  /**
   * ROUND ROBIN, NOT CATEGORY BY CATEGORY.
   *
   * The first hundred came back as a hundred restaurants. One Tallahassee
   * restaurant search returns 116 cards, which filled the target before the loop
   * ever reached cafes, and a door drop of nothing but restaurants is not main
   * street. Walking the categories outermost and taking a slice from each keeps
   * the box mixed: some cafes, some salons, some body shops, some dentists.
   *
   * PER_QUERY caps what any single search may contribute. Twelve is enough that
   * a small town still fills up and few enough that Tallahassee's restaurant
   * feed cannot own the run.
   */
  const PER_QUERY = 12;
  outer: for (const category of CATEGORIES) {
    for (const town of REGION.towns) {
      if (found.length + pending.length >= TARGET) break outer;
      // "Saint Marks" and "St. Marks" are the same place; only search one.
      if (town === 'Saint Marks') continue;

      let cards: Awaited<ReturnType<typeof runQuery>> = [];
      try {
        cards = await runQuery(page, `${category} in ${town}, ${REGION.state}`);
      } catch {
        await sleep(6000);
        continue;
      }
      if (!cards.length) { blanks += 1; if (blanks > 12) { console.log('feed going quiet, stopping'); break outer; } }
      else blanks = 0;

      let added = 0;
      for (const c of cards) {
        const name = (c.name || '').trim();
        if (!name) { why.noName += 1; continue; }
        const { phone, address, closed } = parseCard(c.text || '');
        if (closed) { why.closed += 1; continue; }

        // A walking campaign needs somewhere to walk to.
        if (!address) { why.noAddress += 1; continue; }

        /**
         * NO PHONE IS NOT A REJECTION, and requiring one threw away everything.
         *
         * The first run read 116 Tallahassee restaurant cards and kept none: the
         * search feed Google serves this environment carries the name, the
         * address and the website button, and no phone at all. maps-detail.mts
         * already documents the same reduced-data variant costing it review
         * counts.
         *
         * The phone is not load bearing here anyway. It matters in the address
         * pass because that starts from a name and has to prove the place it
         * found is the right one. This starts from the card, so the name and the
         * address came off the same result together and are consistent by
         * construction. The place page fills the phone in later.
         */

        const nk = `${nameKey(name)}|${(cityFrom(address) ?? town).toLowerCase()}`;
        if (seen.has(nk) || have.names.has(nk)) { why.dupName += 1; continue; }
        if (phoneKey(phone).length >= 10 && have.phones.has(phoneKey(phone))) { why.dupPhone += 1; continue; }

        seen.add(nk);
        pending.push({ name, address, town, card: c });
        added += 1;
        if (added >= PER_QUERY) break;
        if (found.length + pending.length >= TARGET) break;
      }
      const tally = Object.entries(why).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(' ');
      console.log(`  ${String(category).padEnd(20)} ${town.padEnd(14)} ${String(cards.length).padStart(3)} cards, ${added} new  [${tally}]`);
      await sleep(2600);
    }
  }

  console.log(`
shortlisted ${pending.length}. Opening each place page for the phone, the website and the pin.`);
  for (let i = 0; i < pending.length; i++) {
    const pnd = pending[i];
    const label = `  [${i + 1}/${pending.length}] ${pnd.name.slice(0, 32).padEnd(33)}`;
    let d: Awaited<ReturnType<typeof readPlace>> | null = null;
    try { d = await readPlace(page, pnd.card.mapsUrl); } catch (e) { console.log(`${label} threw: ${String((e as Error).message).slice(0, 90)}`); console.log(`      url: ${pnd.card.mapsUrl.slice(0, 110)}`); d = null; }
    /**
     * An empty panel here is Google throttling, not a broken selector, and
     * maps-detail.mts documents the same thing: past enough rapid loads the h1
     * comes back empty and nothing throws. So the first miss backs off hard and
     * tries once more before the lead is given up.
     */
    if (!d?.ok) {
      console.log(`${label} empty panel (h1=${JSON.stringify(d?.h1 ?? null)}), backing off 20s`);
      await sleep(20000);
      try { d = await readPlace(page, pnd.card.mapsUrl); } catch { d = null; }
    }
    if (!d?.ok) { why.noPlace += 1; console.log(`${label} gave up: ${d?.landed ?? 'no page'}`); await sleep(8000); continue; }

    // A Facebook page is presence, not a website. Same rule the address pass uses.
    let website: string | null = null;
    let note: string | null = null;
    if (d.website) {
      const bad = badDomain(hostOf(d.website) ?? '');
      if (bad) note = `WEB PRESENCE: ${d.website} (no site of their own)`;
      else website = d.website;
    }
    if (website && have.domains.has(hostOf(website) ?? '')) { why.dupDomain += 1; console.log(`${label} domain already on file`); await sleep(2500); continue; }
    if (d.phone && have.phones.has(phoneKey(d.phone))) { why.dupPhone += 1; console.log(`${label} phone already on file`); await sleep(2500); continue; }

    const address = d.address ?? pnd.address;
    const { rating, reviews } = parseRating(pnd.card.ratingLabel || '', pnd.card.text || '');
    found.push({
      business_name: pnd.name,
      phone: d.phone,
      website,
      city: cityFrom(address) ?? pnd.town,
      state: REGION.state === 'Florida' ? 'FL' : 'MT',
      address,
      rating,
      review_count: reviews,
      source: 'door-drop-maps',
      source_urls: [pnd.card.mapsUrl],
      notes: note,
      coord: d.coord,
    });
    /**
     * The place page already gave us the pin, so hand it to the route sheet
     * now rather than making coords.mjs open the same page again tomorrow.
     */
    if (d.coord) {
      geo[`biz|${pnd.name.toLowerCase().trim()}|${(cityFrom(address) ?? pnd.town).toLowerCase().trim()}`] = d.coord;
      writeFileSync(GEO, JSON.stringify(geo), 'utf8');
    }
    console.log(`${label} ${website ? 'site' : note ? 'presence' : 'no site'}  ${d.phone ?? 'no phone'}`);
    await sleep(2500);
  }

  console.log(`
rejections: ${Object.entries(why).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`);
  await browser.close();
  try { rmSync(BUNDLE); } catch { /* nothing to clean */ }

  // The door drop's own gates get a say before anything is written: a chain we
  // would never print is a chain we should not store either.
  const asLeads = found.map((f) => ({ ...f, id: 'new', audit_json: null, audit_score: null, audit_at: null, audit_url: null, is_test: null, duplicate_of: null, unsubscribed_at: null, suppression_reason: null, domain_key: null, client_status: null, payment_status: null, won_at: null, status: 'new', contact_name: null, postal_code: null, niche: null, trade: null, integration_plan_url: null, integration_plan_status: null } as never));
  const g = gate(asLeads, new Map(), { maxAgeDays: 21, allowStale: false, skipNames: new Set() });
  const chains = new Set(g.dropped.filter((d) => d.gate === 'local' || d.gate === 'ours').map((d) => d.business_name));
  const keep = found.filter((f) => !chains.has(f.business_name));

  console.log(`\nfound ${found.length}, dropped ${found.length - keep.length} as chains or ours, keeping ${keep.length}`);
  const byTown: Record<string, number> = {};
  for (const f of keep) byTown[f.city] = (byTown[f.city] ?? 0) + 1;
  for (const [t, n] of Object.entries(byTown).sort((a, b) => b[1] - a[1])) console.log(`  ${t.padEnd(18)} ${n}`);
  console.log(`  with a website: ${keep.filter((k) => k.website).length}, presence only: ${keep.filter((k) => !k.website && k.notes).length}, with a phone: ${keep.filter((k) => k.phone).length}`);

  if (!APPLY) { console.log('\nDRY RUN. Nothing written. Re-run with --apply.'); return; }

  // Inserted in batches, and never as one statement: a single failure in a
  // hundred rows should cost that row, not the run.
  let wrote = 0;
  for (let i = 0; i < keep.length; i += 25) {
    const chunk = keep.slice(i, i + 25).map(({ coord: _coord, ...row }) => row);
    const { error } = await sb.from('outbound_leads').insert(chunk);
    if (error) {
      console.log(`  batch ${i / 25 + 1} failed (${error.message}), falling back to one at a time`);
      for (const row of chunk) {
        const { error: e2 } = await sb.from('outbound_leads').insert(row);
        if (e2) console.log(`    skipped ${row.business_name}: ${e2.message}`);
        else wrote += 1;
      }
    } else wrote += chunk.length;
  }
  console.log(`\nwrote ${wrote} new businesses.`);
  console.log('Next: node scripts/door-drop/addresses.mjs --apply --cities "..." then build with --refresh.');
}

main().catch((e) => { console.error(e); process.exit(1); });
