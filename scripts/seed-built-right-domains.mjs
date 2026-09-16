// Built Right in Montana: every domain they own, into client_domains.
// Idempotent: re-running updates role, forwards_to and notes; expiry and
// registrar come from the registry via the weekly cron, not from here.
//
//   node scripts/seed-built-right-domains.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const EMAIL = 'builtbyshan@gmail.com';
const SITE = 'builtrightinmontana.com';
const rows = [
  ['builtrightinmontana.com', 'primary', null, 'The website. Mail records still point at Web Express until the mailbox question is answered.'],
  ['brimhomes.com', 'email', SITE, 'New in September 2026. shan@brimhomes.com and Carmen live here on Google Workspace.'],
  ['brimmontana.com', 'forward', SITE, 'New in September 2026. Held so nobody else takes it.'],
  ['builtrightinidaho.com', 'forward', SITE, null],
  ['montanacustombuilt.com', 'forward', SITE, null],
  ['custombuildmontana.com', 'forward', SITE, null],
  ['customhomemontana.com', 'forward', SITE, null],
  ['montanahomebuilder.com', 'forward', SITE, null],
  ['montanarenos.com', 'forward', SITE, null],
  ['innovativedesignbuild.us', 'held', null, 'Mail records point at Web Express. Renews October 20, 2026: the first one moved.'],
  ['nspec4u.com', 'held', null, null],
  ['montanacustomrustics.com', 'held', null, 'Rustic furniture venture. Its own site when you want one.'],
  ['montanarusticdesign.com', 'held', null, null],
  ['montanarusticfuniture.com', 'held', null, 'Registered with the typo; kept so the typo lands somewhere you own.'],
  ['montanarustichottubs.com', 'held', null, null],
  ['montanahomeoutfitters.com', 'held', null, null],
  ['montanasauna.com', 'held', null, 'Sauna venture. Mail records point at Web Express.'],
  ['montanasaunas.com', 'held', null, null],
  ['mtsaunas.com', 'held', null, null],
  ['flatheadsauna.com', 'held', null, null],
  ['flatheadsaunas.com', 'held', null, null],
  ['yellowstonesauna.com', 'held', null, null],
  ['yellowstonesaunas.com', 'held', null, null],
];

const { error } = await sb.from('client_domains').upsert(
  rows.map(([domain, role, forwards_to, notes]) => ({ client_email: EMAIL, domain, role, forwards_to, notes, updated_at: new Date().toISOString() })),
  { onConflict: 'client_email,domain' }
);
if (error) {
  console.error(error.message);
  process.exit(1);
}
const { count } = await sb.from('client_domains').select('id', { count: 'exact', head: true }).eq('client_email', EMAIL);
console.log(`client_domains for ${EMAIL}: ${count}`);
