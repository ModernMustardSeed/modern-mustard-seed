#!/usr/bin/env node
/**
 * Find the Facebook page for every lead that has no email or no real website.
 *
 * These are the DM list: nothing to mail, nothing to audit, and a Facebook
 * page that is the whole front door. The admin already gives every one of them
 * a "Find on FB" button that opens Facebook's own page search. This script
 * fills in the page itself where a web search can prove it, so the button
 * opens the page directly.
 *
 * It is strict on purpose. A search for "Davies Plumbing" returns Davis
 * Plumbing, Mildren Plumbing and Brown Plumbing before the right one, so a hit
 * is only stored when the page slug or the result title carries every
 * meaningful word of the business name. Nothing certain, nothing stored; the
 * button still works through search either way.
 *
 * Source of truth for what gets touched:
 *   facebook_source = 'hand'     never touched
 *   facebook_source = 'website'  never touched
 *   facebook_source = 'search'   re-checked only with --again
 *   facebook_source = 'none'     searched before, nothing certain; re-checked only with --again
 *
 * Zero dependencies. Reads .env.local from the repo root like the other scripts.
 *
 * Usage, from the repo root:
 *   node scripts/acq-find-facebook.mjs                 # everything unsearched
 *   node scripts/acq-find-facebook.mjs --limit 200     # a first pass
 *   node scripts/acq-find-facebook.mjs --dry           # search and report, write nothing
 *   node scripts/acq-find-facebook.mjs --again         # include leads searched before
 *   node scripts/acq-find-facebook.mjs --state MT      # one state only
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
if (existsSync(path.join(root, '.env.local'))) {
  for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('No Supabase URL / service role key in env or .env.local.');
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const DRY = flag('dry');
const AGAIN = flag('again');
const LIMIT = Number(opt('limit') ?? 0) || 0;
const STATE = (opt('state') ?? '').toUpperCase();
const PAUSE_MS = Number(opt('pause') ?? 1200);

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

// ── who to search ────────────────────────────────────────────────────────────

async function loadLeads() {
  const out = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const q = new URLSearchParams({
      select: 'id,business_name,city,state,website,email,facebook_url,facebook_source,lead_score',
      or: '(email.is.null,website.is.null,website.ilike.*facebook.com*)',
      order: 'lead_score.desc.nullslast',
    });
    if (STATE) q.set('state', `eq.${STATE}`);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/outbound_leads?${q}`, { headers: { ...headers, Range: `${from}-${from + size - 1}` } });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out.filter((l) => {
    if (l.facebook_url && l.facebook_source !== 'search') return false; // hand or website: settled
    if (!AGAIN && (l.facebook_source === 'search' || l.facebook_source === 'none')) return false;
    return true;
  });
}

// ── name matching ────────────────────────────────────────────────────────────

const NOISE = new Set(['llc', 'inc', 'co', 'corp', 'ltd', 'the', 'and', 'of', 'a', 'an', 'company', 'services', 'service', 'llp', 'pllc', 'dba']);

function words(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !NOISE.has(w));
}

/** Every meaningful word of the name appears in the candidate text, in any order. */
function nameMatches(businessName, candidateText) {
  const need = words(businessName);
  if (!need.length) return false;
  const hay = ' ' + words(candidateText).join(' ') + ' ';
  const flat = hay.replace(/ /g, '');
  return need.every((w) => hay.includes(` ${w} `) || flat.includes(w));
}

// ── the same canonical rule the app uses (lib/acq/facebook.ts) ───────────────

const FB_HOST = /^https?:\/\/(?:m\.|www\.|web\.|business\.)?(?:facebook\.com|fb\.com)\//i;
const NOT_PAGES = new Set(['search', 'groups', 'events', 'marketplace', 'login', 'sharer', 'sharer.php', 'dialog', 'hashtag', 'watch', 'reel', 'stories', 'photo', 'photo.php', 'help', 'policies', 'privacy', 'public', 'plugins']);

function normalize(url) {
  if (!url || !FB_HOST.test(url)) return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  let p = u.pathname.replace(/\/+$/, '').replace(/^\/+/, '').replace(/^(?:[a-z]{2}(?:-[A-Za-z]{2})?\/)?/, '');
  if (!p) return null;
  const parts = p.split('/');
  const head = parts[0].toLowerCase();
  if (NOT_PAGES.has(head)) return null;
  if (head === 'profile.php') { const id = u.searchParams.get('id'); return id && /^\d+$/.test(id) ? `https://www.facebook.com/profile.php?id=${id}` : null; }
  if (head === 'people') return parts.length >= 3 && /^\d+$/.test(parts[2]) ? `https://www.facebook.com/people/${parts[1]}/${parts[2]}/` : null;
  if (head === 'pages') return `https://www.facebook.com/${p}/`;
  return `https://www.facebook.com/${parts[0]}/`;
}

