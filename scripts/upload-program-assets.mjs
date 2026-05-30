/**
 * One-time: upload the two program tools (HTML) and playbooks (PDF) to the
 * private Supabase Storage bucket `store-products`. Never public. The gated HQ
 * routes fetch them server-side after an entitlement check.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function loadEnv(key) {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && m[1] === key) return m[2].trim().replace(/^"(.*)"$/, '$1').replace(/\\[rn]$/, '');
  }
  return null;
}

const url = loadEnv('supabase_url') || loadEnv('SUPABASE_URL');
const key = loadEnv('supabase_service_role_key') || loadEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = 'store-products';
const dl = join(homedir(), 'Downloads');

const FILES = [
  { src: '2026-05-30_the_terminal_ops_center.html', dest: 'the-terminal-ops-center.html', type: 'text/html' },
  { src: '2026-05-30_idea_to_spec_studio.html', dest: 'idea-to-spec-studio.html', type: 'text/html' },
  { src: '2026-05-30_the_terminal_fullstack_playbook.pdf', dest: 'the-terminal-playbook.pdf', type: 'application/pdf' },
  { src: '2026-05-30_idea_to_spec_playbook.pdf', dest: 'idea-to-spec-playbook.pdf', type: 'application/pdf' },
];

for (const f of FILES) {
  const body = readFileSync(join(dl, f.src));
  const { error } = await supabase.storage.from(BUCKET).upload(f.dest, body, { contentType: f.type, upsert: true });
  console.log(error ? `FAIL ${f.dest}: ${error.message}` : `ok   ${f.dest} (${(body.length / 1024).toFixed(0)} KB)`);
}
