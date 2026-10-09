// 10. THE AUDIT TRAIL. PostToolUse on every tool.
//
// When something odd turns up on a Tuesday, the first question is what ran on
// Monday. Every tool call is appended to a monthly JSON Lines file: when, which
// session, which folder, which tool, and the command or the file path. Never
// the content of a file and never the output, so the trail holds no secrets
// and no customer data. It never blocks anything.

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readPayload, loadConfig } from './lib.mjs';

try {
  const p = readPayload();
  if (p) {
    const cfg = loadConfig(p.cwd);
    const input = p.tool_input ?? {};
    const what = String(input.command ?? input.file_path ?? input.url ?? input.pattern ?? '').slice(0, 400);
    const now = new Date();
    const line = { at: now.toISOString(), session: p.session_id ?? null, cwd: p.cwd ?? null, tool: p.tool_name ?? null, what };
    mkdirSync(cfg.auditDir, { recursive: true });
    appendFileSync(join(cfg.auditDir, `${now.toISOString().slice(0, 7)}.jsonl`), JSON.stringify(line) + '\n');
  }
} catch {
  // The trail never stops work.
}
process.exit(0);
