/**
 * PROVE A BUILT DEMO CAN ACTUALLY BOOK, AGAINST THE REAL DATABASE.
 *
 *   npx tsx scripts/demo-booking-smoke.mts
 *
 * The unit tests pin the time maths with no database in them. This exercises
 * the other half: that a real built run resolves, that check_availability comes
 * back with real slots, that book_appointment writes a row, that the slot then
 * disappears from the next lookup, and that a second attempt on the same slot
 * loses to the unique index instead of double-booking.
 *
 * It exists because the first version of this feature was WRONG in a way no
 * unit test could see: `run_id` had a foreign key to an empty leftover table
 * that is present, permanently empty (the live store is app_state), and would
 * therefore have rejected every booking at runtime while every test passed.
 *
 * Cleans up after itself. Books ten days out under an obvious throwaway name so
 * a failure mid-run leaves something recognisable rather than a mystery row on
 * a prospect's calendar.
 */

import { readFileSync } from 'node:fs';

/* Env first, imports second. `getSupabase` reads process.env at call time and
 * several of these modules read it at import time, so a static import would
 * capture an empty environment and hand back a null client. Same loader the
 * acq scripts use. */
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { getSupabase } = await import('../lib/supabase');
const { getRun } = await import('../lib/demo-run-store');
const { runDemoBookingTool } = await import('../lib/demo-booking-tools');

const MARKER = 'SMOKE TEST CALLER';
const TZ = 'America/Denver';

function show(label: string, raw: string) {
  const v = JSON.parse(raw) as Record<string, unknown>;
  const brief = { ...v };
  if (typeof brief.instruction === 'string') brief.instruction = `${brief.instruction.slice(0, 70)}...`;
  console.log(`  ${label}: ${JSON.stringify(brief)}`);
}

