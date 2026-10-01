/**
 * THE REFILL. A client on Daily Posting should never have to feed the
 * queue to keep their feeds alive. When any of the next three days has
 * nothing on it, the evening plan fills that day from the project
 * pages on their own website: the story they approved for the page, its
 * cover photograph, and a link back to it. Their words, never invented ones;
 * the caption edit still writes each platform's version.
 *
 * Pages rotate least recently posted first, so a ten-page portfolio goes
 * round once every ten days before any page is said twice. Only open days
 * are filled, never more, so a post the client types still lands within
 * three days and the calendar never runs further ahead than that.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { projectForEmail } from '@/lib/client-leads';
import { emptyDaysAhead } from './planner';
import type { SettingsRow } from './types';

const KEEP = 3;
const REFILL_BY = 'website';

export async function refillFromSite(sb: SupabaseClient, s: SettingsRow): Promise<number> {
  if (!s.active) return 0;
  const project = projectForEmail(s.client_email);
  const pages = (project?.projects ?? []).filter((p) => p.story && p.image);
  if (!project || !pages.length) return 0;

  const { count } = await sb
    .from('posting_materials')
    .select('id', { count: 'exact', head: true })
    .eq('client_email', s.client_email)
    .eq('kind', 'post')
    .eq('status', 'fresh');
  const need = (await emptyDaysAhead(sb, s, KEEP)) - (count ?? 0);
  if (need <= 0) return 0;

  const linkFor = (slug: string) => `${project.publicUrl}/projects/${slug}`;
  const { data: said } = await sb
    .from('posting_materials')
    .select('link, status, last_used_on, created_at')
    .eq('client_email', s.client_email)
    .eq('kind', 'post')
    .in('link', pages.map((p) => linkFor(p.slug)));

  // The last time each page was said or queued. A page never posted sorts
  // first; a page already waiting in the queue is not added twice.
  const last = new Map<string, string>();
  const waiting = new Set<string>();
  for (const r of said ?? []) {
    const link = String(r.link);
    if (r.status === 'fresh') waiting.add(link);
    const at = String(r.last_used_on ?? r.created_at ?? '');
    if (at > (last.get(link) ?? '')) last.set(link, at);
  }
  const pick = pages
    .filter((p) => !waiting.has(linkFor(p.slug)))
    .sort((a, b) => (last.get(linkFor(a.slug)) ?? '').localeCompare(last.get(linkFor(b.slug)) ?? ''))
    .slice(0, need);
  if (!pick.length) return 0;

  const rows = pick.map((p) => ({
    client_email: s.client_email,
    kind: 'post',
    text: p.story,
    url: p.image,
    platforms: null,
    link: linkFor(p.slug),
    wants_graphic: false,
    graphic_brief: null,
    note: `From the website: ${p.title}`,
    uploaded_by: REFILL_BY,
    status: 'fresh',
  }));
  const { error } = await sb.from('posting_materials').insert(rows);
  return error ? 0 : rows.length;
}
