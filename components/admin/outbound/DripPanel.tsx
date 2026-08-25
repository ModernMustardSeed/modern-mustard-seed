'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { api, btnGhost, btnPrimary, btnDanger } from '@/components/admin/outbound/ui';
import type { OutboundLead } from '@/lib/outbound';

/**
 * THE DRIP PANEL (2026-08-25). One button on the contact card opens it. It
 * shows every email the sequence will send, dated and rendered exactly as it
 * will ship, and one button sends the first and starts the clock. After that
 * the cadence cron carries it; this panel shows where it stands, pauses it,
 * resumes it, stops it.
 */

type Drip = {
  id: string;
  status: 'active' | 'paused' | 'done' | 'stopped';
  step: number;
  next_at: string | null;
  started_at: string;
  last_sent_at: string | null;
  stopped_reason: string | null;
  last_error: string | null;
  sent: { step: number; at: string; messageId: string | null; subject: string }[];
};

type PlanStep = { step: number; subject: string; preheader: string; summary: string; html: string; state: 'sent' | 'next' | 'scheduled' | 'skipped'; at: string | null; messageId: string | null };
type Payload = { drip: Drip | null; stop: string | null; length: number; plan: PlanStep[]; email: string | null };
type Push = (text: string, tone?: 'ok' | 'error') => void;

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' }) : '';

