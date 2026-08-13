/**
 * THE LEAD FINDER WORKER.
 *
 * Discovers HVAC, plumbing and roofing companies from public data, reads the
 * email off their own website, grades it, scores the business, deduplicates
 * against everything we have ever touched, and inserts what survives.
 *
 *   npx tsx scripts/acq-source.mts --hvac 200 --plumbing 150 --roofing 150
 *   npx tsx scripts/acq-source.mts --run <acq_sourcing_runs id>   # admin-started
 *   npx tsx scripts/acq-source.mts --watch                        # serve the queue
 *   npx tsx scripts/acq-source.mts --hvac 20 --dry                # research only
 *
 * It lives outside Vercel for the same reason the forge worker does: a run that
 * reads nine hundred websites takes far longer than a serverless invocation is
 * allowed to live. Progress is written to the run row every market, so the admin
 * screen shows real movement rather than a spinner.
 *
 * Politeness is deliberate: one Overpass call per market per trade, a small
 * concurrency pool against company websites, and a real User-Agent with a
 * contact address. We never bypass a protection, never solve a CAPTCHA, and
 * never fabricate an address to hit a number.
 */
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const {
  discoverOsmAllTrades,
  discoverFoursquare,
  scrapeBusiness,
  chooseBestEmail,
  assembleProspect,
  hostOf,
  sleep,
} = await import('../lib/acq/source');
const { marketsByTier, findMarket } = await import('../lib/acq/markets');
const { buildDedupeIndex, checkDuplicate, claim, keysFor } = await import('../lib/acq/dedupe');
const { CAMPAIGN_SLUG } = await import('../lib/acq/types');

type Trade = 'hvac' | 'plumbing' | 'roofing';

const argv = process.argv.slice(2);
const flag = (n: string): string | null => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? null : (argv[i + 1] ?? '');
};
const num = (n: string, d: number): number => {
  const v = flag(n);
  return v === null || v === '' ? d : Number(v);
};

const DRY = argv.includes('--dry');
const WATCH = argv.includes('--watch');
/** Google Maps is the primary discovery source; --no-maps falls back to OSM only. */
const USE_MAPS = !argv.includes('--no-maps');
const HEADED = argv.includes('--headed');
const RUN_ID_ARG = flag('run');
const TIER = Math.min(3, Math.max(1, num('tier', 3))) as 1 | 2 | 3;
const CONCURRENCY = num('concurrency', 6);
const WORKER = `${os.hostname()}:${process.pid}`;

const db: SupabaseClient = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/**
 * A run reads hundreds of small-business websites, and some of them close the
 * socket mid-response in ways Node's own HTTP parser asserts on. That assertion
 * is thrown from a socket event handler, outside every try/catch in this file,
 * and it killed a run at four hundred and seventeen leads on 2026-08-13.
 *
 * One dead server must not end the run. Parser-level crashes are logged and
 * swallowed; anything else is re-thrown, because a real bug should still be loud.
 */
