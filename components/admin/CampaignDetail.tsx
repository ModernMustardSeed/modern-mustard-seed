'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import AdminHeader from './AdminHeader';
import type { Campaign, Contact } from '@/data/campaigns';
import { personalize, primaryContact } from '@/data/campaigns';

/**
 * One account, fully loaded so anyone on the team can run it today: a one-click
 * Run sheet, the live demo asset, the pricing, the real decision-makers, and a
 * ready-to-send email per person. It can be run as Sarah or Polly (the rep
 * switcher swaps the signature + booking link on every piece of copy).
 *
 * The Run sheet creates the real client + project record, so proposals,
 * deposits, and signatures all flow through the existing admin pipeline. Per-rep
 * state (rep choice + each contact's outreach status) lives in localStorage.
 */

// Who can run a campaign. Each carries their own booking link (so replies
// attribute to them) and their own studio (Zoho) mailbox, which is the address
// their emails send from. Polly is the default (named lead); Sarah can flip it.
const REPS = [
  { name: 'Sarah Scarano', first: 'Sarah', fromEmail: 'sarah@modernmustardseed.com', cell: '(406) 250-6076', book: 'https://modernmustardseed.com/book' },
  { name: 'Polly Thompson', first: 'Polly', fromEmail: 'polly.thompson@modernmustardseed.com', cell: '', book: 'https://modernmustardseed.com/book?ref=POLLYTHOCN3X' },
];
type Rep = (typeof REPS)[number];

const STATUSES = ['to-send', 'sent', 'replied', 'meeting', 'won', 'no'] as const;
type OutreachStatus = (typeof STATUSES)[number];
const STATUS_LABEL: Record<OutreachStatus, string> = {
  'to-send': 'To send', sent: 'Sent', replied: 'Replied', meeting: 'Meeting', won: 'Won', no: 'No',
};
const STATUS_CLS: Record<OutreachStatus, string> = {
  'to-send': 'bg-[#FFFDF6] text-[#161616]/60 border-[#161616]/25',
  sent: 'bg-blue-100 text-[#1E50C8] border-[#1E50C8]/30',
  replied: 'bg-amber-100 text-amber-800 border-amber-800/25',
  meeting: 'bg-[#F5B700]/25 text-[#161616] border-[#161616]/30',
  won: 'bg-emerald-600 text-white border-[#161616]/20',
  no: 'bg-[#161616]/[0.06] text-[#161616]/45 border-[#161616]/15',
};
const SENT_SET = new Set<OutreachStatus>(['sent', 'replied', 'meeting', 'won']);

const STATUS_EVENT = 'mms-campaign-status';
function readContactStatus(slug: string, id: string): OutreachStatus {
  try {
    const raw = localStorage.getItem(`mms_campaign_${slug}_${id}`);
    if (raw) { const v = JSON.parse(raw); if (v?.status) return v.status; }
  } catch {}
  return 'to-send';
}

function StatusBadge({ status }: { status: Campaign['status'] }) {
  const map: Record<Campaign['status'], string> = {
    live: 'bg-emerald-100 text-emerald-800 border-emerald-800/30',
    building: 'bg-amber-100 text-amber-800 border-amber-800/30',
    paused: 'bg-[#161616]/[0.06] text-[#161616]/50 border-[#161616]/20',
    won: 'bg-emerald-600 text-white border-[#161616]/20',
    lost: 'bg-red-100 text-[#E0301E] border-[#E0301E]/30',
  };
  return (
    <span className={`text-[9px] uppercase tracking-[0.2em] font-mono font-bold px-2.5 py-1 rounded-full border ${map[status]}`}>
      {status === 'live' ? '● Live + ready' : status}
    </span>
  );
}

function CopyBtn({ text, label = 'Copy', className = '' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {}
      }}
      className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-[#FFF8E6] hover:-translate-y-0.5 transition-all ${className}`}
    >
      {done ? '✓ Copied' : label}
    </button>
  );
}

