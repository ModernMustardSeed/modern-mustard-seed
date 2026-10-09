// The Studio Kit hook library. Every guard reads the same payload the same
// way, loads the same config, and answers in one of three ways:
//
//   allow()  exit 0, nothing printed. The tool call runs.
//   ask(r)   exit 0 with a JSON decision of "ask". Claude Code stops and shows
//            you the reason; nothing happens until you approve it.
//   deny(r)  exit 2 with the reason on stderr. The call is blocked and Claude
//            reads the reason, so it can fix the work instead of retrying.
//
// A guard that throws, or cannot read its input, allows. A broken guard that
// blocks everything gets switched off, and a switched-off guard protects
// nothing. Every guard is tested by test.mjs before it ships.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_CONFIG = {
  // Words and phrases your business never puts in writing. Each entry is a
  // case-insensitive regular expression and the reason Claude is told.
  // The defaults fit a business that sells set packages; edit them in
  // studio-kit.json to match your own rules file.
  bannedPhrases: [
    { pattern: '\\$\\s?\\d[\\d,]*(\\.\\d+)?\\s*(/|per\\s+)\\s*(hour|hr)\\b', why: 'We sell set packages. No price is ever stated by the hour.' },
    { pattern: '\\bhourly\\s+(rate|rates|pricing|billing|fee|fees)\\b', why: 'We sell set packages. Nothing is priced by the hour.' },
    { pattern: '\\btime\\s+and\\s+materials\\b', why: 'We sell set packages, never metered time.' },
    { pattern: '\\bbillable\\s+hours\\b', why: 'We sell set packages. Hours are not billed.' },
    { pattern: '\\bchange\\s+orders?\\b', why: 'Changes to what we built are included. There is no paperwork for a change.' },
  ],
  // Paths the words guard never inspects (your rules file quotes the rules).
  wordsSkip: ['[\\\\/]\\.claude[\\\\/]', 'CLAUDE\\.md$', '[\\\\/]studio-kit[\\\\/]'],
  // Branches nobody force-pushes, resets or deletes.
  protectedBranches: ['main', 'master', 'production'],
  // Folders inside which recursive deletes are allowed. Empty means: the
  // folder Claude was started in.
  workspaceRoots: [],
  // Extra command patterns that send something to a person (your own scripts).
  sendCommands: [],
  // How production ships here, quoted back when a deploy is attempted.
  deployRule: 'Production ships by merging to the main branch. Deploy commands from a laptop are approved by a person, every time.',
  // Where the audit trail is written.
  auditDir: process.env.STUDIO_KIT_AUDIT || join(homedir(), '.claude', 'audit'),
};

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** Kit config next to the hooks, overridden by a project's .claude/studio-kit.json. */
export function loadConfig(cwd) {
  const cfg = { ...DEFAULT_CONFIG };
  for (const path of [join(HERE, '..', 'studio-kit.json'), cwd ? join(cwd, '.claude', 'studio-kit.json') : null]) {
    if (!path || !existsSync(path)) continue;
    const over = readJson(path);
    if (over && typeof over === 'object') Object.assign(cfg, over);
  }
  return cfg;
}

export function readPayload() {
  try {
    const raw = readFileSync(0, 'utf8');
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function allow() {
  process.exit(0);
}

export function deny(rule, reason) {
  process.stderr.write(`BLOCKED by the Studio Kit. Rule: ${rule}\n\n${reason}\n`);
  process.exit(2);
}

export function ask(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason },
    }),
  );
  process.exit(0);
}

export const isShell = (tool) => tool === 'Bash' || tool === 'PowerShell';

/** A command shaped like a file write: heredoc, redirect, in-place edit, Set-Content, tee, a write call. */
const WRITE_SHAPE =
  /(<<-?\s*['"]?\w+|(^|[^<>|0-9])>{1,2}\s*['"]?[\w.~/\\$-]|\bsed\s+-[a-zA-Z]*i\b|\bperl\s+-[a-zA-Z]*i\b|\b(Set-Content|Out-File|Add-Content)\b|\btee\b|writeFile(Sync)?\(|\bopen\([^)]*['"]w)/;

/**
 * What is about to be written, and where. For Write it is the content; for
 * Edit the new text; for MultiEdit every new text; for a shell command that
 * writes a file, the command itself. Null when the call writes nothing.
 */
export function writtenBody(payload) {
  const tool = String(payload?.tool_name ?? '');
  const input = payload?.tool_input ?? {};
  if (tool === 'Write') return { path: String(input.file_path ?? ''), body: String(input.content ?? ''), shell: false };
  if (tool === 'Edit') return { path: String(input.file_path ?? ''), body: String(input.new_string ?? ''), shell: false };
  if (tool === 'MultiEdit') {
    const edits = Array.isArray(input.edits) ? input.edits : [];
    return { path: String(input.file_path ?? ''), body: edits.map((e) => String(e?.new_string ?? '')).join('\n'), shell: false };
  }
  if (isShell(tool)) {
    const cmd = String(input.command ?? '');
    if (!WRITE_SHAPE.test(cmd)) return null;
    const m = cmd.match(/(?:>{1,2}|-LiteralPath|-Path|-FilePath|\btee\b)\s*['"]?([A-Za-z]:[\\/][^\s'"]+|~?[\w./\\-]+\.\w+)/);
    return { path: m ? m[1] : '', body: cmd, shell: true };
  }
  return null;
}

/**
 * The whole file as it will be after this call, when that can be known: the
 * Write content, or the current file with the Edit applied. Used by guards
 * that judge a file as a whole (two schedules on one minute).
 */
export function fileAfter(payload) {
  const tool = String(payload?.tool_name ?? '');
  const input = payload?.tool_input ?? {};
  const path = String(input.file_path ?? '');
  if (tool === 'Write') return { path, text: String(input.content ?? '') };
  if (tool !== 'Edit' && tool !== 'MultiEdit') return null;
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    text = '';
  }
  const edits = tool === 'Edit' ? [input] : Array.isArray(input.edits) ? input.edits : [];
  for (const e of edits) {
    const from = String(e?.old_string ?? '');
    const to = String(e?.new_string ?? '');
    if (!from) continue;
    text = e?.replace_all ? text.split(from).join(to) : text.replace(from, to);
  }
  return { path, text };
}

export const command = (payload) => (isShell(String(payload?.tool_name ?? '')) ? String(payload?.tool_input?.command ?? '') : '');

/** Every MCP tool name looks like mcp__server__tool. */
export const mcpTool = (payload) => {
  const t = String(payload?.tool_name ?? '');
  return t.startsWith('mcp__') ? t : '';
};

export const abs = (cwd, p) => resolve(cwd || process.cwd(), p);

/** Run a guard body; any exception allows, so a broken guard never jams the session. */
export function run(fn) {
  let payload = null;
  try {
    payload = readPayload();
  } catch {
    payload = null;
  }
  if (!payload) allow();
  try {
    fn(payload, loadConfig(payload.cwd));
  } catch {
    allow();
  }
  allow();
}
