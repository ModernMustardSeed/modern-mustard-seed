'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

/**
 * THE PARTNER DESK.
 *
 * Where partners come from. Find people on YouTube by what they talk about,
 * add anyone by hand or from a pasted CSV, read the letter written for them,
 * edit it, send it from Sarah's own address, and see who is due a follow-up.
 * Nothing here sends on its own: every letter leaves because a person pressed
 * Send after reading it.
 */

type Kind = 'creator' | 'referral' | 'community';
type Status = 'queued' | 'emailed' | 'dm_sent' | 'replied' | 'joined' | 'passed';

type Prospect = {
  id: string;
  name: string;
  kind: Kind;
  handle: string | null;
  platform: string | null;
  niche: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  x: string | null;
  linkedin: string | null;
  followers: number | null;
  tier: string | null;
  source: string;
  status: Status;
  step: number;
  notes: string | null;
  last_contacted_at: string | null;
  next_at: string | null;
  history: { ts: number; type: string; detail: string }[];
  created_at: string;
};

type Summary = { total: number; queued: number; due: number; waiting: number; replied: number; joined: number };
type Configured = { youtube: boolean; youtubeVia: 'key' | 'channel' | null; email: boolean };

type Candidate = {
  channelId: string;
  name: string;
  handle?: string;
  url: string;
  description: string;
  subscribers: number;
  email?: string;
  tier: string | null;
  inBook: boolean;
};

type Letter = {
  step: number;
  of: number;
  letter: { subject: string; body: string; label: string } | null;
  dms: Record<'instagram' | 'tiktok' | 'x' | 'linkedin', string>;
  profiles: { label: string; url: string }[];
  research: { label: string; url: string }[];
};

const KIND_LABEL: Record<Kind, string> = { creator: 'Creator', referral: 'Referral pro', community: 'Community' };
const STATUS_LABEL: Record<Status, string> = {
  queued: 'Queued',
  emailed: 'Letter out',
  dm_sent: 'DM sent',
  replied: 'Replied',
  joined: 'Joined',
  passed: 'Passed',
};
const QUERIES = [
  'small business marketing',
  'local business marketing',
  'marketing for contractors',
  'landscaping business owner',
  'salon owner',
  'restaurant owner',
  'real estate agent tips',
  'bookkeeping for small business',
  'small business owner day in the life',
  'AI for small business',
  'christian entrepreneur',
  'church leadership',
  'trades business',
];
const MIN_SUBS = [
  { v: 1000, label: '1K+' },
  { v: 10000, label: '10K+' },
  { v: 50000, label: '50K+' },
  { v: 100000, label: '100K+' },
];

const btn = 'px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold rounded-lg border-2 border-[#161616] disabled:opacity-50 whitespace-nowrap transition-transform hover:-translate-y-0.5';
const btnGold = `${btn} text-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616]`;
const btnInk = `${btn} text-[#FBF6EA] bg-[#161616]`;
const btnGhost = 'px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold text-[#161616] border border-[#161616]/25 rounded-lg hover:bg-[#FBF6EA] disabled:opacity-50 whitespace-nowrap';
const input = 'w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm font-body text-[#161616] placeholder:text-[#161616]/40 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';
const card = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';

