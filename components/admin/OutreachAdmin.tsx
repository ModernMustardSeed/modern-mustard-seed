'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminHeader from './AdminHeader';

type Message = { id: string; touch: number; channel: string; subject: string | null; body: string; status: string };
type Prospect = {
  id: string; name: string; channel: string | null; contact: string | null; channel_type: string;
  tier: number; fit_score: number | null; fit_breakdown: { rationale?: string } | null; status: string;
  notes: string | null; messages: Message[];
};

const CHANNELS = ['email', 'instagram', 'linkedin', 'x', 'youtube', 'warm'];
const STATUS_COLOR: Record<string, string> = {
  new: 'bg-[#161616]/[0.06] text-[#161616]/65 border-[#161616]/15',
  drafted: 'bg-[#F5B700]/20 text-[#161616] border-[#161616]/25',
  queued: 'bg-amber-100 text-amber-800 border-amber-800/25',
  sent: 'bg-blue-100 text-[#1E50C8] border-[#1E50C8]/30',
  replied: 'bg-emerald-100 text-emerald-800 border-emerald-800/25',
  joined: 'bg-emerald-600 text-white border-[#161616]/20',
  declined: 'bg-[#161616]/[0.06] text-[#161616]/45 border-[#161616]/15',
  opted_out: 'bg-red-100 text-[#E0301E] border-[#E0301E]/30',
};
const empty = { name: '', channel: '', contact: '', channel_type: 'email', tier: 2, source: '', notes: '' };

