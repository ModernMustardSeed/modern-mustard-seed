/**
 * Print the id of every build this machine was holding when it was stopped.
 *
 * `repair-build-floor.ps1` calls this between killing the worker and starting it
 * again, to clear those build directories. A directory that two agents were
 * writing into is wreckage, not progress, and the next attempt inherits it.
 *
 * Rows only, no side effects: the worker's own startup sweep is what hands them
 * back to the queue, and it is the only thing that should be writing status here.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* the environment is allowed to carry them instead */ }

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) process.exit(0); // nothing to say is better than a failed repair

const sb = createClient(url, key);
const { data } = await sb
  .from('outbound_demo_sites')
  .select('id')
  .eq('status', 'building')
  .eq('worker', os.hostname());

for (const row of data || []) console.log(row.id);
