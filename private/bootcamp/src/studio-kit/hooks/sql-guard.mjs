// 9. THE SQL GUARD. PreToolUse on Bash, PowerShell and every MCP tool.
//
// One statement can erase years of customer records. Dropping tables, schemas
// or columns, truncating, and DELETE or UPDATE with no WHERE clause all stop
// and ask, whether they go through psql, a CLI or a database MCP tool.
// Migrations written to a file are reviewed in the pull request instead.

import { run, command, mcpTool, ask } from './lib.mjs';

const DANGER = [
  [/\bdrop\s+(table|schema|database|view|function|policy|type)\b/i, 'drops an object'],
  [/\btruncate\s+(table\s+)?\w/i, 'empties a table'],
  [/\balter\s+table\s+[\w."]+\s+drop\s+(column\s+)?\w/i, 'drops a column'],
  [/\bdelete\s+from\s+[\w."]+\s*(;|$|'|"|\n)/im, 'deletes every row (no WHERE)'],
  [/\bupdate\s+[\w."]+\s+set\s+(?![^;'"]*\bwhere\b)[^;'"]*(;|$|'|")/im, 'updates every row (no WHERE)'],
];

function sqlOf(payload) {
  const tool = mcpTool(payload);
  if (tool) {
    if (!/(sql|query|execute|database|supabase|postgres|_db)/i.test(tool)) return '';
    return Object.values(payload.tool_input ?? {}).filter((v) => typeof v === 'string').join('\n');
  }
  const cmd = command(payload);
  return /\b(psql|supabase|mysql|sqlite3|prisma|drizzle-kit|knex)\b/i.test(cmd) ? cmd : '';
}

run((payload) => {
  const sql = sqlOf(payload);
  if (!sql) return;
  for (const [re, what] of DANGER) {
    if (re.test(sql)) {
      ask(`This database statement ${what}. There is no undo. Confirm there is a fresh backup and that it targets the right database.`);
    }
  }
});
