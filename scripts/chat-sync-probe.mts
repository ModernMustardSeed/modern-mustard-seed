/**
 * Sync one client's conversations and say exactly what landed.
 *
 * A probe, not a test: it reaches the real provider and writes real rows, which
 * is the only way to know the stitching, the upsert key and the column types
 * actually agree with each other. Safe to run twice; the second run must write
 * the same conversations without duplicating any, and this prints the row count
 * before and after so that claim is checked rather than asserted.
 *
 * Run: pnpm exec tsx scripts/chat-sync-probe.mts [clientEmail]
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { CLIENT_PROJECTS } from '../lib/client-leads';
import { chatKeyConfigured } from '../lib/command-center/chats';
import { syncChats, storedConversations, anonymousConversations } from '../lib/command-center/chat-store';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=("?)(.*)\2\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
  }
} catch {
  /* rely on the environment */
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const want = (process.argv[2] ?? '').trim().toLowerCase();

  console.log(`chat provider key configured: ${chatKeyConfigured()}`);
  if (!chatKeyConfigured()) {
    console.log('No VAPI_API_KEY / VAPI_PRIVATE_KEY, so nothing can be read. Stopping.');
    process.exit(1);
  }

  for (const p of Object.values(CLIENT_PROJECTS)) {
    if (!p.assistantId) continue;
    if (want && p.clientEmail.toLowerCase() !== want) continue;

    const { count: before } = await sb
      .from('client_chats')
      .select('chat_id', { count: 'exact', head: true })
      .eq('client_email', p.clientEmail.toLowerCase());

    const got = await syncChats(sb, { clientEmail: p.clientEmail, assistantId: p.assistantId, days: 90 });

    const { count: after } = await sb
      .from('client_chats')
      .select('chat_id', { count: 'exact', head: true })
      .eq('client_email', p.clientEmail.toLowerCase());

    console.log(`\n=== ${p.business} (${p.clientEmail}) ===`);
    console.log(`  assistant   ${p.assistantId}`);
    console.log(`  provider    ${got.read ? 'read' : 'COULD NOT BE READ'}`);
    console.log(`  stitched    ${got.seen} conversations`);
    console.log(`  rows        ${before ?? 0} -> ${after ?? 0}`);

    if (!got.read) continue;

    const stored = await storedConversations(sb, p.clientEmail, 5);
    const anon = await anonymousConversations(sb, p.clientEmail, { days: 90, minExchanges: 2 });
    console.log(`  anonymous   ${anon.length} real conversations that never left a name`);

    for (const c of stored.slice(0, 3)) {
      const first = c.turns.find((t) => t.role === 'user')?.content ?? '';
      console.log(`    - ${c.startedAt.slice(0, 16).replace('T', ' ')}  ${c.exchanges} exchanges  lead=${c.leadId ? 'yes' : 'no'}  page=${c.page ?? '-'}`);
      if (first) console.log(`      "${first.replace(/\s+/g, ' ').slice(0, 100)}"`);
    }
  }
}

void main().then(() => process.exit(0));
