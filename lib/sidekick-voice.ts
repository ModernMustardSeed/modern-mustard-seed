/**
 * The receptionist voice picker: female or male, one source of truth.
 *
 * Pure constants and helpers, no server imports, so both the server forge
 * (lib/sidekick.ts, the outbound-call path) and the browser call widgets can
 * import it. The chosen voice rides as a Vapi `voice` override on the call, so
 * the same base assistant answers in either voice with no second assistant to
 * provision.
 *
 * Voice IDs are Vapi-NATIVE (provider "vapi"), validated by LIVE create-probe
 * on 2026-07-19. "Sid" is the assistant's built-in default (male, American,
 * 30s). "Clara" (New V2: female, American, 30s, warm/professional) is the
 * female front-desk voice, the symmetric counterpart to Sid.
 *
 * CAUTION: Vapi's voiceId enum still LISTS retired voices, and retired ones
 * are rejected at config time ("legacy voice set that is being phased out").
 * Paige/Hana/Lily/Kylie/Neha are retired; do not use them. Before swapping a
 * voice here, prove it with a transient POST /assistant carrying the voiceId
 * (201 = usable, then delete it). Active alternates if Clara ever reads wrong
 * on a real call: Savannah (Southern), Emma (warm, conversational), Layla.
 */

export type VoiceGender = 'male' | 'female';

export type VapiVoice = { provider: 'vapi'; voiceId: string };

export const SIDEKICK_VOICES: Record<VoiceGender, VapiVoice> = {
  male: { provider: 'vapi', voiceId: 'Sid' },
  female: { provider: 'vapi', voiceId: 'Clara' },
};

/** The default matches the base assistant so nothing changes unless a voice is picked. */
export const DEFAULT_VOICE_GENDER: VoiceGender = 'male';

/** Normalize any input to a valid gender, defaulting to the assistant's built-in voice. */
export function toVoiceGender(g?: string | null): VoiceGender {
  return g === 'female' ? 'female' : 'male';
}

/** The Vapi voice override for a chosen gender. */
export function sidekickVoice(g?: string | null): VapiVoice {
  return SIDEKICK_VOICES[toVoiceGender(g)];
}

/** Recover the gender from a voiceId so a UI can seed its toggle from a forged call. */
export function genderFromVoiceId(voiceId?: string | null): VoiceGender {
  return voiceId === SIDEKICK_VOICES.female.voiceId ? 'female' : 'male';
}
