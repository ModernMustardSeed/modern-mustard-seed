'use client';

import { useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AGENTS } from '@/lib/office/agents';
import type { Deliverable, OfficeState, Task } from '@/lib/office/server';
import { AgentMark, ApprovalCard, EngineTag, HealthPill, MissionCard, Rich, SowerChat, agentOf, timeAgo } from './parts';
import { useOffice, type OfficeApi } from './useOffice';

type DeskState = { tone: 'working' | 'waiting' | 'queued' | 'idle'; line: string; task?: Task };

function deskStates(state: OfficeState | null): Record<string, DeskState> {
  const out: Record<string, DeskState> = {};
  for (const a of AGENTS) out[a.key] = { tone: 'idle', line: 'At the desk, ready.' };
  if (!state) return out;
  const live = state.missions.filter((m) => m.status === 'running' || m.status === 'proposed');
  const rank = { working: 3, waiting: 2, queued: 1, idle: 0 } as const;
  for (const m of live) {
    for (const t of m.tasks) {
      const next: DeskState | null =
        t.status === 'running'
          ? { tone: 'working', line: t.last_action || 'Working', task: t }
          : t.status === 'waiting'
            ? { tone: 'waiting', line: 'Waiting on your yes', task: t }
            : t.status === 'queued' || (t.status === 'blocked' && m.status === 'running')
              ? { tone: 'queued', line: t.status === 'queued' ? 'Up next' : 'Lined up', task: t }
              : null;
      if (next && rank[next.tone] > rank[out[t.agent]?.tone ?? 'idle']) out[t.agent] = next;
    }
  }
  if (state.thinking) out.sower = { tone: 'working', line: state.thinking.last_action || 'Thinking it through' };
  else if (state.approvals.length) out.sower = { tone: 'waiting', line: `${state.approvals.length} thing${state.approvals.length === 1 ? '' : 's'} waiting on you` };
  else if (live.some((m) => m.status === 'running')) out.sower = { tone: 'working', line: 'Running the floor' };
  return out;
}

const TONE_LABEL = { working: 'Working', waiting: 'Needs you', queued: 'Up next', idle: 'Idle' };

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Denver', weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

