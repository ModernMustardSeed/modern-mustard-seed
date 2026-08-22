/**
 * DOES THIS TRADE ACTUALLY FIND ANYBODY?
 *
 * Adding an industry to the registry is cheap. Adding one whose search terms
 * return nothing, or whose strict filter throws away everything the search
 * returned, is worse than not adding it: the run reports "0 banked" and looks
 * like a worker problem for a week.
 *
 * So this drives the real Google Maps discovery for one market and one or more
 * trades, applies the same strict filter sourcing applies, and prints what
 * survived. It writes NOTHING: no run row, no prospects, no counters.
 *
 *   npx tsx scripts/acq-probe-trade.mts --trades concrete,fencing,septic
 *   npx tsx scripts/acq-probe-trade.mts --trades paving --market phoenix-az
 *   npx tsx scripts/acq-probe-trade.mts --all-new --headed
 */

import { readFileSync } from 'node:fs';

/* This probe talks to Google Maps and to pure functions. It needs no database
   and no keys, so a missing .env.local is not a reason to refuse to run. */
try {
  for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {
  /* no env file here, and nothing below wants one */
}

// The explicit .mts extension, exactly as acq-source.mts imports it: the
// resolver will not find this module without it.
const { openBrowser, discoverMaps } = await import('./acq-maps.mts');
const { matchesTrade } = await import('../lib/acq/source');
const { SOURCEABLE_TRADES, PROVEN_TRADES, TRADE_DEFS } = await import('../lib/acq/trades');
const { marketsByTier, findMarket } = await import('../lib/acq/markets');

type Trade = Exclude<import('../lib/acq/types').Trade, 'other'>;

const argv = process.argv.slice(2);
const flag = (n: string): string | null => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? null : (argv[i + 1] ?? '');
};

const HEADED = argv.includes('--headed');
const ALL_NEW = argv.includes('--all-new');
const requested = (flag('trades') ?? '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean) as Trade[];

const trades: Trade[] = ALL_NEW
  ? (SOURCEABLE_TRADES.filter((t) => !PROVEN_TRADES.includes(t)) as Trade[])
  : requested.length
    ? requested
    : (['hvac'] as Trade[]);

for (const t of trades) {
  if (!SOURCEABLE_TRADES.includes(t)) {
    console.error(`Unknown trade "${t}". Try one of: ${SOURCEABLE_TRADES.join(', ')}`);
    process.exit(1);
  }
}

const marketKey = flag('market');
const market = marketKey ? findMarket(marketKey) : marketsByTier(1)[0];
if (!market) {
  console.error(`Unknown market "${marketKey}".`);
  process.exit(1);
}

console.log(`\nProbing ${trades.length} trade(s) in ${market.city}, ${market.state}. Nothing is written.\n`);

const { browser, page } = await openBrowser(HEADED);
const rows: { trade: string; found: number; kept: number; rejected: number; samples: string[]; dropped: string[] }[] = [];

try {
  for (const trade of trades) {
    const def = TRADE_DEFS[trade];
    let found: Awaited<ReturnType<typeof discoverMaps>> = [];
    try {
      found = await discoverMaps(page, market, trade, 2);
    } catch (err) {
      console.log(`  ${trade}: discovery threw (${err instanceof Error ? err.message : String(err)})`);
    }
    const kept = found.filter((c) => matchesTrade(c.business_name, trade));
    const dropped = found.filter((c) => !matchesTrade(c.business_name, trade));
    rows.push({
      trade: def.label,
      found: found.length,
      kept: kept.length,
      rejected: dropped.length,
      samples: kept.slice(0, 4).map((c) => c.business_name),
      dropped: dropped.slice(0, 3).map((c) => c.business_name),
    });
    console.log(
      `  ${def.label.padEnd(26)} found ${String(found.length).padStart(3)}   kept ${String(kept.length).padStart(3)}   filtered ${String(dropped.length).padStart(3)}`,
    );
  }
} finally {
  await browser.close();
}

console.log('\n──────────── what survived the filter ────────────');
for (const r of rows) {
  console.log(`\n${r.trade}  (${r.kept}/${r.found} kept)`);
  if (!r.samples.length) console.log('   NOTHING KEPT. Either the search terms are wrong or the filter is too tight.');
  for (const s of r.samples) console.log('   ✓', s);
  for (const s of r.dropped) console.log('   ✗', s, '  (filtered out)');
}

const empty = rows.filter((r) => r.kept === 0).map((r) => r.trade);
console.log(
  empty.length
    ? `\nTRADES THAT FOUND NOBODY: ${empty.join(', ')}. Fix these before queueing a run on them.\n`
    : '\nEvery trade probed found real businesses.\n',
);
