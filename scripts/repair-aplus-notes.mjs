/**
 * Repair pass for the western-aplus batch.
 *
 * The sourcer scores an unreachable website as "dead" (+45) but never wrote the
 * reason into the lead note, so 31 leads landed with no "needs us" line. Worse,
 * "unreachable" conflated two very different things:
 *
 *   - genuinely broken  (DNS failure, timeout, 404)      → a real, callable pitch
 *   - bot-blocked       (403/401/429 to a scraper UA)    → a HEALTHY site
 *
 * Telling a medical clinic "your website is down" when it loads fine for
 * everyone but our scraper is a call that ends badly. This re-checks every
 * no-reason lead with a browser-like User-Agent, then:
 *
 *   - genuinely broken → note says the site does not load
 *   - actually healthy → re-scores the real weakness signals; if the site turns
 *     out to be clean, the lead is DEMOTED out of the batch (owner cleared and
 *     flagged) rather than handed to a rep with nothing to open on.
 *
 * Run:  node scripts/repair-aplus-notes.mjs          (dry run)
 *       node scripts/repair-aplus-notes.mjs --apply
 */
import { readFileSync } from 'node:fs';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  const k = line.slice(0, i).trim().toLowerCase();
  if (!(k in env)) env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
const U = env.supabase_url, K = env.supabase_service_role_key;
const H = { apikey: K, Authorization: `Bearer ${K}` };
const APPLY = process.argv.includes('--apply');
const YEAR = 2026;

// A real browser UA. The sourcer's honest bot UA is what triggered the 403s.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function inspect(website) {
  const base = website.startsWith('http') ? website : `https://${website}`;
  let origin = '';
  try { origin = new URL(base).origin; } catch { return { verdict: 'broken', weak: [] }; }
  try {
    const res = await fetch(base, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 404 || res.status >= 500) return { verdict: 'broken', weak: [] };
    if (!res.ok) return { verdict: 'blocked', weak: [] }; // 403/401/429 even to a real UA
    const html = (await res.text()).slice(0, 400000);
    const weak = [];
    if (!/<meta[^>]+name=["']viewport["']/i.test(html)) weak.push('not mobile-friendly');
    if (res.url && res.url.startsWith('http://')) weak.push('no HTTPS');
    const yrs = [...html.matchAll(/(?:©|&copy;|copyright)\s*\D{0,6}(20\d\d)/gi)].map((m) => +m[1]);
    const my = yrs.length ? Math.max(...yrs) : null;
    if (my && my <= YEAR - 2) weak.push(`stale (©${my})`);
    if (!/<form/i.test(html) && !/calendly|acuity|booksy|vagaro|squareup\.com\/appointments|schedulicity|housecallpro|jobber/i.test(html)) weak.push('no booking form');
    void origin;
    return { verdict: 'alive', weak };
  } catch {
    return { verdict: 'broken', weak: [] };
  }
}

/**
 * Businesses that are not single-owner and cannot buy what we sell: franchise car
 * dealerships (their site is corporate-controlled) and regional health systems
 * (procurement, not an owner). Listed by exact name rather than matched by
 * pattern, because the obvious patterns produce false positives that matter —
 * "Veterinary Hospital" and "Animal Hospital" are single-owner vet practices and
 * excellent leads, and "Carl Duke Volvo Repair" is an independent shop, not a
 * Volvo dealership. Those all stay.
 */
const NOT_SINGLE_OWNER = new Set([
  'Cavender Motors',
  'Springs Automotive Group',
  'Panther Performance Auto Group',
  'Suss Buick GMC',
  'Mark Miller Toyota Service',
  'Halladay Nissan',
  'Tyrrell-Doyle Honda',
  'Halladay Motors Cadilac, Buick & GM',
  'Spradley Barr Mazda',
  'Spradley Bar Hundai',
  'Logan Health Orthopedics & Sports Medicine - Kalispell',
  'Logan Health Primary Care',
  'Deaconess North Emergency Center',
  'Sign Shop at Boise State University',
]);

const main = async () => {
  const res = await fetch(`${U}/rest/v1/outbound_leads?select=id,business_name,website,notes,city&source=eq.western-aplus-2026-07&limit=1000`, { headers: H });
  const all = await res.json();

  // Pass 0: drop the leads a rep should never dial.
  const wrongFit = all.filter((l) => NOT_SINGLE_OWNER.has(l.business_name));
  console.log(`\n${all.length} leads in the batch`);
  console.log(`\n── NOT SINGLE-OWNER (demoting ${wrongFit.length}) ──`);
  for (const l of wrongFit) console.log(`  ${l.business_name.slice(0, 46).padEnd(46)} ${l.city}`);

  const targets = all.filter((l) => !/needs us/.test(l.notes || '') && !NOT_SINGLE_OWNER.has(l.business_name));
  console.log(`\n── NO "NEEDS US" REASON (${targets.length}) ──\n`);

  const plan = [];
  for (const l of targets) {
    const r = await inspect(l.website);
    let note, action;
    if (r.verdict === 'broken') {
      note = `${l.notes} · needs us: website does not load`;
      action = 'label-broken';
    } else if (r.verdict === 'blocked') {
      // Can't verify either way without a real browser. Say what we know, and
      // never assert the site is down.
      note = `${l.notes} · needs us: site could not be reviewed (blocks automated checks) — review live before pitching`;
      action = 'label-unverified';
    } else if (r.weak.length) {
      note = `${l.notes} · needs us: ${r.weak.join(', ')}`;
      action = 'label-weak';
    } else {
      note = `${l.notes} · site reviewed clean — demoted from the A+ batch`;
      action = 'demote';
    }
    plan.push({ ...l, action, note, verdict: r.verdict, weak: r.weak });
    console.log(`  ${action.padEnd(17)} ${r.verdict.padEnd(8)} ${l.business_name.slice(0, 34).padEnd(34)} ${r.weak.join(', ')}`);
  }

  for (const l of wrongFit) {
    plan.push({
      ...l,
      action: 'demote',
      note: `${l.notes} · not a single-owner business (dealership / health system) — removed from the A+ batch`,
    });
  }

  const counts = plan.reduce((a, p) => ((a[p.action] = (a[p.action] || 0) + 1), a), {});
  console.log(`\n── PLAN ──`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${String(v).padStart(3)}  ${k}`);

  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply.\n'); return; }

  let ok = 0;
  for (const p of plan) {
    const body = p.action === 'demote'
      ? { notes: p.note.slice(0, 2000), owner_rep_id: null, status: 'lost' }
      : { notes: p.note.slice(0, 2000) };
    const r = await fetch(`${U}/rest/v1/outbound_leads?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    });
    if (r.ok) ok++;
    else console.error('  FAILED', p.business_name, r.status, (await r.text()).slice(0, 120));
  }
  console.log(`\nAPPLIED — ${ok}/${plan.length} leads repaired.\n`);
};

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
