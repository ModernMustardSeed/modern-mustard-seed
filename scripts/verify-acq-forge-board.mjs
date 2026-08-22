/**
 * Run the forge board's own logic against the REAL acquisition database and
 * print what it finds, so the numbers on the board are checked rather than
 * assumed.
 *
 *   node scripts/verify-acq-forge-board.mjs
 *
 * Read-only. It never forges, never sends, and never writes a row.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

/* .env.local, parsed by hand so this runs outside Next. */
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error('No Supabase URL or service key in .env.local');
const db = createClient(url, key, { auth: { persistSession: false } });

const LEAD_COLS =
  'id,business_name,contact_name,email,phone,website,city,state,trade,rating,review_count,lead_score,' +
  'acq_stage,acq_campaign_id,consent_status,consent_at,call_stage,call_attempts,last_call_at,' +
  'demo_status,demo_url,demo_emailed_at,site_demo_id,site_demo_url,site_demo_status,os_demo_id,os_demo_url,' +
  'hub_demo_id,hub_demo_url,suite_film_status,checkout_sent_at,client_status,unsubscribed_at,is_test,' +
  'reservoir_state,created_at,updated_at';

const FORGED_FILTER = 'demo_url.not.is.null,site_demo_id.not.is.null,os_demo_id.not.is.null,hub_demo_id.not.is.null';

const ENGAGEMENT_TYPES = [
  'email_opened', 'link_clicked', 'permission_visited', 'consent_captured', 'consent_revoked',
  'call_queued', 'call_started', 'call_completed', 'call_failed', 'call_inbound', 'reply',
  'meeting_booked', 'purchased',
];

function suiteState(l) {
  const siteReady = l.site_demo_status === 'ready' && !!l.site_demo_url;
  const siteBusy = l.site_demo_status === 'queued' || l.site_demo_status === 'building';
  const siteFailed = l.site_demo_status === 'failed';
  const pieces =
    (l.demo_url ? 1 : 0) + (siteReady ? 1 : 0) + (l.os_demo_url ? 1 : 0) + (l.suite_film_status === 'ready' ? 1 : 0);
  let stage;
  if (l.unsubscribed_at || ['client', 'lost'].includes(l.acq_stage) || l.client_status === 'client') stage = 'closed';
  else if (siteBusy) stage = 'forging';
  else if (siteFailed) stage = 'failed';
  else if (l.demo_emailed_at) stage = 'sent';
  else if (l.demo_url || siteReady || l.os_demo_url) stage = 'built';
  else stage = 'unforged';
  return { stage, pieces };
}

function segmentFor(l, suite, move) {
  if (suite.stage === 'closed') return 'closed';
  if (suite.stage === 'forging') return 'forging';
  if (suite.stage === 'failed') return 'failed';
  if (suite.stage === 'sent') return 'sent';
  if (suite.stage === 'built') return 'built';
  if (l.call_stage === 'completed') return 'called';
  if (l.consent_status === 'granted') return 'consented';
  if (move.visitedDoor) return 'door';
  if (move.clicked || move.replied) return 'warm';
  if (move.opened) return 'opened';
  return 'cold';
}

const t0 = Date.now();

/* 1. everything already forged */
const forged = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db
    .from('outbound_leads').select(LEAD_COLS).or(FORGED_FILTER)
    .order('updated_at', { ascending: false }).range(from, from + 999);
  if (error) throw new Error(`forged: ${error.message}`);
  forged.push(...data);
  if (data.length < 1000) break;
}

/* 2. the engagement timeline, ninety days */
const since = new Date(Date.now() - 90 * 86400000).toISOString();
const events = [];
for (let from = 0; from < 8000; from += 1000) {
  const { data, error } = await db
    .from('acq_events').select('*').in('type', ENGAGEMENT_TYPES)
    .gte('occurred_at', since).order('occurred_at', { ascending: false }).range(from, from + 999);
  if (error) throw new Error(`events: ${error.message}`);
  events.push(...data);
  if (data.length < 1000) break;
}

let machineHits = 0;
const movement = new Map();
for (const e of events) {
  if (!e.lead_id) continue;
  if (e.detail?.machine === true) { machineHits++; continue; }
  let m = movement.get(e.lead_id);
  if (!m) { m = { opened: false, clicked: false, visitedDoor: false, replied: false, lastAt: null, hits: 0 }; movement.set(e.lead_id, m); }
  if (e.type === 'email_opened') m.opened = true;
  else if (e.type === 'link_clicked') m.clicked = true;
  else if (e.type === 'permission_visited') m.visitedDoor = true;
  else if (e.type === 'reply') m.replied = true;
  else continue;
  m.hits++;
  if (!m.lastAt || e.occurred_at > m.lastAt) m.lastAt = e.occurred_at;
}

/* 3. the rest of the working set */
const byId = new Map(forged.map((l) => [l.id, l]));
const need = new Set([...movement.keys()].filter((id) => !byId.has(id)));

