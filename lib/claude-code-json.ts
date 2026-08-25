/**
 * THE FREE ENGINE.
 *
 * A drop-in replacement for `anthropic.messages` that runs the prompt through
 * the locally installed Claude Code CLI on Sarah's Max subscription instead of
 * the metered API. Same job, same JSON out, $0 per call.
 *
 * Why this exists: the website audit was pinned to the Anthropic API, and a
 * 3,600-lead batch at opus-5 with 8k output tokens is hundreds of dollars.
 * Worse, when the wallet hits zero every one of the ~31 API call sites in this
 * app degrades at once (see memory `mms-anthropic-api-billing`). The build
 * already proved the pattern works for long-running local work
 * (`scripts/demo-site-worker.mjs`); this generalises it to any JSON-returning
 * prompt.
 *
 * HARD CONSTRAINTS this module encodes, learned the expensive way:
 *
 * 1. It only ever runs LOCALLY. Vercel has no `claude` binary, so anything that
 *    must answer a web request in prod stays on the API. Callers gate on
 *    AUDIT_ENGINE / `claudeCodeAvailable()`, never on hope.
 * 2. It strips every key-shaped credential from the child env. A present
 *    ANTHROPIC_API_KEY silently flips the CLI back to metered billing, which
 *    would defeat the entire purpose without any visible symptom.
 * 3. It serialises. Each headless child wants a few hundred MB, and the build
 *    OOM-killed a build at 0.9GB free. Eight concurrent audits (the batch
 *    script's default) would take this machine down.
 */

import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let counter = 0;

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';

/**
 * Two, not eight. The batch script defaults to 8 concurrent audits because the
 * API absorbs that happily. Eight headless Claude processes do not: the build
 * incident on 2026-07-23 was a single build OOM-killed at 0.9GB free. This cap
 * applies no matter what concurrency the caller asks for, so a batch run cannot
 * accidentally take the workstation down.
 */
const MAX_CONCURRENT = Math.max(1, Number(process.env.CLAUDE_CODE_CONCURRENCY || 2));

/**
 * The same guard the build worker uses, set LOWER on purpose. The build holds
 * 1200MB because it runs a 45-minute agentic build with tools, subagents and a
 * growing context. This is one turn, no tools, a few thousand tokens in and
 * out, and it exits. Holding it to the build's ceiling would mean refusing to
 * work on a machine that is perfectly capable of the job, and the build memory
 * file is explicit that a guard which never passes is an outage rather than a
 * safety feature.
 */
const MIN_FREE_MEM_MB = Number(process.env.CLAUDE_CODE_MIN_FREE_MB || 450);

/** An audit that has not answered in 5 minutes is wedged, not thinking. */
const TIMEOUT_MS = Number(process.env.CLAUDE_CODE_TIMEOUT_MS || 5 * 60 * 1000);

export class ClaudeCodeError extends Error {}
export class ClaudeCodeMalformed extends ClaudeCodeError {}

/**
 * Is the free engine actually usable in this process? Callers use this to fall
 * back to the API rather than throwing, because "no claude binary" is the
 * normal state on Vercel and is not an error there.
 *
 * This PROBES THE BINARY rather than sniffing the environment, and that is not
 * paranoia. `vercel env pull` writes VERCEL=1, VERCEL_ENV=production and 14
 * more VERCEL_* vars straight into `.env.local`, so every local script that
 * loads that file looks exactly like it is running on Vercel. The first version
 * of this check tested `!process.env.VERCEL` and refused to run on Sarah's own
 * machine, silently falling back to the API it was written to avoid. Ask the
 * filesystem, not the environment.
 */
let probed: boolean | null = null;
export function claudeCodeAvailable(): boolean {
  if (process.env.NEXT_RUNTIME === 'edge') return false;
  if (probed !== null) return probed;
  try {
    const r = spawnSync(CLAUDE_BIN, ['--version'], {
      shell: process.platform === 'win32',
      timeout: 15_000,
      stdio: 'ignore',
    });
    probed = r.status === 0;
  } catch {
    probed = false;
  }
  return probed;
}

// A plain FIFO semaphore. Deliberately not a library.
let active = 0;
const waiting: Array<() => void> = [];

async function acquire(): Promise<() => void> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  active += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    active -= 1;
    waiting.shift()?.();
  };
}

