/**
 * ENV DOCTOR: find and repair a .env.local that a `vercel env pull` gutted.
 *
 *   npx tsx scripts/env-doctor.mts              # report, writes nothing
 *   npx tsx scripts/env-doctor.mts --repair     # fix, after backing up
 *
 * WHAT WENT WRONG, so nobody re-runs the thing that caused it.
 *
 * A variable marked Sensitive on Vercel cannot be read back. That is the whole
 * point of the flag. `vercel env pull` still writes a line for it, with the
 * literal text `[SENSITIVE]` where the value should be, and it overwrites the
 * real local value doing it. One pull turned most of this file into
 * placeholders and broke every local worker, while production carried on fine
 * because production never reads this file.
 *
 * So the fix can never be another pull. It is a merge from the copies that
 * were not pulled over, plus the providers that will still tell us the answer.
 *
 * SOURCES, in the order they are trusted:
 *
 *   1. A real value already in the target file. Never overwritten.
 *   2. A sibling worktree OF THE SAME REPO. Checked out separately, so a pull
 *      in one does not touch the others, which is why a good copy usually
 *      survives somewhere.
 *   3. `vercel env pull` into a scratch file, which does recover every
 *      NON-sensitive variable at its real value.
 *   4. The Supabase CLI, which will still hand over the project keys.
 *
 * Anything left after that is genuinely unrecoverable by machine and is
 * printed by name so a human can go and get it.
 *
 * SIBLINGS ARE LIMITED TO THIS REPO'S OWN WORKTREES, deliberately. The client
 * projects and Cross + Covenant each have their own Supabase project and their
 * own keys. Merging across them would put this studio's service key into a
 * client's repo, which is the one mistake in here that would actually matter.
 *
 * NO VALUE IS EVER PRINTED. Names, sources and verdicts only.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPAIR = process.argv.includes('--repair');
const TARGET = resolve(process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : '.env.local');

/** Values that mean "this line exists but carries nothing usable". */
const isBlank = (v: string): boolean => {
  const t = v.trim().replace(/^["']|["']$/g, '');
  return t === '' || t === '[SENSITIVE]' || t === 'undefined' || t === 'null';
};

type Env = Map<string, string>;

function parse(text: string): Env {
  const out: Map<string, string> = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    out.set(key, line.slice(eq + 1));
  }
  return out;
}

function read(path: string): Env {
  try {
    return parse(readFileSync(path, 'utf8'));
  } catch {
    return new Map();
  }
}

function sh(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: true });
  } catch {
    return '';
  }
}

/* ── 2. sibling worktrees of this repo, and nothing else ──────────────────── */

function siblingEnvs(): { path: string; env: Env }[] {
  const listed = sh('git', ['worktree', 'list', '--porcelain']);
  const dirs = [...listed.matchAll(/^worktree (.+)$/gm)].map((m) => m[1].trim());
  const out: { path: string; env: Env }[] = [];
  for (const dir of dirs) {
    const p = join(dir, '.env.local');
    if (resolve(p) === TARGET || !existsSync(p)) continue;
    const env = read(p);
    if (env.size) out.push({ path: p, env });
  }
  // Richest first: the copy with the most usable values is the best donor.
  const usable = (e: Env) => [...e.values()].filter((v) => !isBlank(v)).length;
  return out.sort((a, b) => usable(b.env) - usable(a.env));
}

/* ── 3. what Vercel will still give back (non-sensitive only) ─────────────── */

function vercelEnv(): Env {
  const scratch = resolve(`.env.doctor.${process.pid}.tmp`);
  try {
    sh('vercel', ['env', 'pull', JSON.stringify(scratch), '--environment', 'production', '--yes']);
    const env = read(scratch);
    return env;
  } finally {
    try {
      rmSync(scratch, { force: true });
    } catch {
      /* nothing to clean */
    }
  }
}

/* ── 4. Supabase, which still answers ─────────────────────────────────────── */

function supabaseEnv(): Env {
  const out: Env = new Map();
  let ref = '';
  try {
    ref = readFileSync(join('supabase', '.temp', 'project-ref'), 'utf8').trim();
  } catch {
    return out;
  }
  if (!ref) return out;
  const raw = sh('supabase', ['projects', 'api-keys', '--project-ref', ref]);
  if (!raw) return out;
  let keys: { api_key?: string; id?: string }[] = [];
  try {
    keys = (JSON.parse(raw.slice(raw.indexOf('{'))) as { keys?: typeof keys }).keys ?? [];
  } catch {
    return out;
  }
  const byId = (id: string) => keys.find((k) => k.id === id)?.api_key ?? '';
  const url = `https://${ref}.supabase.co`;
  const anon = byId('anon');
  const service = byId('service_role');
  if (url) {
    out.set('NEXT_PUBLIC_SUPABASE_URL', url);
    out.set('SUPABASE_URL', url);
  }
  if (anon) {
    out.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', anon);
    out.set('SUPABASE_ANON_KEY', anon);
  }
  if (service) out.set('SUPABASE_SERVICE_ROLE_KEY', service);
  return out;
}

/**
 * Names a production pull writes into the file that are NOT config.
 *
 * Vercel injects these into a BUILD. They describe the commit being deployed,
 * so on a laptop they are meaningless and there is nothing to restore. Left in
 * the report they pad the "broken" list with a dozen entries nobody can ever
 * fix, which is how a report stops being read.
 */
const BUILD_TIME_ONLY = (name: string): boolean =>
  /^VERCEL_GIT_/.test(name) ||
  ['VERCEL_URL', 'VERCEL_ENV', 'VERCEL_REGION', 'VERCEL_BRANCH_URL', 'VERCEL_DEPLOYMENT_ID', 'VERCEL_PROJECT_PRODUCTION_URL', 'CI', 'NOW_REGION'].includes(name);

