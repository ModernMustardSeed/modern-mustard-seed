/**
 * Makes Polly Thompson the point of contact / account lead for the P & E
 * Clothing engagement. Updates the portal welcome note (client-facing) and the
 * project summary (admin-facing). Safe to re-run.
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
const CONTACT = 'Polly Thompson';
const CONTACT_EMAIL = 'thompsonpolly71@gmail.com';

const { error: cErr } = await supabase
  .from('clients')
  .update({
    welcome_note: `Welcome to the studio, Suellen. Your point of contact is ${CONTACT}, reach her anytime at ${CONTACT_EMAIL}. We are building your store and website at no cost. Start with the brand intake and we will take it from there.`,
  })
  .eq('email', EMAIL);
if (cErr) throw cErr;

const { error: pErr } = await supabase
  .from('projects')
  .update({
    summary: `Account lead: ${CONTACT} (${CONTACT_EMAIL}). Pro bono build: a beautiful, shoppable storefront and marketing site for P & E Clothing (baby and children apparel, bows, and mommy-and-me sets), with SEO, GEO, and growth systems baked in.`,
  })
  .eq('client_email', EMAIL)
  .eq('name', 'Store + Website');
if (pErr) throw pErr;

console.log(`${CONTACT} set as the contact/account lead for P & E Clothing.`);
