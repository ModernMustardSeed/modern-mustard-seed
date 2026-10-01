#!/usr/bin/env node
/**
 * THE OFFICE CLI: how an agent on the floor talks back to Yield.
 *
 * The worker starts every agent with OFFICE_TASK_ID, OFFICE_MISSION_ID,
 * OFFICE_AGENT and OFFICE_ENV_FILE in its environment, so a call is only ever
 * about the task that made it:
 *
 *   node office.mjs note "Found 42 new-doors restaurants in Missoula"
 *   node office.mjs deliver --kind script --title "Discovery call script" --file C:\...\script.md
 *   node office.mjs deliver --kind link --title "Webinar sign-up page" --url https://...
 *   node office.mjs ask --question "Send this DM to 40 owners?" --detail "<the exact words>"
 *   node office.mjs progress --add 1 --note "Buffalo Saloon booked Thu 10am"
 *   node office.mjs state
 *   node office.mjs browser take      (before any Chrome work; waits out a Rep shift)
 *   node office.mjs browser release   (the moment the browser work is done)
 *
 * Output is plain text written for the agent that ran it.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , cmd, ...rest] = process.argv;

function flags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i += 1; }
    } else out._.push(a);
  }
  return out;
}

const f = flags(rest);
const TASK = process.env.OFFICE_TASK_ID || f.task || null;
const MISSION = process.env.OFFICE_MISSION_ID || f.mission || null;
const AGENT = process.env.OFFICE_AGENT || f.agent || 'sower';

const envFile = process.env.OFFICE_ENV_FILE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.env.local');
const env = { ...process.env };
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const url = env.SUPABASE_URL || env.supabase_url || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!url || !key) {
  console.error('office: cannot reach the office database (no Supabase env). Tell Sower in your report.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

async function feed(text, kind = 'note') {
  await sb.from('office_events').insert({ agent: AGENT, text: String(text).slice(0, 400), kind, mission_id: MISSION, task_id: TASK });
}

function fail(msg) {
  console.error(`office: ${msg}`);
  process.exit(1);
}

/*
 * THE BROWSER LOCK. Sarah's Chrome is one browser shared by the Rep's shifts
 * and the floor, and two sessions clicking in it at once send keys into the
 * wrong chat. rep/shift.lock already keeps Rep shifts apart: its first line is
 * the PID of whoever drives Chrome, and a shift waits while that PID lives.
 * The floor takes the same lock. A small detached keeper holds it, so the
 * PID stays alive exactly as long as the agent's session does, and the lock
 * clears itself when that session ends or after OFFICE_BROWSER_MAX_MIN.
 */
