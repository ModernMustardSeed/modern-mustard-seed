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
    auto_publish: r.auto_publish !== false,
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
  'auto_publish',
  'weekly_summary',
  'notify_emails',
  'active',
] as const;

export async function saveSettings(sb: SupabaseClient, clientEmail: string, patch: Partial<SettingsRow>): Promise<{ ok: true } | { ok: false; error: string }> {
  const row: Record<string, unknown> = { client_email: clientEmail.toLowerCase().trim(), updated_at: new Date().toISOString() };
  for (const k of EDITABLE_SETTINGS) if (k in patch) row[k] = patch[k];
  if (typeof row.post_hour_mt === 'number' && (row.post_hour_mt < 0 || row.post_hour_mt > 23)) return { ok: false, error: 'Hour must be 0 to 23.' };
  if (Array.isArray(row.platforms)) row.platforms = (row.platforms as string[]).filter((p) => (PLATFORMS as readonly string[]).includes(p));
  if (!row.business_name && !('business_name' in patch)) delete row.business_name;
  const { error } = await sb.from('posting_settings').upsert(row, { onConflict: 'client_email' });
  return error ? { ok: false, error: error.message } : { ok: true };
}
