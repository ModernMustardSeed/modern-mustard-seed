/**
 * Point the email discovery at a handful of real contractor sites and print
 * exactly what it found and why. The Lead Finder lives or dies on this hit rate,
 * so it needs to be inspectable in one command.
 *
 *   npx tsx scripts/acq-scrape-probe.mts acmeheating.com another.com
 */
import { readFileSync } from 'node:fs';
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { scrapeBusiness, chooseBestEmail, hostOf } = await import('../lib/acq/source');

const sites = process.argv.slice(2);
if (!sites.length) {
  console.error('Usage: npx tsx scripts/acq-scrape-probe.mts <site> [more sites...]');
  process.exit(1);
}

for (const site of sites) {
  const started = Date.now();
  const r = await scrapeBusiness(site);
  const best = await chooseBestEmail(r.emails, hostOf(site));
  console.log(`\n${site}  (${r.pagesRead} pages, ${Math.round((Date.now() - started) / 1000)}s)`);
  console.log(`  homepage reached: ${r.reachedHomepage}`);
  console.log(`  phone:   ${r.phone ?? '(none)'}`);
  console.log(`  emails:  ${r.emails.length ? r.emails.map((e) => `${e.address} [${e.via}]`).join(', ') : '(none)'}`);
  console.log(`  best:    ${best ? `${best.address} -> ${best.verdict.status} ${best.verdict.confidence} (${best.verdict.reason})` : '(none)'}`);
  console.log(`  hours:   ${r.hours ? JSON.stringify(r.hours) : '(none)'}`);
  console.log(`  24/7 ${r.open24}, emergency ${r.emergency}, area ${r.serviceArea ?? '(none)'}`);
  console.log(`  contact: ${r.contact ? `${r.contact.name}, ${r.contact.title}` : '(none)'}`);
}
