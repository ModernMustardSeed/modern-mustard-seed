'use client';

/**
 * THE HOLD.
 *
 * The screen that answers "we sent the demos and nothing arrived". It reads
 * three things nobody could see before: what mail is queued and overdue, the
 * one governor check that is stopping it, and every refusal the governor has
 * written in the last day, grouped by its own sentence.
 *
 * It is loud on purpose. A queue that is silently refusing everything looks
 * identical to a quiet day, and that ambiguity is the whole bug.
 */

import { useCallback, useEffect, useState } from 'react';
import { Section, Chip, Stat, api, card, cardFlat, btnPrimary } from '@/components/admin/acquisition/ui';

type SendReport = {
  ready: number;
  sent: number;
  skipped: number;
  failed: number;
  held: string | null;
  outcomes: { leadId: string; company: string | null; email: string | null; status: string; note: string }[];
};

type Check = { id: string; label: string; passed: boolean; detail: string; critical: boolean };
type Waiting = { kind: string; label: string; due: number; scheduled: number; oldestDue: string | null; lastNote: string | null };
type Refusal = { reason: string; count: number; firstAt: string; lastAt: string; kinds: string[]; sample: string[] };

export type Hold = {
  held: boolean;
  blocker: { id: string; label: string; detail: string } | null;
  checks: Check[];
  retryAfter: string | null;
  waiting: Waiting[];
  totalDue: number;
  totalScheduled: number;
  refusals: Refusal[];
  refused24h: number;
  sent24h: Record<string, number>;
  error: string | null;
};

const STATUS_TONE: Record<string, 'good' | 'warn' | 'bad' | 'neutral'> = {
  delivered: 'good',
  sent: 'neutral',
  deferred: 'warn',
  bounced: 'bad',
  complaint: 'bad',
  suppressed: 'bad',
  unsubscribed: 'warn',
};

const SEND_KIND_LABELS: Record<string, string> = {
  campaign: 'campaign email',
  followup: 'follow-up',
  demo: 'demo suite email',
  checkout: 'checkout link',
};

