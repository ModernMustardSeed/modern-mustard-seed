/**
 * Render one built site's hostess tour to audio.
 *
 *   node scripts/site-tour/build.mjs --site <siteDemoId>
 *   node scripts/site-tour/build.mjs --site <id> --dry     (script only, no TTS)
 *
 * Same voice as the suite film (Ava, free Edge neural), because Sarah picked
 * that one by ear: "i love the glimmer video and voice." The clips are rendered
 * ONCE, here, and served as static audio. A tour that called a TTS API per
 * visitor would put a per-pageview cost on a marketing site, which is exactly
 * the shape of leak that memory:feedback_never_leak_revenue exists to stop.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildTour } from '../../lib/site-tour.mjs';
import { speak, NARRATOR } from '../suite-film/tts.mjs';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local */ }

const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing supabase url or service role key.');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BUCKET = 'booth';
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const DRY = process.argv.includes('--dry');
const siteId = arg('--site');
if (!siteId) { console.error('need --site <siteDemoId>'); process.exit(1); }
const log = (...a) => console.log(new Date().toISOString(), ...a);

const { data: site, error } = await sb
  .from('outbound_demo_sites')
  .select('id,lead_id,business_name,html,status')
  .eq('id', siteId)
  .maybeSingle();
if (error || !site) { console.error('site not found:', error?.message); process.exit(1); }
if (!site.html) { console.error('site has no html yet'); process.exit(1); }

const tour = buildTour(site.html, { business: site.business_name });
log(`tour for ${site.business_name}: ${tour.beats.length} beats, palette ${JSON.stringify(tour.palette)}`);
for (const b of tour.beats) log(`  [${b.id}] -> #${b.anchor}  ${b.text.slice(0, 90)}...`);

// ⚠️ A tour with one stop is not a tour. Rather than ship a hostess who says
// hello and stops, refuse and leave the site exactly as it is.
if (tour.beats.length < 3) {
  console.error(`only ${tour.beats.length} beats survived the honesty filters; refusing to publish a stub tour`);
  process.exit(2);
}
if (DRY) { log('dry run, no audio'); process.exit(0); }

const workDir = path.join(os.homedir(), 'mms-site-tours', siteId);
mkdirSync(workDir, { recursive: true });

const beats = [];
let totalMs = 0;
for (const [i, beat] of tour.beats.entries()) {
  const file = path.join(workDir, `${String(i).padStart(2, '0')}-${beat.id}.mp3`);
  const r = await speak(beat.text, NARRATOR, file);
  const key = `tour/${siteId}/${String(i).padStart(2, '0')}-${beat.id}.mp3`;
  const bytes = readFileSync(file);
  const up = await sb.storage.from(BUCKET).upload(key, bytes, { contentType: 'audio/mpeg', upsert: true });
  if (up.error) throw new Error(`upload ${key}: ${up.error.message}`);
  beats.push({ id: beat.id, anchor: beat.anchor, text: beat.text, ms: r.durationMs, key });
  totalMs += r.durationMs;
  log(`  rendered ${beat.id} (${(r.durationMs / 1000).toFixed(1)}s, ${r.engine})`);
}

const manifest = {
  siteId,
  leadId: site.lead_id,
  business: site.business_name,
  palette: tour.palette,
  beats,
  totalMs,
  builtAt: new Date().toISOString(),
};
const key = `site_tour:${siteId}`;
const { data: existing } = await sb.from('app_state').select('key').eq('key', key).maybeSingle();
const res = existing
  ? await sb.from('app_state').update({ value: manifest, updated_at: manifest.builtAt }).eq('key', key)
  : await sb.from('app_state').insert({ key, value: manifest });
if (res.error) throw new Error(`manifest: ${res.error.message}`);

if (!process.argv.includes('--keep')) rmSync(workDir, { recursive: true, force: true });
log(`READY ${site.business_name}: ${beats.length} beats, ${(totalMs / 1000).toFixed(0)}s`);