/**
 * Kill the whole tree, not the shell in front of it.
 *
 * Lifted verbatim in spirit from `scripts/demo-site-worker.mjs`: with
 * shell:true on Windows, child.pid is a `cmd.exe /c` wrapper and the real
 * claude.exe is its grandchild. child.kill() reaps the wrapper and leaves
 * claude.exe alive, still holding a session against the Max plan. Those
 * escapees pile up and starve every later run.
 */
function killTree(child: ReturnType<typeof spawn>) {
  if (process.platform === 'win32' && child.pid) {
    try {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => {
        try { child.kill('SIGKILL'); } catch { /* already gone */ }
      });
      return;
    } catch { /* fall through to the signal */ }
  }
  try { child.kill('SIGKILL'); } catch { /* already gone */ }
}

type RunResult = { code: number | null; stdout: string; stderr: string };

function spawnClaude(prompt: string, model?: string, allowWeb = false, timeoutMs = TIMEOUT_MS): Promise<RunResult> {
  return new Promise((resolve) => {
    // Subscription only, by construction. A present key silently switches the
    // CLI to metered API billing, which is the one outcome this module exists
    // to prevent.
    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY;
    delete childEnv.ANTHROPIC_AUTH_TOKEN;
    delete childEnv.ANTHROPIC_BASE_URL;

    /**
     * NEVER PASS AN EMPTY-STRING ARGUMENT HERE.
     *
     * With shell:true on Windows, node joins argv UNQUOTED into a single
     * `cmd.exe /c` string, so an empty string simply vanishes and every flag
     * after it shifts up one position. The first version of this used
     * `--allowed-tools '' --max-turns 1`, which reached the CLI as
     * `--allowed-tools --max-turns 1`: the tool restriction ate `--max-turns`
     * as its value, so tools were never actually restricted and the turn cap
     * was never actually applied. It failed silently in the direction of doing
     * LESS sandboxing than the code appears to ask for, which is the worst
     * direction for a flag whose whole job is sandboxing. Same family of bug as
     * the build's unquoted-prompt truncation.
     *
     * So: name the tools to block explicitly, all non-empty values.
     *
     * This is a pure reasoning call over a page we already fetched. It needs no
     * tools at all, and the input embeds attacker-controlled text (titles,
     * headings and meta scraped from whatever site is being graded), so a shell
     * or a file writer is exactly what it must not have.
     */
    /**
     * `allowWeb` exists for exactly one caller: the site build, which used the
     * API's server-side web_search and web_fetch to read a prospect's real
     * website before designing theirs. That research is most of what made the
     * fallback build's output usable, so dropping it to move onto the
     * subscription would have been a quiet downgrade dressed as a migration.
     *
     * What stays blocked in BOTH modes is everything that writes: Bash, Write,
     * Edit, NotebookEdit, Task. The brief embeds attacker-controlled text (a
     * scraped homepage), so reading the web on its say-so is a risk the API
     * path already took, while giving it a shell is one nobody has taken and
     * nobody should.
     */
    const blocked = allowWeb
      ? ['Bash', 'Write', 'Edit', 'NotebookEdit', 'Task']
      : ['Bash', 'Write', 'Edit', 'NotebookEdit', 'WebFetch', 'WebSearch', 'Task'];

    const args = [
      '-p',
      '--output-format', 'json',
      '--strict-mcp-config',
      '--disallowed-tools', ...blocked,
    ];
    if (model) args.push('--model', model);

    // The prompt goes in via STDIN, never as an argument. With shell:true node
    // joins argv UNQUOTED, so a prompt passed as an arg reaches claude as only
    // its first word, and any newline truncates the rest of the command line
    // including the flags after it. Stdin is immune to all of it. (The build
    // learned this by shipping two builds that received the single words "You"
    // and "Read" as their entire brief.)
    const child = spawn(CLAUDE_BIN, args, { shell: process.platform === 'win32', env: childEnv });

    let stdout = '';
    let stderr = '';
    let done = false;

    const finish = (r: RunResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      process.off('SIGINT', onExit);
      process.off('SIGTERM', onExit);
      resolve(r);
    };
    const onExit = () => killTree(child);
    process.once('SIGINT', onExit);
    process.once('SIGTERM', onExit);

    const timer = setTimeout(() => {
      killTree(child);
      finish({ code: 124, stdout, stderr: `${stderr}\n[timeout after ${Math.round(timeoutMs / 1000)}s]` });
    }, timeoutMs);

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => finish({ code: null, stdout, stderr: `${stderr}\n${err.message}` }));
    child.on('close', (code) => finish({ code, stdout, stderr }));

    child.stdin?.write(prompt);
    child.stdin?.end();
  });
}

