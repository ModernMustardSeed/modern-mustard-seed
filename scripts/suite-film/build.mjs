/**
 * THE SUITE FILM: one film per lead, cut from their own suite.
 *
 * Sarah's order, 2026-08-01: the video at the top of a Demo Suite must be a
 * fresh recording of THAT lead's website, THAT lead's voice agent and THAT
 * lead's command center. It had been serving the Wills Electric tour film to
 * everyone, which is exactly the kind of thing a prospect notices.
 *
 * The film is now the LAST STEP of the forge. The suite is not announced to
 * anyone until it exists, so nothing goes out half-made.
 *
 * Run:
 *   node scripts/suite-film/build.mjs --lead <leadId>
 *   node scripts/suite-film/build.mjs --hub  <hubDemoId>
 *   node scripts/suite-film/build.mjs --lead <id> --keep     (leave the work dir)
 *
 * Exits non-zero on failure and writes the reason onto the lead row, so the
 * worker can knock again later and a human can see what went wrong.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { filmScript } from './lines.mjs';
import { speak, NARRATOR, CALLER } from './tts.mjs';
import { openCard, closeCard } from './cards.mjs';
import { record } from './record.mjs';
import { compose, buildCallerWav, audibleFraction } from './compose.mjs';
import { publishBlockerError } from '../../lib/site-asset-refs.mjs';

const SITE_URL = process.env.SUITE_FILM_SITE_URL || 'https://modernmustardseed.com';
const BUCKET = 'booth';
const KEEP = process.argv.includes('--keep');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : null;
};

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
  console.error('Missing supabase url or service role key in env/.env.local.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(new Date().toISOString(), ...a);

/**
 * A call that connects is NOT a call that works: Krisp deafness and the Daily
 * teardown race both produce calls that look live and transcribe zero caller
 * turns (memory: debugging_vapi_web_voice). Shipping a film of an agent
 * ignoring a customer would actively lose the sale, so the transcript is
 * checked and a deaf call fails the whole film.
 */
async function assertAgentHeardTheCaller(callId) {
  const key = env.VAPI_API_KEY || env.VAPI_PRIVATE_KEY || env.vapi_api_key;
  if (!callId || !key) {
    log('  ! could not verify the call transcript (no call id or VAPI_API_KEY); shipping on the audio capture alone');
    return;
  }
  // The transcript is finalized AFTER the call ends, so `status: 'ended'` is
  // not permission to judge it. An earlier version failed on the first ended
  // poll and reported a perfectly good call as deaf.
  let last = null;
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(`https://api.vapi.ai/call/${callId}`, { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) continue;
    const call = await res.json();
    last = call;
    if (/(^|\n)\s*User:/i.test(call?.transcript || '')) {
      log('  transcript confirms the agent heard the caller');
      return;
    }
  }
  if (last?.status === 'ended') {
    throw new Error(
      `the staged call transcribed no caller turns (endedReason: ${last.endedReason}). Either the agent never ` +
      'heard the caller (the Krisp-deafness signature, see lib/vapi-web.ts and memory debugging_vapi_web_voice) ' +
      'or the caller spoke over the greeting (see the lead-silence note in compose.mjs buildCallerWav).',
    );
  }
  log('  ! transcript never arrived in time; shipping on the audio capture alone');
}

