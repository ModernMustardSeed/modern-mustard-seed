/**
 * NOTHING SLOW MAY STAND BETWEEN THE WORK AND THE RECORD OF IT.
 *
 * On 2026-08-27 a build finished, minted a working voice agent for a 100/100
 * lead, and then sat on it forever. Nothing crashed. `finish()` awaited an
 * 85-second presence audit BEFORE the three writes that mark the build done,
 * inside a route capped at 60 seconds. The platform killed the function
 * mid-wait, so the writes never ran, the catch never fired (the process was
 * gone, it did not throw), and no log, event or alert anywhere said a word.
 * Lyons Roofing was never sent the demo he asked for.
 *
 * The shape is the bug, not the numbers. Any await that can take minutes,
 * followed by a write that records completion, is a coin flip against every
 * deploy, timeout, OOM and cold-start eviction. The writes cost milliseconds.
 * They go first, always, and the slow thing goes last, where losing it costs a
 * nice-to-have instead of the whole job.
 *
 * This walks the real TypeScript AST rather than guessing with regexes, because
 * the bug it is chasing hid inside `after(async () => { ... })` and a checker
 * that cannot see into a callback cannot see the bug it exists to catch.
 *
 * For every function body that awaits one of the SLOW calls, it fails the build
 * if a database write or a queue push follows that await in the same body. A
 * write inside a catch does not count: that is the reporting, not the work.
 *
 * The fix is almost always to move the slow call to the end. When it genuinely
 * has to run first, add 'file.ts:functionName' to ALLOWED with the reason.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

/**
 * Calls that can block for a minute or more: they poll a queue that a worker on
 * another machine drains, or they spawn a model. Add to this list when a new one
 * appears. The point is to name the slow things out loud.
 */
const SLOW = new Set([
  'ensurePresenceAudit',
  'runPresenceAudit',
  'runWebsiteAudit',
  'auditPreferringWorker',
  'waitForAuditJob',
  'waitForRoadmapJob',
  'llmText',
  'llmJson',
  'runClaudeCodeText',
  'runClaudeCodeJson',
]);

/** Writes that record that something happened. Losing one loses work. */
const WRITE_CALL = /^(?:insert|update|upsert|delete|send|enqueue\w*|recordEvent|sendViaResend|sendMailAs)$/;

/**
 * Deliberate exceptions. A bare filename is not enough: say WHY the slow call
 * has to come first, or the next person will read it as an oversight and copy it.
 */
const ALLOWED = new Map([
  [
    'app/api/cron/outbound-audits/route.ts:GET',
    'The write before the wait is enqueueing audit_jobs on the worker road, which is durable and returns before the metered road is reached. The write after is stamping audit_at on one lead. A killed run leaves audit_at null, so the next hour simply picks the same lead up again. Nothing is marked done that is not done, and maxDuration is 120 against a 95s wait.',
  ],
  [
    'app/api/scaling-roadmap/route.ts:POST',
    'The order is enqueued BEFORE the wait, which is the whole design: if the wait expires the visitor gets an honest 202 and the worker owns delivery and the email. The enqueue after the wait is the separate 503 fallback branch, and enqueueRoadmap is idempotent. 250s is set deliberately under the 300s budget so the response still gets out.',
  ],
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** The name being called, for both `foo()` and `a.b.foo()`. */
function calleeName(node) {
  if (!ts.isCallExpression(node)) return null;
  const e = node.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.name)) return e.name.text;
  return null;
}

function isFunctionLike(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  );
}

/** A readable name for the body a finding sits in. */
function bodyName(node) {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) return node.name.text;
  let p = node.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (p && ts.isCallExpression(p)) {
    const outer = calleeName(p);
    if (outer) return `the callback passed to ${outer}()`;
  }
  if (p && ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) return p.name.text;
  return 'an anonymous function';
}

const problems = [];

for (const file of [...walk(join(ROOT, 'lib')), ...walk(join(ROOT, 'app'))]) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const raw = readFileSync(file, 'utf8');
  let hit = false;
  for (const s of SLOW) if (raw.includes(`${s}(`)) hit = true;
  if (!hit) continue;

  const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  /**
   * Walk one function body, ignoring nested bodies (they are visited on their own).
   *
   * The finding is a write BEFORE the slow call and another write AFTER it. Both
   * halves matter. A function that waits on a model and then stores the answer
   * has lost nothing when it dies: the work never happened and the next run
   * redoes it. The Lyons shape is different and much worse. Something real had
   * already been created (a live voice agent, a minted hub, a built site), and
   * the write that would have RECORDED it sat on the far side of the wait. That
   * work cannot be redone by a retry, because the retry sees a row that says the
   * job is still running.
   */
  const scan = (fn) => {
    let slowAt = null;
    let slowName = null;
    let wroteBefore = false;
    const visit = (node) => {
      if (node !== fn && isFunctionLike(node)) return; // nested body, its own scope
      // The reporting inside a catch is exactly what should follow a failure.
      if (ts.isCatchClause(node)) return;
      if (ts.isAwaitExpression(node)) {
        const name = calleeName(node.expression);
        if (name && SLOW.has(name) && slowAt === null) {
          slowAt = node.getStart(sf);
          slowName = name;
        }
      }
      if (slowAt === null && ts.isCallExpression(node)) {
        const name = calleeName(node);
        if (name && WRITE_CALL.test(name)) wroteBefore = true;
      }
      if (slowAt !== null && wroteBefore && ts.isCallExpression(node) && node.getStart(sf) > slowAt) {
        const name = calleeName(node);
        if (name && WRITE_CALL.test(name)) {
          const key = `${rel}:${bodyName(fn)}`;
          if (!ALLOWED.has(key)) {
            const { line } = sf.getLineAndCharacterOfPosition(slowAt);
            problems.push({
              rel,
              fn: bodyName(fn),
              slow: slowName,
              line: line + 1,
              write: name,
              writeLine: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            });
          }
          slowAt = null; // one finding per body is enough to act on
          return;
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(fn, visit);
  };

  const findBodies = (node) => {
    if (isFunctionLike(node) && node.body) scan(node);
    ts.forEachChild(node, findBodies);
  };
  findBodies(sf);
}

if (problems.length) {
  console.error('\nSLOW-BEFORE-WRITES CHECK FAILED\n');
  for (const p of problems) {
    console.error(`  ${p.rel}:${p.line}  in ${p.fn}`);
    console.error(`    awaits ${p.slow}(), then calls ${p.write}() at line ${p.writeLine}`);
  }
  console.error(
    '\nIf the process is killed during that await, every write after it is lost and no catch fires.\n' +
      'Move the slow call to the END of the function, after the writes that record the work, or add\n' +
      "'file.ts:functionName' to ALLOWED in scripts/check-slow-before-writes.mjs with the reason.\n",
  );
  process.exit(1);
}

console.log('slow-before-writes ok');
