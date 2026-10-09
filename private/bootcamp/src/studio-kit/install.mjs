// Installs the Studio Kit into Claude Code on this machine. Windows and macOS.
//
//   node install.mjs              install or update
//   node install.mjs --dry-run    show what would change, change nothing
//   node install.mjs --force      also overwrite skills you already have
//   node install.mjs --uninstall  take the ten hooks back out of settings
//
// What it does, in order:
//   1. Copies the hooks, studio-kit.json and test.mjs to ~/.claude/studio-kit.
//      Your studio-kit.json is kept if you already edited one.
//   2. Backs up ~/.claude/settings.json, then writes the ten hooks into it with
//      absolute paths for this machine. Hooks you wrote yourself are kept.
//      Running it twice never adds a hook twice.
//   3. Copies each skill to ~/.claude/skills/<name>, skipping any you have.
//   4. Puts the rules file template at ~/.claude/CLAUDE.md if you have none,
//      or next to yours as CLAUDE.studio-kit.md if you do.
//   5. Runs the test suite against the installed hooks.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const FORCE = args.has('--force');
const UNINSTALL = args.has('--uninstall');

const CLAUDE = join(homedir(), '.claude');
const KIT = join(CLAUDE, 'studio-kit');
const SETTINGS = join(CLAUDE, 'settings.json');
const MARK = '/studio-kit/hooks/';

const say = (s) => console.log(s);
const fwd = (p) => p.replace(/\\/g, '/');
const step = (label, fn) => {
  say(`${DRY ? '[dry run] ' : ''}${label}`);
  if (!DRY) fn();
};

const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  say(`Node ${process.versions.node} is too old. Install Node 20 or newer from nodejs.org, then run this again.`);
  process.exit(1);
}

function readSettings() {
  if (!existsSync(SETTINGS)) return {};
  const raw = readFileSync(SETTINGS, 'utf8').replace(/^﻿/, '');
  try {
    return JSON.parse(raw);
  } catch {
    say(`${SETTINGS} is not valid JSON. Fix it or move it aside, then run this again. Nothing was changed.`);
    process.exit(1);
  }
}

/** Every hook group with the kit's commands taken out; groups left empty are dropped. */
function withoutKit(hooks) {
  const out = {};
  for (const [event, groups] of Object.entries(hooks ?? {})) {
    const kept = (Array.isArray(groups) ? groups : [])
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !fwd(String(h.command ?? '')).includes(MARK)) }))
      .filter((g) => g.hooks.length);
    if (kept.length) out[event] = kept;
  }
  return out;
}

const settings = readSettings();
mkdirSync(CLAUDE, { recursive: true });

if (UNINSTALL) {
  const next = { ...settings, hooks: withoutKit(settings.hooks) };
  step(`Backing up settings to settings.json.bak-${Date.now()}`, () => existsSync(SETTINGS) && copyFileSync(SETTINGS, `${SETTINGS}.bak-${Date.now()}`));
  step('Removing the ten Studio Kit hooks from settings.json', () => writeFileSync(SETTINGS, JSON.stringify(next, null, 2) + '\n'));
  say('Done. The files in ~/.claude/studio-kit and your skills were left in place.');
  process.exit(0);
}

// 1. Files
step(`Copying hooks to ${KIT}`, () => {
  mkdirSync(KIT, { recursive: true });
  cpSync(join(HERE, 'hooks'), join(KIT, 'hooks'), { recursive: true });
  copyFileSync(join(HERE, 'test.mjs'), join(KIT, 'test.mjs'));
  if (!existsSync(join(KIT, 'studio-kit.json')) || FORCE) copyFileSync(join(HERE, 'studio-kit.json'), join(KIT, 'studio-kit.json'));
});

// 2. Settings
const manifest = JSON.parse(readFileSync(join(HERE, 'hooks', 'manifest.json'), 'utf8'));
const hooks = withoutKit(settings.hooks);
for (const h of manifest.hooks) {
  const group = { matcher: h.matcher, hooks: [{ type: 'command', command: `node "${fwd(join(KIT, 'hooks', `${h.name}.mjs`))}"`, timeout: 15 }] };
  hooks[h.event] = [...(hooks[h.event] ?? []), group];
}
const stamp = Date.now();
step(`Backing up ${SETTINGS} to settings.json.bak-${stamp}`, () => existsSync(SETTINGS) && copyFileSync(SETTINGS, `${SETTINGS}.bak-${stamp}`));
step(`Writing ${manifest.hooks.length} hooks into ${SETTINGS}`, () => writeFileSync(SETTINGS, JSON.stringify({ ...settings, hooks }, null, 2) + '\n'));

// 3. Skills
const skillsSrc = join(HERE, 'skills');
for (const name of readdirSync(skillsSrc)) {
  const dest = join(CLAUDE, 'skills', name);
  if (existsSync(dest) && !FORCE) {
    say(`Skipping skill ${name}: you already have one by that name (use --force to replace it).`);
    continue;
  }
  step(`Installing skill ${name}`, () => cpSync(join(skillsSrc, name), dest, { recursive: true }));
}

// 4. Rules file
const rulesDest = existsSync(join(CLAUDE, 'CLAUDE.md')) ? join(CLAUDE, 'CLAUDE.studio-kit.md') : join(CLAUDE, 'CLAUDE.md');
step(`Writing the rules file template to ${rulesDest}`, () => copyFileSync(join(HERE, 'CLAUDE.template.md'), rulesDest));
if (rulesDest.endsWith('CLAUDE.studio-kit.md')) {
  say('You already have a CLAUDE.md. Open CLAUDE.studio-kit.md beside it and move the laws you want into yours.');
}

// 5. Test
if (!DRY) {
  say('\nTesting the installed hooks:\n');
  const r = spawnSync(process.execPath, [join(KIT, 'test.mjs')], { stdio: 'inherit' });
  if (r.status !== 0) {
    say('\nA test failed. The hooks are installed; read the FAIL lines above, or run node install.mjs --uninstall.');
    process.exit(1);
  }
}
say('\nInstalled. Start a new Claude Code session so it loads the hooks, then type /hooks to see all ten.');
