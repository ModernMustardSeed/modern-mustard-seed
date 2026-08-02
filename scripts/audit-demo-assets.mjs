/**
 * FLEET AUDIT: which stored demo sites ship broken images?
 *
 * Only index.html is stored on the row and served at /demo/site/<id>/raw, so any
 * reference to a sibling file is a guaranteed 404 in front of a real prospect, with
 * the browser painting the alt text where the photograph belongs. This walks every
 * row that has html and reports the ones that would break.
 *
 * Run it after any change to the design law or the image tooling:
 *   node scripts/audit-demo-assets.mjs
 *
 * Exits non-zero when anything is broken, so it can gate a deploy.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { remainingLocalRefs } from './inline-site-assets.mjs';

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(
  env.SUPABASE_URL || env.supabase_url || env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key
);

const SITES_DIR = process.env.DEMO_SITES_DIR || path.join(os.homedir(), 'mms-demo-sites');

const { data, error } = await supabase
  .from('outbound_demo_sites')
  .select('id,business_name,status,built_at,html')
  .not('html', 'is', null);

if (error) {
  console.error('query failed:', error.message);
  process.exit(2);
}

const broken = [];
for (const row of data) {
  const refs = remainingLocalRefs(row.html);
  if (!refs.length) continue;
  // Say whether it is repairable in place, since that decides the fix: a build dir
  // that still holds the files just needs re-inlining, a missing one needs a rebuild.
  const dir = path.join(SITES_DIR, row.id);
  const onDisk = refs.filter((r) => fs.existsSync(path.join(dir, r.split('#')[0].split('?')[0])));
  broken.push({ ...row, refs, repairable: onDisk.length === refs.length, onDisk: onDisk.length });
}

for (const b of broken) {
  console.log(
    `BROKEN ${b.id}  ${(b.business_name || '').slice(0, 30).padEnd(30)} ${b.status.padEnd(8)} ` +
      `${String(b.built_at).slice(0, 10)}  ${b.refs.length} ref(s), ${b.onDisk} still on disk ` +
      `${b.repairable ? '[repairable: re-inline]' : '[needs rebuild: assets gone]'}`
  );
  console.log(`         ${b.refs.slice(0, 6).join(', ')}${b.refs.length > 6 ? ', ...' : ''}`);
}

console.log(
  broken.length
    ? `\n${broken.length} of ${data.length} demo rows ship broken images.`
    : `\nAll ${data.length} demo rows are self-contained.`
);
process.exit(broken.length ? 1 : 0);
