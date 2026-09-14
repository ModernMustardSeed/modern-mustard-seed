/**
 * IS IT STILL THERE?
 *
 * Every gate in select.mts asks whether we know enough about a business to
 * print it. None of them asks whether the business still exists. That was fine
 * while the flyer was a mailing and fatal the moment it became a walk-in: Sarah
 * is driving to 108 front doors with a sheet of paper for each one, and a stop
 * that closed last spring costs her the drive, the parking, and the minute of
 * standing in front of a dark window before she crosses it off.
 *
 * Google marks a dead place on its own panel and has for years. This reads that
 * marker and nothing else. It is deliberately the dumbest possible check,
 * because the expensive failure here is the opposite one: wrongly marking a
 * living business closed removes a real customer from the run and nobody ever
 * finds out. So a page that does not load, a search that opens a list instead
 * of a place, a name that does not match: all of those are recorded as UNKNOWN
 * and the business stays in. Only an explicit closure takes one out.
 *
 * IDENTITY IS THE PHONE, the same proof every other Maps job in this folder
 * uses. Marking the business next door as closed would be worse than not
 * checking at all, so a panel whose phone disagrees with ours is evidence about
 * somebody else, whatever it says about itself.
 *
 * The mark goes in notes as CLOSED with the date, alongside the NO WEBSITE
 * marker that already lives there, and the `open` gate in select.mts drops
 * anything carrying it. A place that reopens is cleared by deleting the line.
 *
 *   npx tsx scripts/door-drop/open-check.mts --out artifacts/door-drop/kalispell
 *   npx tsx scripts/door-drop/open-check.mts --out artifacts/door-drop/kalispell --apply
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { openBrowser } from '../acq-maps.mts';
import { loadEnv, supabase, REGIONS, CLOSED_MARK, type Region } from './select.mts';

const argv = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? d);
};
const OUT = path.resolve(flag('out', path.join('artifacts', 'door-drop', 'kalispell')));
const REGION: Region = REGIONS[(flag('region', 'montana') || 'montana').toLowerCase()] ?? REGIONS.montana;
const APPLY = argv.includes('--apply');
const HEADED = argv.includes('--headed');

loadEnv(process.cwd());
const sb = supabase();

const BUNDLE = path.join(process.cwd(), '.door-drop-open.mjs');
execFileSync(
  'npx',
  ['--no-install', 'esbuild', 'lib/enrich.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${BUNDLE}`],
  { stdio: 'pipe', shell: process.platform === 'win32' },
);
const { isSameBusiness } = (await import(pathToFileURL(BUNDLE).href)) as {
  isSameBusiness: (a: string, b: string, where?: string) => boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const phoneKey = (p: string | null) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};

const manifest = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8')) as {
  printed: { id: string; business_name: string }[];
};
const ids = manifest.printed.map((p) => p.id).filter(Boolean);

const { data: rows } = await sb
  .from('outbound_leads')
  .select('id, business_name, city, address, phone, notes')
  .in('id', ids);

const todo = (rows ?? []).filter((r) => !String(r.notes ?? '').includes(CLOSED_MARK));
console.log(`${ids.length} on the sheet, ${todo.length} to check${APPLY ? '' : '   (DRY RUN)'}\n`);

const { browser, page } = await openBrowser(HEADED);
const closed: { id: string; business_name: string; address: string | null; why: string }[] = [];
const unknown: { business_name: string; why: string }[] = [];
let open = 0;

for (let i = 0; i < todo.length; i++) {
  const lead = todo[i];
  const q = `${lead.business_name} ${lead.city}, ${REGION.state}`;
  const label = `[${i + 1}/${todo.length}] ${String(lead.business_name).slice(0, 32).padEnd(33)}`;

  type Panel = { h1: string | null; body: string | null; phoneItem: string | null };
  let got: Panel | null = null;
  try {
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(q)}?hl=en&gl=us`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await sleep(4200);
    // No named function inside evaluate: tsx's keepNames injects a __name helper
    // that does not exist in a browser, and the whole panel reads as empty.
    got = (await page.evaluate(`(() => {
      var p = document.querySelector('div[role="main"]');
      return {
        h1: document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : null,
        body: p ? p.innerText.slice(0, 4000) : null,
        phoneItem: document.querySelector('button[data-item-id^="phone"]') ? document.querySelector('button[data-item-id^="phone"]').getAttribute('data-item-id') : null
      };
    })()`)) as Panel;
  } catch {
    unknown.push({ business_name: lead.business_name, why: 'page did not load' });
    console.log(`${label} ? page did not load`);
    await sleep(5000);
    continue;
  }

  if (!got?.h1 || /^results$/i.test(got.h1)) {
    unknown.push({ business_name: lead.business_name, why: 'Maps showed a list, not one place' });
    console.log(`${label} ? no single place`);
    await sleep(2500);
    continue;
  }

  /**
   * The phone decides, and only when both sides carry one. Where either is
   * missing the name has to do it, and a name that does not match makes the
   * panel evidence about somebody else's business rather than ours.
   */
  const ourPhone = phoneKey(lead.phone);
  const theirPhone = phoneKey(got.phoneItem);
  const sameByPhone = Boolean(ourPhone && theirPhone && ourPhone === theirPhone);
  const sameByName = isSameBusiness(lead.business_name, got.h1, `${lead.city}, ${REGION.state}`);

  if (ourPhone && theirPhone && ourPhone !== theirPhone) {
    unknown.push({ business_name: lead.business_name, why: 'phone on the panel disagrees' });
    console.log(`${label} ? phone disagrees`);
    await sleep(2500);
    continue;
  }
  if (!sameByPhone && !sameByName) {
    unknown.push({ business_name: lead.business_name, why: `panel was "${got.h1}"` });
    console.log(`${label} ? panel is ${String(got.h1).slice(0, 26)}`);
    await sleep(2500);
    continue;
  }

  const body = got.body ?? '';
  const permanently = /permanently closed/i.test(body);
  const temporarily = /temporarily closed/i.test(body);

  if (permanently || temporarily) {
    const why = permanently ? 'Permanently closed on Google' : 'Temporarily closed on Google';
    closed.push({ id: lead.id, business_name: lead.business_name, address: lead.address, why });
    console.log(`${label} X ${why}`);
  } else {
    open += 1;
    console.log(`${label} open`);
  }
  await sleep(2200);
}

await browser.close();
try { rmSync(BUNDLE); } catch { /* nothing to clean up */ }

writeFileSync(
  path.join(OUT, 'closed.json'),
  JSON.stringify({ checked_at: new Date().toISOString(), open, closed, unknown }, null, 2),
  'utf8',
);

console.log(`\nopen ${open}, closed ${closed.length}, could not tell ${unknown.length}`);
for (const c of closed) console.log(`  ${c.business_name} - ${c.why}`);

if (!APPLY) {
  console.log('\nDRY RUN. Nothing written. Re-run with --apply to mark them.');
} else if (closed.length) {
  const today = new Date().toISOString().slice(0, 10);
  for (const c of closed) {
    const row = (rows ?? []).find((r) => r.id === c.id);
    const note = String(row?.notes ?? '').trim();
    const line = `${CLOSED_MARK} ${today}: ${c.why}`;
    await sb
      .from('outbound_leads')
      .update({ notes: note ? `${note}\n${line}` : line })
      .eq('id', c.id);
  }
  console.log(`\nMarked ${closed.length}. They drop out of the next build.`);
}
