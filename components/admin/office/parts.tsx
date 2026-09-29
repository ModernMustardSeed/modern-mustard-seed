'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { AGENT_BY_KEY, isAgentKey } from '@/lib/office/agents';
import type { Approval, Mission, OfficeState, Task } from '@/lib/office/server';
import type { OfficeApi } from './useOffice';

export const ASKS = [
  'Get me 30 calls on the books this week',
  'Make us 10k this week',
  'Sell 100 PDFs',
  'Make me a webinar that draws in clients',
];

export function agentOf(key: string) {
  return isAgentKey(key) ? AGENT_BY_KEY[key] : AGENT_BY_KEY.sower;
}

/** A desk's monogram, in its own color. */
export function AgentMark({ agent, size = 28, pulse = false }: { agent: string; size?: number; pulse?: boolean }) {
  const a = agentOf(agent);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-[#161616] font-oswald font-bold uppercase"
      style={{ width: size, height: size, background: a.color, color: a.ink, fontSize: Math.round(size * 0.42) }}
      aria-hidden
    >
      {a.name[0]}
      {pulse && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#161616] bg-[#3fd06b] animate-pulse" />}
    </span>
  );
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Plain text with its links made clickable. Model output is never rendered as HTML. */
export function Rich({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(/(https?:\/\/[^\s)<>"']+)/g);
  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline decoration-[#F5B700] decoration-2 underline-offset-2 hover:bg-[#F5B700]/30">
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </div>
  );
}

export function HealthPill({ state, compact = false }: { state: OfficeState | null; compact?: boolean }) {
  if (!state) return null;
  const up = state.health.up;
  return (
    <span
      title={up ? `Worker ${state.health.worker ?? ''}` : 'Start it with: node scripts/office/worker.mjs'}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
        up ? 'border-[#161616] bg-[#E9F7EC] text-[#1d6b34]' : 'border-[#E0301E] bg-[#FFF1EE] text-[#a32315]'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${up ? 'bg-[#2fae55] animate-pulse' : 'bg-[#E0301E]'}`} />
      {up ? (compact ? 'Floor up' : `Floor up, ${state.health.lanes} lanes`) : compact ? 'Asleep' : 'Floor asleep'}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  proposed: 'bg-[#F5B700] text-[#161616]',
  running: 'bg-[#161616] text-[#F5B700]',
  done: 'bg-[#3f5d34] text-white',
  stopped: 'bg-white text-[#161616]/60',
  failed: 'bg-[#E0301E] text-white',
  blocked: 'bg-white text-[#161616]/55',
  queued: 'bg-[#FBF6EA] text-[#161616]',
  waiting: 'bg-[#FF6FB5] text-[#161616]',
};

export function StatusChip({ status }: { status: string }) {
  const label = status === 'blocked' ? 'after' : status === 'waiting' ? 'needs you' : status;
  return (
    <span className={`inline-flex items-center rounded-md border-2 border-[#161616] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${STATUS_TONE[status] ?? 'bg-white text-[#161616]'}`}>
      {label}
    </span>
  );
}

export function Score({ mission }: { mission: Mission }) {
  if (!mission.metric_target) return null;
  const frac = Math.min(1, Number(mission.metric_current) / Number(mission.metric_target));
  const money = mission.metric_unit === '$' || /revenue|\$/i.test(mission.metric_label ?? '');
  const fmt = (n: number) => (money ? `$${Math.round(n).toLocaleString('en-US')}` : Math.round(n).toLocaleString('en-US'));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-oswald text-[10px] font-semibold uppercase tracking-[0.18em] text-[#161616]/65">{mission.metric_label ?? 'Score'}</span>
        <span className="font-oswald text-sm font-bold tabular-nums text-[#161616]">
          {fmt(Number(mission.metric_current))} <span className="text-[#161616]/55">/ {fmt(Number(mission.metric_target))}</span>
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-[#161616] bg-white">
        <div className="h-full bg-[#F5B700] transition-[width] duration-700" style={{ width: `${Math.max(2, frac * 100)}%` }} />
      </div>
    </div>
  );
}

export function TaskRow({ task, open, onToggle }: { task: Task; open: boolean; onToggle: () => void }) {
  const a = agentOf(task.agent);
  const live = task.status === 'running';
  return (
    <li className="rounded-xl border-2 border-[#161616]/15 bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-2.5 px-3 py-2 text-left">
        <AgentMark agent={task.agent} size={24} pulse={live} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-sans text-[13px] font-semibold text-[#161616]">{task.title}</span>
            <StatusChip status={task.status} />
          </span>
          <span className="mt-0.5 block truncate font-mono text-[10.5px] text-[#161616]/60">
            {a.name}
            {task.last_action && (live || task.status === 'waiting') ? `: ${task.last_action}` : ''}
          </span>
        </span>
        <span aria-hidden className={`mt-1 text-[10px] text-[#161616]/50 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="border-t-2 border-[#161616]/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-[#161616]/85">
          <p className="mb-1 font-oswald text-[10px] font-semibold uppercase tracking-[0.18em] text-[#161616]/55">Brief</p>
          <Rich text={task.brief} />
          {(task.output || task.error) && (
            <>
              <p className="mb-1 mt-3 font-oswald text-[10px] font-semibold uppercase tracking-[0.18em] text-[#161616]/55">{task.error ? 'What went wrong' : 'Report'}</p>
              <Rich text={task.error || task.output || ''} className={task.error ? 'text-[#a32315]' : ''} />
            </>
          )}
        </div>
      )}
    </li>
  );
}

export function MissionCard({ mission, api, compact = false }: { mission: Mission; api: OfficeApi; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const act = async (action: 'go' | 'stop') => {
    setBusy(true);
    setErr('');
    try { await api.mission(mission.id, action); } catch (e) { setErr(e instanceof Error ? e.message : 'That did not go through.'); } finally { setBusy(false); }
  };
  const done = mission.tasks.filter((t) => t.status === 'done').length;
  return (
    <article className="rounded-2xl border-2 border-[#161616] bg-[#FFFDF8] p-4 shadow-[4px_4px_0_0_#161616]">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={mission.status} />
            {mission.due_on && <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#161616]/60">Due {new Date(`${mission.due_on}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>}
            <span className="font-mono text-[10px] text-[#161616]/55">{done}/{mission.tasks.length} done</span>
          </div>
          <h3 className="mt-1.5 font-oswald text-lg font-bold uppercase leading-tight tracking-[0.02em] text-[#161616]">{mission.title}</h3>
          <p className="mt-0.5 text-[13px] leading-snug text-[#161616]/75">{mission.goal}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {mission.status === 'proposed' && (
            <button type="button" disabled={busy} onClick={() => act('go')} className="rounded-xl border-2 border-[#161616] bg-[#F5B700] px-4 py-2 font-oswald text-sm font-bold uppercase tracking-[0.1em] text-[#161616] shadow-[3px_3px_0_0_#161616] transition-all hover:-translate-y-0.5 disabled:opacity-40">
              Go
            </button>
          )}
          {(mission.status === 'proposed' || mission.status === 'running') && (
            <button type="button" disabled={busy} onClick={() => act('stop')} className="rounded-xl border-2 border-[#161616] bg-white px-3 py-2 font-oswald text-xs font-semibold uppercase tracking-[0.1em] text-[#161616] transition-all hover:-translate-y-0.5 disabled:opacity-40">
              {mission.status === 'proposed' ? 'Pass' : 'Stop'}
            </button>
          )}
        </div>
      </header>
      {err && <p className="mt-2 text-xs font-semibold text-[#a32315]">{err}</p>}
      <div className="mt-3"><Score mission={mission} /></div>
      {!compact && mission.summary && <p className="mt-3 text-[12.5px] leading-relaxed text-[#161616]/75">{mission.summary}</p>}
      <ol className="mt-3 space-y-1.5">
        {mission.tasks.map((t) => (
          <TaskRow key={t.id} task={t} open={open === t.id} onToggle={() => setOpen(open === t.id ? null : t.id)} />
        ))}
      </ol>
      {!compact && mission.debrief && (
        <div className="mt-3 rounded-xl border-2 border-[#161616] bg-[#FBF6EA] p-3">
          <p className="mb-1 font-oswald text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E0301E]">Sower&apos;s debrief</p>
          <Rich text={mission.debrief} className="text-[13px] leading-relaxed text-[#161616]" />
        </div>
      )}
    </article>
  );
}

export function ApprovalCard({ approval, api }: { approval: Approval; api: OfficeApi }) {
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const decide = async (approve: boolean) => {
    setBusy(true);
    setErr('');
    try { await api.decide(approval.id, approve, note); } catch (e) { setErr(e instanceof Error ? e.message : 'That did not go through.'); setBusy(false); }
  };
  const a = agentOf(approval.agent);
  return (
    <div className="rounded-2xl border-2 border-[#161616] bg-[#FFF3FA] p-3 shadow-[3px_3px_0_0_#FF6FB5]">
      <div className="flex items-start gap-2.5">
        <AgentMark agent={approval.agent} size={26} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#161616]/60">{a.name} needs your yes</p>
          <p className="mt-0.5 font-sans text-[13.5px] font-semibold leading-snug text-[#161616]">{approval.question}</p>
          {approval.detail && (
            <button type="button" onClick={() => setOpen(!open)} className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#161616]/60 underline underline-offset-2">
              {open ? 'Hide the details' : 'See exactly what happens'}
            </button>
          )}
          {open && approval.detail && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border-2 border-[#161616]/15 bg-white p-2.5 text-[12.5px] leading-relaxed text-[#161616]/85">
              <Rich text={approval.detail} />
            </div>
          )}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note to the agent"
            className="mt-2 w-full rounded-lg border-2 border-[#161616]/20 bg-white px-2.5 py-1.5 text-[12.5px] text-[#161616] outline-none placeholder:text-[#161616]/45 focus:border-[#F5B700]"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={() => decide(true)} className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 font-oswald text-xs font-bold uppercase tracking-[0.1em] text-[#161616] shadow-[2px_2px_0_0_#161616] disabled:opacity-40">
              Yes, do it
            </button>
            <button type="button" disabled={busy} onClick={() => decide(false)} className="rounded-lg border-2 border-[#161616] bg-white px-3 py-1.5 font-oswald text-xs font-semibold uppercase tracking-[0.1em] text-[#161616] disabled:opacity-40">
              No
            </button>
          </div>
          {err && <p className="mt-1.5 text-xs font-semibold text-[#a32315]">{err}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * The conversation with Sower. Used by the dock in the corner of every admin
 * page and by the chat column on the floor, so both are the same thread.
 */
export function SowerChat({ api, dense = false }: { api: OfficeApi; dense?: boolean }) {
  const { state } = api;
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const count = state?.messages.length ?? 0;
  const thinking = state?.thinking;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [count, thinking?.last_action]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || sending) return;
    setSending(true);
    setErr('');
    try {
      await api.send(q);
      setInput('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sower did not get that.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const missions = new Map((state?.missions ?? []).map((m) => [m.id, m]));
  const shownMission = new Set<string>();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className={`min-h-0 flex-1 space-y-3 overflow-y-auto ${dense ? 'px-3.5 py-3.5' : 'px-4 py-4'}`}>
        {!state && <p className="text-sm italic text-[#161616]/55">Opening the office...</p>}
        {state && count === 0 && (
          <div className="rounded-2xl border-2 border-[#161616] bg-white p-3.5">
            <p className="font-sans text-[13.5px] leading-relaxed text-[#161616]">
              Tell me the outcome. I plan it A to Z, put the floor on it, and hand you the script, the offer and the people.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ASKS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border-2 border-[#161616] bg-[#FBF6EA] px-3 py-1.5 text-left text-xs font-semibold text-[#161616] transition-colors hover:bg-[#F5B700]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {state?.messages.map((m) => {
          const mission = m.mission_id ? missions.get(m.mission_id) : undefined;
          const showCard = Boolean(mission && m.role === 'sower' && !shownMission.has(mission.id));
          if (mission && showCard) shownMission.add(mission.id);
          if (m.role === 'system') {
            return <p key={m.id} className="text-center font-mono text-[10.5px] text-[#161616]/55">{m.body}</p>;
          }
          const mine = m.role === 'sarah';
          return (
            <div key={m.id} className="space-y-2">
              <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && <AgentMark agent="sower" size={24} />}
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${mine ? 'bg-[#161616] text-[#FBF6EA]' : 'border-2 border-[#161616] bg-white text-[#161616]'}`}>
                  <Rich text={m.body} />
                </div>
              </div>
              {showCard && mission && (
                <div className={dense ? '' : 'pl-8'}>
                  <MissionCard mission={mission} api={api} compact />
                </div>
              )}
            </div>
          );
        })}
        {thinking && (
          <div className="flex items-center gap-2 font-sans text-[12.5px] italic text-[#161616]/65">
            <AgentMark agent="sower" size={22} pulse />
            <span className="truncate">
              {state?.health.up ? thinking.last_action || (thinking.status === 'queued' ? 'Sower is picking this up...' : 'Sower is thinking...') : 'Queued. The floor is asleep; Sower answers the moment the worker is back.'}
            </span>
          </div>
        )}
        {dense && state?.approvals.map((a) => <ApprovalCard key={a.id} approval={a} api={api} />)}
      </div>

      <div className="shrink-0 border-t-2 border-[#161616] bg-[#FBF6EA] p-3">
        {err && <p className="mb-1.5 text-xs font-semibold text-[#a32315]">{err}</p>}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={dense ? 1 : 2}
            placeholder="What do you want this week?"
            aria-label="Message Sower"
            className="max-h-32 flex-1 resize-none rounded-xl border-2 border-[#161616] bg-white px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/45 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={sending || !input.trim()}
            className="rounded-xl border-2 border-[#161616] bg-[#F5B700] px-4 py-2.5 font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#161616] shadow-[2px_2px_0_0_#161616] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
