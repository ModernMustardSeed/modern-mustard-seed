/**
 * PUT THE PRESS FILE SOMEWHERE A PRINT SHOP CAN OPEN IT.
 *
 * A print shop cannot be handed a file over a chat window, and a 7 MB PDF is
 * exactly the size that email either bounces or silently strips. So the run
 * goes to a public Supabase bucket and comes back as a plain https link that
 * opens in any browser with no login, no app and no account: the only kind of
 * link you can paste into an email to a stranger and expect to work.
 *
 * The bucket is `print-runs`, public read, PDFs and CSVs only, 50 MB a file.
 * Public is the point. A signed URL expires, and it will expire on the afternoon
 * the shop finally gets to the job.
 *
 * Paths carry the date and the region, so a later run never overwrites the file
 * a shop is already working from:
 *
 *   print-runs/2026-09-11/montana/flyers-press.pdf
 *   print-runs/2026-09-11/montana/printer-spec.pdf
 *   print-runs/2026-09-11/montana/route-sheet.pdf
 *
 *   node scripts/door-drop/publish.mjs --out artifacts/door-drop/mt-final --region montana
 *   node scripts/door-drop/publish.mjs --out ... --region florida --label 2026-09-12
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? d);
};

const OUT = path.resolve(flag('out', path.join('artifacts', 'door-drop', 'mt-final')));
const REGION = (flag('region', 'montana') || 'montana').toLowerCase();
const LABEL = flag('label', new Date().toISOString().slice(0, 10));
const BUCKET = 'print-runs';

for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const U = process.env.supabase_url;
const K = process.env.supabase_service_role_key;
if (!U || !K) { console.error('No supabase creds in .env.local'); process.exit(1); }

/** What a printer needs, and nothing else. The proofs and the manifest stay home. */
const FILES = [
  ['press/flyers-press.pdf', 'flyers-press.pdf', 'application/pdf'],
  ['press/printer-spec.pdf', 'printer-spec.pdf', 'application/pdf'],
  ['route/route-by-town.pdf', 'route-by-town.pdf', 'application/pdf'],
  ['route/route-sheet.pdf', 'route-sheet.pdf', 'application/pdf'],
  ['route/route-sheet.csv', 'route-sheet.csv', 'text/csv'],
];

const links = [];
for (const [rel, name, type] of FILES) {
  const src = path.join(OUT, rel);
  if (!existsSync(src)) { console.log(`  skipped ${name}: not in this run`); continue; }
  const body = readFileSync(src);
  const key = `${LABEL}/${REGION}/${name}`;
  const res = await fetch(`${U}/storage/v1/object/${BUCKET}/${key}`, {
    method: 'POST',
    headers: {
      apikey: K,
      Authorization: `Bearer ${K}`,
      'Content-Type': type,
      // Overwrite rather than fail, so a rebuilt run replaces its own file.
      'x-upsert': 'true',
    },
    body,
  });
  if (!res.ok) { console.error(`  FAILED ${name}: ${res.status} ${(await res.text()).slice(0, 160)}`); continue; }
  const url = `${U}/storage/v1/object/public/${BUCKET}/${key}`;
  links.push([name, url, (body.length / 1048576).toFixed(1)]);
  console.log(`  ${name.padEnd(20)} ${(body.length / 1048576).toFixed(1)} MB`);
}

console.log('');
for (const [name, url] of links) console.log(`${name}\n  ${url}\n`);

/**
 * THE EMAIL, WRITTEN FROM THE RUN.
 *
 * The first two of these were typed by hand, which means the page count in the
 * email and the page count in the PDF were two separate facts that agreed by
 * luck. A printer works from the email. If it says 19 pages and the file holds
 * 97, somebody prints the wrong job and nobody finds out until the box is
 * opened. Every number here is read out of the manifest that produced the file.
 */
const manifest = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
const pages = manifest.printed.length;
const press = links.find(([n]) => n === 'flyers-press.pdf')?.[1] ?? '';
const spec = links.find(([n]) => n === 'printer-spec.pdf')?.[1] ?? '';
const phone = REGION === 'florida' ? '(850) 985-9252' : '(406) 312-1223';

const email = `Subject: Print job, ${pages} single sided colour letter pages, ready to download

Hi,

I have a print job ready and the file is already online, so there is nothing to
upload or email back and forth.

The file:
${press}

A one page spec sheet with the same details is here:
${spec}

The one thing to know before you start: every page in that file is a different
business. It is not one design at quantity ${pages}. It is ${pages} separate flyers, each
with its own company name and its own text, so please print the file straight
through, one copy of each page, rather than repeating page one.

  File            flyers-press.pdf, ${pages} pages
  Quantity        1 of each page, ${pages} sheets total
  Sides           ONE SIDE ONLY, full colour. The back stays blank.
  Trim size       8.5 x 11, standard letter, portrait
  File size       8.75 x 11.25, which is 0.125 bleed on all four sides with
                  crop marks. Trim to 8.5 x 11.
  Stock           100 lb matte cover preferred. 80 lb text is fine if it keeps
                  the job same day.
  Finishing       Cut to trim. No fold, no score, no round corner, and no
                  coating that stops a pen writing on it.
  Colour          The file is RGB. The background is a warm cream, #FBF6EA, and
                  it should not come out white or grey. The yellow is #F5B700
                  and needs to stay saturated.

Could you confirm the price and when it can be picked up? If matte cover pushes
the turnaround out, text weight is fine and I would rather have it sooner.

Thanks,

Sarah Scarano
Modern Mustard Seed
${phone}
sarah@modernmustardseed.com
`;
writeFileSync(path.join(OUT, 'email-to-printer.txt'), email, 'utf8');
console.log(`email-to-printer.txt written for ${pages} pages.`);

// Prove the link works before anybody is told it does.
if (links.length) {
  const check = await fetch(links[0][1], { method: 'HEAD' });
  console.log(`public read check: ${check.status} ${check.headers.get('content-type') ?? ''} ${check.headers.get('content-length') ?? ''}`);
}
