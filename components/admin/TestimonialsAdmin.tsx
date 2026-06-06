'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminHeader from './AdminHeader';

type Row = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  quote: string;
  outcome: string | null;
  rating: number;
  featured: boolean;
  sort: number;
  status: string;
};

const inp =
  'bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-mustard-500/40 w-full';
const empty = { name: '', role: '', company: '', quote: '', outcome: '', rating: 5 };

export default function TestimonialsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...empty });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/testimonials');
      const j = await res.json().catch(() => null);
      if (res.ok && j) {
        const list: Row[] = j.testimonials || [];
        // Pending submissions float to the top so they get reviewed.
        list.sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));
        setRows(list);
      } else setError((j && j.error) || 'Failed to load');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!form.name.trim() || !form.quote.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ ...empty });
        await load();
      } else {
        const j = await res.json().catch(() => null);
        setError((j && j.error) || 'Could not add');
      }
    } finally {
      setAdding(false);
    }
  };

  const patch = async (id: string, payload: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...payload } : r)));
    try {
      await fetch(`/api/admin/testimonials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      /* optimistic */
    }
  };

  const del = async (id: string) => {
    try {
      await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <AdminHeader active="reviews" title="Reviews" onRefresh={load} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-white/45 text-sm font-body mb-6 max-w-2xl">
          Published reviews appear on the homepage with star schema for search and AI. Add real
          client quotes here. Nothing shows on the site until you publish at least one.
        </p>

        {error && (
          <div className="glass-card p-4 mb-6 border-red-500/30">
            <p className="text-red-300 text-sm font-body">{error}</p>
          </div>
        )}

        {/* Add */}
        <div className="glass-card p-5 mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">
            Add a review
          </span>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" className={inp} />
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role" className={inp} />
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" className={inp} />
          </div>
          <textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder="The quote *" rows={3} className={`${inp} resize-y mb-3`} />
          <div className="grid sm:grid-cols-3 gap-3 items-center">
            <input value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} placeholder="Outcome chip (e.g. 30% more jobs)" className={inp} />
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className={inp}>
              {[5, 4, 3].map((n) => (
                <option key={n} value={n} className="bg-neutral-900">{n} stars</option>
              ))}
            </select>
            <button
              onClick={add}
              disabled={adding || !form.name.trim() || !form.quote.trim()}
              className="px-6 py-2 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors"
            >
              {adding ? 'Adding…' : 'Add review'}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-white/40 text-sm font-body">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-white/40 text-sm font-body">No reviews yet. Add your first above.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className={`glass-card p-5 ${r.status === 'pending' ? 'border-mustard-500/40' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    {r.status === 'pending' && (
                      <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-mustard-300 bg-mustard-500/15 border border-mustard-500/40 rounded px-2 py-0.5 mr-2">
                        Pending
                      </span>
                    )}
                    <span className="font-sans font-semibold text-white/90">{r.name}</span>
                    {(r.role || r.company) && (
                      <span className="text-white/40 text-sm font-body ml-2">{[r.role, r.company].filter(Boolean).join(', ')}</span>
                    )}
                    <span className="text-mustard-300 text-xs ml-2">{'★'.repeat(r.rating)}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {r.status === 'pending' ? (
                      <button
                        onClick={() => patch(r.id, { status: 'published' })}
                        className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-emerald-300 hover:text-emerald-200"
                      >
                        Approve + publish
                      </button>
                    ) : (
                      <button
                        onClick={() => patch(r.id, { status: r.status === 'published' ? 'hidden' : 'published' })}
                        className={`text-[9px] uppercase tracking-[0.15em] font-mono font-bold ${r.status === 'published' ? 'text-emerald-300' : 'text-white/40'}`}
                      >
                        {r.status === 'published' ? 'Published' : 'Hidden'}
                      </button>
                    )}
                    <button onClick={() => del(r.id)} className="text-[9px] uppercase tracking-[0.15em] font-mono text-white/30 hover:text-red-300">
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-white/65 text-sm font-body leading-relaxed">&ldquo;{r.quote}&rdquo;</p>
                {r.outcome && <p className="text-mustard-300/80 text-xs font-mono mt-2">{r.outcome}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