/**
 * Pull the JSON object out of whatever the model wrapped it in.
 *
 * The CLI has no structured-output mode, so unlike the API path the schema is
 * instruction rather than enforcement. In practice the model returns either
 * bare JSON or a fenced block; both are handled, and anything else is a
 * ClaudeCodeMalformed which the caller retries exactly like an API 529.
 */
/**
 * Escape the raw control characters that a model leaves inside string values.
 *
 * This is THE failure mode of asking for JSON without schema enforcement, and
 * it is not a rare one: measured on real audits, roughly half of first attempts
 * came back as a structurally complete document (opening brace, matching close,
 * ~9KB) that JSON.parse still rejected, because prose written into a `notes` or
 * `analysis` field carried a literal newline or tab. JSON forbids unescaped
 * characters below 0x20 inside a string; the model is otherwise correct.
 *
 * Retrying that is pure waste, a full minute of subscription time to reroll a
 * dice throw. Repairing it is deterministic and costs nothing. The scan is
 * string-aware so control characters in the whitespace BETWEEN tokens (which
 * are perfectly legal) are left exactly as they are.
 */
function escapeRawControls(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { out += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; out += ch; continue; }

    if (inString && ch < ' ') {
      out += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t'
        : `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * REPAIR THE ONE STRUCTURAL SLIP THIS MODEL ACTUALLY MAKES, AND NOTHING ELSE.
 *
 * Measured over repeated real audits: about half of all responses come back one
 * closing brace short, always the same one. The model finishes the `categories`
 * object, forgets to close it, and carries on writing `top_three_fixes` and
 * `full_todo` INSIDE it. The document then ends with clean prose and a tidy
 * `}]}`, so it reads as complete, and the parser fails only at the final byte.
 *
 * The tempting fix is to append the missing brace and move on. That is a trap.
 * Appending makes the document parse and leaves the two biggest fields buried
 * inside `categories`, so `report.top_three_fixes` and `report.full_todo` both
 * read as empty. On a 3,600-lead sweep that writes thousands of confidently
 * blank reports to the database with no error anywhere. A repair that changes
 * meaning is worse than the failure it replaces.
 *
 * So this closes the open containers AND puts back anything that landed at the
 * wrong depth, using the caller's own JSON Schema as the authority on which
 * keys belong at the root. It repairs only what it can prove, and it says so in
 * the log every time, because a silent structural rewrite is not something that
 * should ever happen invisibly.
 */
function repairStructure(text: string, schema: unknown, label: string): unknown | null {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }

  // An unterminated string means the response really was cut off mid-flight.
  // That is a genuine truncation and there is nothing honest to reconstruct.
  if (inString || stack.length === 0) return null;

  const closing = stack.reverse().map((c) => (c === '{' ? '}' : ']')).join('');
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text + closing) as Record<string, unknown>;
  } catch {
    return null;
  }

  const rootKeys = Object.keys((schema as { properties?: Record<string, unknown> })?.properties ?? {});
  if (!rootKeys.length) return obj;

  // Lift any root-level key that got nested one level too deep.
  const lifted: string[] = [];
  for (const value of Object.values(obj)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const nested = value as Record<string, unknown>;
    for (const key of Object.keys(nested)) {
      if (rootKeys.includes(key) && !(key in obj)) {
        obj[key] = nested[key];
        delete nested[key];
        lifted.push(key);
      }
    }
  }

  console.warn(
    `${label}: repaired a truncated response (closed ${closing.length} container(s)` +
      (lifted.length ? `, lifted ${lifted.join(', ')} back to the root` : '') + ')',
  );
  return obj;
}

/**
 * WHEN THE MODEL ANSWERS TWICE, TAKE THE BETTER ANSWER.
 *
 * Observed on a real roadmap run (2026-08-12, three attempts in a row): the
 * model wrote a complete JSON object, then wrote
 *
 *   "Wait. I need to return the complete JSON object with all 19 keys. Let me
 *    give you the full document."
 *
 * and wrote a SECOND, fuller object. The payload is therefore object, prose,
 * object. Every candidate above fails on it: the whole text has trailing
 * content after the first value, and first-brace-to-last-brace spans both
 * objects AND the prose between them, so it is not valid JSON either. Three
 * attempts, ten minutes of subscription time, and a "hit a snag" for the
 * visitor, over a response that contained a perfectly good document.
 *
 * A self-correction is not noise, it is the model telling us which answer it
 * stands behind. So walk the text for every top-level balanced object, parse
 * each one, and keep the one that satisfies the most of the schema's root keys.
 * Ties go to the LAST one, because that is the correction rather than the
 * draft.
 *
 * String-aware on purpose: a brace inside a quoted value is not structure, and
 * roadmap prose is full of them.
 */
function balancedObjects(text: string): string[] {
  const spans: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        spans.push(text.slice(start, i + 1));
        start = -1;
      } else if (depth < 0) {
        depth = 0; // a stray closer; resynchronise rather than give up
        start = -1;
      }
    }
  }
  return spans;
}

/** How much of the caller's schema this object actually delivers. */
function rootKeyScore(value: unknown, schema: unknown): number {
  const keys = Object.keys((schema as { properties?: Record<string, unknown> })?.properties ?? {});
  if (!keys.length || !value || typeof value !== 'object' || Array.isArray(value)) return 0;
  const obj = value as Record<string, unknown>;
  return keys.filter((k) => k in obj).length;
}

/**
 * Exported because the API path needs it too. Any schema big enough to make the
 * Anthropic structured-output grammar refuse to compile ("the compiled grammar
 * is too large") has to fall back to prompted JSON, and prompted JSON from the
 * API breaks in exactly the ways this parser already repairs.
 */
export function extractJson(text: string, schema: unknown, label: string): unknown {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  // The outermost braces cover a model that prefaced the JSON with a sentence
  // despite being told not to.
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  const braced = first !== -1 && last > first ? trimmed.slice(first, last + 1) : null;

  /**
   * Sits between the exact-parse candidates and the structural repair. A clean
   * parse of a real object always beats reconstructing one, and reconstructing
   * from a span that contains two objects produces confident nonsense.
   */
  const multi = (() => {
    const spans = balancedObjects(trimmed);
    if (spans.length < 2) return null; // one object is already the normal path
    let best: { text: string; score: number } | null = null;
    for (const span of spans) {
      let parsed: unknown;
      try { parsed = JSON.parse(span); } catch {
        try { parsed = JSON.parse(escapeRawControls(span)); } catch { continue; }
      }
      const score = rootKeyScore(parsed, schema);
      // >= so that a later, equally complete object wins: that is the redo.
      if (!best || score >= best.score) best = { text: span, score };
    }
    if (!best) return null;

    /**
     * A PARTIAL DOCUMENT IS WORSE THAN A RETRY, SO REFUSE TO RETURN ONE.
     *
     * Measured on the three payloads that motivated this scanner: the best
     * balanced span carried 9 of the roadmap's 19 root keys. Handing that back
     * would have turned a retry (which costs minutes and usually succeeds) into
     * a published roadmap missing its offer stack, money model, phases and
     * scoreboard, rendered as a broken page nobody would call a bug on the
     * model. Throwing keeps the existing retry behaviour, which is correct.
     *
     * The threshold is deliberately high. This path exists for a model that
     * answered twice and stands behind the second answer, not for salvaging
     * wreckage.
     */
    const keyCount = Object.keys((schema as { properties?: Record<string, unknown> })?.properties ?? {}).length;
    if (keyCount && best.score < Math.ceil(keyCount * 0.8)) {
      console.warn(
        `${label}: ${spans.length} JSON objects in the response, best covers only ${best.score}/${keyCount} root keys, retrying instead of publishing a partial`,
      );
      return null;
    }

    console.warn(
      `${label}: response contained ${spans.length} JSON objects, took the one matching ${best.score} root keys`,
    );
    return best.text;
  })();

  const candidates = [fenced?.[1], trimmed, multi, braced].filter(Boolean) as string[];

  let why = '';
  for (const c of candidates) {
    const s = c.trim();
    try { return JSON.parse(s); } catch (e) { why = (e as Error).message; }
    try { return JSON.parse(escapeRawControls(s)); } catch (e) { why = (e as Error).message; }
    const repaired = repairStructure(escapeRawControls(s), schema, label);
    if (repaired !== null) return repaired;
  }

  // Keep the payload. A batch run cannot reproduce a failure it has thrown away,
  // and the parser's own message plus the offending region is the whole
  // diagnosis in one line.
  let dumped = '';
  try {
    dumped = path.join(os.tmpdir(), `claude-json-fail-${process.pid}-${counter++}.txt`);
    writeFileSync(dumped, text);
  } catch { /* diagnostics must never be the thing that fails */ }

  // Carry length, head and TAIL. "response was not valid JSON" on its own is
  // unactionable three retries deep into a batch run, and the tail is the part
  // that matters: a clean-looking head with a sentence cut mid-word at the end
  // is truncation, while a head with prose in front of the brace is preamble.
  // Those two have opposite fixes.
  throw new ClaudeCodeMalformed(
    `response was not valid JSON (${trimmed.length} chars): ${why}` +
      (dumped ? ` [payload saved to ${dumped}]` : ''),
  );
}

/** How long to ride out a memory spike before giving up on this call. */
const MEM_WAIT_MS = Number(process.env.CLAUDE_CODE_MEM_WAIT_MS || 3 * 60 * 1000);

async function waitForMemory(label: string): Promise<void> {
  const deadline = Date.now() + MEM_WAIT_MS;
  let announced = false;

  for (;;) {
    const freeMb = Math.round(os.freemem() / 1048576);
    if (freeMb >= MIN_FREE_MEM_MB) {
      if (announced) console.warn(`${label}: memory recovered (${freeMb}MB free), continuing`);
      return;
    }
    if (Date.now() >= deadline) {
      throw new ClaudeCodeError(
        `waited ${Math.round(MEM_WAIT_MS / 1000)}s for memory, still only ${freeMb}MB free (needs ${MIN_FREE_MEM_MB}MB). ` +
          'Close some browser windows, or lower CLAUDE_CODE_MIN_FREE_MB.',
      );
    }
    if (!announced) {
      console.warn(`${label}: holding, ${freeMb}MB free and this needs ${MIN_FREE_MEM_MB}MB`);
      announced = true;
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
}

/**
 * Spell out the root keys and their sibling relationship in prose. Derived from
 * the schema, so it stays correct for any caller without hand-maintenance.
 */
function rootKeyReminder(schema: unknown): string {
  const props = (schema as { properties?: Record<string, unknown> })?.properties;
  if (!props) return '';
  const keys = Object.keys(props);
  if (keys.length < 2) return '';
  return (
    `The root object has exactly these ${keys.length} keys, and every one of them is a DIRECT CHILD of the root: ` +
    `${keys.join(', ')}. ` +
    `They are siblings of each other. None of them is nested inside another. ` +
    `Close each nested object before you start the next root key, and check your closing braces before you answer.`
  );
}

/**
 * The same engine, for prompts whose answer is prose rather than a document.
 *
 * Most of the app's call sites are this shape: draft a reply, write a script,
 * answer a visitor. They were on the metered API only because nothing here
 * offered a text mode, so this exists to remove that excuse. It shares the
 * semaphore, the memory guard, the credential stripping and the process-tree
 * kill with the JSON path, because every one of those was learned the hard way
 * and none of them are about JSON.
 */
export async function runClaudeCodeText({
  system,
  user,
  model,
  retries = 2,
  label = 'claude-code-text',
  allowWeb = false,
  timeoutMs,
}: {
  system: string;
  user: string;
  model?: string;
  retries?: number;
  label?: string;
  /** Let this prompt read the live web. See the note in `spawnClaude`. */
  allowWeb?: boolean;
  /**
   * Per-call kill time. The module default of five minutes is right for a
   * one-turn reasoning call and badly wrong for the site build, which measures
   * four minutes on a good run and has taken eleven. Left at the default, a
   * build would be killed mid-document and reported as a failure every time the
   * build was merely slow.
   */
  timeoutMs?: number;
}): Promise<string> {
  if (!claudeCodeAvailable()) {
    throw new ClaudeCodeError('Claude Code engine is not available in this runtime (no local CLI).');
  }

  const prompt = [system, '', '---', '', user].filter(Boolean).join('\n');

  const release = await acquire();
  try {
    let last: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      await waitForMemory(label);
      const { code, stdout, stderr } = await spawnClaude(prompt, model, allowWeb, timeoutMs);

      if (code !== 0) {
        last = new ClaudeCodeError(`: claude exited ${code}: ${stderr.slice(-500) || '(no stderr)'}`);
      } else {
        // `--output-format json` wraps the answer in an envelope. Older/other
        // shapes fall back to treating stdout as the payload itself.
        let payload = stdout;
        try {
          const envelope = JSON.parse(stdout) as { result?: string; is_error?: boolean; subtype?: string };
          if (envelope.is_error) throw new ClaudeCodeError(`${label}: claude reported ${envelope.subtype ?? 'an error'}`);
          if (typeof envelope.result === 'string') payload = envelope.result;
        } catch (err) {
          if (err instanceof ClaudeCodeError) { last = err; payload = ''; }
        }

        const text = payload.trim();
        if (text) return text;
        last = last ?? new ClaudeCodeError(`${label}: claude returned an empty answer`);
      }

      if (attempt < retries) {
        console.warn(`${label}: attempt ${attempt + 1} failed (${(last as Error)?.message ?? last}), retrying`);
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }

    throw last instanceof Error ? last : new ClaudeCodeError(String(last));
  } finally {
    release();
  }
}

export type ClaudeCodeJsonOptions = {
  /** The role/rubric block. Rides inside the prompt, not as a CLI flag. */
  system: string;
  /** The task itself. */
  user: string;
  /** JSON Schema the answer must satisfy. Instructed, then validated by parse. */
  schema: unknown;
  /** Optional model override, e.g. 'opus' or 'sonnet'. Defaults to the CLI's. */
  model?: string;
  /** How many times to retry a malformed or failed run. */
  retries?: number;
  /** Shown in logs so a batch run says which target failed. */
  label?: string;
};

/**
 * Run a JSON-returning prompt on the local subscription. Throws on failure so
 * the caller can decide between retry, API fallback, and giving up.
 */
export async function runClaudeCodeJson({
  system,
  user,
  schema,
  model,
  retries = 2,
  label = 'claude-code',
}: ClaudeCodeJsonOptions): Promise<unknown> {
  if (!claudeCodeAvailable()) {
    throw new ClaudeCodeError('Claude Code engine is not available in this runtime (no local CLI).');
  }

  const prompt = [
    system,
    '',
    '---',
    '',
    user,
    '',
    '---',
    '',
    'Return ONLY a single JSON object matching this JSON Schema. No preamble, no commentary, no markdown fence, no trailing text. The very first character of your reply must be {.',
    '',
    JSON.stringify(schema),
    '',
    // Naming the root keys is not redundant with the schema. Without it the
    // model reliably forgets to close the largest nested object and keeps
    // writing the remaining root keys inside it, which is the single failure
    // this engine sees. Stating the sibling relationship in words fixes at the
    // source what repairStructure() would otherwise have to fix after the fact.
    rootKeyReminder(schema),
  ].filter(Boolean).join('\n');

  const release = await acquire();
  try {
    let last: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      // Check headroom the way the build worker does. PowerShell reports a
      // different figure; os.freemem() is what actually predicts the OOM.
      //
      // WAIT, do not fail. Memory pressure on this machine is spiky (a browser
      // with 40 tabs, a next build, the build worker) and it passes on its own
      // within a minute or two. Failing on it would be indistinguishable to the
      // caller from "this website is broken", and the batch script stamps
      // failures onto the lead so future runs skip it: a busy laptop would
      // quietly write off good prospects forever.
      await waitForMemory(label);

      const { code, stdout, stderr } = await spawnClaude(prompt, model);

      if (code !== 0) {
        last = new ClaudeCodeError(`${label}: claude exited ${code}: ${stderr.slice(-500) || '(no stderr)'}`);
      } else {
        try {
          // `--output-format json` wraps the answer in an envelope. Older/other
          // shapes fall back to treating stdout as the payload itself.
          let payload = stdout;
          try {
            const envelope = JSON.parse(stdout) as { result?: string; is_error?: boolean; subtype?: string };
            if (envelope.is_error) throw new ClaudeCodeError(`${label}: claude reported ${envelope.subtype ?? 'an error'}`);
            if (typeof envelope.result === 'string') payload = envelope.result;
          } catch (err) {
            if (err instanceof ClaudeCodeError) throw err;
            // stdout was not the envelope; treat it as the raw answer.
          }
          return extractJson(payload, schema, label);
        } catch (err) {
          last = err;
        }
      }

      if (attempt < retries) {
        console.warn(`${label}: attempt ${attempt + 1} failed (${(last as Error)?.message ?? last}), retrying`);
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }

    throw last instanceof Error ? last : new ClaudeCodeError(String(last));
  } finally {
    release();
  }
}
