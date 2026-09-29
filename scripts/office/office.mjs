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
 *
 * Output is plain text written for the agent that ran it.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
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

  default:
    console.log('office.mjs <note|deliver|ask|progress|state>. See the header of this file.');
    process.exit(cmd ? 1 : 0);
}
