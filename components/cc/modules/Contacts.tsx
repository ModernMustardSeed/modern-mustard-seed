'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardHead, Drawer, Empty, ErrorNote, Field, Label, Skeleton, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';
import Knows from '@/components/cc/Knows';

type ClientList = { id: string; name: string; tags: string[]; note: string | null; people: number; reachable: number };

/**
 * THE BOOK. Everyone the business knows, carried over name for name with the
 * tags they were filed under.
 *
 * It reads as a table because that is how an office reads a list of people:
 * every column in the row, sorted by last name, and any column sortable with
 * one press. A row opens the whole card, with a call and an email one press
 * away. Search is the other way in: a town, a trade, half a phone number.
 * Adding someone is two fields and it is theirs to keep, so the book outlives
 * any tool it came from.
 */

type Contact = { id: string; name: string | null; phone: string | null; email: string | null; company: string | null; tags: string[]; source: string | null; origin: string; firstSeen: string | null; notes: string | null };
type Payload = { contacts: { ready: boolean; people?: Contact[]; tags?: Array<{ tag: string; count: number }> } | null };

type SortKey = 'name' | 'company' | 'phone' | 'email' | 'firstSeen';

/** "Andrea Emde" sorts under E. A company standing in for a name sorts as typed. */
function lastName(name: string | null): string {
  const t = (name ?? '').trim();
  if (!t) return '~';
  const parts = t.split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return `${last} ${parts[0]}`.toLowerCase();
}

const ORIGIN: Record<string, string> = { 'web-express': 'Web Express', portal: 'Added here' };

const dateOf = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');