/** The bit of the URL a human would read as the name. */
function slugOf(pageUrl) {
  const p = new URL(pageUrl).pathname.split('/').filter(Boolean);
  if (p[0] === 'people') return p[1] ?? '';
  if (p[0] === 'pages') return p.slice(1).join(' ');
  if (p[0] === 'profile.php') return '';
  return p[0] ?? '';
}

// ── bing ─────────────────────────────────────────────────────────────────────

function decodeBing(href) {
  const m = href.match(/u=a1([A-Za-z0-9_-]+)/);
  if (!m) return href.replace(/&amp;/g, '&');
  try { return Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); } catch { return href; }
}

async function bing(q) {
  const r = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=en`, {
    headers: { 'user-agent': UA, accept: 'text/html', 'accept-language': 'en-US,en;q=0.9' },
  });
  if (r.status === 429 || r.status === 403) return { blocked: true, results: [] };
  const html = await r.text();
  const results = [];
  for (const m of html.matchAll(/<li class="b_algo"[\s\S]*?<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    results.push({ url: decodeBing(m[1]), title: m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&quot;/g, "'").trim() });
  }
  return { blocked: html.length < 3000 && results.length === 0, results };
}

/** One certain page or null. */
async function findPage(lead) {
  const where = [lead.city, lead.state].filter(Boolean).join(' ');
  const { blocked, results } = await bing(`"${lead.business_name}" ${where} site:facebook.com`);
  if (blocked) return { blocked: true };
  const seen = new Set();
  const certain = [];
  for (const res of results) {
    const page = normalize(res.url);
    if (!page || seen.has(page)) continue;
    seen.add(page);
    const slug = slugOf(page);
    if (nameMatches(lead.business_name, slug) || nameMatches(lead.business_name, res.title)) certain.push({ page, title: res.title });
  }
  // Two different certain pages means the name is ambiguous. Refuse.
  if (certain.length === 1) return { page: certain[0].page, title: certain[0].title };
  if (certain.length > 1) {
    // Unless the town is in one title and not the others.
    const town = String(lead.city || '').toLowerCase();
    const withTown = town ? certain.filter((c) => c.title.toLowerCase().includes(town)) : [];
    if (withTown.length === 1) return { page: withTown[0].page, title: withTown[0].title };
  }
  return { page: null };
}

// ── write ────────────────────────────────────────────────────────────────────

async function save(id, patch) {
  if (DRY) return;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/outbound_leads?id=eq.${id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
  if (!r.ok) throw new Error(`Supabase PATCH ${r.status}: ${await r.text()}`);
}

// ── run ──────────────────────────────────────────────────────────────────────

const leads = await loadLeads();
const todo = LIMIT ? leads.slice(0, LIMIT) : leads;
console.log(`${leads.length} lead${leads.length === 1 ? '' : 's'} on the DM list still unsearched${STATE ? ` in ${STATE}` : ''}. Searching ${todo.length}${DRY ? ' (dry run, nothing written)' : ''}.`);

let found = 0, none = 0, blocked = false;
const started = Date.now();
for (let i = 0; i < todo.length; i++) {
  const lead = todo[i];
  let res;
  try {
    res = await findPage(lead);
  } catch (e) {
    console.log(`  ! ${lead.business_name}: ${e.message}`);
    continue;
  }
  if (res.blocked) { blocked = true; console.log(`\nBing stopped answering after ${i} searches. Run again later; what was found is already saved.`); break; }
  const label = `${lead.business_name}${lead.city ? `, ${lead.city}` : ''}`;
  if (res.page) {
    found++;
    console.log(`  + ${label}\n      ${res.page}`);
    await save(lead.id, { facebook_url: res.page, facebook_source: 'search' });
  } else {
    none++;
    if (i < 40 || i % 50 === 0) console.log(`  - ${label}`);
    // Only mark a fresh lead as searched; a previous 'search' hit stays unless --again found better.
    if (!lead.facebook_url) await save(lead.id, { facebook_source: 'none' });
  }
  if (i < todo.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS + Math.floor(Math.random() * 400)));
}

const mins = ((Date.now() - started) / 60000).toFixed(1);
console.log(`\nDone in ${mins} min: ${found} page${found === 1 ? '' : 's'} found${DRY ? '' : ' and saved'}, ${none} with nothing certain${blocked ? ', stopped early by Bing' : ''}.`);
console.log('Every lead keeps its "Find on FB" button either way; that opens Facebook page search for the name and town.');
