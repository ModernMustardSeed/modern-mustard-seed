'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminHeader from './AdminHeader';

type Approval = {
  id: string;
  type: string;
  title: string;
  to_email: string | null;
  to_name: string | null;
  subject: string | null;
  body: string;
  status: string;
  created_at: string;
};

const TYPE_CLS: Record<string, string> = {
  followup: 'text-mustard-200 border-mustard-500/40 bg-mustard-500/10',
  outreach: 'text-blue-200 border-blue-400/40 bg-blue-500/10',
  expansion: 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10',
  case_study: 'text-purple-200 border-purple-400/40 bg-purple-500/10',
};
const inp = 'bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-mustard-500/40 w-full';

export default function ApprovalsInbox() {
  const [pending, setPending] = useState<Approval[]>([]);
  const [recent, setRecent] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string; toEmail: string }>>({});
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/approvals');
      const j = await r.json().catch(() => null);
      if (j) {
        setPending(j.pending || []);
        setRecent(j.recent || []);
        const d: Record<string, { subject: string; body: string; toEmail: string }> = {};
        for (const a of j.pending || []) d[a.id] = { subject: a.subject ?? '', body: a.body ?? '', toEmail: a.to_email ?? '' };
        setDrafts(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const scan = async () => {
    setScanning(true);
    setNote('');
    try {
      const r = await fetch('/api/admin/approvals', { method: 'POST' });
      const j = await r.json().catch(() => null);
      setNote(j?.created ? `${j.created} new draft${j.created === 1 ? '' : 's'} ready for review.` : 'No new follow-ups to draft right now.');
      load();
    } finally {
      setScanning(false);
    }
  };

  const decide = async (id: string, decision?: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      const d = drafts[id];
      await fetch(`/api/admin/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: d?.subject, bodyText: d?.body, toEmail: d?.toEmail, decision }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  };

  const setD = (id: string, patch: Partial<{ subject: string; body: string; toEmail: string }>) =>
    setDrafts((s) => {
      const cur = s[id] ?? { subject: '', body: '', toEmail: '' };
      return { ...s, [id]: { ...cur, ...patch } };
    });

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <AdminHeader active="approvals" title="Approvals" onRefresh={load} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 gap-4">
          <p className="text-white/45 text-sm font-body max-w-xl">
            Everything the system drafts lands here. Edit anything, then approve to send or reject. Nothing goes out without you.
          </p>
          <button onClick={scan} disabled={scanning} className="flex-shrink-0 px-5 py-2.5 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors">
            {scanning ? 'Scanning…' : 'Scan for follow-ups'}
          </button>
        </div>
        {note && <p className="text-mustard-300/90 text-sm font-body mb-5">{note}</p>}

        {loading ? (
          <p className="text-white/40 text-sm font-body">Loading…</p>
        ) : pending.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/55 font-body text-sm">Nothing waiting on you. Tap “Scan for follow-ups” to draft nudges for stale proposals.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((a) => {
              const d = drafts[a.id] ?? { subject: a.subject ?? '', body: a.body, toEmail: a.to_email ?? '' };
              return (
                <div key={a.id} className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded ${TYPE_CLS[a.type] ?? 'text-white/50 border-white/15 bg-white/5'}`}>{a.type.replace('_', ' ')}</span>
                    <span className="text-sm font-sans font-semibold text-white/90 truncate">{a.title}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1">To</label>
                      <input value={d.toEmail} onChange={(e) => setD(a.id, { toEmail: e.target.value })} className={inp} />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1">Subject</label>
                      <input value={d.subject} onChange={(e) => setD(a.id, { subject: e.target.value })} className={inp} />
                    </div>
                  </div>
                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono block mb-1">Message (edit freely)</label>
                  <textarea value={d.body} onChange={(e) => setD(a.id, { body: e.target.value })} rows={7} className={`${inp} resize-y leading-relaxed font-body`} />
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <button onClick={() => decide(a.id, 'approve')} disabled={busyId === a.id} className="px-5 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 transition-colors">
                      {busyId === a.id ? 'Sending…' : 'Approve & send'}
                    </button>
                    <button onClick={() => decide(a.id)} disabled={busyId === a.id} className="px-3 py-2 rounded-lg text-[10px] uppercase tracking-[0.15em] font-mono text-white/60 border border-white/15 hover:border-white/30">Save edits</button>
                    <button onClick={() => decide(a.id, 'reject')} disabled={busyId === a.id} className="ml-auto text-[10px] uppercase tracking-[0.15em] font-mono text-white/40 hover:text-red-300">Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-10">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono font-bold block mb-3">Recent</span>
            <div className="space-y-1.5">
              {recent.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2">
                  <span className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded flex-shrink-0 ${a.status === 'sent' ? 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10' : 'text-white/40 border-white/12 bg-white/5'}`}>{a.status}</span>
                  <span className="text-sm font-body text-white/70 truncate flex-1">{a.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