process.on('uncaughtException', (err: Error & { code?: string }) => {
  const fromParser = err?.code === 'ERR_ASSERTION' && /undici|Parser|HTTPParser/i.test(err.stack ?? '');
  if (fromParser) {
    console.warn(`  ! a scraped host closed its socket badly (${err.message}); continuing`);
    return;
  }
  throw err;
});
process.on('unhandledRejection', (reason) => {
  console.warn(`  ! unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
});

/* ───────────────────────────── the run record ───────────────────────────── */

type Targets = Record<Trade, number>;

type Run = {
  id: string;
  params: { targets?: Targets; tier?: number; markets?: string[]; requireEmail?: boolean; minScore?: number; excludeChains?: boolean };
  target: number;
  searched: number;
  found: number;
  with_email: number;
  verified: number;
  duplicates: number;
  invalid: number;
  inserted: number;
  status: string;
};

async function loadOrCreateRun(): Promise<Run> {
  if (RUN_ID_ARG) {
    const { data, error } = await db.from('acq_sourcing_runs').select('*').eq('id', RUN_ID_ARG).single();
    if (error || !data) throw new Error(`No sourcing run ${RUN_ID_ARG}: ${error?.message}`);
    return data as Run;
  }
  const targets: Targets = {
    hvac: num('hvac', 200),
    plumbing: num('plumbing', 150),
    roofing: num('roofing', 150),
  };
  const total = targets.hvac + targets.plumbing + targets.roofing;
  const { data, error } = await db
    .from('acq_sourcing_runs')
    .insert({
      label: `${total} leads · ${targets.hvac} HVAC / ${targets.plumbing} plumbing / ${targets.roofing} roofing`,
      params: { targets, tier: TIER, requireEmail: !argv.includes('--allow-no-email'), minScore: num('min-score', 0) },
      target: total,
      status: 'running',
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Could not open a sourcing run: ${error?.message}`);
  return data as Run;
}

/** Next queued run, for --watch mode (the admin Find More Prospects button). */
async function nextQueuedRun(): Promise<Run | null> {
  const { data } = await db
    .from('acq_sourcing_runs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at')
    .limit(1);
  const run = (data ?? [])[0] as Run | undefined;
  if (!run) return null;
  const { data: claimed } = await db
    .from('acq_sourcing_runs')
    .update({ status: 'running', heartbeat_at: new Date().toISOString() })
    .eq('id', run.id)
    .eq('status', 'queued')
    .select('*')
    .single();
  return (claimed as Run) ?? null;
}

const counters = { searched: 0, found: 0, withEmail: 0, verified: 0, duplicates: 0, invalid: 0, inserted: 0 };
const logLines: { at: string; line: string }[] = [];

function log(line: string): void {
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`[${stamp}] ${line}`);
  logLines.push({ at: new Date().toISOString(), line });
  if (logLines.length > 300) logLines.splice(0, logLines.length - 300);
}

