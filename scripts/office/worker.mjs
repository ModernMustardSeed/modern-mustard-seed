/**
 * THE FLOOR AT YIELD.
 *
 * The admin writes; this runs. Every chat turn with Sower and every agent's
 * task is a row in office_jobs, and this resident worker on Sarah's
 * workstation claims it and runs Claude Code headless on the Max subscription.
 * Vercel cannot: it has no `claude` binary and never will (the Linux build is
 * larger than a function may be).
 *
 *   node scripts/office/worker.mjs
 *
 * WHAT AN AGENT CAN TOUCH. Each run starts in the workspace root (dev/mms by
 * default, OFFICE_WORKSPACE to change it) with Sarah's own Claude Code setup
 * loaded: her skills, CLAUDE.md, memory, hooks (the Warden included), and the
 * Claude in Chrome tools. Permission mode is `auto`, the same classifier Sarah
 * works under, so the destructive and the irreversible are refused by the
 * harness rather than by hope. What is Sarah's call (money, production, a new
 * message before its first send) the agents ask for through the office CLI.
 *
 * LANES. One chief lane answers chat so a two-hour build never makes Sarah
 * wait for a reply. OFFICE_LANES (default 2) task lanes run agents side by
 * side, each held until the machine has OFFICE_MIN_FREE_MB free, because the
 * build worker shares this laptop and has been OOM-killed at 0.9GB free.
 *
 * SUBSCRIPTION ONLY, BY CONSTRUCTION. ANTHROPIC_API_KEY and friends are
 * deleted from this process and from every child. A present key silently
 * flips the CLI onto metered billing.
 */
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chiefSystem, taskSystem } from './prompts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const CLI = path.join(HERE, 'office.mjs');
const ENV_FILE = path.join(REPO, '.env.local');

const env = { ...process.env };
try {
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {
  console.error(`office-worker: no ${ENV_FILE}. The worker needs the site repo's env to reach Supabase.`);
  process.exit(1);
}
for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL']) {
  delete env[k];
  delete process.env[k];
}

const SUPABASE_URL = env.SUPABASE_URL || env.supabase_url || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('office-worker: missing supabase url or service role key in .env.local.');
  process.exit(1);
}

const { AGENTS, AGENT_BY_KEY } = await import('../../lib/office/agents.ts');
const engine = await import('../../lib/office/engine.ts');

const WORKER = env.OFFICE_WORKER_NAME || `office-${os.hostname()}`;
const WORKSPACE = env.OFFICE_WORKSPACE || path.resolve(REPO, '..', '..');
const LANES = Math.max(1, Number(env.OFFICE_LANES || 2));
const MODEL = env.OFFICE_MODEL || 'opus';
const PERMISSION_MODE = env.OFFICE_PERMISSION_MODE || 'auto';
const MIN_FREE_MB = Number(env.OFFICE_MIN_FREE_MB || 1200);
const CHIEF_MIN_FREE_MB = Number(env.OFFICE_CHIEF_MIN_FREE_MB || 500);
const CHIEF_TIMEOUT_MS = Number(env.OFFICE_CHIEF_TIMEOUT_MS || 15 * 60 * 1000);
const TASK_TIMEOUT_MS = Number(env.OFFICE_TASK_TIMEOUT_MS || 2 * 60 * 60 * 1000);
const POLL_MS = Number(env.OFFICE_POLL_MS || 2000);

/** Spawn the real exe with no shell, so a long system prompt arrives intact as one argument. */
const CLAUDE_BIN = (() => {
  if (env.CLAUDE_BIN) return env.CLAUDE_BIN;
  const local = path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');
  return existsSync(local) ? local : 'claude';
})();

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(new Date().toISOString(), ...a);
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' }) + ', ' + new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long' });

/** job id -> { kind, agent, title, child } for the heartbeat and for shutdown. */
const running = new Map();
/** Every live claude process, so a shutdown never leaves one holding a Max session. */
const children = new Set();
let probes = {};
let stopping = false;