export default function Contacts() {
  const [people, setPeople] = useState<Contact[] | null>(null);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [ready, setReady] = useState(true);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', tags: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  const [open, setOpen] = useState<Contact | null>(null);
  // Selection, bulk tagging and the named lists they build. A list is a name
  // over a set of tags, so tagging eight people IS how the realtor list comes
  // to exist. See lib/client-lists.ts.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<ClientList[]>([]);
  const [listName, setListName] = useState('');
  const [bulkTag, setBulkTag] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNote, setBulkNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/portal/contacts', { cache: 'no-store' });
      const j = (await r.json()) as Payload;
      if (!j.contacts) {
        setPeople([]);
        return;
      }
      setReady(j.contacts.ready);
      setPeople(j.contacts.people ?? []);
      setTags(j.contacts.tags ?? []);
    } catch {
      setError(true);
    }
  }, []);

  const loadLists = useCallback(async () => {
    try {
      const r = await fetch('/api/cc/lists', { cache: 'no-store' });
      const j = (await r.json()) as { lists?: ClientList[] };
      setLists(j.lists ?? []);
    } catch {
      /* the book still reads without its lists */
    }
  }, []);

  useEffect(() => {
    void load();
    void loadLists();
  }, [load, loadLists]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (people ?? [])
      .filter((p) => (tag ? p.tags.includes(tag) : true))
      .filter((p) => (!term ? true : [p.name, p.email, p.phone, p.company, p.notes, ...(p.tags ?? [])].filter(Boolean).join(' ').toLowerCase().includes(term)));
    const keyOf = (p: Contact): string => {
      switch (sort.key) {
        case 'name':
          return lastName(p.name);
        case 'company':
          return (p.company ?? '~').toLowerCase();
        case 'phone':
          return p.phone ?? '~';
        case 'email':
          return (p.email ?? '~').toLowerCase();
        case 'firstSeen':
          return p.firstSeen ?? '';
      }
    };
    return [...list].sort((a, b) => keyOf(a).localeCompare(keyOf(b)) * sort.dir || lastName(a.name).localeCompare(lastName(b.name)));
  }, [people, q, tag, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'firstSeen' ? -1 : 1 }));

  const add = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch('/api/portal/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; contact?: Contact };
      if (!r.ok || !j.ok) {
        setSaveError(j.error ?? 'That did not save.');
        return;
      }
      setForm({ name: '', phone: '', email: '', company: '', tags: '', notes: '' });
      setAdding(false);
      void load();
    } catch {
      setSaveError('That did not save.');
    } finally {
      setSaving(false);
    }
  };

  const pick = (id: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const bulk = async (add: string[], remove: string[]) => {
    setBulkBusy(true);
    setBulkNote(null);
    try {
      const r = await fetch('/api/cc/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'tag', ids: [...picked], add, remove }),
      });
      const j = (await r.json()) as { ok?: boolean; changed?: number; error?: string };
      setBulkNote(j.ok ? `${j.changed ?? 0} ${j.changed === 1 ? 'person' : 'people'} tagged.` : (j.error ?? 'That did not take.'));
      if (j.ok) {
        setBulkTag('');
        void load();
        void loadLists();
      }
    } catch {
      setBulkNote('That did not take.');
    } finally {
      setBulkBusy(false);
    }
  };

  /** Save the tag being filtered on, or the one just typed, as a named list. */
  const saveList = async () => {
    const name = listName.trim();
    const tagsFor = bulkTag.trim() ? [bulkTag.trim()] : tag ? [tag] : [];
    if (!name || !tagsFor.length) return;
    setBulkBusy(true);
    setBulkNote(null);
    try {
      const r = await fetch('/api/cc/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'save', name, tags: tagsFor }),
      });
      const j = (await r.json()) as { ok?: boolean; lists?: ClientList[]; error?: string };
      if (j.ok) {
        setLists(j.lists ?? []);
        setListName('');
        setBulkNote(`Saved as the ${name} list. Campaigns can send to it.`);
      } else {
        setBulkNote(j.error ?? 'That did not save.');
      }
    } catch {
      setBulkNote('That did not save.');
    } finally {
      setBulkBusy(false);
    }
  };

  const Head = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th scope="col" className={cx('px-3 py-2.5 text-left first:pl-5', className)}>
      <button type="button" onClick={() => toggleSort(k)} className="group inline-flex items-center gap-1" aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
        <Label>{label}</Label>
        <span className={cx('text-[10px] leading-none', sort.key === k ? 'text-[var(--cc-ink)]' : 'text-transparent group-hover:text-[var(--cc-muted)]')} aria-hidden="true">
          {sort.key === k && sort.dir === -1 ? '▼' : '▲'}
        </span>
      </button>
    </th>
  );

  const withEmail = (people ?? []).filter((p) => p.email).length;

  return (
    <div className="space-y-5">
      {/* What the desk knows about the business, and the questions it wants
          answered before it treats a guess as a fact. */}
      <Knows />
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--cc-line)] px-5 py-4">
          <input id="cc-contacts-search" className={cx(inputCls, 'min-w-[220px] flex-1')} placeholder="Search a name, a town, a company, part of a number" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button href="/api/portal/contacts?format=csv">Download CSV</Button>
          <Button kind="primary" onClick={() => setAdding((v) => !v)}>
            <Icon name="plus" size={15} /> Add someone
          </Button>
        </div>

        {adding && (
          <div className="border-b border-[var(--cc-line)] bg-[#FAFBFC] px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" /></Field>
              <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(406) 555 0134" /></Field>
              <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" /></Field>
              <Field label="Company"><input className={inputCls} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Doe Excavation" /></Field>
              <Field label="Tags" hint="Commas between them."><input className={inputCls} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Subcontractor, Kalispell" /></Field>
              <Field label="Note"><input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Framing, does his own trusses" /></Field>
            </div>
            {saveError && <p className="mt-3 text-[13px] text-[#B42318]">{saveError}</p>}
            <div className="mt-3 flex gap-2">
              <Button kind="primary" onClick={add} disabled={saving || !form.name.trim()}>{saving ? 'Saving' : 'Save to the book'}</Button>
              <Button onClick={() => setAdding(false)} kind="ghost">Cancel</Button>
            </div>
          </div>
        )}

        {lists.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cc-line)] bg-[#FAFBFC] px-5 py-3">
            <Label>Your lists</Label>
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => setTag(l.tags[0] ?? null)}
                title={`${l.people} in this list, ${l.reachable} with an email`}
                className={cx(
                  'rounded-full border px-3 py-1 text-[12.5px] font-semibold transition',
                  l.tags[0] && tag === l.tags[0] ? 'border-[var(--cc-accent)] bg-[var(--cc-accent)]/10 text-[var(--cc-accent)]' : 'border-[var(--cc-line)] bg-white text-[var(--cc-ink)] hover:border-[var(--cc-ink)]',
                )}
              >
                {l.name} <span className="font-mono text-[11px] tabular-nums text-[var(--cc-muted)]">{l.people}</span>
              </button>
            ))}
            <span className="ml-auto text-[12px] text-[var(--cc-muted)]">A list is a name over a tag. Tag people and they join it.</span>
          </div>
        )}

        {picked.size > 0 && (
          <div className="flex flex-wrap items-end gap-3 border-b border-[var(--cc-line)] bg-[var(--cc-accent)]/5 px-5 py-4">
            <span className="text-[14px] font-semibold">{picked.size} selected</span>
            <Field label="Tag them">
              <input className={cx(inputCls, 'min-w-[200px]')} value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="Realtor" />
            </Field>
            <Button kind="primary" disabled={bulkBusy || !bulkTag.trim()} onClick={() => bulk([bulkTag.trim()], [])}>
              {bulkBusy ? 'Working' : `Tag ${picked.size}`}
            </Button>
            <Button disabled={bulkBusy || !bulkTag.trim()} onClick={() => bulk([], [bulkTag.trim()])}>Take that tag off</Button>
            <Button kind="ghost" onClick={() => setPicked(new Set())}>Clear</Button>
            {(tag || bulkTag.trim()) && (
              <div className="flex items-end gap-2">
                <Field label="Save as a list" hint={`Everyone tagged ${bulkTag.trim() || tag}`}>
                  <input className={cx(inputCls, 'min-w-[180px]')} value={listName} onChange={(e) => setListName(e.target.value)} placeholder="The realtor list" />
                </Field>
                <Button disabled={bulkBusy || listName.trim().length < 2} onClick={saveList}>Save the list</Button>
              </div>
            )}
            {bulkNote && <p className="w-full text-[13px] text-[var(--cc-ink)]">{bulkNote}</p>}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--cc-line)] px-5 py-3">
            <button onClick={() => setTag(null)} className={cx('rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]', !tag ? 'border-[var(--cc-ink)] bg-[var(--cc-ink)] text-white' : 'border-[var(--cc-line)] text-[var(--cc-muted)] hover:border-[var(--cc-ink)] hover:text-[var(--cc-ink)]')}>
              Everyone {people?.length ?? 0}
            </button>
            {tags.map((t) => (
              <button
                key={t.tag}
                onClick={() => setTag(tag === t.tag ? null : t.tag)}
                className={cx('rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]', tag === t.tag ? 'border-[var(--cc-ink)] bg-[var(--cc-ink)] text-white' : 'border-[var(--cc-line)] text-[var(--cc-muted)] hover:border-[var(--cc-ink)] hover:text-[var(--cc-ink)]')}
              >
                {t.tag} {t.count}
              </button>
            ))}
            <span className="ml-auto text-[12px] text-[var(--cc-muted)]">
              {rows.length} {rows.length === 1 ? 'person' : 'people'}
              {people && people.length ? `, ${withEmail} with an email` : ''}
            </span>
          </div>
        )}

        {error ? (
          <div className="p-5"><ErrorNote onRetry={load}>The book did not load.</ErrorNote></div>
        ) : !people ? (
          <div className="p-5"><Skeleton rows={6} /></div>
        ) : !ready ? (
          <div className="p-5"><Empty title="The book is not carried over yet" note="Once your contacts are imported they show here, with their tags." /></div>
        ) : rows.length === 0 ? (
          <div className="p-5"><Empty title="Nobody matches that" note="Try a shorter word, a town, or part of a phone number." /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-[13.5px]">
                <thead className="bg-[#FAFBFC]">
                  <tr className="border-b border-[var(--cc-line)]">
                    <th scope="col" className="w-10 pl-5 pr-0 py-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--cc-accent)]"
                        aria-label="Select everyone shown"
                        checked={rows.length > 0 && rows.slice(0, limit).every((p) => picked.has(p.id))}
                        onChange={(e) => {
                          const shown = rows.slice(0, limit).map((p) => p.id);
                          setPicked((prev) => {
                            const next = new Set(prev);
                            for (const id of shown) if (e.target.checked) next.add(id); else next.delete(id);
                            return next;
                          });
                        }}
                      />
                    </th>
                    <Head k="name" label="Name" />
                    <Head k="company" label="Company" />
                    <Head k="phone" label="Phone" />
                    <Head k="email" label="Email" />
                    <th scope="col" className="px-3 py-2.5 text-left"><Label>Tags</Label></th>
                    <Head k="firstSeen" label="Since" className="pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cc-line)]">
                  {rows.slice(0, limit).map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setOpen(p)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setOpen(p);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer transition hover:bg-[#F7F8FA] focus-visible:bg-[#F7F8FA] focus-visible:outline-none"
                    >
                      {/* The checkbox swallows the click so picking someone
                          does not also open their card. */}
                      <td className="w-10 pl-5 pr-0 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--cc-accent)]"
                          checked={picked.has(p.id)}
                          onChange={(e) => pick(p.id, e.target.checked)}
                          aria-label={`Select ${p.name ?? 'this person'}`}
                        />
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[var(--cc-ink)]">
                        <span className="block max-w-[220px] truncate">{p.name ?? <span className="font-normal text-[var(--cc-muted)]">No name</span>}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--cc-ink)]"><span className="block max-w-[220px] truncate">{p.company ?? ''}</span></td>
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-[var(--cc-ink)]">{p.phone ?? ''}</td>
                      <td className="px-3 py-2.5 text-[var(--cc-ink)]"><span className="block max-w-[240px] truncate">{p.email ?? ''}</span></td>
                      <td className="px-3 py-2.5">
                        <span className="flex flex-wrap gap-1">
                          {p.tags.slice(0, 3).map((t) => (
                            <Badge key={t}>{t}</Badge>
                          ))}
                          {p.tags.length > 3 && <Badge>+{p.tags.length - 3}</Badge>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 pr-5 whitespace-nowrap text-[12.5px] text-[var(--cc-muted)]">{dateOf(p.firstSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > limit && (
              <div className="border-t border-[var(--cc-line)] px-5 py-4">
                <Button onClick={() => setLimit((l) => l + 100)} full>
                  Show 100 more of {rows.length}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <CardHead title="Where the book came from" hint="Every person carried over keeps the origin they were filed under, so nothing here is guesswork." />
        <div className="flex flex-wrap gap-2">
          {Object.entries(
            (people ?? []).reduce<Record<string, number>>((acc, p) => {
              const k = ORIGIN[p.origin] ?? p.origin ?? 'Added here';
              acc[k] = (acc[k] ?? 0) + 1;
              return acc;
            }, {}),
          )
            .sort((a, b) => b[1] - a[1])
            .map(([k, n]) => (
              <span key={k} className="rounded-lg border border-[var(--cc-line)] px-3 py-1.5 text-[13px]">
                <span className="font-semibold tabular-nums">{n}</span> <span className="text-[var(--cc-muted)]">{k}</span>
              </span>
            ))}
          {!people?.length && <span className="text-[13px] text-[var(--cc-muted)]">Nothing carried over yet.</span>}
        </div>
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.name ?? open?.company ?? 'Contact'}
        footer={
          open ? (
            <div className="flex flex-wrap gap-2">
              {open.phone && (
                <Button href={`tel:${open.phone.replace(/[^\d+]/g, '')}`} kind="primary">
                  <Icon name="phone" size={15} /> Call {open.phone}
                </Button>
              )}
              {open.email && (
                <Button href={`mailto:${open.email}`}>
                  <Icon name="mail" size={15} /> Email
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {open && (
          <dl className="space-y-4 text-[14px]">
            {[
              ['Company', open.company],
              ['Phone', open.phone],
              ['Email', open.email],
              ['In the book since', dateOf(open.firstSeen)],
              ['How they arrived', open.source],
              ['Came from', ORIGIN[open.origin] ?? open.origin],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k as string}>
                  <dt><Label>{k}</Label></dt>
                  <dd className="mt-1 break-words text-[var(--cc-ink)]">{v}</dd>
                </div>
              ))}
            {open.tags.length > 0 && (
              <div>
                <dt><Label>Tags</Label></dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {open.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </dd>
              </div>
            )}
            {open.notes && (
              <div>
                <dt><Label>Notes</Label></dt>
                <dd className="mt-1.5 whitespace-pre-wrap rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3 leading-relaxed">{open.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </Drawer>
    </div>
  );
}
