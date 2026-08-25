#!/usr/bin/env node
/**
 * EVERY NAMED IMPORT A WORKER MAKES HAS TO RESOLVE.
 *
 * On 2026-08-22 at 09:10 a merge took master's whole copy of lib/site-directive.mjs
 * and kept the branch's copy of scripts/demo-site-worker.mjs. Master's copy had no
 * `editMultipageAddendum`; the worker imported it by name on line 31. Nothing in the
 * repo noticed. The build worker was already running with the old module cached, so
 * it kept building all day and the break stayed invisible until the process next
 * restarted, thirty-nine hours later. From that moment, on every single launch:
 *
 *     SyntaxError: The requested module '../lib/site-directive.mjs'
 *     does not provide an export named 'editMultipageAddendum'
 *
 * The watchdog restarted it 91 times, the queue stopped moving, leads sat waiting,
 * and the one build in flight was orphaned in 'building' where nothing could reclaim
 * it. `next build` never compiles scripts/, eslint does not resolve cross-module
 * exports, and no test imports a worker, so a whole class of fatal break had no gate
 * on it at all.
 *
 * This is that gate. It reads every .mjs under scripts/ and lib/, follows the
 * relative imports, and checks that each name asked for is actually exported by the
 * file it names. Static: nothing is executed, so it is safe in CI and costs
 * milliseconds.
 *
 * A named import that does not resolve is FATAL, not degraded. ESM refuses to link
 * the module and the process dies before its first line runs, so there is no
 * fallback path to take and no log line to find later. That is why this exits
 * non-zero rather than warning.
 *
 * Run:  node scripts/check-worker-imports.mjs
 *       pnpm check:imports
 * Wired into `pnpm build` and into the ship gate, so a PR that would take a worker
 * down cannot be merged.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * WHAT GETS CHECKED: every .mjs file under scripts/ and lib/.
 *
 * Not a hand-kept list of workers. A list is a thing to forget, and the day someone
 * adds a worker and forgets to add it here is the day this stops being a gate.
 * These are all plain ESM with no build step, the sweep is static, and it costs
 * milliseconds, so there is no reason to be selective.
 *
 * .mts / .ts workers (audit, factory, roadmap, acquisition) are deliberately out of
 * scope: they run through tsx, and `tsc --noEmit` already resolves their exports
 * with a real type checker, which is strictly better than this regex.
 */
const SCAN_DIRS = ['scripts', 'lib'];

function entrypoints() {
  const found = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) {
      if (name.endsWith('.mjs')) found.push(path.join(abs, name));
    }
  }
  return found.sort();
}

/** Only files we can read and parse: JS on disk, reached by a relative specifier. */
const FOLLOWABLE = /^\.\.?\//;
const EXTENSIONS = ['', '.mjs', '.js', '.cjs'];

function resolveSpecifier(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (existsSync(candidate) && !candidate.endsWith(path.sep)) return candidate;
  }
  return null;
}

/**
 * Named imports, in the two forms these files actually use:
 *   import { a, b as c } from '../lib/x.mjs'
 *   import def, { a } from '../lib/x.mjs'
 * A namespace import (`import * as D`) is deliberately NOT checked: it always links,
 * and a missing member on it is a runtime undefined, not a dead process. Dynamic
 * `await import()` is not checked for the same reason.
 */
const IMPORT_RE = /import\s+(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;

/**
 * Blank out comments before looking for anything, KEEPING line numbers intact.
 *
 * This file documents the bug it exists to catch, and the example it quotes reads
 * like a perfectly good import as far as a regex is concerned. The first run of the
 * directory sweep duly reported this file as broken. Any commented-out import in any
 * worker would have done the same.
 *
 * The comment is blanked rather than deleted so a reported line number still points
 * at the real line in the real file.
 */
function stripComments(src) {
  const BLOCK = new RegExp('/\\*[\\s\\S]*?\\*/', 'g');
  const LINE = new RegExp('^(\\s*)//.*$', 'gm');
  return src
    .replace(BLOCK, (m) => m.replace(/[^\n]/g, ' '))
    .replace(LINE, (m, indent) => indent + ' '.repeat(m.length - indent.length));
}

/**
 * What a module exports. Regex, not an AST, on purpose: these are plain ESM files
 * with top-level exports and no build step, and a parser dependency inside the build
 * gate is a new way for the gate itself to break.
 */
function exportsOf(file) {
  const src = stripComments(readFileSync(file, 'utf8'));
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  // export { a, b as c }  and  export { a } from './x.mjs'
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const piece = part.trim();
      if (!piece) continue;
      const as = piece.split(/\s+as\s+/);
      names.add((as[1] ?? as[0]).trim());
    }
  }
  if (/^export\s+default\b/m.test(src)) names.add('default');
  // `export * from './x.mjs'` re-exports names this file does not itself declare, so
  // follow it rather than reporting a false missing.
  for (const m of src.matchAll(/^export\s*\*\s*from\s*['"]([^'"]+)['"]/gm)) {
    const target = resolveSpecifier(file, m[1]);
    if (target) for (const n of exportsOf(target)) names.add(n);
  }
  return names;
}

const problems = [];
const seen = new Set();

function check(file, why) {
  if (seen.has(file)) return;
  seen.add(file);
  if (!existsSync(file)) {
    problems.push(`${why}: file does not exist: ${path.relative(ROOT, file)}`);
    return;
  }
  const src = stripComments(readFileSync(file, 'utf8'));
  for (const m of src.matchAll(IMPORT_RE)) {
    const [, clause, spec] = m;
    if (!FOLLOWABLE.test(spec)) continue; // node: builtins and packages are npm's job
    const target = resolveSpecifier(file, spec);
    if (!target) {
      problems.push(`${path.relative(ROOT, file)} imports '${spec}', which does not exist on disk`);
      continue;
    }
    if (/\.tsx?$/.test(target)) continue; // .ts is loaded through tsx, and tsc already types it
    const available = exportsOf(target);
    const line = src.slice(0, m.index).split('\n').length;
    for (const part of clause.split(',')) {
      const piece = part.trim();
      if (!piece) continue;
      const wanted = piece.split(/\s+as\s+/)[0].trim();
      if (!available.has(wanted)) {
        problems.push(
          `${path.relative(ROOT, file)}:${line} imports { ${wanted} } from '${spec}', ` +
            `but ${path.relative(ROOT, target)} does not export it. ` +
            `This is a link-time SyntaxError: the process dies before its first line runs.`,
        );
      }
    }
    check(target, `reached from ${path.relative(ROOT, file)}`);
  }
}

const ENTRYPOINTS = entrypoints();
for (const file of ENTRYPOINTS) check(file, 'entrypoint');

if (problems.length) {
  console.error('\nWORKER IMPORTS ARE BROKEN. A worker with one of these cannot start at all:\n');
  for (const p of problems) console.error('  x ' + p);
  console.error('\nFix the export or the import. Do not delete the import to make this pass:');
  console.error('a worker that starts and silently skips a rule is worse than one that refuses.\n');
  process.exit(1);
}

console.log(
  `worker imports OK (${seen.size} modules reachable from ${ENTRYPOINTS.length} .mjs entrypoints in ${SCAN_DIRS.join('/ and ')}/)`,
);
