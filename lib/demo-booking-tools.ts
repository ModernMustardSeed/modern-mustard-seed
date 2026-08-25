/**
 * THE THREE TOOLS A FORGED DEMO AGENT NEEDS TO ACT LIKE THE PRODUCT.
 *
 *   check_availability   real openings only, never invented
 *   book_appointment     the database awards the slot, not the model
 *   take_message         the fallback, so no caller ever leaves with nothing
 *
 * ── WHY THESE ARE APPENDED, NOT FILTERED IN ──────────────────────────────────
 * `demoModel` in lib/sidekick.ts trims the BASE assistant's tools down with an
 * allow-list. These three are not on the base assistant at all (Mr. Mustard has
 * no reason to book a roofing job), so an allow-list can never produce them.
 * They are added.
 *
 * ── ⚠️ THERE ARE NOW TWO CALENDARS ON A DEMO CALL, AND THAT IS THE RISK ──────
 * A demo agent can book the ROLEPLAYED BUSINESS (these tools) and it can book
 * SARAH (get_available_slots / book_discovery_call, kept for the close). Those
 * are completely different calendars for completely different people, and the
 * failure that matters is booking a customer's leaky roof into Sarah's
 * discovery calendar, or offering Sarah's Tuesday to somebody who wants a
 * plumber. So every description below names WHOSE calendar it is in its first
 * sentence, and sidekickSystemPrompt carries the same split in words. Names
 * were chosen to be unmistakable rather than symmetrical.
 *
 * ── ⚠️ NO `enum` INSIDE AN ARRAY'S `items` ───────────────────────────────────
 * See scripts/vapi-lint.mjs. That shape empties the ENTIRE arguments object on
 * a live Vapi call, which is how the forge sent nothing for eleven days. These
 * are all plain strings.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { demoSlots, bookDemoSlot, type DemoRun } from '@/lib/demo-booking';
import type { BookedDemo as BookedNotice } from '@/lib/demo-booking-notify';

type ToolDef = {
  type: 'function';
  async: false;
  messages: Array<{ type: string; content: string }>;
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

const str = (description: string) => ({ type: 'string', description });

/** The tool names a demo call answers for. Used to route in /api/voice. */
export const DEMO_BOOKING_TOOL_NAMES = new Set(['check_availability', 'book_appointment', 'take_message']);

export function demoBookingTools(business: string): ToolDef[] {
  const theirs = `${business}`;
  return [
    {
      type: 'function',
      async: false,
      // A request-start plays BEFORE the result is known, so it must be true
      // whether the lookup succeeds or comes back empty.
      messages: [{ type: 'request-start', content: 'Let me check the schedule.' }],
      function: {
        name: 'check_availability',
        description:
          `Get the real open appointment times on ${theirs}' OWN schedule, for a customer who wants work done. ` +
          `⚠️ This is the business you answer the phone for, NOT Sarah's calendar. ` +
          `Call this BEFORE you offer any time at all. Never say a day or a time that did not come back from this tool, ` +
          `and never promise to "have the owner confirm": you ARE the one who confirms, that is the entire point of you. ` +
          `If they asked for something specific ("Thursday morning", "as soon as you can"), pass it in preference and ` +
          `then say which of the returned times is closest to what they wanted.`,
        parameters: {
          type: 'object',
          properties: {
            service: str('What the job is, in their words, if they said. Optional.'),
            preference: str('Anything they asked for, like "Thursday morning" or "as soon as possible". Optional.'),
          },
          required: [],
        },
      },
    },
    {
      type: 'function',
      async: false,
      messages: [{ type: 'request-start', content: 'Booking that in now.' }],
      function: {
        name: 'book_appointment',
        description:
          `Actually book one of the times check_availability just returned, on ${theirs}' OWN schedule. ` +
          `⚠️ This is a customer's job, NOT a meeting with Sarah. ` +
          `Do this on the call, while they are still on the line. If it comes back taken, do not apologize at length: ` +
          `say somebody just grabbed it, offer the next time from the list, and book that one instead. ` +
          `After it succeeds, say the day and time back to them out loud exactly as the tool gives it to you, ` +
          `and tell them they are on the schedule.`,
        parameters: {
          type: 'object',
          properties: {
            starts_at: str(
              'The exact startsAt value from check_availability, copied character for character. Never build this yourself and never guess it.',
            ),
            customer_name: str("The caller's name."),
            customer_phone: str('The best callback number for them.'),
            service: str('What the job is, in their words.'),
            address: str('Where the work is, if it is on site and they gave it.'),
            notes: str('Anything whoever shows up needs to know.'),
          },
          required: ['starts_at', 'customer_name'],
        },
      },
    },
    {
      type: 'function',
      async: false,
      messages: [{ type: 'request-start', content: 'Let me get this written down.' }],
      function: {
        name: 'take_message',
        description:
          `Take a message for the owner of ${theirs}. Use this when you genuinely cannot book: they only want a price, ` +
          `they want a person, or check_availability came back with nothing that works for them. ` +
          `⚠️ Never use this INSTEAD of booking somebody who wants an appointment. Booking is always the better answer ` +
          `and it is the one thing this demo exists to prove.`,
        parameters: {
          type: 'object',
          properties: {
            customer_name: str("The caller's name."),
            customer_phone: str('The best callback number.'),
            message: str('What they want, in their own words.'),
            urgency: str("How fast somebody needs to call back. One of: 'emergency', 'urgent', 'routine', 'info'."),
          },
          required: ['message'],
        },
      },
    },
  ];
}

