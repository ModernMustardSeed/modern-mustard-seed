/**
 * DOES THE CHAT AGENT'S send_lead TOOL ACTUALLY WORK?
 *
 * It has never produced a lead for any client, ever. That is ambiguous from the
 * data alone: twelve of Built Right's thirteen conversations were one exchange,
 * and the one real conversation ended the instant the agent asked for a name.
 * So "nobody has completed the flow" and "the tool is broken" both fit, and the
 * difference matters enormously. This settles it by calling the route the way
 * Vapi calls it.
 *
 * NOTHING GOES OUT. The route texts and emails the client on every lead. This
 * runs the handler in-process with RESEND, Twilio and Buildertrend credentials
 * deliberately absent, so every notification path takes its "not configured"
 * branch. Only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are loaded. Shan and
 * Carmen are not texted by a test.
 *
 * It cleans up after itself: the lead row is deleted and the conversation's
 * link is put back to null. Run it twice and the database is where it started.
 *
 * Run: pnpm exec tsx scripts/chat-lead-probe.mts
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Load ONLY the database credentials. Everything else stays unset on purpose.
const WANTED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=("?)(.*)\2\s*$/);
    if (m && WANTED.includes(m[1]) && !process.env[m[1]]) process.env[m[1]] = m[3];
  }
} catch {
  /* rely on the environment */
}

// Belt and braces: if any of these are already in the shell, drop them, or a
// test lead reaches a real builder's phone.
for (const k of Object.keys(process.env)) {
  if (/^(RESEND|TWILIO|BUILDERTREND|SENDGRID)/.test(k)) delete process.env[k];
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const MARK = 'PROBE-DELETE-ME';

async function main() {
  const { POST } = await import('../app/api/client-lead/route');

  // Use a REAL conversation id, so the chat-to-lead join is exercised rather
  // than simulated. The qualified one: 5 acres near Kalispell, plans in hand.
  const { data: chat } = await sb
    .from('client_chats')
    .select('chat_id, assistant_id, lead_id, exchanges')
    .eq('client_email', 'builtbyshan@gmail.com')
    .eq('exchanges', 4)
    .maybeSingle();

  if (!chat) {
    console.error('No stored conversation to link against. Run chat-sync-probe first.');
    process.exit(1);
  }
  console.log(`linking against real conversation ${chat.chat_id} (lead_id was ${chat.lead_id ?? 'null'})`);

  // The envelope Vapi sends. Arguments arrive as a JSON STRING, which is the
  // shape the route's parser has to survive.
  const envelope = {
    message: {
      type: 'tool-calls',
      chat: { id: chat.chat_id },
      toolCallList: [
        {
          id: 'probe-toolcall-1',
          arguments: JSON.stringify({
            project: 'built-right',
            source: 'chat',
            name: `${MARK} Probe`,
            phone: '406-555-0100',
            email: 'probe@example.invalid',
            town: 'Kalispell',
            land: 'I own land and have plans',
            message: `${MARK} automated check that send_lead reaches the desk.`,
            page: '/custom-homes-whitefish-mt',
          }),
        },
      ],
    },
  };

  const res = await POST(
    new Request('https://modernmustardseed.com/api/client-lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(envelope),
    }),
  );

  const json = (await res.json()) as { results?: Array<{ toolCallId: string; result: string }> };
  console.log(`\nHTTP ${res.status}`);
  console.log('response:', JSON.stringify(json));

  // Vapi needs its own shape back or the agent cannot tell the visitor it went
  // through. A 200 with the wrong body is a silent failure to the caller.
  const shaped = Array.isArray(json.results) && json.results[0]?.toolCallId === 'probe-toolcall-1';
  console.log(`vapi-shaped reply: ${shaped ? 'YES' : 'NO'}`);

  const { data: lead } = await sb
    .from('client_leads')
    .select('id, source, sources, name, phone, town, land, chat_id, client_email')
    .ilike('name', `${MARK}%`)
    .maybeSingle();

  console.log(`\nlead row written:   ${lead ? 'YES' : 'NO'}`);
  if (lead) {
    console.log(`  source          ${lead.source}  sources=${JSON.stringify(lead.sources)}`);
    console.log(`  client_email    ${lead.client_email}`);
    console.log(`  captured        ${lead.name} / ${lead.phone} / ${lead.town} / ${lead.land}`);
    console.log(`  chat_id         ${lead.chat_id ?? 'NOT CAPTURED'}`);

    const { data: after } = await sb
      .from('client_chats')
      .select('lead_id')
      .eq('chat_id', chat.chat_id)
      .maybeSingle();
    console.log(`  conversation linked back: ${after?.lead_id === lead.id ? 'YES' : `NO (${after?.lead_id ?? 'null'})`}`);

    // Put everything back exactly as it was.
    await sb.from('client_chats').update({ lead_id: chat.lead_id }).eq('chat_id', chat.chat_id);
    await sb.from('client_leads').delete().eq('id', lead.id);
    const { count } = await sb.from('client_leads').select('id', { count: 'exact', head: true }).ilike('name', `${MARK}%`);
    console.log(`\ncleaned up: ${count === 0 ? 'YES, no probe rows remain' : `NO, ${count} left`}`);
  }
}

void main().then(() => process.exit(0));