/**
 * Offers that were switched off. Their variables are absent on purpose, and
 * saying so stops the next person hunting Stripe for prices that must never be
 * wired up again.
 */
const RETIRED: Record<string, string> = {
  STRIPE_PRICE_SIDEKICK_MONTHLY: 'Sidekick retired',
  STRIPE_PRICE_SIDEKICK_SETUP: 'Sidekick retired',
  STRIPE_PRICE_SIDEKICK_PRO_MONTHLY: 'Sidekick retired',
  STRIPE_PRICE_SIDEKICK_PRO_SETUP: 'Sidekick retired',
  STRIPE_PRICE_MUSTARD_CABINET: "Founders' Cabinet retired 2026-08-01",
};

/* ── the repair ───────────────────────────────────────────────────────────── */

function main() {
  if (!existsSync(TARGET)) {
    console.error(`No file at ${TARGET}`);
    process.exit(1);
  }

  const target = read(TARGET);
  const siblings = siblingEnvs();
  const vercel = vercelEnv();
  const supabase = supabaseEnv();

  console.log(`Target   ${TARGET}`);
  console.log(`Siblings ${siblings.length} worktree copies of this repo`);
  console.log(`Vercel   ${[...vercel.values()].filter((v) => !isBlank(v)).length} readable of ${vercel.size} production variables`);
  console.log(`Supabase ${supabase.size} project keys recovered\n`);

  // Every name anyone knows about, so a variable missing from the target
  // entirely is treated the same as one that was blanked.
  const names = new Set<string>([
    ...target.keys(),
    ...siblings.flatMap((s) => [...s.env.keys()]),
    ...vercel.keys(),
    ...supabase.keys(),
  ]);

  const fixed: { name: string; from: string }[] = [];
  const alreadyOk: string[] = [];
  const stillBroken: string[] = [];
  const merged: Env = new Map(target);

  for (const name of [...names].sort()) {
    const current = target.get(name);
    if (current !== undefined && !isBlank(current)) {
      alreadyOk.push(name);
      continue;
    }

    // Supabase and Vercel are authoritative and cheap; siblings fill the rest.
    let value = '';
    let from = '';
    if (supabase.has(name) && !isBlank(supabase.get(name)!)) {
      value = supabase.get(name)!;
      from = 'supabase cli';
    } else if (vercel.has(name) && !isBlank(vercel.get(name)!)) {
      value = vercel.get(name)!;
      from = 'vercel (non-sensitive)';
    } else {
      for (const s of siblings) {
        const v = s.env.get(name);
        if (v !== undefined && !isBlank(v)) {
          value = v;
          from = s.path.replace(/\\/g, '/').split('/').slice(-2)[0];
          break;
        }
      }
    }

    if (value) {
      merged.set(name, value);
      fixed.push({ name, from });
    } else {
      stillBroken.push(name);
    }
  }

  const buildOnly = stillBroken.filter(BUILD_TIME_ONLY);
  const retired = stillBroken.filter((n) => !BUILD_TIME_ONLY(n) && n in RETIRED);
  const realGaps = stillBroken.filter((n) => !BUILD_TIME_ONLY(n) && !(n in RETIRED));

  console.log(`${alreadyOk.length} already good`);
  console.log(`${fixed.length} recoverable`);
  for (const f of fixed) console.log(`   + ${f.name.padEnd(38)} from ${f.from}`);
  if (buildOnly.length) {
    console.log(`\n${buildOnly.length} injected by Vercel at build time. Meaningless locally, nothing to restore.`);
  }
  if (retired.length) {
    console.log(`\n${retired.length} belong to retired offers, absent on purpose:`);
    for (const n of retired) console.log(`   . ${n.padEnd(38)} ${RETIRED[n]}`);
  }
  if (realGaps.length) {
    console.log(`\n${realGaps.length} genuinely missing. Sensitive on Vercel and nowhere on this disk:`);
    for (const n of realGaps) console.log(`   ! ${n}`);
    console.log('\n   These have to come from the provider console or from Sarah.');
  }

  if (!REPAIR) {
    console.log('\nReport only. Re-run with --repair to write.');
    return;
  }
  if (!fixed.length) {
    console.log('\nNothing to write.');
    return;
  }

  const backup = `${TARGET}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  copyFileSync(TARGET, backup);

  // Rewrite in place: keep the original file's order, comments and spacing,
  // and only replace the lines whose value was blank. New names are appended
  // under a dated heading so it is obvious what this tool added.
  const original = readFileSync(TARGET, 'utf8');
  const seen = new Set<string>();
  const lines = original.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return raw;
    const eq = line.indexOf('=');
    if (eq < 1) return raw;
    const key = line.slice(0, eq).trim();
    if (!merged.has(key)) return raw;
    seen.add(key);
    const value = merged.get(key)!;
    return isBlank(line.slice(eq + 1)) && !isBlank(value) ? `${key}=${value}` : raw;
  });

  const added = fixed.filter((f) => !seen.has(f.name));
  if (added.length) {
    lines.push('', `# Restored by scripts/env-doctor.mts on ${new Date().toISOString().slice(0, 10)}`);
    for (const a of added) lines.push(`${a.name}=${merged.get(a.name)}`);
  }

  writeFileSync(TARGET, lines.join('\n'), 'utf8');
  console.log(`\nWrote ${TARGET}`);
  console.log(`Backup at ${backup}`);
}

main();
