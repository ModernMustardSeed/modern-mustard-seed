/**
 * THE TWO LAUNCH DOCUMENTS, FROM ONE CONFIG.
 *
 *   npx tsx scripts/launch-docs.mts data/launch-clients/kylers-lawn-snow.json
 *   npx tsx scripts/launch-docs.mts <config> --out ~/dev/mms/clients/kyler/docs
 *
 * Writes the owner's manual (theirs, in their brand) and the launch runbook
 * (ours, in ours). Both render from data/launch-standard, so a step written once
 * appears in both PDFs and in the client's portal, and cannot drift between them.
 *
 * Needs no database. These are documents, not state.
 */
import fs from 'node:fs';
import path from 'node:path';
import { standardLaunchGroups, type LaunchFacts } from '../data/launch-standard';
import { ownerManualPdf, adminLaunchPdf, type OfficeTab, type Palette } from '../lib/launch-pdf';

type Config = {
  title: string;
  clientEmail: string;
  palette?: Palette;
  officeLogin?: { url: string; user: string; note: string };
  officeTabs?: OfficeTab[];
  open?: { what: string; why: string }[];
  facts: LaunchFacts;
};

const [configPath, ...rest] = process.argv.slice(2);
if (!configPath) {
  console.error('usage: launch-docs.mts <config.json> [--out <dir>]');
  process.exit(1);
}
const outAt = rest.indexOf('--out');
const outDir = outAt >= 0 && rest[outAt + 1] ? rest[outAt + 1] : path.dirname(configPath);

const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Config;
if (!cfg.facts?.business) {
  console.error('config needs facts.business');
  process.exit(1);
}

const groups = standardLaunchGroups(cfg.facts);
fs.mkdirSync(outDir, { recursive: true });

const slug = cfg.facts.business
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const manual = await ownerManualPdf({
  facts: cfg.facts,
  groups,
  palette: cfg.palette ?? { ink: '#161616', accent: '#C4160B', soft: '#5E5B4E', band: '#FFF3CC' },
  officeTabs: cfg.officeTabs,
  officeLogin: cfg.officeLogin,
});
const manualPath = path.join(outDir, `${slug}-owners-manual.pdf`);
fs.writeFileSync(manualPath, manual);

const runbook = await adminLaunchPdf({ facts: cfg.facts, groups, open: cfg.open });
const runbookPath = path.join(outDir, `${slug}-launch-runbook.pdf`);
fs.writeFileSync(runbookPath, runbook);

const kb = (p: string) => Math.round(fs.statSync(p).size / 1024) + ' KB';
console.log(`owner's manual   ${manualPath}  ${kb(manualPath)}`);
console.log(`launch runbook   ${runbookPath}  ${kb(runbookPath)}`);
