/**
 * The Vapi voice-agent fleet that the brain watchdog guards.
 *
 * Each entry is one live assistant with an intended PRIMARY brain and a stable
 * same-provider FALLBACK. The watchdog (app/api/cron/voice-health) probes each
 * primary model in isolation every ~10 min and, with two-probe hysteresis,
 * fails an assistant over to its fallback when the primary is down and restores
 * the primary when it recovers. See that route for the full state machine.
 *
 * SCOPE: only Anthropic agents are listed. The watchdog health-probes a model
 * via a transient Vapi /chat assistant, and this Vapi org has a working
 * Anthropic credential but NOT an OpenAI one (transient OpenAI /chat just hangs),
 * so OpenAI agents (Pipe Pilot, SF Trucking, CONRAD) cannot be isolation-probed
 * and are intentionally excluded. They also have no live webhook. To cover them
 * later, connect an OpenAI key to the Vapi org, then add entries here with
 * provider 'openai' and an OpenAI fallback (e.g. gpt-4o).
 *
 * To add/remove a monitored agent, edit this array. Nothing else changes.
 */

export type VoiceAgent = {
  /** Vapi assistant id. */
  id: string;
  /** Human label used in the status JSON and alert emails. */
  label: string;
  /** Model provider (only 'anthropic' is probe-able in this org today). */
  provider: 'anthropic';
  /** The intended primary brain. */
  primary: string;
  /** A stable same-provider model to fall over to when the primary faults. */
  fallback: string;
};

export const VOICE_AGENTS: VoiceAgent[] = [
  {
    id: 'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee',
    label: 'Mr. Mustard',
    provider: 'anthropic',
    // Mr. Mustard keeps the documented env override levers from the original
    // single-agent watchdog; the others are config-only.
    primary: process.env.VOICE_PRIMARY_MODEL || 'claude-opus-4-6',
    fallback: process.env.VOICE_FALLBACK_MODEL || 'claude-sonnet-4-6',
  },
  {
    id: 'f87500be-5992-4ffa-ad38-8fd18c078b01',
    label: "Newk's Concierge (Tallahassee)",
    provider: 'anthropic',
    primary: 'claude-haiku-4-5-20251001',
    fallback: 'claude-sonnet-4-6',
  },
  {
    id: '3266ae27-7174-45c9-b53b-42a579efc745',
    label: 'Outbound Olivia',
    provider: 'anthropic',
    primary: 'claude-opus-4-5-20251101',
    fallback: 'claude-sonnet-4-6',
  },
];