/**
 * Run one demo booking tool. Always returns a STRING of JSON for the model, and
 * never throws: a thrown error inside a live call is dead air, so every failure
 * becomes an instruction the agent can act on out loud.
 */
export async function runDemoBookingTool(
  db: SupabaseClient,
  run: DemoRun,
  timezone: string,
  callId: string | null,
  name: string,
  args: Record<string, unknown>,
  /**
   * Called once, synchronously, when a booking actually lands.
   *
   * ⚠️ A CALLBACK RATHER THAN CALLING `after()` IN HERE. The alerting work
   * (email plus a lead update) must not sit in front of the caller's next
   * sentence, so it belongs behind the response, and `after()` is how that is
   * done. But `after()` throws outside a request context, and this function is
   * also driven directly by scripts/demo-booking-smoke.mts, which is the only
   * thing that proves the booking path works against real data. So the route
   * owns the `after()` and passes it down, and the smoke test passes nothing.
   */
  onBooked?: (booked: BookedNotice) => void,
): Promise<string> {
  const s = (v: unknown, max = 200): string | null => {
    const t = typeof v === 'string' ? v.trim().slice(0, max) : '';
    return t || null;
  };

  try {
    if (name === 'check_availability') {
      const slots = await demoSlots(db, run, timezone, { limit: 4 });
      if (!slots.length) {
        return JSON.stringify({
          ok: false,
          instruction:
            'Nothing is open in the next ten days. Do NOT invent a time. Tell them the schedule is full that far out, ' +
            'take their details with take_message, and say the owner will call with the first opening.',
        });
      }
      return JSON.stringify({
        ok: true,
        slots: slots.map((sl) => ({ startsAt: sl.startsAt, say: sl.label })),
        instruction:
          'These are the ONLY times you may offer, and they are real. Offer two of them out loud, in the `say` wording, ' +
          'closest first to whatever they asked for. When they pick one, call book_appointment with that slot\'s exact ' +
          '`startsAt`. Do not read the startsAt value out loud, it is not English.',
      });
    }

    if (name === 'book_appointment') {
      const startsAt = s(args.starts_at, 60);
      const customerName = s(args.customer_name, 80);
      if (!startsAt || !customerName) {
        return JSON.stringify({
          ok: false,
          instruction:
            'Before this can book you need the exact `starts_at` from check_availability and the caller\'s name. ' +
            'Ask for whichever you are missing, once, then call this again. Do not call check_availability twice in a row.',
        });
      }

      const booked = await bookDemoSlot(db, run, timezone, {
        startsAt,
        customerName,
        customerPhone: s(args.customer_phone, 40),
        service: s(args.service, 200),
        address: s(args.address, 200),
        notes: s(args.notes, 600),
        callId,
      });

      if (booked.ok) {
        /* Sarah, 2026-08-25: "def needs to be known if i have a demo booking".
         * Fired here rather than at end of call, because a prospect who books
         * and then keeps talking for four minutes should not delay the alert,
         * and a caller who books and hangs up mid-sentence must not lose it. */
        onBooked?.({
          runId: run.id,
          business: run.business,
          label: booked.label,
          customerName,
          customerPhone: s(args.customer_phone, 40),
          service: s(args.service, 200),
          startsAt,
        });
        return JSON.stringify({
          ok: true,
          bookedFor: booked.label,
          instruction:
            `They are on the schedule for ${booked.label}. Say that day and time back to them out loud, in those words, ` +
            `and confirm they are booked. Then, because this is a demo, step out of the role for one line: point out that ` +
            `you just booked a real appointment on a real calendar while they listened, and that this is what happens on ` +
            `every call they miss.`,
        });
      }

      if (booked.reason === 'taken') {
        return JSON.stringify({
          ok: false,
          instruction:
            'Somebody took that time while they were deciding. Say so in one short sentence without apologizing twice, ' +
            'offer the next time from the list you already have, and book that one.',
        });
      }
      return JSON.stringify({
        ok: false,
        instruction:
          `That time did not work: ${booked.message} Call check_availability once for fresh times, offer one, and book it.`,
      });
    }

    if (name === 'take_message') {
      const message = s(args.message, 800);
      if (!message) {
        return JSON.stringify({ ok: false, instruction: 'Ask them what they would like passed on, then call this again.' });
      }
      /* A demo message is not stored anywhere a person reads: nobody is going to
       * call this person back, because they are the prospect roleplaying their
       * own customer. Saying so honestly beats writing a row that implies a
       * follow-up that will never happen. */
      return JSON.stringify({
        ok: true,
        instruction:
          'Got it. Read the message back to them in one sentence so they hear it captured correctly, say the owner will ' +
          'have it, and then offer once more to just book them in, because booking is what you are here to show them.',
      });
    }

    return JSON.stringify({ ok: false, error: `Unknown tool: ${name}` });
  } catch (err) {
    console.error(`demo booking tool ${name} failed`, err);
    return JSON.stringify({
      ok: false,
      instruction: 'The schedule did not answer. Take their name and number with take_message and carry on warmly.',
    });
  }
}
