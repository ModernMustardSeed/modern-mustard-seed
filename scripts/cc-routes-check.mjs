/**
 * EVERY DOOR THE COMMAND CENTER KNOCKS ON STILL EXISTS.
 *
 *   node scripts/cc-routes-check.mjs
 *
 * The smoke test proves the rooms work, and it needs a running server and a
 * secret, so it cannot run in CI. This can: it reads every `/api/cc/...` path
 * that the browser code and the smoke test actually call, and asserts that a
 * route file exists to answer it.
 *
 * It exists because of the shape of the failure it catches. A route renamed in
 * one commit and a fetch left pointing at the old path type-checks perfectly,
 * builds perfectly, deploys perfectly, and then answers 404 to one button that
 * nobody presses until a client does.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['components/cc', 'app/cc', 'scripts/cc-smoke.mjs', 'components/portal'];
const API_DIR = 'app/api/cc';

function walk(p) {
  const out = [];
  const stat = fs.existsSync(p) ? fs.statSync(p) : null;
  if (!stat) return out;
  if (stat.isFile()) return [p];
  for (const entry of fs.readdirSync(p)) out.push(...walk(path.join(p, entry)));
  return out;
}

const called = new Map(); // route -> files that call it
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (!/\.(tsx?|mjs|js)$/.test(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/['"`]\/api\/cc\/([a-z0-9-]+)/gi)) {
      const name = m[1];
      called.set(name, [...(called.get(name) ?? []), file]);
    }
  }
}

const missing = [];
for (const [name, files] of called) {
  const route = path.join(API_DIR, name, 'route.ts');
  if (!fs.existsSync(route)) missing.push({ name, route, files: [...new Set(files)] });
}

const existing = fs.existsSync(API_DIR) ? fs.readdirSync(API_DIR).filter((d) => fs.existsSync(path.join(API_DIR, d, 'route.ts'))) : [];
const unused = existing.filter((d) => !called.has(d));

for (const m of missing) {
  console.error(`MISSING  /api/cc/${m.name} is called by ${m.files.join(', ')} and has no route file at ${m.route}`);
}
// An endpoint nothing calls is worth saying out loud and is not a failure:
// a cron or an external caller is a legitimate reason for one to exist.
if (unused.length) console.log(`note: ${unused.length} route(s) nothing in the browser calls: ${unused.join(', ')}`);

console.log(`${called.size - missing.length} of ${called.size} Command Center endpoints resolve.`);
process.exit(missing.length ? 1 : 0);
