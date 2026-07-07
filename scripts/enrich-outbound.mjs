/**
 * Fill missing emails (and websites left blank) on outbound_leads, the same
 * additive pattern as enrich-prospects.mjs: scrape the site's homepage and
 * contact pages for a mailto/plain email, then fall back to Hunter.io when
 * HUNTER_API_KEY is set. Fills blanks only, never overwrites.
 *
 * Run: node scripts/enrich-outbound.mjs            (dry run, shows targets)
 *      node scripts/enrich-outbound.mjs --apply    (write)
 *      node scripts/enrich-outbound.mjs --apply 50 (cap processed leads)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const CAP = Number(process.argv.find((a) => /^\d+$/.test(a))) || 250;

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }
const sb = createClient(env.SUPABASE_URL || env.supabase_url, env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key, {
  auth: { persistSession: false },
});
const HUNTER = env.HUNTER_API_KEY;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BAD = /(example|sentry|wixpress|godaddy|placeholder|schema|\.png|\.jpg|\.gif|\.webp|\.css|\.js)/i;

function normUrl(site) {
  if (!site) return null;
  try {
    return new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).toString();
  } catch {
    return null;
  }
}

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MMS-enrich/1.0)' },
    });
    if (!res.ok) return '';
    return (await res.text()).slice(0, 400_000);
  } catch {
    return '';
  }
}

function pickEmail(html, domain) {
  const found = [...new Set((html.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()))].filter((e) => !BAD.test(e));
  if (!found.length) return null;
  const onDomain = found.filter((e) => domain && e.endsWith(`@${domain}`));
  const role = (list) => list.find((e) => /^(info|contact|office|hello|service|admin|support)@/.test(e));
  return role(onDomain) || onDomain[0] || role(found) || found[0];
}

async function scrapeEmail(site) {
  const base = normUrl(site);
  if (!base) return null;
  const domain = new URL(base).hostname.replace(/^www\./, '');
  for (const p of ['', 'contact', 'contact-us', 'about', 'about-us']) {
    const html = await fetchText(new URL(p, base).toString());
    const email = pickEmail(html, domain);
    if (email) return email;
  }
  return null;
}

async function hunterEmail(site) {
  if (!HUNTER) return null;
  const base = normUrl(site);
  if (!base) return null;
  const domain = new URL(base).hostname.replace(/^www\./, '');
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${domain}&limit=5&api_key=${HUNTER}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const emails = j?.data?.emails ?? [];
    const role = emails.find((e) => /^(info|contact|office|hello)@/.test(e.value ?? ''));
    return (role ?? emails[0])?.value?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

const { data: targets, error } = await sb
  .from('outbound_leads')
  .select('id, business_name, website, email')
  .is('email', null)
  .not('website', 'is', null)
  .in('status', ['new', 'contacted', 'callback'])
  .order('created_at', { ascending: false })
  .limit(CAP);
if (error) {
  console.error('Read failed:', error.message);
  process.exit(1);
}
console.log(`${targets?.length ?? 0} leads have a website but no email (cap ${CAP}). Hunter: ${HUNTER ? 'ON' : 'off'}.`);
if (!APPLY) {
  console.log('Dry run only. Rerun with --apply to enrich.');
  process.exit(0);
}

let scraped = 0;
let hunted = 0;
let missed = 0;
for (const t of targets ?? []) {
  let email = await scrapeEmail(t.website);
  if (email) scraped++;
  if (!email) {
    email = await hunterEmail(t.website);
    if (email) hunted++;
  }
  if (!email) {
    missed++;
    continue;
  }
  await sb.from('outbound_leads').update({ email }).eq('id', t.id);
  console.log(`  ${t.business_name}: ${email}`);
}
console.log(`\nDone. scraped ${scraped} · hunter ${hunted} · still missing ${missed}.`);
