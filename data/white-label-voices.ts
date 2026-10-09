/**
 * The voices a white label client can choose for its receptionist, from its
 * own front desk. Each one is an ElevenLabs voice the org's Vapi credential can
 * reach (Vapi answers 400 "Couldn't Find 11labs Voice" for any other), with a
 * short sample of the receptionist's own lines in public/white-label/voices/.
 *
 * The desk shows the feel, never the vendor or the voice actor's name: the
 * office is choosing how its receptionist sounds, not shopping a catalog.
 *
 * To add one: confirm it in Vapi first (POST an assistant with the voiceId and
 * look for 201), render a sample of the same two lines, add the entry.
 */

export type WlVoice = {
  key: string;
  /** What the office sees. */
  feel: string;
  line: string;
  /** ElevenLabs voice id. */
  voiceId: string;
  sample: string;
};

export const WL_VOICES: WlVoice[] = [
  {
    key: 'polished',
    feel: 'Warm and polished',
    line: 'Calm, professional, unhurried. The classic front desk.',
    voiceId: 'XrExE9yKIg1WjnnlVkGX',
    sample: '/white-label/voices/matilda.mp3',
  },
  {
    key: 'natural',
    feel: 'Natural and down to earth',
    line: 'Relaxed and conversational, like the neighbor who runs the office.',
    voiceId: 'AGYozmgYT0SJVnLKg7iN',
    sample: '/white-label/voices/karen.mp3',
  },
  {
    key: 'bright',
    feel: 'Bright and upbeat',
    line: 'Younger and lively, with a smile in every line.',
    voiceId: 'cgSgspJ2msm6clMCkdW9',
    sample: '/white-label/voices/jessica.mp3',
  },
];

export const wlVoiceByKey = (key: string) => WL_VOICES.find((v) => v.key === key) ?? null;
export const wlVoiceById = (voiceId: string | null | undefined) => WL_VOICES.find((v) => v.voiceId === voiceId) ?? null;
