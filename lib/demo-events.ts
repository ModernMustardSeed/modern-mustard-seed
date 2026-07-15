/**
 * demo_events (054): the attribution-complete funnel telemetry spine.
 * Every write is fire-and-forget and allowlisted; telemetry must never take
 * down a money path, so callers do not await failures and this module never
 * throws.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const DEMO_EVENTS = [
  'partner_mint',
  'rep_mint',
  'hub_viewed',
  'beat',
  'voice_call',
  'checkout_started',
] as const;

export type DemoEvent = (typeof DEMO_EVENTS)[number];

export async function recordDemoEvent(
  supabase: SupabaseClient,
  args: {
    event: DemoEvent;
    leadId?: string | null;
    hubId?: string | null;
    origin?: string | null;
    affiliateId?: string | null;
    meta?: Record<string, string | number | boolean | null>;
  }
): Promise<void> {
  if (!DEMO_EVENTS.includes(args.event)) return;
  try {
    const { error } = await supabase.from('demo_events').insert({
      event: args.event,
      lead_id: args.leadId ?? null,
      hub_id: args.hubId ?? null,
      origin: args.origin ?? null,
      affiliate_id: args.affiliateId ?? null,
      meta: args.meta ?? null,
    });
    if (error) console.error(`demo_events insert failed (${args.event}):`, error.message);
  } catch (err) {
    console.error(`demo_events insert threw (${args.event})`, err);
  }
}