function Desk({ agentKey, desk, big = false }: { agentKey: string; desk: DeskState; big?: boolean }) {
  const a = agentOf(agentKey);
  const working = desk.tone === 'working';
  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-3.5 transition-all ${big ? 'ring-2 ring-[#F5B700]/40' : ''} ${
        working ? 'border-[#F5B700] bg-[#211d12] shadow-[0_0_0_3px_rgba(245,183,0,0.18)]' : desk.tone === 'waiting' ? 'border-[#FF6FB5] bg-[#231820]' : 'border-[#FBF6EA]/15 bg-[#1d1d1d]'
      }`}
    >
      <div className="flex items-start gap-3">
        <AgentMark agent={agentKey} size={big ? 46 : 38} pulse={working} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-oswald font-bold uppercase tracking-[0.06em] text-[#FBF6EA] ${big ? 'text-xl' : 'text-base'}`}>{a.name}</p>
            <span
              className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${
                working ? 'bg-[#F5B700] text-[#161616]' : desk.tone === 'waiting' ? 'bg-[#FF6FB5] text-[#161616]' : desk.tone === 'queued' ? 'bg-[#FBF6EA]/15 text-[#FBF6EA]' : 'text-[#FBF6EA]/45'
              }`}
            >
              {TONE_LABEL[desk.tone]}
            </span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#F5B700]/80">{a.role}</p>
          <EngineTag engine={desk.task?.engine ?? a.engine} dark />
        </div>
      </div>
      <p className="mt-2.5 text-[12px] leading-snug text-[#FBF6EA]/60">{a.does}</p>
      <div className="mt-2.5 min-h-[2.4rem] rounded-lg bg-black/30 px-2.5 py-1.5">
        {desk.task && <p className="truncate font-sans text-[12px] font-semibold text-[#FBF6EA]">{desk.task.title}</p>}
        <p className={`truncate font-mono text-[10.5px] ${working ? 'text-[#F5B700]' : 'text-[#FBF6EA]/55'}`}>
          {working && <span className="mr-1 inline-block animate-pulse">▸</span>}
          {desk.line}
        </p>
      </div>
    </div>
  );
}

function Toggle({ on, label, note, onChange }: { on: boolean; label: string; note: string; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border-2 border-[#161616] transition-colors ${on ? 'bg-[#F5B700]' : 'bg-white'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full border-2 border-[#161616] bg-[#161616] transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      <span>
        <span className="block font-sans text-[13px] font-bold text-[#161616]">{label}</span>
        <span className="block text-[12px] leading-snug text-[#161616]/65">{note}</span>
      </span>
    </label>
  );
}

const REACH: { name: string; how: string; probe?: string }[] = [
  { name: 'Claude Code', how: 'The main brain. Max subscription, never the metered API.', probe: 'claude' },
  { name: 'Codex', how: 'The second brain on the ChatGPT plan: Studio’s images, and every desk’s backup when Claude is capped.', probe: 'codex' },
  { name: 'GitHub', how: 'Repos, branches, PRs, merges.', probe: 'gh' },
  { name: 'Vercel', how: 'Deploys and previews. Production ships by merge to master.', probe: 'vercel' },
  { name: 'Supabase', how: 'Leads, bookings, the pipeline, every admin table.', probe: 'supabase' },
  { name: 'Stripe', how: 'Products, prices, payment links, revenue.', probe: 'stripe' },
  { name: 'Facebook', how: 'Your signed-in Chrome: DMs, groups, the MMS Page, inside the Rep caps.' },
  { name: 'Instagram', how: 'Your signed-in Chrome, inside the Rep caps.' },
  { name: 'LinkedIn', how: 'Your signed-in Chrome, as you.' },
  { name: 'Google Business', how: 'Your signed-in Chrome. Posts never carry a phone number.' },
  { name: 'YouTube', how: 'The publish loop at /admin/youtube.' },
];

function Shelf({ items }: { items: Deliverable[] }) {
  const [reading, setReading] = useState<Deliverable | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (d: Deliverable) => {
    try {
      await navigator.clipboard.writeText(d.body || d.url || '');
      setCopied(d.id);
      window.setTimeout(() => setCopied(null), 1600);
    } catch { /* clipboard refused; the Read view still has it */ }
  };
  if (!items.length) {
    return <p className="text-[13px] text-[#161616]/60">Scripts, offers, product links and lists land here the moment an agent finishes them.</p>;
  }
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((d) => (
          <article key={d.id} className="flex flex-col rounded-xl border-2 border-[#161616] bg-white p-3">
            <div className="flex items-center gap-2">
              <AgentMark agent={d.agent} size={22} />
              <span className="rounded-md border-2 border-[#161616] bg-[#F5B700] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#161616]">{d.kind}</span>
              <span className="ml-auto font-mono text-[10px] text-[#161616]/55">{timeAgo(d.created_at)}</span>
            </div>
            <p className="mt-2 font-sans text-[14px] font-bold leading-snug text-[#161616]">{d.title}</p>
            {d.body && <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[12px] leading-relaxed text-[#161616]/70">{d.body}</p>}
            <div className="mt-auto flex flex-wrap gap-1.5 pt-2.5">
              {d.body && (
                <button type="button" onClick={() => setReading(d)} className="rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-2.5 py-1 font-oswald text-[11px] font-semibold uppercase tracking-[0.1em] text-[#161616]">
                  Read
                </button>
              )}
              <button type="button" onClick={() => copy(d)} className="rounded-lg border-2 border-[#161616] bg-white px-2.5 py-1 font-oswald text-[11px] font-semibold uppercase tracking-[0.1em] text-[#161616]">
                {copied === d.id ? 'Copied' : 'Copy'}
              </button>
              {d.url && (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-2.5 py-1 font-oswald text-[11px] font-bold uppercase tracking-[0.1em] text-[#161616]">
                  Open ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      {reading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#161616]/60 p-4" onClick={() => setReading(null)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#FFFDF8] text-[#161616] shadow-[6px_6px_0_0_#161616]" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center gap-2.5 border-b-2 border-[#161616] px-4 py-3">
              <AgentMark agent={reading.agent} size={26} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#161616]/60">{agentOf(reading.agent).name} · {reading.kind}</p>
                <p className="truncate font-sans text-[15px] font-bold">{reading.title}</p>
              </div>
              <button type="button" onClick={() => copy(reading)} className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-2.5 py-1 font-oswald text-[11px] font-bold uppercase tracking-[0.1em]">
                {copied === reading.id ? 'Copied' : 'Copy'}
              </button>
              <button type="button" onClick={() => setReading(null)} className="px-1.5 text-2xl leading-none text-[#161616]/60 hover:text-[#161616]" aria-label="Close">×</button>
            </div>
            <div className="overflow-y-auto px-5 py-4 text-[14px] leading-relaxed">
              <Rich text={reading.body || ''} />
              {reading.url && <div className="mt-3"><Rich text={reading.url} /></div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Panel({ title, note, right, children, id }: { title: string; note?: string; right?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-2xl border-2 border-[#161616] bg-[#FFFDF8] p-5 shadow-[5px_5px_0_0_#161616]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-oswald text-lg font-bold uppercase tracking-[0.06em] text-[#161616]">{title}</h2>
          {note && <p className="mt-0.5 max-w-2xl text-xs leading-snug text-[#161616]/65">{note}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function FloorBody({ api }: { api: OfficeApi }) {
  const { state } = api;
  const desks = useMemo(() => deskStates(state), [state]);
  const [showPast, setShowPast] = useState(false);
  const active = (state?.missions ?? []).filter((m) => m.status === 'proposed' || m.status === 'running');
  const past = (state?.missions ?? []).filter((m) => m.status !== 'proposed' && m.status !== 'running');
  const working = AGENTS.filter((a) => desks[a.key].tone === 'working').length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-6">
        {/* The floor */}
        <section className="overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#161616] shadow-[5px_5px_0_0_#F5B700]">
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-5">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#F5B700]">The floor</p>
              <h2 className="mt-1 font-oswald text-3xl font-bold uppercase leading-none tracking-[0.02em] text-[#FBF6EA] md:text-4xl">
                {working ? `${working} at work` : 'Ready when you are'}
              </h2>
            </div>
            <HealthPill state={state} />
          </div>
          {state && !state.health.up && (
            <div className="mx-5 mb-3 rounded-xl border-2 border-[#E0301E] bg-[#2a1614] px-3.5 py-2.5 text-[12.5px] leading-snug text-[#FBF6EA]">
              The floor is asleep, so nothing runs until the office worker is up. Messages and Go still queue. Start it on the workstation:
              <code className="mt-1.5 block rounded-md bg-black/40 px-2 py-1 font-mono text-[11.5px] text-[#F5B700]">node scripts\office\worker.mjs</code>
            </div>
          )}
          {state?.health.up && (state.health.caps.claude || state.health.caps.codex) && (
            <div className="mx-5 mb-3 rounded-xl border-2 border-[#00A6A6] bg-[#10282a] px-3.5 py-2.5 text-[12.5px] leading-snug text-[#FBF6EA]">
              {state.health.caps.claude && <p>Claude is at its usage cap until {fmtTime(state.health.caps.claude)}. {state.health.caps.codex ? '' : 'Codex is covering every desk.'}</p>}
              {state.health.caps.codex && <p>Codex is at its usage cap until {fmtTime(state.health.caps.codex)}. {state.health.caps.claude ? 'Work waits for the first to reopen.' : 'Claude is covering Studio.'}</p>}
            </div>
          )}
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
            {AGENTS.map((a) => (
              <Desk key={a.key} agentKey={a.key} desk={desks[a.key]} big={a.key === 'sower'} />
            ))}
          </div>
        </section>

        {!!state?.approvals.length && (
          <Panel title="Needs your yes" note="Money, production and a new message before its first send are always yours to call. Everything else the floor just does.">
            <div className="grid gap-3 md:grid-cols-2">
              {state.approvals.map((a) => <ApprovalCard key={a.id} approval={a} api={api} />)}
            </div>
          </Panel>
        )}

        <Panel
          title="Missions"
          note="Each one is an outcome you asked for, planned A to Z by Sower and split across the floor."
          right={past.length ? (
            <button type="button" onClick={() => setShowPast(!showPast)} className="rounded-lg border-2 border-[#161616] bg-white px-2.5 py-1 font-oswald text-[11px] font-semibold uppercase tracking-[0.1em] text-[#161616]">
              {showPast ? 'Hide finished' : `Finished (${past.length})`}
            </button>
          ) : undefined}
        >
          {!active.length && !showPast && (
            <p className="text-[13px] text-[#161616]/65">Nothing on the floor. Tell Sower what you want this week and the plan lands here.</p>
          )}
          <div className="space-y-4">
            {active.map((m) => <MissionCard key={m.id} mission={m} api={api} />)}
            {showPast && past.map((m) => <MissionCard key={m.id} mission={m} api={api} />)}
          </div>
        </Panel>

        <Panel title="The shelf" note="Everything the floor made for you: the scripts you read on calls, the offers, the product links, the lists.">
          <Shelf items={state?.deliverables ?? []} />
        </Panel>

        <Panel
          title="What the floor has learned"
          note="After every mission Sower files what actually worked and what did not, with the evidence. Every plan after that carries these. Pin one to keep it on top; retire one that no longer holds."
        >
          {!state?.lessons.length ? (
            <p className="text-[13px] text-[#161616]/60">Nothing yet. The first debrief writes the first lessons.</p>
          ) : (
            <ul className="space-y-2">
              {state.lessons.map((l) => (
                <li key={l.id} className={`flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 ${l.pinned ? 'border-[#161616] bg-[#FFF6D6]' : 'border-[#161616]/15 bg-white'}`}>
                  <span className="mt-0.5 shrink-0 rounded-md border-2 border-[#161616] bg-[#FBF6EA] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#161616]">{l.area}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold leading-snug text-[#161616]">{l.lesson}</p>
                    {l.evidence && <p className="mt-0.5 text-[12px] leading-snug text-[#161616]/65">{l.evidence}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => api.lesson(l.id, { pinned: !l.pinned })} className="rounded-lg border-2 border-[#161616] bg-white px-2 py-1 font-oswald text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#161616]">
                      {l.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button type="button" onClick={() => api.lesson(l.id, { active: false })} className="rounded-lg border-2 border-[#161616]/30 bg-white px-2 py-1 font-oswald text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#161616]/70">
                      Retire
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Live feed">
            <ol className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              {(state?.events ?? []).map((e) => (
                <li key={e.id} className="flex items-start gap-2.5">
                  <AgentMark agent={e.agent} size={20} />
                  <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#161616]/85">
                    <span className="font-semibold text-[#161616]">{agentOf(e.agent).name}</span> {e.text}
                  </p>
                  <span className="shrink-0 font-mono text-[10px] text-[#161616]/50">{timeAgo(e.created_at)}</span>
                </li>
              ))}
              {!state?.events.length && <li className="text-[13px] text-[#161616]/60">Every step an agent takes shows up here as it happens.</li>}
            </ol>
          </Panel>

          <div className="space-y-6">
            <Panel title="How much rope">
              {state && (
                <div className="space-y-4">
                  <Toggle
                    on={state.settings.autoGo}
                    label="Start missions without a Go"
                    note="Sower's plan goes straight to the floor the moment it is written."
                    onChange={(v) => api.settings({ autoGo: v })}
                  />
                  <Toggle
                    on={state.settings.autoShip}
                    label="Ship to production without asking"
                    note="Builder merges to master once the preflight passes. Off: it opens the PR and asks."
                    onChange={(v) => api.settings({ autoShip: v })}
                  />
                  <p className="rounded-lg bg-[#FBF6EA] px-3 py-2 text-[12px] leading-snug text-[#161616]/70">
                    Spending money always waits for your yes. There is no switch for it.
                  </p>
                </div>
              )}
            </Panel>

            <Panel title="What the floor reaches">
              <ul className="space-y-2">
                {REACH.map((r) => {
                  const p = r.probe ? state?.health.probes?.[r.probe] : undefined;
                  const good = p ? /ready|signed in|installed|\d+ logins?/.test(p) : null;
                  return (
                    <li key={r.name} className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${good === null ? 'bg-[#1E50C8]' : good ? 'bg-[#2fae55]' : 'bg-[#E0301E]'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-[#161616]">
                          {r.name}
                          {p && <span className="ml-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#161616]/55">{p}</span>}
                        </p>
                        <p className="text-[12px] leading-snug text-[#161616]/65">{r.how}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </div>
      </div>

      {/* Sower, always on the right */}
      <aside className="lg:self-start">
        <div className="flex h-[min(760px,calc(100vh-3rem))] min-h-[520px] flex-col overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] shadow-[5px_5px_0_0_#161616]">
          <div className="flex shrink-0 items-center justify-between gap-2 bg-[#161616] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <AgentMark agent="sower" size={34} pulse={Boolean(state?.thinking)} />
              <div>
                <p className="font-mono text-[9px] font-bold uppercase leading-none tracking-[0.3em] text-[#F5B700]">Chief of staff</p>
                <p className="mt-1 font-sans text-[16px] font-bold leading-tight text-[#FBF6EA]">Sower</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => api.reset()}
              title="Start a fresh conversation. Missions, approvals and the shelf stay."
              className="rounded-lg border-2 border-[#FBF6EA]/30 px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#FBF6EA]/75 hover:border-[#F5B700] hover:text-[#F5B700]"
            >
              New chat
            </button>
          </div>
          <SowerChat api={api} />
        </div>
      </aside>
    </div>
  );
}

export default function OfficeFloor() {
  const api = useOffice({ intervalMs: 3000 });

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="office" title="Yield" />
      <main className="mx-auto max-w-7xl px-5 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#E0301E]">The agentic office</p>
            <h1 className="mt-1 font-oswald text-5xl font-bold uppercase leading-[0.9] tracking-[-0.01em] text-[#161616] md:text-6xl">
              Yield<span className="text-[#F5B700]">.</span>
            </h1>
            <p className="mt-2 max-w-xl text-[14px] leading-snug text-[#161616]/70">
              Say the outcome. Sower plans it A to Z, the floor builds and sells it, and you get the script, the offer and the people.
            </p>
          </div>
        </div>

        {api.forbidden ? (
          <div className="rounded-2xl border-2 border-[#161616] bg-white p-6 text-[14px]">Yield is the owner&apos;s office.</div>
        ) : (
          <>
            {api.error && <p className="mb-4 rounded-xl border-2 border-[#E0301E] bg-[#FFF1EE] px-4 py-2.5 text-sm font-semibold text-[#a32315]">{api.error}</p>}
            <FloorBody api={api} />
          </>
        )}
      </main>
    </div>
  );
}
