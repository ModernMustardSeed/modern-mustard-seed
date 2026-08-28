/**
 * Merge a client filed under two addresses into one.
 *
 * Everything downstream of a Stripe checkout keys on the email the buyer typed
 * at the till. When that is not the address already on his card, he ends up
 * with two: the one we built, carrying the files and the project, and a fresh
 * one carrying the money. Neither is wrong and neither is complete, and the
 * admin shows whichever you happen to open.
 *
 * Prefilling the checkout email makes this rare. It does not make it
 * impossible: he can change it in the Stripe form, and some people pay from a
 * bookkeeper's address on purpose.
 *
 * So this exists, and it runs in one line the moment it happens:
 *
 *   npx tsx scripts/merge-client.mts from@old.com into@new.com
 *   npx tsx scripts/merge-client.mts from@old.com into@new.com --go
 *
 * Without --go it prints what it would move and changes nothing. Read that
 * first: merging is not reversible, and the direction matters.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
) as Record<string, string>;

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const [FROM, INTO] = process.argv.slice(2).filter((a) => a.includes('@'));
const GO = process.argv.includes('--go');

if (!FROM || !INTO) {
  console.error('usage: merge-client.mts from@old.com into@new.com [--go]');
  process.exit(1);
}
if (FROM.toLowerCase() === INTO.toLowerCase()) {
  console.error('Those are the same address.');
  process.exit(1);
}

/* Every table that files anything against a client email. Keeping the list here
 * rather than deriving it means a new table has to be added on purpose, which
 * is right: silently missing one leaves half a client behind and nothing says
 * so. */
const TABLES: Array<[string, string]> = [
  ['clients', 'email'],
  ['client_files', 'client_email'],
  ['client_products', 'client_email'],
  ['client_requests', 'client_email'],
  ['client_intake', 'client_email'],
  ['projects', 'client_email'],
  ['golive_runbooks', 'client_email'],
  ['proposals', 'client_email'],
  ['orders', 'email'],
];

const into = INTO.toLowerCase();

let total = 0;
for (const [table, col] of TABLES) {
  try {
    const { data, error } = await db.from(table).select(col).ilike(col, FROM);
    if (error) {
      console.log(`  ${table.padEnd(18)} skipped (${error.message.slice(0, 46)})`);
      continue;
    }
    const n = data?.length ?? 0;
    total += n;
    if (!n) {
      console.log(`  ${table.padEnd(18)} nothing`);
      continue;
    }
    if (!GO) {
      console.log(`  ${table.padEnd(18)} would move ${n}`);
      continue;
    }
    /* clients is the one table where both rows can exist, and a primary key on
     * email means the update collides instead of merging. The older row keeps
     * the history we care about, so the newer one is removed and the older one
     * is renamed onto the address the money arrived under. */
    if (table === 'clients') {
      await db.from('clients').delete().ilike('email', into);
    }
    const { error: upErr } = await db.from(table).update({ [col]: into }).ilike(col, FROM);
    console.log(`  ${table.padEnd(18)} ${upErr ? 'FAILED: ' + upErr.message : `moved ${n}`}`);
  } catch (e) {
    console.log(`  ${table.padEnd(18)} skipped (${(e as Error).message.slice(0, 46)})`);
  }
}

console.log(
  GO
    ? `\nDone. ${FROM} is now ${into}.`
    : `\n${total} records would move. Nothing changed. Run it again with --go.`,
);