export default function OutreachAdmin() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...empty });
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/outreach');
      const json = await res.json();
      if (res.ok) { setProspects(json.prospects); setCounts(json.counts ?? {}); }
      else setError(json.error ?? 'Failed to load');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addProspect = async () => {
    if (!form.name.trim() || adding) return;
    setAdding(true); setError('');
    try {
      const res = await fetch('/api/admin/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (res.ok) { setForm({ ...empty }); await load(); }
      else setError(json.error ?? 'Could not add');
    } finally { setAdding(false); }
  };

  const patch = async (id: string, payload: object) => {
    setBusy(id);
    try { await fetch(`/api/admin/outreach/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); await load(); }
    finally { setBusy(null); }
  };

  const draft = async (id: string) => {
    setBusy(id); setError('');
    try {
      const res = await fetch(`/api/admin/outreach/${id}/draft`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? 'Draft failed');
      await load(); setOpen(id);
    } finally { setBusy(null); }
  };

  const del = async (id: string) => {
    setBusy(id);
    try { await fetch(`/api/admin/outreach/${id}`, { method: 'DELETE' }); await load(); }
    finally { setBusy(null); }
  };

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600); } catch {}
  };

  const PIPE = ['new', 'drafted', 'queued', 'sent', 'replied', 'joined', 'declined'];

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="outreach" title="Outreach" onRefresh={load} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <div className="bg-white border-2 border-[#E0301E] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4 mb-6"><p className="text-[#E0301E] text-sm font-body">{error}</p></div>}

        {/* Pipeline */}
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-8">
          {PIPE.map((s) => (
            <div key={s} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-3 text-center">
              <div className="font-sans text-xl font-semibold text-[#161616]">{counts[s] ?? 0}</div>
              <div className="text-[8px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono mt-1">{s}</div>
            </div>
          ))}
        </div>

        {/* Add prospect */}
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-4">Add a prospect</span>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className={inp} />
            <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="Their work / channel" className={inp} />
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Email or handle" className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.channel_type} onChange={(e) => setForm({ ...form, channel_type: e.target.value })} className={inp}>
                {CHANNELS.map((c) => <option key={c} value={c} className="bg-white">{c}</option>)}
              </select>
              <select value={form.tier} onChange={(e) => setForm({ ...form, tier: Number(e.target.value) })} className={inp}>
                {[1, 2, 3, 4].map((t) => <option key={t} value={t} className="bg-white">Tier {t}</option>)}
              </select>
            </div>
          </div>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="What you know about their public work (the AI personalizes from this, and only this)." className={`${inp} mt-3 w-full resize-none`} />
          <div className="flex justify-end mt-3">
            <button onClick={addProspect} disabled={adding || !form.name.trim()} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all rounded-lg disabled:opacity-50">{adding ? 'Adding...' : 'Add prospect'}</button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-center text-[#161616]/60 py-12 font-body italic">Loading...</p>
        ) : prospects.length === 0 ? (
          <p className="text-[#161616]/60 font-body text-sm italic text-center py-8">No prospects yet. Add the warm circle first, they convert best.</p>
        ) : (
          <div className="space-y-3">
            {prospects.map((p) => {
              const msg = p.messages.find((m) => m.touch === 1);
              const edit = edits[p.id] ?? { subject: msg?.subject ?? '', body: msg?.body ?? '' };
              const isOpen = open === p.id;
              return (
                <div key={p.id} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
                  <div className="p-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => setOpen(isOpen ? null : p.id)}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#161616] font-body font-medium">{p.name}</span>
                        <span className="text-[9px] uppercase tracking-[0.15em] font-mono text-[#161616]/50">{p.channel_type} . T{p.tier}</span>
                        {p.fit_score != null && <span className="text-[9px] font-mono text-[#E0301E]">fit {p.fit_score}/25</span>}
                        <span className={`text-[9px] uppercase tracking-[0.15em] font-mono font-semibold px-2 py-0.5 rounded border ${STATUS_COLOR[p.status] ?? STATUS_COLOR.new}`}>{p.status}</span>
                      </div>
                      {p.channel && <p className="text-[#161616]/60 font-body text-xs truncate mt-0.5">{p.channel}{p.contact ? ` . ${p.contact}` : ''}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!msg && <button onClick={(e) => { e.stopPropagation(); draft(p.id); }} disabled={busy === p.id} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] rounded-full disabled:opacity-50">{busy === p.id ? '...' : 'Draft with AI'}</button>}
                      <span className="text-[#161616]/45 text-xs">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-[#161616]/10 pt-4">
                      {p.fit_breakdown?.rationale && <p className="text-[#3A3733] font-body text-xs italic mb-3">Fit: {p.fit_breakdown.rationale}</p>}
                      {p.notes && <p className="text-[#161616]/60 font-body text-xs mb-3"><span className="text-[#161616]/45">Notes:</span> {p.notes}</p>}

                      {msg ? (
                        <>
                          {msg.channel === 'email' && (
                            <input value={edit.subject} onChange={(e) => setEdits({ ...edits, [p.id]: { ...edit, subject: e.target.value } })} placeholder="Subject" className={`${inp} w-full mb-2`} />
                          )}
                          <textarea value={edit.body} onChange={(e) => setEdits({ ...edits, [p.id]: { ...edit, body: e.target.value } })} rows={10} className={`${inp} w-full resize-none font-body leading-relaxed`} />
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <button onClick={() => patch(p.id, { action: 'editMessage', messageId: msg.id, subject: edit.subject, body: edit.body })} disabled={busy === p.id} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold text-[#161616]/55 hover:text-[#161616]">Save edits</button>
                            <button onClick={() => copy(edit.body, p.id)} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold text-[#161616]/55 hover:text-[#161616]">{copied === p.id ? 'Copied' : 'Copy'}</button>
                            {(p.status === 'drafted') && (
                              <button onClick={() => patch(p.id, { action: 'send', messageId: msg.id })} disabled={busy === p.id} className="px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-[#161616]/20 rounded-lg disabled:opacity-50">Approve</button>
                            )}
                            {p.status === 'queued' && (
                              <button onClick={() => patch(p.id, { action: 'markSent', messageId: msg.id })} disabled={busy === p.id} className="px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-white bg-[#1E50C8] hover:bg-blue-800 border border-[#161616]/20 rounded-lg disabled:opacity-50">Mark sent</button>
                            )}
                            <span className="flex-1" />
                            <select value={p.status} onChange={(e) => patch(p.id, { action: 'setStatus', status: e.target.value })} className={`${inp} text-xs`}>
                              {['new', 'drafted', 'queued', 'sent', 'replied', 'joined', 'declined', 'opted_out'].map((s) => <option key={s} value={s} className="bg-white">{s}</option>)}
                            </select>
                            <button onClick={() => del(p.id)} className="text-[10px] uppercase tracking-[0.15em] font-sans font-semibold text-[#E0301E]/70 hover:text-[#E0301E]">Delete</button>
                          </div>
                          {p.status === 'queued' && <p className="text-amber-800 font-body text-xs mt-2">Queued for you to send by hand (copy above), then Mark sent. Set OUTREACH_FROM (a separate sending domain) to auto-send emails.</p>}
                        </>
                      ) : (
                        <p className="text-[#161616]/60 font-body text-sm">No draft yet. Tap "Draft with AI" to score fit and write the first touch.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const inp = 'bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';
