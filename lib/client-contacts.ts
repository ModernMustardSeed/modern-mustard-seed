import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * THE CONTACT BOOK. Everyone a client has dealt with, carried over from the
 * provider they left, plus anyone they add by hand. These are people, not
 * website leads: nothing here enters client_leads, the Monday digest, or a
 * CRM, because none of them asked for anything today.
 *
 * Also the old provider's posts, kept as a record the posting engine never
 * reads.
 */
export type Contact = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  tags: string[];
  source: string | null;
  origin: string;
  firstSeen: string | null;
  notes: string | null;
};

export type ArchivePost = {
  id: string;
  origin: string;
  status: 'published' | 'scheduled' | 'failed';
  postedAt: string;
  body: string;
  networks: string[];
  stats: { likes?: number; comments?: number; reached?: number; plays?: number };
  error: string | null;
};

/** Where a contact or post came from, in words a person reads. */
export const ORIGIN_LABEL: Record<string, string> = { 'web-express': 'Web Express', portal: 'Added here' };

type ContactRow = {
  id: string; name: string | null; phone: string | null; email: string | null; company: string | null;
  tags: string[] | null; source: string | null; origin: string; first_seen: string | null; notes: string | null;
};

export async function listContacts(sb: SupabaseClient, clientEmail: string): Promise<Contact[] | null> {
  const { data, error } = await sb
    .from('client_contacts')
    .select('id, name, phone, email, company, tags, source, origin, first_seen, notes')
    .eq('client_email', clientEmail.toLowerCase())
    .order('first_seen', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(5000);
  if (error) return null;
  return ((data ?? []) as ContactRow[]).map((r) => ({
    id: r.id, name: r.name, phone: r.phone, email: r.email, company: r.company, tags: r.tags ?? [],
    source: r.source, origin: r.origin, firstSeen: r.first_seen, notes: r.notes,
  }));
}

export async function listArchivePosts(sb: SupabaseClient, clientEmail: string): Promise<ArchivePost[] | null> {
  const { data, error } = await sb
    .from('client_archive_posts')
    .select('id, origin, status, posted_at, body, networks, stats, error')
    .eq('client_email', clientEmail.toLowerCase())
    .order('posted_at', { ascending: false })
    .limit(500);
  if (error) return null;
  return (data ?? []).map((r) => ({
    id: r.id as string, origin: r.origin as string, status: r.status as ArchivePost['status'], postedAt: r.posted_at as string,
    body: r.body as string, networks: (r.networks as string[] | null) ?? [], stats: (r.stats as ArchivePost['stats']) ?? {}, error: (r.error as string | null) ?? null,
  }));
}

/** Every tag with how many people carry it, most common first. */
export function tagCounts(contacts: Contact[]): Array<{ tag: string; count: number }> {
  const by = new Map<string, number>();
  for (const c of contacts) for (const t of c.tags) by.set(t, (by.get(t) ?? 0) + 1);
  return [...by.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

const cell = (v: string | null | undefined) => {
  const s = v ?? '';
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A spreadsheet any program opens: Excel, Numbers, Google Sheets, a new CRM's import. */
export function contactsCsv(contacts: Contact[]): string {
  const head = ['Name', 'Phone', 'Email', 'Company', 'Tags', 'How they arrived', 'From', 'First seen', 'Notes'];
  const rows = contacts.map((c) => [c.name, c.phone, c.email, c.company, c.tags.join('; '), c.source, ORIGIN_LABEL[c.origin] ?? c.origin, c.firstSeen, c.notes].map(cell).join(','));
  // The byte-order mark makes Excel read the file as UTF-8, so accented names survive.
  return '﻿' + [head.join(','), ...rows].join('\r\n') + '\r\n';
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** One contact added by hand. Needs a name and a way to reach them. */
export async function addContact(
  sb: SupabaseClient,
  clientEmail: string,
  input: { name?: unknown; phone?: unknown; email?: unknown; company?: unknown; tags?: unknown; notes?: unknown },
): Promise<{ ok: true; contact: Contact } | { ok: false; error: string }> {
  const name = clean(input.name, 120);
  const phone = clean(input.phone, 40);
  const email = clean(input.email, 200).toLowerCase();
  if (!name) return { ok: false, error: 'Give them a name.' };
  if (!phone && !email) return { ok: false, error: 'Add a phone number or an email, so there is a way to reach them.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'That email does not look complete.' };
  if (phone && phone.replace(/\D/g, '').length < 7) return { ok: false, error: 'That phone number is too short.' };
  const tags = (Array.isArray(input.tags) ? input.tags : typeof input.tags === 'string' ? input.tags.split(',') : [])
    .map((t) => clean(t, 40))
    .filter(Boolean)
    .slice(0, 8);
  const { data, error } = await sb
    .from('client_contacts')
    .insert({
      client_email: clientEmail.toLowerCase(), name, phone: phone || null, email: email || null,
      company: clean(input.company, 120) || null, tags, notes: clean(input.notes, 2000) || null,
      origin: 'portal', source: 'Added by hand', first_seen: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' }),
    })
    .select('id, name, phone, email, company, tags, source, origin, first_seen, notes')
    .single();
  if (error || !data) return { ok: false, error: 'That did not save. Try once more.' };
  const r = data as ContactRow;
  return { ok: true, contact: { id: r.id, name: r.name, phone: r.phone, email: r.email, company: r.company, tags: r.tags ?? [], source: r.source, origin: r.origin, firstSeen: r.first_seen, notes: r.notes } };
}
