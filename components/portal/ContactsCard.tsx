'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * THE CONTACT BOOK, in the owner's own Command Center.
 *
 * Everyone they have dealt with, carried over from the provider they left,
 * searchable by any word and filtered by tag. The whole book downloads as a
 * spreadsheet, because it is theirs. Below it, the posts the old provider
 * made, kept as a record.
 *
 * Nothing renders until there is something to show.
 */
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const EYEBROW = 'block text-[10px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616]/55 mb-2';
const BTN = 'inline-block px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';
const CHIP = 'px-2.5 py-1 text-[11px] font-sans font-bold rounded-full border-2 transition-colors';
const INPUT = 'w-full rounded-lg border-2 border-[#161616]/25 bg-white px-3 py-2 font-body text-sm text-[#161616] focus:border-[#161616] focus:outline-none';
const PAGE = 25;

type Person = {
  id: string; name: string | null; phone: string | null; email: string | null; company: string | null;
  tags: string[]; source: string | null; origin: string; firstSeen: string | null; notes: string | null;
};
type Post = {
  id: string; origin: string; status: 'published' | 'scheduled' | 'failed'; postedAt: string; body: string;
  networks: string[]; stats: { likes?: number; comments?: number; reached?: number; plays?: number }; error: string | null;
};
type Payload = { ready: false } | { ready: true; people: Person[]; tags: Array<{ tag: string; count: number }>; posts: Post[] } | null;

const ORIGIN: Record<string, string> = { 'web-express': 'Web Express', portal: 'added here' };
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', year: 'numeric' });
const dayOnly = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const tel = (p: string) => p.replace(/\s*ext\.?\s*\d+$/i, '').replace(/[^\d+]/g, '');

