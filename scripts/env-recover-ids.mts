/**
 * RECOVER THE IDs THAT VERCEL WILL NOT GIVE BACK.
 *
 *   npx tsx scripts/env-recover-ids.mts            # report, writes nothing
 *   npx tsx scripts/env-recover-ids.mts --repair   # write into .env.local
 *
 * A Sensitive variable on Vercel cannot be read back, so when a `vercel env
 * pull` overwrote this machine's .env.local with `[SENSITIVE]` placeholders,
 * the values were gone from here for good. Most of them, though, are not
 * secrets at all: they are IDENTIFIERS. A Stripe price id, a Vapi assistant
 * id, a phone number id. Marked Sensitive out of caution, but every one of
 * them is still sitting in the provider that issued it, and every one can be
 * asked for again.
 *
 * This asks. It does not guess.
 *
 * THE STRIPE RULE, because getting it wrong charges somebody the wrong amount:
 * a price is only accepted when the product name matches the offer AND the
 * amount matches the `priceUsd` the code itself declares AND the billing
 * interval matches its cadence. Anything less than all three unanimous is
 * reported as ambiguous, with the candidates listed, and left for a human.
 *
 * No value is printed. Names, matched descriptions and verdicts only.
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { geoTiers } from '../data/geo';
import { launchTiers } from '../data/mustard-launch';
import { mustardLevels } from '../data/mustard-mode/offer';
import { picturesTiers } from '../data/pictures';
import { pressTiers } from '../data/press';
import { STUDIO_NUMBER, STUDIO_NUMBER_E164, CALLBACK_NUMBER, CALLBACK_NUMBER_E164 } from '../lib/vapi-lines';

const REPAIR = process.argv.includes('--repair');
const FILE = '.env.local';

/* ── what the code says each offer costs ──────────────────────────────────── */

type Offer = { env: string; priceUsd: number; cadence: string; name: string };

const offers: Offer[] = [
  ...geoTiers, ...launchTiers, ...mustardLevels, ...picturesTiers, ...pressTiers,
]
  .filter((t: { stripePriceEnv?: string | null }) => Boolean(t.stripePriceEnv))
  .map((t: { stripePriceEnv?: string | null; priceUsd?: number; cadence?: string; name?: string }) => ({
    env: String(t.stripePriceEnv),
    priceUsd: Number(t.priceUsd ?? 0),
    cadence: String(t.cadence ?? 'once'),
    name: String(t.name ?? ''),
  }));

/* ── current file ─────────────────────────────────────────────────────────── */

const isBlank = (v: string): boolean => {
  const t = v.trim().replace(/^["']|["']$/g, '');
  return t === '' || t === '[SENSITIVE]' || t === 'undefined' || t === 'null';
};

function currentEnv(): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of readFileSync(FILE, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    out.set(line.slice(0, eq).trim(), line.slice(eq + 1));
  }
  return out;
}

const env = currentEnv();
const needs = (k: string) => !env.has(k) || isBlank(env.get(k)!);

/* ── stripe ───────────────────────────────────────────────────────────────── */

type StripePrice = {
  id: string;
  active: boolean;
  unit_amount: number | null;
  recurring: { interval: string } | null;
  product: { name?: string } | string;
};

/** Loose token overlap: "GEO DESK The Watch Pro" vs "THE WATCH PRO". */
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['the', 'for', 'you', 'and', 'desk', 'mustard', 'mode'].includes(w)),
  );
}

function overlap(a: string, b: string): number {
  const [x, y] = [tokens(a), tokens(b)];
  if (!x.size || !y.size) return 0;
  let hit = 0;
  for (const t of x) if (y.has(t)) hit++;
  return hit / Math.min(x.size, y.size);
}

function stripePrices(): StripePrice[] {
  const raw = execFileSync(
    'stripe',
    ['prices', 'list', '--limit', '100', '--live', '-c', '--color', 'off', '--expand', 'data.product'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 },
  );
  return (JSON.parse(raw) as { data: StripePrice[] }).data.filter((p) => p.active);
}

