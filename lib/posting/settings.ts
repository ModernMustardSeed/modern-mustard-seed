import type { SupabaseClient } from '@supabase/supabase-js';
import type { SettingsRow, Platform } from './types';
import { PLATFORMS } from './types';

export async function getSettings(sb: SupabaseClient, clientEmail: string): Promise<SettingsRow | null> {
  const { data } = await sb.from('posting_settings').select('*').eq('client_email', clientEmail.toLowerCase().trim()).maybeSingle();
  if (!data) return null;
  return normalize(data as Record<string, unknown>);
}

export async function listSettings(sb: SupabaseClient): Promise<SettingsRow[]> {
  const { data } = await sb.from('posting_settings').select('*').order('created_at', { ascending: true });
  return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
}

function normalize(r: Record<string, unknown>): SettingsRow {
  const platforms = (Array.isArray(r.platforms) ? r.platforms : []).filter((p): p is Platform => (PLATFORMS as readonly string[]).includes(String(p)));
  const hoursRaw = (r.platform_hours && typeof r.platform_hours === 'object' ? r.platform_hours : {}) as Record<string, unknown>;
  const platform_hours: Partial<Record<Platform, number>> = {};
  for (const p of PLATFORMS) if (typeof hoursRaw[p] === 'number') platform_hours[p] = hoursRaw[p] as number;
  return {
    client_email: String(r.client_email),
    business_name: String(r.business_name ?? ''),
    site_url: (r.site_url as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    towns: (r.towns as string[] | null) ?? [],
    services: (r.services as string[] | null) ?? [],
    facts: (r.facts as string | null) ?? null,
    tone: (r.tone as string | null) ?? null,
    hard_nos: (r.hard_nos as string | null) ?? null,
    platforms: platforms.length ? platforms : [...PLATFORMS],
    post_hour_mt: Number(r.post_hour_mt ?? 9),
    platform_hours,
    auto_publish: r.auto_publish !== false,
    approve_first: r.approve_first === true,
    visible: r.visible === true,
    weekly_summary: r.weekly_summary !== false,
    notify_emails: (r.notify_emails as string[] | null) ?? [],
    active: r.active !== false,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  };
}

/** The fields a person may change from either desk. Everything else is derived. */
export const EDITABLE_SETTINGS = [
  'business_name',
  'site_url',
  'phone',
  'towns',
  'services',
  'facts',
  'tone',
  'hard_nos',
  'platforms',
  'post_hour_mt',
  'platform_hours',
  'auto_publish',
  'approve_first',
  'visible',
  'weekly_summary',
  'notify_emails',
  'active',
] as const;

export async function saveSettings(sb: SupabaseClient, clientEmail: string, patch: Partial<SettingsRow>): Promise<{ ok: true } | { ok: false; error: string }> {
  const row: Record<string, unknown> = { client_email: clientEmail.toLowerCase().trim(), updated_at: new Date().toISOString() };
  for (const k of EDITABLE_SETTINGS) if (k in patch) row[k] = patch[k];
  if (typeof row.post_hour_mt === 'number' && (row.post_hour_mt < 0 || row.post_hour_mt > 23)) return { ok: false, error: 'Hour must be 0 to 23.' };
  if (Array.isArray(row.platforms)) row.platforms = (row.platforms as string[]).filter((p) => (PLATFORMS as readonly string[]).includes(p));
  if (row.platform_hours && typeof row.platform_hours === 'object') {
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(row.platform_hours as Record<string, unknown>)) {
      const n = Number(v);
      if ((PLATFORMS as readonly string[]).includes(k) && Number.isInteger(n) && n >= 0 && n <= 23) clean[k] = n;
    }
    row.platform_hours = clean;
  }
  if (!row.business_name && !('business_name' in patch)) delete row.business_name;
  const { error } = await sb.from('posting_settings').upsert(row, { onConflict: 'client_email' });
  return error ? { ok: false, error: error.message } : { ok: true };
}