// ── Run sheet: the one-click to-do that runs the account ──────────────────────

type ProjectLite = {
  id: string; client_email: string; name: string; status: string;
  deliverables?: { proposalSigned?: boolean; depositPaid?: boolean; balancePaid?: boolean };
};

function RunSheet({ campaign, rep, onJump }: { campaign: Campaign; rep: Rep; onJump: () => void }) {
  const primary = primaryContact(campaign);
  const primaryEmail = (primary?.emailGuess ?? '').toLowerCase();
  const [project, setProject] = useState<ProjectLite | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [sentCount, setSentCount] = useState(0);

  const verifiedCount = campaign.contacts.filter((c) => c.emailStatus === 'verified').length;
  const total = campaign.contacts.length;

  const computeSent = useCallback(() => {
    setSentCount(campaign.contacts.filter((c) => SENT_SET.has(readContactStatus(campaign.slug, c.id))).length);
  }, [campaign]);

  useEffect(() => {
    computeSent();
    const h = () => computeSent();
    window.addEventListener(STATUS_EVENT, h);
    return () => window.removeEventListener(STATUS_EVENT, h);
  }, [computeSent]);

  const load = useCallback(async () => {
    if (!primaryEmail) return;
    try {
      const r = await fetch('/api/admin/projects');
      const j = await r.json().catch(() => null);
      if (r.ok && j) {
        const match = (j.projects || []).find((p: ProjectLite) => String(p.client_email).toLowerCase() === primaryEmail);
        setProject(match ?? null);
      }
    } catch {}
  }, [primaryEmail]);
  useEffect(() => { load(); }, [load]);

  const createProject = async () => {
    if (!primary || creating) return;
    setCreating(true); setErr('');
    try {
      const r = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_email: primaryEmail,
          name: `${campaign.brand} (${campaign.product})`,
          client_name: primary.name,
          client_company: campaign.brand,
          status: 'discovery',
          summary: `Outreach campaign: ${campaign.product}. Account lead ${campaign.lead.name}.`,
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) setErr((j && j.error) || 'Could not create the project.');
      else await load();
    } finally { setCreating(false); }
  };

  const proposalHref = `/admin/proposals?email=${encodeURIComponent(primaryEmail)}`;
  const dlv = project?.deliverables ?? {};

  type Step = { id: string; done: boolean; title: string; detail: string; node: ReactNode };
  const actBtn = (label: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled} className="shrink-0 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-[#FFD23F] hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 transition-all">{label}</button>
  );
  const linkBtn = (label: string, href: string, disabled = false) => disabled ? (
    <span title="Create the client + project first" className="shrink-0 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-extrabold text-[#161616]/40 bg-white border-2 border-[#161616]/25 rounded-lg cursor-not-allowed">{label}</span>
  ) : (
    <Link href={href} className="shrink-0 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-[#FFF8E6] hover:-translate-y-0.5 transition-all">{label}</Link>
  );

  const steps: Step[] = [
    {
      id: 'verify', done: verifiedCount === total && total > 0,
      title: 'Emails verified',
      detail: verifiedCount === total ? `All ${total} confirmed via Hunter. Good to send.` : `${verifiedCount} of ${total} confirmed. Confirm the flagged ones on LinkedIn before sending.`,
      node: <span className="shrink-0 text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-emerald-800">{verifiedCount}/{total} ✓</span>,
    },
    {
      id: 'project', done: !!project,
      title: project ? 'Client + project created' : 'Create the client + project',
      detail: project ? `In Projects as “${project.name}”. Their portal account is keyed to ${primaryEmail}.` : `Adds ${campaign.brand} to Projects (client ${primary?.name}, ${primaryEmail}) and opens the proposal pipeline.`,
      node: project ? linkBtn('Open in Projects', '/admin/projects') : actBtn(creating ? 'Creating…' : 'Create', createProject, creating || !primaryEmail),
    },
    {
      id: 'emails', done: sentCount >= total && total > 0,
      title: 'Send the intro emails',
      detail: `${sentCount} of ${total} marked sent. Send each straight from ${rep.fromEmail}, or open it in your mail app. Every one is prefilled and signed as ${rep.name}.`,
      node: actBtn('Go to emails', onJump),
    },
    {
      id: 'proposal', done: !!dlv.proposalSigned,
      title: 'Send and sign the proposal',
      detail: dlv.proposalSigned ? 'Proposal signed.' : 'Build the proposal and send it for e-signature.',
      node: linkBtn('Open Proposals', proposalHref, !project),
    },
    {
      id: 'deposit', done: !!dlv.depositPaid,
      title: 'Collect the deposit',
      detail: dlv.depositPaid ? 'Deposit paid.' : 'Send the deposit invoice from the proposal.',
      node: linkBtn('Open Proposals', proposalHref, !project),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="rounded-3xl border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b-2 border-[#161616] bg-[#F5B700]/15">
        <div>
          <h2 className="font-sans text-lg font-extrabold text-[#161616]">Run sheet</h2>
          <p className="text-[11px] font-body text-[#161616]/55">Review, then click. Nothing sends until you do.</p>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full px-3 py-1">{doneCount}/{steps.length} done</span>
      </div>
      <ol className="divide-y divide-[#161616]/10">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 px-5 sm:px-6 py-3.5">
            <span className={`shrink-0 h-7 w-7 rounded-full border-2 border-[#161616] flex items-center justify-center font-mono text-xs font-bold ${s.done ? 'bg-emerald-500 text-white' : 'bg-white text-[#161616]'}`}>
              {s.done ? '✓' : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-sans text-sm font-bold ${s.done ? 'text-[#161616]/55 line-through' : 'text-[#161616]'}`}>{s.title}</p>
              <p className="font-body text-[12px] text-[#161616]/60 leading-snug">{s.detail}</p>
            </div>
            {s.node}
          </li>
        ))}
      </ol>
      {err && <p className="text-[#E0301E] text-xs font-body px-6 pb-3">{err}</p>}
    </div>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<number, string> = { 1: 'Primary', 2: 'Secondary', 3: 'Supporting' };

function ContactCard({ c, slug, rep, product, brand }: { c: Contact; slug: string; rep: Rep; product: string; brand: string }) {
  const [status, setStatus] = useState<OutreachStatus>('to-send');
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(c.priority === 1);
  const key = `mms_campaign_${slug}_${c.id}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const v = JSON.parse(raw);
        if (v.status) setStatus(v.status);
        if (typeof v.note === 'string') setNote(v.note);
      }
    } catch {}
  }, [key]);

  const persist = useCallback((s: OutreachStatus, n: string) => {
    try { localStorage.setItem(key, JSON.stringify({ status: s, note: n })); } catch {}
    try { window.dispatchEvent(new Event(STATUS_EVENT)); } catch {}
  }, [key]);

  const first = c.name.split(' ')[0];
  const toEmail = c.emailGuess ?? '';

  // The email draft is editable so the rep can tweak it or try an AI rewrite. It
  // resets to the personalized template whenever the rep changes (the {{REP}} and
  // {{BOOK}} tokens depend on who is running the campaign).
  const origSubject = personalize(c.email.subject, { book: rep.book, rep: rep.name, name: first, cell: rep.cell });
  const origBody = personalize(c.email.body, { book: rep.book, rep: rep.name, name: first, cell: rep.cell });
  const [subject, setSubject] = useState(origSubject);
  const [body, setBody] = useState(origBody);
  const [prevDraft, setPrevDraft] = useState<{ subject: string; body: string } | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  useEffect(() => {
    setSubject(origSubject);
    setBody(origBody);
    setPrevDraft(null);
    setConfirmSend(false);
    setMsg(null);
  }, [origSubject, origBody]);
  const edited = subject !== origSubject || body !== origBody;

  const mailto = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const rewrite = async () => {
    if (rewriting) return;
    setRewriting(true);
    setMsg(null);
    try {
      const r = await fetch('/api/admin/campaigns/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, context: { name: first, title: c.title, company: c.company, product, brand, hook: c.angle, rep: rep.name, cell: rep.cell } }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) setMsg({ kind: 'err', text: (j && j.error) || 'Rewrite failed. Try again.' });
      else {
        setPrevDraft({ subject, body });
        setSubject(j.subject);
        setBody(j.body);
        setMsg({ kind: 'ok', text: 'A fresh draft from AI. Edit it, keep it, or undo.' });
      }
    } catch {
      setMsg({ kind: 'err', text: 'Rewrite failed. Try again.' });
    } finally {
      setRewriting(false);
    }
  };

  const undoRewrite = () => {
    if (prevDraft) { setSubject(prevDraft.subject); setBody(prevDraft.body); setPrevDraft(null); setMsg(null); }
  };
  const resetDraft = () => { setSubject(origSubject); setBody(origBody); setPrevDraft(null); setMsg(null); };

  const doSend = async () => {
    if (sending) return;
    setSending(true);
    setMsg(null);
    try {
      const r = await fetch('/api/admin/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail, fromEmail: rep.fromEmail, subject, body }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) setMsg({ kind: 'err', text: (j && j.error) || 'Send failed.' });
      else {
        setConfirmSend(false);
        setStatus('sent');
        persist('sent', note);
        setMsg({ kind: 'ok', text: `Sent from ${rep.fromEmail}. Delivering now.` });
      }
    } catch {
      setMsg({ kind: 'err', text: 'Send failed.' });
    } finally {
      setSending(false);
    }
  };

  const [openScript, setOpenScript] = useState(false);
  const cs = c.callScript;
  const psc = cs && {
    open: personalize(cs.open, { book: rep.book, rep: rep.name, name: first, cell: rep.cell }),
    value: personalize(cs.value, { book: rep.book, rep: rep.name, name: first, cell: rep.cell }),
    close: personalize(cs.close, { book: rep.book, rep: rep.name, name: first, cell: rep.cell }),
    voicemail: personalize(cs.voicemail, { book: rep.book, rep: rep.name, name: first, cell: rep.cell }),
    gatekeeper: personalize(cs.gatekeeper, { book: rep.book, rep: rep.name, name: first, cell: rep.cell }),
  };
  const fullScript = psc ? `OPEN\n${psc.open}\n\nVALUE\n${psc.value}\n\nCLOSE\n${psc.close}\n\nVOICEMAIL (20s)\n${psc.voicemail}\n\nGATEKEEPER\n${psc.gatekeeper}` : '';
  const telNum = c.phone?.match(/\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/)?.[0] ?? '';
  const telHref = telNum ? 'tel:+1' + telNum.replace(/\D/g, '') : '';
  const phoneRest = c.phone ? c.phone.split('·').slice(1).join('·').trim() : '';

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-sans text-base font-bold text-[#161616]">{c.name}</h3>
              <span className="text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#E0301E]">{PRIORITY_LABEL[c.priority]}</span>
              <span className={`text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded-full border ${STATUS_CLS[status]}`}>{STATUS_LABEL[status]}</span>
            </div>
            <p className="text-[#3A3733] font-body text-sm mt-0.5">{c.title} · {c.company}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {c.linkedin && (
              <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-[#1E50C8] bg-white border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-[#FFF8E6] hover:-translate-y-0.5 transition-all">in</a>
            )}
            <a href={mailto} className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-[#FFD23F] hover:-translate-y-0.5 transition-all">Open email</a>
          </div>
        </div>

        <p className="text-[#161616]/55 font-body text-xs italic mt-2">{c.angle}</p>

        <div className="flex items-center gap-2 flex-wrap mt-2.5">
          <span className="text-[9px] uppercase tracking-[0.18em] text-[#161616]/45 font-mono">To:</span>
          <span className="font-mono text-xs text-[#161616]">{c.emailGuess ?? 'find via LinkedIn'}</span>
          <span className={`text-[8px] uppercase tracking-[0.12em] font-mono font-bold px-1.5 py-0.5 rounded border ${c.emailStatus === 'verified' ? 'text-emerald-800 border-emerald-800/30 bg-emerald-50' : 'text-amber-800 border-amber-800/30 bg-amber-50'}`}>
            {c.emailStatus === 'verified' ? 'verified ✓' : 'verify before send'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          <span className="text-[9px] uppercase tracking-[0.18em] text-[#161616]/45 font-mono">From:</span>
          <span className="font-mono text-xs text-[#161616]">{rep.fromEmail}</span>
          <span className="text-[8px] uppercase tracking-[0.12em] font-mono text-[#161616]/40">your Zoho mailbox</span>
        </div>

        {c.phone && (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#161616]/45 font-mono">Call:</span>
            {telNum && <a href={telHref} className="font-mono text-xs font-bold text-[#1E50C8] hover:text-[#161616]">☎ {telNum}</a>}
            {phoneRest && <span className="font-body text-[11px] text-[#161616]/55">{phoneRest}</span>}
          </div>
        )}

        <div className="flex items-center gap-4 mt-3">
          <button onClick={() => setOpen((o) => !o)} className="text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#1E50C8] hover:text-[#161616]">
            {open ? '▲ Hide email' : '▼ Ready email'}
          </button>
          {cs && (
            <button onClick={() => setOpenScript((o) => !o)} className="text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#E0301E] hover:text-[#161616]">
              {openScript ? '▲ Hide call script' : '▼ Call script'}
            </button>
          )}
        </div>

        {open && (
          <div className="mt-3 rounded-xl border-2 border-[#161616]/15 bg-[#FFFDF6] p-3.5">
            {/* Subject (editable) */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/45 font-mono">Subject</span>
              <CopyBtn text={subject} label="Copy subject" className="!py-1 !text-[9px]" />
            </div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Email subject"
              className="w-full font-sans text-sm font-semibold text-[#161616] bg-white border-2 border-[#161616]/20 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#F5B700] focus:border-[#161616]"
            />
            {/* Body (editable) */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/45 font-mono">Body</span>
              <CopyBtn text={body} label="Copy body" className="!py-1 !text-[9px]" />
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-label="Email body"
              rows={Math.min(14, Math.max(8, body.split('\n').length + 1))}
              className="w-full font-body text-[13px] text-[#3A3733] bg-white border-2 border-[#161616]/20 rounded-lg px-3 py-2.5 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[#F5B700] focus:border-[#161616]"
            />

            {/* Toolbar: rewrite / undo / reset / open / send */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={rewrite}
                disabled={rewriting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-[#FFF8E6] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
              >
                {rewriting ? '✍️ Rewriting…' : '✨ Rewrite with AI'}
              </button>
              {prevDraft && (
                <button onClick={undoRewrite} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-sans font-bold text-[#161616]/70 bg-white border-2 border-[#161616]/30 rounded-lg hover:border-[#161616] transition-all">Undo</button>
              )}
              {edited && (
                <button onClick={resetDraft} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-sans font-bold text-[#161616]/70 bg-white border-2 border-[#161616]/30 rounded-lg hover:border-[#161616] transition-all">Reset to original</button>
              )}
              <span className="flex-1 min-w-[8px]" />
              <a href={mailto} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-[#FFF8E6] transition-all">Open in mail app</a>
              <button
                onClick={() => { setConfirmSend(true); setMsg(null); }}
                disabled={!toEmail}
                title={toEmail ? '' : 'No email address on file for this contact'}
                className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.12em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-[#FFD23F] hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 transition-all"
              >
                Send from {rep.first}&apos;s Zoho
              </button>
            </div>

            {/* Inline confirm before a real send */}
            {confirmSend && (
              <div className="mt-3 rounded-lg border-2 border-[#161616] bg-white p-3">
                <p className="font-body text-[13px] text-[#161616] leading-snug">
                  Send this now to <strong>{c.name}</strong> ({toEmail || 'no address'}) as <strong>{rep.fromEmail}</strong>? A copy goes to your inbox.
                </p>
                {c.emailStatus !== 'verified' && (
                  <p className="font-body text-[12px] text-amber-800 mt-1">Heads up: this address is not verified, so it may bounce. Confirm it on LinkedIn first if you are unsure.</p>
                )}
                <div className="flex items-center gap-2 mt-2.5">
                  <button onClick={doSend} disabled={sending} className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.12em] font-sans font-extrabold text-white bg-emerald-600 border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-emerald-500 disabled:opacity-50 transition-all">
                    {sending ? 'Sending…' : 'Yes, send it'}
                  </button>
                  <button onClick={() => setConfirmSend(false)} disabled={sending} className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.12em] font-sans font-bold text-[#161616]/70 bg-white border-2 border-[#161616]/30 rounded-lg hover:border-[#161616] transition-all">Cancel</button>
                </div>
              </div>
            )}

            {msg && (
              <p className={`mt-2.5 font-body text-[12px] ${msg.kind === 'ok' ? 'text-emerald-700' : 'text-[#E0301E]'}`}>{msg.text}</p>
            )}
          </div>
        )}

        {openScript && psc && (
          <div className="mt-3 rounded-xl border-2 border-[#E0301E]/25 bg-[#FFF8F6] p-3.5">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/45 font-mono">Call script · {first}</span>
              <div className="flex gap-2 items-center">
                {telNum && <a href={telHref} className="px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:bg-[#FFD23F] transition-all">☎ Call {telNum}</a>}
                <CopyBtn text={fullScript} label="Copy all" className="!py-1 !text-[9px]" />
              </div>
            </div>
            {([['Open', psc.open], ['Value, in their terms', psc.value], ['Close', psc.close], ['Voicemail (20s)', psc.voicemail], ['Gatekeeper', psc.gatekeeper]] as const).map(([k, v]) => (
              <div key={k} className="mb-2.5">
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold">{k}</span>
                <p className="font-body text-[13px] text-[#3A3733] leading-relaxed whitespace-pre-wrap mt-0.5">{v}</p>
              </div>
            ))}
            <p className="text-[10px] font-mono text-[#161616]/45 mt-1">Lead with the outcome. Quote pricing only if they ask.</p>
          </div>
        )}

        {/* Per-rep status + note (saved on this device) */}
        <div className="mt-3.5 pt-3.5 border-t border-[#161616]/10 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); persist(s, note); }}
                className={`text-[9px] uppercase tracking-[0.12em] font-mono font-bold px-2.5 py-1 rounded-full border transition-colors ${status === s ? STATUS_CLS[s] : 'bg-white text-[#161616]/45 border-[#161616]/20 hover:border-[#161616]/50'}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => { setNote(e.target.value); persist(status, e.target.value); }}
            placeholder="Note (last touch, who you spoke to…)"
            className="flex-1 bg-white border-2 border-[#161616]/30 rounded-lg px-3 py-1.5 text-xs text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] focus:border-[#161616]"
          />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignDetail({ campaign }: { campaign: Campaign }) {
  const [repIdx, setRepIdx] = useState(0);

  useEffect(() => {
    try {
      const v = localStorage.getItem('mms_campaign_rep');
      const i = REPS.findIndex((r) => r.name === v);
      if (i >= 0) setRepIdx(i);
    } catch {}
  }, []);
  const setRep = (i: number) => { setRepIdx(i); try { localStorage.setItem('mms_campaign_rep', REPS[i].name); } catch {} };
  const rep = REPS[repIdx];

  const phone = campaign.assets.find((a) => a.kind === 'phone');
  const jumpToContacts = () => {
    document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="campaigns" title="Campaign" />
      <main className="max-w-5xl mx-auto px-5 sm:px-6 py-8">
        <Link href="/admin/campaigns" className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/50 hover:text-[#161616]">← All campaigns</Link>

        {/* Command header — the signature moment */}
        <div className="relative mt-3 rounded-3xl border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] overflow-hidden">
          <div className={`bg-gradient-to-r ${campaign.accent} px-6 sm:px-8 py-7 text-white`}>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.35em] font-mono font-bold text-white/80">{campaign.product}</span>
              <StatusBadge status={campaign.status} />
            </div>
            <h1 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">{campaign.brand}</h1>
            <p className="font-body text-white/90 text-sm sm:text-base max-w-2xl mt-2 leading-relaxed">{campaign.hook}</p>
            <div className="flex items-center gap-3 flex-wrap mt-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-white/15 border border-white/25 rounded-full px-3 py-1">
                <span className="text-white/70 uppercase tracking-[0.15em] text-[9px]">Lead</span>
                <span className="font-bold">{campaign.lead.name}</span>
              </span>
              <span className="text-[11px] font-mono text-white/70">{campaign.footprint}</span>
            </div>
          </div>
        </div>

        {/* Run as (rep switcher) */}
        <div className="mt-5 flex items-center gap-3 flex-wrap bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] px-4 py-2.5">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono">Running as</span>
          <div className="flex gap-1.5">
            {REPS.map((r, i) => (
              <button
                key={r.name}
                onClick={() => setRep(i)}
                className={`text-[10px] uppercase tracking-[0.12em] font-sans font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${i === repIdx ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]' : 'bg-white text-[#161616]/55 border-[#161616]/25 hover:border-[#161616]/60'}`}
              >
                {r.name.split(' ')[0]}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono text-[#161616]/45 truncate hidden sm:inline">sends from {rep.fromEmail} · books to {rep.book.replace('https://', '')}</span>
        </div>

        {/* Run sheet */}
        <section className="mt-5">
          <RunSheet campaign={campaign} rep={rep} onJump={jumpToContacts} />
        </section>

        {/* Live assets */}
        <section className="mt-8">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-3">The live asset (this is the pitch)</h2>
          <div className="flex flex-wrap gap-2.5">
            {campaign.assets.map((a) => (
              <a
                key={a.label}
                href={a.href}
                target={a.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                title={a.note}
                className={`group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#161616] font-sans text-xs font-bold shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#161616] transition-all ${a.kind === 'phone' ? 'bg-[#F5B700] text-[#161616]' : 'bg-white text-[#161616] hover:bg-[#FFF8E6]'}`}
              >
                <span>{a.kind === 'phone' ? '☎' : a.kind === 'dashboard' ? '▦' : a.kind === 'proposal' || a.kind === 'whitepaper' ? '▤' : '◆'}</span>
                <span>{a.label}</span>
                {a.note && <span className="hidden md:inline text-[10px] font-mono font-normal text-[#161616]/45 group-hover:text-[#161616]/70">· {a.note}</span>}
              </a>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-8">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-3">Pricing (loaded and ready)</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {campaign.pricing.map((t) => (
              <div key={t.name} className={`rounded-2xl border-2 border-[#161616] p-4 shadow-[4px_4px_0_0_#161616] ${t.recommended ? 'bg-[#F5B700]/15' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/60">{t.name}</span>
                  {t.recommended && <span className="text-[8px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616] bg-[#F5B700] border border-[#161616] rounded-full px-2 py-0.5">Best</span>}
                </div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="font-sans text-2xl font-extrabold text-[#161616]">{t.price}</span>
                  {t.cadence && <span className="text-xs font-mono text-[#161616]/50">{t.cadence}</span>}
                </div>
                {t.setup && <p className="text-[11px] font-mono text-[#161616]/55 mt-0.5">{t.setup}</p>}
                <ul className="mt-2.5 space-y-1">
                  {t.includes.map((i) => (
                    <li key={i} className="flex gap-1.5 text-[12px] font-body text-[#3A3733] leading-snug">
                      <span className="text-[#E0301E] mt-0.5 text-[8px]">●</span>
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* The story + talking points */}
        <section className="mt-8 grid lg:grid-cols-2 gap-3">
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2.5">Why they buy</h2>
            <ul className="space-y-2">
              {campaign.theStory.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] font-body text-[#3A3733] leading-relaxed">
                  <span className="text-[#F5B700] mt-1 text-[8px]">●</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2.5">Talking points</h2>
            <ul className="space-y-2">
              {campaign.talkingPoints.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] font-body text-[#3A3733] leading-relaxed">
                  <span className="text-[#1E50C8] mt-1 text-[8px]">●</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Contacts */}
        <section id="contacts" className="mt-9 scroll-mt-24">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">Contacts + ready emails</h2>
          <p className="text-[#161616]/55 font-body text-xs mb-4">
            Every email is written and personalized to the person, signed as <strong className="text-[#161616]">{rep.name}</strong>. Tap <strong className="text-[#161616]">Open email</strong> to launch your mail app with it filled in, or <strong className="text-[#161616]">Copy</strong> to paste anywhere. Mark each one as you go.
          </p>
          <div className="space-y-3">
            {[...campaign.contacts].sort((a, b) => a.priority - b.priority).map((c) => (
              <ContactCard key={c.id} c={c} slug={campaign.slug} rep={rep} product={campaign.product} brand={campaign.brand} />
            ))}
          </div>
        </section>

        {/* LinkedIn DM + voicemail */}
        <section className="mt-8 grid lg:grid-cols-2 gap-3">
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">LinkedIn DM</h2>
              <CopyBtn text={personalize(campaign.linkedinDm, { book: rep.book, rep: rep.name, cell: rep.cell })} label="Copy" className="!py-1 !text-[9px]" />
            </div>
            <p className="font-body text-[13px] text-[#3A3733] leading-relaxed whitespace-pre-wrap">{personalize(campaign.linkedinDm, { book: rep.book, rep: rep.name, cell: rep.cell })}</p>
          </div>
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Voicemail script</h2>
              <CopyBtn text={personalize(campaign.voicemail, { book: rep.book, rep: rep.name, cell: rep.cell })} label="Copy" className="!py-1 !text-[9px]" />
            </div>
            <p className="font-body text-[13px] text-[#3A3733] leading-relaxed whitespace-pre-wrap">{personalize(campaign.voicemail, { book: rep.book, rep: rep.name, cell: rep.cell })}</p>
            {phone && <a href={phone.href} className="inline-block mt-3 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-[#1E50C8] hover:text-[#161616]">☎ Call the demo: {phone.note?.split(' · ')[0] ?? phone.label}</a>}
          </div>
        </section>

        {/* Objections */}
        <section className="mt-8">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-3">If they push back</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {campaign.objections.map((o, i) => (
              <div key={i} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-4">
                <p className="font-sans text-sm font-bold text-[#161616]">“{o.objection}”</p>
                <p className="font-body text-[13px] text-[#3A3733] leading-relaxed mt-1.5">{o.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Playbook */}
        <section className="mt-8 mb-12">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-3">How to run it</h2>
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] divide-y divide-[#161616]/10">
            {campaign.playbook.map((s, i) => (
              <div key={i} className="p-4 flex gap-3">
                <span className="shrink-0 h-7 w-7 rounded-full bg-[#F5B700] border-2 border-[#161616] flex items-center justify-center font-mono text-xs font-bold">{i + 1}</span>
                <div>
                  <p className="font-sans text-sm font-bold text-[#161616]">{s.title.replace(/^\d+\.\s*/, '')}</p>
                  <p className="font-body text-[13px] text-[#3A3733] leading-relaxed mt-0.5">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
