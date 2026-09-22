import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * ONE SEARCH THAT KNOWS THE WHOLE BUSINESS, and one card that knows a person.
 *
 * The Command Center grew room by room, and each room learned its own corner:
 * Leads knows who filled in a form, Inbox knows what they wrote, the Board
 * knows what it is worth, Contacts knows their number, Marketing knows what
 * went out. Nothing knew all of it at once, which is the one thing a business
 * built on relationships actually needs.
 *
 * The real moment this is for: the phone rings, the name is half familiar, and
 * somebody has nine seconds before they have to say something. "Fulbright"
 * should produce every fact the business holds about a Fulbright, in order,
 * without a single decision about which room to look in.
 *
 * TWO RULES IN HERE.
 *
 *   Scoped by the signed-in business, always, on every table. A search is the
 *   easiest place in an app to leak another client's row, because it is the
 *   one query nobody writes a filter for by habit.
 *
 *   Matching is plain and predictable: a case-insensitive contains, over the
 *   columns a person would expect to be searched. No ranking cleverness, no
 *   fuzzy guessing. A search that returns a surprise is a search people stop
 *   trusting, and a builder looking up a name at speed cannot afford to wonder
 *   why something is missing.
 */

export type HitKind = 'contact' | 'lead' | 'job' | 'mail' | 'post' | 'request' | 'note';

export type Hit = {
  kind: HitKind;
  id: string;
  title: string;
  sub: string;
  /** What matched, so a person can see why this is here. */
  snippet: string | null;
  at: string | null;
  /** The room this belongs in. */
  room: string;
  /** The identity this hit is about, for the person card. */
  who: { name: string | null; email: string | null; phone: string | null } | null;
};

/** Postgres LIKE wildcards inside a person's own typing are not wildcards. */
const esc = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const digits = (s: string) => s.replace(/\D/g, '');

const when = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** A phone typed any way at all matches a phone stored any way at all. */
function phoneLike(term: string): string | null {
  const d = digits(term);
  return d.length >= 7 ? d.slice(-7) : null;
}

