/**
 * ROTATE A SELF-CHOSEN SECRET, IN ALL THE PLACES IT HAS TO MATCH.
 *
 *   npm run rotate -- CREDENTIALS_SECRET
 *   npm run rotate -- CREDENTIALS_SECRET --dry
 *
 * Some of our secrets are issued by somebody else and can only be fetched from
 * their console. Others we simply chose, and their only requirement is that
 * every copy agrees. Those are rotatable: if the value is lost, it does not
 * have to be recovered, it has to be replaced everywhere at once.
 *
 * "Everywhere" is the part that gets missed. A new value in Vercel and a stale
 * one in .env.local is not a rotation, it is an outage that only shows up on
 * the next local run. So this writes Vercel, every worktree's .env.local, and
 * the vault, and prints a fingerprint of each so they can be seen to agree.
 *
 * ── THE PART THAT CAN DESTROY DATA ───────────────────────────────────────────
 *
 * CREDENTIALS_SECRET is not a password. lib/crypto.ts derives an AES-256-GCM
 * key from it with sha256, and that key encrypts stored client credentials and
 * Google OAuth tokens. Rotating it does not lock anybody out; it makes every
 * existing ciphertext permanently unreadable, with no error until somebody
 * tries to reveal a credential months later.
 *
 * So for that one name this refuses to run while ANY ciphertext exists. The
 * check covers all three stores, including client_integrations, whose columns
 * are named access_ciphertext and refresh_ciphertext rather than
 * secret_ciphertext. Searching for the obvious column name alone finds two of
 * the three and quietly misses every connected Google account.
 *
 * The value itself is never printed. Only a short fingerprint, which is enough
 * to confirm two copies match and useless to anybody who sees it.
 */
import { createClient } from '@supabase/supabase-js';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';

const NAME = process.argv[2] ?? '';
const DRY = process.argv.includes('--dry');

if (!NAME || NAME.startsWith('-')) {
  console.error('Which secret? e.g. npm run rotate -- CREDENTIALS_SECRET');
  process.exit(1);
}

/**
 * Secrets somebody else issued. Rotating these here would only desynchronise
 * us from the provider, so the tool refuses rather than pretending.
 */
const EXTERNALLY_ISSUED = [
  'RESEND_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'VAPI_API_KEY',
  'TWILIO_AUTH_TOKEN', 'TWILIO_API_KEY_SECRET', 'ZOHO_IMAP_PASSWORD', 'ANTHROPIC_API_KEY',
  'FAL_KEY', 'FOURSQUARE_API_KEY', 'HUNTER_API_KEY', 'VERCEL_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY',
];
if (EXTERNALLY_ISSUED.includes(NAME)) {
  console.error(`${NAME} is issued by a provider, not chosen by us.`);
  console.error('Rotating it here would only make our copy disagree with theirs.');
  console.error('Roll it in their console, then: npm run vault:edit && npm run vault:push -- ' + NAME);
  process.exit(1);
}

const envFile = (dir: string) => join(dir, '.env.local');

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

function localEnv(): Map<string, string> {
  try {
    return parse(readFileSync('.env.local', 'utf8'));
  } catch {
    return new Map();
  }
}

/** Short, non-reversible, enough to confirm two copies are the same value. */
const fingerprint = (v: string) => crypto.createHash('sha256').update(v).digest('hex').slice(0, 12);

function worktrees(): string[] {
  try {
    const listed = execFileSync('git', ['worktree', 'list', '--porcelain'], { encoding: 'utf8' });
    return [...listed.matchAll(/^worktree (.+)$/gm)].map((m) => m[1].trim());
  } catch {
    return [process.cwd()];
  }
}

/**
 * Refuse to destroy anything. Every store that holds something encrypted with
 * this key, counted before a new one is generated.
 */
