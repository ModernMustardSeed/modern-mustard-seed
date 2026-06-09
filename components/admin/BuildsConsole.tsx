'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminHeader from './AdminHeader';

type BuildRequest = {
  id: string;
  client_email: string;
  deliverable_type: string;
  title: string;
  spec: string;
  status: string;
  result: { live_url?: string | null; repo_url?: string | null; notes?: string | null };
  error: string | null;
  created_at: string;
};

const TYPES = ['website', 'app', 'tool', 'software', 'brand_bible', 'other'];
const STATUS_CLS: Record<string, string> = {
  requested: 'text-mustard-200 border-mustard-500/40 bg-mustard-500/10',
  building: 'text-blue-200 border-blue-400/40 bg-blue-500/10',
  ready: 'text-purple-200 border-purple-400/40 bg-purple-500/10',
  delivered: 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10',
  failed: 'text-red-300 border-red-400/40 bg-red-500/10',
  canceled: 'text-white/40 border-white/12 bg-white/5',
};
const inp = 'bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-mustard-500/40 w-full';

export default function BuildsConsole() {
  const [requests, setRequests] = useState<BuildRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', deliverable_type: 'website', title: '' });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [deliver, setDeliver] = useState<Record<string, { liveUrl: string; repoUrl: string; notes: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/build-requests');
      const j = await r.json().catch(() => null);
      if (j?.requests) setRequests(j.requests);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    try {
      const em = new URLSearchParams(window.location.search).get('email');
      if (em) setForm((s) => ({ ...s, email: em }));
    } catch {
      /* no query */
    }
  }, [load]);

  const create = async () => {
    if (!form.email.trim() || creating) return;
    setCreating(true);
    setErr('');
    try {
      const r = await fetch('/api/admin/build-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) setErr((j && j.error) || 'Could not queue.');
      else {
        setForm({ email: '', deliverable_type: form.deliverable_type, title: '' });
        load();
      }
    } finally {
      setCreating(false);
    }
  };

  const patch = async (id: string, payload: Record<string, unknown>) => {
    await fetch(`/api/admin/build-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    load();
  };
  const del = async (id: string) => {
    await fetch(`/api/admin/build-requests/${id}`, { method: 'DELETE' });
    load();
  };

  const setD = (id: string, patchObj: Partial<{ liveUrl: string; repoUrl: string; notes: string }>) =>
    setDeliver((d) => {
      const cur = d[id] ?? { liveUrl: '', repoUrl: '', notes: '' };
      return { ...d, [id]: { ...cur, ...patchObj } };
    });

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <AdminHeader active="builds" title="Build Console" onRefresh={load} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-white/45 text-sm font-body mb-6 max-w-2xl">
          Queue a build for a client. The spec is assembled from their scope, brand, intake, and files. A Claude Code worker builds it in a sandbox and reports back. You can also deliver manually.
        </p>

        {/* Queue a build */}
        <div className="glass-card p-5 mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">Queue a build</span>
          <div className="grid sm:grid-cols-4 gap-3">
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@email.com" className={inp} />
            <select value={form.deliverable_type} onChange={(e) => setForm({ ...form, deliverable_type: e.target.value })} className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustard-500/40">
              {TYPES.map((t) => <option key={t} value={t} className="bg-neutral-900">{t.replace('_', ' ')}</option>)}
            </select>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (optional)" className={`${inp} sm:col-span-1`} />
            <button onClick={create} disabled={creating || !form.email.trim()} className="px-5 py-2 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors">
              {creating ? 'Queuing…' : 'Queue build'}
            </button>
          </div>
          {err && <p className="text-red-300 text-sm font-body mt-2">{err}</p>}
        </div>

        {loading ? (
          <p className="text-white/40 text-sm font-body">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-white/40 text-sm font-body">No builds queued yet.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((b) => {
              const expanded = openId === b.id;
              const d = deliver[b.id] ?? { liveUrl: b.result?.live_url ?? '', repoUrl: b.result?.repo_url ?? '', notes: '' };
              return (
                <div key={b.id} className="glass-card p-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setOpenId(expanded ? null : b.id)} className="flex-1 min-w-0 text-left">
                      <span className="block text-sm font-sans font-semibold text-white/90 truncate">{b.title}</span>
                      <span className="block text-[11px] text-white/40 font-mono truncate">{b.deliverable_type.replace('_', ' ')} · {b.client_email}</span>
                    </button>
                    {b.result?.live_url && (
                      <a href={b.result.live_url} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-mustard-400 hover:text-mustard-300 flex-shrink-0">Live ↗</a>
                    )}
                    <span className={`flex-shrink-0 px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded ${STATUS_CLS[b.status] ?? STATUS_CLS.requested}`}>{b.status}</span>
                  </div>

                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1.5">Build spec (what the worker builds from)</span>
                        <pre className="text-white/70 font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 max-h-72 overflow-y-auto">{b.spec}</pre>
                      </div>
                      {b.error && <p className="text-red-300 text-xs font-body">Error: {b.error}</p>}

                      <div>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1.5">Mark delivered (posts the live link to their portal)</span>
                        <div className="grid sm:grid-cols-3 gap-2 mb-2">
                          <input value={d.liveUrl} onChange={(e) => setD(b.id, { liveUrl: e.target.value })} placeholder="Live URL" className={inp} />
                          <input value={d.repoUrl} onChange={(e) => setD(b.id, { repoUrl: e.target.value })} placeholder="Repo URL (optional)" className={inp} />
                          <input value={d.notes} onChange={(e) => setD(b.id, { notes: e.target.value })} placeholder="Notes (optional)" className={inp} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => patch(b.id, { status: 'delivered', ...d })} className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-emerald-400 hover:bg-emerald-300 transition-colors">Mark delivered</button>
                          {b.status !== 'requested' && <button onClick={() => patch(b.id, { status: 'requested' })} className="px-3 py-2 rounded-lg text-[10px] uppercase tracking-[0.15em] font-mono text-white/60 border border-white/15 hover:border-white/30">Re-queue</button>}
                          <button onClick={() => patch(b.id, { status: 'canceled' })} className="px-3 py-2 rounded-lg text-[10px] uppercase tracking-[0.15em] font-mono text-white/50 hover:text-white/80">Cancel</button>
                          <button onClick={() => del(b.id)} className="ml-auto text-[10px] uppercase tracking-[0.15em] font-mono text-white/30 hover:text-red-300">Delete</button>
                        </div>
                      </div>
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
