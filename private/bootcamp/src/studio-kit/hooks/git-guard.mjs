// 4. THE GIT GUARD. PreToolUse on Bash and PowerShell.
//
// History on the main branch is the record of what customers saw. Rewriting
// it, skipping the checks that protect it, or deleting it is never a step in
// ordinary work. Force pushes and branch deletes on a protected branch are
// blocked; hard resets, cleans and discarded changes stop and ask.

import { run, command, deny, ask } from './lib.mjs';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

run((payload, cfg) => {
  const cmd = command(payload);
  if (!/\bgit\b/.test(cmd)) return;
  const branches = (cfg.protectedBranches?.length ? cfg.protectedBranches : ['main', 'master']).map(esc);
  const prot = new RegExp(`(^|[\\s:/+])(${branches.join('|')})(\\s|$)`);

  for (const seg of cmd.split(/&&|\|\||;|\n/)) {
    const s = seg.trim();
    if (!/\bgit\s/.test(s)) continue;
    const isPush = /\bgit\s+push\b/.test(s);
    const forced = /(\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S+)/.test(s);
    // A bare force push targets whatever branch is checked out, which may be main.
    const namesBranch = /\bpush(\s+-\S+)*\s+[^-\s]\S*\s+[^-\s]\S*/.test(s);
    if (isPush && forced && (prot.test(s) || !namesBranch)) {
      deny('protected branches are never force-pushed', `"${s}" rewrites shared history. Push a new commit that fixes the problem instead.`);
    }
    if (/\bgit\s+(branch\s+-[dD]\b|push\s+\S+\s+(--delete\b|:))/.test(s) && prot.test(s)) {
      deny('protected branches are never deleted', `"${s}" deletes a protected branch.`);
    }
    if (/\s--no-verify\b/.test(s)) {
      deny('checks are never skipped', `"${s}" skips the hooks that guard this repo. Fix what the hook found instead.`);
    }
    if (/\bgit\s+reset\s+--hard\b/.test(s) || /\bgit\s+clean\s+-[a-z]*f/.test(s) || /\bgit\s+checkout\s+--\s+\.$/.test(s) || /\bgit\s+restore\s+(--\S+\s+)*\.$/.test(s)) {
      ask(`"${s}" throws away uncommitted work and cannot be undone. Approve only after looking at what is there.`);
    }
  }
});