/* ------------------------------------------------------------------------- */
/* claude                                                                     */
/* ------------------------------------------------------------------------- */

function killTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => {});
  } else {
    try { child.kill('SIGKILL'); } catch { /* gone */ }
  }
}

/** A readable line for the live feed from one tool call. */
function describeTool(name, input = {}) {
  const short = (s, n = 110) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  if (name === 'Bash' || name === 'PowerShell') {
    const cmd = String(input.command ?? '');
    if (cmd.includes('office.mjs')) return null; // the CLI writes its own feed line
    return input.description ? short(input.description) : `Running ${short(cmd, 80)}`;
  }
  if (name === 'Read') return `Reading ${path.basename(String(input.file_path ?? ''))}`;
  if (name === 'Write') return `Writing ${path.basename(String(input.file_path ?? ''))}`;
  if (name === 'Edit') return `Editing ${path.basename(String(input.file_path ?? ''))}`;
  if (name === 'Grep' || name === 'Glob') return `Searching for ${short(input.pattern, 60)}`;
  if (name === 'WebSearch') return `Searching the web: ${short(input.query, 80)}`;
  if (name === 'WebFetch') return `Reading ${short(input.url, 90)}`;
  if (name === 'Skill') return `Loading the ${short(input.skill, 40)} skill`;
  if (name === 'Agent' || name === 'Task') return `Briefing a helper: ${short(input.description, 80)}`;
  if (name.startsWith('mcp__claude-in-chrome__')) {
    const verb = name.replace('mcp__claude-in-chrome__', '');
    if (verb === 'navigate') return `Opening ${short(input.url, 90)} in Chrome`;
    if (verb === 'computer') return `Working in Chrome (${short(input.action, 30)})`;
    if (verb === 'form_input') return 'Filling a form in Chrome';
    return `Chrome: ${verb.replace(/_/g, ' ')}`;
  }
  if (name.startsWith('mcp__')) return `Using ${name.split('__').slice(1).join(' ')}`;
  return `Using ${name}`;
}

/**
 * One headless Claude Code run. The prompt goes in on stdin; the stream comes
 * back as JSON lines, and every tool call becomes a feed line so Sarah can
 * watch the floor work. Resolves with the final text and the session id.
 */
