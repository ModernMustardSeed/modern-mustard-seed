/**
 * FILL A FRONT OFFICE WITH A REALISTIC WEEK, SO SOMEBODY CAN SEE THE PRODUCT.
 *
 * A newly provisioned office is correct and completely empty, and an empty
 * dashboard answers no question anybody has. This writes the week a small HVAC
 * company actually has: the 11pm no-heat call, the price shopper, the wrong
 * number, the one that got booked, the one that needed a human.
 *
 *   npm run acq:fo-demo -- --email=someone@example.com
 *   npm run acq:fo-demo -- --email=someone@example.com --clear
 *
 * ── IT IS OBVIOUSLY SAMPLE DATA ──────────────────────────────────────────────
 * Every caller number is in the 555 range, which is reserved and unassigned, so
 * nobody can ring one back and reach a stranger. Every row is tagged in
 * fo_events. --clear removes exactly what this wrote.
 *
 * ── AND IT IS HONEST DATA ────────────────────────────────────────────────────
 * The mix is deliberately unflattering: a wrong number, a price shopper who
 * did not book, and a call the agent could not finish. A demo screen where the
 * AI books everything is a screen nobody believes, and it sets an expectation
 * the product will not meet on a real Tuesday.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const arg = (k: string, d = '') => (argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');
const EMAIL = arg('email').trim().toLowerCase();
const CLEAR = argv.includes('--clear');
const TAG = 'fo-demo';

if (!EMAIL) {
  console.error('Usage: npm run acq:fo-demo -- --email=<client email> [--clear]');
  process.exit(1);
}

const db = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false } },
);

const { upsertContact } = await import('../lib/front-office/provision');

const { data: office } = await db.from('fo_offices').select('*').eq('client_email', EMAIL).maybeSingle();
if (!office) {
  console.error(`No Front Office for ${EMAIL}.`);
  process.exit(1);
}

/** Sample rows carry the tag in vapi_call_id so --clear is exact. */
const isSample = `${TAG}-%`;

if (CLEAR) {
  const { data: calls } = await db.from('fo_calls').select('id').eq('office_id', office.id).like('vapi_call_id', isSample);
  const ids = (calls ?? []).map((c) => c.id as string);
  if (ids.length) await db.from('fo_appointments').delete().in('call_id', ids);
  await db.from('fo_calls').delete().eq('office_id', office.id).like('vapi_call_id', isSample);
  await db.from('fo_contacts').delete().eq('office_id', office.id).like('notes', `${TAG}%`);
  await db.from('fo_events').delete().eq('office_id', office.id).eq('actor', TAG);
  console.log(`\nCleared the sample week from ${office.business_name}.\n`);
  process.exit(0);
}

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const hoursAhead = (h: number) => new Date(now + h * 3600_000).toISOString();

/**
 * The week. Ordered oldest to newest so the dashboard reads like a story, and
 * weighted the way a real HVAC phone actually rings: mostly routine, one
 * genuine emergency, and a couple that were never going to be jobs.
 */
const WEEK: Array<{
  name: string | null;
  phone: string;
  hoursAgo: number;
  intent: string;
  urgency: 'emergency' | 'urgent' | 'routine' | 'info';
  summary: string;
  duration: number;
  booked?: boolean;
  transferred?: string;
  needsHuman?: boolean;
  language?: string;
}> = [
  {
    name: 'Marcy Ruiz', phone: '(406) 555-0118', hoursAgo: 132, intent: 'no heat', urgency: 'emergency', duration: 214,
    summary: 'Furnace stopped overnight, house at 51 degrees, an infant in the home. Took the address and flagged it as an emergency.',
    needsHuman: true,
  },
  {
    name: 'Dwayne Kolb', phone: '(406) 555-0143', hoursAgo: 121, intent: 'annual service', urgency: 'routine', duration: 168,
    summary: 'Wanted the yearly furnace check before it gets cold. Booked in.', booked: true,
  },
  {
    name: null, phone: '(406) 555-0177', hoursAgo: 98, intent: 'wrong number', urgency: 'info', duration: 22,
    summary: 'Looking for a plumber. Told them politely we do heating and cooling.',
  },
  {
    name: 'Teresa Alvarez', phone: '(406) 555-0192', hoursAgo: 77, intent: 'quote, new system', urgency: 'routine', duration: 246,
    summary: 'Twenty two year old system, considering replacement. Wanted a ballpark price. Did not quote; took details for a site visit.',
    needsHuman: true, language: 'es',
  },
  {
    name: 'Rob Pfeiffer', phone: '(406) 555-0104', hoursAgo: 54, intent: 'AC not cooling', urgency: 'urgent', duration: 191,
    summary: 'Upstairs not cooling, downstairs fine. Booked the first slot Thursday.', booked: true,
  },
  {
    name: null, phone: '(406) 555-0135', hoursAgo: 49, intent: 'price shopping', urgency: 'info', duration: 61,
    summary: 'Asked for an hourly rate over the phone and would not give an address. Did not quote.',
  },
  {
    name: 'Janelle Brooks', phone: '(406) 555-0166', hoursAgo: 27, intent: 'thermostat', urgency: 'routine', duration: 133,
    summary: 'New smart thermostat is not talking to the furnace. Handed to Danny, who does the controls work.',
    transferred: 'Danny',
  },
  {
    name: 'Curtis Nolan', phone: '(406) 555-0151', hoursAgo: 19, intent: 'no heat', urgency: 'emergency', duration: 178,
    summary: 'No heat, pipes at risk. Took the address and alerted the on-call number.', needsHuman: true,
  },
  {
    name: 'Priya Raman', phone: '(406) 555-0129', hoursAgo: 6, intent: 'maintenance plan', urgency: 'routine', duration: 155,
    summary: 'Asked what the maintenance plan covers and booked the first visit.', booked: true,
  },
];

