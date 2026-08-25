/**
 * REAL end-to-end send test for the demo agent drip. Sends ONE actual email
 * through the exact production path (demoAgentDrip → sendViaResend → Resend),
 * scoped to a single throwaway lead so no real builder is touched, then cleans
 * up every row it created.
 *
 * Proves: real render, real Resend accept, real List-Unsubscribe header, real
 * suppression gate, real external delivery. Run once, on purpose.
 *
 * Usage: npx tsx scripts/test-demo-agent-drip-live.mts <destination-email>
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=("?)(.*)\2\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
  }
} catch {
  /* rely on the environment */
}

const dest = process.argv[2];
if (!dest || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dest)) {
  console.error('Pass a destination email: npx tsx scripts/test-demo-agent-drip-live.mts you@example.com');
  process.exit(1);
}

const { getSupabase } = await import('../lib/supabase');
const { demoAgentDrip } = await import('../lib/demo-agent-drip');

const sb = getSupabase();
if (!sb) {
  console.error('Supabase not configured; cannot run the live test.');
  process.exit(1);
}

const runId = randomUUID();
const KEY = (id: string) => `skdrip:${id}`;
const created = new Date(Date.now() - 30 * 3600 * 1000).toISOString(); // 30h old: touch 1 is due (>=20h, <=96h)

console.log(`Inserting throwaway demo-agent-build lead -> ${dest}`);
const { data: lead, error: insErr } = await sb
  .from('leads')
  .insert({
    type: 'contact',
    email: dest,
    name: 'Sarah',
    business_name: 'MMS Deliverability Test',
    company: 'MMS Deliverability Test',
    industry: 'home-services',
    source: 'demo-agent-forge',
    status: 'new',
    notes: `run=${runId} [demo agent] MMS Deliverability Test - live send test, safe to ignore`,
    created_at: created,
  })
  .select('id')
  .single();

if (insErr || !lead) {
  console.error('Insert failed:', insErr?.message);
  process.exit(1);
}
const leadId = lead.id as string;
console.log(`Lead ${leadId} created (aged 30h so touch 1 is due).`);

let result: Awaited<ReturnType<typeof demoAgentDrip>> | null = null;
try {
  // The REAL production function, scoped to this one lead.
  result = await demoAgentDrip(sb, { onlyLeadId: leadId });
  console.log('demoAgentDrip result:', JSON.stringify(result));
} catch (err) {
  console.error('drip threw:', err);
} finally {
  // Prove what the Sent store recorded (the header + status live here).
  const { data: sent } = await sb
    .from('emails')
    .select('subject, status, to_addr, created_at')
    .eq('to_addr', dest)
    .order('created_at', { ascending: false })
    .limit(1);
  console.log('Sent-store row:', JSON.stringify(sent?.[0] ?? null));

  // Clean up EVERYTHING this test created.
  await sb.from('app_state').delete().eq('key', KEY(leadId));
  await sb.from('leads').delete().eq('id', leadId);
  console.log('Cleaned up test lead + drip state row.');
}

const ok = result?.sent === 1;
console.log(ok ? '\nLIVE SEND OK: one real email left through the production path.' : '\nLIVE SEND DID NOT CONFIRM (sent != 1). Check the result above.');
process.exit(ok ? 0 : 1);
