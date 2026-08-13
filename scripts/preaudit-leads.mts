/**
 * PRE-AUDIT THE FLOOR. Every outbound lead with a website, scored before a rep
 * ever opens it, so the cockpit leads every call with real findings.
 *
 * Why this exists next to scripts/audit-all.mjs: that one drives the DEPLOYED
 * https route, logs in as Polly, and targets `rep_prospects`. Three problems for
 * bulk. It burns Vercel function time, it inherits the route's 120s ceiling on a
 * call that measures ~55s and is getting slower, and it audits the wrong table:
 * the floor lives in `outbound_leads` and had 3,140 unaudited sites on
 * 2026-07-29. This runs the engine IN PROCESS against Supabase directly, so
 * there is no HTTP timeout, no login, and no serverless bill.
 *
 *   npx tsx scripts/preaudit-leads.mts                    # 25 leads, a proof run
 *   npx tsx scripts/preaudit-leads.mts --all              # the whole floor
 *   npx tsx scripts/preaudit-leads.mts --limit 500 --concurrency 10
 *   npx tsx scripts/preaudit-leads.mts --all --model claude-sonnet-5
 *   npx tsx scripts/preaudit-leads.mts --retry-failed     # re-run past failures
 *
 * Resumable by construction: it only ever selects leads with no audit_score, so
 * a killed run is restarted by running it again. Nothing is recomputed.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const flag = (name: string): string | null => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : (argv[i + 1] ?? '');
};
const has = (name: string) => argv.includes(`--${name}`);

const ALL = has('all');
const RETRY_FAILED = has('retry-failed');
const LIMIT = ALL ? Number.MAX_SAFE_INTEGER : Number(flag('limit') || 25);
/**
 * Eight at once, not three. The old script used 3 to "respect rate limits", which
 * on 3,140 leads at ~55s each is more than sixteen hours of wall clock. The
 * engine now walks a model ladder and backs off on its own, so the throttle
 * belongs there rather than in an arbitrarily small pool. Drop this if the
 * account starts returning sustained 429s.
 */
/**
 * WHICH ENGINE PAYS FOR THIS RUN.
 *
 * `--engine claude-code` grades every lead through the local Claude Code CLI on
 * the Max subscription instead of the metered API, which takes a floor-sized
 * sweep from several hundred dollars to zero. It is slower and it needs this
 * machine awake, so it belongs on batch work like this one and never on a
 * customer-facing request.
 *
 * Concurrency drops with it, and not by preference. Eight simultaneous API
 * calls are nothing; eight headless Claude processes are a few GB of RAM and
 * the reason the forge OOM-killed a build at 0.9GB free. `lib/claude-code-json`
 * enforces its own ceiling regardless, this just keeps the log honest.
 */
// There is one engine now and it is the subscription, so `--engine` and the
// AUDIT_ENGINE variable are gone. `--model` still works and takes a CLI alias
// ('opus', 'sonnet') rather than a full model id.
const CONCURRENCY = Number(flag('concurrency') || 2);
if (flag('model')) process.env.AUDIT_CLI_MODEL = flag('model')!;

// Priced per million tokens. Only used to report what a run cost, never to gate
// anything, so a stale number here is a reporting bug and not a spend bug.
const PRICE: Record<string, { in: number; cached: number; out: number }> = {
  'claude-opus-5': { in: 15, cached: 1.5, out: 75 },
  'claude-sonnet-5': { in: 3, cached: 0.3, out: 15 },
};

const sb = createClient(process.env.supabase_url!, process.env.supabase_service_role_key!, {
  auth: { persistSession: false },
});

const { runWebsiteAudit } = await import('../lib/website-audit.ts');

type Lead = { id: string; business_name: string | null; website: string | null };

/**
 * A lead whose site 404s or whose domain is dead will fail every single time, and
 * on a floor this size retrying them forever is most of the cost. A failure is
 * stamped into audit_json so the next run skips it, and --retry-failed is the
 * deliberate way back in.
 */
const FAILED_MARK = 'preaudit_failed';

let query = sb
  .from('outbound_leads')
  .select('id, business_name, website')
  .not('website', 'is', null)
  .is('audit_score', null)
  .order('created_at', { ascending: true });
