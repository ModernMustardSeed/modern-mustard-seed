'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AdminHeader from './AdminHeader';
import { launchCountdown } from '@/lib/launch';

type Milestone = { title: string; detail?: string; done?: boolean; due?: string };
type Deliverables = { audit: boolean; intake: boolean; proposalSigned: boolean; depositPaid: boolean; balancePaid: boolean; launched: boolean };
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
  const doneCls = 'text-emerald-800 border-emerald-800/25 bg-emerald-100';
  const todoCls = 'text-[#161616]/55 border-[#161616]/20 bg-[#FFFDF6] hover:text-[#161616] hover:border-[#F5B700] cursor-pointer';

  const staticCls = 'text-[#161616]/45 border-[#161616]/15 bg-[#FFFDF6]';
  const items: { label: string; done: boolean; href?: string; onClick?: () => void; hint: string }[] = [
    { label: 'Audit', done: d.audit, href: `/admin/audit?email=${encodeURIComponent(email)}`, hint: 'Run and save an audit' },
    { label: 'Intake', done: d.intake, hint: 'Client fills this in their portal' },
    { label: 'Signed', done: d.proposalSigned, href: `/admin/proposals?email=${encodeURIComponent(email)}`, hint: 'Send a proposal for signature' },
    { label: 'Deposit', done: d.depositPaid, href: `/admin/proposals?email=${encodeURIComponent(email)}`, hint: 'Send the deposit invoice' },
    { label: 'Balance', done: d.balancePaid, href: `/admin/proposals?email=${encodeURIComponent(email)}`, hint: 'Send the balance invoice' },
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
        if (it.href) {
          return (
            <Link key={it.label} href={it.href} title={it.hint} className={`${base} ${todoCls}`}>
              <span>→</span>
              {it.label}
            </Link>
          );
        }
        return (
          <span key={it.label} title={it.hint} className={`${base} ${staticCls}`}>
            <span>–</span>
            {it.label}
          </span>
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
  building: 'bg-[#F5B700]',
  review: 'bg-purple-400',
  launched: 'bg-emerald-400',
  paused: 'bg-[#161616]/30',
};

const inp =
  'bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] w-full';

type ClientFile = { id: string; label: string; url: string; kind: string };
const FILE_KINDS = ['site', 'link', 'repo', 'doc', 'design', 'download', 'invoice'];

/** Manage the launch deliverables (links + files) a client sees in their portal. */
function ProjectFiles({ email }: { email: string }) {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [form, setForm] = useState({ label: '', url: '', kind: 'site' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/files?email=${encodeURIComponent(email)}`);
      const j = await r.json().catch(() => null);
      if (r.ok && j) setFiles(j.files || []);
    } catch {
      /* offline */
    }
  }, [email]);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!form.label.trim() || !form.url.trim() || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_email: email, ...form }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) setErr((j && j.error) || 'Could not add.');
      else {
        setForm({ label: '', url: '', kind: form.kind });
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/admin/files/${id}`, { method: 'DELETE' });
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1.5">
        Files &amp; links (the client sees these in their portal)
      </label>
      {files.length > 0 && (
        <div className="space-y-1.5 mb-2.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-lg bg-[#FFFDF6] border border-[#161616]/15 px-3 py-2">
              <span className="text-[8px] uppercase tracking-[0.15em] font-mono font-bold text-[#E0301E] w-16 flex-shrink-0">{f.kind}</span>
              <div className="min-w-0 flex-1">
                <span className="block text-sm text-[#3A3733] font-body truncate">{f.label}</span>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-[#161616]/50 font-mono truncate hover:text-[#1E50C8]">{f.url}</a>
              </div>
              <button onClick={() => remove(f.id)} className="text-[#161616]/40 hover:text-[#E0301E] text-xs px-1 flex-shrink-0" aria-label="Remove">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
          className="bg-white border-2 border-[#161616] rounded-lg px-2 py-2 text-sm text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700] sm:w-32"
        >
          {FILE_KINDS.map((k) => (
            <option key={k} value={k} className="bg-white">
              {k}
            </option>
          ))}
        </select>
        <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (e.g. Live site)" className={inp} />
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" className={inp} />
        <button
          onClick={add}
          disabled={busy || !form.label.trim() || !form.url.trim()}
          className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] hover:bg-[#FFD23F] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 disabled:opacity-40 transition-all whitespace-nowrap"
        >
          Add
        </button>
      </div>
      {err && <p className="text-[#E0301E] text-xs font-body mt-2">{err}</p>}
    </div>
  );
}

type Credential = { id: string; label: string; username: string | null; url: string | null };

/** Encrypted credentials vault for a client's launch access. Secrets are masked
 *  until revealed, copied not emailed. */
function CredentialsVault({ email }: { email: string }) {
  const [items, setItems] = useState<Credential[]>([]);
  const [form, setForm] = useState({ label: '', username: '', url: '', secret: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/credentials?email=${encodeURIComponent(email)}`);
      const j = await r.json().catch(() => null);
      if (r.ok && j) setItems(j.credentials || []);
    } catch {
      /* offline */
    }
  }, [email]);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!form.label.trim() || !form.secret || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_email: email, ...form }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) setErr((j && j.error) || 'Could not save.');
      else {
        setForm({ label: '', username: '', url: '', secret: '' });
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const reveal = async (id: string) => {
    if (revealed[id] !== undefined) {
      setRevealed((r) => {
        const n = { ...r };
        delete n[id];
        return n;
      });
      return;
    }
    try {
      const r = await fetch(`/api/admin/credentials/${id}/reveal`);
      const j = await r.json().catch(() => null);
      if (r.ok && typeof j?.secret === 'string') setRevealed((m) => ({ ...m, [id]: j.secret }));
    } catch {
      /* ignore */
    }
  };

  const copy = async (id: string) => {
    let val = revealed[id];
    if (val === undefined) {
      try {
        const r = await fetch(`/api/admin/credentials/${id}/reveal`);
        const j = await r.json().catch(() => null);
        if (r.ok && typeof j?.secret === 'string') val = j.secret;
      } catch {
        return;
      }
    }
    if (val === undefined) return;
    try {
      await navigator.clipboard.writeText(val);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/admin/credentials/${id}`, { method: 'DELETE' });
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1.5">
        Credentials vault (encrypted · client can reveal in their portal)
      </label>
      {items.length > 0 && (
        <div className="space-y-1.5 mb-2.5">
          {items.map((c) => (
            <div key={c.id} className="rounded-lg bg-[#FFFDF6] border border-[#161616]/15 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <span className="block text-sm text-[#3A3733] font-body truncate">{c.label}</span>
                  <span className="block text-[11px] text-[#161616]/50 font-mono truncate">
                    {c.username || ''}
                    {c.username && c.url ? ' · ' : ''}
                    {c.url || ''}
                  </span>
                </div>
                <button onClick={() => reveal(c.id)} className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#1E50C8] hover:text-[#161616] flex-shrink-0">
                  {revealed[c.id] !== undefined ? 'Hide' : 'Reveal'}
                </button>
                <button onClick={() => copy(c.id)} className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616]/55 hover:text-[#161616] flex-shrink-0">
                  {copiedId === c.id ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => remove(c.id)} className="text-[#161616]/40 hover:text-[#E0301E] text-xs px-1 flex-shrink-0" aria-label="Remove">✕</button>
              </div>
              <div className="mt-1.5 font-mono text-[12px] text-[#161616] break-all">
                {revealed[c.id] !== undefined ? revealed[c.id] : '••••••••••••'}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-2">
        <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (e.g. Shopify admin)" className={inp} />
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username / email (optional)" className={inp} />
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Login URL (optional)" className={inp} />
        <input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="Password / key" type="password" autoComplete="new-password" className={inp} />
      </div>
      <div className="mt-2">
        <button
          onClick={add}
          disabled={busy || !form.label.trim() || !form.secret}
          className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] hover:bg-[#FFD23F] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 disabled:opacity-40 transition-all"
        >
          {busy ? 'Saving…' : 'Add credential'}
        </button>
        {err && <span className="text-[#E0301E] text-xs font-body ml-3">{err}</span>}
      </div>
    </div>
  );
}

type IntakeSection = { key: string; title: string; fields: { key: string; label: string }[] };
/** Read-only view of a client's onboarding intake answers. */
function ProjectIntake({ email }: { email: string }) {
  const [sections, setSections] = useState<IntakeSection[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>('none');

  useEffect(() => {
    fetch(`/api/admin/intake?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j?.sections)) setSections(j.sections);
        if (j?.answers) setAnswers(j.answers);
        if (j?.status) setStatus(j.status);
      })
      .catch(() => {});
  }, [email]);

  const filled = Object.values(answers).filter((v) => (v ?? '').toString().trim()).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono">Client intake</label>
        <span className={`text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border ${status === 'submitted' ? 'text-emerald-800 border-emerald-800/25 bg-emerald-100' : status === 'in_progress' ? 'text-amber-800 border-amber-800/25 bg-amber-100' : 'text-[#161616]/45 border-[#161616]/15'}`}>
          {status === 'submitted' ? 'Submitted' : status === 'in_progress' ? 'In progress' : 'Not started'}
        </span>
      </div>
      {filled === 0 ? (
        <p className="text-[#161616]/45 font-body text-xs">No answers yet. The client fills this in their portal.</p>
      ) : (
        <div className="space-y-3">
          {sections.map((sec) => {
            const rows = sec.fields.filter((f) => (answers[f.key] ?? '').toString().trim());
            if (rows.length === 0) return null;
            return (
              <div key={sec.key} className="rounded-lg bg-[#FFFDF6] border border-[#161616]/15 px-3 py-2.5">
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-1.5">{sec.title}</span>
                <dl className="space-y-1.5">
                  {rows.map((f) => (
                    <div key={f.key}>
                      <dt className="text-[#161616]/45 font-body text-[11px]">{f.label}</dt>
                      <dd className="text-[#3A3733] font-body text-[13px] whitespace-pre-wrap">{answers[f.key]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="projects" title="Projects" onRefresh={load} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-white border-2 border-[#E0301E] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4 mb-6">
            <p className="text-[#E0301E] text-sm font-body">{error}</p>
          </div>
        )}

        {/* New project + client */}
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-3">
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
              className="bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700] sm:w-48"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-white">
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <button
              onClick={create}
              disabled={adding || !form.client_email.trim() || !form.name.trim()}
              className="px-6 py-2 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] hover:bg-[#FFD23F] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 disabled:opacity-40 transition-all whitespace-nowrap"
            >
              {adding ? 'Creating…' : 'Create client + project'}
            </button>
          </div>
          <p className="text-[#161616]/45 text-[11px] font-body mt-2">
            Creates the client record and starts their project. They see status, progress, and milestones in their portal, keyed by email.
          </p>
        </div>

        {loading ? (
          <p className="text-[#161616]/60 text-sm font-body">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-[#161616]/60 text-sm font-body">No projects yet. Add one above, or start one from a paid proposal.</p>
        ) : (
          <div className="space-y-8">
            {STATUSES.map((st) => {
              const inLane = projects.filter((p) => p.status === st);
              if (inLane.length === 0) return null;
              return (
                <div key={st}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[st]}`} />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">
                      {STATUS_LABEL[st]} ({inLane.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {inLane.map((p) => {
                      const expanded = openId === p.id;
                      const d = expanded ? draft : null;
                      return (
                        <div key={p.id} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4">
                          {/* Compact row */}
                          <div className="flex items-center gap-3">
                            <button onClick={() => open(p)} className="flex-1 min-w-0 text-left">
                              <span className="block text-sm font-sans font-semibold text-[#161616] truncate">{p.name}</span>
                              <span className="block text-[11px] text-[#161616]/50 font-mono truncate">{p.client_email}</span>
                            </button>
                            <div className="flex-shrink-0 w-28 hidden sm:block">
                              <div className="h-1.5 rounded-full bg-[#161616]/10 overflow-hidden">
                                <div className="h-full bg-[#F5B700]" style={{ width: `${p.progress}%` }} />
                              </div>
                              <span className="text-[9px] text-[#161616]/50 font-mono">{p.progress}%</span>
                            </div>
                            {(() => {
                              const cd = launchCountdown(p.launch_target);
                              if (!cd || p.status === 'launched') return null;
                              return (
                                <span
                                  title={`Launches ${cd.date}`}
                                  className={`flex-shrink-0 text-[9px] uppercase tracking-[0.12em] font-mono font-bold px-2 py-0.5 rounded border hidden md:inline ${
                                    cd.past
                                      ? 'text-[#E0301E] border-[#E0301E]/30 bg-red-100'
                                      : cd.days <= 7
                                        ? 'text-amber-800 border-amber-800/25 bg-amber-100'
                                        : 'text-[#161616]/55 border-[#161616]/20 bg-[#FFFDF6]'
                                  }`}
                                >
                                  {cd.past ? `${cd.short} late` : `T-${cd.days}`}
                                </span>
                              );
                            })()}
                            <select
                              value={p.status}
                              onChange={(e) => quickPatch(p.id, { status: e.target.value })}
                              className="flex-shrink-0 bg-white border-2 border-[#161616] rounded-lg px-2 py-1.5 text-xs text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s} className="bg-white">
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
                            <div className="mt-4 pt-4 border-t border-[#161616]/10 space-y-3">
                              <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1">Name</label>
                                  <input value={d.name} onChange={(e) => setD({ name: e.target.value })} className={inp} />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1">Client email</label>
                                  <input value={d.client_email} onChange={(e) => setD({ client_email: e.target.value })} className={inp} />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1">Progress %</label>
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
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1">Launch target</label>
                                  <input
                                    type="date"
                                    value={d.launch_target ?? ''}
                                    onChange={(e) => setD({ launch_target: e.target.value })}
                                    className={inp}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1">Summary</label>
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
                                  <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono">Milestones</label>
                                  <button
                                    onClick={() => setD({ milestones: [...d.milestones, { title: '', done: false }] })}
                                    className="text-[10px] uppercase tracking-[0.15em] font-mono text-[#1E50C8] hover:text-[#161616]"
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
                                          m.done ? 'bg-emerald-600 text-white border border-[#161616]/20' : 'border border-[#161616]/30 text-transparent'
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
                                        className={`${inp} ${m.done ? 'line-through text-[#161616]/40' : ''}`}
                                      />
                                      <button
                                        onClick={() => setD({ milestones: d.milestones.filter((_, j) => j !== i) })}
                                        className="text-[#161616]/40 hover:text-[#E0301E] text-xs px-1 flex-shrink-0"
                                        aria-label="Remove milestone"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {d.client_email && <ProjectIntake email={d.client_email} />}
                              {d.client_email && <ProjectFiles email={d.client_email} />}
                              {d.client_email && <CredentialsVault email={d.client_email} />}
                              {d.client_email && (
                                <div>
                                  <Link
                                    href={`/admin/builds?email=${encodeURIComponent(d.client_email)}`}
                                    className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-4 py-2 shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                                  >
                                    ⚡ Queue a build (Claude Code)
                                  </Link>
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={saveDraft}
                                  disabled={savingId === d.id}
                                  className="px-5 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] hover:bg-[#FFD23F] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 disabled:opacity-40 transition-all"
                                >
                                  {savingId === d.id ? 'Saving…' : 'Save changes'}
                                </button>
                                <button
                                  onClick={() => open(p)}
                                  className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold bg-white text-[#161616] border-2 border-[#161616] hover:bg-[#FFF8E6] transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => del(p.id)}
                                  className="ml-auto text-[10px] uppercase tracking-[0.15em] font-mono text-[#161616]/45 hover:text-[#E0301E]"
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
