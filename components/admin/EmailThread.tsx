'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DripPanel from '@/components/admin/outbound/DripPanel';

/**
 * WHAT WE SENT THEM, AND WHAT GOES NEXT.
 *
 * The panel that ends "something left at 8:20 and I do not know what it said".
 * One contact, every email they have ever been sent, the exact bytes of each
 * one, what the provider did with it, whether it was opened, anything they
 * wrote back, and the rest of the drip with the day each piece is due and the
 * body it will carry.
 *
 * It drops onto three screens that do not share a palette (the Outbound
 * cockpit's brass, Acquisition's pop, the Client Book's cream), so every colour
 * here is written out rather than inherited. Nothing is left to `body`, which
 * is the trap that renders un-classed admin text white on cream.
 *
 * The preview is deliberately inert. Its open pixel is stripped and its buttons
 * have no href, because a rendered tracking pixel would report that the
 * prospect read the email and a stray click would build engagement on the
 * funnel. The real destinations are listed underneath instead.
 */

type EmailLink = { label: string; url: string };

type ThreadMessage = {
  id: string;
  direction: 'outbound' | 'inbound';
  kind: string;
  step: number | null;
  variant: string | null;
  subject: string;
  from: string;
  to: string;
  occurredAt: string;
  status: string;
  statusDetail: string | null;
  deliveredAt: string | null;
  bouncedAt: string | null;
  html: string | null;
  text: string | null;
  links: EmailLink[];
  opens: number;
  clicks: number;
  machineHits: number;
  bodyMissing: boolean;
};

type ScheduledMessage = {
  id: string;
  kind: string;
  step: number | null;
  variant: string | null;
  subject: string | null;
  html: string | null;
  links: EmailLink[];
  dueAt: string | null;
  source: 'queued' | 'projected';
  status: string;
  note: string;
};

type Refusal = { id: string; at: string; reason: string; kind: string };

type Thread = {
  email: string | null;
  leadId: string | null;
  businessName: string | null;
  contactName: string | null;
  messages: ThreadMessage[];
  scheduled: ScheduledMessage[];
  refusals: Refusal[];
  sequence: { length: number; stage: number; gaps: number[]; stoppedReason: string | null } | null;
  missingBodies: number;
};

const KIND_LABEL: Record<string, string> = {
  campaign: 'Drip',
  demo: 'Demo',
  followup: 'Follow-up',
  checkout: 'Checkout',
  transactional: 'One-off',
  reply: 'Their reply',
  email: 'Drip',
  call: 'Call',
  build: 'Build',
  demo_email: 'Demo',
  research: 'Research',
};

/** Statuses that mean the message did not land, and must read as a failure. */
const BAD = /^(bounced|complaint|failed|suppressed|blocked|refused|undelivered)$/i;
const GOOD = /^(delivered|received|opened)$/i;