export async function search(sb: SupabaseClient, clientEmail: string, raw: string): Promise<Hit[]> {
  const term = raw.trim();
  if (term.length < 2) return [];
  const email = clientEmail.toLowerCase().trim();
  const like = `%${esc(term)}%`;
  const phone = phoneLike(term);

  const [contacts, leads, jobs, mail, posts, requests, notes] = await Promise.all([
    sb
      .from('client_contacts')
      .select('id, name, company, email, phone, tags, notes, first_seen')
      .eq('client_email', email)
      .or(`name.ilike.${like},company.ilike.${like},email.ilike.${like},notes.ilike.${like}`)
      .limit(12),
    sb
      .from('client_leads')
      .select('id, name, email, phone, town, project_type, message, created_at')
      .eq('client_email', email)
      .or(`name.ilike.${like},email.ilike.${like},message.ilike.${like},town.ilike.${like},project_type.ilike.${like}`)
      .limit(12),
    sb
      .from('client_jobs')
      .select('id, name, contact_name, contact_email, contact_phone, stage, town, site, source, notes, value_cents, updated_at')
      .eq('client_email', email)
      .or(`name.ilike.${like},contact_name.ilike.${like},contact_email.ilike.${like},town.ilike.${like},site.ilike.${like},source.ilike.${like},notes.ilike.${like}`)
      .limit(12),
    sb
      .from('client_mail')
      .select('id, from_addr, from_name, subject, snippet, received_at')
      .eq('client_email', email)
      .or(`subject.ilike.${like},snippet.ilike.${like},from_addr.ilike.${like},from_name.ilike.${like}`)
      .order('received_at', { ascending: false })
      .limit(12),
    sb
      .from('posting_posts')
      .select('id, headline, scheduled_for, status')
      .eq('client_email', email)
      .ilike('headline', like)
      .limit(6),
    sb
      .from('client_requests')
      .select('id, kind, title, body, status, created_at')
      .eq('client_email', email)
      .or(`title.ilike.${like},body.ilike.${like}`)
      .limit(6),
    sb
      .from('client_job_events')
      .select('id, job_id, kind, body, author_name, created_at')
      .eq('client_email', email)
      .ilike('body', like)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const out: Hit[] = [];

  for (const c of (contacts.data ?? []) as Array<Record<string, unknown>>) {
    out.push({
      kind: 'contact',
      id: String(c.id),
      title: (c.name as string) || (c.company as string) || 'No name',
      sub: [c.company, c.phone, c.email].filter(Boolean).join(' · ') || 'In your book',
      snippet: (c.notes as string | null)?.slice(0, 140) ?? null,
      at: when(c.first_seen),
      room: 'contacts',
      who: { name: (c.name as string) ?? null, email: (c.email as string) ?? null, phone: (c.phone as string) ?? null },
    });
  }

  for (const l of (leads.data ?? []) as Array<Record<string, unknown>>) {
    out.push({
      kind: 'lead',
      id: String(l.id),
      title: (l.name as string) || 'Someone',
      sub: [l.town, l.project_type, l.phone].filter(Boolean).join(' · ') || 'Came through the website',
      snippet: (l.message as string | null)?.slice(0, 140) ?? null,
      at: when(l.created_at),
      room: 'leads',
      who: { name: (l.name as string) ?? null, email: (l.email as string) ?? null, phone: (l.phone as string) ?? null },
    });
  }

  for (const j of (jobs.data ?? []) as Array<Record<string, unknown>>) {
    const worth = typeof j.value_cents === 'number' ? `$${Math.round((j.value_cents as number) / 100).toLocaleString('en-US')}` : null;
    out.push({
      kind: 'job',
      id: String(j.id),
      title: String(j.name),
      sub: [j.stage, j.town, worth, j.source].filter(Boolean).join(' · '),
      snippet: (j.notes as string | null)?.slice(0, 140) ?? null,
      at: when(j.updated_at),
      room: 'jobs',
      who: { name: (j.contact_name as string) ?? null, email: (j.contact_email as string) ?? null, phone: (j.contact_phone as string) ?? null },
    });
  }

  for (const m of (mail.data ?? []) as Array<Record<string, unknown>>) {
    out.push({
      kind: 'mail',
      id: String(m.id),
      title: (m.subject as string) || 'No subject',
      sub: [m.from_name, m.from_addr].filter(Boolean).join(' · '),
      snippet: (m.snippet as string | null)?.slice(0, 140) ?? null,
      at: when(m.received_at),
      room: 'inbox',
      who: { name: (m.from_name as string) ?? null, email: (m.from_addr as string) ?? null, phone: null },
    });
  }

  for (const p of (posts.data ?? []) as Array<Record<string, unknown>>) {
    out.push({ kind: 'post', id: String(p.id), title: (p.headline as string) || 'Post', sub: [p.scheduled_for, p.status].filter(Boolean).join(' · '), snippet: null, at: when(p.scheduled_for), room: 'marketing', who: null });
  }

  for (const r of (requests.data ?? []) as Array<Record<string, unknown>>) {
    out.push({ kind: 'request', id: String(r.id), title: (r.title as string) || 'Asked for', sub: [r.kind, r.status].filter(Boolean).join(' · '), snippet: (r.body as string | null)?.slice(0, 140) ?? null, at: when(r.created_at), room: 'website', who: null });
  }

  for (const n of (notes.data ?? []) as Array<Record<string, unknown>>) {
    out.push({ kind: 'note', id: String(n.job_id), title: 'A note on a job', sub: [n.author_name, n.kind].filter(Boolean).join(' · '), snippet: (n.body as string | null)?.slice(0, 140) ?? null, at: when(n.created_at), room: 'jobs', who: null });
  }

  // A phone number is a different question from a word, and it cannot be asked
  // in SQL here: the same number is stored as "(406) 555-0134", "+1 406 555
  // 0134" and "4065550134" depending on who typed it, so a LIKE over digits
  // matches none of them. The rows are few (a contact book is hundreds, not
  // millions), so the digits are compared in memory where the formatting can
  // be thrown away first.
  if (phone) {
    const [allC, allL] = await Promise.all([
      sb.from('client_contacts').select('id, name, company, email, phone, notes, first_seen').eq('client_email', email).not('phone', 'is', null).limit(5000),
      sb.from('client_leads').select('id, name, email, phone, town, project_type, message, created_at').eq('client_email', email).not('phone', 'is', null).limit(2000),
    ]);
    const matches = (v: unknown) => digits(String(v ?? '')).endsWith(phone);
    const byPhoneC = { data: ((allC.data ?? []) as Array<Record<string, unknown>>).filter((r) => matches(r.phone)).slice(0, 6) };
    const byPhoneL = { data: ((allL.data ?? []) as Array<Record<string, unknown>>).filter((r) => matches(r.phone)).slice(0, 6) };
    for (const c of (byPhoneC.data ?? []) as Array<Record<string, unknown>>) {
      if (out.some((h) => h.kind === 'contact' && h.id === String(c.id))) continue;
      out.push({ kind: 'contact', id: String(c.id), title: (c.name as string) || 'No name', sub: [c.company, c.phone].filter(Boolean).join(' · '), snippet: null, at: when(c.first_seen), room: 'contacts', who: { name: (c.name as string) ?? null, email: (c.email as string) ?? null, phone: (c.phone as string) ?? null } });
    }
    for (const l of (byPhoneL.data ?? []) as Array<Record<string, unknown>>) {
      if (out.some((h) => h.kind === 'lead' && h.id === String(l.id))) continue;
      out.push({ kind: 'lead', id: String(l.id), title: (l.name as string) || 'Someone', sub: [l.town, l.phone].filter(Boolean).join(' · '), snippet: null, at: when(l.created_at), room: 'leads', who: { name: (l.name as string) ?? null, email: (l.email as string) ?? null, phone: (l.phone as string) ?? null } });
    }
  }

  // People first, then the work, then the paper. Inside a kind, newest first.
  const order: Record<HitKind, number> = { contact: 0, lead: 1, job: 2, mail: 3, note: 4, request: 5, post: 6 };
  return out.sort((a, b) => order[a.kind] - order[b.kind] || (b.at ?? '').localeCompare(a.at ?? '')).slice(0, 40);
}

/* ─────────────────────────── the person card ─────────────────────────── */

export type Dossier = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: string[];
  /** Everything, newest first, in one column. */
  timeline: Array<{ kind: string; at: string | null; title: string; body: string | null; room: string }>;
  jobs: Array<{ id: string; name: string; stage: string; value_cents: number | null }>;
  /** Plain facts a person wants before they speak. */
  facts: string[];
};

/**
 * Everything this business knows about one human, assembled.
 *
 * Identity is a phone number's last seven digits or a lowercased address,
 * never a name, for the same reason the tray files that way: two Daves are two
 * people, and "Dave" and "Dave Miller" are usually one.
 */
export async function dossier(sb: SupabaseClient, clientEmail: string, who: { email?: string | null; phone?: string | null; name?: string | null }): Promise<Dossier | null> {
  const email = clientEmail.toLowerCase().trim();
  const theirEmail = (who.email ?? '').trim().toLowerCase() || null;
  const theirPhone = phoneLike(who.phone ?? '') ?? null;
  const theirName = (who.name ?? '').trim() || null;
  if (!theirEmail && !theirPhone && !theirName) return null;

  // The same formatting problem as the search: a phone cannot be matched in
  // SQL, so it is matched in memory below. What SQL can do is the address and
  // the name.
  const orFor = (cols: { email?: string; name?: string }) => {
    const parts: string[] = [];
    if (theirEmail && cols.email) parts.push(`${cols.email}.ilike.${esc(theirEmail)}`);
    if (theirName && cols.name) parts.push(`${cols.name}.ilike.%${esc(theirName)}%`);
    return parts.join(',');
  };
  const samePhone = (v: unknown) => Boolean(theirPhone) && digits(String(v ?? '')).endsWith(theirPhone!);

  const contactOr = orFor({ email: 'email', name: 'name' });
  const leadOr = orFor({ email: 'email', name: 'name' });
  const jobOr = orFor({ email: 'contact_email', name: 'contact_name' });

  // When all we have is a phone number, everything with a phone number comes
  // back and is narrowed here.
  const [contacts, leads, jobs] = await Promise.all([
    contactOr
      ? sb.from('client_contacts').select('id, name, company, email, phone, tags, notes, first_seen, source').eq('client_email', email).or(contactOr).limit(5)
      : sb.from('client_contacts').select('id, name, company, email, phone, tags, notes, first_seen, source').eq('client_email', email).not('phone', 'is', null).limit(5000),
    leadOr
      ? sb.from('client_leads').select('id, name, email, phone, town, project_type, land, message, source, created_at').eq('client_email', email).or(leadOr).order('created_at', { ascending: false }).limit(20)
      : sb.from('client_leads').select('id, name, email, phone, town, project_type, land, message, source, created_at').eq('client_email', email).not('phone', 'is', null).order('created_at', { ascending: false }).limit(2000),
    jobOr
      ? sb.from('client_jobs').select('id, name, stage, value_cents, town, source, notes, created_at, last_touch_at, contact_phone').eq('client_email', email).or(jobOr).limit(10)
      : sb.from('client_jobs').select('id, name, stage, value_cents, town, source, notes, created_at, last_touch_at, contact_phone').eq('client_email', email).not('contact_phone', 'is', null).limit(500),
  ]);

  const narrow = (rows: Array<Record<string, unknown>>, col: string, wasSql: boolean) => (wasSql ? rows : rows.filter((r) => samePhone(r[col])));
  const contact = narrow((contacts.data ?? []) as Array<Record<string, unknown>>, 'phone', Boolean(contactOr))[0] ?? null;
  const leadRows = narrow((leads.data ?? []) as Array<Record<string, unknown>>, 'phone', Boolean(leadOr)).slice(0, 20);
  const jobRows = narrow((jobs.data ?? []) as Array<Record<string, unknown>>, 'contact_phone', Boolean(jobOr)).slice(0, 10);

  const name = (contact?.name as string) ?? (leadRows[0]?.name as string) ?? (jobRows[0]?.name as string) ?? theirName;
  const addr = (contact?.email as string) ?? (leadRows[0]?.email as string) ?? theirEmail;
  const tel = (contact?.phone as string) ?? (leadRows[0]?.phone as string) ?? who.phone ?? null;

  // Their mail and the notes on their jobs, which is most of what "what did we
  // last say to them" actually means.
  const [mail, events] = await Promise.all([
    addr ? sb.from('client_mail').select('id, subject, snippet, from_addr, received_at, status').eq('client_email', email).ilike('from_addr', `%${esc(addr)}%`).order('received_at', { ascending: false }).limit(15) : Promise.resolve({ data: [] }),
    jobRows.length
      ? sb.from('client_job_events').select('kind, body, author_name, created_at, job_id').eq('client_email', email).in('job_id', jobRows.map((j) => String(j.id))).order('created_at', { ascending: false }).limit(25)
      : Promise.resolve({ data: [] }),
  ]);

  const timeline: Dossier['timeline'] = [];
  for (const l of leadRows) {
    timeline.push({ kind: 'Came through the website', at: when(l.created_at), title: [l.project_type, l.town].filter(Boolean).join(', ') || 'An enquiry', body: (l.message as string | null) ?? null, room: 'leads' });
  }
  for (const m of ((mail.data ?? []) as Array<Record<string, unknown>>)) {
    timeline.push({ kind: 'Email', at: when(m.received_at), title: (m.subject as string) || 'No subject', body: (m.snippet as string | null) ?? null, room: 'inbox' });
  }
  for (const e of ((events.data ?? []) as Array<Record<string, unknown>>)) {
    const k = String(e.kind);
    timeline.push({ kind: k === 'call' ? 'Call' : k === 'meeting' ? 'Meeting' : k === 'stage' ? 'Moved stage' : 'Note', at: when(e.created_at), title: (e.author_name as string) ?? 'On the job', body: (e.body as string | null) ?? null, room: 'jobs' });
  }
  timeline.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));

  const facts: string[] = [];
  if (jobRows.length) {
    const worth = jobRows.reduce((n, j) => n + ((j.value_cents as number) ?? 0), 0);
    facts.push(`${jobRows.length} ${jobRows.length === 1 ? 'job' : 'jobs'} on the board${worth ? `, ${`$${Math.round(worth / 100).toLocaleString('en-US')}`} between them` : ''}`);
  }
  if (leadRows.length > 1) facts.push(`Has come through the website ${leadRows.length} times`);
  const land = leadRows.find((l) => l.land)?.land as string | undefined;
  if (land) facts.push(`Land: ${land}`);
  if (contact?.source) facts.push(`In your book from: ${contact.source}`);
  const lastTouch = timeline[0]?.at;
  if (lastTouch) {
    const days = Math.floor((Date.now() - Date.parse(lastTouch)) / 86_400_000);
    facts.push(days <= 0 ? 'Last heard from today' : `Last anything: ${days} ${days === 1 ? 'day' : 'days'} ago`);
  }

  return {
    name: name ?? null,
    email: addr ?? null,
    phone: tel ?? null,
    company: (contact?.company as string) ?? null,
    tags: ((contact?.tags as string[] | null) ?? []).slice(0, 8),
    timeline: timeline.slice(0, 40),
    jobs: jobRows.map((j) => ({ id: String(j.id), name: String(j.name), stage: String(j.stage), value_cents: (j.value_cents as number) ?? null })),
    facts,
  };
}
