// Proves every Studio Kit hook does what its header says, on this machine.
//
//   node test.mjs
//
// Each case feeds a hook the exact JSON Claude Code sends and checks the
// answer: allow (exit 0, no decision), ask (exit 0 with an "ask" decision) or
// deny (exit 2). Run it after install and after any edit to studio-kit.json.
// Strings that would trip the guards while this file is being written are
// assembled from parts.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOKS = join(HERE, 'hooks');
const WORK = mkdtempSync(join(tmpdir(), 'skt-'));
const AUDIT = join(WORK, 'audit');
writeFileSync(join(WORK, 'vercel.json'), JSON.stringify({ crons: [{ path: '/api/a', schedule: '7 * * * *' }] }));

const j = (...parts) => parts.join('');
const sh = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const ps = (command) => ({ tool_name: 'PowerShell', tool_input: { command } });
const write = (file_path, content) => ({ tool_name: 'Write', tool_input: { file_path, content } });
const edit = (file_path, old_string, new_string) => ({ tool_name: 'Edit', tool_input: { file_path, old_string, new_string } });
const mcp = (name, input = {}) => ({ tool_name: name, tool_input: input });

function hook(name, payload) {
  const body = JSON.stringify({ session_id: 'test', cwd: WORK, hook_event_name: 'PreToolUse', ...payload });
  const r = spawnSync(process.execPath, [join(HOOKS, `${name}.mjs`)], {
    input: body,
    encoding: 'utf8',
    env: { ...process.env },
  });
  if (r.status === 2) return 'deny';
  if (r.status !== 0) return `exit ${r.status}`;
  try {
    const out = JSON.parse(r.stdout || '{}');
    if (out?.hookSpecificOutput?.permissionDecision === 'ask') return 'ask';
  } catch {
    // not JSON: an allow
  }
  return 'allow';
}

const STRIPE_LIVE = j('sk', '_live_', '4eC39HqLyjWDarjtT1zdp7dc0000');
const GH_TOKEN = j('gh', 'p_', 'abcdefghijklmnopqrstuvwxyz0123456789');
const PER_HOUR = j('$150', ' per ', 'hour');
const RATE = j('our hourly', ' rate is posted');

