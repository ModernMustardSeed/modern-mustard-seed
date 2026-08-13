/**
 * SENDER HEALTH, FROM THE TERMINAL.
 *
 *   npx tsx scripts/acq-health.mts
 *
 * The same report the Sender Health screen renders, printed. Useful before a
 * campaign start and after any DNS change, because the two blockers that most
 * often stand between this engine and an inbox are a missing DMARC record and a
 * webhook nobody pointed at us.
 */
import { readFileSync } from 'node:fs';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { computeSenderHealth } = await import('../lib/acq/sender-health');
const { clientFactoryReport } = await import('../lib/acq/factory');

const h = await computeSenderHealth();

console.log(`\nSENDER HEALTH · ${h.identity}\n`);
for (const c of h.checks) {
  console.log(`  ${c.level.toUpperCase().padEnd(8)} ${c.label}`);
  console.log(`           ${c.detail}`);
  if (c.fix) console.log(`           FIX: ${c.fix}`);
}
console.log(`\n  state ${h.stateLabel}${h.stateReason ? ` (${h.stateReason})` : ''}`);
console.log(`  sent ${h.volume.sent24h} in the last 24h · allowance ${h.volume.allowance} · hard ceiling ${h.volume.ceiling}`);
console.log(`  rates: ${h.rates.measurable ? `bounce ${h.rates.bouncePct?.toFixed(2)}%, complaint ${h.rates.complaintPct?.toFixed(3)}%` : 'not enough volume to measure'}`);
console.log(`  worst: ${h.worst.toUpperCase()}\n`);

const f = await clientFactoryReport();
console.log('CLIENT FACTORY\n');
console.log(`  net new MRR this month: ${money(f.movement.netNewCents)}`);
console.log(`  active MRR:             ${money(f.movement.activeMrrCents)}`);
console.log(`  active clients:         ${f.path?.activeClients ?? 0} / ${f.campaign?.goal_clients ?? 50}`);
console.log(`  realized revenue:       ${money(f.path?.realizedRevenueCents ?? 0)} of ${money(f.path?.goalRevenueCents ?? 0)} (${f.path?.status ?? 'unknown'})`);
console.log(`  reservoir:              ${f.reservoir.total.toLocaleString()} total, ${f.reservoir.ready.toLocaleString()} ready, ${f.reservoir.daysOfInventory ?? '?'} days of inventory`);
console.log(`\n  constraint: ${f.bottleneck.constraint.label} · ${f.bottleneck.constraint.detail}`);
if (f.bottleneck.primary) {
  console.log(`  worst funnel step: ${f.bottleneck.primary.label} at ${f.bottleneck.primary.ratePct}% (${f.bottleneck.primary.numerator}/${f.bottleneck.primary.denominator})`);
}
console.log(`  advice: ${f.bottleneck.advice}\n`);

function money(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}
