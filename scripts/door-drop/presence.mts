/**
 * A PRESENCE AUDIT FOR EVERY BUSINESS IN THE BOX.
 *
 * The flyer's QR square points at `/s/<lead id>`, which sends the reader to
 * their own report. Until now that report was the website audit: seven
 * categories, one grade, and nothing about the part most of these businesses are
 * genuinely good at. Anthony's note was that a page which is all bad news gets
 * put down, and he is right.
 *
 * This runs the presence audit instead, which blends the website (45%) with
 * reviews (30%) and the Google profile (25%). Basler Family Chiropractic scored
 * an F on the website alone and a 78 here, because 742 reviews is the best asset
 * that business owns and the old page never mentioned it.
 *
 * IT COSTS ALMOST NOTHING TO RE-RUN. `runPresenceAudit` reuses a website grade
 * younger than fourteen days rather than re-reading the site, so this pass is
 * mostly arithmetic over data the earlier passes already gathered. Only a lead
 * whose website audit has aged out pays for a model call, and that call runs on
 * the Max subscription like every other one here.
 *
 * The report id lands on the lead as `presence_audit_id` / `presence_audit_url`,
 * which is what the scan route reads to decide where to send somebody.
 *
 *   npx tsx scripts/door-drop/presence.mts --out artifacts/door-drop/mt-final
 *   npx tsx scripts/door-drop/presence.mts --out artifacts/door-drop/fl-final --force
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnv, supabase } from './select.mts';

const argv = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? d);
};
const OUT = path.resolve(flag('out', path.join('artifacts', 'door-drop', 'mt-final')));
const FORCE = argv.includes('--force');
const LIMIT = Number(flag('limit', '0'));

loadEnv(process.cwd());
const sb = supabase();
const { runPresenceAudit } = await import('../../lib/presence-audit.ts');

const manifest = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8')) as {
  printed: { id: string; business_name: string }[];
};
let ids = manifest.printed.map((p) => p.id).filter(Boolean);
if (LIMIT) ids = ids.slice(0, LIMIT);
console.log(`${ids.length} businesses in this run.\n`);

let ok = 0;
let failed = 0;
const scores: number[] = [];

for (let i = 0; i < ids.length; i += 1) {
  const { data } = await sb.from('outbound_leads').select('*').eq('id', ids[i]).maybeSingle();
  if (!data) { failed += 1; continue; }
  const label = `[${i + 1}/${ids.length}] ${String(data.business_name).slice(0, 34).padEnd(35)}`;

  // Already scored and nothing has changed: skip rather than burn the call.
  if (!FORCE && data.presence_audit_id && data.presence_audit_score != null) {
    ok += 1;
    scores.push(Number(data.presence_audit_score));
    console.log(`${label} already ${data.presence_audit_score}`);
    continue;
  }

  try {
    const r = await runPresenceAudit(sb, data, { force: FORCE });
    if (r.ok) {
      ok += 1;
      scores.push(r.score);
      console.log(`${label} ${r.score}`);
    } else {
      failed += 1;
      console.log(`${label} ${r.status} ${r.error}`);
    }
  } catch (e) {
    failed += 1;
    console.log(`${label} threw: ${String((e as Error).message).slice(0, 70)}`);
  }
}

const sorted = [...scores].sort((a, b) => a - b);
console.log(`\nscored ${ok}, failed ${failed}`);
if (sorted.length) {
  console.log(`low ${sorted[0]}, median ${sorted[Math.floor(sorted.length / 2)]}, high ${sorted[sorted.length - 1]}`);
  console.log(`80 or better: ${sorted.filter((n) => n >= 80).length}, under 60: ${sorted.filter((n) => n < 60).length}`);
}
