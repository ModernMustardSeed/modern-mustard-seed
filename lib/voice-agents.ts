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
    // single-agent watchdog; the others are config-only. 2026-06-27: primary
    // moved opus-4-6 -> sonnet-4-6 for much lower call latency (opus felt slow).
    // 2026-08-06: primary -> claude-sonnet-5 (newly available in Vapi's Anthropic
    // enum), ~1.6x faster than opus-4-6 AND a newer generation than sonnet-4-6.
    // ⚠️ THIS MUST TRACK THE MODEL IN scripts/setup-vapi-mustard.mjs. The state
    // machine only acts when the LIVE model equals `primary` or `fallback`, so a
    // mismatch does not demote him, it silently stops guarding him: his real
    // brain is never probed and a genuine outage would never trigger failover.
    // 2026-08-06: the Vercel prod overrides VOICE_PRIMARY_MODEL and
    // VOICE_FALLBACK_MODEL were DELETED, so THIS FILE is now the single source
    // of truth for his brain. They were removed for two reasons: they had gone
    // stale at sonnet-4-6 (an invisible env var silently outranking the code is
    // exactly how he got demoted twice), and `vercel env add` cannot write a
    // value non-interactively here (both --value= and stdin land as ""), so they
    // could not be corrected from the CLI at all. An empty string is falsy and
    // would fall through to these defaults anyway. If an emergency lever is ever
    // needed again, set it in the Vercel dashboard by hand, and remember it
    // WINS over this file.
    // Fallback moved haiku-4-5 -> sonnet-4-6: haiku is faster but in the 8/06
    // benchmark it broke persona (narrated its own tool call out loud), which is
    // not acceptable on the flagship sales line even during a brief failover.
    primary: process.env.VOICE_PRIMARY_MODEL || 'claude-sonnet-5',
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