async function pushProgress(runId: string, market: string | null): Promise<void> {
  await db
    .from('acq_sourcing_runs')
    .update({
      searched: counters.searched,
      found: counters.found,
      with_email: counters.withEmail,
      verified: counters.verified,
      duplicates: counters.duplicates,
      invalid: counters.invalid,
      inserted: counters.inserted,
      current_market: market,
      log: logLines.slice(-80),
      heartbeat_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

/* ──────────────────────────────── the run ───────────────────────────────── */

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          await fn(items[idx]);
        } catch (err) {
          log(`  ! ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }),
  );
}

async function execute(run: Run): Promise<void> {
  const targets: Targets = run.params?.targets ?? { hvac: 200, plumbing: 150, roofing: 150 };
  const requireEmail = run.params?.requireEmail !== false;
  const minScore = Number(run.params?.minScore ?? 0);
  const tier = (run.params?.tier ?? TIER) as 1 | 2 | 3;

  const { data: campaign } = await db.from('acq_campaigns').select('id').eq('slug', CAMPAIGN_SLUG).maybeSingle();
  const campaignId = (campaign?.id as string) ?? null;

  log(`Building the dedupe index across every table we have ever touched...`);
  const index = await buildDedupeIndex(db);
  log(`  ${index.size} known businesses, ${index.suppressed.size} suppressed addresses.`);

  const markets = run.params?.markets?.length
    ? (run.params.markets.map((k) => findMarket(k)).filter(Boolean) as ReturnType<typeof marketsByTier>)
    : marketsByTier(tier);

  const banked: Record<Trade, number> = { hvac: 0, plumbing: 0, roofing: 0 };
  const trades: Trade[] = ['hvac', 'plumbing', 'roofing'];

  // One browser for the whole run, opened lazily so an OSM-only run never pays
  // for Chromium. Closed in the finally below whatever happens.
  let maps: Awaited<ReturnType<typeof import('./acq-maps').openBrowser>> | null = null;
  let discoverMaps: typeof import('./acq-maps').discoverMaps | null = null;
  if (USE_MAPS) {
    try {
      // Computed specifier on purpose: the runtime needs the .mts extension and
      // TypeScript refuses to see one in a literal import.
      const spec = './acq-maps.mts';
      const mod = (await import(spec)) as typeof import('./acq-maps');
      maps = await mod.openBrowser(HEADED);
      discoverMaps = mod.discoverMaps;
      log('Google Maps discovery is on (Chromium up).');
    } catch (err) {
      log(`! Maps discovery unavailable (${err instanceof Error ? err.message : String(err)}); OSM only.`);
    }
  }

  try {
  outer: for (const market of markets) {
    if (trades.every((t) => banked[t] >= targets[t])) break outer;

    // ONE Overpass call per market for all three trades. Ninety metro boxes at
    // roughly a minute each is an afternoon; two hundred and seventy is not.
    log(`── ${market.city}, ${market.state}`);
    await pushProgress(run.id, `${market.city}, ${market.state}`);
    const discovered = await discoverOsmAllTrades(market);

    for (const trade of trades) {
      if (banked[trade] >= targets[trade]) continue;

      const fromMaps = maps && discoverMaps ? await discoverMaps(maps.page, market, trade) : [];
      const fsq = await discoverFoursquare(market, trade);
      const candidates = [...fromMaps, ...discovered[trade], ...fsq];
      if (!candidates.length) continue;
      log(`   ${trade}: ${candidates.length} candidates (${fromMaps.length} Maps, ${discovered[trade].length} OSM, ${fsq.length} Foursquare)`);

      // Keep anything that could still yield an address: a website to read, or
      // an email the directory already publishes. A missing phone is not fatal
      // here, because their own site nearly always prints it and we are already
      // reading that page.
      const usable = candidates.filter((c) => c.website || c.email);
      counters.searched += candidates.length;

      // Drop the ones we already know before spending a single HTTP request on
      // them. This is what keeps a nine hundred site run finishing today.
      const fresh: typeof usable = [];
      for (const c of usable) {
        const keys = keysFor(c);
        const verdict = checkDuplicate(index, keys);
        if (verdict.duplicate) {
          counters.duplicates++;
          continue;
        }
        claim(index, keys);
        fresh.push(c);
      }
      log(`   ${fresh.length} new (${usable.length - fresh.length} already known, ${candidates.length - usable.length} with no website or listed email)`);

      const rows: Record<string, unknown>[] = [];

      await pool(fresh, CONCURRENCY, async (candidate) => {
        if (banked[trade] >= targets[trade]) return;
        const scrape = candidate.website ? await scrapeBusiness(candidate.website) : null;
        const siteHost = candidate.website ? hostOf(candidate.website) : null;
        // An address the directory itself publishes counts as publicly listed,
        // and ranks alongside whatever their own site prints.
        const found = [
          ...(candidate.email
            ? [{ address: candidate.email, via: 'mailto' as const, url: candidate.source_url ?? 'https://www.openstreetmap.org/' }]
            : []),
          ...(scrape?.emails ?? []),
        ];
        const best = await chooseBestEmail(found, siteHost);
        counters.found++;

        if (best) counters.withEmail++;
        if (best?.verdict.status === 'verified') counters.verified++;
        if (best?.verdict.status === 'invalid') counters.invalid++;

        const assembled = assembleProspect({ candidate, scrape, best, campaignId, runId: run.id });

        // No dialable number means the whole play cannot run: the email asks
        // them to be CALLED. Drop it rather than bank an unusable row.
        const phone = String(assembled.row.phone ?? '');
        if (phone.replace(/\D/g, '').length < 10) return;

        const mailable = best && ['verified', 'likely', 'public'].includes(best.verdict.status);
        if (requireEmail && !mailable) return;
        if (assembled.score < minScore) return;

        // The email, and a phone we only just read off their site, can each
        // collide with a business we already know under a different name. Only
        // the NEW facts are re-checked: the candidate's own name, domain and
        // directory phone were claimed in the pre-pass above, so testing those
        // again would match this candidate's own claim and reject everything.
        const keys = keysFor({
          business_name: candidate.business_name,
          city: candidate.city,
          state: candidate.state,
          website: candidate.website,
          phone,
          email: best?.address ?? null,
        });
        const blank = { name_key: null, domain_key: null, phone_digits: null, email_key: null };
        if (!candidate.phone && keys.phone_digits && checkDuplicate(index, { ...blank, phone_digits: keys.phone_digits }).duplicate) {
          counters.duplicates++;
          return;
        }
        if (keys.email_key && checkDuplicate(index, { ...blank, email_key: keys.email_key }).duplicate) {
          counters.duplicates++;
          return;
        }
        claim(index, keys);

        const { _siteHost, ...row } = assembled.row as Record<string, unknown> & { _siteHost?: unknown };
        void _siteHost;
        rows.push({ ...row, ...keys });
        banked[trade]++;
      });

      if (rows.length && !DRY) {
        const { error } = await db.from('outbound_leads').insert(rows);
        if (error) {
          log(`   ! insert failed: ${error.message}`);
          // Fall back to one at a time so a single bad row cannot lose the batch.
          for (const r of rows) {
            const { error: one } = await db.from('outbound_leads').insert(r);
            if (!one) counters.inserted++;
          }
        } else {
          counters.inserted += rows.length;
        }
      } else if (rows.length) {
        counters.inserted += rows.length;
      }

      log(`   ${trade}: banked ${rows.length} · totals hvac ${banked.hvac}/${targets.hvac}, plumbing ${banked.plumbing}/${targets.plumbing}, roofing ${banked.roofing}/${targets.roofing}`);
      await pushProgress(run.id, `${market.city}, ${market.state} · ${trade}`);
    }
    await sleep(800);
  }
  } finally {
    if (maps) await maps.browser.close().catch(() => {});
  }

  const done = trades.every((t) => banked[t] >= targets[t]);
  log(
    done
      ? `Targets met. ${counters.inserted} prospects inserted.`
      : `Markets exhausted at tier ${tier}. ${counters.inserted} inserted (hvac ${banked.hvac}, plumbing ${banked.plumbing}, roofing ${banked.roofing}).`,
  );

  await db
    .from('acq_sourcing_runs')
    .update({
      status: 'done',
      searched: counters.searched,
      found: counters.found,
      with_email: counters.withEmail,
      verified: counters.verified,
      duplicates: counters.duplicates,
      invalid: counters.invalid,
      inserted: counters.inserted,
      current_market: null,
      log: logLines.slice(-120),
      finished_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    })
    .eq('id', run.id);
}

/* ──────────────────────────────── entry ─────────────────────────────────── */

async function main(): Promise<void> {
  if (WATCH) {
    log(`Lead Finder watching for queued runs as ${WORKER}. Ctrl-C to stop.`);
    for (;;) {
      const run = await nextQueuedRun();
      if (run) {
        Object.keys(counters).forEach((k) => ((counters as Record<string, number>)[k] = 0));
        logLines.length = 0;
        try {
          await execute(run);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log(`RUN FAILED: ${msg}`);
          await db.from('acq_sourcing_runs').update({ status: 'failed', error: msg, finished_at: new Date().toISOString() }).eq('id', run.id);
        }
      }
      await sleep(15_000);
    }
  }

  const run = await loadOrCreateRun();
  log(`Sourcing run ${run.id}`);
  try {
    await execute(run);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`RUN FAILED: ${msg}`);
    await db.from('acq_sourcing_runs').update({ status: 'failed', error: msg, finished_at: new Date().toISOString() }).eq('id', run.id);
    process.exitCode = 1;
  }
}

await main();
