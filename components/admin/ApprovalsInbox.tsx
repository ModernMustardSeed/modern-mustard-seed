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
  followup: 'text-[#161616] border-[#161616]/30 bg-[#F5B700]/20',
  outreach: 'text-[#1E50C8] border-[#1E50C8]/30 bg-blue-100',
  expansion: 'text-emerald-800 border-emerald-800/25 bg-emerald-100',
  case_study: 'text-purple-800 border-purple-800/25 bg-purple-100',
};
const inp = 'bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] w-full';

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
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="approvals" title="Approvals" onRefresh={load} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 gap-4">
          <p className="text-[#161616]/60 text-sm font-body max-w-xl">
            Everything the system drafts lands here. Edit anything, then approve to send or reject. Nothing goes out without you.
          </p>
          <button onClick={scan} disabled={scanning} className="flex-shrink-0 px-5 py-2.5 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 disabled:opacity-40 transition-all">
            {scanning ? 'Scanning…' : 'Scan for drafts'}
          </button>
        </div>
        {note && <p className="text-[#1E50C8] text-sm font-body mb-5">{note}</p>}

        {loading ? (
          <p className="text-[#161616]/45 text-sm font-body">Loading…</p>
        ) : pending.length === 0 ? (
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-8 text-center">
            <p className="text-[#161616]/60 font-body text-sm">Nothing waiting on you. Tap “Scan for drafts” to draft follow-ups for stale proposals and nurtures for new leads.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((a) => {
              const d = drafts[a.id] ?? { subject: a.subject ?? '', body: a.body, toEmail: a.to_email ?? '' };
              return (
                <div key={a.id} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded ${TYPE_CLS[a.type] ?? 'text-[#161616]/65 border-[#161616]/20 bg-[#161616]/[0.06]'}`}>{a.type.replace('_', ' ')}</span>
                    <span className="text-sm font-sans font-semibold text-[#161616] truncate">{a.title}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1">To</label>
                      <input value={d.toEmail} onChange={(e) => setD(a.id, { toEmail: e.target.value })} className={inp} />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1">Subject</label>
                      <input value={d.subject} onChange={(e) => setD(a.id, { subject: e.target.value })} className={inp} />
                    </div>
                  </div>
                  <label className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1">Message (edit freely)</label>
                  <textarea value={d.body} onChange={(e) => setD(a.id, { body: e.target.value })} rows={7} className={`${inp} resize-y leading-relaxed font-body`} />
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <button onClick={() => decide(a.id, 'approve')} disabled={busyId === a.id} className="px-5 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-[#161616]/20 disabled:opacity-40 transition-colors">
                      {busyId === a.id ? 'Sending…' : 'Approve & send'}
                    </button>
                    <button onClick={() => decide(a.id)} disabled={busyId === a.id} className="px-3 py-2 rounded-lg text-[10px] uppercase tracking-[0.15em] font-mono text-[#161616] bg-white border-2 border-[#161616] hover:bg-[#FFF8E6]">Save edits</button>
                    <button onClick={() => decide(a.id, 'reject')} disabled={busyId === a.id} className="ml-auto text-[10px] uppercase tracking-[0.15em] font-mono text-[#161616]/55 hover:text-[#E0301E]">Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-10">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-3">Recent</span>
            <div className="space-y-1.5">
              {recent.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg bg-[#FFFDF6] border border-[#161616]/15 px-3 py-2">
                  <span className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded flex-shrink-0 ${a.status === 'sent' ? 'text-emerald-800 border-emerald-800/25 bg-emerald-100' : 'text-[#161616]/55 border-[#161616]/20 bg-[#161616]/[0.05]'}`}>{a.status}</span>
                  <span className="text-sm font-body text-[#3A3733] truncate flex-1">{a.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
