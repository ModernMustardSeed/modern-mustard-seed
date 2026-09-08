'use client';

import { useEffect } from 'react';

/**
 * ONE CALL, READ THE WAY A PERSON READS IT.
 *
 * Shared by the admin call log and the client portal. Summary first, because
 * that is the answer to "what was this"; then the conversation as turns, with
 * the recording above it when Vapi kept one. The raw transcript is the
 * fallback for calls where Vapi sent no turn list.
 */

export type CallTurn = { role: 'assistant' | 'user' | 'tool' | 'system'; text: string; at: number | null };

export type CallView = {
  id: string;
  agentName: string | null;
  direction: 'inbound' | 'outbound' | 'web';
  callerNumber: string | null;
  callerName: string | null;
  lineNumber: string | null;
  lineLabel?: string | null;
  clientEmail?: string | null;
  kind?: string;
  startedAt: string | null;
  durationSec: number | null;
  endedReason: string | null;
  summary: string | null;
  transcript: string | null;
  messages: CallTurn[];
  recordingUrl: string | null;
  transferred: boolean;
  transferredTo: string | null;
  booked: boolean;
};

const INK = '#161616';
const TZ = 'America/Denver';

export function fmtWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function fmtDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function fmtDuration(sec: number | null): string {
  if (!sec && sec !== 0) return '';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function fmtPhone(n: string | null): string {
  if (!n) return '';
  const d = n.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return n;
}

/** The plain-English reason a call ended. Vapi's codes are for engineers. */
export function endedLabel(reason: string | null, transferred: boolean): string {
  if (transferred) return 'Handed to a person';
  if (!reason) return '';
  if (reason === 'customer-ended-call') return 'Caller hung up';
  if (reason.startsWith('assistant-ended-call')) return 'Agent wrapped up';
  if (reason === 'silence-timed-out') return 'Line went quiet';
  if (reason === 'voicemail') return 'Reached voicemail';
  if (reason === 'customer-did-not-answer' || reason === 'customer-busy') return 'No answer';
  if (/did-not-receive-customer-audio|no-audio/i.test(reason)) return 'No audio from the caller';
  if (/error|failed/i.test(reason)) return 'Dropped (technical fault)';
  if (reason === 'exceeded-max-duration') return 'Hit the time limit';
  return reason.replace(/-/g, ' ');
}

export function whoLabel(c: CallView): string {
  if (c.callerName) return c.callerName;
  if (c.callerNumber) return fmtPhone(c.callerNumber);
  return c.direction === 'web' ? 'Web visitor' : 'Unknown caller';
}

function Pill({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'gold' | 'red' | 'blue' }) {
  const cls =
    tone === 'gold'
      ? 'bg-[#F5B700] text-[#161616] border-[#161616]'
      : tone === 'red'
        ? 'bg-[#E0301E] text-white border-[#161616]'
        : tone === 'blue'
          ? 'bg-[#1E50C8]/10 text-[#1E50C8] border-[#1E50C8]/30'
          : 'bg-[#161616]/5 text-[#161616]/65 border-[#161616]/15';
  return (
    <span className={`text-[10px] uppercase tracking-[0.15em] font-sans font-bold px-2.5 py-1 rounded-md border-2 whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}

/** Row chips shared by both lists, so a call reads the same in both places. */
export function CallPills({ c }: { c: CallView }) {
  return (
    <>
      {c.booked && <Pill tone="gold">Booked</Pill>}
      {c.transferred && <Pill tone="blue">Handed off</Pill>}
      {c.endedReason && /error|failed/i.test(c.endedReason) && <Pill tone="red">Dropped</Pill>}
      <Pill>{c.direction === 'web' ? 'Web' : c.direction === 'outbound' ? 'Outbound' : 'Inbound'}</Pill>
    </>
  );
}

function Turns({ turns, agent }: { turns: CallTurn[]; agent: string }) {
  return (
    <ol className="space-y-3">
      {turns.map((t, i) => {
        if (t.role === 'tool') {
          return (
            <li key={i} className="flex justify-center">
              <span className="font-mono text-[11px] text-[#161616]/50 bg-[#161616]/5 rounded-md px-2 py-1">used {t.text}</span>
            </li>
          );
        }
        const me = t.role === 'assistant';
        return (
          <li key={i} className={`flex ${me ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 border-2 ${me ? 'bg-white border-[#161616]' : 'bg-[#F5B700] border-[#161616]'}`}>
              <div className="text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616]/55 mb-0.5">
                {me ? agent : 'Caller'}
                {t.at != null && <span className="ml-2 font-mono normal-case tracking-normal">{fmtDuration(Math.round(t.at))}</span>}
              </div>
              <p className="text-[14px] text-[#161616] leading-relaxed whitespace-pre-wrap">{t.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function RawTranscript({ text, agent }: { text: string; agent: string }) {
  // Vapi's flat transcript is "AI: ...\nUser: ..." lines.
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return (
    <ol className="space-y-2">
      {lines.map((l, i) => {
        const m = l.match(/^(AI|User|Assistant|Bot|Caller):\s*(.*)$/i);
        const who = m ? (/^(ai|assistant|bot)$/i.test(m[1]) ? agent : 'Caller') : '';
        const body = m ? m[2] : l;
        const me = who === agent;
        return (
          <li key={i} className={`flex ${me ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 border-2 ${me ? 'bg-white border-[#161616]' : 'bg-[#F5B700] border-[#161616]'}`}>
              {who && <div className="text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616]/55 mb-0.5">{who}</div>}
              <p className="text-[14px] text-[#161616] leading-relaxed whitespace-pre-wrap">{body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function CallDetail({
  call,
  onClose,
  extra,
}: {
  call: CallView;
  onClose: () => void;
  /** Admin-only rows (cost, client, line) rendered under the header. */
  extra?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const agent = call.agentName || 'Agent';
  const turns = Array.isArray(call.messages) ? call.messages.filter((t) => t.role !== 'system') : [];

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" style={{ color: INK }}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#161616]/40" />
      <aside className="relative h-full w-full max-w-2xl bg-[#FBF6EA] border-l-2 border-[#161616] overflow-y-auto shadow-[-6px_0_0_0_#161616]">
        <header className="sticky top-0 z-10 bg-[#FBF6EA] border-b-2 border-[#161616] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold">Call</div>
              <h2 className="font-sans text-xl font-bold leading-tight truncate">{whoLabel(call)}</h2>
              <p className="text-sm text-[#161616]/65 mt-0.5">
                {fmtWhen(call.startedAt)}
                {call.durationSec != null && <> &middot; {fmtDuration(call.durationSec)}</>}
                {call.agentName && <> &middot; {call.agentName}</>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 bg-white border-2 border-[#161616] rounded-lg px-3 py-1.5 font-sans text-xs font-bold shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <CallPills c={call} />
            {call.endedReason && <span className="text-[11px] text-[#161616]/55 font-sans self-center">{endedLabel(call.endedReason, call.transferred)}</span>}
          </div>
        </header>

        <div className="px-5 py-5 space-y-6">
          {extra}

          {call.callerNumber && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-[#161616]/70">
              <span>From {fmtPhone(call.callerNumber)}</span>
              {call.lineNumber && <span>On {fmtPhone(call.lineNumber)}{call.lineLabel ? ` (${call.lineLabel})` : ''}</span>}
              {call.transferred && call.transferredTo && <span>Handed to {fmtPhone(call.transferredTo)}</span>}
            </div>
          )}

          <section>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 font-sans font-bold mb-2">What happened</h3>
            <div className="bg-white border-2 border-[#161616] rounded-xl p-4 shadow-[3px_3px_0_0_#161616]">
              {call.summary ? (
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{cleanSummary(call.summary)}</p>
              ) : (
                <p className="text-sm text-[#161616]/55">No summary was written for this call.</p>
              )}
            </div>
          </section>

          {call.recordingUrl && (
            <section>
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 font-sans font-bold mb-2">Recording</h3>
              <audio controls preload="none" src={call.recordingUrl} className="w-full" />
            </section>
          )}

          <section>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 font-sans font-bold mb-2">The conversation</h3>
            {turns.length > 0 ? (
              <Turns turns={turns} agent={agent} />
            ) : call.transcript ? (
              <RawTranscript text={call.transcript} agent={agent} />
            ) : (
              <p className="text-sm text-[#161616]/55">Nothing was said on this call.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

/** Vapi summaries arrive as markdown bullets with bold labels. Strip the
 *  syntax so it reads as prose in a card. */
export function cleanSummary(s: string): string {
  return s
    .replace(/\*\*/g, '')
    // Mr. Mustard's summaries open with "Here's the summary for Sarah:". That
    // is addressed to the agent's owner, not to whoever is reading the card.
    .replace(/^\s*(here'?s the |here is the )?summary for sarah:?\s*/i, '')
    .replace(/^\s*[*-]\s+/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
