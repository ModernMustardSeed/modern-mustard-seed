// 3. THE CRON GUARD. PreToolUse on Write, Edit and MultiEdit.
//
// Two scheduled jobs that start on the same minute contend for the same
// database, the same inbox and the same rate limits, and the slower one is
// the one that silently loses. Nobody catches it by eye in a file holding
// twenty schedules. The guard judges the whole file as it will be after the
// edit: JSON "schedule" entries (vercel.json and friends) and YAML cron lines
// (GitHub Actions).

import { run, fileAfter, deny } from './lib.mjs';

run((payload) => {
  const f = fileAfter(payload);
  if (!f || !f.text) return;
  const exprs = [
    ...[...f.text.matchAll(/"schedule"\s*:\s*"([^"]+)"/g)].map((m) => m[1]),
    ...[...f.text.matchAll(/-\s*cron\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
  ];
  if (exprs.length < 2) return;
  const seen = new Map();
  for (const raw of exprs) {
    const expr = raw.trim();
    const minute = expr.split(/\s+/)[0];
    if (!/^\d+$/.test(minute)) continue;
    if (seen.has(minute)) {
      deny(
        'no two scheduled jobs share a minute',
        `Two schedules in ${f.path} both start at minute ${minute} ("${seen.get(minute)}" and "${expr}"). ` +
          'Move one to a minute nothing else uses. Odd minutes (7, 23, 38, 51) are the ones nobody else picks.',
      );
    }
    seen.set(minute, expr);
  }
});