async function main() {
  const sb = getSupabase();
  if (!sb) throw new Error('no supabase client; check SUPABASE_SERVICE_ROLE_KEY');

  // A real built demo, newest first.
  const { data: rows, error } = await sb
    .from('app_state')
    .select('key')
    .like('key', 'demo:run:%')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(`app_state read failed: ${error.message}`);
  if (!rows?.length) throw new Error('no built runs in app_state to test with');

  const runId = rows[0].key.replace('demo:run:', '');
  const stored = await getRun(sb, runId);
  if (!stored) throw new Error(`getRun could not resolve ${runId}`);

  const run = {
    id: runId,
    business: stored.business || 'this business',
    city: stored.city || null,
    hours: stored.hours || null,
  };
  console.log(`\nDemo under test: ${run.business} (run ${runId.slice(0, 8)})`);
  console.log(`Hours on the run: ${run.hours ? JSON.stringify(run.hours) : 'none given, using the demo default'}\n`);

  let failures = 0;
  const check = (ok: boolean, what: string) => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`);
    if (!ok) failures++;
  };

  // 1. check_availability returns real slots.
  const availRaw = await runDemoBookingTool(sb, run, TZ, 'smoke-call', 'check_availability', {
    service: 'a leaking roof',
    preference: 'as soon as possible',
  });
  show('check_availability', availRaw);
  const avail = JSON.parse(availRaw) as { ok: boolean; slots?: Array<{ startsAt: string; say: string }> };
  check(avail.ok === true && !!avail.slots?.length, 'check_availability returns real openings');
  if (!avail.slots?.length) {
    console.log('\nNo slots, so nothing further can be proven.');
    process.exit(1);
  }
  check(
    avail.slots.every((s) => !Number.isNaN(Date.parse(s.startsAt))),
    'every slot carries a parseable startsAt',
  );
  check(
    avail.slots.every((s) => !/T\d\d:/.test(s.say)),
    'every slot carries a sayable label, not an ISO string',
  );

  const slot = avail.slots[0];
  console.log(`\n  Booking: ${slot.say}\n`);

  // 2. book_appointment writes a real row.
  const bookRaw = await runDemoBookingTool(sb, run, TZ, 'smoke-call', 'book_appointment', {
    starts_at: slot.startsAt,
    customer_name: MARKER,
    customer_phone: '4065550147',
    service: 'a leaking roof',
  });
  show('book_appointment', bookRaw);
  const booked = JSON.parse(bookRaw) as { ok: boolean; bookedFor?: string };
  check(booked.ok === true, 'book_appointment succeeds');
  check(typeof booked.bookedFor === 'string' && booked.bookedFor === slot.say, 'it confirms the time it was given');

  const { data: row } = await sb
    .from('demo_appointments')
    .select('id, customer_name, starts_at, service')
    .eq('run_id', runId)
    .eq('customer_name', MARKER)
    .maybeSingle();
  check(!!row, 'the appointment is really in the database');

  // 3. The slot is gone from the next lookup.
  const againRaw = await runDemoBookingTool(sb, run, TZ, 'smoke-call', 'check_availability', {});
  const again = JSON.parse(againRaw) as { ok: boolean; slots?: Array<{ startsAt: string }> };
  check(
    !again.slots?.some((s) => s.startsAt === slot.startsAt),
    'the booked slot is no longer offered to the next caller',
  );

  // 4. Booking it again loses to the unique index rather than double-booking.
  const dupeRaw = await runDemoBookingTool(sb, run, TZ, 'smoke-call', 'book_appointment', {
    starts_at: slot.startsAt,
    customer_name: `${MARKER} TWO`,
  });
  show('book_appointment (duplicate)', dupeRaw);
  const dupe = JSON.parse(dupeRaw) as { ok: boolean; instruction?: string };
  check(dupe.ok === false && /took that time/i.test(dupe.instruction ?? ''), 'a double booking is refused, and the agent is told to offer another time');

  // 5. take_message still works as the fallback.
  const msg = JSON.parse(await runDemoBookingTool(sb, run, TZ, 'smoke-call', 'take_message', { message: 'call me back' })) as { ok: boolean };
  check(msg.ok === true, 'take_message still answers');

  // Clean up everything this script created.
  const { error: delErr } = await sb.from('demo_appointments').delete().eq('run_id', runId).like('customer_name', `${MARKER}%`);
  check(!delErr, 'cleaned up after itself');

  /*
   * THE ALERT PATH, only with --notify, because it sends Sarah a real email.
   *
   * Snapshots the lead it touches and puts it back afterwards. The lead update
   * is the half that matters most (an email is something she has to read; a
   * lead on the dial floor works even if she does not), so it is worth proving
   * rather than assuming, and worth proving without leaving a fake booking note
   * on a real prospect's record.
   */
  if (process.argv.includes('--notify')) {
    const { notifyDemoBooking } = await import('../lib/demo-booking-notify');
    const { data: lead } = await sb
      .from('outbound_leads')
      .select('id, business_name, notes, next_action, status')
      .eq('demo_run_id', runId)
      .maybeSingle();

    console.log(`\n  Alert test against lead: ${lead ? lead.business_name : 'none (self-serve build, email only)'}`);
    const before = lead ? { notes: lead.notes, next_action: lead.next_action, status: lead.status } : null;

    await notifyDemoBooking(sb, {
      runId,
      business: run.business,
      label: slot.say,
      customerName: MARKER,
      customerPhone: '4065550147',
      service: 'a leaking roof',
      startsAt: slot.startsAt,
    });

    if (lead && before) {
      const { data: after } = await sb
        .from('outbound_leads')
        .select('notes, next_action, status')
        .eq('id', lead.id)
        .maybeSingle();
      check(!!after?.notes?.includes('BOOKED ON THEIR OWN DEMO'), 'the booking is written onto the lead');
      check(/BOOKED on their own demo/i.test(after?.next_action ?? ''), 'the lead is flagged for a call today');

      const { error: restoreErr } = await sb.from('outbound_leads').update(before).eq('id', lead.id);
      check(!restoreErr, 'the lead was put back exactly as it was');
      const { data: restored } = await sb.from('outbound_leads').select('notes, next_action, status').eq('id', lead.id).maybeSingle();
      check(restored?.notes === before.notes && restored?.next_action === before.next_action, 'restore verified by reading it back');
    }
    console.log('  Alert email sent to the owner list. Check the inbox for "DEMO BOOKING".');
  }

  console.log(`\n${failures ? `${failures} FAILURE(S)` : 'All checks passed.'}\n`);
  process.exitCode = failures ? 1 : 0;
}

main().catch((err) => {
  console.error('\nsmoke test threw:', err instanceof Error ? err.message : err, '\n');
  process.exitCode = 1;
});
