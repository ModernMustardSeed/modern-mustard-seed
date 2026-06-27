/**
 * Adds P & E Clothing (owner Suellen Matthis) as a Modern Mustard Seed client
 * with a kickoff project + milestones. Pro bono engagement. Safe to re-run (upserts).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnv(key) {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && m[1] === key) return m[2].trim().replace(/^"(.*)"$/, '$1').replace(/\\[rn]$/, '');
  }
  return null;
}

const supabase = createClient(
  loadEnv('supabase_url') || loadEnv('SUPABASE_URL'),
  loadEnv('supabase_service_role_key') || loadEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } }
);

const EMAIL = 'suellenmatthis1@icloud.com';

// 1. Client record
const { error: clientErr } = await supabase.from('clients').upsert({
  email: EMAIL,
  name: 'Suellen Matthis',
  company: 'P & E Clothing',
  tier: 'engagement',
  welcome_note: 'Welcome to the studio, Suellen. We are building your store and website pro bono. Start by sharing your brand, products, and pricing through the intake, and we will take it from there.',
}, { onConflict: 'email' });
if (clientErr) throw clientErr;

// 2. Kickoff project with milestones
await supabase.from('projects').delete().eq('client_email', EMAIL).eq('name', 'Store + Website');
const { error: projErr } = await supabase.from('projects').insert({
  client_email: EMAIL,
  name: 'Store + Website',
  status: 'discovery',
  summary: 'Pro bono build: a beautiful, shoppable storefront and marketing site for P & E Clothing (baby and children apparel, bows, and mommy-and-me sets), with SEO, GEO, and growth systems baked in.',
  progress: 8,
  milestones: [
    { title: 'Brand intake', detail: 'Logo, brand voice, products, pricing, and goals collected via the intake form.', done: false },
    { title: 'Design direction', detail: 'Three directions explored, then a moodboard approved before any pages are built.', done: false },
    { title: 'Build the store', detail: 'Shoppable storefront with real products, plus the marketing site and growth systems.', done: false },
    { title: 'Launch + handoff', detail: 'Go live on her domain and hand over an owner-friendly walkthrough.', done: false },
  ],
});
if (projErr) throw projErr;

console.log('P & E Clothing client + kickoff project ready for', EMAIL);
console.log('She can sign into the client portal at /portal using this email.');