const cases = [
  // 1 words
  ['words-guard', write(join(WORK, 'proposal.md'), `The build is ${PER_HOUR}.`), 'deny'],
  ['words-guard', write(join(WORK, 'proposal.md'), `Note: ${RATE}.`), 'deny'],
  ['words-guard', write(join(WORK, 'proposal.md'), 'The Build and Ship package is $9,500, set.'), 'allow'],
  ['words-guard', write(join(WORK, 'hours.md'), 'Open 8 to 5. Hours of operation are on the door.'), 'allow'],
  ['words-guard', sh(`grep -ri "${RATE}" docs`), 'allow'],
  ['words-guard', write(join(homedir(), '.claude', 'CLAUDE.md'), `Never write ${PER_HOUR}.`), 'allow'],
  // 2 secrets
  ['secrets-guard', write(join(WORK, 'lib', 'pay.ts'), `const key = '${STRIPE_LIVE}';`), 'deny'],
  ['secrets-guard', sh(`echo "TOKEN=${GH_TOKEN}" > config.txt`), 'deny'],
  ['secrets-guard', write(join(WORK, '.env.local'), `STRIPE_SECRET_KEY=${STRIPE_LIVE}`), 'allow'],
  ['secrets-guard', write(join(WORK, 'lib', 'pay.ts'), 'const key = process.env.STRIPE_SECRET_KEY;'), 'allow'],
  // 3 cron
  ['cron-guard', edit(join(WORK, 'vercel.json'), '"7 * * * *"}]', '"7 * * * *"}, { "path": "/api/b", "schedule": "7 3 * * *" }]'), 'deny'],
  ['cron-guard', edit(join(WORK, 'vercel.json'), '"7 * * * *"}]', '"7 * * * *"}, { "path": "/api/b", "schedule": "23 3 * * *" }]'), 'allow'],
  ['cron-guard', write(join(WORK, '.github', 'workflows', 'a.yml'), "on:\n  schedule:\n    - cron: '0 9 * * *'\n    - cron: '0 17 * * *'\n"), 'deny'],
  // 4 git
  ['git-guard', sh('git push --force origin main'), 'deny'],
  ['git-guard', sh('git push -f'), 'deny'],
  ['git-guard', sh('git push -f origin feat/new-page'), 'allow'],
  ['git-guard', sh('git commit --no-verify -m "wip"'), 'deny'],
  ['git-guard', sh('git reset --hard origin/main'), 'ask'],
  ['git-guard', sh('git push origin feat/new-page'), 'allow'],
  // 5 delete
  ['delete-guard', sh('rm -rf node_modules .next'), 'allow'],
  ['delete-guard', sh('rm -rf ~'), 'deny'],
  ['delete-guard', sh('rm -rf ../other-project'), 'deny'],
  ['delete-guard', sh('rm -rf /'), 'deny'],
  ['delete-guard', ps('Remove-Item -Recurse -Force C:\\'), 'deny'],
  ['delete-guard', ps('Remove-Item -Recurse -Force .\\dist'), 'allow'],
  ['delete-guard', sh('rm notes.txt'), 'allow'],
  // 6 send
  ['send-guard', sh('curl -X POST https://api.resend.com/emails -d @mail.json'), 'ask'],
  ['send-guard', sh('curl https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json -d Body=hi'), 'ask'],
  ['send-guard', mcp('mcp__gmail__send_email', { to: 'a@b.co' }), 'ask'],
  ['send-guard', mcp('mcp__gmail__create_draft', { to: 'a@b.co' }), 'allow'],
  ['send-guard', sh('curl https://example.com'), 'allow'],
  // 7 money
  ['money-guard', sh('stripe refunds create --charge ch_123'), 'ask'],
  ['money-guard', sh('stripe customers list --limit 3'), 'allow'],
  ['money-guard', sh('curl https://api.stripe.com/v1/refunds -u key: -d charge=ch_1'), 'ask'],
  ['money-guard', mcp('mcp__stripe__create_refund', { charge: 'ch_1' }), 'ask'],
  ['money-guard', mcp('mcp__stripe__list_customers', {}), 'allow'],
  // 8 deploy
  ['deploy-guard', sh(j('vercel', ' --prod')), 'ask'],
  ['deploy-guard', sh(j('vercel alias', ' set my-preview.vercel.app example.com')), 'deny'],
  ['deploy-guard', sh('supabase db reset --linked'), 'deny'],
  ['deploy-guard', sh('git push origin main'), 'ask'],
  ['deploy-guard', sh('vercel ls'), 'allow'],
  // 9 sql
  ['sql-guard', sh('psql "$DATABASE_URL" -c "drop table customers"'), 'ask'],
  ['sql-guard', sh('psql "$DATABASE_URL" -c "delete from leads;"'), 'ask'],
  ['sql-guard', sh('psql "$DATABASE_URL" -c "delete from leads where id = 4;"'), 'allow'],
  ['sql-guard', mcp('mcp__supabase__execute_sql', { query: 'update orders set status = \'void\'' }), 'ask'],
  ['sql-guard', mcp('mcp__supabase__execute_sql', { query: 'select count(*) from orders' }), 'allow'],
  // 10 audit
  ['audit-log', sh('ls'), 'allow'],
];

let failed = 0;
process.env.STUDIO_KIT_AUDIT = AUDIT;
for (const [name, payload, want] of cases) {
  const got = hook(name, payload);
  const ok = got === want;
  if (!ok) failed++;
  const label = payload.tool_input.command ?? payload.tool_input.file_path ?? payload.tool_name;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(14)} ${want.padEnd(5)} ${got === want ? '' : `(got ${got}) `}${String(label).slice(0, 70)}`);
}
rmSync(WORK, { recursive: true, force: true });
console.log(`\n${cases.length - failed} of ${cases.length} passed.`);
process.exit(failed ? 1 : 0);
