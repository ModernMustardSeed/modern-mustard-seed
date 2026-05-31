/**
 * Sets up sarah@modernmustardseed.com as a sample client AND an approved
 * affiliate, with free access to every product, so Sarah can preview both the
 * client portal and the partner dashboard. Safe to re-run (upserts).
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

const EMAIL = 'sarah@modernmustardseed.com';
const ALL_SLUGS = [
  'the-terminal', 'idea-to-spec',
  'ai-ready-business-blueprint', 'ai-native-business-playbook', 'shopify-store-with-claude-code',
  'claude-code-masterclass', 'ai-sales-machine', 'brand-studio-playbook', 'geo-ai-commerce-playbook',
];

// 1. Client record
await supabase.from('clients').upsert({
  email: EMAIL,
  name: 'Sarah Scarano',
  company: 'Modern Mustard Seed',
  tier: 'vip',
  welcome_note: 'This is your live preview. Everything below is sample data so you can feel what a client sees.',
}, { onConflict: 'email' });

// 2. A sample project with milestones (clear any old preview project first)
await supabase.from('projects').delete().eq('client_email', EMAIL).eq('name', 'Sample Build (preview)');
await supabase.from('projects').insert({
  client_email: EMAIL,
  name: 'Sample Build (preview)',
  status: 'building',
  summary: 'A sample engagement so you can see how project status, progress, and milestones appear to a client.',
  progress: 65,
  launch_target: '2026-06-30',
  milestones: [
    { title: 'Discovery and spec', detail: 'Goals, scope, and success criteria locked.', done: true },
    { title: 'Brand and design system', detail: 'Voice, palette, and components.', done: true },
    { title: 'Build the core', detail: 'Pages, data, and the first real flows.', done: false },
    { title: 'Launch', detail: 'Ship, hand off the repo, and go live.', done: false, due: 'Jun 30' },
  ],
});

// 3. A couple sample files
await supabase.from('client_files').delete().eq('client_email', EMAIL);
await supabase.from('client_files').insert([
  { client_email: EMAIL, label: 'Project brief', url: 'https://modernmustardseed.com/work', kind: 'doc' },
  { client_email: EMAIL, label: 'Live preview', url: 'https://modernmustardseed.com', kind: 'site' },
]);

// 4. Approved affiliate with a code
await supabase.from('affiliates').upsert({
  email: EMAIL,
  name: 'Sarah Scarano',
  code: 'SARAH',
  status: 'approved',
  promote_where: 'Owner preview',
  approved_at: new Date().toISOString(),
}, { onConflict: 'email' });

// 5. Free access to everything
for (const slug of ALL_SLUGS) {
  await supabase.from('entitlements').upsert({ email: EMAIL, product_slug: slug, source: 'manual' }, { onConflict: 'email,product_slug' });
}

console.log('Preview account ready for', EMAIL);
console.log('Client portal: /portal   Affiliate dashboard: /partners/hq   Code: SARAH');
