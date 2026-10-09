import { bookSlot, openSlots } from '@/lib/white-label/booking';

/**
 * The receptionist's booking tools on a white label desk, answered through the
 * same webhook as the end-of-call report (/api/voice/desk-report, guarded by
 * VAPI_DESK_SECRET). Every answer carries an instruction in plain words, so the
 * model is told what to say next rather than left to guess.
 */

export const DESK_TOOL_NAMES = new Set(['check_availability', 'book_consultation']);

type ToolCall = { id?: string; function?: { name?: string; arguments?: unknown } };

function args(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

const s = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

async function answer(clientId: string, name: string, a: Record<string, unknown>, callId: string | null): Promise<string> {
  if (name === 'check_availability') {
    const slots = await openSlots(clientId, { date: s(a.date, 10), part: s(a.part_of_day, 20) });
    if (!slots.length) {
      return JSON.stringify({ ok: false, instruction: 'Nothing is open that far out. Do not invent a time. Say Jordan will call them to set one up.' });
    }
    return JSON.stringify({
      ok: true,
      slots: slots.map((x) => ({ startsAt: x.startsAt, say: x.label })),
      instruction:
        'These are the only times you may offer. Offer two, out loud, in the `say` wording, closest to what they asked for. ' +
        'When they pick one, call book_consultation with that slot\'s exact startsAt. Never read startsAt aloud.',
    });
  }
  if (name === 'book_consultation') {
    const startsAt = s(a.starts_at, 40);
    const caller = s(a.caller_name, 80);
    if (!startsAt || !caller) {
      return JSON.stringify({ ok: false, instruction: 'You need the exact starts_at from check_availability and their name. Ask for what is missing, once.' });
    }
    const r = await bookSlot(clientId, { startsAt, name: caller, phone: s(a.caller_phone, 40), matter: s(a.matter, 200), callId });
    if (r.ok) {
      return JSON.stringify({
        ok: true,
        bookedFor: r.label,
        instruction: `They are booked with Jordan for ${r.label}, Mountain time. Say that day and time back to them in those words and tell them they are all set. Jordan will call them at the number they gave.`,
      });
    }
    return JSON.stringify({
      ok: false,
      next: r.next.map((x) => ({ startsAt: x.startsAt, say: x.label })),
      instruction:
        r.reason === 'taken'
          ? 'That time just got taken. Say so in one short sentence and offer one of these instead.'
          : 'That was not one of the open times. Offer one of these instead, in the `say` wording.',
    });
  }
  return JSON.stringify({ ok: false, error: `Unknown tool ${name}` });
}

/** Vapi's tool-calls message in, Vapi's results shape out. */
export async function answerToolCalls(clientId: string, message: Record<string, unknown>): Promise<{ results: { toolCallId: string; result: string }[] }> {
  const call = (message.call ?? {}) as Record<string, unknown>;
  const callId = typeof call.id === 'string' ? call.id : null;
  const list = (message.toolCallList ?? message.toolCalls ?? []) as ToolCall[];
  const results = [];
  for (const tc of list) {
    const name = tc.function?.name ?? '';
    const result = DESK_TOOL_NAMES.has(name)
      ? await answer(clientId, name, args(tc.function?.arguments), callId).catch((e) => {
          console.error('desk tool failed', name, e);
          return JSON.stringify({ ok: false, instruction: 'The calendar did not answer. Take their details and say Jordan will call to set a time.' });
        })
      : JSON.stringify({ ok: false, error: `Unknown tool ${name}` });
    results.push({ toolCallId: tc.id ?? '', result });
  }
  return { results };
}