function ago(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 48 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} days ago`;
}

function clock(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function useHold(): { hold: Hold | null; reload: () => void } {
  const [hold, setHold] = useState<Hold | null>(null);
  const reload = useCallback(() => {
    void api<{ hold: Hold }>('/api/admin/acquisition/hold')
      .then((r) => setHold(r.hold))
      .catch(() => setHold(null));
  }, []);
  useEffect(() => reload(), [reload]);
  return { hold, reload };
}

export default function TheHold({ hold, onDone }: { hold: Hold | null; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SendReport | null>(null);
  const [sendError, setSendError] = useState('');

  const sendDemosNow = async () => {
    setBusy(true);
    setSendError('');
    setReport(null);
    try {
      const res = await api<{ report: SendReport }>('/api/admin/acquisition/hold', {
        method: 'POST',
        body: JSON.stringify({ action: 'send-demos-now', reason: 'Sent by hand from the Hold.' }),
      });
      setReport(res.report);
      onDone?.();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'That did not go through.');
    } finally {
      setBusy(false);
    }
  };

  if (!hold) return null;

  const nothingWaiting = hold.totalDue === 0 && hold.totalScheduled === 0;
  const demosWaiting = hold.waiting.find((w) => w.kind === 'demo_email')?.due ?? 0;

  return (
    <div className="space-y-6">
      {(demosWaiting > 0 || report) && (
        <section className={`${card} p-6 border-[#F5B700] shadow-[6px_6px_0_0_#F5B700]`}>
          <p className="font-oswald text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a5c00]">Your demos</p>
          <h2 className="mt-1 font-oswald text-2xl font-bold uppercase tracking-tight">
            {demosWaiting > 0
              ? `${demosWaiting} built ${demosWaiting === 1 ? 'demo is' : 'demos are'} built and waiting`
              : 'The waiting demos have gone out'}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#161616]/75 max-w-3xl">
            These go the moment you say so. The send window, the hourly cap, the daily allowance and the bounce brake all
            step aside: they exist to stop the machine running away, not to stand between you and a demo you just built.
            An unsubscribe, the suppression list, a previous hard bounce and a do-not-contact flag never step aside, for
            anyone, ever.
          </p>
          {demosWaiting > 0 && (
            <button className={`${btnPrimary} mt-4`} disabled={busy} onClick={() => void sendDemosNow()}>
              {busy ? 'Sending...' : `Send ${demosWaiting} ${demosWaiting === 1 ? 'demo' : 'demos'} now`}
            </button>
          )}
          {sendError && <p className="mt-3 text-sm font-semibold text-[#E0301E]">{sendError}</p>}
          {report && (
            <div className="mt-4">
              <p className="text-sm font-semibold">
                {report.sent} sent, {report.skipped} skipped, {report.failed} failed.
              </p>
              {report.held && <p className="mt-1 text-sm font-semibold text-[#E0301E]">{report.held}</p>}
              <ul className="mt-2 space-y-1.5">
                {report.outcomes.map((o) => (
                  <li key={o.leadId} className="flex items-start gap-2.5 text-[12px]">
                    <Chip label={o.status} tone={o.status === 'sent' ? 'good' : o.status === 'skipped' ? 'warn' : 'bad'} />
                    <span className="min-w-0">
                      <strong>{o.company ?? o.email ?? o.leadId}</strong>
                      {o.status !== 'sent' && <span className="text-[#161616]/65"> · {o.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {hold.held && hold.blocker && (
        <section className={`${card} p-6 border-[#E0301E] shadow-[6px_6px_0_0_#E0301E]`}>
          <p className="font-oswald text-[11px] font-bold uppercase tracking-[0.18em] text-[#a32315]">Nothing is going out</p>
          <h2 className="mt-1 font-oswald text-2xl font-bold uppercase tracking-tight text-[#161616]">
            {hold.totalDue.toLocaleString()} {hold.totalDue === 1 ? 'message is' : 'messages are'} overdue and the governor is refusing every one
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#161616]">
            <strong>{hold.blocker.label}:</strong> {hold.blocker.detail}
          </p>
          {hold.retryAfter && (
            <p className="mt-2 text-sm text-[#161616]/70">
              It will ask again after <strong>{clock(hold.retryAfter)}</strong> Mountain.
            </p>
          )}
          {!hold.retryAfter && (
            <p className="mt-2 text-sm text-[#161616]/70">
              There is no retry clock on this one. It sends again when the number that failed changes, and not before.
            </p>
          )}
        </section>
      )}

      {!hold.held && !nothingWaiting && (
        <section className={`${card} p-6`}>
          <p className="font-oswald text-[11px] font-bold uppercase tracking-[0.18em] text-[#3f5d34]">Clear</p>
          <h2 className="mt-1 font-oswald text-2xl font-bold uppercase tracking-tight">
            The governor is allowing sends. {hold.totalDue.toLocaleString()} due, {hold.totalScheduled.toLocaleString()} scheduled ahead.
          </h2>
        </section>
      )}

      {hold.error && (
        <section className={`${card} p-5 border-[#E0301E]`}>
          <p className="text-sm font-semibold text-[#a32315]">{hold.error}</p>
        </section>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
        <Section title="What is waiting" note="Pending mail jobs. Overdue means the clock has already passed and the job is being refused or deferred on every drain.">
          {nothingWaiting ? (
            <p className="text-sm text-[#161616]/65">Nothing is queued. An empty queue is not a hold, it is an empty queue.</p>
          ) : (
            <ul className="space-y-3">
              {hold.waiting.map((w) => (
                <li key={w.kind} className={`${cardFlat} p-4`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-oswald text-sm font-bold uppercase tracking-[0.08em]">{w.label}</p>
                    <div className="flex items-center gap-2">
                      {w.due > 0 && <Chip label={`${w.due} overdue`} tone="bad" />}
                      {w.scheduled > 0 && <Chip label={`${w.scheduled} scheduled`} tone="neutral" />}
                    </div>
                  </div>
                  {w.oldestDue && (
                    <p className="mt-1.5 text-xs text-[#161616]/65">
                      Oldest due since {clock(w.oldestDue)} Mountain, {ago(w.oldestDue)}.
                    </p>
                  )}
                  {w.lastNote && <p className="mt-1 text-[12px] font-mono text-[#a32315] break-words">{w.lastNote}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Refused in the last 24 hours"
          note="Every message the governor stopped, grouped by the reason it gave at the moment it stopped it."
        >
          {hold.refusals.length === 0 ? (
            <p className="text-sm text-[#161616]/65">Nothing was refused today.</p>
          ) : (
            <ul className="space-y-3">
              {hold.refusals.map((r) => (
                <li key={r.reason} className={`${cardFlat} p-4`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[14px] font-semibold leading-snug">{r.reason}</p>
                    <Chip label={`${r.count}`} tone="bad" />
                  </div>
                  <p className="mt-1.5 text-xs text-[#161616]/65">
                    {clock(r.firstAt)} to {clock(r.lastAt)} Mountain · {r.kinds.map((k) => SEND_KIND_LABELS[k] ?? k).join(', ')}
                  </p>
                  <p className="mt-1 text-[11px] font-mono text-[#161616]/55 break-all">
                    {r.sample.join(', ')}
                    {r.count > r.sample.length ? ` +${r.count - r.sample.length} more` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="What actually left in the last 24 hours" note="Refusals excluded. This is mail the provider accepted, by the status it reported back.">
        {Object.keys(hold.sent24h).length === 0 ? (
          <p className="text-sm text-[#161616]/65">Nothing left the building in the last 24 hours.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(hold.sent24h)
              .sort((a, b) => b[1] - a[1])
              .map(([status, n]) => (
                <Stat
                  key={status}
                  label={status}
                  value={n.toLocaleString()}
                  tone={STATUS_TONE[status] === 'bad' ? 'red' : STATUS_TONE[status] === 'good' ? 'seed' : STATUS_TONE[status] === 'warn' ? 'warn' : 'ink'}
                />
              ))}
          </div>
        )}
      </Section>

      {hold.checks.length > 0 && (
        <Section title="Every gate, in the order the governor runs them" note="Run live against the lead at the front of the queue. The first critical failure is what stops the send.">
          <ul className="space-y-2.5">
            {hold.checks.map((c) => (
              <li key={c.id} className="flex items-start gap-3">
                <Chip label={c.passed ? 'pass' : c.critical ? 'stop' : 'warn'} tone={c.passed ? 'good' : c.critical ? 'bad' : 'warn'} />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">{c.label}</p>
                  <p className="text-[12px] text-[#161616]/65 leading-snug break-words">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
