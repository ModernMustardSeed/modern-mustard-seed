'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardHead, Empty, ErrorNote, Field, Label, Skeleton, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * THE BOOK. Everyone the business knows, carried over name for name with the
 * tags they were filed under. Search is the whole interface: a town, a trade,
 * half a phone number. Adding someone is two fields and it is theirs to keep,
 * so the book outlives any tool it came from.
 */

type Contact = { id: string; name: string | null; phone: string | null; email: string | null; company: string | null; tags: string[]; source: string | null; origin: string; firstSeen: string | null; notes: string | null };
type Payload = { contacts: { ready: boolean; people?: Contact[]; tags?: Array<{ tag: string; count: number }> } | null };

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
  const [limit, setLimit] = useState(60);

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

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (people ?? [])
      .filter((p) => (tag ? p.tags.includes(tag) : true))
      .filter((p) => (!term ? true : [p.name, p.email, p.phone, p.company, p.notes, ...(p.tags ?? [])].filter(Boolean).join(' ').toLowerCase().includes(term)));
  }, [people, q, tag]);

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

  return (
    <div className="space-y-5">
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[var(--cc-line)]">
          <input className={cx(inputCls, 'flex-1 min-w-[200px]')} placeholder="Search a name, a town, a company, part of a number" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button href="/api/portal/contacts?format=csv">Download CSV</Button>
          <Button kind="primary" onClick={() => setAdding((v) => !v)}>
            <Icon name="plus" size={15} /> Add someone
          </Button>
        </div>

        {adding && (
          <div className="border-b border-[var(--cc-line)] bg-[#FAFBFC] px-5 py-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-[var(--cc-line)]">
            <button onClick={() => setTag(null)} className={cx('rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]', !tag ? 'border-[var(--cc-ink)] bg-[var(--cc-ink)] text-white' : 'border-[var(--cc-line)] text-[var(--cc-muted)] hover:border-[var(--cc-ink)]')}>
              Everyone {people?.length ?? 0}
            </button>
            {tags.map((t) => (
              <button
                key={t.tag}
                onClick={() => setTag(tag === t.tag ? null : t.tag)}
                className={cx('rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]', tag === t.tag ? 'border-[var(--cc-ink)] bg-[var(--cc-ink)] text-white' : 'border-[var(--cc-line)] text-[var(--cc-muted)] hover:border-[var(--cc-ink)]')}
              >
                {t.tag} {t.count}
              </button>
            ))}
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
            <ul className="divide-y divide-[var(--cc-line)]">
              {rows.slice(0, limit).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{p.name ?? 'No name'}{p.company ? <span className="font-normal text-[var(--cc-muted)]"> · {p.company}</span> : null}</p>
                    <p className="text-[12.5px] text-[var(--cc-muted)] truncate">{[p.phone, p.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                    {p.notes && <p className="mt-0.5 text-[12.5px] text-[var(--cc-muted)] line-clamp-2">{p.notes}</p>}
                  </div>
                  <div className="flex flex-none flex-wrap items-center gap-1.5">
                    {p.tags.slice(0, 3).map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                    {p.phone && <Button href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" size={15} /></Button>}
                    {p.email && <Button href={`mailto:${p.email}`}><Icon name="mail" size={15} /></Button>}
                  </div>
                </li>
              ))}
            </ul>
            {rows.length > limit && (
              <div className="px-5 py-4 border-t border-[var(--cc-line)]">
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
              const k = p.origin || 'Added here';
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
    </div>
  );
}
