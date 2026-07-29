// One-shot verification of the 071 migration + the exact query shapes the API
// route uses (insert, maybeSingle, lte count, referral rpc). Inserts two test
// rows, checks every step, then deletes them so planting numbers stay clean.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const url = env.SUPABASE_URL || env.supabase_url || process.env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('missing supabase env');
const db = createClient(url, key, { auth: { persistSession: false } });

const A = 'mtree-verify-a@example.com';
const B = 'mtree-verify-b@example.com';
const fail = (msg, detail) => { console.error('FAIL:', msg, detail ?? ''); process.exitCode = 1; };

// clean any leftovers from a previous run
await db.from('mustard_tree_waitlist').delete().in('email', [A, B]);

// 1) insert A
const ins1 = await db.from('mustard_tree_waitlist')
  .insert({ email: A, seed_idea: 'verify seed', ref_code: 'MTVERIFA', referred_by: null })
  .select('ref_code, created_at').single();
if (ins1.error) fail('insert A', ins1.error);

// 2) count <= A.created_at (planting number shape)
const c1 = await db.from('mustard_tree_waitlist')
  .select('id', { count: 'exact', head: true }).lte('created_at', ins1.data.created_at);
if (c1.error) fail('count A', c1.error);
console.log('A planting number:', c1.count, '(>=1 expected)');

// 3) maybeSingle duplicate lookup
const dup = await db.from('mustard_tree_waitlist')
  .select('ref_code, created_at').eq('email', A).maybeSingle();
if (dup.error || !dup.data) fail('maybeSingle A', dup.error);
if (dup.data?.ref_code !== 'MTVERIFA') fail('ref_code mismatch', dup.data);

// 4) insert B referred by A, bump referral
const ins2 = await db.from('mustard_tree_waitlist')
  .insert({ email: B, seed_idea: null, ref_code: 'MTVERIFB', referred_by: 'MTVERIFA' })
  .select('ref_code, created_at').single();
if (ins2.error) fail('insert B', ins2.error);
const rpc = await db.rpc('increment_mustard_tree_referral', { code: 'MTVERIFA' });
if (rpc.error) fail('rpc bump', rpc.error);
const after = await db.from('mustard_tree_waitlist')
  .select('referral_count').eq('email', A).single();
if (after.error) fail('read A after bump', after.error);
console.log('A referral_count after bump:', after.data?.referral_count, '(1 expected)');
if (after.data?.referral_count !== 1) fail('referral_count wrong', after.data);

// 5) unique email violation surfaces as 23505
const dupIns = await db.from('mustard_tree_waitlist')
  .insert({ email: A, ref_code: 'MTVERIFC' }).select('ref_code').single();
console.log('duplicate email code:', dupIns.error?.code, '(23505 expected)');

// clean up
const del = await db.from('mustard_tree_waitlist').delete().in('email', [A, B]).select('email');
if (del.error || (del.data ?? []).length !== 2) fail('cleanup', del.error ?? del.data);
console.log('cleaned up', (del.data ?? []).length, 'test rows');
console.log(process.exitCode ? 'DB VERIFY: FAILED' : 'DB VERIFY: ALL GOOD');
