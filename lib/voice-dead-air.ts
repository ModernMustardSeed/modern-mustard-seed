/**
 * THE DEAD-AIR WATCHDOG: no tool result is ever left unspoken on a live call.
 *
 * 2026-10-07, call 01a11684: the webhook answered get_available_slots with real
 * times in 898ms, and Vapi never made the follow-up model request. Mr. Mustard
 * sat silent for 25 seconds until Sarah hung up. Idle messages cannot cover
 * that: Vapi holds them while it believes a tool is still running.
 *
 * So the webhook watches. Every `speech-update` from Vapi is stamped into
 * app_state, and after each tool response the webhook waits a few seconds. If
 * the assistant has not started speaking since the result went back, it posts
 * the result into the live call through `call.monitor.controlUrl` as a system
 * message with triggerResponseEnabled, which makes the model answer at once.
 *
 * A false nudge costs one extra line from him. A missed one costs the caller.
 * The window is sized so the normal path (model about 1s, voice about 0.8s)
 * finishes well before the first check.
 */
import { getSupabase } from '@/lib/supabase';

/** First look after the result goes back. The normal path speaks by ~2.5s. */
const FIRST_CHECK_MS = 4500;
/** A caller mid-sentence gets one more window before he is nudged. */
const SECOND_CHECK_MS = 3500;
const RESULT_CHARS = 1500;

type Stamp = { at: number };

/** a: he started speaking. us / up: the caller started / stopped. t: a tool call arrived. */
type Event = 'a' | 'us' | 'up' | 't';
const key = (callId: string, ev: Event) => `livecall:${callId}:${ev}`;

async function stamp(callId: string, ev: Event, at: number): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db.from('app_state').upsert({
    key: key(callId, ev),
    value: { at } satisfies Stamp,
    updated_at: new Date(at).toISOString(),
  });
}

/** Record a speech-update. Called from the webhook for every one Vapi sends. */
export async function noteSpeech(message: Record<string, unknown>): Promise<void> {
  const call = (message.call ?? {}) as Record<string, unknown>;
  const callId = typeof call.id === 'string' ? call.id : null;
  if (!callId) return;
  const now = Date.now();
  const { role, status } = message;
  try {
    if (role === 'assistant' && status === 'started') await stamp(callId, 'a', now);
    else if (role === 'user' && status === 'started') await stamp(callId, 'us', now);
    else if (role === 'user' && status === 'stopped') await stamp(callId, 'up', now);
  } catch (err) {
    console.error('dead-air: speech stamp failed', err);
  }
}

/** Record that a tool call arrived, so a chained second tool is not mistaken for silence. */
export async function noteToolCall(callId: string): Promise<void> {
  try {
    await stamp(callId, 't', Date.now());
  } catch (err) {
    console.error('dead-air: tool stamp failed', err);
  }
}

/** The live-control URL Vapi puts on every call object, or null on a call without one. */
export function controlUrlOf(call: Record<string, unknown>): string | null {
  const monitor = (call.monitor ?? {}) as Record<string, unknown>;
  const url = monitor.controlUrl;
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** alive: he spoke, or fired another tool, after `since`. userTalking: the caller is mid-sentence. */
async function lineState(callId: string, since: number): Promise<{ alive: boolean; userTalking: boolean }> {
  const db = getSupabase();
  if (!db) return { alive: true, userTalking: false };
  const events: Event[] = ['a', 'us', 'up', 't'];
  const { data } = await db
    .from('app_state')
    .select('key, value')
    .in('key', events.map((e) => key(callId, e)));
  const at: Partial<Record<Event, number>> = {};
  for (const row of data ?? []) {
    const ev = String(row.key).split(':').pop() as Event;
    at[ev] = (row.value as Stamp | null)?.at ?? 0;
  }
  return {
    alive: (at.a ?? 0) > since || (at.t ?? 0) > since,
    userTalking: (at.us ?? 0) > (at.up ?? 0),
  };
}

/**
 * Run AFTER the tool response has gone back (inside next/server `after`).
 * `respondedAt` is the moment the results were handed to Vapi.
 */
export async function guardToolSilence(args: {
  callId: string;
  controlUrl: string;
  respondedAt: number;
  results: { name: string; result: string }[];
}): Promise<void> {
  const { callId, controlUrl, respondedAt, results } = args;
  if (!results.length || !getSupabase()) return;
  try {
    await sleep(FIRST_CHECK_MS);
    let state = await lineState(callId, respondedAt);
    if (state.alive) return;
    if (state.userTalking) {
      // They are talking, so Vapi is about to take a turn anyway. Give it one more window.
      await sleep(SECOND_CHECK_MS);
      state = await lineState(callId, respondedAt);
      if (state.alive || state.userTalking) return;
    }
    const body = results
      .map((r) => `${r.name} returned: ${r.result.slice(0, RESULT_CHARS)}`)
      .join('\n\n');
    const res = await fetch(controlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            `The tool result below came back and you have not answered it yet. The caller is waiting in silence. ` +
            `Respond to the caller right now, using it, as if no time had passed. Do not apologize for a delay and do not call the same tool again.\n\n${body}`,
        },
        triggerResponseEnabled: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
    console.info(`dead-air: nudged ${callId} after ${results.map((r) => r.name).join(',')} (HTTP ${res.status})`);
  } catch (err) {
    console.error('dead-air: guard failed', err);
  }
}

/** Drop this call's stamps, and any left behind by calls that never reported. */
export async function clearSpeech(callId: string | null): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  try {
    if (callId) await db.from('app_state').delete().like('key', `livecall:${callId}:%`);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await db.from('app_state').delete().like('key', 'livecall:%').lt('updated_at', dayAgo);
  } catch (err) {
    console.error('dead-air: cleanup failed', err);
  }
}
