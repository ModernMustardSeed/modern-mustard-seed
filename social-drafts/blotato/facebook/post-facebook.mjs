// Main Street AI: Facebook Page poster.
// Schedules the FB text-post lane from fb-content-bank.json to the MMS Facebook PAGE.
// Reels are deliberately NOT handled here: they are posted natively from the phone so
// they get trending audio + the in-app Reels editor (see REELS-24.md).
//
//   node post-facebook.mjs            # DRY RUN: show the plan, render nothing
//   node post-facebook.mjs --live     # render cards, upload, schedule
//   node post-facebook.mjs --live --from=12   # resume at bank index 12 after a rate-limit stop
//
// FAILS CLOSED. Without FB_PAGE_ID it schedules nothing and tells you how to get one.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cardHTML } from '../main-street-ai/msa-30day.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../..');
const CARDS = path.join(__dirname, 'cards');
const BANK_FILE = process.env.BANK_FILE || 'fb-content-bank.json';
const API = 'https://backend.blotato.com/v2';
const BUCKET = 'social';

// 8:00 AM Mountain = 14:00 UTC. Deliberately staggered off CXC's 9am MT daily drop
// and off the MMS LinkedIn/X lane at 10am MT, so the shared Blotato key is never
// hit by three bursts at once.
const TIME = 'T14:00:00Z';
// Mon / Thu / Sat. Matches the cadence in FB-PLAYBOOK.md (Reels carry Tue/Wed/Fri).
const POST_DAYS = [1, 4, 6];

const live = process.argv.includes('--live');
const fromArg = process.argv.find(a => a.startsWith('--from='));
const startIdx = fromArg ? +fromArg.split('=')[1] : 0;

