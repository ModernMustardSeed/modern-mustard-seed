/**
 * WHAT THE RECEPTIONIST CAN ACTUALLY DO.
 *
 * Five tools, no more. Every extra tool is another thing a model can reach for
 * at the wrong moment on a live customer call, and a front desk that does five
 * things reliably beats one that does twelve unpredictably.
 *
 *   check_availability   real openings only, never invented
 *   book_appointment     the database awards the slot, not the model
 *   take_message         the fallback that always works
 *   transfer_call        hand it to a named human
 *   log_call             what happened, so the owner does not read transcripts
 *
 * ── TOOLS ARE BUILT PER OFFICE ───────────────────────────────────────────────
 * An office with booking switched off does not get book_appointment. Not
 * disabled in the prompt: absent. A model cannot misuse a tool it does not
 * have, and "please do not use this tool" is an instruction, not a control.
 *
 * ── NO SECRETS TRAVEL WITH A TOOL ────────────────────────────────────────────
 * These definitions are uploaded to Vapi and echoed back in webhooks. Nothing
 * here carries a key, a URL with a token, or an office id that would be
 * authority if leaked. The office is resolved from the assistant id server-side.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { availableSlots, bookSlot, sayable } from '@/lib/front-office/calendar';
import { upsertContact, recordOfficeEvent } from '@/lib/front-office/provision';

type ToolDef = { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } };

const obj = (props: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties: props, required });
const str = (description: string) => ({ type: 'string', description });

export function frontOfficeTools(office: { booking_enabled: boolean; transfers_enabled: boolean }): ToolDef[] {
  const tools: ToolDef[] = [];

  if (office.booking_enabled) {
    tools.push({
      type: 'function',
      function: {
        name: 'check_availability',
        description:
          'Get real open appointment times. Call this BEFORE offering any time to the caller. Never say a time that did not come from this tool.',
        parameters: obj({
          service: str('What the job is, if they said. Optional.'),
          preference: str('Anything they asked for, like "mornings" or "as soon as possible". Optional.'),
        }),
      },
    });
    tools.push({
      type: 'function',
      function: {
        name: 'book_appointment',
        description:
          'Book one of the times check_availability returned. If it comes back taken, apologise briefly, offer another time from the list, and book that instead.',
        parameters: obj(
          {
            starts_at: str('The exact ISO timestamp from check_availability. Do not construct this yourself.'),
            customer_name: str("The caller's name."),
            customer_phone: str('The best callback number.'),
            service: str('What the job is.'),
            address: str('Where the work is, if it is on site.'),
            notes: str('Anything the technician needs to know.'),
          },
          ['starts_at', 'customer_name'],
        ),
      },
    });
  }

  tools.push({
    type: 'function',
    function: {
      name: 'take_message',
      description: 'Take a message for the owner. Use this whenever you cannot book or transfer, and always before ending an unresolved call.',
      parameters: obj(
        {
          customer_name: str("The caller's name."),
          customer_phone: str('The best callback number.'),
          message: str('What they want, in their words.'),
          urgency: { type: 'string', enum: ['emergency', 'urgent', 'routine', 'info'], description: 'How fast somebody needs to call back.' },
        },
        ['message'],
      ),
    },
  });

  if (office.transfers_enabled) {
    tools.push({
      type: 'function',
      function: {
        name: 'transfer_call',
        description: 'Hand the call to a named person on the team. Only use a name you were given. If nobody fits, take a message instead.',
        parameters: obj({ who: str('The name of the person to transfer to.'), why: str('One line on why.') }, ['who']),
      },
    });
  }

  tools.push({
    type: 'function',
    function: {
      name: 'log_call',
      description: 'Record what this call was about. Call this before the call ends, on every call, even a wrong number.',
      parameters: obj(
        {
          intent: str('A few words: "no heat", "quote request", "wrong number".'),
          urgency: { type: 'string', enum: ['emergency', 'urgent', 'routine', 'info'] },
          summary: str('Two or three sentences the owner can read in ten seconds.'),
          customer_name: str("The caller's name if you learned it."),
          customer_phone: str('Their callback number if you learned it.'),
          needs_human: { type: 'boolean', description: 'True if a person must follow up.' },
        },
        ['summary'],
      ),
    },
  });

  return tools;
}

export type ToolContext = {
  db: SupabaseClient;
  office: {
    id: string;
    business_name: string;
    hours: Record<string, unknown>;
    timezone: string;
    transfers_enabled: boolean;
  };
  callId: string | null;
  fromNumber: string | null;
};

/**
 * Run one tool call. Always returns a STRING for the model to read aloud, and
 * never throws: a thrown error inside a live call is dead air, so a failure
 * becomes a sentence the receptionist can actually say.
 */
export async function runFrontOfficeTool(ctx: ToolContext, name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'check_availability':
        return await doCheckAvailability(ctx);
      case 'book_appointment':
        return await doBook(ctx, args);
      case 'take_message':
        return await doMessage(ctx, args);
      case 'transfer_call':
        return await doTransfer(ctx, args);
      case 'log_call':
        return await doLog(ctx, args);
      default:
        return 'That is not something I can do on this call.';
    }
  } catch (err) {
    console.error('front-office tool threw', name, err);
    // What the caller hears when our side breaks. It is true, it is not an
    // apology for an error code, and it still moves the call forward.
    return 'I could not get to that just now. Let me take your details and have somebody call you straight back.';
  }
}

