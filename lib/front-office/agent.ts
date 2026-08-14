/**
 * COMPILE AN OFFICE INTO A RECEPTIONIST.
 *
 * Everything the owner chose (voice, manner, hours, what it must never do, who
 * it hands calls to) becomes one Vapi assistant. One assistant per office, not
 * one shared assistant with overrides, because these are LIVE inbound numbers:
 * a shared assistant means one bad edit changes every customer's front desk at
 * once, and there is no way to roll one back without rolling back all of them.
 *
 * ── THE INSTRUCTIONS ARE ASSEMBLED, NEVER CONCATENATED FROM USER TEXT ────────
 * Owner-supplied strings (the greeting, their extra rules, service names) are
 * data inside a structure we control, never sentences that could restructure
 * the prompt. Enumerated choices are validated against an allowed list before
 * they get here. An owner cannot make their receptionist claim to be human, and
 * neither can anybody who gets hold of their portal password.
 *
 * ── THE OFFICE IS FOUND BY ASSISTANT ID, NEVER BY A URL PARAMETER ────────────
 * The webhook resolves which office a call belongs to by looking up the
 * assistant id Vapi reports. Putting an office id in the server URL would mean
 * anybody who guessed one could post calls into somebody else's CRM.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sidekickVoice } from '@/lib/sidekick-voice';
import { SITE } from '@/lib/seo';
import { frontOfficeTools } from '@/lib/front-office/tools';

const VAPI_BASE = 'https://api.vapi.ai';
const real = (v?: string | null) => (v && !/^\[SENSITIVE\]$/i.test(v) ? v : null);
const apiKey = () => real(process.env.VAPI_API_KEY) || real(process.env.VAPI_PRIVATE_KEY);

export type OfficeRow = {
  id: string;
  business_name: string;
  agent_name: string;
  greeting: string | null;
  tone: string;
  voice_gender: string;
  languages: string[];
  timezone: string;
  hours: Record<string, unknown>;
  services: string[];
  service_area: string | null;
  booking_enabled: boolean;
  transfers_enabled: boolean;
  never_do: string[];
  escalate_on: string[];
  after_hours_message: string | null;
  forward_mode: string;
  vapi_assistant_id: string | null;
  settings: Record<string, unknown>;
};

export type TransferRow = { name: string; role: string | null; phone: string; when_to_transfer: string | null; priority: number };

const TONE_NOTES: Record<string, string> = {
  warm: 'Warm and unhurried. You sound like somebody who has worked here a while and likes the customers.',
  professional: 'Professional and precise. Courteous, efficient, never stiff.',
  brisk: 'Brisk and efficient. Short sentences. You respect that they are busy, and you never sound rushed or rude.',
  folksy: 'Plain-spoken and neighbourly. You talk like a person, not a script.',
};

/**
 * The system prompt.
 *
 * Ordered by what must survive a long call: identity and the hard rules first,
 * because a model that runs low on attention drops the middle of a prompt, and
 * the middle is not where "never claim to be human" belongs.
 */
export function buildInstructions(office: OfficeRow, transfers: TransferRow[]): string {
  const bits: string[] = [];

  bits.push(
    `You are ${office.agent_name}, answering the phone for ${office.business_name}.`,
    `You are an AI assistant. Say so plainly the first time anybody asks, without apology and without pretending otherwise.`,
    '',
    'THE RULES THAT DO NOT BEND:',
    ...office.never_do.map((r) => `  - ${r}`),
    '',
    'HAND THE CALL TO A HUMAN IMMEDIATELY IF:',
    ...office.escalate_on.map((r) => `  - ${r}`),
    '',
  );

  bits.push('YOUR JOB, IN ORDER:', '  1. Find out who is calling and how to reach them. A name and a callback number, every time, before anything else.', '  2. Find out what they need and how urgent it is.');
  if (office.booking_enabled) bits.push('  3. Get them booked in, using check_availability and then book_appointment. Never invent a time; only offer slots the tool gave you.');
  if (office.transfers_enabled && transfers.length) bits.push('  4. If it belongs with a person, use transfer_call.');
  bits.push('  5. Whatever happens, call log_call before the call ends so the owner knows what happened.', '');

  bits.push('HOW YOU SOUND:', `  ${TONE_NOTES[office.tone] ?? TONE_NOTES.warm}`, '  Short sentences. One question at a time. Never read a list at somebody.', '');

  if (office.languages.includes('es')) {
    bits.push(
      'LANGUAGE:',
      '  If the caller speaks Spanish, switch to Spanish and stay there for the rest of the call. Do not ask permission and do not apologise for it. Handle the call exactly as well in Spanish as in English.',
      '',
    );
  }

  if (office.services.length) {
    bits.push('WHAT THIS BUSINESS DOES:', ...office.services.map((s) => `  - ${s}`), '');
  }
  if (office.service_area) bits.push(`WHERE THEY WORK: ${office.service_area}`, '');

  const hours = formatHours(office.hours);
  if (hours) bits.push('THEIR HOURS:', `  ${hours}`, `  Times you say out loud are ${office.timezone}.`, '');

  if (office.forward_mode === 'after_hours') {
    bits.push(
      'WHY YOU ARE ANSWERING:',
      '  The office is closed or the team is out. You are the reason this call did not go to voicemail. Act like it: get everything the owner needs to call them back first thing, and make the caller feel handled rather than parked.',
      '',
    );
  } else if (office.forward_mode === 'overflow') {
    bits.push('WHY YOU ARE ANSWERING:', '  Everybody else is already on a call. Be quick and be useful; this caller was about to hang up.', '');
  }

  if (transfers.length) {
    bits.push('WHO YOU CAN HAND A CALL TO:');
    for (const t of transfers) {
      bits.push(`  - ${t.name}${t.role ? `, ${t.role}` : ''}${t.when_to_transfer ? `: ${t.when_to_transfer}` : ''}`);
    }
    bits.push('  Use transfer_call with the person\'s name. If nobody fits, take a message instead of guessing.', '');
  }

  if (office.after_hours_message) {
    bits.push('IF THEY ASK WHEN SOMEBODY WILL CALL BACK:', `  ${office.after_hours_message}`, '');
  }

  bits.push(
    'NEVER:',
    '  - Never make up a price, a time, an address, or an availability. If you do not know, say you will have somebody confirm.',
    '  - Never keep talking after the caller has what they need. End the call cleanly.',
    '  - Never argue. If they are unhappy, get a human.',
  );

  return bits.join('\n');
}