const fmtFollowers = (n: number | null) => (n == null ? '' : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
const isDue = (p: Prospect) => p.status === 'emailed' && !!p.next_at && new Date(p.next_at).getTime() <= Date.now();

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function PartnerDesk() {
  const [rows, setRows] = useState<Prospect[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, queued: 0, due: 0, waiting: 0, replied: 0, joined: 0 });
  const [configured, setConfigured] = useState<Configured>({ youtube: false, youtubeVia: null, email: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'due' | Status>('all');
  const [kindFilter, setKindFilter] = useState<'all' | Kind>('all');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/partner-desk', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not load the desk');
      setRows(j.prospects || []);
      setSummary(j.summary);
      setConfigured(j.configured);
      if (j.error) setError(j.error);
      else setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the desk');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 4000);
  };

  const visible = useMemo(() => {
    const list = rows.filter((p) => (kindFilter === 'all' ? true : p.kind === kindFilter));
    const filtered = filter === 'all' ? list : filter === 'due' ? list.filter(isDue) : list.filter((p) => p.status === filter);
    return [...filtered].sort((a, b) => Number(isDue(b)) - Number(isDue(a)) || (b.followers || 0) - (a.followers || 0));
  }, [rows, filter, kindFilter]);

  const patchRow = (p: Prospect) => setRows((rs) => rs.map((r) => (r.id === p.id ? p : r)));

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="partner-desk" title="Partner Desk" onRefresh={load} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <header>
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-2">Where partners come from</span>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold">The Partner Desk</h1>
          <p className="font-body text-sm text-[#3A3733] mt-2 max-w-2xl">
            Find the people whose audience runs a business, write to them one at a time from your own address, and watch who is due a follow-up. Every letter goes out because you read it and pressed Send.
          </p>
        </header>

        {(error || notice) && (
          <div className={`border-2 border-[#161616] rounded-xl px-4 py-3 font-body text-sm ${error ? 'bg-[#E0301E]/10' : 'bg-[#F5B700]/25'}`}>{error || notice}</div>
        )}

        <Stats summary={summary} onPick={(f) => setFilter(f)} />

        <Finder configured={configured} book={rows} onAdded={(n, skipped) => { flash(`${n} added to the book${skipped.length ? `, ${skipped.length} already there` : ''}.`); load(); }} />

        <AddPanel onAdded={(n, skipped) => { flash(`${n} added${skipped.length ? `, skipped ${skipped.join(', ')}` : ''}.`); load(); }} onError={setError} />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold mr-2">The book</h2>
            {(['all', 'due', 'queued', 'emailed', 'dm_sent', 'replied', 'joined', 'passed'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-mono font-bold rounded-full border-2 border-[#161616] ${filter === f ? 'bg-[#161616] text-[#FBF6EA]' : 'bg-white'}`}>
                {f === 'all' ? `All ${rows.length}` : f === 'due' ? `Follow-up due ${summary.due}` : STATUS_LABEL[f]}
              </button>
            ))}
            <span className="w-px h-6 bg-[#161616]/20 mx-1" aria-hidden />
            {(['all', 'creator', 'referral', 'community'] as const).map((k) => (
              <button key={k} onClick={() => setKindFilter(k)} className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-mono font-bold rounded-full border border-[#161616]/40 ${kindFilter === k ? 'bg-[#F5B700]' : 'bg-white'}`}>
                {k === 'all' ? 'Every kind' : KIND_LABEL[k]}
              </button>
            ))}
          </div>

          {loading && !rows.length ? (
            <div className={`${card} p-8 text-center font-body text-sm text-[#3A3733]`}>Reading the book.</div>
          ) : !visible.length ? (
            <div className={`${card} p-8 text-center font-body text-sm text-[#3A3733]`}>
              {rows.length ? 'Nobody matches that filter.' : 'The book is empty. Run a query above, add someone by hand, or paste a CSV.'}
            </div>
          ) : (
            <div className={`${card} overflow-hidden`}>
              <table className="w-full text-sm">
                <thead className="bg-[#161616] text-[#FBF6EA] text-[10px] uppercase tracking-[0.15em] font-mono">
                  <tr>
                    <th className="text-left px-4 py-3">Who</th>
                    <th className="text-left px-3 py-3 hidden md:table-cell">Kind</th>
                    <th className="text-left px-3 py-3 hidden sm:table-cell">Reach</th>
                    <th className="text-left px-3 py-3">Status</th>
                    <th className="text-left px-3 py-3 hidden lg:table-cell">Next</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <Row key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} onChange={patchRow} onRemoved={() => { setRows((rs) => rs.filter((r) => r.id !== p.id)); setOpen(null); }} onNotice={flash} onError={setError} emailReady={configured.email} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stats({ summary, onPick }: { summary: Summary; onPick: (f: 'all' | 'due' | Status) => void }) {
  const tiles: { label: string; n: number; f: 'all' | 'due' | Status; hot?: boolean }[] = [
    { label: 'In the book', n: summary.total, f: 'all' },
    { label: 'Follow-up due', n: summary.due, f: 'due', hot: summary.due > 0 },
    { label: 'Queued, never written', n: summary.queued, f: 'queued' },
    { label: 'Waiting on them', n: summary.waiting, f: 'emailed' },
    { label: 'Replied', n: summary.replied, f: 'replied' },
    { label: 'Joined', n: summary.joined, f: 'joined' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiles.map((t) => (
        <button key={t.label} onClick={() => onPick(t.f)} className={`${card} p-4 text-left ${t.hot ? 'bg-[#F5B700]' : ''}`}>
          <div className="font-display text-3xl font-semibold tabular-nums">{t.n}</div>
          <div className="text-[10px] uppercase tracking-[0.15em] font-mono text-[#161616]/60 mt-1">{t.label}</div>
        </button>
      ))}
    </div>
  );
}

function Finder({ configured, book, onAdded }: { configured: Configured; book: Prospect[]; onAdded: (n: number, skipped: string[]) => void }) {
  const [query, setQuery] = useState(QUERIES[0]);
  const [min, setMin] = useState(10000);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const run = async () => {
    setBusy(true);
    setErr('');
    setResults(null);
    setPicked(new Set());
    try {
      const r = await fetch('/api/admin/partner-desk/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, minSubscribers: min, pages: 2 }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Discovery failed');
      setResults(j.candidates || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Discovery failed');
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!picked.size) return;
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/admin/partner-desk/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, minSubscribers: min, pages: 2, add: [...picked].map((channelId) => ({ channelId })) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not add');
      onAdded(j.added, j.skipped || []);
      setResults((rs) => (rs || []).map((c) => (picked.has(c.channelId) ? { ...c, inBook: true } : c)));
      setPicked(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add');
    } finally {
      setBusy(false);
    }
  };

  const bookCount = book.filter((p) => p.source === 'youtube').length;

  return (
    <section className={`${card} p-5 sm:p-6 space-y-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Find creators</h2>
        <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-[#161616]/60">
          {configured.youtube ? `YouTube Data API via ${configured.youtubeVia === 'key' ? 'API key' : 'the connected channel'}. ${bookCount} in the book came from here.` : 'Not set up yet'}
        </span>
      </div>
      {!configured.youtube ? (
        <div className="bg-[#FBF6EA] border-2 border-dashed border-[#161616]/40 rounded-xl p-4 font-body text-sm text-[#3A3733]">
          Two ways to switch this on, either one works: set <code className="font-mono">YOUTUBE_API_KEY</code> in Vercel (Google Cloud, YouTube Data API v3, free), or connect the channel at{' '}
          <a href="/admin/youtube" className="underline decoration-[#F5B700] decoration-2 underline-offset-2">/admin/youtube</a>. Until then, add people by hand or paste a CSV below.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {QUERIES.map((q) => (
              <button key={q} onClick={() => setQuery(q)} className={`px-3 py-1.5 text-[11px] font-body rounded-full border border-[#161616]/40 ${query === q ? 'bg-[#F5B700]' : 'bg-white hover:bg-[#FBF6EA]'}`}>{q}</button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} className={input} placeholder="Or type your own: what do their videos talk about?" />
            <select value={min} onChange={(e) => setMin(Number(e.target.value))} className={`${input} sm:w-32`}>
              {MIN_SUBS.map((m) => <option key={m.v} value={m.v}>{m.label} subs</option>)}
            </select>
            <button onClick={run} disabled={busy || !query.trim()} className={btnGold}>{busy ? 'Searching' : 'Search YouTube'}</button>
          </div>
          {err && <div className="font-body text-sm text-[#E0301E]">{err}</div>}
          {results && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-body text-sm text-[#3A3733]">{results.length ? `${results.length} channels at ${fmtFollowers(min)} or more. ${results.filter((c) => c.email).length} publish an email.` : 'Nothing at that size for that query. Try a broader phrase or a lower floor.'}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPicked(new Set(results.filter((c) => !c.inBook).map((c) => c.channelId)))} className={btnGhost} disabled={!results.length}>Select all new</button>
                  <button onClick={add} disabled={busy || !picked.size} className={btnInk}>Add {picked.size || ''} to the book</button>
                </div>
              </div>
              {results.length > 0 && (
                <div className="border-2 border-[#161616] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {results.map((c) => (
                        <tr key={c.channelId} className={`border-b border-[#161616]/10 ${c.inBook ? 'opacity-50' : ''}`}>
                          <td className="px-3 py-2 w-8">
                            <input type="checkbox" disabled={c.inBook} checked={picked.has(c.channelId)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(c.channelId); else n.delete(c.channelId); return n; })} aria-label={`Pick ${c.name}`} />
                          </td>
                          <td className="px-3 py-2">
                            <a href={c.url} target="_blank" rel="noreferrer" className="font-sans font-bold underline decoration-[#F5B700] decoration-2 underline-offset-2">{c.name}</a>
                            <div className="font-body text-xs text-[#3A3733] line-clamp-1">{c.description || 'No description'}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs tabular-nums whitespace-nowrap">{fmtFollowers(c.subscribers)}</td>
                          <td className="px-3 py-2 font-mono text-xs hidden sm:table-cell">{c.email || <span className="text-[#161616]/40">no email listed</span>}</td>
                          <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#161616]/60 whitespace-nowrap hidden md:table-cell">{c.inBook ? 'In the book' : c.tier || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AddPanel({ onAdded, onError }: { onAdded: (n: number, skipped: string[]) => void; onError: (m: string) => void }) {
  const blank = { name: '', kind: 'creator' as Kind, email: '', handle: '', platform: 'Instagram', followers: '', niche: '', website: '' };
  const [form, setForm] = useState(blank);
  const [csv, setCsv] = useState('');
  const [mode, setMode] = useState<'one' | 'csv'>('one');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = mode === 'csv'
        ? { csv }
        : { prospect: { ...form, followers: form.followers ? Number(form.followers.replace(/[^0-9]/g, '')) : null, source: 'manual' } };
      const r = await fetch('/api/admin/partner-desk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not add');
      onAdded(j.added, j.skipped || []);
      setForm(blank);
      setCsv('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${card} p-5 sm:p-6 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Add to the book</h2>
        <div className="flex gap-2">
          <button onClick={() => setMode('one')} className={`${btnGhost} ${mode === 'one' ? 'bg-[#F5B700]' : ''}`}>One person</button>
          <button onClick={() => setMode('csv')} className={`${btnGhost} ${mode === 'csv' ? 'bg-[#F5B700]' : ''}`}>Paste a CSV</button>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'one' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input required value={form.name} onChange={set('name')} className={input} placeholder="Name or organisation" />
            <select value={form.kind} onChange={set('kind')} className={input}>
              <option value="creator">Creator</option>
              <option value="referral">Referral pro</option>
              <option value="community">Community</option>
            </select>
            <input type="email" value={form.email} onChange={set('email')} className={input} placeholder="Email (needed for a letter)" />
            <input value={form.handle} onChange={set('handle')} className={input} placeholder="@handle" />
            <select value={form.platform} onChange={set('platform')} className={input}>
              {['Instagram', 'YouTube', 'TikTok', 'X', 'LinkedIn', 'Facebook', 'Newsletter', 'In person'].map((p) => <option key={p}>{p}</option>)}
            </select>
            <input value={form.followers} onChange={set('followers')} className={input} placeholder="Followers, e.g. 12000" inputMode="numeric" />
            <input value={form.niche} onChange={set('niche')} className={input} placeholder="What they are known for (goes in the letter)" />
            <input value={form.website} onChange={set('website')} className={input} placeholder="Website" />
          </div>
        ) : (
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={5} className={`${input} font-mono text-xs`} placeholder={'name,email,kind,handle,platform,followers,niche,website\nJane Builder,jane@example.com,creator,janebuilds,YouTube,42000,small business marketing,janebuilds.com'} />
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="font-body text-xs text-[#3A3733]">{mode === 'csv' ? 'Header row optional. Kind is creator, referral or community. Anyone already in the book is skipped.' : 'Duplicates by email or handle are refused, so the same person is never written to twice.'}</span>
          <button type="submit" disabled={busy} className={btnGold}>{busy ? 'Adding' : mode === 'csv' ? 'Import' : 'Add'}</button>
        </div>
      </form>
    </section>
  );
}

function Row({ p, open, onToggle, onChange, onRemoved, onNotice, onError, emailReady }: { p: Prospect; open: boolean; onToggle: () => void; onChange: (p: Prospect) => void; onRemoved: () => void; onNotice: (m: string) => void; onError: (m: string) => void; emailReady: boolean }) {
  const due = isDue(p);
  return (
    <>
      <tr onClick={onToggle} className={`border-b border-[#161616]/10 cursor-pointer hover:bg-[#FBF6EA] ${due ? 'bg-[#F5B700]/20' : ''}`}>
        <td className="px-4 py-3">
          <div className="font-sans font-bold">{p.name}</div>
          <div className="font-mono text-[11px] text-[#161616]/60">{[p.handle ? `@${p.handle.replace(/^@/, '')}` : '', p.platform, p.niche].filter(Boolean).join(' · ')}</div>
        </td>
        <td className="px-3 py-3 hidden md:table-cell font-mono text-[10px] uppercase tracking-[0.15em]">{KIND_LABEL[p.kind]}</td>
        <td className="px-3 py-3 hidden sm:table-cell font-mono text-xs tabular-nums">{fmtFollowers(p.followers)}</td>
        <td className="px-3 py-3">
          <span className={`inline-block px-2 py-1 rounded-full border border-[#161616]/40 font-mono text-[10px] uppercase tracking-[0.15em] ${due ? 'bg-[#F5B700]' : p.status === 'joined' ? 'bg-emerald-200' : p.status === 'replied' ? 'bg-[#1E50C8]/15' : 'bg-white'}`}>
            {due ? 'Follow-up due' : STATUS_LABEL[p.status]}{p.step ? ` · ${p.step}/3` : ''}
          </span>
        </td>
        <td className="px-3 py-3 hidden lg:table-cell font-mono text-xs">{p.status === 'emailed' && p.next_at ? fmtDate(p.next_at) : p.email ? '' : 'no email'}</td>
        <td className="px-3 py-3 text-right font-mono text-xs text-[#161616]/50">{open ? 'close' : 'open'}</td>
      </tr>
      {open && (
        <tr className="border-b-2 border-[#161616]">
          <td colSpan={6} className="p-0">
            <Card p={p} onChange={onChange} onRemoved={onRemoved} onNotice={onNotice} onError={onError} emailReady={emailReady} />
          </td>
        </tr>
      )}
    </>
  );
}

function Card({ p, onChange, onRemoved, onNotice, onError, emailReady }: { p: Prospect; onChange: (p: Prospect) => void; onRemoved: () => void; onNotice: (m: string) => void; onError: (m: string) => void; emailReady: boolean }) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState(p.email || '');
  const [kind, setKind] = useState<Kind>(p.kind);
  const [busy, setBusy] = useState('');

  const loadLetter = useCallback(async () => {
    const r = await fetch(`/api/admin/partner-desk/${p.id}/letter`, { cache: 'no-store' });
    const j = (await r.json()) as Letter;
    setLetter(j);
    setSubject(j.letter?.subject || '');
    setBody(j.letter?.body || '');
  }, [p.id]);

  useEffect(() => {
    loadLetter();
  }, [loadLetter, p.step, p.kind]);

  const patch = async (data: Record<string, unknown>, label: string) => {
    setBusy(label);
    try {
      const r = await fetch(`/api/admin/partner-desk/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not save');
      onChange(j.prospect);
      return true;
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save');
      return false;
    } finally {
      setBusy('');
    }
  };

  const send = async () => {
    if (!window.confirm(`Send "${subject}" to ${p.name} <${p.email}> now?`)) return;
    setBusy('send');
    try {
      const r = await fetch(`/api/admin/partner-desk/${p.id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, body }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Send failed');
      onChange(j.prospect);
      onNotice(`Sent to ${p.name}.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${p.name} from the book? Their history goes with them.`)) return;
    setBusy('remove');
    await fetch(`/api/admin/partner-desk/${p.id}`, { method: 'DELETE' });
    setBusy('');
    onRemoved();
  };

  const dmFor = (): { label: string; text: string }[] => {
    if (!letter) return [];
    return [
      { label: 'Instagram DM', text: letter.dms.instagram },
      { label: 'TikTok DM', text: letter.dms.tiktok },
      { label: 'X DM', text: letter.dms.x },
      { label: 'LinkedIn note', text: letter.dms.linkedin },
    ];
  };

  const closed = p.status === 'joined' || p.status === 'passed';
  const spent = letter && !letter.letter;

  return (
    <div className="bg-[#FBF6EA] p-4 sm:p-6 grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">{spent ? 'All three letters sent' : letter?.letter ? `${letter.letter.label} · letter ${(letter.step || 0) + 1} of ${letter.of}` : 'Loading the letter'}</span>
          {p.last_contacted_at && <span className="font-mono text-[10px] text-[#161616]/60">last contact {fmtDate(p.last_contacted_at)}</span>}
        </div>
        {!spent && letter?.letter && (
          <>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} aria-label="Subject" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className={`${input} font-body leading-relaxed`} aria-label="Letter" />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={send} disabled={!!busy || closed || !p.email || !emailReady} className={btnGold}>{busy === 'send' ? 'Sending' : p.email ? `Send to ${p.email}` : 'Send (needs an email)'}</button>
              <button onClick={loadLetter} className={btnGhost} disabled={!!busy}>Reset to the template</button>
              {!emailReady && <span className="font-body text-xs text-[#E0301E]">RESEND_API_KEY is not set, so mail cannot leave from here.</span>}
              {!p.email && <span className="font-body text-xs text-[#3A3733]">No email on file. Add one on the right, or copy a DM.</span>}
            </div>
          </>
        )}
        {spent && <div className="font-body text-sm text-[#3A3733]">Three letters went out and nobody answered. Mark them passed, or replied if they did.</div>}
        <div className="flex flex-wrap gap-2 pt-1">
          {dmFor().map((d) => (
            <button key={d.label} onClick={async () => { if (await copy(d.text)) { onNotice(`${d.label} copied.`); if (p.status === 'queued') patch({ status: 'dm_sent' }, 'dm'); } }} className={btnGhost}>Copy {d.label}</button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {letter?.profiles.map((l) => <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className={`${btnGhost} bg-white`}>{l.label}</a>)}
          {letter?.research.map((l) => <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className={`${btnGhost} border-dashed`}>{l.label}</a>)}
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="flex gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="Email" />
            <button onClick={() => patch({ email }, 'email')} disabled={!!busy || email === (p.email || '')} className={btnGhost}>Save</button>
          </div>
          <div className="flex gap-2">
            <select value={kind} onChange={(e) => { const k = e.target.value as Kind; setKind(k); patch({ kind: k }, 'kind'); }} className={input}>
              <option value="creator">Creator letter</option>
              <option value="referral">Referral pro letter</option>
              <option value="community">Community letter</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => patch({ status: 'replied' }, 'status')} disabled={!!busy || p.status === 'replied'} className={`${btnGhost} bg-[#1E50C8]/10`}>They replied</button>
          <button onClick={() => patch({ status: 'joined' }, 'status')} disabled={!!busy || p.status === 'joined'} className={`${btnGhost} bg-emerald-100`}>Joined</button>
          <button onClick={() => patch({ status: 'passed' }, 'status')} disabled={!!busy || p.status === 'passed'} className={btnGhost}>Passed</button>
          <button onClick={() => patch({ status: 'queued', step: 0 }, 'status')} disabled={!!busy || p.status === 'queued'} className={btnGhost}>Back to queued</button>
          <button onClick={remove} disabled={!!busy} className={`${btnGhost} text-[#E0301E]`}>Remove</button>
        </div>
        <div className="flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={input} placeholder="A note for the record" onKeyDown={async (e) => { if (e.key === 'Enter' && note.trim()) { e.preventDefault(); if (await patch({ note }, 'note')) setNote(''); } }} />
          <button onClick={async () => { if (note.trim() && (await patch({ note }, 'note'))) setNote(''); }} disabled={!!busy || !note.trim()} className={btnGhost}>Add</button>
        </div>
        {p.notes && <p className="font-body text-xs text-[#3A3733] whitespace-pre-wrap border-l-2 border-[#F5B700] pl-3">{p.notes}</p>}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/60 font-mono font-bold">History</div>
          {p.history?.length ? (
            <ul className="space-y-1">
              {[...p.history].reverse().map((h, i) => (
                <li key={i} className="font-body text-xs text-[#3A3733]"><span className="font-mono text-[#161616]/50">{new Date(h.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> {h.type === 'email' ? '✉' : h.type === 'note' ? '✎' : '•'} {h.detail}</li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-xs text-[#161616]/50">Nothing yet. Added {fmtDate(p.created_at)} from {p.source}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