const preOpeners = new Set();
{
  const { data } = await db.from('outbound_leads').select('id')
    .not('acq_campaign_id', 'is', null).gt('email_open_count', 0)
    .order('last_open_at', { ascending: false, nullsFirst: false }).limit(2000);
  for (const r of data ?? []) { preOpeners.add(r.id); if (!byId.has(r.id)) need.add(r.id); }
}
{
  const { data } = await db.from('outbound_leads').select('id')
    .not('acq_campaign_id', 'is', null).or('consent_status.eq.granted,call_stage.eq.completed')
    .order('updated_at', { ascending: false }).limit(2000);
  for (const r of data ?? []) if (!byId.has(r.id)) need.add(r.id);
}

const wanted = [...need].slice(0, 6000);
for (let i = 0; i < wanted.length; i += 40) {
  const { data, error } = await db.from('outbound_leads').select(LEAD_COLS).in('id', wanted.slice(i, i + 40));
  if (error) throw new Error(`chunk: ${error.message}`);
  for (const r of data) byId.set(r.id, r);
}

const leads = [...byId.values()].filter((l) => !l.is_test);

const counts = { forging: 0, failed: 0, door: 0, warm: 0, opened: 0, consented: 0, called: 0, built: 0, sent: 0, cold: 0, closed: 0, all: 0 };
const sample = { door: [], warm: [], opened: [], built: [], failed: [] };
for (const l of leads) {
  const suite = suiteState(l);
  const move = movement.get(l.id) ?? { opened: false, clicked: false, visitedDoor: false, replied: false, lastAt: null, hits: 0 };
  if (!move.opened && preOpeners.has(l.id)) { move.opened = true; move.hits = Math.max(move.hits, 1); }
  const seg = segmentFor(l, suite, move);
  counts[seg]++; counts.all++;
  if (sample[seg] && sample[seg].length < 4) {
    sample[seg].push(`${l.business_name} (${[l.city, l.state].filter(Boolean).join(', ') || 'no location'}) · ${suite.pieces} piece(s)${l.email ? '' : ' · NO EMAIL'}`);
  }
}

/* 4. site build rows, fetched by their own ids */
const siteIds = leads.map((l) => l.site_demo_id).filter(Boolean);
let siteRows = 0;
for (let i = 0; i < siteIds.length; i += 40) {
  const { data, error } = await db.from('outbound_demo_sites')
    .select('id, status, kind, error, created_at, claimed_at, built_at').in('id', siteIds.slice(i, i + 40));
  if (error) throw new Error(`sites: ${error.message}`);
  siteRows += data.length;
}

/* 5. the personal-video list */
let videos = 0;
{
  const { data, error } = await db.storage.from('booth').list('founder', { limit: 1000 });
  if (error) console.log('  (booth list refused:', error.message + ')');
  else videos = data.filter((f) => /^[0-9a-f-]{36}\.webm$/i.test(f.name)).length;
}

/* 6. the worker heartbeat */
const { data: health } = await db.from('app_state').select('value').eq('key', 'forge_worker_health').maybeSingle();

const ms = Date.now() - t0;
console.log('\n================ THE ACQUISITION FORGE BOARD, ON REAL DATA ================\n');
console.log('already forged        :', forged.length);
console.log('engagement events     :', events.length, `(${machineHits} were scanners and were dropped)`);
console.log('people who moved      :', movement.size);
console.log('pre-timeline openers  :', preOpeners.size);
console.log('working set           :', leads.length, `(${need.size > wanted.length ? need.size - wanted.length : 0} left off by the cap)`);
console.log('website build rows    :', siteRows, `across ${siteIds.length} prospects with a site`);
console.log('videos attached       :', videos);
console.log('forge worker          :', health?.value ? `${health.value.state}, last heard ${Math.round((Date.now() - new Date(health.value.at)) / 1000)}s ago` : 'never reported in');
console.log('\nBUCKETS');
for (const [k, v] of Object.entries(counts)) if (k !== 'all') console.log(`  ${k.padEnd(11)} ${String(v).padStart(6)}`);
console.log(`  ${'TOTAL'.padEnd(11)} ${String(counts.all).padStart(6)}`);
console.log('');
console.log('HEADLINE  Interested, never gave a number:', counts.door + counts.warm + counts.opened,
  `(${counts.door} reached the door, ${counts.warm} clicked, ${counts.opened} opened only)`);
const builtNoEmail = leads.filter((l) => !l.email && suiteState(l).stage === 'built').length;
console.log('Built suites with NO email address (phone only, cannot be mailed):', builtNoEmail, 'of', counts.built);
console.log('\nSAMPLES');
for (const [k, v] of Object.entries(sample)) {
  console.log(` ${k}:`);
  if (!v.length) console.log('   (none)');
  for (const line of v) console.log('   -', line);
}
console.log(`\nwhole board assembled in ${ms}ms\n`);
