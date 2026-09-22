import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * NAMED LISTS over the contact book.
 *
 * A list is a name and a set of tags. Anyone carrying any of those tags is in
 * it, counted fresh every time it is read, so there is no membership to
 * maintain and no way for a list to quietly go stale. See migration 140 for
 * why it is not a table of rows.
 *
 * Counts come back two ways on purpose: how many people are in it, and how
 * many of those can actually be emailed. "Send to the realtor list" means
 * something different when 40 of the 62 have no address, and the owner should
 * learn that before they write the message, not after they press send.
 */

export type ClientList = {
  id: string;
  name: string;
  tags: string[];
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  /** Everyone carrying any of the tags. */
  people: number;
  /** Of those, how many have a usable address and have not unsubscribed. */
  reachable: number;
};

type Row = { id: string; name: string; tags: string[] | null; note: string | null; created_by: string | null; created_at: string };
type ContactRow = { tags: string[] | null; email: string | null; unsubscribed_at: string | null };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function cleanTags(v: unknown): string[] {
  const raw = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  return [...new Set(raw.map((t) => clean(t, 40)).filter(Boolean))].slice(0, 20);
}

/** Every list with its two counts, newest first. */
export async function listLists(sb: SupabaseClient, clientEmail: string): Promise<ClientList[]> {
  const email = clientEmail.toLowerCase().trim();
  const [lists, contacts] = await Promise.all([
    sb.from('client_lists').select('id, name, tags, note, created_by, created_at').eq('client_email', email).order('created_at', { ascending: false }),
    sb.from('client_contacts').select('tags, email, unsubscribed_at').eq('client_email', email).limit(5000),
  ]);
  const people = (contacts.data ?? []) as ContactRow[];

  return ((lists.data ?? []) as Row[]).map((r) => {
    const want = (r.tags ?? []).map((t) => t.toLowerCase());
    const inIt = want.length ? people.filter((p) => (p.tags ?? []).some((t) => want.includes(t.toLowerCase()))) : people;
    const seen = new Set<string>();
    let reachable = 0;
    for (const p of inIt) {
      const mail = (p.email ?? '').trim().toLowerCase();
      if (!mail || !EMAIL_RE.test(mail) || p.unsubscribed_at || seen.has(mail)) continue;
      seen.add(mail);
      reachable += 1;
    }
    return { id: r.id, name: r.name, tags: r.tags ?? [], note: r.note, createdBy: r.created_by, createdAt: r.created_at, people: inIt.length, reachable };
  });
}

export async function saveList(
  sb: SupabaseClient,
  clientEmail: string,
  input: { id?: string | null; name: unknown; tags: unknown; note?: unknown; by?: string | null },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = clean(input.name, 60);
  if (name.length < 2) return { ok: false, error: 'Give the list a name you would say out loud.' };
  const tags = cleanTags(input.tags);
  if (!tags.length) return { ok: false, error: 'A list needs at least one tag, so it knows who is in it.' };

  const row = {
    client_email: clientEmail.toLowerCase().trim(),
    name,
    tags,
    note: clean(input.note, 200) || null,
    created_by: input.by ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await sb.from('client_lists').update(row).eq('id', String(input.id)).eq('client_email', row.client_email);
    if (error) return { ok: false, error: 'That did not save.' };
    return { ok: true, id: String(input.id) };
  }

  const { data, error } = await sb.from('client_lists').insert(row).select('id').single();
  // 23505 is the one-name-per-client index doing its job.
  if (error?.code === '23505') return { ok: false, error: `You already have a list called ${name}.` };
  if (error || !data) return { ok: false, error: 'That did not save.' };
  return { ok: true, id: String(data.id) };
}

export async function deleteList(sb: SupabaseClient, clientEmail: string, id: string): Promise<void> {
  // Deleting the name never touches a person: the tags stay on the contacts,
  // so nobody is lost by tidying up a list.
  await sb.from('client_lists').delete().eq('id', id).eq('client_email', clientEmail.toLowerCase().trim());
}

export type Tagged = { changed: number };

/**
 * Add or remove tags across a set of people at once.
 *
 * This is how a list actually gets built: select the eight realtors in the
 * table, tag them Realtor, and the realtor list exists. Tags are a set, so
 * tagging twice is not an error and never duplicates.
 */
export async function tagContacts(
  sb: SupabaseClient,
  clientEmail: string,
  ids: string[],
  add: string[],
  remove: string[],
): Promise<Tagged> {
  const email = clientEmail.toLowerCase().trim();
  const wanted = ids.map((i) => String(i)).filter(Boolean).slice(0, 2000);
  if (!wanted.length || (!add.length && !remove.length)) return { changed: 0 };

  const { data } = await sb.from('client_contacts').select('id, tags').eq('client_email', email).in('id', wanted);
  const rows = (data ?? []) as Array<{ id: string; tags: string[] | null }>;
  const drop = remove.map((t) => t.toLowerCase());

  let changed = 0;
  for (const r of rows) {
    const before = r.tags ?? [];
    const kept = before.filter((t) => !drop.includes(t.toLowerCase()));
    const merged = [...kept];
    for (const t of add) if (!merged.some((x) => x.toLowerCase() === t.toLowerCase())) merged.push(t);
    const next = merged.slice(0, 12);
    if (next.length === before.length && next.every((t, i) => t === before[i])) continue;
    const { error } = await sb.from('client_contacts').update({ tags: next }).eq('id', r.id).eq('client_email', email);
    if (!error) changed += 1;
  }
  return { changed };
}
