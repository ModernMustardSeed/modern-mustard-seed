'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AdminHeader from './AdminHeader';

type Milestone = { title: string; detail?: string; done?: boolean; due?: string };
type Deliverables = { audit: boolean; proposalSigned: boolean; depositPaid: boolean; balancePaid: boolean; launched: boolean };
type Project = {
  id: string;
  client_email: string;
  name: string;
  status: string;
  summary: string | null;
  progress: number;
  milestones: Milestone[];
  launch_target: string | null;
  updated_at?: string;
  deliverables?: Deliverables;
};

/** At-a-glance completion: audit on file, proposal signed, deposit + balance paid,
 *  launched. Incomplete chips are actionable: they jump straight to the next step. */
function DeliverablesStrip({ d, email, onLaunch }: { d: Deliverables; email: string; onLaunch: () => void }) {
  const base =
    'inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] font-mono font-bold px-2 py-0.5 rounded border transition-colors';
  const doneCls = 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10';
  const todoCls = 'text-white/45 border-white/15 bg-white/[0.02] hover:text-mustard-200 hover:border-mustard-500/40 cursor-pointer';

  const items: { label: string; done: boolean; href?: string; onClick?: () => void; hint: string }[] = [
    { label: 'Audit', done: d.audit, href: `/admin/audit?email=${encodeURIComponent(email)}`, hint: 'Run and save an audit' },
    { label: 'Signed', done: d.proposalSigned, href: '/admin/proposals', hint: 'Send a proposal for signature' },
    { label: 'Deposit', done: d.depositPaid, href: '/admin/proposals', hint: 'Send the deposit invoice' },
    { label: 'Balance', done: d.balancePaid, href: '/admin/proposals', hint: 'Send the balance invoice' },
    { label: 'Launched', done: d.launched, onClick: onLaunch, hint: 'Mark this project launched' },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {items.map((it) => {
        if (it.done) {
          return (
            <span key={it.label} className={`${base} ${doneCls}`}>
              <span>✓</span>
              {it.label}
            </span>
          );
        }
        if (it.onClick) {
          return (
            <button key={it.label} onClick={it.onClick} title={it.hint} className={`${base} ${todoCls}`}>
              <span>→</span>
              {it.label}
            </button>
          );
        }
        return (
          <Link key={it.label} href={it.href!} title={it.hint} className={`${base} ${todoCls}`}>
            <span>→</span>
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

const STATUSES = ['discovery', 'building', 'review', 'launched', 'paused'];
const STATUS_LABEL: Record<string, string> = {
  discovery: 'Discovery',
  building: 'Building',
  review: 'Review',
  launched: 'Launched',
  paused: 'Paused',
};
const STATUS_DOT: Record<string, string> = {
  discovery: 'bg-blue-400',
  building: 'bg-mustard-400',
  review: 'bg-purple-400',
  launched: 'bg-emerald-400',
  paused: 'bg-white/30',
};

const inp =
  'bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-mustard-500/40 w-full';

export default function ProjectsBoard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ client_email: '', name: '', client_name: '', client_company: '', status: 'discovery' });
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Project | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/projects');
      const j = await res.json().catch(() => null);
      if (res.ok && j) setProjects(j.projects || []);
      else setError((j && j.error) || 'Failed to load');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.client_email.trim() || !form.name.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ client_email: '', name: '', client_name: '', client_company: '', status: 'discovery' });
        await load();
      } else {
        const j = await res.json().catch(() => null);
        setError((j && j.error) || 'Could not create');
      }
    } finally {
      setAdding(false);
    }
  };

  const quickPatch = async (id: string, payload: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload } : p)));
    try {
      await fetch(`/api/admin/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      /* optimistic; reload will correct */
    }
  };

  const open = (p: Project) => {
    if (openId === p.id) {
      setOpenId(null);
      setDraft(null);
      return;
    }
    setOpenId(p.id);
    setDraft({ ...p, milestones: Array.isArray(p.milestones) ? p.milestones.map((m) => ({ ...m })) : [] });
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSavingId(draft.id);
    try {
      await fetch(`/api/admin/projects/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          client_email: draft.client_email,
          status: draft.status,
          summary: draft.summary,
          progress: draft.progress,
          milestones: draft.milestones,
          launch_target: draft.launch_target,
        }),
      });
      await load();
      setOpenId(null);
      setDraft(null);
    } finally {
      setSavingId(null);
    }
  };

  const del = async (id: string) => {
    try {
      await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
      if (openId === id) {
        setOpenId(null);
        setDraft(null);
      }
      await load();
    } catch {
      /* ignore */
    }
  };

  const setD = (patch: Partial<Project>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <AdminHeader active="projects" title="Projects" onRefresh={load} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="glass-card p-4 mb-6 border-red-500/30">
            <p className="text-red-300 text-sm font-body">{error}</p>
          </div>
        )}

        {/* New project + client */}
        <div className="glass-card p-5 mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">
            New project &amp; client
          </span>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              placeholder="Client name (e.g. Tommy Mantle)"
              className={inp}
            />
            <input
              value={form.client_company}
              onChange={(e) => setForm({ ...form, client_company: e.target.value })}
              placeholder="Company (optional)"
              className={inp}
            />
            <input
              value={form.client_email}
              onChange={(e) => setForm({ ...form, client_email: e.target.value })}
              placeholder="client@email.com"
              className={inp}
            />
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Project name (e.g. Website Design)"
              className={inp}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustard-500/40 sm:w-48"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-neutral-900">
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <button
              onClick={create}
              disabled={adding || !form.client_email.trim() || !form.name.trim()}
              className="px-6 py-2 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {adding ? 'Creating…' : 'Create client + project'}
            </button>
          </div>
          <p className="text-white/30 text-[11px] font-body mt-2">
            Creates the client record and starts their project. They see status, progress, and milestones in their portal, keyed by email.
          </p>
        </div>

        {loading ? (
          <p className="text-white/40 text-sm font-body">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-white/40 text-sm font-body">No projects yet. Add one above, or start one from a paid proposal.</p>
        ) : (
          <div className="space-y-8">
            {STATUSES.map((st) => {
              const inLane = projects.filter((p) => p.status === st);
              if (inLane.length === 0) return null;
              return (
                <div key={st}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[st]}`} />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold">
                      {STATUS_LABEL[st]} ({inLane.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {inLane.map((p) => {
                      const expanded = openId === p.id;
                      const d = expanded ? draft : null;
                      return (
                        <div key={p.id} className="glass-card p-4">
                          {/* Compact row */}
                          <div className="flex items-center gap-3">
                            <button onClick={() => open(p)} className="flex-1 min-w-0 text-left">
                              <span className="block text-sm font-sans font-semibold text-white/90 truncate">{p.name}</span>
                              <span className="block text-[11px] text-white/40 font-mono truncate">{p.client_email}</span>
                            </button>
                            <div className="flex-shrink-0 w-28 hidden sm:block">
                              <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-mustard-600 to-mustard-400" style={{ width: `${p.progress}%` }} />
                              </div>
                              <span className="text-[9px] text-white/35 font-mono">{p.progress}%</span>
                            </div>
                            {p.launch_target && (
                              <span className="flex-shrink-0 text-[10px] text-white/40 font-mono hidden md:inline">
                                {p.launch_target}
                              </span>
                            )}
                            <select
                              value={p.status}
                              onChange={(e) => quickPatch(p.id, { status: e.target.value })}
                              className="flex-shrink-0 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-mustard-500/40"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s} className="bg-neutral-900">
                                  {STATUS_LABEL[s]}
                                </option>
                              ))}
                            </select>
                          </div>

                          {p.deliverables && (
                            <DeliverablesStrip
                              d={p.deliverables}
                              email={p.client_email}
                              onLaunch={async () => {
                                await quickPatch(p.id, { status: 'launched' });
                                load();
                              }}
                            />
                          )}

                          {/* Expanded editor */}
                          {expanded && d && (
                            <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                              <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1">Name</label>
                                  <input value={d.name} onChange={(e) => setD({ name: e.target.value })} className={inp} />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1">Client email</label>
                                  <input value={d.client_email} onChange={(e) => setD({ client_email: e.target.value })} className={inp} />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1">Progress %</label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={d.progress}
                                    onChange={(e) => setD({ progress: Number(e.target.value) })}
                                    className={inp}
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1">Launch target</label>
                                  <input
                                    type="date"
                                    value={d.launch_target ?? ''}
                                    onChange={(e) => setD({ launch_target: e.target.value })}
                                    className={inp}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1">Summary</label>
                                <textarea
                                  value={d.summary ?? ''}
                                  onChange={(e) => setD({ summary: e.target.value })}
                                  rows={2}
                                  className={`${inp} resize-y`}
                                />
                              </div>

                              {/* Milestones */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono">Milestones</label>
                                  <button
                                    onClick={() => setD({ milestones: [...d.milestones, { title: '', done: false }] })}
                                    className="text-[10px] uppercase tracking-[0.15em] font-mono text-mustard-300 hover:text-mustard-200"
                                  >
                                    + Add
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  {d.milestones.map((m, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          const ms = [...d.milestones];
                                          ms[i] = { ...ms[i], done: !ms[i].done };
                                          setD({ milestones: ms });
                                        }}
                                        className={`h-5 w-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] ${
                                          m.done ? 'bg-emerald-500/80 text-white' : 'border border-white/20 text-transparent'
                                        }`}
                                        aria-label="Toggle done"
                                      >
                                        ✓
                                      </button>
                                      <input
                                        value={m.title}
                                        onChange={(e) => {
                                          const ms = [...d.milestones];
                                          ms[i] = { ...ms[i], title: e.target.value };
                                          setD({ milestones: ms });
                                        }}
                                        placeholder="Milestone"
                                        className={`${inp} ${m.done ? 'line-through text-white/40' : ''}`}
                                      />
                                      <button
                                        onClick={() => setD({ milestones: d.milestones.filter((_, j) => j !== i) })}
                                        className="text-white/25 hover:text-red-300 text-xs px-1 flex-shrink-0"
                                        aria-label="Remove milestone"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={saveDraft}
                                  disabled={savingId === d.id}
                                  className="px-5 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors"
                                >
                                  {savingId === d.id ? 'Saving…' : 'Save changes'}
                                </button>
                                <button
                                  onClick={() => open(p)}
                                  className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-white/60 border border-white/15 hover:border-white/30 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => del(p.id)}
                                  className="ml-auto text-[10px] uppercase tracking-[0.15em] font-mono text-white/30 hover:text-red-300"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
