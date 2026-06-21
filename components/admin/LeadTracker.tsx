'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from './AdminHeader';
import {
  type Prospect,
  type ProspectStatus,
  CHANNELS,
  STATUSES,
  SUGGESTED_CITIES,
  SETUP_SQL,
} from '@/lib/prospects';
import { buildLeadScript } from '@/lib/lead-script';

const SUPABASE_SQL_URL = 'https://supabase.com/dashboard/project/qqvohlvhynmtavdbvkha/sql/new';

// Business types for the add form, so a manually added lead also gets a
// personalized script (the category is stored as the leading token of notes).
const SCRIPT_TYPES = ['Restaurant', 'Salon / spa', 'Auto service', 'Dentist', 'Clinic', 'Vet', 'Gym', 'Real estate', 'Law firm', 'Insurance', 'Accounting / finance', 'Trade', 'Cleaners', 'Other service'];

const STATUS_STYLE: Record<ProspectStatus, string> = {
  'to-contact': 'bg-white text-[#161616] border-[#161616]/30',
  contacted: 'bg-[#FFF8E6] text-[#161616] border-[#161616]/40',
  demoed: 'bg-[#1E50C8] text-white border-[#1E50C8]',
  booked: 'bg-[#2D6A4F] text-white border-[#2D6A4F]',
  won: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  'not-interested': 'bg-[#9B3022] text-white border-[#9B3022]',
};