async function ciphertextCount(): Promise<number | null> {
  const env = localEnv();
  const url = env.get('SUPABASE_URL') ?? env.get('NEXT_PUBLIC_SUPABASE_URL') ?? '';
  const key = env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !key) return null;
  const db = createClient(url.trim(), key.trim(), { auth: { persistSession: false } });

  const stores: [string, string][] = [
    ['client_credentials', 'secret_ciphertext'],
    ['factory_integrations', 'secret_ciphertext'],
    ['client_integrations', 'access_ciphertext'],
    ['client_integrations', 'refresh_ciphertext'],
  ];
  let total = 0;
  for (const [table, column] of stores) {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true }).not(column, 'is', null);
    if (error) return null; // unreadable means unknown, and unknown must not proceed
    console.log(`   ${table}.${column.padEnd(20)} ${count ?? 0} encrypted`);
    total += count ?? 0;
  }
  return total;
}

async function main() {
  if (NAME === 'CREDENTIALS_SECRET') {
    console.log('CREDENTIALS_SECRET is an AES key. Checking nothing is encrypted with it.\n');
    const encrypted = await ciphertextCount();
    if (encrypted === null) {
      console.error('\nCould not read the credential stores, so it is unknown whether anything would be destroyed.');
      console.error('Refusing. Fix the database connection and run again.');
      process.exit(1);
    }
    if (encrypted > 0) {
      console.error(`\n${encrypted} encrypted values exist. Rotating would make every one of them permanently unreadable.`);
      console.error('Refusing. The old key has to be recovered, not replaced.');
      process.exit(1);
    }
    console.log('\n   Nothing encrypted. Safe to rotate.\n');
  }

  // 48 bytes of randomness, base64url so it survives every env parser, shell
  // and dotenv quirk without escaping. Well past the 16-character floor
  // lib/crypto.ts enforces.
  const value = crypto.randomBytes(48).toString('base64url');
  console.log(`New ${NAME} generated. Fingerprint ${fingerprint(value)}\n`);

  if (DRY) {
    console.log('Dry run. Nothing written.');
    return;
  }

  /* every worktree's .env.local */
  for (const dir of worktrees()) {
    const target = envFile(dir);
    if (!existsSync(target)) continue;
    const text = readFileSync(target, 'utf8');
    let seen = false;
    const lines = text.split(/\r?\n/).map((raw) => {
      const line = raw.trim();
      const eq = line.indexOf('=');
      if (!line || line.startsWith('#') || eq < 1) return raw;
      if (line.slice(0, eq).trim() !== NAME) return raw;
      seen = true;
      return `${NAME}=${value}`;
    });
    if (!seen) {
      lines.push('', `# Rotated ${new Date().toISOString().slice(0, 10)}`, `${NAME}=${value}`);
    }
    writeFileSync(target, lines.join('\n'), 'utf8');
    console.log(`  local   ${dir.split(/[\\/]/).pop()}`);
  }

  /* the vault, if there is one */
  const vault = join(homedir(), '.mms-vault', 'secrets.env.gpg');
  if (existsSync(vault)) {
    console.log(`  vault   run \`npm run vault:edit\` and set ${NAME} to the value now in .env.local`);
  } else {
    console.log('  vault   none yet; run `npm run vault:edit` so this survives the next pull');
  }

  /* Vercel production, through the BOM-safe setter */
  const r = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/vercel-env-set.ps1', '-Name', NAME, '-Value', value, '-Sensitive'],
    { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' },
  );
  if (r.status !== 0) {
    console.error('\nVercel did not accept the new value. Local copies ARE updated and now disagree with production.');
    console.error(`Set it by hand: .\\scripts\\vercel-env-set.ps1 -Name ${NAME} -Value <the value in .env.local> -Sensitive`);
    process.exit(1);
  }
  console.log('  vercel  production updated');

  console.log(`\n${NAME} rotated. Fingerprint ${fingerprint(value)}`);
  console.log('\nProduction is still running the OLD value until it is redeployed:');
  console.log('  vercel ls');
  console.log('  vercel redeploy <the current production url> --target production');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
