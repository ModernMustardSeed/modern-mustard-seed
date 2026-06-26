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
import Modal from '@/components/ui/Modal';
import CallSession from './CallSession';
import CallCard from './CallCard';

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

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-[#2D6A4F] text-white border-[#2D6A4F]';
  if (score >= 65) return 'bg-[#1E50C8] text-white border-[#1E50C8]';
  if (score >= 50) return 'bg-[#F5B700] text-[#161616] border-[#161616]';
  return 'bg-[#9B3022] text-white border-[#9B3022]';
}

export default function LeadTracker({ currentEmail, currentName, bookDisplay }: { currentEmail: string; currentName: string; bookDisplay: string }) {
  const [rows, setRows] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scriptFor, setScriptFor] = useState<Prospect | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  // Add form
  const [add, setAdd] = useState({ business: '', city: 'Kalispell', phone: '', website: '', email: '', type: 'Restaurant', channel: 'cold-call', notes: '' });
  const [adding, setAdding] = useState(false);

  // Rows whose website is being auto-audited, and rows whose site/email is
  // being looked up, in the background.
  const [auditing, setAuditing] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState<Set<string>>(new Set());

  // Patch a single row in place so the table, the call card, and the call
  // session all stay in sync without a full reload.
  const patchRow = (id: string, patch: Partial<Prospect>) =>
    setRows((r) => r.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  // Deep link from the inbox / alerts: /admin/prospects?focus=<id> opens that
  // lead's card straight away (once rows are loaded), then clears the param.
  const [focusHandled, setFocusHandled] = useState(false);
  useEffect(() => {
    if (focusHandled || loading || rows.length === 0) return;
    const focus = new URLSearchParams(window.location.search).get('focus');
    if (focus) {
      const target = rows.find((r) => r.id === focus);
      if (target) {
        setScriptFor(target);
        window.history.replaceState({}, '', '/admin/prospects');
      }
      setFocusHandled(true);
    }
  }, [focusHandled, loading, rows]);

  // Fire-and-forget audit the moment a prospect with a website is added, so the
  // card is armed with a score and talking points before the rep ever dials.
  const autoAudit = async (p: Prospect) => {
    if (!p.website) return;
    setAuditing((s) => new Set(s).add(p.id));
    try {
      const res = await fetch(`/api/admin/prospects/${p.id}/audit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: p.website }),
      });
      const json = await res.json();
      if (res.ok && json.report) {
        patchRow(p.id, {
          audit_url: json.url ?? p.website,
          audit_score: Math.round(json.report.overall_score),
          audit_json: json.report,
          audit_at: new Date().toISOString(),
        });
      }
    } catch {
      /* silent: the rep can re-run it from the card */
    } finally {
      setAuditing((s) => { const n = new Set(s); n.delete(p.id); return n; });
    }
  };

  // The full hands-off arm: find the site + email, then audit it. Runs in the
  // background the moment a business is added, so the rep just types a name and
  // city and comes back to a scored, emailable lead.
  const enrichThenAudit = async (p: Prospect) => {
    let website = p.website ?? null;
    if (!website || !p.email) {
      setEnriching((s) => new Set(s).add(p.id));
      try {
        const res = await fetch(`/api/admin/prospects/${p.id}/enrich`, { method: 'POST' });
        const json = await res.json();
        if (res.ok) {
          patchRow(p.id, { website: json.website ?? null, email: json.email ?? null, phone: json.phone ?? p.phone });
          website = json.website ?? website;
        }
      } catch {
        /* silent: the rep can use "Find site & email" from the card */
      } finally {
        setEnriching((s) => { const n = new Set(s); n.delete(p.id); return n; });
      }
    }
    if (website) await autoAudit({ ...p, website });
  };

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
        body: JSON.stringify({ business: add.business, city: add.city, phone: add.phone, website: add.website, email: add.email, channel: add.channel, notes: composedNotes }),
      });
      const json = await res.json();
      if (json.needsSetup) setNeedsSetup(true);
      else if (res.ok) {
        setRows((r) => [json.prospect, ...r]);
        setAdd((a) => ({ ...a, business: '', phone: '', website: '', email: '', notes: '' }));
        // Find the site + email (if not supplied), then audit, all in the background.
        void enrichThenAudit(json.prospect);
      } else setError(json.error ?? 'Could not add');
    } catch {
      setError('Network error');
    } finally {
      setAdding(false);
    }
  };

  const updateStatus = async (id: string, status: ProspectStatus) => {
    patchRow(id, { status });
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      // Good leads (booked/won) auto-promote into the pipeline server-side; reflect the link.
      const json = await res.json().catch(() => ({}));
      if (json.promoted && json.leadId) patchRow(id, { lead_id: json.leadId });
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

  const cities = useMemo(() => Array.from(new Set(rows.map((r) => r.city).filter(Boolean))) as string[], [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (scope === 'mine' && p.rep_email !== currentEmail.toLowerCase()) return false;
      if (cityFilter && p.city !== cityFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (q && !(`${p.business} ${p.city ?? ''} ${p.phone ?? ''} ${p.email ?? ''} ${p.website ?? ''} ${p.notes ?? ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, scope, cityFilter, statusFilter, search, currentEmail]);

  const callable = useMemo(() => filtered.filter((p) => p.status === 'to-contact'), [filtered]);

  const mine = rows.filter((p) => p.rep_email === currentEmail.toLowerCase());
  const stats = {
    toContact: mine.filter((p) => p.status === 'to-contact').length,
    booked: mine.filter((p) => p.status === 'booked' || p.status === 'won').length,
    inPipeline: mine.filter((p) => !!p.lead_id).length,
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 max-w-2xl">
              {[
                { label: 'Your list', value: stats.total },
                { label: 'To contact', value: stats.toContact },
                { label: 'Booked / won', value: stats.booked },
                { label: 'In pipeline', value: stats.inPipeline },
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
              </div>
              <div className="flex flex-wrap items-end gap-3 mt-3">
                <label className="flex-1 min-w-[200px]">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Website</span>
                  <input value={add.website} onChange={(e) => setAdd((a) => ({ ...a, website: e.target.value }))} placeholder="glacierdiner.com" className={`${inp} w-full`} />
                </label>
                <label className="flex-1 min-w-[200px]">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-1">Email</span>
                  <input value={add.email} onChange={(e) => setAdd((a) => ({ ...a, email: e.target.value }))} type="email" placeholder="owner@glacierdiner.com" className={`${inp} w-full`} />
                </label>
                <button type="submit" disabled={adding} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50 whitespace-nowrap">{adding ? 'Adding...' : 'Add to list'}</button>
              </div>
              <input value={add.notes} onChange={(e) => setAdd((a) => ({ ...a, notes: e.target.value }))} placeholder="Optional note (old site, busy at lunch, ask for owner...)" className={`${inp} w-full mt-3`} />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {SUGGESTED_CITIES.map((c) => (
                  <button type="button" key={c} onClick={() => setAdd((a) => ({ ...a, city: c }))} className={`px-2.5 py-1 text-[10px] font-sans font-semibold rounded-full border-2 transition-all ${add.city === c ? 'bg-[#161616] text-[#FBF6EA] border-[#161616]' : 'bg-white text-[#161616] border-[#161616]/30 hover:border-[#161616]'}`}>{c}</button>
                ))}
              </div>
            </form>

            {/* Start a focused calling session over the leads in view */}
            {callable.length > 0 && (
              <button
                onClick={() => setSessionOpen(true)}
                className="w-full sm:w-auto mb-4 inline-flex items-center justify-center gap-2 px-6 py-3 text-[12px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                ▶ Start calling ({callable.length})
              </button>
            )}

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
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="border-b-2 border-[#161616]/15">
                      {['Business', 'City', 'Phone', 'Audit', 'How', 'Status', 'Rep', ''].map((h) => (
                        <th key={h} className="text-left text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-medium px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-[#161616]/10 align-top">
                        <td className="px-4 py-3">
                          <button onClick={() => setScriptFor(p)} className="font-body font-medium text-[#161616] text-left hover:text-[#1E50C8] hover:underline underline-offset-2">{p.business}</button>
                          <div className="flex items-center gap-1.5 mt-1">
                            {p.website && <span title={p.website} className="text-[#2D6A4F] text-[11px]" aria-label="has website">🌐</span>}
                            {p.email && <span title={p.email} className="text-[#1E50C8] text-[11px]" aria-label="has email">✉</span>}
                            {p.lead_id && <span className="text-[8px] uppercase tracking-[0.15em] font-mono font-bold text-white bg-[#2D6A4F] rounded px-1.5 py-0.5">In pipeline</span>}
                          </div>
                          {p.notes && <p className="text-[#161616]/55 text-xs mt-1">{p.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-[#3A3733] font-body">{p.city ?? '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#3A3733] whitespace-nowrap">{p.phone ?? '-'}</td>
                        <td className="px-4 py-3">
                          {enriching.has(p.id) ? (
                            <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#2D6A4F] animate-pulse">finding…</span>
                          ) : auditing.has(p.id) ? (
                            <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#1E50C8] animate-pulse">auditing…</span>
                          ) : p.audit_score != null ? (
                            <span className={`text-[10px] font-mono font-bold rounded-full border-2 px-2 py-0.5 ${scoreColor(p.audit_score)}`}>{p.audit_score}</span>
                          ) : (
                            <span className="text-[#161616]/30 text-xs">-</span>
                          )}
                        </td>
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
                          <button onClick={() => setScriptFor(p)} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full hover:bg-[#FFD23F] transition-all">Open</button>
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
          // Render from the live row so audit, email, and pipeline updates made
          // inside the card reflect immediately.
          const liveProspect = rows.find((r) => r.id === scriptFor.id) ?? scriptFor;
          return (
            <Modal
              open
              onClose={() => setScriptFor(null)}
              headerTone="dark"
              eyebrow="Call card"
              title={liveProspect.business}
              subtitle={liveProspect.city ?? undefined}
            >
              <CallCard
                prospect={liveProspect}
                repName={currentName}
                bookDisplay={bookDisplay}
                onPatch={patchRow}
              />
            </Modal>
          );
        })()}

        {sessionOpen && (
          <CallSession
            leads={callable}
            repName={currentName}
            bookDisplay={bookDisplay}
            onStatus={(id, status) => updateStatus(id, status)}
            onPatch={patchRow}
            onClose={() => setSessionOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