export default function LeadTracker({ currentEmail, currentName, bookDisplay }: { currentEmail: string; currentName: string; bookDisplay: string }) {
  const [rows, setRows] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scriptFor, setScriptFor] = useState<Prospect | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);

  // Add form
  const [add, setAdd] = useState({ business: '', city: 'Kalispell', phone: '', type: 'Restaurant', channel: 'cold-call', notes: '' });
  const [adding, setAdding] = useState(false);

  // Filters
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/prospects');
      const json = await res.json();
      if (json.needsSetup) {
        setNeedsSetup(true);
      } else if (res.ok) {
        setRows(json.prospects);
        setNeedsSetup(false);
      } else {
        setError(json.error ?? 'Failed to load');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adding || !add.business.trim()) return;
    setAdding(true);
    setError('');
    try {
      // Store the type as the leading token of notes so the per-lead script is personalized.
      const composedNotes = [add.type, add.notes.trim()].filter(Boolean).join(' · ');
      const res = await fetch('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business: add.business, city: add.city, phone: add.phone, channel: add.channel, notes: composedNotes }),
      });
      const json = await res.json();
      if (json.needsSetup) setNeedsSetup(true);
      else if (res.ok) {
        setRows((r) => [json.prospect, ...r]);
        setAdd((a) => ({ ...a, business: '', phone: '', notes: '' }));
      } else setError(json.error ?? 'Could not add');
    } catch {
      setError('Network error');
    } finally {
      setAdding(false);
    }
  };

  const updateStatus = async (id: string, status: ProspectStatus) => {
    setRows((r) => r.map((p) => (p.id === id ? { ...p, status } : p)));
    setBusy(id);
    try {
      await fetch(`/api/admin/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setRows((r) => r.filter((p) => p.id !== id));
    await fetch(`/api/admin/prospects/${id}`, { method: 'DELETE' });
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const cities = useMemo(() => Array.from(new Set(rows.map((r) => r.city).filter(Boolean))) as string[], [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (scope === 'mine' && p.rep_email !== currentEmail.toLowerCase()) return false;
      if (cityFilter && p.city !== cityFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (q && !(`${p.business} ${p.city ?? ''} ${p.phone ?? ''} ${p.notes ?? ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, scope, cityFilter, statusFilter, search, currentEmail]);

  const mine = rows.filter((p) => p.rep_email === currentEmail.toLowerCase());
  const stats = {
    toContact: mine.filter((p) => p.status === 'to-contact').length,
    booked: mine.filter((p) => p.status === 'booked' || p.status === 'won').length,
    total: mine.length,
  };

  const inp = 'bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="tracker" title="Lead Tracker" />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-[#3A3733] font-body mb-6 max-w-2xl">
          Your shared prospecting list. Add the businesses you are working, update each as you go, and check here before you call so two of us never hit the same place twice.
        </p>

        {needsSetup ? (
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-7 max-w-2xl">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-2">One-time setup</span>
            <h2 className="font-display text-2xl font-semibold mb-2">Turn on the Lead Tracker</h2>
            <p className="text-[#3A3733] font-body text-sm mb-4 leading-relaxed">
              This needs its table created once. Open the Supabase SQL editor, paste the snippet below, and run it. Then refresh this page and you are live.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <a href={SUPABASE_SQL_URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-all">Open Supabase SQL editor →</a>
              <button onClick={copySql} className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">{copied ? 'Copied ✓' : 'Copy the SQL'}</button>
              <button onClick={load} className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">I ran it, refresh</button>
            </div>
            <pre className="bg-[#161616] text-[#FBF6EA] rounded-xl p-4 text-[11px] font-mono overflow-x-auto leading-relaxed">{SETUP_SQL}</pre>
          </div>
        ) : (
          <>
            {error && <div className="bg-white border-2 border-[#E0301E] rounded-2xl shadow-[3px_3px_0_0_#161616] p-4 mb-5"><p className="text-[#E0301E] text-sm font-body">{error}</p></div>}

            {/* Your stats */}
            <div className="grid grid-cols-3 gap-3 mb-6 max-w-lg">
              {[
                { label: 'Your list', value: stats.total },
                { label: 'To contact', value: stats.toContact },
                { label: 'Booked / won', value: stats.booked },
              ].map((s) => (
                <div key={s.label} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-4">
                  <div className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono">{s.label}</div>
                  <div className="font-sans text-2xl font-semibold mt-1">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Add form */}
            <form onSubmit={addProspect} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 mb-6">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-3">Add a business to your list</span>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-[180px]">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Business</span>
                  <input value={add.business} onChange={(e) => setAdd((a) => ({ ...a, business: e.target.value }))} required placeholder="Glacier Diner" className={`${inp} w-full`} />
                </label>
                <label className="min-w-[130px]">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">City</span>
                  <input value={add.city} onChange={(e) => setAdd((a) => ({ ...a, city: e.target.value }))} list="city-list" placeholder="Kalispell" className={`${inp} w-full`} />
                  <datalist id="city-list">{SUGGESTED_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
                </label>
                <label className="min-w-[130px]">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Phone</span>
                  <input value={add.phone} onChange={(e) => setAdd((a) => ({ ...a, phone: e.target.value }))} placeholder="(406) 555-0182" className={`${inp} w-full`} />
                </label>
                <label className="min-w-[140px]">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Type</span>
                  <select value={add.type} onChange={(e) => setAdd((a) => ({ ...a, type: e.target.value }))} className={`${inp} w-full`}>
                    {SCRIPT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="min-w-[110px]">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">How</span>
                  <select value={add.channel} onChange={(e) => setAdd((a) => ({ ...a, channel: e.target.value }))} className={`${inp} w-full`}>
                    {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </label>
                <button type="submit" disabled={adding} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50 whitespace-nowrap">{adding ? 'Adding...' : 'Add'}</button>
              </div>
              <input value={add.notes} onChange={(e) => setAdd((a) => ({ ...a, notes: e.target.value }))} placeholder="Optional note (old site, busy at lunch, ask for owner...)" className={`${inp} w-full mt-3`} />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {SUGGESTED_CITIES.map((c) => (
                  <button type="button" key={c} onClick={() => setAdd((a) => ({ ...a, city: c }))} className={`px-2.5 py-1 text-[10px] font-sans font-semibold rounded-full border-2 transition-all ${add.city === c ? 'bg-[#161616] text-[#FBF6EA] border-[#161616]' : 'bg-white text-[#161616] border-[#161616]/30 hover:border-[#161616]'}`}>{c}</button>
                ))}
              </div>
            </form>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex rounded-full border-2 border-[#161616] overflow-hidden">
                <button onClick={() => setScope('mine')} className={`px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold ${scope === 'mine' ? 'bg-[#F5B700] text-[#161616]' : 'bg-white text-[#161616]/60'}`}>Mine</button>
                <button onClick={() => setScope('all')} className={`px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold border-l-2 border-[#161616] ${scope === 'all' ? 'bg-[#F5B700] text-[#161616]' : 'bg-white text-[#161616]/60'}`}>Everyone</button>
              </div>
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={inp}><option value="">All cities</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inp}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search before you call..." className={`${inp} flex-1 min-w-[180px]`} />
            </div>

            {/* Table */}
            {loading ? (
              <p className="text-center text-[#161616]/60 py-12 font-body italic">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-[#161616]/55 font-body text-sm italic py-8 text-center">No prospects yet. Add your first business above, or build a list from Google Maps (see the Training tab, Finding Leads).</p>
            ) : (
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b-2 border-[#161616]/15">
                      {['Business', 'City', 'Phone', 'How', 'Status', 'Rep', ''].map((h) => (
                        <th key={h} className="text-left text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-medium px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-[#161616]/10 align-top">
                        <td className="px-4 py-3">
                          <button onClick={() => { setScriptFor(p); setScriptCopied(false); }} className="font-body font-medium text-[#161616] text-left hover:text-[#1E50C8] hover:underline underline-offset-2">{p.business}</button>
                          {p.notes && <p className="text-[#161616]/55 text-xs mt-0.5">{p.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-[#3A3733] font-body">{p.city ?? '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#3A3733] whitespace-nowrap">{p.phone ?? '-'}</td>
                        <td className="px-4 py-3 text-[#3A3733] font-body text-xs">{CHANNELS.find((c) => c.value === p.channel)?.label ?? p.channel}</td>
                        <td className="px-4 py-3">
                          <select
                            value={p.status}
                            onChange={(e) => updateStatus(p.id, e.target.value as ProspectStatus)}
                            disabled={busy === p.id}
                            className={`text-[10px] uppercase tracking-[0.1em] font-sans font-bold rounded-full border-2 px-2.5 py-1 cursor-pointer focus:outline-none ${STATUS_STYLE[p.status]}`}
                          >
                            {STATUSES.map((s) => <option key={s.value} value={s.value} className="bg-white text-[#161616]">{s.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-[#161616]/60 font-body text-xs whitespace-nowrap">{(p.rep_name || p.rep_email).split(' ')[0]}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => { setScriptFor(p); setScriptCopied(false); }} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full hover:bg-[#FFD23F] transition-all">Call script</button>
                          <button onClick={() => remove(p.id)} className="ml-2 text-[#161616]/35 hover:text-[#9B3022] text-lg leading-none align-middle" title="Remove">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {scriptFor && (() => {
          const s = buildLeadScript(scriptFor, currentName, bookDisplay);
          const telHref = scriptFor.phone ? `tel:${scriptFor.phone.replace(/[^0-9+]/g, '')}` : null;
          const quickSet = (status: ProspectStatus) => { updateStatus(scriptFor.id, status); setScriptFor(null); };
          return (
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-[#161616]/50 backdrop-blur-sm overflow-y-auto" onClick={() => setScriptFor(null)}>
              <div className="bg-[#FBF6EA] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#161616] w-full max-w-2xl my-4" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-[#161616] rounded-t-2xl px-6 py-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold block">Call script {s.category ? '· ' + s.category : ''}</span>
                    <h2 className="font-display text-2xl font-semibold text-[#FBF6EA] mt-1">{scriptFor.business}</h2>
                    <p className="text-[#FBF6EA]/60 font-body text-sm">{scriptFor.city ?? ''}</p>
                  </div>
                  <button onClick={() => setScriptFor(null)} className="text-[#FBF6EA]/70 hover:text-[#FBF6EA] text-2xl leading-none px-1" aria-label="Close">×</button>
                </div>

                <div className="p-6">
                  {/* Dial + copy */}
                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    {telHref ? (
                      <a href={telHref} className="px-5 py-2.5 text-sm font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all">📞 Call {scriptFor.phone}</a>
                    ) : (
                      <span className="text-[#161616]/55 font-body text-sm italic">No phone on file. {scriptFor.notes?.includes('Email:') ? 'Use the email in the notes, or look up the number.' : 'Look the number up on Google Maps, then add it.'}</span>
                    )}
                    <button onClick={() => copyText(s.fullText)} className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">{scriptCopied ? 'Copied ✓' : 'Copy whole script'}</button>
                  </div>

                  <p className="text-[#161616]/55 font-body text-xs mb-4">Read it top to bottom. Pause after each part and let them answer. You are not closing, just booking a quick demo.</p>

                  {/* Steps */}
                  <div className="space-y-2.5">
                    {s.steps.map((step, i) => (
                      <div key={i} className="bg-white border-2 border-[#161616] rounded-xl p-4">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-[#E0301E] font-mono font-bold flex items-center gap-2 mb-1.5"><span className="font-display text-base text-[#F5B700]">{i + 1}</span>{step.label}</span>
                        <p className="font-body text-[16px] leading-relaxed text-[#161616]">{step.line}</p>
                      </div>
                    ))}
                  </div>

                  {/* Voicemail */}
                  <div className="bg-[#FFF8E6] border-2 border-[#161616] rounded-xl p-4 mt-2.5">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#E0301E] font-mono font-bold block mb-1.5">If you get voicemail</span>
                    <p className="font-body text-[15px] leading-relaxed text-[#161616] italic">{s.voicemail}</p>
                  </div>

                  {/* Objections */}
                  <details className="group bg-white border-2 border-[#161616] rounded-xl mt-2.5 overflow-hidden">
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-[#FFF8E6]">
                      <span className="text-[11px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616]">If they push back</span>
                      <span className="text-[#F5B700] text-xl font-bold group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="px-4 pb-4 space-y-3">
                      {s.objections.map((o, i) => (
                        <div key={i}>
                          <p className="font-sans font-bold text-sm text-[#161616]">{o.q}</p>
                          <p className="font-body text-sm text-[#3A3733] leading-relaxed italic">"{o.a}"</p>
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Quick status after the call */}
                  <div className="mt-5 pt-4 border-t-2 border-[#161616]/10">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono font-bold block mb-2">After the call, mark it</span>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => quickSet('contacted')} className="px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">Contacted</button>
                      <button onClick={() => quickSet('booked')} className="px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-white bg-[#2D6A4F] border-2 border-[#2D6A4F] rounded-full hover:opacity-90 transition-all">Booked a demo</button>
                      <button onClick={() => quickSet('not-interested')} className="px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-white bg-[#9B3022] border-2 border-[#9B3022] rounded-full hover:opacity-90 transition-all">Not interested</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
