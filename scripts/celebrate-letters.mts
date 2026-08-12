/**
 * Proof the Celebrate pre-launch drip without sending anything.
 *
 * Renders all ten letters at the day-to-launch each one actually fires on,
 * writes them to .letters/ for reading in a browser, and fails loudly on the
 * house rules: no em dashes, no unresolved template holes, no hedging openers.
 *
 *   npx tsx scripts/celebrate-letters.mts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { CELEBRATE_LAUNCH } from '../data/celebrate';
import { celebrateDripEmail, lane } from '../lib/celebrate-drip';
import type { CelebrateEntry } from '../lib/celebrate-store';

const LAUNCH = new Date(CELEBRATE_LAUNCH.at).getTime();
const at = (daysOut: number) => LAUNCH - daysOut * 86400000;

/** The day-to-launch each touch actually fires on, from the schedule simulation. */
const FIRES_AT: Record<'team' | 'family', number[]> = {
  team: [65, 45, 30, 14, 2, -2],
  family: [65, 30, 3, -2],
};

const base: Omit<CelebrateEntry, 'audience'> = {
  email: 'dana@whitefishdental.com',
  business: 'Whitefish Dental',
  city: 'Whitefish',
  people: ['Margaret · MAR 14 · Birthday', 'Kelsey R. · MAY 18 · Work Anniversary'],
  surface: 'countdown',
  createdAt: new Date(at(68)).toISOString(),
  step: 0,
  lastAt: new Date(at(68)).toISOString(),
  done: false,
};

const BANNED = [
  '—', '–',
  'unlock', 'supercharge', 'revolutionize', 'game-changer', 'leverage',
  'delve', 'tapestry', 'testament to', 'at the end of the day',
  'I wanted to reach out', 'I hope this finds you', 'feel free to', 'don’t hesitate',
  'do not hesitate', 'per hour', 'hourly', 'an investment',
];

mkdirSync('.letters', { recursive: true });

let failures = 0;
const index: string[] = [];

for (const audience of ['team', 'family'] as const) {
  const touches = lane(audience);
  for (let step = 0; step < touches.length; step += 1) {
    const days = FIRES_AT[audience][step];
    const entry: CelebrateEntry = { ...base, audience };
    const mail = celebrateDripEmail(entry, step, at(days));
    const file = `.letters/${audience}-${step + 1}.html`;
    writeFileSync(file, mail.html, 'utf8');

    const text = `${mail.subject} ${mail.html.replace(/<[^>]+>/g, ' ')}`;
    const hits = BANNED.filter((b) => text.toLowerCase().includes(b.toLowerCase()));
    const holes = /\{\{|\bundefined\b|\bNaN\b|\[INSERT/i.test(text);

    const status = hits.length || holes ? 'FAIL' : 'PASS';
    if (status === 'FAIL') failures += 1;
    console.log(
      `${status}  ${audience.padEnd(6)} ${String(step + 1).padStart(2)}/${touches.length}  T-${String(days).padStart(3)}  ${touches[step].label.padEnd(28)} "${mail.subject}"`
    );
    if (hits.length) console.log(`      banned: ${hits.join(', ')}`);
    if (holes) console.log('      unresolved template hole or undefined value');
    index.push(`<li><a href="${audience}-${step + 1}.html">${audience} ${step + 1}: ${mail.subject}</a> <small>(T-${days})</small></li>`);
  }
}

writeFileSync(
  '.letters/index.html',
  `<!doctype html><meta charset="utf-8"><title>Celebrate drip</title><body style="font:16px/1.7 system-ui;max-width:640px;margin:40px auto"><h1>Celebrate pre-launch drip</h1><p>Opens ${CELEBRATE_LAUNCH.label}.</p><ul>${index.join('')}</ul></body>`,
  'utf8'
);

console.log(`\n${failures === 0 ? 'All letters clean.' : `${failures} letter(s) failed.`} Written to .letters/index.html`);
process.exit(failures === 0 ? 0 : 1);
