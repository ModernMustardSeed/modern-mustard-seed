/**
 * RE-VERIFY every lead whose notes claim "website does not load".
 *
 * That claim is one a rep says out loud on a call, so it has to be true. The
 * first Indianapolis sourcing run scored 1050 sites at concurrency 8 behind a
 * 9-second timeout, and slow-but-healthy sites timed out and were recorded as
 * dead. Spot-checking the ten worst found FOUR false positives, including a
 * 630KB page that was simply slow.
 *
 * This re-checks each one patiently with a browser User-Agent and rewrites the
 * note to what is actually true:
 *   alive   -> drop the claim entirely (keep any other weakness)
 *   blocked -> drop it (401/403/429 is a WAF blocking US, not a dead site)
 *   broken  -> "website returns an error page (HTTP n)"
 *   dead    -> keep "website does not load"
 *
 * Dry run by default. --apply writes.
 *   node scripts/recheck-dead-sites.cjs
 *   node scripts/recheck-dead-sites.cjs --apply
 */
const { loadEnvConfig } = require('./../node_modules/@next/env');
loadEnvConfig(process.cwd(), true);

const APPLY = process.argv.includes('--apply');
const URL_BASE = process.env.supabase_url;
const KEY = process.env.supabase_service_role_key;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';

async function verdict(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  for (const attempt of [0, 1]) {
    try {
      const res = await fetch(base, {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml,*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      });
      if ([401, 403, 429].includes(res.status)) return { v: 'blocked', code: res.status };
      if (res.status === 404 || res.status === 410 || res.status >= 500) return { v: 'broken', code: res.status };
      if (res.ok) return { v: 'alive', code: res.status };
      return { v: 'broken', code: res.status };
    } catch (e) {
      if (attempt === 1) return { v: 'dead', code: e.message.slice(0, 30) };
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
}

async function pool(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

(async () => {
  const res = await fetch(
    `${URL_BASE}/rest/v1/outbound_leads?notes=like.*does%20not%20load*&website=not.is.null&select=id,business_name,website,notes,state&limit=1000`,
    { headers: H },
  );
  const leads = await res.json();
  console.log(`\nLeads claiming "website does not load": ${leads.length}`);
  if (!leads.length) return;

  const counts = { alive: 0, blocked: 0, broken: 0, dead: 0 };
  let done = 0;
  await pool(leads, 4, async (l) => {
    const { v, code } = await verdict(l.website);
    l.verdict = v;
    l.code = code;
    counts[v]++;
    if (++done % 20 === 0) console.log(`  checked ${done}/${leads.length}`);
  });

  console.log(`\nVERDICTS: alive ${counts.alive} · blocked ${counts.blocked} · broken ${counts.broken} · dead ${counts.dead}`);
  const wrong = leads.filter((l) => l.verdict === 'alive' || l.verdict === 'blocked');
  console.log(`\nFALSELY flagged as dead: ${wrong.length}`);
  wrong.slice(0, 25).forEach((l) => console.log(`  - ${l.business_name.slice(0, 38).padEnd(39)} ${String(l.code).padEnd(5)} ${l.website.slice(0, 45)}`));

  // Rewrite the note to the truth. Only the reachability clause changes.
  const fixes = [];
  for (const l of leads) {
    let notes = l.notes;
    if (l.verdict === 'alive' || l.verdict === 'blocked') {
      notes = notes
        .replace(/,\s*website does not load/g, '')
        .replace(/website does not load,\s*/g, '')
        .replace(/\s*·\s*needs us: website does not load(?=\s*\()/g, '');
    } else if (l.verdict === 'broken') {
      notes = notes.replace(/website does not load/g, `website returns an error page (HTTP ${l.code})`);
    }
    if (notes !== l.notes) fixes.push({ id: l.id, notes });
  }
  console.log(`\nNotes to rewrite: ${fixes.length}`);
  if (!APPLY) { console.log('\nDRY RUN. Re-run with --apply to write.\n'); return; }
  for (const f of fixes) {
    const r = await fetch(`${URL_BASE}/rest/v1/outbound_leads?id=eq.${f.id}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ notes: f.notes }),
    });
    if (!r.ok) console.warn(`  PATCH ${f.id} failed: ${r.status}`);
  }
  console.log(`\nAPPLIED — corrected ${fixes.length} lead notes.\n`);
})();
