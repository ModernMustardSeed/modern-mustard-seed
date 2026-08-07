/**
 * Persistence for THE HUNDREDFOLD ROADMAP.
 *
 * Every generated roadmap is written before an email is ever asked for, so the
 * admin desk sees real demand (including the visitors who never fill in the save
 * form) and so every roadmap has a shareable permalink the moment it exists.
 *
 * Best-effort throughout: a missing or unhappy Supabase must never take the
 * public tool down. Callers get null and show the report without a share link.
 */

import { getSupabase } from './supabase';
import type { RoadmapContext, RoadmapReport } from './roadmap-shape';

export type RoadmapRow = {
  id: string;
  slug: string;
  url: string;
  host: string;
  business_name: string | null;
  industry: string | null;
  context: RoadmapContext;
  report: RoadmapReport;
  scale_score: number | null;
  stage: string | null;
  headline: string | null;
  constraint_type: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  source: string;
  featured: boolean;
  views: number;
  created_at: string;
  updated_at: string;
};

/** The list view never needs the whole report, and these rows get long. */
export type RoadmapSummary = Omit<RoadmapRow, 'report' | 'context'>;

const SUMMARY_COLUMNS =
  'id, slug, url, host, business_name, industry, scale_score, stage, headline, constraint_type, email, name, phone, source, featured, views, created_at, updated_at';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.(com|net|org|io|co|us|biz|info|shop|app|dev)$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'roadmap';
}

/** Short, readable, and collision-proof enough at this volume. */
function suffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export async function saveRoadmap(input: {
  url: string;
  host: string;
  report: RoadmapReport;
  context?: RoadmapContext;
  source?: 'public' | 'admin' | 'seed';
  slug?: string;
  featured?: boolean;
  ipHash?: string | null;
}): Promise<{ id: string; slug: string } | null> {
  const client = getSupabase();
  if (!client) {
    console.warn('roadmap-store: Supabase not configured, roadmap not saved');
    return null;
  }

  const base = input.slug ? slugify(input.slug) : slugify(input.host);
  const row = {
    url: input.url,
    host: input.host,
    business_name: input.report.business_name ?? null,
    industry: input.report.one_liner ?? null,
    context: input.context ?? {},
    report: input.report,
    scale_score: input.report.scale_score ?? null,
    stage: input.report.stage ?? null,
    headline: input.report.headline ?? null,
    constraint_type: input.report.constraint?.type ?? null,
    source: input.source ?? 'public',
    featured: input.featured ?? false,
    ip_hash: input.ipHash ?? null,
  };

  // An explicit slug (the seeded examples) is meant to be stable, so it upserts
  // in place. Generated slugs retry with a fresh suffix on collision.
  if (input.slug) {
    const { data, error } = await client
      .from('scaling_roadmaps')
      .upsert({ ...row, slug: base, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
      .select('id, slug')
      .single();
    if (error) {
      console.error('roadmap-store: upsert failed', error);
      return null;
    }
    return data as { id: string; slug: string };
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = attempt === 0 ? `${base}-${suffix()}` : `${base}-${suffix()}${attempt}`;
    const { data, error } = await client
      .from('scaling_roadmaps')
      .insert({ ...row, slug })
      .select('id, slug')
      .single();
    if (!error) return data as { id: string; slug: string };
    // 23505 is a unique violation: try another suffix. Anything else is real.
    if (error.code !== '23505') {
      console.error('roadmap-store: insert failed', error);
      return null;
    }
  }
  console.error('roadmap-store: could not find a free slug after 4 tries');
  return null;
}

export async function getRoadmapBySlug(slug: string): Promise<RoadmapRow | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from('scaling_roadmaps')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error('roadmap-store: read failed', error);
    return null;
  }
  return (data as RoadmapRow) ?? null;
}

export async function getRoadmapById(id: string): Promise<RoadmapRow | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.from('scaling_roadmaps').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('roadmap-store: read failed', error);
    return null;
  }
  return (data as RoadmapRow) ?? null;
}

/** Fire and forget. A failed view count must never break a page render. */
export async function bumpViews(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  try {
    const { data } = await client.from('scaling_roadmaps').select('views').eq('id', id).maybeSingle();
    await client
      .from('scaling_roadmaps')
      .update({ views: ((data?.views as number) ?? 0) + 1 })
      .eq('id', id);
  } catch (err) {
    console.error('roadmap-store: view bump failed', err);
  }
}

export async function listRoadmaps(opts: { limit?: number; search?: string } = {}): Promise<RoadmapSummary[]> {
  const client = getSupabase();
  if (!client) return [];
  let q = client
    .from('scaling_roadmaps')
    .select(SUMMARY_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.search?.trim()) {
    const s = opts.search.trim();
    q = q.or(`host.ilike.%${s}%,business_name.ilike.%${s}%,email.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) {
    console.error('roadmap-store: list failed', error);
    return [];
  }
  return (data as RoadmapSummary[]) ?? [];
}

export async function listFeatured(limit = 3): Promise<RoadmapSummary[]> {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('scaling_roadmaps')
    .select(SUMMARY_COLUMNS)
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as RoadmapSummary[]) ?? [];
}

/** Attach the lead once the visitor asks for the emailed copy. */
export async function attachContact(
  slug: string,
  contact: { email: string; name?: string | null; phone?: string | null }
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client
    .from('scaling_roadmaps')
    .update({
      email: contact.email,
      name: contact.name || null,
      phone: contact.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug);
  if (error) {
    console.error('roadmap-store: contact attach failed', error);
    return false;
  }
  return true;
}

export async function setFeatured(id: string, featured: boolean): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client
    .from('scaling_roadmaps')
    .update({ featured, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function deleteRoadmap(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('scaling_roadmaps').delete().eq('id', id);
  return !error;
}