// A normal run skips anything already stamped as failed. --retry-failed does the
// OPPOSITE: it targets exactly those rows. Dropping the filter entirely (the first
// version) just re-audited the oldest unaudited leads and left the failures alone,
// which looks like a working retry and is not one.
query = RETRY_FAILED ? query.not('audit_json', 'is', null) : query.is('audit_json', null);

const { data, error } = await query.limit(Math.min(LIMIT, 5000));
if (error) {
  console.error('could not read leads:', error.message);
  process.exit(1);
}
const leads = (data ?? []) as Lead[];

if (!leads.length) {
  console.log('Nothing to audit. Every lead with a website already has a score.');
  process.exit(0);
}

console.log(
  `pre-auditing ${leads.length} lead(s) | concurrency ${CONCURRENCY} | engine ${ENGINE}` +
    (FREE_ENGINE
      ? ` (local subscription, $0)`
      : ` | models ${process.env.AUDIT_MODELS || 'claude-opus-5,claude-sonnet-5'}`),
);
if (!ALL && leads.length >= LIMIT) console.log(`(this is a capped run. --all does the whole floor.)`);

const started = Date.now();
let done = 0;
let ok = 0;
let failed = 0;
let skipped = 0;
let spend = 0;
const byModel = new Map<string, number>();

async function auditOne(lead: Lead) {
  try {
    const r = await runWebsiteAudit(lead.website!);
    if (r.ok) {
      if (r.usage) {
        const p = PRICE[r.usage.model];
        if (p) {
          spend +=
            (r.usage.input * p.in + r.usage.cache_read * p.cached + r.usage.output * p.out) / 1_000_000;
        }
        byModel.set(r.usage.model, (byModel.get(r.usage.model) ?? 0) + 1);
      }
      const { error: upErr } = await sb
        .from('outbound_leads')
        .update({
          audit_url: r.url,
          audit_score: Math.round(r.report.overall_score),
          audit_json: r.report,
          audit_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
      if (upErr) throw new Error(`db: ${upErr.message}`);
      ok += 1;
    } else if (r.status === 503) {
      /**
       * 503 means OUR side broke, not theirs: a dry API wallet, or the local
       * engine holding off because the machine ran out of memory. Stamping that
       * onto the lead would mark a perfectly good prospect as permanently
       * unauditable because a laptop was busy for ninety seconds, and since a
       * stamped lead is skipped by every future run, nothing would ever
       * reconsider it. Leave the row untouched so the next run picks it up.
       */
      skipped += 1;
      if (skipped <= 3) console.log(`  ~ ${lead.business_name}: engine unavailable, leaving for the next run (${r.error})`);
    } else {
      // A real verdict on a real site (dead domain, 404, unreachable). Stamp it
      // so the next run does not pay for it again.
      await sb
        .from('outbound_leads')
        .update({ audit_json: { [FAILED_MARK]: true, status: r.status, error: r.error, at: new Date().toISOString() } })
        .eq('id', lead.id);
      failed += 1;
    }
  } catch (e) {
    failed += 1;
    console.log(`  ! ${lead.business_name}: ${(e as Error).message?.slice(0, 120)}`);
  }
  done += 1;
  if (done % 10 === 0 || done === leads.length) {
    const elapsed = (Date.now() - started) / 1000;
    const rate = done / elapsed;
    const left = Math.round((leads.length - done) / rate / 60);
    console.log(
      `  ${done}/${leads.length} | ok ${ok} | failed ${failed}${skipped ? ` | skipped ${skipped}` : ''} | $${spend.toFixed(2)} | ~${left}m left`,
    );
  }
}

let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < leads.length) await auditOne(leads[cursor++]);
  }),
);

const mins = Math.round((Date.now() - started) / 60000);
console.log(`\nDONE. audited ${ok} | failed ${failed} | ${mins}m | $${spend.toFixed(2)}`);
// Called out separately because it is the one number that means "run me again".
if (skipped) console.log(`  ${skipped} left unstamped (engine unavailable). Re-run to pick them up.`);
for (const [m, n] of byModel) console.log(`  ${m}: ${n}`);
if (ok) console.log(`  per lead: $${(spend / ok).toFixed(3)}`);
