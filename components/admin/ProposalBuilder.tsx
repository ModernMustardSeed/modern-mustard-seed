'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from './AdminHeader';
import {
  SERVICES,
  PATHS,
  GROUPS,
  byId,
  defaultPrice,
  listPrice,
  formatMoney as money,
  isRecurring,
  isHourly,
  TERMS,
  type Service,
} from '@/data/proposal-menu';

type Line = { id: string; price: number; qty: number; scope: string[]; framing: string };
type Prose = { intro: string; situation: string; recommendation: string; close: string };
type Summary = {
  id: string;
  client_name: string | null;
  client_company: string | null;
  client_email: string | null;
  site_url: string | null;
  status: string;
  one_time_total: number;
  monthly_total: number;
  updated_at: string;
  signed_at: string | null;
  deposit_status: string | null;
  share_token: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'text-white/50 border-white/15 bg-white/5',
  sent: 'text-mustard-200 border-mustard-500/40 bg-mustard-500/10',
  signed: 'text-blue-200 border-blue-400/40 bg-blue-500/10',
  paid: 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10',
  accepted: 'text-blue-200 border-blue-400/40 bg-blue-500/10',
  declined: 'text-white/40 border-white/10 bg-white/5',
};
const STATUSES = ['draft', 'sent', 'accepted', 'declined'];

// The real-world progression for a row: paid > signed > sent > status.
function progressLabel(p: Summary): string {
  if (p.deposit_status === 'paid') return 'paid';
  if (p.signed_at) return 'signed';
  if (p.status === 'accepted') return 'signed';
  return p.status;
}

const inp =
  'bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-mustard-500/40 w-full';

function lineToService(l: Line): Service | undefined {
  return byId(l.id);
}

function linePriceLabel(s: Service, l: Line): string {
  if (s.unit === 'free') return 'Included';
  if (isHourly(s.unit)) return `${money(l.price)}/hr × ${l.qty} = ${money(l.price * l.qty)}`;
  if (isRecurring(s.unit)) return `${money(l.price)}/mo`;
  const base = money(l.price * l.qty);
  return s.unit === 'fixed_from' ? `from ${base}` : base;
}

