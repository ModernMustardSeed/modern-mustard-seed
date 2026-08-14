/**
 * THE MASTER SWITCH.
 *
 * One row, read before anything leaves the building. `master_paused` stops
 * outbound email, scheduled follow-ups and new Mr. Mustard calls WITHOUT
 * touching queue state, so resuming picks up exactly where it stopped rather
 * than re-sending or dropping work.
 *
 * It ships paused. Nothing this engine can do to a stranger happens until Sarah
 * turns it on deliberately.
 */

import { getSupabase } from '@/lib/supabase';
import type { AcqSettings, AcqCampaign, AcqVariant } from '@/lib/acq/types';
import { CAMPAIGN_SLUG } from '@/lib/acq/types';

const FALLBACK: AcqSettings = {
  master_paused: true,
  sourcing_enabled: false,
  enrichment_enabled: false,
  email_enabled: false,
  calls_enabled: false,
  followups_enabled: false,
  daily_sourcing_enabled: false,
  daily_sourcing_target: 100,
  daily_sourcing_split: { hvac: 40, plumbing: 30, roofing: 30 },
  total_campaign_max: 25000,
  min_lead_score: 40,
  paused_reason: 'Acquisition settings are unreadable, so everything is held.',
  updated_at: new Date(0).toISOString(),
  // The governor's fallback is the most restrictive posture there is: paused,
  // restricted, and an allowance of zero. An unreadable settings row must never
  // read as permission.
  global_rolling_24h_ceiling: 4500,
  sender_state: 'restricted',
  sender_state_reason: 'Settings unreadable.',
  sender_state_at: new Date(0).toISOString(),
  adaptive_daily_allowance: 0,
  last_ramp_at: null,
  max_bounce_rate_pct: 4,
  max_complaint_rate_pct: 0.1,
  min_days_between_emails: 2,
  allowed_email_tiers: [],
  target_ready_inventory: 25000,
  hunter_min_lead_score: 70,
  hunter_daily_credit_cap: 0,
};

/** Fails CLOSED. An unreadable settings row must never read as "everything on". */
export async function getAcqSettings(): Promise<AcqSettings> {
  const db = getSupabase();
  if (!db) return FALLBACK;
  const { data, error } = await db.from('acq_settings').select('*').eq('id', true).maybeSingle();
  if (error || !data) return FALLBACK;
  return data as AcqSettings;
}

export async function updateAcqSettings(patch: Partial<AcqSettings>): Promise<AcqSettings> {
  const db = getSupabase();
  if (!db) throw new Error('Database is not configured.');
  const { data, error } = await db
    .from('acq_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', true)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as AcqSettings;
}

/** One helper every outbound action calls first. */
export type GateName = 'email' | 'calls' | 'followups' | 'sourcing' | 'enrichment';

export type Gate = { allowed: true } | { allowed: false; reason: string };

export function gate(settings: AcqSettings, name: GateName): Gate {
  if (settings.master_paused) {
    return { allowed: false, reason: settings.paused_reason || 'The acquisition engine is paused.' };
  }
  const on: Record<GateName, boolean> = {
    email: settings.email_enabled,
    calls: settings.calls_enabled,
    followups: settings.followups_enabled,
    sourcing: settings.sourcing_enabled,
    enrichment: settings.enrichment_enabled,
  };
  if (!on[name]) return { allowed: false, reason: `${name} is switched off in Acquisition settings.` };
  return { allowed: true };
}

/* ─────────────────────────── the campaign itself ────────────────────────── */

export async function getCampaign(slug = CAMPAIGN_SLUG): Promise<AcqCampaign | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.from('acq_campaigns').select('*').eq('slug', slug).maybeSingle();
  return (data as AcqCampaign) ?? null;
}

export async function getVariants(campaignId: string): Promise<AcqVariant[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await db
    .from('acq_variants')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('active', true)
    .order('step')
    .order('key');
  return (data ?? []) as AcqVariant[];
}

/**
 * Pick a variant for a step. Deterministic per lead: the same prospect always
 * lands in the same test cell, so a retried job cannot silently re-roll them
 * into a different arm and corrupt the measurement.
 */
export function pickVariant(variants: AcqVariant[], step: number, leadId: string): AcqVariant | null {
  const pool = variants.filter((v) => v.step === step && v.active);
  if (!pool.length) return null;
  const expanded = pool.flatMap((v) => Array.from({ length: Math.max(1, v.weight) }, () => v));
  let h = 0;
  const seed = `${leadId}:${step}`;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return expanded[h % expanded.length];
}
