// 5. THE DELETE GUARD. PreToolUse on Bash and PowerShell.
//
// A recursive delete inside the project is housekeeping. The same command one
// folder too high is the afternoon the photos, the books and the client files
// disappeared. Recursive deletes are allowed inside the workspace roots and
// blocked everywhere else, and a delete aimed at a drive, a home folder or a
// bare wildcard is always blocked.

import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { run, command, deny } from './lib.mjs';

// Each pattern captures the argument list in group 1.
const RECURSIVE = [
  /\brm\s+(?=(?:\S*\s+)*?-[a-zA-Z]*[rR])(.*)$/,
  /\brm\s+(?=.*--recursive)(.*)$/,
  /\bRemove-Item\b(?=.*-Recurse)(.*)$/i,
  /\b(?:rmdir|rd)\s+\/s\b(.*)$/i,
  /\bdel\s+\/s\b(.*)$/i,
];

const norm = (p) => resolve(p).replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();
const HOME_WORDS = /^(~|\$HOME|\$env:USERPROFILE|%USERPROFILE%)[\\/]?\*?$/i;
const ROOT_WORDS = /^(\*|\/\*?|[a-z]:[\\/]?\*?)$/i;

function targets(rest) {
  return rest
    .split(/\s+/)
    .map((t) => t.replace(/^['"]|['"]$/g, ''))
    .filter((t) => t && !t.startsWith('-') && !/^\/[a-z]$/i.test(t));
}

run((payload, cfg) => {
  const cmd = command(payload);
  if (!cmd) return;
  const cwd = payload.cwd || process.cwd();
  const roots = (cfg.workspaceRoots?.length ? cfg.workspaceRoots : [cwd]).map(norm);
  const home = norm(homedir());

  for (const seg of cmd.split(/&&|\|\||;|\n|\|/)) {
    const re = RECURSIVE.find((r) => r.test(seg));
    if (!re) continue;
    const shown = seg.trim();
    for (const raw of targets(seg.match(re)?.[1] ?? '')) {
      if (HOME_WORDS.test(raw) || ROOT_WORDS.test(raw)) {
        deny('recursive deletes stay inside the workspace', `"${shown}" aims at "${raw}", which means a whole drive or home folder.`);
      }
      const expanded = raw.replace(/^(~|\$HOME)(?=[\\/]|$)/, homedir());
      const full = norm(resolve(cwd, expanded.replace(/\*+$/, '') || '.'));
      if (full === home || /^[a-z]:$/.test(full) || full === '' || full === '/') {
        deny('recursive deletes stay inside the workspace', `"${shown}" deletes ${full}.`);
      }
      const inside = roots.some((r) => full !== r && full.startsWith(r + '/'));
      if (!inside) {
        deny(
          'recursive deletes stay inside the workspace',
          `"${shown}" deletes ${full}, which is outside ${roots.join(', ')}. ` +
            'Delete it yourself if you mean it, or add the folder to workspaceRoots in studio-kit.json.',
        );
      }
    }
  }
});