function runClaude({ prompt, system, sessionId, resume, onAction, isCancelled, timeoutMs, extraEnv = {} }) {
  return new Promise((resolve) => {
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', PERMISSION_MODE, '--model', MODEL];
    if (system) args.push('--append-system-prompt', system);
    if (resume) args.push('--resume', resume);
    else if (sessionId) args.push('--session-id', sessionId);

    const child = spawn(CLAUDE_BIN, args, {
      cwd: WORKSPACE,
      env: { ...env, ...extraEnv },
      shell: CLAUDE_BIN === 'claude' && process.platform === 'win32',
      windowsHide: true,
    });
    children.add(child);
    child.on('close', () => children.delete(child));

    let buf = '';
    let stderr = '';
    let result = null;
    let sid = resume || sessionId || null;
    let isError = false;
    let lastText = '';
    let done = false;

    const finish = (code, why) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearInterval(watch);
      resolve({ code, result: result ?? lastText, sessionId: sid, isError: isError || code !== 0, stderr: `${stderr}${why ? `\n${why}` : ''}`.trim() });
    };

    const timer = setTimeout(() => { killTree(child); finish(124, `timed out after ${Math.round(timeoutMs / 60000)} min`); }, timeoutMs);
    const watch = setInterval(async () => {
      try {
        if (stopping || (isCancelled && (await isCancelled()))) { killTree(child); finish(130, 'stopped'); }
      } catch { /* a failed check is not a stop */ }
    }, 15_000);

    child.stdout.on('data', (d) => {
      buf += d.toString();
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let ev;
        try { ev = JSON.parse(line); } catch { continue; }
        if (ev.session_id) sid = ev.session_id;
        if (ev.type === 'assistant') {
          for (const block of ev.message?.content ?? []) {
            if (block.type === 'tool_use') {
              const text = describeTool(block.name, block.input);
              if (text) onAction?.(text);
            } else if (block.type === 'text' && block.text?.trim()) {
              lastText = block.text.trim();
            }
          }
        } else if (ev.type === 'result') {
          result = typeof ev.result === 'string' ? ev.result : lastText;
          isError = Boolean(ev.is_error);
        }
      }
    });
    child.stderr.on('data', (d) => { stderr = (stderr + d.toString()).slice(-4000); });
    child.on('error', (err) => finish(null, err.message));
    child.on('close', (code) => finish(code));

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function waitForMemory(minMb) {
  for (;;) {
    if (stopping) return false;
    const free = Math.round(os.freemem() / 1048576);
    if (free >= minMb) return true;
    await new Promise((r) => setTimeout(r, 10_000));
  }
}

/* ------------------------------------------------------------------------- */
/* the chief                                                                  */
/* ------------------------------------------------------------------------- */

async function snapshot() {
  const [{ data: missions }, { data: approvals }, { data: deliverables }] = await Promise.all([
    sb.from('office_missions').select('id, title, goal, status, metric_label, metric_current, metric_target, due_on').order('created_at', { ascending: false }).limit(8),
    sb.from('office_approvals').select('id, agent, question, detail').eq('status', 'pending'),
    sb.from('office_deliverables').select('agent, kind, title, url, created_at').order('created_at', { ascending: false }).limit(12),
  ]);
  const ids = (missions ?? []).map((m) => m.id);
  const { data: tasks } = ids.length
    ? await sb.from('office_tasks').select('mission_id, agent, title, status, last_action').in('mission_id', ids).order('position')
    : { data: [] };

  const lines = [];
  for (const m of missions ?? []) {
    const score = m.metric_target ? ` score ${m.metric_current}/${m.metric_target} ${m.metric_label ?? ''}` : '';
    lines.push(`- [${m.status}] ${m.title} (id ${m.id})${m.due_on ? ` due ${m.due_on}` : ''}${score}`);
    for (const t of (tasks ?? []).filter((x) => x.mission_id === m.id)) {
      lines.push(`    ${t.agent}: ${t.title} [${t.status}]${t.last_action && t.status === 'running' ? ` now: ${t.last_action}` : ''}`);
    }
  }
  const appr = (approvals ?? []).map((a) => `- ${a.agent} asks (approval id ${a.id}): ${a.question}${a.detail ? ` :: ${a.detail.slice(0, 300)}` : ''}`);
  const shelf = (deliverables ?? []).map((d) => `- ${d.agent} ${d.kind}: ${d.title}${d.url ? ` ${d.url}` : ''}`);
  return [
    'THE FLOOR RIGHT NOW',
    lines.length ? lines.join('\n') : '- No missions yet.',
    '',
    'WAITING ON SARAH',
    appr.length ? appr.join('\n') : '- Nothing.',
    '',
    'RECENTLY DELIVERED',
    shelf.length ? shelf.join('\n') : '- Nothing yet.',
  ].join('\n');
}

/** Pull every ```office block out of a reply. Returns the clean text and the parsed blocks. */
function splitOfficeBlocks(text) {
  const blocks = [];
  const clean = String(text ?? '').replace(/```office\s*([\s\S]*?)```/g, (_, body) => {
    try { blocks.push(JSON.parse(body)); } catch (e) { blocks.push({ parseError: e.message }); }
    return '';
  }).trim();
  return { clean, blocks };
}

async function chiefSession() {
  const { data } = await sb.from('app_state').select('value').eq('key', engine.CHIEF_KEY).maybeSingle();
  return data?.value?.session_id ?? null;
}
async function saveChiefSession(id) {
  await sb.from('app_state').upsert({ key: engine.CHIEF_KEY, value: { session_id: id, at: new Date().toISOString() }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

async function recentTranscript() {
  const { data } = await sb.from('office_messages').select('role, body').order('created_at', { ascending: false }).limit(16);
  return (data ?? []).reverse().map((m) => `${m.role === 'sarah' ? 'Sarah' : m.role === 'sower' ? 'Sower' : 'Office'}: ${m.body}`).join('\n\n');
}

/** Run a chief turn in Sower's standing session, starting a fresh one if it is gone. */
async function chiefTurn(job, userPrompt) {
  const settings = await engine.getSettings(sb);
  const system = chiefSystem({ agents: AGENTS, settings, today: today() });
  const onAction = (text) => { sb.from('office_jobs').update({ last_action: text }).eq('id', job.id).then(() => {}); };

  let session = await chiefSession();
  let out;
  if (session) {
    out = await runClaude({ prompt: userPrompt, system, resume: session, onAction, timeoutMs: CHIEF_TIMEOUT_MS });
    // A session that no longer exists fails fast with nothing said. Start over
    // with the recent thread so Sower does not lose the plot.
    if (out.isError && !out.result) session = null;
  }
  if (!session) {
    const fresh = crypto.randomUUID();
    const history = await recentTranscript();
    const prompt = history ? `Earlier in this conversation:\n${history}\n\n---\n\n${userPrompt}` : userPrompt;
    out = await runClaude({ prompt, system, sessionId: fresh, onAction, timeoutMs: CHIEF_TIMEOUT_MS });
  }
  if (out.sessionId) await saveChiefSession(out.sessionId);
  return out;
}

async function applyBlocks(blocks) {
  const settings = await engine.getSettings(sb);
  const notes = [];
  let missionId = null;
  for (const b of blocks) {
    if (b.parseError) { notes.push(`(The plan did not parse: ${b.parseError}. Ask me again and I will resend it.)`); continue; }
    if (b.mission) {
      try {
        const m = await engine.createMission(sb, b.mission, settings);
        missionId = m.id;
        notes.push(settings.autoGo ? 'Mission is live on the floor.' : 'Plan is on the floor. Press Go when it looks right.');
      } catch (e) {
        notes.push(`(The plan could not open: ${e.message})`);
      }
    }
    for (const a of b.actions ?? []) {
      try {
        if (a.type === 'go') await engine.startMission(sb, a.mission_id);
        else if (a.type === 'stop') await engine.stopMission(sb, a.mission_id);
        else if (a.type === 'approve' || a.type === 'decline') await engine.decideApproval(sb, a.approval_id, a.type === 'approve', a.note);
      } catch (e) {
        notes.push(`(Could not ${a.type}: ${e.message})`);
      }
    }
  }
  return { notes, missionId };
}

async function handleChief(job) {
  const { data: msg } = await sb.from('office_messages').select('body').eq('id', job.ref_id).maybeSingle();
  if (!msg) return;
  const prompt = `${await snapshot()}\n\n---\n\nSarah: ${msg.body}`;
  const out = await chiefTurn(job, prompt);
  if (out.isError && !out.result) throw new Error(out.stderr.slice(-400) || 'Sower did not answer');
  const { clean, blocks } = splitOfficeBlocks(out.result);
  const { notes, missionId } = await applyBlocks(blocks);
  const body = [clean, ...notes].filter(Boolean).join('\n\n') || 'Done.';
  await sb.from('office_messages').insert({ role: 'sower', body, mission_id: missionId });
}

async function handleDebrief(job) {
  const missionId = job.ref_id;
  const { data: m } = await sb.from('office_missions').select('*').eq('id', missionId).maybeSingle();
  if (!m) return;
  const [{ data: tasks }, { data: shelf }] = await Promise.all([
    sb.from('office_tasks').select('agent, title, status, output, error').eq('mission_id', missionId).order('position'),
    sb.from('office_deliverables').select('agent, kind, title, url').eq('mission_id', missionId).order('created_at'),
  ]);
  const prompt = `Mission "${m.title}" just ${m.status === 'failed' ? 'failed' : 'finished'}. Goal: ${m.goal}. Score: ${m.metric_current}${m.metric_target ? ` of ${m.metric_target}` : ''} ${m.metric_label ?? ''}.

Reports from the floor:
${(tasks ?? []).map((t) => `## ${t.agent}: ${t.title} [${t.status}]\n${(t.output || t.error || '(no report)').slice(0, 3000)}`).join('\n\n')}

Delivered:
${(shelf ?? []).map((d) => `- ${d.agent} ${d.kind}: ${d.title}${d.url ? ` ${d.url}` : ''}`).join('\n') || '- nothing'}

Write Sarah the debrief: what landed against the number, exactly what she has in hand now (the script, the offer, the links), what fell short and why, and the next move you recommend. Under 250 words. If the next move is a new mission, propose it with an office block.`;
  const out = await chiefTurn(job, prompt);
  const { clean, blocks } = splitOfficeBlocks(out.result);
  const { notes } = await applyBlocks(blocks);
  const body = [clean, ...notes].filter(Boolean).join('\n\n') || `${m.title}: done.`;
  await sb.from('office_missions').update({ debrief: clean || null, updated_at: new Date().toISOString() }).eq('id', missionId);
  await sb.from('office_messages').insert({ role: 'sower', body, mission_id: missionId });
}

/* ------------------------------------------------------------------------- */
/* the desks                                                                  */
/* ------------------------------------------------------------------------- */

async function taskContext(task) {
  const { data: m } = await sb.from('office_missions').select('*').eq('id', task.mission_id).single();
  const deps = task.depends_on?.length
    ? (await sb.from('office_tasks').select('agent, title, status, output, error').in('id', task.depends_on)).data ?? []
    : [];
  const { data: shelf } = await sb.from('office_deliverables').select('agent, kind, title, url').eq('mission_id', task.mission_id).order('created_at');
  return `MISSION: ${m.title}
Goal: ${m.goal}${m.due_on ? `\nDue: ${m.due_on}` : ''}${m.metric_target ? `\nScore: ${m.metric_current} of ${m.metric_target} ${m.metric_label ?? ''}` : ''}${m.summary ? `\nWhy this plan: ${m.summary}` : ''}

YOUR TASK: ${task.title}
${task.brief}
${deps.length ? `\nWHAT CAME BEFORE YOU\n${deps.map((d) => `## ${d.agent}: ${d.title} [${d.status}]\n${(d.output || d.error || '(no report)').slice(0, 4000)}`).join('\n\n')}` : ''}
${shelf?.length ? `\nALREADY DELIVERED IN THIS MISSION\n${shelf.map((d) => `- ${d.agent} ${d.kind}: ${d.title}${d.url ? ` ${d.url}` : ''}`).join('\n')}` : ''}`;
}

async function handleTask(job, resuming) {
  const { data: task } = await sb.from('office_tasks').select('*').eq('id', job.ref_id).maybeSingle();
  if (!task || ['stopped', 'done', 'failed'].includes(task.status)) return;
  const agent = AGENT_BY_KEY[task.agent];
  if (!agent) throw new Error(`no desk called ${task.agent}`);
  const entry = running.get(job.id);
  if (entry) { entry.agent = task.agent; entry.title = task.title; }

  const settings = await engine.getSettings(sb);
  const system = taskSystem({ agent, settings, cli: CLI, today: today() });
  const startedRun = new Date().toISOString();

  let prompt;
  let resume = null;
  if (resuming && task.session_id) {
    const { data: answers } = await sb.from('office_approvals').select('id, question, status, answer_note').eq('task_id', task.id).eq('delivered', false).neq('status', 'pending');
    await sb.from('office_approvals').update({ delivered: true }).in('id', (answers ?? []).map((a) => a.id));
    prompt = `Sarah answered:\n${(answers ?? []).map((a) => `- ${a.status.toUpperCase()}: ${a.question}${a.answer_note ? ` (her note: ${a.answer_note})` : ''}`).join('\n') || '- (no new answers)'}\n\nContinue your task from where you stopped. What she declined, route around.`;
    resume = task.session_id;
  } else {
    prompt = await taskContext(task);
  }

  await sb.from('office_tasks').update({ status: 'running', started_at: task.started_at ?? startedRun, last_action: resuming ? 'Back to work with Sarah\'s answer' : 'Starting', runs: (task.runs ?? 0) + 1, updated_at: startedRun }).eq('id', task.id);
  await engine.logEvent(sb, { agent: task.agent, kind: 'start', mission_id: task.mission_id, task_id: task.id, text: resuming ? `Resuming: ${task.title}` : `Started: ${task.title}` });

  let lastWrite = 0;
  const onAction = (text) => {
    const now = Date.now();
    sb.from('office_tasks').update({ last_action: text.slice(0, 300), updated_at: new Date().toISOString() }).eq('id', task.id).then(() => {});
    // One feed line every few seconds at most: a search-heavy minute should not bury the rest of the floor.
    if (now - lastWrite > 4000) { lastWrite = now; engine.logEvent(sb, { agent: task.agent, mission_id: task.mission_id, task_id: task.id, text }); }
  };
  const isCancelled = async () => {
    const { data } = await sb.from('office_tasks').select('status').eq('id', task.id).maybeSingle();
    return !data || data.status === 'stopped';
  };

  const out = await runClaude({
    prompt,
    system,
    resume,
    sessionId: resume ? null : crypto.randomUUID(),
    onAction,
    isCancelled,
    timeoutMs: TASK_TIMEOUT_MS,
    extraEnv: { OFFICE_TASK_ID: task.id, OFFICE_MISSION_ID: task.mission_id, OFFICE_AGENT: task.agent, OFFICE_ENV_FILE: ENV_FILE },
  });

  // The worker is shutting down: the stop handler already put this job back in
  // the queue, and the session id lets the next run pick the thread back up.
  if (stopping) {
    if (out.sessionId) await sb.from('office_tasks').update({ session_id: out.sessionId, status: 'queued' }).eq('id', task.id).eq('status', 'running');
    return;
  }
  const { data: now } = await sb.from('office_tasks').select('status, runs').eq('id', task.id).maybeSingle();
  if (!now || now.status === 'stopped') return;
  if (out.sessionId) await sb.from('office_tasks').update({ session_id: out.sessionId }).eq('id', task.id);

  // A timeout can leave a half-written last message behind. That is not a report.
  if (out.isError && (!out.result || out.code === 124)) {
    const why = out.stderr.slice(-800) || `exited ${out.code}`;
    if ((now.runs ?? 1) < 2 && out.code !== 130) {
      await sb.from('office_tasks').update({ status: 'queued', last_action: 'Retrying after a failed run', updated_at: new Date().toISOString() }).eq('id', task.id);
      await engine.enqueue(sb, resuming ? 'resume' : 'task', task.id);
      await engine.logEvent(sb, { agent: task.agent, kind: 'retry', mission_id: task.mission_id, task_id: task.id, text: `Retrying ${task.title}: ${why.slice(0, 160)}` });
      return;
    }
    await sb.from('office_tasks').update({ status: 'failed', error: why, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', task.id);
    await engine.logEvent(sb, { agent: task.agent, kind: 'failed', mission_id: task.mission_id, task_id: task.id, text: `Failed: ${task.title}` });
    await engine.advanceMission(sb, task.mission_id);
    return;
  }

  const report = String(out.result ?? '').slice(0, 20000);
  const { count: pending } = await sb.from('office_approvals').select('id', { count: 'exact', head: true }).eq('task_id', task.id).eq('status', 'pending');
  if ((pending ?? 0) > 0) {
    await sb.from('office_tasks').update({ status: 'waiting', output: report, last_action: 'Waiting on Sarah', updated_at: new Date().toISOString() }).eq('id', task.id);
    await engine.logEvent(sb, { agent: task.agent, kind: 'waiting', mission_id: task.mission_id, task_id: task.id, text: `Waiting on Sarah: ${task.title}` });
    // Sarah may have answered in the seconds between the ask and this line.
    await engine.resumeIfParked(sb, task.id);
    return;
  }
  const { count: unseen } = await sb.from('office_approvals').select('id', { count: 'exact', head: true }).eq('task_id', task.id).eq('delivered', false).neq('status', 'pending');
  if ((unseen ?? 0) > 0) {
    // She answered while the agent was still working. Deliver it now.
    await sb.from('office_tasks').update({ status: 'waiting', output: report, updated_at: new Date().toISOString() }).eq('id', task.id);
    await engine.resumeIfParked(sb, task.id);
    return;
  }

  await sb.from('office_tasks').update({ status: 'done', output: report, last_action: 'Done', finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', task.id);
  await engine.logEvent(sb, { agent: task.agent, kind: 'done', mission_id: task.mission_id, task_id: task.id, text: `Done: ${task.title}` });
  await engine.advanceMission(sb, task.mission_id);
}

/* ------------------------------------------------------------------------- */
/* lanes, heartbeat, probes                                                   */
/* ------------------------------------------------------------------------- */

async function claim(kinds) {
  const { data, error } = await sb.rpc('claim_office_job', { p_worker: WORKER, p_kinds: kinds });
  if (error) { log('claim failed:', error.message); return null; }
  return Array.isArray(data) ? data[0] ?? null : data;
}

async function runJob(job) {
  running.set(job.id, { kind: job.kind, agent: job.kind === 'chief' || job.kind === 'debrief' ? 'sower' : '', title: job.kind });
  const t0 = Date.now();
  log(`claimed ${job.kind} ${job.ref_id}`);
  try {
    if (job.kind === 'chief') await handleChief(job);
    else if (job.kind === 'debrief') await handleDebrief(job);
    else await handleTask(job, job.kind === 'resume');
    if (stopping) return;
    await sb.from('office_jobs').update({ status: 'done', finished_at: new Date().toISOString(), error: null }).eq('id', job.id);
    log(`done ${job.kind} in ${Math.round((Date.now() - t0) / 1000)}s`);
  } catch (err) {
    if (stopping) return;
    const msg = String(err?.message ?? err).slice(0, 2000);
    log(`FAILED ${job.kind} ${job.ref_id}: ${msg.slice(0, 300)}`);
    await sb.from('office_jobs').update({ status: 'failed', finished_at: new Date().toISOString(), error: msg }).eq('id', job.id);
    if (job.kind === 'chief' || job.kind === 'debrief') {
      await sb.from('office_messages').insert({ role: 'system', body: `Sower could not answer that one: ${msg.slice(0, 300)}` });
    } else if (job.ref_id) {
      await sb.from('office_tasks').update({ status: 'failed', error: msg, finished_at: new Date().toISOString() }).eq('id', job.ref_id).in('status', ['queued', 'running']);
      const { data: t } = await sb.from('office_tasks').select('mission_id').eq('id', job.ref_id).maybeSingle();
      if (t) await engine.advanceMission(sb, t.mission_id);
    }
  } finally {
    running.delete(job.id);
  }
}

async function lane(name, kinds, minMb) {
  while (!stopping) {
    if (!(await waitForMemory(minMb))) break;
    const job = await claim(kinds);
    if (!job) { await new Promise((r) => setTimeout(r, POLL_MS)); continue; }
    await runJob(job);
  }
  log(`lane ${name} closed`);
}

function probe(cmd, args, test) {
  return new Promise((resolve) => {
    let out = '';
    const child = spawn(cmd, args, { shell: process.platform === 'win32', windowsHide: true, env });
    const timer = setTimeout(() => { killTree(child); resolve('no answer'); }, 25_000);
    child.stdout?.on('data', (d) => { out += d.toString(); });
    child.stderr?.on('data', (d) => { out += d.toString(); });
    child.on('error', () => { clearTimeout(timer); resolve('missing'); });
    child.on('close', (code) => { clearTimeout(timer); resolve(test(code, out)); });
  });
}

async function runProbes() {
  const [claude, gh, vercel, supabase, stripe] = await Promise.all([
    probe(CLAUDE_BIN, ['--version'], (c, o) => (c === 0 ? `ready ${o.trim().split(/\s/)[0]}` : 'missing')),
    probe('gh', ['auth', 'status'], (c) => (c === 0 ? 'signed in' : 'signed out')),
    probe('vercel', ['whoami'], (c) => (c === 0 ? 'signed in' : 'signed out')),
    probe('supabase', ['--version'], (c) => (c === 0 ? 'installed' : 'missing')),
    probe('stripe', ['config', '--list'], (c, o) => (c === 0 && /api_key/.test(o) ? 'signed in' : c === 0 ? 'installed' : 'missing')),
  ]);
  probes = { claude, gh, vercel, supabase, stripe, at: new Date().toISOString() };
  log('probes', JSON.stringify(probes));
}

async function beat() {
  try {
    const list = [...running.entries()].map(([job, r]) => ({ job, kind: r.kind, agent: r.agent, title: r.title }));
    await sb.from('app_state').upsert(
      { key: engine.HEALTH_KEY, value: { worker: WORKER, at: new Date().toISOString(), lanes: LANES, running: list, probes, workspace: WORKSPACE }, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
  } catch { /* a missed heartbeat never stops the work */ }
}

/** Anything this machine held when it last died goes back in the queue. */
async function sweep() {
  const { data: mine } = await sb.from('office_jobs').select('id, kind, ref_id').eq('status', 'running').eq('worker', WORKER);
  for (const j of mine ?? []) {
    await sb.from('office_jobs').update({ status: 'queued', worker: null, claimed_at: null }).eq('id', j.id);
    if (j.kind === 'task' || j.kind === 'resume') await sb.from('office_tasks').update({ status: 'queued' }).eq('id', j.ref_id).eq('status', 'running');
  }
  if (mine?.length) log(`requeued ${mine.length} job(s) this machine was holding`);
}

async function main() {
  log(`office worker ${WORKER} up: ${LANES} task lane(s), model ${MODEL}, mode ${PERMISSION_MODE}, workspace ${WORKSPACE}`);
  await sweep();
  await beat();
  runProbes().then(beat);
  const beatTimer = setInterval(beat, 20_000);
  const probeTimer = setInterval(runProbes, 30 * 60 * 1000);

  const stop = async () => {
    if (stopping) return;
    stopping = true;
    log('shutting down; handing running jobs back to the queue');
    clearInterval(beatTimer);
    clearInterval(probeTimer);
    for (const child of children) killTree(child);
    const { data: held } = running.size
      ? await sb.from('office_jobs').select('id, kind, ref_id').in('id', [...running.keys()])
      : { data: [] };
    for (const j of held ?? []) {
      await sb.from('office_jobs').update({ status: 'queued', worker: null, claimed_at: null }).eq('id', j.id);
      if (j.kind === 'task' || j.kind === 'resume') await sb.from('office_tasks').update({ status: 'queued' }).eq('id', j.ref_id).eq('status', 'running');
    }
    setTimeout(() => process.exit(0), 3000);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  await Promise.all([
    lane('chief', ['chief', 'debrief'], CHIEF_MIN_FREE_MB),
    ...Array.from({ length: LANES }, (_, i) => lane(`task-${i + 1}`, ['task', 'resume'], MIN_FREE_MB)),
  ]);
}

await main();
