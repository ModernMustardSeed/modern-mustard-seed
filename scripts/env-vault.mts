/**
 * THE VAULT: one readable master copy of the secrets Vercel will not give back.
 *
 *   npm run vault:edit      open it in Notepad, re-encrypt on close
 *   npm run vault:unlock    fan it out into .env.local in every worktree
 *   npm run vault:status    what it holds, by name, and what is still missing
 *   npm run vault:push NAME set one value into Vercel production from the vault
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 *
 * Vercel production is the source of truth for what production runs, and it is
 * a fine one. It is a terrible BACKUP, because a variable marked Sensitive
 * cannot be read back. Ever. By anyone. That is the point of the flag.
 *
 * So when a pull wrote `[SENSITIVE]` over this machine's .env.local, twenty
 * values were simply gone from this disk, with production still humming along
 * unaware. There was no second copy anywhere. That is the actual bug, and no
 * amount of care with the pull command fixes it: the missing thing was a
 * readable master.
 *
 * This is that master. It lives OUTSIDE every repository, so no git operation,
 * no environment pull and no worktree checkout can reach it, and it is
 * encrypted at rest so a plaintext file of live credentials is never sitting on
 * a laptop.
 *
 * ── WHERE, EXACTLY ───────────────────────────────────────────────────────────
 *
 *   %USERPROFILE%\.mms-vault\secrets.env.gpg
 *
 * Not in dev\mms. Not in a worktree. Not on the Desktop. One directory, one
 * encrypted file, and that file is the thing worth backing up to a password
 * manager or a drive: if it survives, everything else can be rebuilt from it.
 *
 * ── THE ONE RULE ─────────────────────────────────────────────────────────────
 *
 * Plaintext exists only while Notepad is open, in a temp file this deletes and
 * overwrites on close. If the process is killed mid-edit, `vault:status` says
 * so and names the stray file. No value is ever printed to a terminal.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const VAULT_DIR = join(homedir(), '.mms-vault');
const VAULT = join(VAULT_DIR, 'secrets.env.gpg');
const STAGING = join(VAULT_DIR, 'UNLOCKED-secrets.env');

const cmd = (process.argv[2] ?? 'status').replace(/^-+/, '');

/**
 * What belongs in here: the values no machine can recover, split by whether a
 * local worker actually reads them. Nine of the twenty run only on Vercel and
 * are never read on a laptop, so putting them in is optional and leaving them
 * out breaks nothing locally.
 */
const NEEDED_LOCALLY: Record<string, string> = {
  TWILIO_AUTH_TOKEN: 'scripts/a2p-*.mjs',
  TWILIO_MESSAGING_SERVICE_SID: 'scripts/a2p-*.mjs, acq-rehearsal',
  ZOHO_IMAP_USER: 'scripts/zoho-health.mjs',
  ZOHO_IMAP_PASSWORD: 'scripts/zoho-health.mjs',
  MAILBOXES: 'scripts/zoho-health.mjs',
  FAL_KEY: 'codex-image, fix-svg-heroes, forge-fallback',
  FOURSQUARE_API_KEY: 'source-leads, enrich-prospects',
  CREDENTIALS_SECRET: 'scripts/factory-smoke.mts',
  VAPI_WEBHOOK_SECRET: 'acq-rehearsal, setup-vapi-mustard',
  FORGE_NOTIFY_SECRET: 'scripts/demo-site-worker.mjs',
  ADMIN_TEAM: 'acq-login-check, verify-staff-mute',
};

const SERVER_ONLY = [
  'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET', 'TWILIO_SMS_FROM', 'ZOHO_IMAP_HOST',
  'VERCEL_TOKEN', 'CRON_SECRET', 'CALENDAR_FEED_TOKEN', 'BOOTH_CODE', 'INDEXNOW_KEY',
];

