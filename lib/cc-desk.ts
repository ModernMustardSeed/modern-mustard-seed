import type { SupabaseClient } from '@supabase/supabase-js';
import { getCcSession, getCcWho, normalizeEmail } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { accountForSession, type CcAccount } from '@/lib/cc-access';
import { EVENT_COLUMNS, type LeadEvent, type LeadEventKind, type Person } from '@/lib/cc-lead-log';

export type { Person };

/**
 * THE DESK. One account, several people. The session says which business;
 * this says which person, so a note reads "Shan, Tuesday" and a lead can be
 * held by a name instead of by nobody.
 *
 * A person is known two ways: the address their sign-in code went to, or the
 * name they picked on a shared screen. When neither is there (a session from
 * before people existed, or Sarah looking as the client) the mark is signed
 * with a plain, true label instead of a guessed person.
 */

export type Author = { key: string | null; name: string; email: string };

export type Desk = {
  sb: SupabaseClient;
  account: CcAccount;
  preview: boolean;
  /** Everyone named on the project, in the order the project lists them. */
  people: Person[];
  /** The named person at the desk, or null when nobody has said. */
  who: Person | null;
  /** What a mark made right now is signed with. */
  author: Author;
};

export function peopleOf(account: CcAccount): Person[] {
  return Object.entries(account.project.people ?? {}).map(([key, p]) => ({ key, name: p.name }));
}

export type DeskResult = { ok: true; desk: Desk } | { ok: false; status: 401 | 403 | 500; error: string };

export async function getDesk(): Promise<DeskResult> {
  const session = await getCcSession();
  if (!session) return { ok: false, status: 401, error: 'Unauthorized' };
  const sb = getSupabase();
  if (!sb) return { ok: false, status: 500, error: 'Database not configured' };
  const account = await accountForSession(sb, session.email, session.preview);
  if (!account) return { ok: false, status: 403, error: 'No Command Center on this account.' };

  const people = peopleOf(account);
  const whoEmail = await getCcWho();
  const entry = whoEmail ? Object.entries(account.project.people ?? {}).find(([, p]) => normalizeEmail(p.email) === whoEmail) : undefined;
  const who = entry ? { key: entry[0], name: entry[1].name } : null;
  const author: Author = who
    ? { key: who.key, name: who.name, email: whoEmail as string }
    : session.preview
      ? { key: null, name: 'Sarah at Modern Mustard Seed', email: account.clientEmail }
      : { key: null, name: account.project.business, email: account.clientEmail };

  return { ok: true, desk: { sb, account, preview: Boolean(session.preview), people, who, author } };
}

/* ── the lead log ─────────────────────────────────────────── */

export async function logLeadEvent(
  sb: SupabaseClient,
  clientEmail: string,
  leadId: string,
  author: Pick<Author, 'key' | 'name'>,
  event: { kind: LeadEventKind; body?: string | null; to?: Person | null },
): Promise<LeadEvent | null> {
  const body = (event.body ?? '').trim().slice(0, 2000) || null;
  const { data } = await sb
    .from('client_lead_events')
    .insert({
      client_email: clientEmail,
      lead_id: leadId,
      kind: event.kind,
      body,
      to_key: event.to?.key ?? null,
      to_name: event.to?.name ?? null,
      author_key: author.key,
      author_name: author.name,
    })
    .select(EVENT_COLUMNS)
    .maybeSingle();
  return (data as LeadEvent | null) ?? null;
}
