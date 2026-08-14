/**
 * Push the Client Factory registries into the database and make sure Modern
 * Mustard Seed exists as tenant #1 with its own Factory.
 *
 *   npm run factory:bootstrap
 *   npm run factory:bootstrap -- --no-internal   # registries only
 *
 * Idempotent. Safe to run on every deploy, and worth running after any change
 * to lib/factory/modules.ts, value-actions.ts or templates.ts, because those
 * files are the source of truth and these tables are the operational mirror
 * that admin reads.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const url = process.env.SUPABASE_URL || process.env.supabase_url;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
if (!url || !key) {
  console.error('No Supabase credentials in .env.local (supabase_url, supabase_service_role_key).');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { bootstrapFactoryPlatform } = await import('@/lib/factory/bootstrap');

const result = await bootstrapFactoryPlatform(supabase, {
  actor: process.env.ADMIN_EMAIL || 'bootstrap',
  createInternalFactory: !process.argv.includes('--no-internal'),
});

console.log(`Modules:       ${result.modules}`);
console.log(`Value actions: ${result.valueActions}`);
console.log(`Templates:     ${result.templates}`);
console.log(`Tenant:        ${result.tenant ?? 'MISSING (apply migration 095 first)'}`);
console.log(`Factory:       ${result.factory ?? 'none'}${result.created ? ' (created)' : ''}`);
for (const note of result.notes) console.log(`Note:          ${note}`);

process.exit(result.tenant ? 0 : 1);