export function dripChipLabel(drip: Drip | null | undefined, length: number): string {
  if (!drip) return '⏱ Drip campaign';
  if (drip.status === 'active') return `⏱ Drip ${drip.step}/${length}${drip.next_at ? ` · next ${new Date(drip.next_at).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Denver' })}` : ''}`;
  if (drip.status === 'paused') return `⏸ Drip paused ${drip.step}/${length}`;
  if (drip.status === 'done') return `✓ Drip done ${length}/${length}`;
  return `■ Drip stopped ${drip.step}/${length}`;
}

/**
 * `lead` is only ever read for its id and its business name, so the panel takes
 * the narrow shape rather than a whole OutboundLead. That is what lets it open
 * from the Acquisition prospect card and the Client Book, which hold a lead id
 * and a name and nothing else. `onLead` is optional for the same reason: only
 * the cockpit keeps a lead object worth refreshing.
 */
export type DripPanelLead = { id: string; business_name: string };

export default function DripPanel({ lead, open, onClose, onLead, onDrip, push }: {
  lead: DripPanelLead;
  open: boolean;
  onClose: () => void;
  onLead?: (l: OutboundLead) => void;
  onDrip?: (d: Drip | null) => void;
  push: Push;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openStep, setOpenStep] = useState<number>(1);

  const load = useCallback(async () => {
    try {
      const r = await api<Payload>(`/api/admin/outbound/leads/${lead.id}/drip`);
      setData(r);
      onDrip?.(r.drip);
      setError(null);
      const next = r.plan.find((s) => s.state === 'next') ?? r.plan[0];
      setOpenStep(next.step);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the drip.');
    }
  }, [lead.id, onDrip]);

  useEffect(() => {
    if (open) { setData(null); void load(); }
  }, [open, load]);

  const act = async (action: 'start' | 'restart' | 'pause' | 'resume' | 'stop') => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ ok: true; drip: Drip; lead?: OutboundLead; subject?: string }>(`/api/admin/outbound/leads/${lead.id}/drip`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (r.lead) onLead?.(r.lead);
      onDrip?.(r.drip);
      push(
        action === 'start' || action === 'restart'
          ? `Email 1 sent: "${r.subject}". The rest follow on their own unless they reply.`
          : action === 'pause'
            ? 'Drip paused. Nothing more goes out until you resume it.'
            : action === 'resume'
              ? 'Drip resumed. The next email goes on the next cadence run.'
              : 'Drip stopped.',
      );
      await load();
    } catch (e) {
      push(e instanceof Error ? e.message : 'That did not go through.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const drip = data?.drip ?? null;
  const stop = data?.stop ?? null;
  const canStart = Boolean(data && !stop && (!drip || drip.status === 'stopped' || drip.status === 'done'));
  const isRestart = Boolean(drip && (drip.status === 'stopped' || drip.status === 'done'));

  const status = !data
    ? 'Loading…'
    : stop
      ? `Cannot run: ${stop}`
      : !drip
        ? `Not started. Send email 1 and the other ${data.length - 1} follow on business-day gaps over about three weeks. A reply, an unsubscribe, a bounce, DNC, won or lost stops it.`
        : drip.status === 'active'
          ? `Running: ${drip.step} of ${data.length} sent${drip.next_at ? `, next goes ${fmt(drip.next_at)}` : ''}.${drip.last_error ? ` Last attempt failed: ${drip.last_error}` : ''}`
          : drip.status === 'paused'
            ? `Paused at ${drip.step} of ${data.length}. Nothing goes out until you resume.`
            : drip.status === 'done'
              ? `Complete: all ${data.length} sent. Last one ${fmt(drip.last_sent_at)}.`
              : `Stopped at ${drip.step} of ${data.length}: ${drip.stopped_reason ?? 'no reason recorded'}.`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Drip campaign"
      title={drip ? `${lead.business_name}, ${drip.status}` : `A ${data?.length ?? 5}-email sequence for ${lead.business_name}`}
      subtitle={data?.email ? `To ${data.email}` : 'No email on file'}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {drip?.status === 'active' && <button onClick={() => void act('pause')} disabled={busy} className={btnGhost}>Pause</button>}
            {drip?.status === 'paused' && <button onClick={() => void act('resume')} disabled={busy} className={btnGhost}>Resume</button>}
            {(drip?.status === 'active' || drip?.status === 'paused') && <button onClick={() => void act('stop')} disabled={busy} className={btnDanger}>Stop the drip</button>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className={btnGhost}>Close</button>
            {canStart && (
              <button onClick={() => void act(isRestart ? 'restart' : 'start')} disabled={busy || !data?.email} className={btnPrimary} title="Sends email 1 to them right now and schedules the rest">
                {busy ? 'Sending…' : isRestart ? 'Restart: send email 1 now' : 'Send email 1 now and start the drip'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <p className={`font-sans text-[13px] ${stop ? 'text-[#a03123]' : 'text-[#1a1815]/70'}`}>{status}</p>
      {error && <p className="font-sans text-sm text-[#a03123] mt-2">{error}</p>}

      {data && (
        <div className="mt-4 grid md:grid-cols-[260px_1fr] gap-4">
          <ol className="space-y-1.5" aria-label="The sequence">
            {data.plan.map((s) => {
              const on = openStep === s.step;
              const tone =
                s.state === 'sent' ? 'bg-[#e8f3e8] border-[#245c2a]/40 text-[#245c2a]'
                  : s.state === 'next' ? 'bg-[#F5B700]/25 border-[#1a1815] text-[#1a1815]'
                    : s.state === 'skipped' ? 'bg-white border-[#1a1815]/15 text-[#1a1815]/45'
                      : 'bg-white border-[#1a1815]/25 text-[#1a1815]/75';
              return (
                <li key={s.step}>
                  <button
                    onClick={() => setOpenStep(s.step)}
                    aria-pressed={on}
                    className={`w-full text-left rounded-xl border-2 px-3 py-2.5 transition-all ${tone} ${on ? 'shadow-[3px_3px_0_0_#1a1815] -translate-y-0.5' : 'hover:-translate-y-0.5'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-oswald uppercase tracking-[0.12em] text-[10px]">
                        Email {s.step} · {s.state === 'sent' ? 'sent' : s.state === 'next' ? (drip ? 'next' : 'sends now') : s.state === 'skipped' ? 'will not send' : 'scheduled'}
                      </span>
                      <span className="font-mono text-[10px] opacity-75">{s.at ? fmt(s.at) : ''}</span>
                    </div>
                    <div className="font-sans text-[13px] font-semibold mt-1 leading-snug">{s.subject}</div>
                  </button>
                </li>
              );
            })}
          </ol>

          {(() => {
            const s = data.plan.find((x) => x.step === openStep) ?? data.plan[0];
            return (
              <div className="rounded-xl border-2 border-[#1a1815] overflow-hidden bg-white min-h-[420px] flex flex-col">
                <div className="px-4 py-2.5 bg-[#1a1815] text-[#f7f3e9] text-[12px] font-sans flex flex-wrap items-baseline justify-between gap-2">
                  <span><span className="font-oswald uppercase tracking-[0.15em] text-[10px] text-[#F5B700] mr-2">Subject</span>{s.subject}</span>
                  <span className="text-[#f7f3e9]/60">{s.preheader}</span>
                </div>
                <iframe
                  key={s.step}
                  title={`Email ${s.step} preview`}
                  srcDoc={s.html}
                  sandbox=""
                  className="w-full grow border-0"
                  style={{ minHeight: 560 }}
                />
                <p className="px-4 py-2 text-[11px] font-sans text-[#1a1815]/55 border-t border-[#1a1815]/10">
                  Rendered from their record as it stands now. Links are disarmed in this preview; the real email links to their demo suite and the booking page.
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </Modal>
  );
}
