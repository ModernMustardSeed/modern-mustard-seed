/**
 * Logs the welcome email already sent to Suellen as an outbound message on her
 * client thread, so her profile shows the exact sent email. Idempotent: skips
 * if a matching outbound welcome row already exists. Run once.
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

const TO = 'suellenmatthis1@icloud.com';
const SUBJECT = "Let's build P & E Clothing a real online home";
const BODY = `Hi Suellen,

I'm Polly with Modern Mustard Seed, and I will be your point of contact through this whole thing. We are so glad to have you.

We are going to design and build P & E Clothing a beautiful website and online store, the kind where people can actually shop your baby clothes, bows, and mommy-and-me sets right there on the page. This one is on us. There is no cost to you.

To make it truly yours, I put together one simple form that walks you through your brand, products, and the heart behind the name. The single most helpful thing is photos of your products.

Once it is in, we will design three directions and send you a moodboard to choose from before we build a single page.

Warmly,
Polly`;

const { data: existing } = await supabase
  .from('messages')
  .select('id')
  .eq('to_addr', TO)
  .eq('direction', 'outbound')
  .eq('subject', SUBJECT)
  .maybeSingle();

if (existing) {
  console.log('Welcome message already logged. Nothing to do.');
} else {
  const { error } = await supabase.from('messages').insert({
    direction: 'outbound',
    channel: 'email',
    from_addr: 'polly@modernmustardseed.com',
    to_addr: TO,
    subject: SUBJECT,
    snippet: BODY.replace(/\s+/g, ' ').trim().slice(0, 500),
    body: BODY,
    read: true,
    occurred_at: new Date().toISOString(),
  });
  if (error) throw error;
  console.log('Logged the welcome email to Suellen\'s thread.');
}
