'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { api, btnGhost, btnPrimary, card, eyebrow, inputCls, labelCls, timeAgo, ToastHost, useToasts } from '@/components/admin/acquisition/ui';
import { OPP_GROUPS, OPP_GROUP_LABELS, OPP_STATUSES, OPP_STATUS_LABELS, type Opp, type OppGroup, type OppStatus } from '@/lib/opps';
import OppDrawer from './OppDrawer';
import Modal from '@/components/ui/Modal';

const STATUS_STYLE: Record<OppStatus, string> = {
  new: 'bg-white text-[#161616] border-[#161616]/30',
  shortlist: 'bg-[#FFF3C4] text-[#161616] border-[#161616]',
  applied: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  replied: 'bg-[#DDEBFF] text-[#161616] border-[#1E50C8]',
  interview: 'bg-[#1E50C8] text-white border-[#1E50C8]',
  offer: 'bg-[#E0301E] text-white border-[#E0301E]',
  won: 'bg-[#161616] text-[#F5B700] border-[#161616]',
  passed: 'bg-white text-[#161616]/50 border-[#161616]/20 line-through',
};

export function OppStatusChip({ status }: { status: OppStatus }) {
  return (
    <span className={`inline-block border-2 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] font-oswald font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {OPP_STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_LABEL: Record<1 | 2 | 3, string> = { 1: 'Now', 2: 'Soon', 3: 'Later' };

type ListResponse = { opps: Opp[]; counts: Record<string, number> };

export default function OppsDesk() {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<'' | OppStatus>('');
  const [group, setGroup] = useState<'' | OppGroup>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toasts, push } = useToasts();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (group) params.set('group', group);
      if (q.trim()) params.set('q', q.trim());
      const data = await api<ListResponse>(`/api/admin/opps?${params}`);
      setOpps(data.opps);
      setCounts(data.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the desk.');
    } finally {
      setLoading(false);
    }
  }, [status, group, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);
  const working = useMemo(() => (counts.applied ?? 0) + (counts.replied ?? 0) + (counts.interview ?? 0) + (counts.offer ?? 0), [counts]);
  const dueSoon = useMemo(() => opps.filter((o) => o.next_step_at && new Date(o.next_step_at).getTime() < Date.now() + 3 * 864e5 && !['won', 'passed'].includes(o.status)).length, [opps]);

  const patchLocal = (opp: Opp) => setOpps((prev) => prev.map((o) => (o.id === opp.id ? opp : o)));

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="opps" title="The Opps Desk" onRefresh={load} />
      <main className="max-w-7xl mx-auto px-5 md:px-6 pt-8 pb-32">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className={eyebrow}>Sarah&rsquo;s own pipeline</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">Opportunities, worked like leads.</h1>
            <p className="font-sans text-sm text-[#161616]/70 mt-1 max-w-2xl">
              Every seat, contract and program on one desk. Open a row to read the fit, set a status, write a note, and send the email from here. The magazine link rides on every draft.
            </p>
          </div>
          <div className="flex gap-2">
            <button className={btnGhost} onClick={() => setImporting(true)}>Import JSON</button>
            <button className={btnPrimary} onClick={() => setAdding(true)}>Add opp</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="On the desk" value={total} />
          <Stat label="In motion" value={working} note="applied, replied, talking, offer" />
          <Stat label="Due in 3 days" value={dueSoon} tone={dueSoon ? 'hot' : 'neutral'} />
          <Stat label="Won" value={counts.won ?? 0} tone={counts.won ? 'good' : 'neutral'} />
        </div>

        <div className={`${card} p-4 mb-5`}>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setStatus('')} className={pill(status === '')}>All {total}</button>
            {OPP_STATUSES.map((s) => (
              <button key={s} onClick={() => setStatus(s === status ? '' : s)} className={pill(status === s)}>
                {OPP_STATUS_LABELS[s]} {counts[s] ?? 0}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-[1fr_260px] gap-3 mt-3">
            <input className={inputCls} placeholder="Search company or title" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value as '' | OppGroup)}>
              <option value="">Every group</option>
              {OPP_GROUPS.map((g) => (
                <option key={g} value={g}>{OPP_GROUP_LABELS[g]}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-white border-2 border-[#E0301E] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4 mb-5 font-sans text-sm">
            {error}
          </div>
        )}

        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans min-w-[980px]">
              <thead className="border-b-2 border-[#161616]/10 bg-[#FBF6EA]/60">
                <tr className="text-left text-[10px] uppercase tracking-[0.18em] font-oswald text-[#161616]/60">
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Opportunity</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Listed pay</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Next step</th>
                  <th className="px-4 py-3">Last action</th>
                </tr>
              </thead>
              <tbody>
                {loading && opps.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[#161616]/60">Loading the desk.</td></tr>
                )}
                {!loading && opps.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[#161616]/60">Nothing here yet. Import the list or add one by hand.</td></tr>
                )}
                {opps.map((o) => (
                  <tr key={o.id} onClick={() => setOpenId(o.id)} className="border-t border-[#161616]/[0.07] hover:bg-[#F5B700]/10 cursor-pointer align-top">
                    <td className="px-4 py-3">
                      <span className={`inline-block border-2 border-[#161616] rounded-md px-2 py-0.5 text-[10px] font-oswald uppercase tracking-[0.12em] ${o.priority === 1 ? 'bg-[#E0301E] text-white border-[#E0301E]' : o.priority === 2 ? 'bg-white' : 'bg-white text-[#161616]/50 border-[#161616]/30'}`}>
                        {PRIORITY_LABEL[o.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#161616]">{o.company}</div>
                      <div className="text-[#161616]/70">{o.title}</div>
                      {o.deadline && <div className="text-[11px] text-[#E0301E] font-semibold mt-0.5">{o.deadline}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#161616]/70 whitespace-nowrap">{OPP_GROUP_LABELS[o.group]}</td>
                    <td className="px-4 py-3 text-[#161616]/70 max-w-[240px]"><div className="line-clamp-2">{o.pay || 'Not listed'}</div></td>
                    <td className="px-4 py-3"><OppStatusChip status={o.status} /></td>
                    <td className="px-4 py-3 text-[#161616]/70 max-w-[220px]">
                      {o.next_step ? (
                        <div>
                          <div className="line-clamp-2">{o.next_step}</div>
                          {o.next_step_at && <div className="text-[11px] text-[#161616]/50">{new Date(o.next_step_at).toLocaleDateString()}</div>}
                        </div>
                      ) : <span className="text-[#161616]/35">Not set</span>}
                    </td>
                    <td className="px-4 py-3 text-[#161616]/60 whitespace-nowrap">{timeAgo(o.last_action_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {openId && (
        <OppDrawer
          id={openId}
          onClose={() => setOpenId(null)}
          onChange={patchLocal}
          onDeleted={(id) => { setOpps((prev) => prev.filter((o) => o.id !== id)); setOpenId(null); load(); }}
          push={push}
        />
      )}

      <AddOppModal open={adding} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); push('Added to the desk.', 'ok'); }} onError={(m) => push(m, 'error')} />
      <ImportModal open={importing} onClose={() => setImporting(false)} onDone={(n, s) => { setImporting(false); load(); push(`Imported ${n}, skipped ${s} already on the desk.`, 'ok'); }} onError={(m) => push(m, 'error')} />
      <ToastHost toasts={toasts} />
    </div>
  );
}

function pill(on: boolean) {
  return `px-3 py-1 rounded-full border-2 text-[11px] font-oswald uppercase tracking-[0.12em] transition-colors ${on ? 'bg-[#161616] text-[#F5B700] border-[#161616]' : 'bg-white border-[#161616]/30 text-[#161616] hover:border-[#161616]'}`;
}

function Stat({ label, value, note, tone = 'neutral' }: { label: string; value: number; note?: string; tone?: 'neutral' | 'hot' | 'good' }) {
  const bg = tone === 'hot' ? 'bg-[#E0301E] text-white' : tone === 'good' ? 'bg-[#161616] text-[#F5B700]' : 'bg-[#FFFDF8] text-[#161616]';
  return (
    <div className={`border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4 ${bg}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] font-oswald opacity-70">{label}</div>
      <div className="font-display text-3xl font-bold mt-1 tabular-nums">{value}</div>
      {note && <div className="text-[11px] opacity-60 mt-0.5">{note}</div>}
    </div>
  );
}

function AddOppModal({ open, onClose, onAdded, onError }: { open: boolean; onClose: () => void; onAdded: () => void; onError: (m: string) => void }) {
  const [form, setForm] = useState({ company: '', title: '', url: '', group: 'lead' as OppGroup, type: 'contract', pay: '', why_fit: '', contact_name: '', contact_email: '', deadline: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true);
    try {
      await api('/api/admin/opps', { method: 'POST', body: JSON.stringify(form) });
      setForm({ company: '', title: '', url: '', group: 'lead', type: 'contract', pay: '', why_fit: '', contact_name: '', contact_email: '', deadline: '' });
      onAdded();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not add it.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} eyebrow="Opps Desk" title="Add an opportunity" size="md"
      footer={<div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={busy || !form.company || !form.title || !form.url} onClick={submit}>{busy ? 'Adding' : 'Add to desk'}</button></div>}>
      <div className="grid gap-3 text-[#161616]">
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className={labelCls}>Company</label><input className={inputCls} value={form.company} onChange={set('company')} /></div>
          <div><label className={labelCls}>Title</label><input className={inputCls} value={form.title} onChange={set('title')} /></div>
        </div>
        <div><label className={labelCls}>Listing URL</label><input className={inputCls} value={form.url} onChange={set('url')} placeholder="https://" /></div>
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className={labelCls}>Group</label>
            <select className={inputCls} value={form.group} onChange={set('group')}>{OPP_GROUPS.map((g) => <option key={g} value={g}>{OPP_GROUP_LABELS[g]}</option>)}</select></div>
          <div><label className={labelCls}>Type</label><input className={inputCls} value={form.type} onChange={set('type')} placeholder="fractional, contract, advisory" /></div>
          <div><label className={labelCls}>Deadline</label><input className={inputCls} value={form.deadline} onChange={set('deadline')} placeholder="Closes Sep 16" /></div>
        </div>
        <div><label className={labelCls}>Listed pay</label><input className={inputCls} value={form.pay} onChange={set('pay')} /></div>
        <div><label className={labelCls}>Why it fits</label><textarea className={`${inputCls} min-h-[80px]`} value={form.why_fit} onChange={set('why_fit')} /></div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className={labelCls}>Contact name</label><input className={inputCls} value={form.contact_name} onChange={set('contact_name')} /></div>
          <div><label className={labelCls}>Contact email</label><input className={inputCls} value={form.contact_email} onChange={set('contact_email')} /></div>
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({ open, onClose, onDone, onError }: { open: boolean; onClose: () => void; onDone: (inserted: number, skipped: number) => void; onError: (m: string) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.opps;
      const res = await api<{ inserted: number; skipped: number }>('/api/admin/opps/import', { method: 'POST', body: JSON.stringify({ opps: list }) });
      setText('');
      onDone(res.inserted, res.skipped);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'That did not parse as JSON.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} eyebrow="Opps Desk" title="Import a list" subtitle="Paste a JSON array of opportunities. Rows already on the desk (same URL) are left untouched." size="lg"
      footer={<div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={busy || !text.trim()} onClick={submit}>{busy ? 'Importing' : 'Import'}</button></div>}>
      <textarea className={`${inputCls} min-h-[280px] font-mono text-xs text-[#161616]`} value={text} onChange={(e) => setText(e.target.value)} placeholder='[{"company":"...","title":"...","url":"https://...","group":"lead","type":"fractional","pay":"...","why_fit":"..."}]' />
    </Modal>
  );
}
