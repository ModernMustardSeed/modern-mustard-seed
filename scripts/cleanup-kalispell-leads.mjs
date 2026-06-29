/**
 * Tidy the Kalispell trade batch: among Sarah's Flathead Valley leads sourced
 * this run (notes tagged "(web)" or "(OpenStreetMap)"), delete (a) non-trade
 * junk (big-box chains, breweries/wineries, photographers) and (b) incomplete
 * leads missing an email or phone. Leaves only great, complete trade leads.
 * Run: node scripts/cleanup-kalispell-leads.mjs
 */
import { readFileSync } from 'node:fs';
function loadEnv(file) { const out = {}; try { for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) { if (!line || line.startsWith('#') || !line.includes('=')) continue; const i = line.indexOf('='); out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, ''); } } catch {} return out; }
const env = loadEnv('.env.local');
const SUPA_URL = env.supabase_url, SUPA_KEY = env.supabase_service_role_key;
const REP = (env.admin_email || 'sarah@modernmustardseed.com').toLowerCase();
const VALLEY = new Set(['kalispell', 'whitefish', 'columbia falls', 'bigfork', 'evergreen', 'lakeside', 'somers', 'kila', 'marion', 'martin city', 'coram']);
const JUNK = /home depot|lowe'?s|harbor freight|true value|ace hardware|winery|brewing|brewery|cider|distill|photograph|\bcafe\b|coffee|restaurant|\bbar\b|grocery|market\b|target|burlington|sprouts|urgent care|nextcare/i;

const h = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };
const res = await fetch(`${SUPA_URL}/rest/v1/rep_prospects?select=id,business,city,email,phone,notes&rep_email=eq.${encodeURIComponent(REP)}&limit=6000`, { headers: h });
const rows = await res.json();
if (!Array.isArray(rows)) { console.error('query error:', JSON.stringify(rows).slice(0, 200)); process.exit(1); }
// This batch only: valley city AND notes tagged "(web)" or "OpenStreetMap".
const valley = rows.filter((r) => VALLEY.has((r.city || '').toLowerCase().trim()) && /\(web\)|OpenStreetMap/.test(r.notes || ''));
const del = valley.filter((r) => JUNK.test(r.business) || !r.email || !r.phone);
console.log(`Sarah valley leads (web/OSM): ${valley.length} | deleting ${del.length} (junk or incomplete)`);
for (const r of del) {
  const why = JUNK.test(r.business) ? 'junk' : (!r.email ? 'no-email' : 'no-phone');
  await fetch(`${SUPA_URL}/rest/v1/rep_prospects?id=eq.${r.id}`, { method: 'DELETE', headers: h });
  console.log(`  - ${r.business} (${r.city}) [${why}]`);
}
const keep = valley.filter((r) => !del.includes(r));
console.log(`\nKept ${keep.length} complete valley trade leads:`);
const byCity = {}; for (const r of keep) byCity[r.city] = (byCity[r.city] || 0) + 1;
console.log('  by city:', Object.entries(byCity).map(([k, v]) => `${k}:${v}`).join(', '));
