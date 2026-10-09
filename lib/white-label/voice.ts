import { wlVoiceById, wlVoiceByKey, type WlVoice } from '@/data/white-label-voices';

const VAPI = 'https://api.vapi.ai';

function key(): string | null {
  return (process.env.VAPI_API_KEY || process.env.VAPI_PRIVATE_KEY || '').trim() || null;
}

/** The receptionist's current voice, if it is one of the choices. Null when Vapi cannot be read. */
export async function currentVoice(assistantId: string): Promise<WlVoice | null> {
  const k = key();
  if (!k) return null;
  const res = await fetch(`${VAPI}/assistant/${assistantId}`, { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return null;
  const a = (await res.json()) as { voice?: { voiceId?: string } };
  return wlVoiceById(a.voice?.voiceId);
}

/**
 * Switch the receptionist to another voice from the list. Only the voice id
 * changes: model, stability, chunking and the number-reading rules ride along
 * from the live config, because Vapi replaces the whole voice object on PATCH.
 */
export async function setVoice(assistantId: string, voiceKey: string): Promise<WlVoice> {
  const choice = wlVoiceByKey(voiceKey);
  if (!choice) throw new Error('Unknown voice');
  const k = key();
  if (!k) throw new Error('Voice switching is not configured');
  const got = await fetch(`${VAPI}/assistant/${assistantId}`, { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
  if (!got.ok) throw new Error('Could not read the receptionist');
  const a = (await got.json()) as { voice?: Record<string, unknown> };
  if (!a.voice || a.voice.provider !== '11labs') throw new Error('This receptionist does not use a switchable voice');
  const res = await fetch(`${VAPI}/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice: { ...a.voice, voiceId: choice.voiceId } }),
  });
  if (!res.ok) throw new Error('The voice did not switch');
  return choice;
}