/* ── vapi ─────────────────────────────────────────────────────────────────── */

async function vapi<T>(path: string, key: string): Promise<T | null> {
  try {
    const r = await fetch(`https://api.vapi.ai${path}`, { headers: { Authorization: `Bearer ${key}` } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/* ── our own client bundle ────────────────────────────────────────────────── */

/**
 * Everything the live site ships to a browser, concatenated.
 *
 * A NEXT_PUBLIC_ variable is compiled into this bundle and served to every
 * visitor, which is the whole meaning of the prefix. Reading one back off our
 * own site is recovery of something already published, not extraction of a
 * secret. Anything genuinely secret is not in here and cannot be.
 *
 * Fetched once and cached, because several lookups want it.
 */
let bundleCache: string | null = null;
async function clientBundle(): Promise<string> {
  if (bundleCache !== null) return bundleCache;
  const base = 'https://modernmustardseed.com';
  let html = '';
  for (const page of ['/', '/mustard', '/voice-agents']) {
    try {
      html += await (await fetch(base + page)).text();
    } catch {
      /* one page short is survivable */
    }
  }
  const chunks = [
    ...new Set([...html.matchAll(/["'](\/_next\/static\/[^"']+?\.js)(?:\?[^"']*)?["']/g)].map((m) => m[1])),
  ].slice(0, 60);
  let js = '';
  for (const c of chunks) {
    try {
      js += await (await fetch(base + c)).text();
    } catch {
      /* same */
    }
  }
  bundleCache = html + js;
  return bundleCache;
}

/* ── run ──────────────────────────────────────────────────────────────────── */

const found = new Map<string, string>();
const notes: string[] = [];

async function main() {
  /* Stripe price ids ------------------------------------------------------ */
  const wanted = offers.filter((o) => needs(o.env));
  if (wanted.length) {
    let prices: StripePrice[] = [];
    try {
      prices = stripePrices();
    } catch {
      notes.push('Stripe CLI could not list prices; skipped every STRIPE_PRICE_*.');
    }
    for (const offer of wanted) {
      const cents = Math.round(offer.priceUsd * 100);
      const wantInterval = offer.cadence === 'once' ? null : 'month';
      const candidates = prices.filter((p) => {
        const name = typeof p.product === 'string' ? '' : (p.product.name ?? '');
        const intervalOk = (p.recurring?.interval ?? null) === wantInterval;
        return intervalOk && p.unit_amount === cents && overlap(name, offer.name) >= 0.5;
      });
      if (candidates.length === 1) {
        const p = candidates[0];
        const name = typeof p.product === 'string' ? p.product : (p.product.name ?? '');
        found.set(offer.env, p.id);
        console.log(`  + ${offer.env.padEnd(36)} ${name} $${offer.priceUsd} ${offer.cadence}`);
      } else if (candidates.length === 0) {
        notes.push(`${offer.env}: no active Stripe price at $${offer.priceUsd} ${offer.cadence} matching "${offer.name}".`);
      } else {
        notes.push(
          `${offer.env}: ${candidates.length} prices match $${offer.priceUsd} ${offer.cadence} "${offer.name}". Ambiguous, left alone: ${candidates.map((c) => c.id).join(', ')}`,
        );
      }
    }
  }

  /* Vapi ids -------------------------------------------------------------- */
  const vapiKey = env.get('VAPI_API_KEY');
  if (vapiKey && !isBlank(vapiKey)) {
    const key = vapiKey.trim().replace(/^["']|["']$/g, '');
    const assistants = (await vapi<{ id: string; name?: string }[]>('/assistant?limit=100', key)) ?? [];
    const numbers =
      (await vapi<{ id: string; name?: string; number?: string; assistantId?: string }[]>('/phone-number?limit=100', key)) ?? [];

    const mustard = assistants.find((a) => /mr\.?\s*mustard/i.test(a.name ?? ''));
    for (const name of ['VAPI_MUSTARD_ASSISTANT_ID', 'NEXT_PUBLIC_VAPI_ASSISTANT_ID']) {
      if (needs(name) && mustard) {
        found.set(name, mustard.id);
        console.log(`  + ${name.padEnd(36)} Vapi assistant "${mustard.name}"`);
      }
    }

    // Three numbers are attached to Mr. Mustard, so "his number" is ambiguous.
    // It is not a judgement call though: lib/vapi-lines.ts names the published
    // studio line, and VAPI_PHONE_NUMBER_ID is that one specifically. Outbound
    // deliberately uses the imported Twilio line instead, via CALLBACK_NUMBER_ID.
    if (needs('VAPI_PHONE_NUMBER_ID')) {
      const studio = numbers.filter((n) => (n.number ?? '').replace(/[^0-9+]/g, '') === STUDIO_NUMBER_E164);
      if (studio.length === 1) {
        found.set('VAPI_PHONE_NUMBER_ID', studio[0].id);
        console.log(`  + ${'VAPI_PHONE_NUMBER_ID'.padEnd(36)} the studio line ${STUDIO_NUMBER}`);
      } else {
        notes.push(
          `VAPI_PHONE_NUMBER_ID: ${studio.length} Vapi numbers carry the studio line ${STUDIO_NUMBER}. Expected exactly one.`,
        );
      }
    }
    /* Twilio, from the number Vapi imported ------------------------------- */
    //
    // Vapi keeps the account SID against an imported carrier number and will
    // hand it back. It will NOT hand back the auth token, which is correct of
    // it, so that one still has to come from the Twilio console.
    //
    // Two Twilio accounts show up on imported numbers, so "the" SID looks
    // ambiguous. It is not: lib/vapi-lines.ts names the outbound line, and the
    // other import is Huck's old account, which was on a trial and is the
    // reason that first attempt failed. Match the number, not the count.
    if (needs('TWILIO_ACCOUNT_SID')) {
      const line = numbers.find(
        (n) => (n.number ?? '').replace(/[^0-9+]/g, '') === CALLBACK_NUMBER_E164,
      ) as { twilioAccountSid?: string } | undefined;
      if (line?.twilioAccountSid) {
        found.set('TWILIO_ACCOUNT_SID', line.twilioAccountSid);
        console.log(`  + ${'TWILIO_ACCOUNT_SID'.padEnd(36)} the account behind the outbound line ${CALLBACK_NUMBER}`);
      } else {
        notes.push(`TWILIO_ACCOUNT_SID: the outbound line ${CALLBACK_NUMBER} is not an imported Twilio number in Vapi.`);
      }
    }

    /* The two NEXT_PUBLIC_ Vapi values ------------------------------------ */
    //
    // NEXT_PUBLIC_ means the value is compiled into the client bundle and
    // served to every visitor. It is already public, so reading it back off
    // our own site is recovery, not extraction.
    //
    // The bundle carries exactly two uuids. One is the assistant id, which we
    // resolved above from the Vapi API. The public key is the other one, and
    // it is confirmed as a public key by NOT being any assistant or number id
    // on the account. If that leaves anything other than one candidate, it is
    // reported rather than guessed.
    if (needs('NEXT_PUBLIC_VAPI_PUBLIC_KEY')) {
      const bundle = await clientBundle();
      const uuids = [...new Set([...bundle.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g)].map((m) => m[0]))];
      const known = new Set<string>([...assistants.map((a) => a.id), ...numbers.map((n) => n.id)]);
      const candidates = uuids.filter((u) => !known.has(u));
      if (candidates.length === 1) {
        found.set('NEXT_PUBLIC_VAPI_PUBLIC_KEY', candidates[0]);
        console.log(`  + ${'NEXT_PUBLIC_VAPI_PUBLIC_KEY'.padEnd(36)} the one bundle uuid that is not an assistant or number id`);
      } else {
        notes.push(`NEXT_PUBLIC_VAPI_PUBLIC_KEY: ${candidates.length} candidates in the client bundle. Expected exactly one.`);
      }
    }
  } else {
    notes.push('VAPI_API_KEY is missing locally, so no Vapi id could be recovered.');
  }

  /* Google Analytics, also already public ---------------------------------- */
  if (needs('NEXT_PUBLIC_GA4_ID')) {
    const ids = [...new Set([...(await clientBundle()).matchAll(/G-[A-Z0-9]{8,12}/g)].map((m) => m[0]))];
    if (ids.length === 1) {
      found.set('NEXT_PUBLIC_GA4_ID', ids[0]);
      console.log(`  + ${'NEXT_PUBLIC_GA4_ID'.padEnd(36)} read off our own live bundle`);
    } else {
      notes.push(`NEXT_PUBLIC_GA4_ID: ${ids.length} measurement ids in the bundle. Expected exactly one.`);
    }
  }

  /* Vercel org id, sitting unencrypted in the repo -------------------------- */
  if (needs('VERCEL_TEAM_ID')) {
    try {
      const orgId = (JSON.parse(readFileSync('.vercel/project.json', 'utf8')) as { orgId?: string }).orgId;
      if (orgId) {
        found.set('VERCEL_TEAM_ID', orgId);
        console.log(`  + ${'VERCEL_TEAM_ID'.padEnd(36)} from .vercel/project.json`);
      }
    } catch {
      notes.push('VERCEL_TEAM_ID: no .vercel/project.json to read it from.');
    }
  }

  /* Retired offers: absent on purpose, not broken --------------------------- */
  //
  // Naming these matters. Left unexplained they look like five more variables
  // somebody forgot to restore, and the next person to notice will go hunting
  // in Stripe for prices that should never be wired up again.
  const RETIRED: Record<string, string> = {
    STRIPE_PRICE_SIDEKICK_MONTHLY: 'Sidekick was retired; data/sidekick.ts says these are read nowhere.',
    STRIPE_PRICE_SIDEKICK_SETUP: 'Sidekick was retired; data/sidekick.ts says these are read nowhere.',
    STRIPE_PRICE_SIDEKICK_PRO_MONTHLY: 'Sidekick was retired; data/sidekick.ts says these are read nowhere.',
    STRIPE_PRICE_SIDEKICK_PRO_SETUP: 'Sidekick was retired; data/sidekick.ts says these are read nowhere.',
    STRIPE_PRICE_MUSTARD_CABINET: "The Founders' Cabinet was retired 2026-08-01; existing subscribers keep their entitlement.",
  };
  const retiredAndMissing = Object.keys(RETIRED).filter((k) => needs(k));
  if (retiredAndMissing.length) {
    console.log(`
${retiredAndMissing.length} missing on purpose, because the offer is retired:`);
    for (const k of retiredAndMissing) console.log(`    ${k.padEnd(36)} ${RETIRED[k]}`);
  }

  /* Report and write ------------------------------------------------------ */
  console.log(`\n${found.size} identifiers recovered.`);
  if (notes.length) {
    console.log('\nLeft alone:');
    for (const n of notes) console.log(`  ! ${n}`);
  }

  if (!REPAIR) {
    console.log('\nReport only. Re-run with --repair to write.');
    return;
  }
  if (!found.size) return;

  const backup = `${FILE}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  copyFileSync(FILE, backup);

  const seen = new Set<string>();
  const lines = readFileSync(FILE, 'utf8')
    .split(/\r?\n/)
    .map((raw) => {
      const line = raw.trim();
      const eq = line.indexOf('=');
      if (!line || line.startsWith('#') || eq < 1) return raw;
      const key = line.slice(0, eq).trim();
      if (!found.has(key)) return raw;
      seen.add(key);
      return `${key}=${found.get(key)}`;
    });
  const added = [...found.keys()].filter((k) => !seen.has(k));
  if (added.length) {
    lines.push('', `# Recovered from the issuing provider by scripts/env-recover-ids.mts on ${new Date().toISOString().slice(0, 10)}`);
    for (const k of added) lines.push(`${k}=${found.get(k)}`);
  }
  writeFileSync(FILE, lines.join('\n'), 'utf8');
  console.log(`\nWrote ${FILE}`);
  console.log(`Backup at ${backup}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