const BROWSER_LOCK = env.OFFICE_BROWSER_LOCK || path.join(env.OFFICE_WORKSPACE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..'), 'rep', 'shift.lock');
const BROWSER_MAX_MIN = Number(env.OFFICE_BROWSER_MAX_MIN || 45);

function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function readLock() {
  if (!existsSync(BROWSER_LOCK)) return null;
  const [first = '', second = ''] = readFileSync(BROWSER_LOCK, 'utf8').split(/\r?\n/);
  const pid = Number.parseInt(first.trim(), 10);
  return { pid, yours: second.startsWith('yield'), label: second.trim(), live: alive(pid) };
}

/** The claude process this command runs under, so the lock dies with the session. */
function sessionPid() {
  if (process.platform !== 'win32') return process.ppid;
  try {
    const rows = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress'], { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 }));
    const byPid = new Map(rows.map((r) => [r.ProcessId, r]));
    let cur = byPid.get(process.pid);
    for (let i = 0; cur && i < 12; i += 1) {
      if (/^claude(\.exe)?$/i.test(cur.Name) && cur.ProcessId !== process.pid) return cur.ProcessId;
      cur = byPid.get(cur.ParentProcessId);
    }
  } catch { /* fall through to the time limit alone */ }
  return 0;
}

async function browser(sub, args) {
  if (sub === 'take') {
    const held = readLock();
    if (held?.live && !held.yours) {
      console.log(`busy: a Rep shift (pid ${held.pid}) is driving Chrome. Do not touch the browser. Finish your other work, then run "browser take" again in 5 minutes. If it is still busy after 30 minutes, say so in your report.`);
      process.exit(2);
    }
    if (held?.live && held.yours) {
      console.log(`busy: another floor session holds Chrome (${held.label}). Run "browser take" again in 2 minutes.`);
      process.exit(2);
    }
    const owner = sessionPid();
    const keeper = spawn(process.execPath, [fileURLToPath(import.meta.url), 'browser', '_keep', String(owner)], { detached: true, stdio: 'ignore', windowsHide: true, env: process.env });
    keeper.unref();
    writeFileSync(BROWSER_LOCK, `${keeper.pid}\nyield ${AGENT}${TASK ? ` task ${TASK}` : ''} ${new Date().toISOString()}\n`);
    await feed('Took the browser', 'note');
    console.log(`Chrome is yours for up to ${BROWSER_MAX_MIN} minutes. Rep shifts wait until you run "browser release". Release it the moment you are done.`);
    return;
  }
  if (sub === 'release') {
    const held = readLock();
    if (!held || !held.yours) { console.log('Nothing to release: the floor does not hold the browser.'); return; }
    try { process.kill(held.pid); } catch { /* already gone */ }
    try { unlinkSync(BROWSER_LOCK); } catch { /* already gone */ }
    console.log('Released. Rep shifts can use Chrome again.');
    return;
  }
  if (sub === 'status') {
    const held = readLock();
    console.log(!held || !held.live ? 'free' : held.yours ? `held by the floor (${held.label})` : `held by a Rep shift (pid ${held.pid})`);
    return;
  }
  if (sub === '_keep') {
    const owner = Number.parseInt(args[0] ?? '0', 10);
    const until = Date.now() + BROWSER_MAX_MIN * 60_000;
    await new Promise(() => {
      const tick = setInterval(() => {
        const held = readLock();
        if (!held || held.pid !== process.pid) { clearInterval(tick); process.exit(0); }
        if ((owner && !alive(owner)) || Date.now() > until) {
          try { unlinkSync(BROWSER_LOCK); } catch { /* gone */ }
          clearInterval(tick);
          process.exit(0);
        }
      }, 10_000);
    });
  }
  fail('browser take | release | status');
}

const KINDS = ['script', 'offer', 'product', 'link', 'file', 'copy', 'list', 'report', 'note'];

switch (cmd) {
  case 'note': {
    const text = f._.join(' ').trim() || (typeof f.text === 'string' ? f.text : '');
    if (!text) fail('note needs text: office.mjs note "what happened"');
    await feed(text);
    console.log('On the feed.');
    break;
  }

  case 'deliver': {
    const kind = KINDS.includes(f.kind) ? f.kind : 'note';
    const title = typeof f.title === 'string' ? f.title.trim() : '';
    if (!title) fail('deliver needs --title');
    let body = typeof f.body === 'string' ? f.body : null;
    let link = typeof f.url === 'string' ? f.url : null;
    if (typeof f.file === 'string') {
      if (!existsSync(f.file)) fail(`no file at ${f.file}`);
      const ext = path.extname(f.file).toLowerCase();
      if (['.md', '.txt', '.csv', '.json', '.html'].includes(ext)) body = readFileSync(f.file, 'utf8').slice(0, 60000);
      else body = `${body ? `${body}\n\n` : ''}File on the workstation: ${path.resolve(f.file)}`;
    }
    if (!body && !link) fail('deliver needs --body, --url or --file');
    const { error } = await sb.from('office_deliverables').insert({ mission_id: MISSION, task_id: TASK, agent: AGENT, kind, title: title.slice(0, 200), body, url: link });
    if (error) fail(error.message);
    await feed(`Delivered ${kind}: ${title}`, 'deliver');
    console.log(`Delivered to Sarah's shelf: ${title}`);
    break;
  }

  case 'ask': {
    const question = typeof f.question === 'string' ? f.question.trim() : f._.join(' ').trim();
    if (!question) fail('ask needs --question');
    const detail = typeof f.detail === 'string' ? f.detail.slice(0, 8000) : null;
    const { data, error } = await sb.from('office_approvals').insert({ mission_id: MISSION, task_id: TASK, agent: AGENT, question: question.slice(0, 500), detail }).select('id').single();
    if (error) fail(error.message);
    await feed(`Asked Sarah: ${question}`, 'ask');
    console.log(`Held for Sarah (approval ${data.id}). End your turn now: say in one line what you are waiting on. You will be resumed in this session with her answer.`);
    break;
  }

  case 'progress': {
    if (!MISSION) fail('progress only works inside a mission');
    const { data: m } = await sb.from('office_missions').select('metric_current, metric_target, metric_label').eq('id', MISSION).single();
    const add = Number(f.add);
    const set = Number(f.set);
    const next = Number.isFinite(set) && f.set !== undefined ? set : Number(m.metric_current) + (Number.isFinite(add) ? add : 1);
    const { error } = await sb.from('office_missions').update({ metric_current: next, updated_at: new Date().toISOString() }).eq('id', MISSION);
    if (error) fail(error.message);
    const note = typeof f.note === 'string' ? ` (${f.note})` : '';
    await feed(`Score ${next}${m.metric_target ? ` of ${m.metric_target}` : ''} ${m.metric_label ?? ''}${note}`.trim(), 'progress');
    console.log(`Score is ${next}${m.metric_target ? ` of ${m.metric_target}` : ''}.`);
    break;
  }

  case 'state': {
    if (!MISSION) fail('state only works inside a mission');
    const [{ data: m }, { data: tasks }, { data: shelf }, { data: asks }] = await Promise.all([
      sb.from('office_missions').select('*').eq('id', MISSION).single(),
      sb.from('office_tasks').select('agent, title, status, output, last_action').eq('mission_id', MISSION).order('position'),
      sb.from('office_deliverables').select('agent, kind, title, url').eq('mission_id', MISSION).order('created_at'),
      sb.from('office_approvals').select('agent, question, status, answer_note').eq('mission_id', MISSION).order('created_at'),
    ]);
    console.log(`MISSION ${m.title} [${m.status}]\nGoal: ${m.goal}\nScore: ${m.metric_current}${m.metric_target ? ` of ${m.metric_target}` : ''} ${m.metric_label ?? ''}${m.due_on ? `\nDue: ${m.due_on}` : ''}\n`);
    for (const t of tasks ?? []) console.log(`## ${t.agent}: ${t.title} [${t.status}]\n${(t.output || t.last_action || '').slice(0, 2500)}\n`);
    if (shelf?.length) console.log(`DELIVERED\n${shelf.map((d) => `- ${d.agent} ${d.kind}: ${d.title}${d.url ? ` ${d.url}` : ''}`).join('\n')}\n`);
    if (asks?.length) console.log(`ASKED\n${asks.map((a) => `- ${a.agent} [${a.status}] ${a.question}${a.answer_note ? ` :: ${a.answer_note}` : ''}`).join('\n')}`);
    break;
  }

  case 'browser': {
    await browser(f._[0], f._.slice(1));
    break;
  }

  default:
    console.log('office.mjs <note|deliver|ask|progress|state|browser>. See the header of this file.');
    process.exit(cmd ? 1 : 0);
}