export default function ContactsCard() {
  const [data, setData] = useState<Payload>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', tags: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPosts, setShowPosts] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/contacts', { cache: 'no-store' });
      const j = (await r.json()) as { contacts: Payload };
      setData(j.contacts ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const people = useMemo(() => (data && data.ready ? data.people : []), [data]);
  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const digits = query.replace(/\D/g, '');
    return people.filter((p) => {
      if (tag && !p.tags.includes(tag)) return false;
      if (!words.length) return true;
      const hay = [p.name, p.email, p.company, p.notes, p.tags.join(' ')].join(' ').toLowerCase();
      if (words.every((w) => hay.includes(w))) return true;
      return digits.length >= 3 && (p.phone ?? '').replace(/\D/g, '').includes(digits);
    });
  }, [people, query, tag]);

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const r = await fetch('/api/portal/contacts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setFormError(j.error ?? 'That did not save. Try once more.');
        return;
      }
      setForm({ name: '', phone: '', email: '', company: '', tags: '', notes: '' });
      setAdding(false);
      await load();
    } catch {
      setFormError('That did not save. Check the connection and try once more.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) return null;

  if (!data.ready) {
    return (
      <section className={`${CARD} p-6 mb-8`}>
        <span className={EYEBROW}>Contacts</span>
        <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">Your contact book is nearly here</h3>
        <p className="text-[#161616]/65 font-body text-sm">Everyone from your old system is being carried over. It appears here the moment it lands.</p>
      </section>
    );
  }

  const fromOld = people.filter((p) => p.origin !== 'portal');
  const origins = [...new Set(fromOld.map((p) => ORIGIN[p.origin] ?? p.origin))];
  const posts = data.posts;
  const published = posts.filter((p) => p.status === 'published');
  const reachRows = published.filter((p) => typeof p.stats.reached === 'number');
  const avgReach = reachRows.length ? Math.round(reachRows.reduce((a, p) => a + (p.stats.reached ?? 0), 0) / reachRows.length) : null;

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className={EYEBROW}>Contacts</span>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h3 className="font-display text-xl font-semibold text-[#161616]">
          {people.length ? `${people.length.toLocaleString('en-US')} ${people.length === 1 ? 'person' : 'people'} in your contact book` : 'Your contact book is empty'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {people.length ? (
            <a className={BTN} href="/api/portal/contacts?format=csv">Download the spreadsheet</a>
          ) : null}
          <button type="button" className={BTN} onClick={() => setAdding((v) => !v)}>{adding ? 'Close' : 'Add someone'}</button>
        </div>
      </div>
      <p className="text-[#161616]/65 font-body text-sm mb-4">
        {fromOld.length
          ? `Everyone from ${origins.join(' and ')}, carried over name for name, with their tags. Search any word, a town, a company or part of a phone number.`
          : 'Everyone you add here stays yours, and downloads as a spreadsheet whenever you want it.'}
      </p>

      {adding ? (
        <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] p-4 mb-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-sans font-bold text-[#161616]/70">Name<input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" /></label>
            <label className="block text-[11px] font-sans font-bold text-[#161616]/70">Company<input className={INPUT} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} autoComplete="off" /></label>
            <label className="block text-[11px] font-sans font-bold text-[#161616]/70">Phone<input className={INPUT} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="off" /></label>
            <label className="block text-[11px] font-sans font-bold text-[#161616]/70">Email<input className={INPUT} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" /></label>
            <label className="block text-[11px] font-sans font-bold text-[#161616]/70 sm:col-span-2">Tags, separated by commas<input className={INPUT} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Supplier, Whitefish" autoComplete="off" /></label>
            <label className="block text-[11px] font-sans font-bold text-[#161616]/70 sm:col-span-2">Notes<textarea className={INPUT} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
          {formError ? <p className="mt-3 text-sm font-body text-[#B3261E]" role="alert">{formError}</p> : null}
          <button type="button" className={`${BTN} mt-3`} disabled={saving} onClick={() => void save()}>{saving ? 'Saving' : 'Save them'}</button>
        </div>
      ) : null}

      {people.length ? (
        <>
          <input className={`${INPUT} mb-3`} type="search" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Search a name, a company, a town, a number" aria-label="Search contacts" />
          <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter by tag">
            <button type="button" aria-pressed={tag === null} className={`${CHIP} ${tag === null ? 'bg-[#161616] text-white border-[#161616]' : 'bg-white text-[#161616] border-[#161616]/25'}`} onClick={() => { setTag(null); setShown(PAGE); }}>
              Everyone {people.length}
            </button>
            {data.tags.map((t) => (
              <button key={t.tag} type="button" aria-pressed={tag === t.tag} className={`${CHIP} ${tag === t.tag ? 'bg-[#161616] text-white border-[#161616]' : 'bg-white text-[#161616] border-[#161616]/25'}`} onClick={() => { setTag(tag === t.tag ? null : t.tag); setShown(PAGE); }}>
                {t.tag} {t.count}
              </button>
            ))}
          </div>

          {filtered.length ? (
            <div className="space-y-2">
              {filtered.slice(0, shown).map((p) => (
                <div key={p.id} className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-base font-semibold text-[#161616]">
                      {p.name || 'No name given'}
                      {p.company ? <span className="font-body font-normal text-[#161616]/65">, {p.company}</span> : null}
                    </p>
                    {p.tags.length ? <span className="text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616]/55">{p.tags.join(' · ')}</span> : null}
                  </div>
                  <p className="font-body text-sm text-[#161616]/80 break-words">
                    {p.phone ? <a className="underline" href={`tel:${tel(p.phone)}`}>{p.phone}</a> : null}
                    {p.phone && p.email ? ' · ' : ''}
                    {p.email ? <a className="underline" href={`mailto:${p.email}`}>{p.email}</a> : null}
                  </p>
                  <p className="font-body text-xs text-[#161616]/55 mt-0.5">
                    {[p.firstSeen ? `Since ${dayOnly(p.firstSeen)}` : null, p.source, ORIGIN[p.origin] ? `from ${ORIGIN[p.origin]}` : null].filter(Boolean).join(' · ')}
                  </p>
                  {p.notes ? <p className="font-body text-xs text-[#161616]/70 mt-1">{p.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-[#161616]/65">
              Nobody matches that.{' '}
              <button type="button" className="underline" onClick={() => { setQuery(''); setTag(null); }}>Show everyone</button>
            </p>
          )}

          {filtered.length > shown ? (
            <button type="button" className="mt-4 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616]/60 underline" onClick={() => setShown((n) => n + 100)}>
              Show {Math.min(100, filtered.length - shown)} more of {filtered.length}
            </button>
          ) : null}
        </>
      ) : null}

      {posts.length ? (
        <div className="mt-6 border-t-2 border-[#161616]/10 pt-4">
          <span className={EYEBROW}>What {[...new Set(posts.map((p) => ORIGIN[p.origin] ?? p.origin))].join(' and ')} posted</span>
          <p className="font-body text-sm text-[#161616]/75">
            {published.length} published{avgReach !== null ? `, reaching ${avgReach} people on average` : ''}.
            {posts.some((p) => p.status === 'scheduled') ? ` ${posts.filter((p) => p.status === 'scheduled').length} were still queued when we carried them over.` : ''}
            {posts.some((p) => p.status === 'failed') ? ' Some never went out: the reason is on each one.' : ''}
          </p>
          <button type="button" className="mt-2 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616]/60 underline" onClick={() => setShowPosts((v) => !v)}>
            {showPosts ? 'Hide them' : `Read all ${posts.length}`}
          </button>
          {showPosts ? (
            <div className="space-y-3 mt-3">
              {posts.map((p) => (
                <div key={p.id} className={`rounded-xl border-2 px-4 py-3 ${p.status === 'failed' ? 'border-[#B3261E]/40 bg-white' : 'border-[#161616]/15 bg-[#FBF6EA]'}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-sm font-semibold text-[#161616]">{day(p.postedAt)}</p>
                    <span className={`text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold ${p.status === 'failed' ? 'text-[#B3261E]' : 'text-[#161616]/55'}`}>
                      {p.status === 'published' ? 'Published' : p.status === 'scheduled' ? 'Was queued' : `Failed${p.networks.length ? ` on ${p.networks.map((n) => (n === 'x' ? 'X' : n)).join(', ')}` : ''}`}
                    </span>
                  </div>
                  <p className="font-body text-sm text-[#161616]/85 mt-1 whitespace-pre-line break-words">{p.body}</p>
                  {p.error ? <p className="font-body text-xs text-[#B3261E] mt-2">{p.error}</p> : null}
                  {typeof p.stats.reached === 'number' ? (
                    <p className="font-body text-xs text-[#161616]/55 mt-2">
                      {[`${p.stats.reached} reached`, typeof p.stats.likes === 'number' ? `${p.stats.likes} ${p.stats.likes === 1 ? 'like' : 'likes'}` : null, typeof p.stats.comments === 'number' ? `${p.stats.comments} comments` : null, typeof p.stats.plays === 'number' ? `${p.stats.plays} plays` : null].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