const isBlank = (v: string): boolean => {
  const t = v.trim().replace(/^["']|["']$/g, '');
  return t === '' || t === '[SENSITIVE]' || t.startsWith('<') || t === 'undefined' || t === 'null';
};

function parse(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    out.set(line.slice(0, eq).trim(), line.slice(eq + 1));
  }
  return out;
}

/** Overwrite before unlinking, so the bytes are not left in free space. */
function shred(path: string): void {
  try {
    if (!existsSync(path)) return;
    const size = statSync(path).size;
    writeFileSync(path, Buffer.alloc(size, 0));
    rmSync(path, { force: true });
  } catch {
    try { rmSync(path, { force: true }); } catch { /* nothing more to try */ }
  }
}

function gpg(args: string[], input?: string): string {
  const r = spawnSync('gpg', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
  if (r.status !== 0) throw new Error(`gpg exited ${r.status}`);
  return r.stdout;
}

/** The template a first-time vault starts from, so nothing has to be remembered. */
function template(): string {
  const lines = [
    '# THE MMS SECRET VAULT',
    '#',
    '# Fill in a value after the "=". Delete nothing: a name left blank is simply',
    '# reported as still missing. Save and close Notepad and this re-encrypts',
    '# itself, then shreds the plaintext.',
    '#',
    '# These are the values Vercel cannot hand back, so this file is the only',
    '# readable copy. Back up %USERPROFILE%\\.mms-vault\\secrets.env.gpg somewhere',
    '# durable: if it survives, every .env.local can be rebuilt from it.',
    '',
    '# ── read by local scripts, so these are the ones that matter here ──',
  ];
  for (const [name, who] of Object.entries(NEEDED_LOCALLY)) lines.push(`${name}=          # ${who}`);
  lines.push('', '# ── production only. Nothing local reads these, so filling them in is', '#    purely so a readable copy exists somewhere. Optional. ──');
  for (const name of SERVER_ONLY) lines.push(`${name}=`);
  lines.push('');
  return lines.join('\r\n');
}

function readVault(): Map<string, string> {
  if (!existsSync(VAULT)) return new Map();
  return parse(gpg(['--quiet', '--batch', '--decrypt', VAULT]));
}

/* ── commands ─────────────────────────────────────────────────────────────── */

function edit(): void {
  mkdirSync(VAULT_DIR, { recursive: true });
  if (existsSync(STAGING)) {
    console.error(`A previous edit left plaintext at:\n  ${STAGING}\nOpen it, finish or discard it, then run vault:edit again.`);
    process.exit(1);
  }
  const body = existsSync(VAULT) ? gpg(['--quiet', '--batch', '--decrypt', VAULT]) : template();
  writeFileSync(STAGING, body, 'utf8');

  console.log('Notepad is open. Fill in what you have, then SAVE and CLOSE it.');
  console.log('gpg will then ask for a passphrase to encrypt with.\n');
  spawnSync('notepad.exe', [STAGING], { stdio: 'inherit' });

  const edited = readFileSync(STAGING, 'utf8');
  const filled = [...parse(edited).entries()].filter(([, v]) => !isBlank(v));
  if (!filled.length) {
    shred(STAGING);
    console.log('Nothing filled in. Vault unchanged.');
    return;
  }

  try {
    rmSync(VAULT, { force: true });
    gpg(['--quiet', '--batch', '--yes', '--symmetric', '--cipher-algo', 'AES256', '--output', VAULT, STAGING]);
  } finally {
    shred(STAGING);
  }
  console.log(`\nVault holds ${filled.length} values.`);
  console.log(`  ${VAULT}`);
  console.log('Plaintext shredded. Run `npm run vault:unlock` to push them into every worktree.');
}

function worktrees(): string[] {
  try {
    const listed = execFileSync('git', ['worktree', 'list', '--porcelain'], { encoding: 'utf8' });
    return [...listed.matchAll(/^worktree (.+)$/gm)].map((m) => m[1].trim());
  } catch {
    return [process.cwd()];
  }
}

function unlock(): void {
  const vault = readVault();
  const usable = [...vault.entries()].filter(([, v]) => !isBlank(v));
  if (!usable.length) {
    console.log('Vault is empty. Run `npm run vault:edit` first.');
    return;
  }

  for (const dir of worktrees()) {
    const target = join(dir, '.env.local');
    if (!existsSync(target)) continue;
    const current = parse(readFileSync(target, 'utf8'));

    // Never overwrite a value that already works. The vault fills gaps; it does
    // not get to argue with a file that is already correct.
    const toWrite = usable.filter(([k]) => !current.has(k) || isBlank(current.get(k)!));
    if (!toWrite.length) {
      console.log(`${dir.split(/[\\/]/).pop()}: nothing to fill`);
      continue;
    }

    const seen = new Set<string>();
    const lines = readFileSync(target, 'utf8').split(/\r?\n/).map((raw) => {
      const line = raw.trim();
      const eq = line.indexOf('=');
      if (!line || line.startsWith('#') || eq < 1) return raw;
      const key = line.slice(0, eq).trim();
      const hit = toWrite.find(([k]) => k === key);
      if (!hit) return raw;
      seen.add(key);
      return `${key}=${hit[1]}`;
    });
    const appended = toWrite.filter(([k]) => !seen.has(k));
    if (appended.length) {
      lines.push('', `# From the vault, ${new Date().toISOString().slice(0, 10)}`);
      for (const [k, v] of appended) lines.push(`${k}=${v}`);
    }
    writeFileSync(target, lines.join('\n'), 'utf8');
    console.log(`${dir.split(/[\\/]/).pop()}: filled ${toWrite.length}`);
  }
}

function status(): void {
  if (existsSync(STAGING)) {
    console.log(`⚠  Plaintext left behind by an interrupted edit:\n   ${STAGING}\n`);
  }
  if (!existsSync(VAULT)) {
    console.log('No vault yet. Run `npm run vault:edit` to create one.');
    console.log(`It will live at ${VAULT}`);
    return;
  }
  const vault = readVault();
  const has = (k: string) => vault.has(k) && !isBlank(vault.get(k)!);

  const localMissing = Object.keys(NEEDED_LOCALLY).filter((k) => !has(k));
  const serverMissing = SERVER_ONLY.filter((k) => !has(k));

  console.log(`Vault: ${VAULT}`);
  console.log(`${[...vault.values()].filter((v) => !isBlank(v)).length} values held\n`);
  if (localMissing.length) {
    console.log(`${localMissing.length} still missing that local scripts read:`);
    for (const k of localMissing) console.log(`   ! ${k.padEnd(30)} ${NEEDED_LOCALLY[k]}`);
  } else {
    console.log('Every locally-read secret is present.');
  }
  if (serverMissing.length) {
    console.log(`\n${serverMissing.length} missing that only production reads. Nothing local breaks without them:`);
    for (const k of serverMissing) console.log(`   . ${k}`);
  }
}

/** Set one value into Vercel production, straight from the vault. */
function push(name: string): void {
  if (!name) {
    console.error('Which one? e.g. npm run vault:push -- CRON_SECRET');
    process.exit(1);
  }
  const vault = readVault();
  const value = vault.get(name);
  if (!value || isBlank(value)) {
    console.error(`${name} is not in the vault.`);
    process.exit(1);
  }
  // Through the BOM-safe setter: a PowerShell pipe into the Vercel CLI prepends
  // a byte order mark, and a Sensitive value with a BOM never matches anything.
  const r = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/vercel-env-set.ps1', '-Name', name, '-Value', value, '-Sensitive'],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log(`\n${name} set in production. It needs a redeploy to take effect:`);
  console.log('  vercel redeploy <current production url> --target production');
}

switch (cmd) {
  case 'edit': edit(); break;
  case 'unlock': unlock(); break;
  case 'push': push(process.argv[3] ?? ''); break;
  default: status();
}