async function doCheckAvailability(ctx: ToolContext): Promise<string> {
  const slots = await availableSlots(ctx.db, ctx.office, { limit: 4 });
  if (!slots.length) {
    return 'There is nothing open on the schedule I can see. Take their name and number and tell them somebody will call to arrange a time.';
  }
  // The ISO string is included because book_appointment needs it verbatim, and
  // the spoken label is included so the model reads a human time out loud
  // rather than a timestamp.
  return `Open times: ${slots.map((s) => `${s.label} (starts_at ${s.startsAt})`).join('; ')}. Offer these in order and use the exact starts_at when booking.`;
}

async function doBook(ctx: ToolContext, args: Record<string, unknown>): Promise<string> {
  const name = String(args.customer_name ?? '').trim();
  const phone = String(args.customer_phone ?? ctx.fromNumber ?? '').trim();
  const contactId = await upsertContact(ctx.db, ctx.office.id, { name: name || null, phone: phone || null, isCustomer: true });

  const res = await bookSlot(ctx.db, ctx.office, {
    startsAt: String(args.starts_at ?? ''),
    title: `${String(args.service ?? 'Service call')} for ${name || 'a caller'}`,
    service: args.service ? String(args.service) : null,
    address: args.address ? String(args.address) : null,
    notes: args.notes ? String(args.notes) : null,
    contactId,
    callId: ctx.callId,
  });

  if (res.ok) {
    await ctx.db.from('fo_calls').update({ booked: true, appointment_id: res.appointmentId }).eq('vapi_call_id', ctx.callId ?? '');
    return `Booked for ${res.label}. Confirm that time back to them and tell them they will get a reminder.`;
  }
  if (res.reason === 'taken') return 'Somebody just took that time. Apologise briefly and offer the next one on the list.';
  if (res.reason === 'closed') return 'They are closed that day. Offer a different day from the list.';
  if (res.reason === 'past') return 'That time has passed. Offer one of the upcoming times instead.';
  return 'That did not save. Take their name and number and say somebody will confirm the time.';
}

async function doMessage(ctx: ToolContext, args: Record<string, unknown>): Promise<string> {
  const name = String(args.customer_name ?? '').trim();
  const phone = String(args.customer_phone ?? ctx.fromNumber ?? '').trim();
  const urgency = ['emergency', 'urgent', 'routine', 'info'].includes(String(args.urgency)) ? String(args.urgency) : 'routine';

  const contactId = await upsertContact(ctx.db, ctx.office.id, { name: name || null, phone: phone || null });
  if (ctx.callId) {
    await ctx.db
      .from('fo_calls')
      .update({
        contact_id: contactId,
        summary: String(args.message ?? '').slice(0, 2000),
        urgency,
        needs_human: true,
      })
      .eq('vapi_call_id', ctx.callId);
  }
  await recordOfficeEvent(ctx.db, ctx.office.id, {
    type: 'message',
    label: `Message from ${name || phone || 'a caller'}`,
    detail: { message: args.message, urgency, phone },
    actor: 'agent',
  });

  return urgency === 'emergency'
    ? 'Message taken and flagged as an emergency. Tell them somebody is being alerted right now.'
    : 'Message taken. Tell them somebody will call them back.';
}

async function doTransfer(ctx: ToolContext, args: Record<string, unknown>): Promise<string> {
  const who = String(args.who ?? '').trim().toLowerCase();
  const { data: team } = await ctx.db
    .from('fo_transfers')
    .select('name, phone, when_to_transfer')
    .eq('office_id', ctx.office.id)
    .eq('active', true)
    .order('priority', { ascending: true });

  const list = (team ?? []) as { name: string; phone: string }[];
  // Match the name we were given. A model that hallucinates a colleague must
  // not be able to make us dial an arbitrary number, so an unmatched name
  // falls back to a message rather than to "the first person on the list".
  const found = list.find((t) => t.name.toLowerCase() === who) ?? list.find((t) => t.name.toLowerCase().includes(who) && who.length >= 3);
  if (!found) {
    return list.length
      ? `There is nobody by that name. The people you can transfer to are: ${list.map((t) => t.name).join(', ')}. If none of them fit, take a message.`
      : 'There is nobody set up to transfer to. Take a message instead.';
  }

  if (ctx.callId) {
    await ctx.db.from('fo_calls').update({ transferred: true, transferred_to: found.name }).eq('vapi_call_id', ctx.callId);
  }
  // The dial itself is Vapi's transferCall destination, returned to the model
  // as an instruction. We record the intent here either way.
  return `Transferring to ${found.name} at ${found.phone}. Tell the caller you are putting them through now.`;
}

async function doLog(ctx: ToolContext, args: Record<string, unknown>): Promise<string> {
  const name = String(args.customer_name ?? '').trim();
  const phone = String(args.customer_phone ?? ctx.fromNumber ?? '').trim();
  const urgency = ['emergency', 'urgent', 'routine', 'info'].includes(String(args.urgency)) ? String(args.urgency) : null;
  const contactId = await upsertContact(ctx.db, ctx.office.id, { name: name || null, phone: phone || null });

  if (ctx.callId) {
    await ctx.db
      .from('fo_calls')
      .update({
        contact_id: contactId,
        intent: args.intent ? String(args.intent).slice(0, 120) : null,
        urgency,
        summary: args.summary ? String(args.summary).slice(0, 2000) : null,
        needs_human: Boolean(args.needs_human),
      })
      .eq('vapi_call_id', ctx.callId);
  }
  return 'Logged.';
}
