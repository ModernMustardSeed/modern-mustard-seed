// Points a Twilio number at the inbound SMS webhook, registers the delivery
// status callback, and files the number in sms_numbers so the app knows who it
// speaks for and whether it may speak yet.
//
// Usage:
//   node scripts/sms-webhook-setup.mjs                       list every number and what it points at now
//   node scripts/sms-webhook-setup.mjs +14065551234          wire that number (dry run: shows the change)
//   node scripts/sms-webhook-setup.mjs +14065551234 --apply  actually write it
//   node scripts/sms-webhook-setup.mjs +14065551234 --apply --label "Kyler front desk" --client kyler@example.com
//
// A Messaging Service overrides a number's own webhook. If the number belongs to
// one, this sets the SERVICE's inbound URL too, because setting only the number
// looks like it worked and changes nothing.
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOK = process.env.TWILIO_AUTH_TOKEN;
const ORIGIN = (process.env.SMS_WEBHOOK_ORIGIN || 'https://modernmustardseed.com').replace(/\/$/, '');

if (!SID || !TOK) {
  console.error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required. Nothing was changed.');
  process.exit(1);
}

const INBOUND = `${ORIGIN}/api/hooks/sms`;
const STATUS = `${ORIGIN}/api/hooks/sms/status`;
const auth = 'Basic ' + Buffer.from(`${SID}:${TOK}`).toString('base64');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const target = args.find((a) => a.startsWith('+'));
const APPLY = flag('--apply');

async function api(method, url, form) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: auth, ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${json.message ?? text}`);
  return json;
}

const numbers = (await api('GET', `https://api.twilio.com/2010-04-01/Accounts/${SID}/IncomingPhoneNumbers.json?PageSize=100`)).incoming_phone_numbers ?? [];

if (!target) {
  if (!numbers.length) {
    console.log('This Twilio account owns no phone numbers. Buy one first; inbound works the moment you do,');
    console.log('with no A2P registration, because A2P only governs outbound.');
    process.exit(0);
  }
  console.log(`Inbound webhook would be: ${INBOUND}\n`);
  for (const n of numbers) {
    const wired = n.sms_url === INBOUND;
    console.log(`${n.phone_number}  ${n.friendly_name}`);
    console.log(`   sms_url: ${n.sms_url || '(none)'} ${wired ? '<- already wired' : ''}`);
    console.log(`   messaging service: ${n.messaging_service_sid || '(none)'}`);
    console.log(`   capabilities: sms=${n.capabilities?.sms ? 'yes' : 'NO'}`);
  }
  console.log('\nRe-run with a number to wire it, e.g.:');
  console.log(`   node scripts/sms-webhook-setup.mjs ${numbers[0].phone_number} --apply`);
  process.exit(0);
}

const number = numbers.find((n) => n.phone_number === target);
if (!number) {
  console.error(`${target} is not on this Twilio account. Run with no arguments to list what is.`);
  process.exit(1);
}
if (!number.capabilities?.sms) {
  console.error(`${target} has no SMS capability. It cannot receive texts, and no webhook will fix that.`);
  process.exit(1);
}

console.log(`${APPLY ? 'Wiring' : 'Would wire'} ${target}`);
console.log(`   inbound  ${number.sms_url || '(none)'}  ->  ${INBOUND}`);
console.log(`   status   ${number.status_callback || '(none)'}  ->  ${STATUS}`);

if (number.messaging_service_sid) {
  console.log(`   NOTE: this number is in Messaging Service ${number.messaging_service_sid},`);
  console.log('         which overrides the number. The service will be pointed at the same URLs.');
}

if (!APPLY) {
  console.log('\nDry run. Nothing was changed. Add --apply to write it.');
  process.exit(0);
}

await api('POST', `https://api.twilio.com/2010-04-01/Accounts/${SID}/IncomingPhoneNumbers/${number.sid}.json`, {
  SmsUrl: INBOUND,
  SmsMethod: 'POST',
  StatusCallback: STATUS,
  StatusCallbackMethod: 'POST',
});
console.log('   number updated');

if (number.messaging_service_sid) {
  await api('POST', `https://messaging.twilio.com/v1/Services/${number.messaging_service_sid}`, {
    InboundRequestUrl: INBOUND,
    InboundMethod: 'POST',
    StatusCallback: STATUS,
  });
  console.log('   messaging service updated');
}

// File it. Without this row the app treats the number as unknown and refuses to
// send from it, which is the safe default but reads as a broken Send button.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log('\nTwilio is wired, but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset, so the number was not');
  console.log('filed in sms_numbers. Inbound texts will still arrive and thread. Outbound stays locked until it is filed.');
  process.exit(0);
}

const client = value('--client');
const db = createClient(url, key, { auth: { persistSession: false } });
const { error } = await db.from('sms_numbers').upsert(
  {
    phone: target,
    label: value('--label') ?? number.friendly_name ?? null,
    owner_kind: client ? 'client' : 'mms',
    owner_email: client,
    provider: 'twilio',
    provider_sid: number.sid,
    messaging_service_sid: number.messaging_service_sid || null,
    inbound_ready: true,
    // Deliberately NOT flipped on here. Outbound is a carrier decision, not a
    // webhook one, and this script has no way to know whether the A2P campaign
    // is approved. Run scripts/a2p-status.mjs, and set it when it says so.
    outbound_ready: false,
    active: true,
  },
  { onConflict: 'phone' },
);

if (error) {
  console.error(`\nTwilio is wired but the sms_numbers row failed: ${error.message}`);
  console.error('Apply migration 113 first: supabase db query --linked -f supabase/migrations/113_sms_threads.sql');
  process.exit(1);
}

console.log('   filed in sms_numbers (outbound_ready = false until A2P clears)');
console.log(`\nDone. Text ${target} from your own phone and it should appear at ${ORIGIN}/admin/texting within a second.`);