const digits = (p: string) => p.replace(/\D/g, '').slice(-10);
let calls = 0;
let contacts = 0;
let appts = 0;

for (const [i, c] of WEEK.entries()) {
  /*
   * Use the PRODUCTION contact function, not a bespoke upsert.
   *
   * The first version called .upsert() with onConflict on (office_id,
   * phone_digits). That index is PARTIAL (where phone_digits is not null), and
   * PostgREST cannot express an index predicate in ON CONFLICT, so it matched
   * nothing and silently wrote no contacts: nine calls with a null contact_id
   * and an empty customer list on the very screen this exists to show.
   *
   * upsertContact does select-then-insert and is what the real webhook calls,
   * so seeding now exercises the same path a real caller does.
   */
  const contactId = await upsertContact(db, office.id, {
    name: c.name,
    phone: c.phone,
    isCustomer: Boolean(c.booked),
  });
  if (contactId) {
    contacts++;
    await db
      .from('fo_contacts')
      .update({ first_seen_at: hoursAgo(c.hoursAgo), last_seen_at: hoursAgo(c.hoursAgo), call_count: 1, notes: `${TAG}: sample caller` })
      .eq('id', contactId);
  }
  const contact = contactId ? { id: contactId } : null;

  const { data: call } = await db
    .from('fo_calls')
    .insert({
      office_id: office.id,
      contact_id: contact?.id ?? null,
      vapi_call_id: `${TAG}-${i}-${now}`,
      direction: 'inbound',
      from_number: c.phone,
      to_number: office.agent_phone,
      started_at: hoursAgo(c.hoursAgo),
      ended_at: new Date(Date.parse(hoursAgo(c.hoursAgo)) + c.duration * 1000).toISOString(),
      duration_sec: c.duration,
      ended_reason: 'customer-ended-call',
      intent: c.intent,
      urgency: c.urgency,
      summary: c.summary,
      language: c.language ?? 'en',
      booked: Boolean(c.booked),
      transferred: Boolean(c.transferred),
      transferred_to: c.transferred ?? null,
      needs_human: Boolean(c.needsHuman),
      // Already notified: this is a week that has happened, not a week that is
      // about to fire nine emails at whoever opens the screen.
      notified_at: hoursAgo(c.hoursAgo),
    })
    .select('id')
    .maybeSingle();
  if (call) calls++;

  if (c.booked && call) {
    const start = hoursAhead(8 + appts * 26);
    const { error } = await db.from('fo_appointments').insert({
      office_id: office.id,
      contact_id: contact?.id ?? null,
      call_id: call.id,
      title: `${c.intent} for ${c.name ?? 'a caller'}`,
      service: c.intent,
      starts_at: start,
      ends_at: new Date(Date.parse(start) + 3600_000).toISOString(),
      address: '— address on the call —',
      status: 'confirmed',
      booked_by: 'agent',
      reminder_sent_at: new Date().toISOString(),
    });
    if (!error) appts++;
  }
}

// Somebody to transfer to, so the "who it hands calls to" card is not empty.
const { count: team } = await db.from('fo_transfers').select('id', { count: 'exact', head: true }).eq('office_id', office.id);
if (!team) {
  await db.from('fo_transfers').insert([
    { office_id: office.id, name: 'Danny', role: 'Controls and thermostats', phone: '(406) 555-0161', when_to_transfer: 'Anything about smart thermostats or zoning.', priority: 1 },
    { office_id: office.id, name: 'On-call', role: 'Nights and weekends', phone: '(406) 555-0162', when_to_transfer: 'Any no-heat or no-cool emergency outside business hours.', priority: 2 },
  ]);
}

await db.from('fo_events').insert({
  office_id: office.id,
  type: 'sample',
  label: 'Sample week written for a walkthrough',
  detail: { calls, appointments: appts },
  actor: TAG,
});

console.log(`\n${office.business_name}`);
console.log(`  ${calls} calls, ${contacts} callers, ${appts} appointments booked`);
console.log(`  the mix: 2 emergencies, 3 booked, 1 transferred, 1 wrong number, 1 price shopper, 1 in Spanish`);
console.log(`\n  their view   https://modernmustardseed.com/portal/front-office   (sign in as ${EMAIL})`);
console.log(`  your view    https://modernmustardseed.com/admin/front-office`);
console.log(`\n  Remove it with: npm run acq:fo-demo -- --email=${EMAIL} --clear\n`);