function parseEnv(f) {
  const o = {};
  if (!existsSync(f)) return o;
  for (const l of readFileSync(f, 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    o[m[1]] = v;
  }
  return o;
}

const blotatoEnv = parseEnv(path.join(__dirname, '..', '.blotato.env'));
const repoEnv = parseEnv(path.join(REPO, '.env.local'));
const KEY = blotatoEnv.BLOTATO_API_KEY;
const FB_PAGE_ID = process.env.FB_PAGE_ID || blotatoEnv.FB_PAGE_ID;
const FB_ACCOUNT_ID = process.env.FB_ACCOUNT_ID || blotatoEnv.FB_ACCOUNT_ID || '31848';
const SUPA_URL = repoEnv.supabase_url;
const SUPA_KEY = repoEnv.supabase_service_role_key;
const GROUP_URL = process.env.GROUP_URL || blotatoEnv.GROUP_URL || null;
const H = { 'blotato-api-key': KEY, 'Content-Type': 'application/json' };

// First comments are pasted by hand (Blotato has no first-comment API), so a
// {{GROUP_URL}} placeholder can never reach a live post. It can still reach the
// report Sarah copies from, which is just as bad. Resolve it or drop the comment.
function resolveComment(raw) {
  if (!raw) return null;
  if (!raw.includes('{{GROUP_URL}}')) return raw;
  if (!GROUP_URL) return null;
  return raw.split('{{GROUP_URL}}').join(GROUP_URL);
}

const iso = ms => new Date(ms).toISOString().slice(0, 10);
const dow = dateStr => new Date(dateStr + 'T12:00:00Z').getUTCDay();

// ---------------------------------------------------------------- preflight
const problems = [];
if (!KEY) problems.push('BLOTATO_API_KEY missing from ../.blotato.env');
if (!FB_PAGE_ID) problems.push('FB_PAGE_ID not set (this is the expected blocker, see below)');
if (live && (!SUPA_URL || !SUPA_KEY)) problems.push('supabase_url / supabase_service_role_key missing from repo .env.local');

if (problems.length) {
  console.log('\nCANNOT SCHEDULE. Nothing was posted.\n');
  for (const p of problems) console.log('  ✗ ' + p);
  if (!FB_PAGE_ID) {
    console.log(`
  To unblock (5 minutes, one time):
    1. Meta Business Suite -> Settings -> Pages -> Modern Mustard Seed -> copy the Page ID.
       (Or: open the Page -> About -> scroll to Page ID.)
    2. Blotato dashboard -> Connections -> reconnect Facebook and grant PAGE access,
       not just profile. Blotato currently only holds the personal profile (acct 31848).
    3. Add to social-drafts/blotato/.blotato.env:
         FB_PAGE_ID=<the page id>
         FB_ACCOUNT_ID=31848
    4. Re-run this script.
`);
  }
  process.exit(1);
}

// ---------------------------------------------------------------- plan
const bank = JSON.parse(readFileSync(path.join(__dirname, BANK_FILE), 'utf8'));
const avail = bank.filter(b => !b.used).slice(startIdx);
if (!avail.length) {
  console.log('BANK EMPTY. Replenish fb-content-bank.json to keep the FB lane rolling.');
  process.exit(0);
}

// Find where the FB queue currently ends so we only ever schedule AHEAD.
let items = [], cursor = null;
for (let g = 0; g < 30; g++) {
  const u = new URL(API + '/schedules');
  u.searchParams.set('limit', '50');
  if (cursor) u.searchParams.set('cursor', cursor);
  const r = await fetch(u, { headers: { 'blotato-api-key': KEY } });
  const j = await r.json().catch(() => ({}));
  items = items.concat(j.items || []);
  cursor = j.cursor || null;
  if (!cursor || !(j.items || []).length) break;
}
const fbDates = items
  .filter(i => i.account && String(i.account.id) === String(FB_ACCOUNT_ID))
  .map(i => i.scheduledAt.slice(0, 10));
const today = iso(Date.now());
// START_DATE lets you pin the first post to a launch day (the queue is empty on day one,
// and "next Mon/Thu/Sat from today" would otherwise open the series on a Saturday).
// The series always starts strictly AFTER this date, so pass the day before launch.
const START_DATE = process.env.START_DATE || null;
let cur = fbDates.length ? fbDates.sort().slice(-1)[0] : (START_DATE || today);

// Build the Mon/Thu/Sat date list, starting strictly after the current queue end.
const dates = [];
let probe = Date.parse(cur + 'T00:00:00Z');
while (dates.length < avail.length) {
  probe += 86400000;
  const d = iso(probe);
  if (POST_DAYS.includes(dow(d))) dates.push(d);
}

console.log(`\nFacebook lane. Page ${FB_PAGE_ID} via account ${FB_ACCOUNT_ID}.`);
console.log(`Queue currently ends: ${fbDates.length ? cur : '(empty)'}. Scheduling ${avail.length} posts, Mon/Thu/Sat at 8am MT.`);
console.log(live ? 'MODE: LIVE\n' : 'MODE: DRY RUN (add --live to fire)\n');

if (!live) {
  avail.forEach((b, i) => {
    console.log(`  ${dates[i]}  ${String(b.pillar).padEnd(14)} ${b.id}  ${b.headline.slice(0, 58)}`);
  });
  const needComment = avail.filter(b => resolveComment(b.firstComment));
  const unresolved = avail.filter(b => b.firstComment && !resolveComment(b.firstComment));
  console.log(`\n${avail.length} posts would be scheduled, covering through ${dates[avail.length - 1]}.`);
  console.log(`${needComment.length} need a manual first comment after publishing (Blotato does not post first comments).`);
  if (unresolved.length) {
    console.log(`\n⚠️  ${unresolved.length} first comments reference the group but GROUP_URL is not set,`);
    console.log('   so they will be SKIPPED. Create the group, then add to .blotato.env:');
    console.log('     GROUP_URL=https://facebook.com/groups/<your-group>');
  }
  process.exit(0);
}

// ---------------------------------------------------------------- post
async function blotatoPost(text, mediaUrl, scheduledTime) {
  for (let a = 0; a < 6; a++) {
    const body = {
      post: {
        accountId: FB_ACCOUNT_ID,
        content: { text, mediaUrls: [mediaUrl], platform: 'facebook' },
        target: { targetType: 'facebook', pageId: FB_PAGE_ID },
      },
      scheduledTime,
    };
    const r = await fetch(API + '/posts', { method: 'POST', headers: H, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (j.postSubmissionId) return { ok: true, id: j.postSubmissionId };
    const msg = j.error?.message || j.error || j.message || `HTTP ${r.status}`;
    if (r.status === 429 || /rate limit/i.test(String(msg))) {
      // Shared key with the CXC lane. Back off rather than starve the other agent.
      const m = /retry in (\d+)/i.exec(String(msg));
      await new Promise(s => setTimeout(s, ((m ? +m[1] : 30) + 3) * 1000));
      continue;
    }
    return { ok: false, id: String(msg) };
  }
  return { ok: false, id: 'RATE_LIMITED' };
}

if (!existsSync(CARDS)) mkdirSync(CARDS, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });

const outPath = path.join(__dirname, 'fb-scheduled.json');
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : [];
const manualComments = [];
let done = 0, contention = false;

for (let i = 0; i < avail.length; i++) {
  const b = avail[i];
  const date = dates[i];
  const idnum = b.id.replace(/[^a-z0-9]/gi, '');

  // Render the card. Non-CTA posts get the brand footer instead of the /sidekick URL:
  // Facebook suppresses reach on posts that push people off-platform, and the FB lane
  // runs a 9-give-to-1-ask ratio. Done here as a string swap so the shared renderer
  // used by the live LinkedIn/X engine is untouched.
  let html = cardHTML(b);
  if (!b.cta) {
    html = html.replace(
      /<span class="url">[^<]*<\/span>/,
      '<span class="brand">MODERN MUSTARD SEED</span>'
    );
  }
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  const file = path.join(CARDS, `fb-${idnum}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1200, height: 1200 } });

  const objectPath = `fb/${idnum}.png`;
  const up = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: readFileSync(file),
  });
  if (!up.ok) { console.log(`  upload failed ${b.id}: ${up.status}. Stopping.`); break; }
  const url = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;

  const text = b.fb.join('\n\n');
  const res = await blotatoPost(text, url, `${date}${TIME}`);
  if (res.id === 'RATE_LIMITED') {
    contention = true;
    console.log(`  ${date}  BACKED OFF (shared key rate-limited, likely a CXC batch). Re-run with --from=${startIdx + i}`);
    break;
  }

  b.used = true;
  done++;
  const comment = resolveComment(b.firstComment);
  out.push({ date, id: b.id, pillar: b.pillar, headline: b.headline, text, card: `cards/fb-${idnum}.png`, firstComment: comment });
  if (comment) manualComments.push({ date, id: b.id, comment });
  console.log(`  ${date}  ${String(b.pillar).padEnd(14)} ${b.id}  ${res.ok ? 'ok' : 'FAILED: ' + res.id}`);
  await new Promise(s => setTimeout(s, 1200));
}

await browser.close();
writeFileSync(path.join(__dirname, BANK_FILE), JSON.stringify(bank, null, 2));
writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(`\nScheduled ${done}. Bank remaining: ${bank.filter(b => !b.used).length}.`);
if (contention) console.log('Stopped early on shared-key contention. Safe to re-run later.');
if (manualComments.length) {
  console.log('\n⚠️  MANUAL FIRST COMMENT NEEDED (Blotato cannot post first comments).');
  console.log('   On each date below, open the published post and add the comment yourself:');
  for (const m of manualComments) console.log(`   ${m.date}  ${m.id}  "${m.comment}"`);
}
console.log('\nReels are NOT scheduled by this script. Shoot and post those natively (REELS-24.md).');