async function main() {
  const leadId = arg('--lead');
  const hubId = arg('--hub');
  if (!leadId && !hubId) {
    console.error('Pass --lead <leadId> or --hub <hubDemoId>.');
    process.exit(2);
  }

  const q = supabase
    .from('outbound_leads')
    .select('id, business_name, contact_name, city, state, niche, demo_url, demo_run_id, site_demo_id, site_demo_url, site_demo_status, os_demo_url, os_demo_status, hub_demo_id, hub_demo_url');
  const { data: lead } = await (leadId ? q.eq('id', leadId) : q.eq('hub_demo_id', hubId)).maybeSingle();
  if (!lead) {
    console.error('No such lead.');
    process.exit(2);
  }

  const have = {
    site: lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url),
    os: lead.os_demo_status === 'ready' && Boolean(lead.os_demo_url),
    call: Boolean(lead.demo_run_id),
  };
  if (!have.site && !have.os) {
    console.error('Nothing forged yet worth filming (no ready website, no ready command center).');
    process.exit(2);
  }
  // The call rides on the website shell, so with no site there is nothing to
  // click the pill on.
  if (!have.site) have.call = false;

  // A CAMERA HAS NO TASTE. IT WILL FILM AN EMPTY PAGE AND REPORT READY.
  //
  // status='ready' says a build finished, not that it is worth showing. On
  // 2026-08-03 Polly Thompson's site banked with five of its nine photographs
  // replaced by blank swatches, and this script filmed them, marked the film
  // ready, and the suite-ready email went out ninety seconds later with that
  // walkthrough at the top of it. The film is the LAST step of the forge and
  // the announcement is gated on it, so refusing here is the cheapest place in
  // the whole pipeline to stop a hollow suite: no film means no email, which is
  // exactly the behaviour the worker already documents.
  if (have.site && lead.site_demo_id) {
    const { data: siteRow } = await supabase
      .from('outbound_demo_sites')
      .select('html')
      .eq('id', lead.site_demo_id)
      .maybeSingle();
    const unshowable = siteRow?.html ? publishBlockerError(siteRow.html) : 'the demo row has no html to film';
    if (unshowable) {
      const reason = `refusing to film: ${unshowable}`;
      log(reason);
      await supabase
        .from('outbound_leads')
        .update({ suite_film_status: 'failed', suite_film_error: reason })
        .eq('id', lead.id);
      process.exit(1);
    }
  }

  const workDir = path.join(os.homedir(), 'mms-suite-films', lead.id);
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  await supabase
    .from('outbound_leads')
    .update({ suite_film_status: 'filming', suite_film_error: null })
    .eq('id', lead.id);

  try {
    const { data: osRow } = lead.os_demo_url
      ? await supabase.from('outbound_demo_os').select('config').eq('lead_id', lead.id).maybeSingle()
      : { data: null };
    const config = osRow?.config || {};

    const { biz, beats } = filmScript({ lead, config, have });
    log(`filming ${biz} (${beats.length} beats; site:${have.site} call:${have.call} os:${have.os})`);

    /* ------------------------------ the voices ----------------------------- */
    // In parallel: eleven sequential TTS round trips took two and a half
    // minutes of the forge queue for no reason, and the lines do not depend on
    // each other. A single failure still rejects the whole film, which is the
    // behavior we want (no film beats a film missing a line).
    log('narration...');
    await Promise.all(
      beats.map(async (beat, i) => {
        if (!beat.vo) return;
        const out = path.join(workDir, `vo-${String(i).padStart(2, '0')}-${beat.id}.mp3`);
        const { durationMs } = await speak(beat.vo, NARRATOR, out);
        beat.voFile = out;
        // A held beat with zero air reads as a jump cut, so every line gets a
        // short breath after it.
        beat.voMs = durationMs + 700;
      }),
    );

    let callerWav = null;
    let callerMs = 0;
    const callBeat = beats.find((b) => b.kind === 'call');
    if (callBeat) {
      log('the caller...');
      const turnFiles = [];
      for (const [i, turn] of callBeat.turns.entries()) {
        const out = path.join(workDir, `caller-${i}.mp3`);
        await speak(turn, CALLER, out);
        turnFiles.push(out);
      }
      const built = await buildCallerWav({ turnFiles, out: path.join(workDir, 'caller.wav') });
      callerWav = built.file;
      callerMs = built.durationMs;
      log(`  caller track ${(callerMs / 1000).toFixed(1)}s`);
    }

    /* ------------------------------- the take ------------------------------ */
    log('rolling...');
    const take = await record({
      workDir,
      siteUrl: lead.site_demo_url,
      osUrl: lead.os_demo_url,
      cards: {
        open: openCard({ business: biz }),
        close: closeCard({ business: biz, hubUrl: lead.hub_demo_url || `${SITE_URL}/demo/hub/${lead.hub_demo_id}` }),
      },
      beats,
      callerWav,
      callerMs,
      log,
    });

    if (callBeat) await assertAgentHeardTheCaller(take.callId);

    /* -------------------------------- the cut ------------------------------ */
    log('cutting...');
    const tracks = [];
    for (const [i, beat] of beats.entries()) {
      if (!beat.voFile) continue;
      const t = take.beats.find((b) => b.id === beat.id);
      if (t) tracks.push({ file: beat.voFile, atMs: t.atMs, gain: 1 });
    }
    if (take.callAudioB64 && take.callAudioOffsetMs != null) {
      const callFile = path.join(workDir, 'call.webm');
      writeFileSync(callFile, Buffer.from(take.callAudioB64, 'base64'));
      // The call is the reason this film exists, so measure it rather than
      // assume it. A capture that is mostly silence means one side of the
      // conversation is missing (see audibleFraction), and that has shipped
      // once already looking green the whole way.
      const heard = await audibleFraction(callFile);
      log(`  call audio is ${(heard * 100).toFixed(0)}% sound`);
      if (heard < 0.35) {
        throw new Error(
          `the captured call is only ${(heard * 100).toFixed(0)}% sound, so a side of it is missing. ` +
          'Check the Web Audio tap in record.mjs (a bare MediaStream records remote WebRTC tracks as silence).',
        );
      }
      tracks.push({ file: callFile, atMs: take.callAudioOffsetMs, gain: 1.35 });
    } else if (callBeat) {
      throw new Error('the call was staged but no audio came back from it');
    }

    const bed = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'bed.mp3');
    const outMp4 = path.join(workDir, 'suite-film.mp4');
    const outPoster = path.join(workDir, 'suite-film.jpg');
    const cut = await compose({
      workDir,
      raw: take.raw,
      scoreMs: take.scoreMs,
      tracks,
      bed: existsSync(bed) ? bed : null,
      outMp4,
      outPoster,
      posterAtMs: take.posterAtMs,
      log,
    });

    /* ------------------------------- delivery ------------------------------ */
    log('uploading...');
    const filmPath = `suite/${lead.id}.mp4`;
    const posterPath = `suite/${lead.id}.jpg`;
    for (const [p, file, type] of [
      [filmPath, cut.mp4, 'video/mp4'],
      [posterPath, cut.poster, 'image/jpeg'],
    ]) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(p, readFileSync(file), { contentType: type, upsert: true });
      if (error) throw new Error(`upload of ${p} failed: ${error.message}`);
    }

    await supabase
      .from('outbound_leads')
      .update({
        suite_film_status: 'ready',
        suite_film_path: filmPath,
        suite_film_at: new Date().toISOString(),
        suite_film_seconds: Math.round(cut.seconds),
        suite_film_error: null,
      })
      .eq('id', lead.id);

    await supabase.from('messages').insert({
      outbound_lead_id: lead.id,
      direction: 'outbound',
      channel: 'note',
      from_addr: 'cockpit',
      to_addr: lead.business_name,
      subject: 'Suite film cut',
      snippet: `Their own ${Math.round(cut.seconds)}s suite film is on the hub: their website, a live call with their agent, and their command center.`,
      read: true,
      occurred_at: new Date().toISOString(),
    });

    log(`READY ${lead.business_name} ${Math.round(cut.seconds)}s`);
    if (!KEEP) rmSync(path.join(workDir, 'raw'), { recursive: true, force: true });
    process.exit(0);
  } catch (err) {
    const msg = String(err?.message || err).slice(0, 500);
    log('FAILED', msg);
    await supabase
      .from('outbound_leads')
      .update({ suite_film_status: 'failed', suite_film_error: msg })
      .eq('id', lead.id);
    process.exit(1);
  }
}

main();
