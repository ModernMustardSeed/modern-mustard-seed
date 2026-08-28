/**
 * THE VAULT: one readable master copy of the secrets Vercel will not hand back.
 *
 *   npm run vault:edit      open it in Notepad, re-encrypt on close
 *   npm run vault:unlock    fan it out into .env.local in every worktree
 *   npm run vault:status    what it holds, by name, and what is still missing
 *   npm run vault:push NAME set one value into Vercel production from the vault
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 *
 * Vercel production is the source of truth for what production runs, and a fine
 * one. It is a terrible BACKUP, because a variable marked Sensitive cannot be
 * read back. Ever, by anyone. That is the point of the flag.
 *
 * So when a pull wrote `[SENSITIVE]` over this machine's .env.local, twenty
 * values were simply gone from the disk while production hummed along unaware.
 * There was no second copy anywhere. That is the actual bug, and no amount of
 * care with the pull command fixes it: what was missing was a readable master.
 *
 * ── WHERE, EXACTLY ───────────────────────────────────────────────────────────
 *
 *   %USERPROFILE%\.mms-vault\secrets.env.gpg
 *
 * Not in dev\mms. Not in a worktree. Not on the Desktop. One directory, one
 * encrypted file, and that file is the thing worth backing up to a password
 * manager or a drive: if it survives, everything else can be rebuilt from it.
 *
 * ── PASSPHRASES, AND WHY NOT --batch ─────────────────────────────────────────
 *
 * gpg's `--batch` means "never prompt for anything", so pairing it with
 * symmetric encryption asks gpg to encrypt with a passphrase it is forbidden to
 * obtain. It does not warn. It reports "cancelled by user" and writes no file,
 * which reads like the user cancelled something rather than like a broken
 * command. The first version of this had exactly that bug.
 *
 * So the passphrase is read here, on the terminal, with the characters hidden,
 * and handed to gpg on stdin under `--pinentry-mode loopback`. That works with
 * no TTY-owning pinentry, no GUI dialog and no agent configuration.
 *
 * A REAL TERMINAL IS REQUIRED, and that is deliberate. If stdin is not a TTY
 * there is nobody to type a passphrase, and the honest response is to say so
 * rather than to hang or to invent one.
 *
 * On first creation the passphrase is asked for twice. A typo there does not
 * produce an error, it produces a vault that will never open again, which is
 * the same disaster this file exists to prevent.
 *
 * No value is ever printed to a terminal.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const VAULT_DIR = join(homedir(), '.mms-vault');
const VAULT = join(VAULT_DIR, 'secrets.env.gpg');
const STAGING = join(VAULT_DIR, 'UNLOCKED-secrets.env');

const cmd = (process.argv[2] ?? 'status').replace(/^-+/, '');

/**
 * What belongs in here: the values no machine can recover, split by whether a
 * local worker actually reads them. Nine of the twenty run only on Vercel and
 * are never read on a laptop, so filling those in is optional and leaving them
 * out breaks nothing locally.
 */
const NEEDED_LOCALLY: Record<string, string> = {
  TWILIO_AUTH_TOKEN: 'scripts/a2p-*.mjs',
  TWILIO_MESSAGING_SERVICE_SID: 'scripts/a2p-*.mjs, acq-rehearsal',
  ZOHO_IMAP_USER: 'scripts/zoho-health.mjs',
  ZOHO_IMAP_PASSWORD: 'scripts/zoho-health.mjs',
  MAILBOXES: 'scripts/zoho-health.mjs',
  FAL_KEY: 'codex-image, fix-svg-heroes, build-fallback',
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

/** Overwrite before unlinking, so the bytes are not left sitting in free space. */
function shred(path: string): void {
  try {
    if (!existsSync(path)) return;
    writeFileSync(path, Buffer.alloc(statSync(path).size, 0));
    rmSync(path, { force: true });
  } catch {
    try { rmSync(path, { force: true }); } catch { /* nothing more to try */ }
  }
}

/* ── the passphrase ───────────────────────────────────────────────────────── */

/** Read a line from the terminal without echoing it. Requires a real TTY. */
function askHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(
        new Error(
          'This needs a real terminal to type a passphrase into.\n' +
            'Run it yourself in PowerShell:\n' +
            '  cd $env:USERPROFILE\\dev\\mms\\worktrees\\acquisition\n' +
            `  npm run vault:${cmd}`,
        ),
      );
      return;
    }
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buf = '';
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(buf);
          return;
        }
        if (c === '\u0003') {
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          process.exit(130);
        }
        if (c === '\u007f' || c === '\b') {
          buf = buf.slice(0, -1);
          continue;
        }
        buf += c;
      }
    };
    stdin.on('data', onData);
  });
}

async function passphraseFor(creating: boolean): Promise<string> {
  const first = await askHidden(creating ? 'Choose a passphrase for the vault: ' : 'Vault passphrase: ');
  if (!first) throw new Error('Empty passphrase. Nothing done.');
  if (!creating) return first;
  // A typo here does not error, it produces a vault that never opens again.
  const again = await askHidden('Type it again: ');
  if (first !== again) throw new Error('They do not match. Nothing written.');
  if (first.length < 8) throw new Error('Use at least 8 characters. Nothing written.');
  return first;
}