export default function ProposalBuilder() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [situation, setSituation] = useState('');
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<Line[]>([]);
  const [prose, setProse] = useState<Prose>({ intro: '', situation: '', recommendation: '', close: '' });

  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [copied, setCopied] = useState(false);

  // Persistence
  const [pathId, setPathId] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [list, setList] = useState<Summary[]>([]);
  const [sendingProposal, setSendingProposal] = useState(false);
  const [proposalSent, setProposalSent] = useState(false);

  // Deposit (money loop)
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [depositStatus, setDepositStatus] = useState('unpaid');
  const [depositUrl, setDepositUrl] = useState('');
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositMsg, setDepositMsg] = useState('');
  const [startingProject, setStartingProject] = useState(false);

  const router = useRouter();

  const add = (id: string) => {
    const s = byId(id);
    if (!s || lines.some((l) => l.id === id)) return;
    setLines((prev) => [
      ...prev,
      { id, price: defaultPrice(s), qty: isHourly(s.unit) ? 4 : 1, scope: [...s.scope], framing: '' },
    ]);
  };
  const remove = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));
  const patch = (id: string, p: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const applyPath = (pathId: string) => {
    const path = PATHS.find((p) => p.id === pathId);
    if (!path) return;
    setLines(
      path.serviceIds
        .map((id) => byId(id))
        .filter(Boolean)
        .map((s) => ({
          id: s!.id,
          price: defaultPrice(s!),
          qty: isHourly(s!.unit) ? 4 : 1,
          scope: [...s!.scope],
          framing: '',
        }))
    );
    setProse((pr) => ({ ...pr, recommendation: pr.recommendation || path.rationale }));
    setPathId(path.id);
  };

  // Seed from the audit screen's "Build a proposal from this audit" handoff.
  // Runs once on mount, then clears the key so a refresh starts clean.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('mms_proposal_seed');
      if (!raw) return;
      sessionStorage.removeItem('mms_proposal_seed');
      const seed = JSON.parse(raw) as {
        url?: string;
        name?: string;
        email?: string;
        situation?: string;
        notes?: string;
        pathId?: string;
      };
      if (seed.name) setName(seed.name);
      if (seed.email) setEmail(seed.email);
      if (seed.url) setUrl(seed.url);
      if (seed.situation) setSituation(seed.situation);
      if (seed.notes) setNotes(seed.notes);
      if (seed.pathId) applyPath(seed.pathId);
    } catch {
      /* nothing to seed */
    }
  }, []);

  const { oneTime, monthly } = useMemo(() => {
    let o = 0;
    let m = 0;
    for (const l of lines) {
      const s = byId(l.id);
      if (!s) continue;
      if (isRecurring(s.unit)) m += l.price * l.qty;
      else if (s.unit !== 'free') o += l.price * l.qty;
    }
    return { oneTime: o, monthly: m };
  }, [lines]);

  const hasVariable = useMemo(() => lines.some((l) => byId(l.id)?.variable), [lines]);
  const depositDue = Math.round(oneTime * 0.5);
  const balanceDue = oneTime - depositDue;

  const draft = async () => {
    if (!lines.length || drafting) return;
    setDrafting(true);
    setDraftError('');
    try {
      const res = await fetch('/api/admin/proposal/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { name, company, url, situation },
          notes,
          serviceIds: lines.map((l) => l.id),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        setDraftError((data && data.error) || 'Could not draft. Try again.');
      } else {
        setProse({
          intro: data.intro || '',
          situation: data.situation || '',
          recommendation: data.recommendation || '',
          close: data.close || '',
        });
        const framing: Record<string, string> = data.framing || {};
        setLines((prev) => prev.map((l) => (framing[l.id] ? { ...l, framing: framing[l.id] } : l)));
      }
    } catch {
      setDraftError('Network error. Try again.');
    } finally {
      setDrafting(false);
    }
  };

  // ── Persistence ──
  const loadList = async () => {
    try {
      const r = await fetch('/api/admin/proposals');
      const j = await r.json().catch(() => null);
      if (r.ok && j) setList(j.proposals || []);
    } catch {
      /* offline */
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadList();
  }, []);

  const buildPayload = () => ({
    client_name: name,
    client_company: company,
    client_email: email,
    site_url: url,
    situation,
    notes,
    path_id: pathId,
    status,
    lines,
    prose,
    one_time_total: oneTime,
    monthly_total: monthly,
  });

  const save = async () => {
    if (saving || !lines.length) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = buildPayload();
      const res = currentId
        ? await fetch(`/api/admin/proposals/${currentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/proposals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError((j && j.error) || 'Could not save.');
      } else {
        if (j?.id) setCurrentId(j.id);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        loadList();
      }
    } catch {
      setSaveError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const sendProposal = async () => {
    if (!currentId || !email.trim() || sendingProposal) return;
    setSendingProposal(true);
    try {
      const res = await fetch(`/api/admin/proposals/${currentId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setProposalSent(true);
        setStatus('sent');
        setTimeout(() => setProposalSent(false), 3000);
        loadList();
      }
    } finally {
      setSendingProposal(false);
    }
  };

  const [resendId, setResendId] = useState<string | null>(null);
  const resendProposal = async (id: string) => {
    setResendId(id);
    try {
      await fetch(`/api/admin/proposals/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      loadList();
    } finally {
      setResendId(null);
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyLink = async (p: Summary) => {
    if (!p.share_token) return;
    try {
      await navigator.clipboard.writeText(`https://modernmustardseed.com/proposal/${p.share_token}`);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const changeStatus = async (s: string) => {
    setStatus(s);
    if (currentId) {
      try {
        await fetch(`/api/admin/proposals/${currentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: s }),
        });
        loadList();
      } catch {
        /* ignore */
      }
    }
  };

  const loadProposal = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/proposals/${id}`);
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.proposal) return;
      const p = j.proposal;
      setName(p.client_name || '');
      setCompany(p.client_company || '');
      setEmail(p.client_email || '');
      setUrl(p.site_url || '');
      setSituation(p.situation || '');
      setNotes(p.notes || '');
      setPathId(p.path_id || null);
      setStatus(p.status || 'draft');
      setLines(Array.isArray(p.lines) ? p.lines : []);
      setProse({
        intro: p.prose?.intro || '',
        situation: p.prose?.situation || '',
        recommendation: p.prose?.recommendation || '',
        close: p.prose?.close || '',
      });
      setCurrentId(p.id);
      setDepositAmount(p.deposit_amount || '');
      setDepositStatus(p.deposit_status || 'unpaid');
      setDepositUrl(p.deposit_url || '');
      setDepositMsg('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      /* ignore */
    }
  };

  const newProposal = () => {
    setCurrentId(null);
    setStatus('draft');
    setName('');
    setCompany('');
    setEmail('');
    setUrl('');
    setSituation('');
    setNotes('');
    setPathId(null);
    setLines([]);
    setProse({ intro: '', situation: '', recommendation: '', close: '' });
    setSaveError('');
    setDepositAmount('');
    setDepositStatus('unpaid');
    setDepositUrl('');
    setDepositMsg('');
  };

  const generateDeposit = async () => {
    if (!currentId || depositBusy) return;
    setDepositBusy(true);
    setDepositMsg('');
    try {
      const amount = depositAmount === '' ? undefined : Number(depositAmount);
      const res = await fetch(`/api/admin/proposals/${currentId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.url) {
        setDepositMsg((j && j.error) || 'Could not create the link.');
      } else {
        setDepositUrl(j.url);
        setDepositStatus('link_sent');
        if (j.amount) setDepositAmount(j.amount);
        setDepositMsg(j.emailed ? 'Link created and emailed to the client.' : 'Link created. No client email on file, copy it below.');
        loadList();
      }
    } catch {
      setDepositMsg('Network error.');
    } finally {
      setDepositBusy(false);
    }
  };

  const [balanceBusy, setBalanceBusy] = useState(false);
  const [balanceMsg, setBalanceMsg] = useState('');
  const sendBalance = async () => {
    if (!currentId || balanceBusy) return;
    setBalanceBusy(true);
    setBalanceMsg('');
    try {
      const res = await fetch(`/api/admin/proposals/${currentId}/balance`, { method: 'POST' });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.url) setBalanceMsg((j && j.error) || 'Could not create the balance link.');
      else setBalanceMsg(j.emailed ? 'Balance invoice emailed to the client.' : 'Balance link created. No client email on file.');
    } catch {
      setBalanceMsg('Network error.');
    } finally {
      setBalanceBusy(false);
    }
  };

  const markDepositPaid = async () => {
    if (!currentId || depositBusy) return;
    setDepositBusy(true);
    setDepositMsg('');
    try {
      const res = await fetch(`/api/admin/proposals/${currentId}/deposit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid' }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setDepositMsg((j && j.error) || 'Could not mark paid.');
      } else {
        setDepositStatus('paid');
        setDepositMsg('Marked paid. Recorded to revenue.');
        loadList();
      }
    } catch {
      setDepositMsg('Network error.');
    } finally {
      setDepositBusy(false);
    }
  };

  const deleteProposal = async (id: string) => {
    try {
      await fetch(`/api/admin/proposals/${id}`, { method: 'DELETE' });
      if (currentId === id) newProposal();
      loadList();
    } catch {
      /* ignore */
    }
  };

  const startProject = async () => {
    if (!email.trim() || startingProject) return;
    setStartingProject(true);
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_email: email.trim(),
          name: company.trim() || name.trim() || 'New project',
          summary: situation || prose.recommendation || '',
        }),
      });
      if (res.ok) router.push('/admin/projects');
    } finally {
      setStartingProject(false);
    }
  };

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const preparedFor = [name, company].filter(Boolean).join(', ');

  const buildMarkdown = (): string => {
    const L: string[] = [];
    L.push(`# Proposal`);
    L.push(`Modern Mustard Seed · ${dateStr}`);
    if (preparedFor) L.push(`\nPrepared for: ${preparedFor}`);
    if (url) L.push(`Site: ${url}`);
    if (prose.intro) L.push(`\n${prose.intro}`);
    if (prose.situation || situation) L.push(`\n## Where you are\n${prose.situation || situation}`);
    if (prose.recommendation) L.push(`\n## What we recommend\n${prose.recommendation}`);
    L.push(`\n## Scope and pricing`);
    for (const l of lines) {
      const s = lineToService(l);
      if (!s) continue;
      L.push(`\n### ${s.name} — ${linePriceLabel(s, l)}`);
      if (l.framing) L.push(l.framing);
      for (const b of l.scope) L.push(`- ${b}`);
    }
    L.push(`\n## Totals`);
    if (oneTime) {
      L.push(`Project total: ${money(oneTime)}`);
      L.push(`- To start, 50% deposit: ${money(depositDue)}`);
      L.push(`- Balance on delivery: ${money(balanceDue)}`);
    }
    if (monthly) L.push(`Monthly${hasVariable ? ', estimated' : ''}: ${money(monthly)}/mo`);
    if (hasVariable)
      L.push(
        'Software and compute is billed at cost and moves with the compute used each month. The monthly figure is an estimate, not a fixed charge.'
      );
    L.push(`\n## Terms`);
    for (const t of TERMS) L.push(`- ${t}`);
    if (prose.close) L.push(`\n${prose.close}`);
    L.push(`\nBook a call: https://modernmustardseed.com/book`);
    L.push(`\nWith faith, Sarah · Founder, Modern Mustard Seed`);
    return L.join('\n');
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .proposal-doc,
          .proposal-doc * {
            visibility: visible !important;
          }
          .proposal-doc {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page {
            margin: 18mm;
          }
        }
      `}</style>

      <AdminHeader active="proposals" title="Proposal Builder" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-white/45 text-sm font-body mb-6 max-w-2xl print:hidden">
          Build a proposal from your notes or an audit. Pick a path or add services, edit scope and
          price, draft the words with AI, then copy it or print to PDF. Nothing here is emailed or
          stored. It is your workspace for writing the proposal.
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ───────── Builder ───────── */}
          <div className="space-y-5 print:hidden">
            {/* Saved proposals */}
            {list.length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold">
                    Saved proposals ({list.length})
                  </span>
                  <button
                    onClick={newProposal}
                    className="text-[10px] uppercase tracking-[0.15em] font-mono text-mustard-300 hover:text-mustard-200"
                  >
                    + New
                  </button>
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {list.map((p) => (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-lg border ${
                        currentId === p.id
                          ? 'border-mustard-500/40 bg-mustard-500/10'
                          : 'border-white/[0.06] bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button onClick={() => loadProposal(p.id)} className="flex-1 min-w-0 text-left">
                          <span className="block text-sm font-sans font-medium text-white/90 truncate">
                            {p.client_company || p.client_name || p.site_url || 'Untitled'}
                          </span>
                          <span className="block text-[11px] text-white/35 font-mono">
                            {p.one_time_total ? money(p.one_time_total) : '—'}
                            {p.monthly_total ? ` · ${money(p.monthly_total)}/mo` : ''}
                          </span>
                        </button>
                        <span
                          className={`flex-shrink-0 px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded ${
                            STATUS_BADGE[progressLabel(p)] ?? STATUS_BADGE.draft
                          }`}
                        >
                          {progressLabel(p)}
                        </span>
                      </div>
                      {/* Row actions: only meaningful once there is a client email + token */}
                      <div className="flex items-center gap-3 mt-2 pl-0.5">
                        {p.share_token && (
                          <button
                            onClick={() => copyLink(p)}
                            className="text-[9px] uppercase tracking-[0.15em] font-mono text-white/40 hover:text-mustard-300"
                          >
                            {copiedId === p.id ? 'Copied' : 'Copy link'}
                          </button>
                        )}
                        {p.client_email && p.deposit_status !== 'paid' && (
                          <button
                            onClick={() => resendProposal(p.id)}
                            disabled={resendId === p.id}
                            className="text-[9px] uppercase tracking-[0.15em] font-mono text-emerald-300/80 hover:text-emerald-200 disabled:opacity-50"
                          >
                            {resendId === p.id ? 'Sending…' : p.signed_at ? 'Resend' : 'Send'}
                          </button>
                        )}
                        <button
                          onClick={() => deleteProposal(p.id)}
                          className="ml-auto text-[9px] uppercase tracking-[0.15em] font-mono text-white/25 hover:text-red-300"
                          aria-label="Delete proposal"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client */}
            <div className="glass-card p-5">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">
                Client
              </span>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={inp} />
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className={inp} />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className={inp} />
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Their site (optional)" className={inp} />
              </div>
              <textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                rows={2}
                placeholder="Their situation in a line or two (what they have now, what they need)"
                className={`${inp} resize-y`}
              />
            </div>

            {/* Notes / audit */}
            <div className="glass-card p-5">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">
                Your notes / paste an audit
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Paste your call notes, or a website audit. The AI draft uses this to tailor the proposal. Prices never come from here."
                className={`${inp} resize-y`}
              />
            </div>

            {/* Paths */}
            <div className="glass-card p-5">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-1">
                Start from a path
              </span>
              <p className="text-white/35 text-xs font-body mb-3">
                Pick the situation that fits. It seeds the services and a rationale you can edit.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {PATHS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPath(p.id)}
                    className="text-left p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-mustard-500/40 transition-colors"
                  >
                    <span className="block text-sm font-sans font-semibold text-white/90">{p.label}</span>
                    <span className="block text-[11px] text-white/40 font-body mt-0.5 leading-snug">{p.when}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Service menu */}
            <div className="glass-card p-5">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">
                Add services
              </span>
              <div className="space-y-4">
                {GROUPS.map((g) => (
                  <div key={g}>
                    <span className="text-[9px] uppercase tracking-[0.25em] text-mustard-400/70 font-mono font-bold block mb-1.5">
                      {g}
                    </span>
                    <div className="space-y-1.5">
                      {SERVICES.filter((s) => s.group === g).map((s) => {
                        const added = lines.some((l) => l.id === s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => add(s.id)}
                            disabled={added}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                              added
                                ? 'border-mustard-500/30 bg-mustard-500/10 cursor-default'
                                : 'border-white/[0.06] bg-white/[0.02] hover:border-mustard-500/40'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-sans font-medium text-white/90 truncate">{s.name}</span>
                              <span className="block text-[11px] text-white/35 font-mono">{listPrice(s)}</span>
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-mustard-300 flex-shrink-0">
                              {added ? 'Added' : '+ Add'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected line items, editable */}
            {lines.length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold">
                    Selected ({lines.length})
                  </span>
                  <button
                    onClick={draft}
                    disabled={drafting}
                    className="px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors"
                  >
                    {drafting ? 'Drafting…' : 'Draft words with AI'}
                  </button>
                </div>
                {draftError && <p className="text-red-300 text-sm font-body mb-3">{draftError}</p>}
                <div className="space-y-3">
                  {lines.map((l) => {
                    const s = lineToService(l);
                    if (!s) return null;
                    return (
                      <div key={l.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-sm font-sans font-semibold text-white/90">{s.name}</span>
                          <button
                            onClick={() => remove(l.id)}
                            className="text-[10px] uppercase tracking-[0.15em] font-mono text-white/30 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-mono">
                            {isRecurring(s.unit) ? '$/mo' : isHourly(s.unit) ? '$/hr' : '$'}
                          </span>
                          <input
                            type="number"
                            value={l.price}
                            onChange={(e) => patch(l.id, { price: Number(e.target.value) || 0 })}
                            className={`${inp} max-w-[140px]`}
                          />
                          {isHourly(s.unit) && (
                            <>
                              <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-mono">hrs</span>
                              <input
                                type="number"
                                value={l.qty}
                                onChange={(e) => patch(l.id, { qty: Number(e.target.value) || 1 })}
                                className={`${inp} max-w-[80px]`}
                              />
                            </>
                          )}
                          <span className="text-xs text-mustard-300 font-mono ml-auto">{linePriceLabel(s, l)}</span>
                        </div>
                        <input
                          value={l.framing}
                          onChange={(e) => patch(l.id, { framing: e.target.value })}
                          placeholder="One line tying this to them (AI fills this on draft)"
                          className={`${inp} mb-2 text-[13px]`}
                        />
                        <textarea
                          value={l.scope.join('\n')}
                          onChange={(e) => patch(l.id, { scope: e.target.value.split('\n').filter(Boolean) })}
                          rows={Math.min(l.scope.length + 1, 8)}
                          className={`${inp} resize-y text-[13px] leading-relaxed`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Deposit (money loop) */}
            {currentId && (
              <div className="glass-card p-5 border-emerald-500/20">
                <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-mono font-bold block mb-1">
                  Deposit
                </span>
                <p className="text-white/40 text-xs font-body mb-3">
                  Generate a Stripe deposit link and email it to the client. A paid deposit records to
                  revenue and wins the linked lead.
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-mono">$</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={String(Math.round(oneTime * 0.5))}
                    className={`${inp} max-w-[150px]`}
                  />
                  <span className="text-[11px] text-white/35 font-mono">
                    50% = {money(Math.round(oneTime * 0.5))}
                  </span>
                  <span
                    className={`ml-auto px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] font-mono font-bold border rounded ${
                      depositStatus === 'paid'
                        ? 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10'
                        : depositStatus === 'link_sent'
                          ? 'text-blue-200 border-blue-400/40 bg-blue-500/10'
                          : 'text-white/50 border-white/15 bg-white/5'
                    }`}
                  >
                    {depositStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={generateDeposit}
                    disabled={depositBusy || depositStatus === 'paid'}
                    className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors"
                  >
                    {depositBusy ? 'Working…' : depositStatus === 'link_sent' ? 'Regenerate + email' : 'Create + email link'}
                  </button>
                  {depositStatus !== 'paid' && (
                    <button
                      onClick={markDepositPaid}
                      disabled={depositBusy}
                      className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-white/70 border border-white/15 hover:border-white/30 disabled:opacity-40 transition-colors"
                    >
                      Mark paid
                    </button>
                  )}
                </div>
                {depositUrl && (
                  <p className="text-[11px] font-mono mt-3 break-all">
                    <a
                      href={depositUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mustard-300 hover:text-mustard-200"
                    >
                      {depositUrl}
                    </a>
                  </p>
                )}
                {depositMsg && <p className="text-emerald-300/90 text-xs font-body mt-2">{depositMsg}</p>}

                {depositStatus === 'paid' && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <span className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-mono font-bold block mb-2">
                      Balance, final 50%
                    </span>
                    <button
                      onClick={sendBalance}
                      disabled={balanceBusy || !email.trim()}
                      className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 transition-colors"
                    >
                      {balanceBusy ? 'Working…' : 'Send balance invoice'}
                    </button>
                    {balanceMsg && <p className="text-emerald-300/90 text-xs font-body mt-2">{balanceMsg}</p>}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <button
                    onClick={startProject}
                    disabled={!email.trim() || startingProject}
                    className="text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                  >
                    {startingProject ? 'Starting…' : 'Start a project from this →'}
                  </button>
                  {!email.trim() && (
                    <span className="text-white/30 text-[11px] font-body ml-2">add a client email first</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ───────── Preview ───────── */}
          <div>
            <div className="print:hidden mb-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={save}
                  disabled={saving || !lines.length}
                  className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving…' : saved ? 'Saved' : currentId ? 'Update' : 'Save'}
                </button>
                <select
                  value={status}
                  onChange={(e) => changeStatus(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-mustard-500/40"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-neutral-900">
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={newProposal}
                  className="px-3 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-white/60 border border-white/15 hover:border-white/30 transition-colors"
                >
                  New
                </button>
                <button
                  onClick={sendProposal}
                  disabled={!currentId || !email.trim() || sendingProposal}
                  title={!email.trim() ? 'Add a client email first' : !currentId ? 'Save first' : ''}
                  className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#080c16] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 transition-colors"
                >
                  {sendingProposal ? 'Sending…' : proposalSent ? 'Sent ✓' : 'Send for signature'}
                </button>
                <span className="w-px h-5 bg-white/10 mx-1" aria-hidden />
                <button
                  onClick={() => window.print()}
                  disabled={!lines.length}
                  className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-white/70 border border-white/15 hover:border-white/30 disabled:opacity-40 transition-colors"
                >
                  Print / PDF
                </button>
                <button
                  onClick={copyMarkdown}
                  disabled={!lines.length}
                  className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-white/70 border border-white/15 hover:border-white/30 disabled:opacity-40 transition-colors"
                >
                  {copied ? 'Copied' : 'Copy markdown'}
                </button>
              </div>
              {saveError && <p className="text-red-300 text-xs font-body">{saveError}</p>}
            </div>

            <div className="proposal-doc bg-[#FBF8F2] text-[#1B2436] rounded-xl overflow-hidden">
              {/* Doc header */}
              <div className="bg-[#1F4280] px-8 py-7 text-center">
                <div className="text-[10px] tracking-[0.4em] uppercase text-white font-semibold">Modern Mustard Seed</div>
                <div className="text-white/80 text-sm italic mt-2" style={{ fontFamily: 'Georgia, serif' }}>
                  Proposal · {dateStr}
                </div>
              </div>

              <div className="px-8 py-8">
                {lines.length === 0 ? (
                  <p className="text-[#8A8170] text-sm">Add a path or services to build the proposal.</p>
                ) : (
                  <>
                    {preparedFor && (
                      <p className="text-[11px] uppercase tracking-[0.25em] text-[#A8741A] font-bold mb-1">
                        Prepared for {preparedFor}
                      </p>
                    )}
                    {url && <p className="text-[13px] text-[#8A8170] mb-4">{url}</p>}

                    {prose.intro && <p className="text-[15px] leading-relaxed mb-5">{prose.intro}</p>}

                    {(prose.situation || situation) && (
                      <Section title="Where you are">{prose.situation || situation}</Section>
                    )}
                    {prose.recommendation && <Section title="What we recommend">{prose.recommendation}</Section>}

                    {/* Line items */}
                    <h3 className="text-[11px] uppercase tracking-[0.25em] text-[#A8741A] font-bold mt-7 mb-3">
                      Scope and pricing
                    </h3>
                    <div className="space-y-4">
                      {lines.map((l) => {
                        const s = lineToService(l);
                        if (!s) return null;
                        return (
                          <div key={l.id} className="border border-[#E7DECC] rounded-lg p-4">
                            <div className="flex items-baseline justify-between gap-3 mb-1">
                              <span className="font-semibold text-[16px]" style={{ fontFamily: 'Georgia, serif' }}>
                                {s.name}
                              </span>
                              <span className="text-right whitespace-nowrap">
                                <span className="text-[14px] font-semibold text-[#1B2436]">{linePriceLabel(s, l)}</span>
                                {s.variable && (
                                  <span className="block text-[10px] text-[#8A8170] font-normal">at cost, varies with usage</span>
                                )}
                              </span>
                            </div>
                            {l.framing && <p className="text-[13.5px] text-[#474F60] leading-relaxed mb-2">{l.framing}</p>}
                            <ul className="space-y-1">
                              {l.scope.map((b, i) => (
                                <li key={i} className="text-[13px] text-[#474F60] leading-relaxed pl-4 relative">
                                  <span className="absolute left-0 text-[#C8964E]">•</span>
                                  {b}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>

                    {/* Totals: three buckets */}
                    <div className="mt-6 border-t border-[#E7DECC] pt-4 space-y-3">
                      {oneTime > 0 && (
                        <>
                          <div className="flex items-baseline justify-between">
                            <span className="text-[14px] text-[#474F60]">Project total</span>
                            <span className="text-[20px] font-semibold" style={{ fontFamily: 'Georgia, serif' }}>
                              {money(oneTime)}
                            </span>
                          </div>
                          <div className="rounded-lg bg-[#F5EEE0] border border-[#E7DECC] p-3.5 space-y-2">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[13px] text-[#474F60]">To start, 50% deposit</span>
                              <span className="text-[15px] font-semibold text-[#1B2436]">{money(depositDue)}</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-[13px] text-[#474F60]">Balance on delivery</span>
                              <span className="text-[15px] font-semibold text-[#1B2436]">{money(balanceDue)}</span>
                            </div>
                          </div>
                        </>
                      )}
                      {monthly > 0 && (
                        <div className="flex items-baseline justify-between">
                          <span className="text-[14px] text-[#474F60]">Monthly{hasVariable ? ', estimated' : ''}</span>
                          <span className="text-[16px] font-semibold text-[#1B2436]">{money(monthly)}/mo</span>
                        </div>
                      )}
                      {hasVariable && (
                        <p className="text-[12px] text-[#8A8170] leading-relaxed">
                          Software and compute is billed at cost and moves with the compute used each
                          month. The monthly figure is an estimate, not a fixed charge.
                        </p>
                      )}
                    </div>

                    {/* Terms */}
                    <h3 className="text-[11px] uppercase tracking-[0.25em] text-[#A8741A] font-bold mt-7 mb-2">Terms</h3>
                    <ul className="space-y-1">
                      {TERMS.map((t, i) => (
                        <li key={i} className="text-[12.5px] text-[#474F60] leading-relaxed pl-4 relative">
                          <span className="absolute left-0 text-[#C8964E]">•</span>
                          {t}
                        </li>
                      ))}
                    </ul>

                    {prose.close && <p className="text-[15px] leading-relaxed mt-6">{prose.close}</p>}

                    <p className="text-[13px] text-[#474F60] mt-5">
                      Book a call:{' '}
                      <a href="https://modernmustardseed.com/book" className="text-[#A8741A] font-semibold">
                        modernmustardseed.com/book
                      </a>
                    </p>

                    <div className="mt-7 pt-5 border-t border-[#E7DECC]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8A8170] font-bold">With faith,</p>
                      <p className="text-[22px] font-semibold mt-1" style={{ fontFamily: 'Georgia, serif' }}>
                        Sarah
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.15em] text-[#A8741A] font-bold mt-0.5">
                        Founder, Modern Mustard Seed
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-[11px] uppercase tracking-[0.25em] text-[#A8741A] font-bold mb-1.5">{title}</h3>
      <p className="text-[14.5px] text-[#474F60] leading-relaxed whitespace-pre-line">{children}</p>
    </div>
  );
}