function fmtWhen(iso: string | null): string {
  if (!iso) return 'no date';
  const d = new Date(iso);
  const today = new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtDay(iso: string | null): string {
  if (!iso) return 'no date';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function ago(iso: string | null): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (Math.abs(s) < 90) return 'just now';
  const m = Math.round(s / 60);
  if (Math.abs(m) < 60) return m > 0 ? `${m}m ago` : `in ${-m}m`;
  const h = Math.round(m / 60);
  if (Math.abs(h) < 24) return h > 0 ? `${h}h ago` : `in ${-h}h`;
  const d = Math.round(h / 24);
  return d > 0 ? `${d}d ago` : `in ${-d}d`;
}

function Tag({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'good' | 'bad' | 'warn' | 'ink' }) {
  const cls =
    tone === 'good'
      ? 'bg-[#3f5d34]/12 text-[#2c4225] border-[#3f5d34]/40'
      : tone === 'bad'
        ? 'bg-[#E0301E]/10 text-[#a32315] border-[#E0301E]/45'
        : tone === 'warn'
          ? 'bg-[#F5B700]/25 text-[#7a5c00] border-[#F5B700]'
          : tone === 'ink'
            ? 'bg-[#161616] text-[#FBF6EA] border-[#161616]'
            : 'bg-[#161616]/[0.06] text-[#161616]/70 border-[#161616]/20';
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}

/** The rendered message, made inert upstream. Sandboxed with nothing allowed. */
function Preview({ html, text }: { html: string | null; text: string | null }) {
  const [tall, setTall] = useState(false);
  if (!html && !text) {
    return (
      <p className="mt-3 text-[13px] text-[#161616]/60">
        The send is on the record but the body was never stored, so there is nothing to render.
      </p>
    );
  }
  if (!html) {
    return (
      <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg border-2 border-[#161616]/15 bg-white p-3 text-[12px] leading-relaxed text-[#161616]">
        {text}
      </pre>
    );
  }
  return (
    <>
      {/*
        Said BEFORE the click, not after it.
        This note used to live at the bottom of the link list, under a 30rem
        iframe, which meant the first thing anybody did was press the big yellow
        button, watch nothing happen, and report the button as broken. It is not
        broken; it is disarmed on purpose, and that has to be readable from the
        same screenful as the button it describes.
      */}
      <p className="mt-3 rounded-t-lg border-2 border-b-0 border-[#161616]/20 bg-[#F5B700]/20 px-3 py-2 text-[11px] leading-snug text-[#161616]/75">
        <span className="font-mono font-semibold uppercase tracking-[0.14em]">Read only.</span> The buttons below do
        nothing here. Every one is a tracked redirect, and pressing it would record a click this contact never made.
        Their real destinations are listed underneath. Phone links still dial.
      </p>
      <iframe
        title="What they were sent"
        className="w-full rounded-b-lg border-2 border-[#161616]/20 bg-white"
        style={{ height: tall ? '70rem' : '30rem' }}
        srcDoc={html}
        sandbox=""
      />
      <button
        type="button"
        onClick={() => setTall((v) => !v)}
        className="mt-1.5 text-[11px] font-mono uppercase tracking-[0.12em] text-[#161616]/60 underline hover:text-[#161616]"
      >
        {tall ? 'Shorter' : 'Show the whole thing'}
      </button>
    </>
  );
}

function Links({ links }: { links: EmailLink[] }) {
  const [copied, setCopied] = useState('');
  if (!links.length) return null;
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      /* the URL is on screen either way */
    }
  };
  return (
    <div className="mt-3 rounded-lg border-2 border-[#161616]/12 bg-[#161616]/[0.03] p-3">
      <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[#161616]/55">
        Where the buttons go
      </p>
      <ul className="mt-1.5 space-y-1">
        {links.map((l) => (
          <li key={l.url} className="flex flex-wrap items-baseline gap-2 text-[12px] text-[#161616]">
            <span className="font-semibold">{l.label.slice(0, 60) || 'link'}</span>
            <span className="min-w-0 break-all font-mono text-[11px] text-[#161616]/55">{l.url}</span>
            <button
              type="button"
              onClick={() => void copy(l.url)}
              className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#1E50C8] underline hover:text-[#161616]"
            >
              {copied === l.url ? 'copied' : 'copy'}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-snug text-[#161616]/55">
        Copy one to open it yourself. The tracked ones record a click against this contact when they are followed, so
        open them from a private window if you are only checking that the page loads.
      </p>
    </div>
  );
}

function SentRow({ m, openId, setOpenId }: { m: ThreadMessage; openId: string | null; setOpenId: (id: string | null) => void }) {
  const open = openId === m.id;
  const inbound = m.direction === 'inbound';
  const tone = BAD.test(m.status) ? 'bad' : GOOD.test(m.status) ? 'good' : 'plain';
  return (
    <li className={`rounded-xl border-2 ${inbound ? 'border-[#3f5d34]/50 bg-[#3f5d34]/[0.05]' : 'border-[#161616]/15 bg-white'}`}>
      <button
        type="button"
        onClick={() => setOpenId(open ? null : m.id)}
        className="flex w-full flex-wrap items-center gap-2 px-3.5 py-3 text-left"
      >
        <span className="font-mono text-[11px] tabular-nums text-[#161616]/60">{fmtWhen(m.occurredAt)}</span>
        <Tag tone={inbound ? 'good' : 'plain'}>{inbound ? '← in' : '→ out'}</Tag>
        <Tag>{KIND_LABEL[m.kind] ?? m.kind}</Tag>
        {m.step ? <Tag tone="ink">{`email ${m.step}`}</Tag> : null}
        {m.variant ? <Tag>{`arm ${m.variant}`}</Tag> : null}
        <span className="min-w-0 flex-1 basis-full truncate text-[13px] font-semibold text-[#161616] sm:basis-auto">
          {m.subject}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {m.opens > 0 && <Tag tone="good">{`${m.opens} open${m.opens === 1 ? '' : 's'}`}</Tag>}
          {m.clicks > 0 && <Tag tone="good">{`${m.clicks} click${m.clicks === 1 ? '' : 's'}`}</Tag>}
          {m.machineHits > 0 && <Tag tone="warn">{`${m.machineHits} scanner`}</Tag>}
          <Tag tone={tone}>{m.status}</Tag>
          <span className="font-mono text-[11px] text-[#161616]/45">{open ? '−' : '+'}</span>
        </span>
      </button>

      {open && (
        <div className="border-t-2 border-[#161616]/10 px-3.5 py-3">
          <dl className="grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
            <Fact label="To" value={m.to} />
            <Fact label="From" value={m.from} />
            <Fact label="Sent" value={`${fmtWhen(m.occurredAt)} · ${ago(m.occurredAt)}`} />
            <Fact
              label="Delivery"
              value={
                m.bouncedAt
                  ? `Bounced ${fmtWhen(m.bouncedAt)}`
                  : m.deliveredAt
                    ? `Delivered ${fmtWhen(m.deliveredAt)}`
                    : m.status
              }
            />
          </dl>
          {m.statusDetail && <p className="mt-2 text-[12px] text-[#a32315]">{m.statusDetail}</p>}
          <Preview html={m.html} text={m.text} />
          <Links links={m.links} />
        </div>
      )}
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-[#161616]/55">{label}</dt>
      <dd className="min-w-0 break-words text-[#161616]/85">{value}</dd>
    </div>
  );
}

function ScheduledRow({
  s,
  openId,
  setOpenId,
  onSendNow,
  sending,
}: {
  s: ScheduledMessage;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onSendNow: ((step: number) => void) | null;
  sending: boolean;
}) {
  const open = openId === s.id;
  const failed = s.status === 'failed';
  // Only a projected email can be pulled forward. A queued one is already
  // committed and jumping it would just make a second row for the same step.
  const canSendNow = Boolean(onSendNow) && s.source === 'projected' && s.kind === 'email' && Boolean(s.step);
  return (
    <li className={`rounded-xl border-2 ${failed ? 'border-[#E0301E]/45 bg-[#E0301E]/[0.05]' : 'border-[#F5B700] bg-[#F5B700]/[0.10]'}`}>
      <button
        type="button"
        onClick={() => setOpenId(open ? null : s.id)}
        className="flex w-full flex-wrap items-center gap-2 px-3.5 py-3 text-left"
        disabled={!s.html && !s.subject}
      >
        <span className="font-mono text-[11px] tabular-nums text-[#161616]/70">{fmtDay(s.dueAt)}</span>
        <Tag tone="warn">{s.source === 'queued' ? 'queued' : 'scheduled'}</Tag>
        <Tag>{KIND_LABEL[s.kind] ?? s.kind}</Tag>
        {s.step ? <Tag tone="ink">{`email ${s.step}`}</Tag> : null}
        {s.variant ? <Tag>{`arm ${s.variant}`}</Tag> : null}
        <span className="min-w-0 flex-1 basis-full truncate text-[13px] font-semibold text-[#161616] sm:basis-auto">
          {s.subject ?? s.note}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#161616]/55">{ago(s.dueAt)}</span>
          {(s.html || s.subject) && <span className="font-mono text-[11px] text-[#161616]/45">{open ? '−' : '+'}</span>}
        </span>
      </button>
      {open && (
        <div className="border-t-2 border-[#161616]/10 px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-[12px] text-[#161616]/70">{s.note}</p>
            {canSendNow && (
              <button
                type="button"
                disabled={sending}
                onClick={() => onSendNow?.(s.step as number)}
                className="shrink-0 rounded-xl border-2 border-[#161616] bg-[#F5B700] px-3.5 py-2 font-oswald text-xs font-semibold uppercase tracking-[0.08em] text-[#161616] shadow-[3px_3px_0_0_#161616] transition-all hover:-translate-y-0.5 disabled:opacity-40"
              >
                {sending ? 'Queueing...' : 'Send this one now'}
              </button>
            )}
          </div>
          {canSendNow && (
            <p className="mt-1.5 text-[11px] leading-snug text-[#161616]/55">
              It jumps the drip gap and goes out in the next send window. The governor still applies: the window, the
              daily cap and the bounce brake all still have to say yes.
            </p>
          )}
          <Preview html={s.html} text={null} />
          <Links links={s.links} />
        </div>
      )}
    </li>
  );
}

export default function EmailThread({
  leadId,
  email,
  title = 'Every email they have been sent',
}: {
  leadId?: string | null;
  email?: string | null;
  title?: string;
}) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openSent, setOpenSent] = useState<string | null>(null);
  const [openNext, setOpenNext] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [dripOpen, setDripOpen] = useState(false);

  const load = useCallback(async () => {
    if (!leadId && !email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (leadId) qs.set('leadId', leadId);
      if (email) qs.set('email', email);
      const res = await fetch(`/api/admin/email-thread?${qs.toString()}`);
      const json = (await res.json().catch(() => ({}))) as Thread & { error?: string };
      if (!res.ok) throw new Error(json.error || `Could not read the thread (${res.status}).`);
      setThread(json);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the thread.');
    } finally {
      setLoading(false);
    }
  }, [leadId, email]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Pull an email forward. This QUEUES it rather than sending it, because every
   * campaign send goes through the governor and the send window exists to
   * protect the domain the client invoices ride on. Nothing here is an override
   * of that; it only removes the wait.
   */
  const sendNow = useCallback(
    async (step: number) => {
      const id = thread?.leadId;
      if (!id) return;
      setSending(true);
      setNotice('');
      setError('');
      try {
        const res = await fetch(`/api/admin/acquisition/prospects/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'queue-email', step }),
        });
        const json = (await res.json().catch(() => ({}))) as { created?: boolean; error?: string };
        if (!res.ok) throw new Error(json.error || `Could not queue it (${res.status}).`);
        setNotice(
          json.created
            ? `Email ${step} is queued. It leaves in the next send window.`
            : `Email ${step} was already queued, so nothing changed.`,
        );
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not queue it.');
      } finally {
        setSending(false);
      }
    },
    [thread?.leadId, load],
  );

  const counts = useMemo(() => {
    const ms = thread?.messages ?? [];
    return {
      out: ms.filter((m) => m.direction === 'outbound').length,
      replies: ms.filter((m) => m.direction === 'inbound').length,
      delivered: ms.filter((m) => m.status === 'delivered').length,
      bounced: ms.filter((m) => BAD.test(m.status)).length,
      opened: ms.filter((m) => m.opens > 0).length,
    };
  }, [thread]);

  const seq = thread?.sequence ?? null;
  const nextDue = thread?.scheduled.find((s) => s.kind === 'email' || s.kind === 'campaign');

  return (
    <section className="rounded-2xl border-2 border-[#161616] bg-[#FFFDF8] p-5 text-[#161616] shadow-[5px_5px_0_0_#161616] md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-oswald text-lg font-bold uppercase tracking-[0.06em] text-[#161616]">{title}</h2>
          <p className="mt-0.5 max-w-2xl text-xs leading-snug text-[#161616]/65">
            Every send, the exact bytes of it, what the provider did with it, and what goes out next.
            {thread?.email ? ` Mail to and from ${thread.email}.` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/*
            The drip lived on one screen. It was built into the outbound call
            cockpit's reach-out deck, which means it existed for a lead you were
            about to phone and nowhere else: not on the Acquisition prospect,
            not in the Client Book. Sarah: "i dont see the create drip campaign
            on the contact cards." It hangs off this panel now, which is already
            mounted on all three, and the panel is the right neighbour for it
            anyway: everything else here is what was sent and what goes next.
          */}
          {thread?.leadId && (
            <button
              type="button"
              onClick={() => setDripOpen(true)}
              className="rounded-xl border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 font-oswald text-xs font-semibold uppercase tracking-[0.08em] text-[#161616] shadow-[3px_3px_0_0_#161616] transition-all hover:-translate-y-0.5"
            >
              Drip campaign
            </button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border-2 border-[#161616] bg-[#FFFDF8] px-3 py-1.5 font-oswald text-xs font-medium uppercase tracking-[0.08em] text-[#161616] shadow-[3px_3px_0_0_#161616] transition-all hover:-translate-y-0.5"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
      {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

      {loading && !thread && <p className="text-sm text-[#161616]/60">Opening the mailbox...</p>}

      {thread && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#161616]/75">
            <span className="font-semibold text-[#161616]">{counts.out} sent</span>
            <span>{counts.delivered} delivered</span>
            {counts.opened > 0 && <span className="text-[#2c4225]">{counts.opened} opened</span>}
            {counts.bounced > 0 && <span className="font-semibold text-[#a32315]">{counts.bounced} did not land</span>}
            {counts.replies > 0 && <span className="font-semibold text-[#2c4225]">{counts.replies} reply back</span>}
            {seq && (
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#161616]/55">
                drip {seq.stage} of {seq.length}
              </span>
            )}
          </div>

          {seq?.stoppedReason ? (
            <p className="mb-4 rounded-xl border-2 border-[#161616]/20 bg-[#161616]/[0.04] px-3.5 py-2.5 text-[13px] text-[#161616]/80">
              <span className="font-semibold text-[#161616]">Nothing more is scheduled. </span>
              {seq.stoppedReason}
            </p>
          ) : nextDue ? (
            <p className="mb-4 text-[13px] text-[#161616]/80">
              <span className="font-semibold text-[#161616]">Next out: </span>
              {nextDue.subject ? `"${nextDue.subject}"` : KIND_LABEL[nextDue.kind] ?? nextDue.kind} on{' '}
              {fmtDay(nextDue.dueAt)}.
            </p>
          ) : null}

          <p className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-[#161616]/55">
            Sent so far, in order ({thread.messages.length})
          </p>
          {thread.messages.length === 0 ? (
            <p className="text-sm text-[#161616]/60">
              Nothing has been emailed to this contact yet.
            </p>
          ) : (
            <ul className="mb-5 space-y-2">
              {[...thread.messages].reverse().map((m) => (
                <SentRow key={m.id} m={m} openId={openSent} setOpenId={setOpenSent} />
              ))}
            </ul>
          )}

          {thread.scheduled.length > 0 && (
            <>
              <p className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-[#161616]/55">
                Still to go ({thread.scheduled.length})
              </p>
              <ul className="space-y-2">
                {thread.scheduled.map((s) => (
                  <ScheduledRow
                    key={s.id}
                    s={s}
                    openId={openNext}
                    setOpenId={setOpenNext}
                    onSendNow={thread.leadId ? sendNow : null}
                    sending={sending}
                  />
                ))}
              </ul>
            </>
          )}

          {thread.refusals.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-[11px] font-mono uppercase tracking-[0.16em] text-[#161616]/55">
                {thread.refusals.length} attempt{thread.refusals.length === 1 ? '' : 's'} the governor held back
              </summary>
              <ul className="mt-2 space-y-1">
                {thread.refusals.map((r) => (
                  <li key={r.id} className="flex flex-wrap gap-2 text-[12px] text-[#161616]/70">
                    <span className="font-mono tabular-nums text-[#161616]/55">{fmtWhen(r.at)}</span>
                    <span>{r.reason}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] leading-snug text-[#161616]/55">
                These never reached anybody. They are here so a quiet day has a reason attached to it.
              </p>
            </details>
          )}

          {thread.leadId && (
            <DripPanel
              lead={{ id: thread.leadId, business_name: thread.businessName ?? thread.email ?? 'this contact' }}
              open={dripOpen}
              onClose={() => {
                setDripOpen(false);
                void load();
              }}
              push={(text, tone) => (tone === 'error' ? setError(text) : setNotice(text))}
            />
          )}

          {thread.missingBodies > 0 && (
            <p className="mt-3 text-[12px] text-[#161616]/60">
              {thread.missingBodies} of these were recorded before the body was stored, so only the subject survives.
            </p>
          )}
        </>
      )}
    </section>
  );
}