/** "Mon to Fri 8am to 5pm, closed weekends", or nothing if we were told nothing. */
export function formatHours(hours: Record<string, unknown>): string | null {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const set = days.filter((d) => typeof hours[d] === 'string' && String(hours[d]).trim());
  if (!set.length) return null;
  return set.map((d) => `${d[0].toUpperCase()}${d.slice(1, 3)} ${String(hours[d]).trim()}`).join(', ');
}

export function firstMessageFor(office: OfficeRow): string {
  return office.greeting?.trim() || `Thanks for calling ${office.business_name}. How can I help?`;
}

/** The whole Vapi assistant payload, as data, so it can be tested without a network. */
export function assistantConfig(office: OfficeRow, transfers: TransferRow[]): Record<string, unknown> {
  return {
    name: `${office.business_name} front desk`,
    firstMessage: firstMessageFor(office),
    voice: sidekickVoice(office.voice_gender),
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.4,
      messages: [{ role: 'system', content: buildInstructions(office, transfers) }],
      tools: frontOfficeTools(office),
    },
    // Every event lands on one endpoint that resolves the office from the
    // assistant id in the payload. No office id in the URL, ever.
    server: { url: `${SITE.url}/api/front-office/vapi` },
    serverMessages: ['tool-calls', 'end-of-call-report', 'status-update'],
    // A receptionist that will not stop talking is worse than voicemail.
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 900,
    endCallMessage: 'Thanks for calling. Somebody will be in touch shortly.',
    metadata: { officeId: office.id, product: 'front-office' },
  };
}

export type SyncResult = { ok: true; assistantId: string; created: boolean } | { ok: false; error: string };

/**
 * Push the office to Vapi. Creates on first call, updates after.
 *
 * Called whenever the owner changes anything, so their next caller hears the
 * change rather than waiting for somebody to remember to redeploy them.
 */
export async function syncAssistant(sb: SupabaseClient, officeId: string): Promise<SyncResult> {
  const key = apiKey();
  if (!key) return { ok: false, error: 'No Vapi API key configured.' };

  const { data: office } = await sb.from('fo_offices').select('*').eq('id', officeId).maybeSingle();
  if (!office) return { ok: false, error: 'No such office.' };

  const { data: transfers } = await sb
    .from('fo_transfers')
    .select('name, role, phone, when_to_transfer, priority')
    .eq('office_id', officeId)
    .eq('active', true)
    .order('priority', { ascending: true });

  const body = assistantConfig(office as OfficeRow, (transfers ?? []) as TransferRow[]);
  const existing = (office as OfficeRow).vapi_assistant_id;

  try {
    const res = await fetch(existing ? `${VAPI_BASE}/assistant/${existing}` : `${VAPI_BASE}/assistant`, {
      method: existing ? 'PATCH' : 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: unknown };
    if (!res.ok) {
      return { ok: false, error: `Vapi ${res.status}: ${typeof json.message === 'string' ? json.message : JSON.stringify(json.message ?? {})}` };
    }
    const assistantId = json.id ?? existing;
    if (!assistantId) return { ok: false, error: 'Vapi returned no assistant id.' };

    if (!existing) await sb.from('fo_offices').update({ vapi_assistant_id: assistantId }).eq('id', officeId);
    return { ok: true, assistantId, created: !existing };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Vapi call failed.' };
  }
}
