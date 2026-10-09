// 8. THE DEPLOY GUARD. PreToolUse on Bash and PowerShell.
//
// Production should ship one way, the same way every time, with the checks in
// front of it. A deploy typed from a laptop skips the checks and races every
// other change in flight. Commands that point domains by hand and resets of a
// linked database are blocked; production deploys, database pushes and direct
// pushes to a protected branch ask.

import { run, command, deny, ask } from './lib.mjs';

const PROD = [
  /\bvercel\b[^\n]*\s--prod\b/,
  /\bvercel\s+promote\b/,
  /\bnetlify\s+deploy\b[^\n]*\s--prod\b/,
  /\bfirebase\s+deploy\b/,
  /\bfly(ctl)?\s+deploy\b/,
  /\bsupabase\s+(db\s+push|functions\s+deploy)\b/,
];

run((payload, cfg) => {
  const cmd = command(payload);
  if (!cmd) return;
  const shown = cmd.trim().slice(0, 160);
  const rule = cfg.deployRule;
  const branches = (cfg.protectedBranches?.length ? cfg.protectedBranches : ['main', 'master']).join('|');

  if (/\bvercel\s+(alias|domains\s+(add|rm|remove))\b/.test(cmd)) {
    deny('domains are never pointed by hand', `"${shown}" re-points a live domain outside the deploy pipeline. ${rule}`);
  }
  if (/\bsupabase\s+db\s+reset\b[^\n]*--linked/.test(cmd)) {
    deny('the production database is never reset', `"${shown}" wipes the linked database.`);
  }
  if (PROD.some((re) => re.test(cmd))) ask(`"${shown}" changes production directly. ${rule}`);
  if (new RegExp(`\\bgit\\s+push\\s+\\S+\\s+(HEAD:)?(${branches})\\b`).test(cmd)) {
    ask(`"${shown}" pushes straight to a protected branch. ${rule}`);
  }
});
