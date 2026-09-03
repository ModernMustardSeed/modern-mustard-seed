import { getSupabase } from '@/lib/supabase';

/**
 * A PARTNER'S FIELD GUIDE.
 *
 * The where-to-go, who-to-talk-to, what-to-say document for one partner's
 * territory: walk-in routes, the networking circuit, dated events with a vendor
 * floor, and the ninety-second script. Written by Sarah (or a session on her
 * behalf), read by the partner at /partners/hq/guide and by Sarah under the
 * partner's row on /admin/partners.
 *
 * Stored in app_state under `partner_guide:<CODE>` so a new guide, or a
 * rewritten one, is a data write and never a deploy. One guide per affiliate
 * code. No migration: app_state already exists and takes any JSON value.
 */

export type GuideItem = {
  title: string;
  detail: string;
  /** A date or cadence, spoken plainly: "Oct 10 and 11", "Every Monday, 6 to 8 pm". */
  when?: string;
  /** A venue or area. */
  where?: string;
  url?: string;
};

export type GuideSection = {
  heading: string;
  blurb?: string;
  items: GuideItem[];
};

export type PartnerGuide = {
  code: string;
  title: string;
  /** Who this guide is written for, e.g. "Easton, Florida Panhandle". */
  subtitle?: string;
  intro: string;
  sections: GuideSection[];
  updatedAt: string;
};

const keyFor = (code: string) => `partner_guide:${code.trim().toUpperCase()}`;

export async function getPartnerGuide(code: string | null | undefined): Promise<PartnerGuide | null> {
  const sb = getSupabase();
  if (!sb || !code) return null;
  try {
    const { data } = await sb.from('app_state').select('value').eq('key', keyFor(code)).maybeSingle();
    const v = data?.value as PartnerGuide | null | undefined;
    return v && Array.isArray(v.sections) ? v : null;
  } catch {
    return null;
  }
}

export async function setPartnerGuide(guide: PartnerGuide): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const value: PartnerGuide = { ...guide, code: guide.code.trim().toUpperCase(), updatedAt: new Date().toISOString() };
  const { error } = await sb.from('app_state').upsert({ key: keyFor(value.code), value, updated_at: value.updatedAt });
  return !error;
}
