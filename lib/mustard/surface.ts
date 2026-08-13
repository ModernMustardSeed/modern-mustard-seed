/**
 * THE DEMO SURFACE.
 *
 * A surface is "whose AI answers, under whose name, with whose consent
 * language, at whose limits". MMS is surface one and the agent is Mr. Mustard.
 * A Client Factory tenant later gets their own surface with their own agent and
 * their own branding, and nothing in the request pipeline has to change to
 * allow it.
 *
 * Deliberately NOT overgeneralized: there is one surface today, it is read by
 * slug, and everything that varies per tenant is already a column rather than a
 * constant. That is the whole of the abstraction, and it is enough.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { CURRENT_CONSENT, consentVersion } from '@/lib/acq/consent';

export const DEFAULT_SURFACE = 'mms';

export type MustardSurface = {
  id: string;
  slug: string;
  name: string;
  vapi_assistant_id: string | null;
  vapi_phone_number_id: string | null;
  seller_name: string;
  headline: string;
  cta_label: string;
  consent_version: string;
  cooldown_minutes: number;
  max_per_phone_per_day: number;
  max_per_ip_per_hour: number;
  max_per_ip_per_day: number;
  active: boolean;
  settings: Record<string, unknown>;
};

/** The posture used when the table cannot be read: MMS defaults, tight limits. */
const FALLBACK: MustardSurface = {
  id: '',
  slug: DEFAULT_SURFACE,
  name: 'Modern Mustard Seed · Mr. Mustard',
  vapi_assistant_id: null,
  vapi_phone_number_id: null,
  seller_name: 'Modern Mustard Seed',
  headline: 'Want my AI receptionist to call you?',
  cta_label: 'CALL ME NOW',
  consent_version: CURRENT_CONSENT.id,
  cooldown_minutes: 20,
  max_per_phone_per_day: 3,
  max_per_ip_per_hour: 5,
  max_per_ip_per_day: 20,
  active: true,
  settings: {},
};

export async function getSurface(slug = DEFAULT_SURFACE, db?: SupabaseClient | null): Promise<MustardSurface> {
  const client = db ?? getSupabase();
  if (!client) return FALLBACK;
  const { data } = await client.from('mustard_surfaces').select('*').eq('slug', slug).maybeSingle();
  if (!data) return FALLBACK;
  const surface = data as MustardSurface;
  // A surface pointing at a consent version that no longer exists in code must
  // not silently fall back to "no consent text". It falls forward to current.
  if (!consentVersion(surface.consent_version)) surface.consent_version = CURRENT_CONSENT.id;
  return surface;
}

/* ─────────────────────────── source attribution ─────────────────────────── */

/**
 * The entry points we expect. An unknown source is kept verbatim rather than
 * dropped, because the whole point is that a new channel can be tried by
 * inventing a URL and the funnel picks it up with no deploy.
 */
export const KNOWN_SOURCES = [
  'homepage', 'human-call', 'cold-email', 'facebook-group', 'facebook-post', 'facebook-dm',
  'linkedin', 'linkedin-dm', 'partner', 'qr', 'paid-facebook', 'paid-google', 'client-factory', 'direct',
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  homepage: 'Homepage',
  'human-call': 'Sarah on the phone',
  'cold-email': 'Cold email',
  'facebook-group': 'Facebook group',
  'facebook-post': 'Facebook post',
  'facebook-dm': 'Facebook DM',
  linkedin: 'LinkedIn',
  'linkedin-dm': 'LinkedIn DM',
  partner: 'Partner referral',
  qr: 'QR code',
  'paid-facebook': 'Paid, Facebook',
  'paid-google': 'Paid, Google',
  'client-factory': 'Client Factory campaign',
  direct: 'Direct',
};

export function labelSource(source: string | null | undefined): string {
  const s = (source ?? 'direct').toLowerCase();
  return SOURCE_LABELS[s] ?? s.replace(/[-_]/g, ' ');
}

export type Attribution = {
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_url: string | null;
};

const clean = (v: string | null | undefined, max = 200): string | null => {
  const s = String(v ?? '').trim().slice(0, max);
  return s || null;
};

/** Read attribution off a URL and the request headers. Never invents a source. */
export function readAttribution(url: URL, headers: Headers): Attribution {
  const q = url.searchParams;
  const source = clean(q.get('source') ?? q.get('utm_source') ?? q.get('ref'), 60) ?? 'direct';
  return {
    source: source.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(0, 60),
    utm_source: clean(q.get('utm_source'), 120),
    utm_medium: clean(q.get('utm_medium'), 120),
    utm_campaign: clean(q.get('utm_campaign'), 160),
    utm_content: clean(q.get('utm_content'), 160),
    utm_term: clean(q.get('utm_term'), 160),
    referrer: clean(headers.get('referer'), 400),
    landing_url: clean(url.toString(), 500),
  };
}