function gpgLoopback(args: string[], passphrase: string): string {
  const r = spawnSync('gpg', ['--quiet', '--batch', '--yes', '--pinentry-mode', 'loopback', '--passphrase-fd', '0', ...args], {
    input: passphrase,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (r.status !== 0) {
    const why = /bad session key|decryption failed/i.test(r.stderr ?? '') ? 'Wrong passphrase.' : (r.stderr ?? '').trim();
    throw new Error(why || `gpg exited ${r.status}`);
  }
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

/* ── commands ─────────────────────────────────────────────────────────────── */

async function edit(): Promise<void> {
  mkdirSync(VAULT_DIR, { recursive: true });
  if (existsSync(STAGING)) {
    console.error(`A previous edit left plaintext at:\n  ${STAGING}\nOpen it, finish or discard it, then run vault:edit again.`);
    process.exit(1);
  }
  const creating = !existsSync(VAULT);
  const pass = await passphraseFor(creating);

  const body = creating ? template() : gpgLoopback(['--decrypt', VAULT], pass);
  writeFileSync(STAGING, body, 'utf8');

  console.log('\nNotepad is open. Fill in what you have, then SAVE and CLOSE it.\n');
  spawnSync('notepad.exe', [STAGING], { stdio: 'inherit' });

  const filled = [...parse(readFileSync(STAGING, 'utf8')).entries()].filter(([, v]) => !isBlank(v));
  if (!filled.length) {
    shred(STAGING);
    console.log('Nothing filled in. Vault unchanged.');
    return;
  }

  // ENCRYPT TO ONE SIDE, THEN SWAP, and shred only once the new file is real.
  //
  // The obvious version of this deletes the old vault, encrypts over the top,
  // and shreds the plaintext in a `finally`. Every one of those steps is fine
  // until gpg fails, at which point the old vault is already gone and the
  // plaintext is being shredded on the way out: both copies destroyed, by the
  // error handling. That is the exact failure this whole file exists to
  // prevent, so nothing is thrown away until the replacement is on disk and
  // has been proved to open.
  const fresh = `${VAULT}.new`;
  rmSync(fresh, { force: true });
  gpgLoopback(['--symmetric', '--cipher-algo', 'AES256', '--output', fresh, STAGING], pass);
  if (!existsSync(fresh) || statSync(fresh).size === 0) {
    throw new Error(`gpg wrote nothing. The vault is untouched and your text is still at:\n  ${STAGING}`);
  }

  // Prove it opens before trusting it. An unopenable vault is indistinguishable
  // from a good one until the day it is needed, which is the worst possible day
  // to find out.
  const check = parse(gpgLoopback(['--decrypt', fresh], pass));
  if (check.size === 0) {
    rmSync(fresh, { force: true });
    throw new Error(`The new vault did not read back. Untouched, and your text is still at:\n  ${STAGING}`);
  }

  const previous = existsSync(VAULT) ? `${VAULT}.previous` : null;
  if (previous) {
    rmSync(previous, { force: true });
    renameSync(VAULT, previous);
  }
  renameSync(fresh, VAULT);
  shred(STAGING);

  console.log(`Vault holds ${filled.length} values.`);
  if (previous) console.log(`Previous vault kept at ${previous} until you are happy.`);
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

async function readVault(): Promise<Map<string, string>> {
  if (!existsSync(VAULT)) return new Map();
  return parse(gpgLoopback(['--decrypt', VAULT], await passphraseFor(false)));
}

async function unlock(): Promise<void> {
  if (!existsSync(VAULT)) {
    console.log('No vault yet. Run `npm run vault:edit` first.');
    return;
  }
  const usable = [...(await readVault()).entries()].filter(([, v]) => !isBlank(v));
  if (!usable.length) {
    console.log('Vault is empty.');
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

async function status(): Promise<void> {
  if (existsSync(STAGING)) console.log(`⚠  Plaintext left behind by an interrupted edit:\n   ${STAGING}\n`);
  if (!existsSync(VAULT)) {
    console.log('No vault yet. Run `npm run vault:edit` to create one.');
    console.log(`It will live at ${VAULT}`);
    console.log(`\n${Object.keys(NEEDED_LOCALLY).length} secrets local scripts read, and ${SERVER_ONLY.length} that only production reads.`);
    return;
  }
  const vault = await readVault();
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
async function push(name: string): Promise<void> {
  if (!name) {
    console.error('Which one? e.g. npm run vault:push -- CRON_SECRET');
    process.exit(1);
  }
  const value = (await readVault()).get(name);
  if (!value || isBlank(value)) {
    console.error(`${name} is not in the vault.`);
    process.exit(1);
  }
  // Through the BOM-safe setter: a PowerShell pipe into the Vercel CLI prepends
  // a byte order mark, and a Sensitive value carrying one never matches anything.
  const r = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/vercel-env-set.ps1', '-Name', name, '-Value', value, '-Sensitive'],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log(`\n${name} set in production. It needs a redeploy to take effect:`);
  console.log('  vercel redeploy <current production url> --target production');
}

async function main() {
  switch (cmd) {
    case 'edit': await edit(); break;
    case 'unlock': await unlock(); break;
    case 'push': await push(process.argv[3] ?? ''); break;
    default: await status();
  }
}

main().catch((e: Error) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
