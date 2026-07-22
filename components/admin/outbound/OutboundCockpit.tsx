'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import Modal from '@/components/ui/Modal';
import { NICHE_LABELS, OUTCOME_LABELS, denverIso, formatPhone, fmtMoney, monthlyLeak } from '@/lib/outbound';
import type { CallLog, CallOutcome, Niche, OutboundLead, Pilot, Rep, Script } from '@/lib/outbound';
import { OutboundNav, StatusChip, NicheChip, ToastHost, useToasts, useCountUp, api, card, btnPrimary, btnSeed, btnGhost, inputCls, labelCls, eyebrow, getDialSession, setDialSession, bumpDialSession, batchPosition, SeedBurst } from '@/components/admin/outbound/ui';
import type { DialSession } from '@/components/admin/outbound/ui';
import { ReachOutDeck, AuditIntelCard, ReviewAmmoCard, ThreadPanel, LeadFile } from '@/components/admin/outbound/OutboundReachOut';
import PersonalVideoCard from '@/components/admin/outbound/PersonalVideoCard';

/** Company callback line read out in the voicemail script (Mr. Mustard's number). */
const MMS_LINE = '(406) 312-1223';

const NICHE_DEFAULT_JOB: Record<Niche, number> = {
  home_service: 450,
  dental_medspa: 1200,
  real_estate: 9000,
  restaurant: 55,
  other: 500,
};

type Stat = { dials: number; conversations: number; demos_booked: number };
type QueueLead = { id: string; business_name: string };

/** Render a script body with [tokens] resolved against the live lead + calculator. */
function ScriptBody({ body, vars }: { body: string; vars: Record<string, string> }) {
  const parts = body.split(/(\[[^\]]*\])/g);
  return (
    <p className="font-sans text-[15px] leading-relaxed text-[#1a1815] whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const key = part.slice(1, -1).toLowerCase();
          const val = vars[key];
          return (
            <mark key={i} className={`rounded px-1 py-0.5 font-semibold ${val ? 'bg-[#b58a2a]/25 text-[#1a1815]' : 'bg-transparent text-[#b58a2a] border-b-2 border-dashed border-[#b58a2a]'}`}>
              {val ?? part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

function HisWords({ scripts }: { scripts: Script[] }) {
  const [open, setOpen] = useState(false);
  if (scripts.length === 0) return null;
  return (
    <div className="mt-2.5">
      <button onClick={() => setOpen((o) => !o)} className="text-[10px] uppercase tracking-[0.18em] font-oswald font-semibold text-[#b58a2a] hover:text-[#1a1815] transition-colors">
        {open ? '▾' : '▸'} His words (Cahill, verbatim)
      </button>
      {open && (
        <div className="mt-1.5 space-y-2">
          {scripts.map((s) => (
            <blockquote key={s.id} className="border-l-[3px] border-[#b58a2a] pl-3 py-0.5">
              <p className="font-sans italic text-[13px] leading-relaxed text-[#1a1815]/65 whitespace-pre-wrap">{s.body}</p>
              <cite className="not-italic text-[10px] font-oswald uppercase tracking-[0.14em] text-[#1a1815]/40">{s.source}</cite>
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OutboundCockpit({ leadId, adminName }: { leadId: string; adminName: string }) {
  const [lead, setLead] = useState<OutboundLead | null>(null);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [queue, setQueue] = useState<QueueLead[]>([]);
  const [todayStats, setTodayStats] = useState<Record<string, Stat>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { toasts, push } = useToasts();

  const [repId, setRepId] = useState('');

  // Which pitch to lead with. Auto-picked from the lead (no site or a weak audit
  // => website), overridable live from the toggle in the script rail.
  const [laneOverride, setLaneOverride] = useState<'voice' | 'website' | null>(null);

  // Live revenue calculator (the weapon).
  const [avg, setAvg] = useState(0);
  const [missed, setMissed] = useState(5);
  const [close, setClose] = useState(50);

  // Call timer.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [demoOpen, setDemoOpen] = useState(false);
  const [cbOpen, setCbOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [session, setSessionState] = useState<DialSession | null>(null);
  const [sessionTick, setSessionTick] = useState(0);
  const [alsoOnLead, setAlsoOnLead] = useState<string[]>([]);
  const [burst, setBurst] = useState(0);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, sc, st, ov] = await Promise.all([
        api<{ lead: OutboundLead; logs: CallLog[]; pilot: Pilot | null }>(`/api/admin/outbound/leads/${leadId}`),
        api<{ scripts: Script[] }>('/api/admin/outbound/scripts'),
        api<{ reps: Rep[]; today: Record<string, Stat> }>('/api/admin/outbound/stats'),
        api<{ queue: QueueLead[] }>('/api/admin/outbound/overview'),
      ]);
      setLead(detail.lead);
      setLogs(detail.logs);
      setPilot(detail.pilot);
      setScripts(sc.scripts);
      setReps(st.reps);
      setTodayStats(st.today);
      setQueue(ov.queue);
      setAvg(Number(detail.lead.avg_job_value ?? 0) || NICHE_DEFAULT_JOB[detail.lead.niche]);
      setMissed(Number(detail.lead.est_missed_calls_week ?? 0) || 5);
      setClose(Number(detail.lead.close_rate_pct ?? 0) || 50);
      const stored = window.localStorage.getItem('mms_outbound_rep');
      const match =
        st.reps.find((r) => r.id === stored) ??
        st.reps.find((r) => adminName.toLowerCase().includes(r.name.toLowerCase())) ??
        st.reps[0];
      if (match) setRepId(match.id);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the lead.');
    } finally {
      setLoading(false);
    }
  }, [leadId, adminName]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (startedAt == null) return;
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [startedAt]);

  // Dial-session strip: hydrate from localStorage, tick the clock.
  useEffect(() => {
    setSessionState(getDialSession());
    const t = window.setInterval(() => setSessionTick((x) => x + 1), 15000);
    return () => window.clearInterval(t);
  }, []);

  // Presence heartbeat: tell the floor which lead I'm on, every ~20s while this
  // cockpit is open. This is what powers the online dot, the "on: <business>"
  // label, the no-double-dial guard, and the server-side batch cursor that makes
  // "pick up where you left off" land exactly here. Fire once immediately so the
  // board updates the instant a caller opens a lead.
  useEffect(() => {
    const beat = () => {
      void api<{ onSameLead?: string[] }>('/api/admin/outbound/presence', { method: 'POST', body: JSON.stringify({ lead_id: leadId }) })
        .then((r) => setAlsoOnLead(r.onSameLead ?? []))
        .catch(() => {});
    };
    beat();
    const t = window.setInterval(beat, 20000);
    // On leave, clear my current lead so the board doesn't show me parked on a
    // lead I walked away from (keepalive so it still fires during navigation).
    const clear = () => {
      try {
        navigator.sendBeacon?.(
          '/api/admin/outbound/presence',
          new Blob([JSON.stringify({ clear: true })], { type: 'application/json' }),
        );
      } catch {}
    };
    window.addEventListener('pagehide', clear);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('pagehide', clear);
    };
  }, [leadId]);

  const nextLeadIdRef = useRef<string | null>(null);

  const batchDoneRef = useRef(false);

  const advanceToNext = useCallback(
    (delayMs: number) => {
      const nextId = nextLeadIdRef.current;
      if (!nextId) {
        // End of the stack. Close the batch out and send the rep home with the
        // count, rather than silently parking them on the last lead.
        if (batchDoneRef.current) {
          window.setTimeout(() => {
            const s = getDialSession();
            const worked = s?.batch?.leadIds.length ?? 0;
            setDialSession(null);
            setSessionState(null);
            push(`Batch complete — ${worked} leads worked, ${s?.demos ?? 0} demos. 🌱`);
            router.push('/admin/outbound');
          }, delayMs);
        }
        return;
      }
      window.setTimeout(() => router.push(`/admin/outbound/call/${nextId}`), delayMs);
    },
    [router, push],
  );

  const endSession = useCallback(() => {
    const s = getDialSession();
    setDialSession(null);
    setSessionState(null);
    if (s) {
      const mins = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
      const what = s.batch ? 'Batch ended' : 'Session done';
      push(`${what}: ${s.dials} dials and ${s.demos} demos in ${mins} min. 🌱`);
    }
  }, [push]);

  const pickRep = (id: string) => {
    setRepId(id);
    window.localStorage.setItem('mms_outbound_rep', id);
  };

  const leak = useMemo(() => (avg > 0 && missed > 0 && close > 0 ? monthlyLeak(missed, close, avg) : 0), [avg, missed, close]);
  const shownLeak = useCountUp(leak, 600);

  const saveCalc = useCallback(async () => {
    if (!lead) return;
    try {
      const { lead: updated } = await api<{ lead: OutboundLead }>(`/api/admin/outbound/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ avg_job_value: avg || null, est_missed_calls_week: missed || null, close_rate_pct: close || null }),
      });
      setLead(updated);
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not save calculator values.', 'error');
    }
  }, [lead, avg, missed, close, push]);

  const rep = reps.find((r) => r.id === repId) ?? null;
  const myToday = todayStats[repId] ?? { dials: 0, conversations: 0, demos_booked: 0 };

  const vars: Record<string, string> = useMemo(() => {
    const first = lead?.contact_name?.trim().split(/\s+/)[0];
    return {
      'first name': first ?? 'there',
      company: lead?.business_name ?? 'your business',
      niche: lead ? NICHE_LABELS[lead.niche].toLowerCase() : 'business',
      'avg job value': avg > 0 ? fmtMoney(avg) : '',
      'monthly leak': leak > 0 ? fmtMoney(leak) : '',
      owner: lead?.contact_name ?? 'the owner',
      number: MMS_LINE,
    };
  }, [lead, avg, leak]);

  // Auto-pick the pitch lane from the lead: no website (or a weak audit) means
  // their front door is the problem, so lead with the site. Otherwise pitch the
  // phone. The toggle overrides it live.
  const autoLane: 'voice' | 'website' = useMemo(() => {
    if (!lead) return 'voice';
    const noSite = !lead.website || !lead.website.trim();
    const weakAudit = lead.audit_score != null && lead.audit_score < 60;
    return noSite || weakAudit ? 'website' : 'voice';
  }, [lead]);
  const lane: 'voice' | 'website' = laneOverride ?? autoLane;
  const laneReason = laneOverride
    ? 'You set this lane by hand.'
    : autoLane === 'website'
      ? !lead?.website || !lead.website.trim()
        ? 'Auto-picked: no website on file, so lead with the site.'
        : 'Auto-picked: weak site audit, so lead with the site.'
      : 'Auto-picked: they have a site, so lead with the phone.';

  /** Adapted (primary) scripts for a stage: lane match, then niche, then universal. */
  const primaryFor = useCallback(
    (stage: Script['stage']) => {
      const pool = scripts.filter((s) => s.stage === stage && !s.is_verbatim && (s.lane === 'shared' || s.lane === lane));
      const nicheHit = pool.filter((s) => s.niche === lead?.niche);
      const universal = pool.filter((s) => s.niche == null);
      return (nicheHit.length > 0 ? nicheHit : universal).sort((a, b) => a.sort_order - b.sort_order);
    },
    [scripts, lead?.niche, lane],
  );
  const verbatimFor = useCallback(
    (stage: Script['stage']) => scripts.filter((s) => s.stage === stage && s.is_verbatim && (s.lane === 'shared' || s.lane === lane)).sort((a, b) => a.sort_order - b.sort_order),
    [scripts, lane],
  );

  const objections = useMemo(
    () => scripts.filter((s) => s.stage === 'objection' && (s.lane === 'shared' || s.lane === lane) && (s.niche == null || s.niche === lead?.niche)).sort((a, b) => Number(a.is_verbatim) - Number(b.is_verbatim) || a.sort_order - b.sort_order),
    [scripts, lead?.niche, lane],
  );

  const logOutcome = async (outcome: CallOutcome, extra?: { disposition?: string; next_action?: string; next_action_at?: string }) => {
    if (!lead || !repId || logging) return;
    setLogging(true);
    const duration = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : null;
    setStartedAt(null);
    setElapsed(0);

    // Optimistic: bump the session counters immediately.
    const prevStats = todayStats;
    setTodayStats((s) => {
      const mine = s[repId] ?? { dials: 0, conversations: 0, demos_booked: 0 };
      return {
        ...s,
        [repId]: {
          dials: mine.dials + 1,
          conversations: mine.conversations + (outcome === 'conversation' || outcome === 'demo_booked' ? 1 : 0),
          demos_booked: mine.demos_booked + (outcome === 'demo_booked' ? 1 : 0),
        },
      };
    });

    try {
      const res = await api<{ log: CallLog; lead: OutboundLead | null }>('/api/admin/outbound/calls', {
        method: 'POST',
        body: JSON.stringify({ lead_id: lead.id, rep_id: repId, outcome, duration_sec: duration, ...extra }),
      });
      setLogs((ls) => [res.log, ...ls].slice(0, 8));
      if (res.lead) setLead(res.lead);
      push(
        outcome === 'demo_booked'
          ? 'Demo booked. That is the job. 🌱'
          : outcome === 'callback'
            ? 'Callback saved to the queue.'
            : `Logged: ${OUTCOME_LABELS[outcome]}.`,
      );
      // Session bookkeeping: tally, celebrate demos, and keep the treadmill
      // moving (demo advances are orchestrated by the modal so the forge can
      // finish first).
      const bumped = bumpDialSession(outcome === 'demo_booked' ? 'demo' : 'dial');
      if (bumped) setSessionState(bumped);
      if (outcome === 'demo_booked') setBurst((b) => b + 1);
      else if (bumped) advanceToNext(1100);
    } catch (e) {
      setTodayStats(prevStats);
      push(e instanceof Error ? e.message : 'Could not log that call.', 'error');
    } finally {
      setLogging(false);
    }
  };

  const runAudit = useCallback(async () => {
    if (!lead?.website) {
      push('No website on file yet. Try "Find site & email" first.', 'error');
      return;
    }
    setAuditing(true);
    push('Auditing their website. Takes about half a minute.');
    try {
      const res = await api<{ lead?: OutboundLead; report: { overall_score: number } }>(`/api/admin/outbound/leads/${lead.id}/audit`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res.lead) setLead(res.lead);
      push(`Audit done: ${Math.round(res.report.overall_score)}/100. Lead with it.`);
    } catch (e) {
      push(e instanceof Error ? e.message : 'Audit failed.', 'error');
    } finally {
      setAuditing(false);
    }
  }, [lead, push]);

  const handleDemoBooked = async (iso: string, notes: string, forge: boolean) => {
    await logOutcome('demo_booked', { next_action_at: iso, next_action: 'Demo', disposition: notes || undefined });
    if (forge && lead) {
      try {
        push('Forging their AI receptionist and queuing their demo website...');
        // forge-site forges the voice demo first, then queues the website
        // build on the worker. One call, both demos.
        const res = await api<{ lead?: OutboundLead }>(`/api/admin/outbound/leads/${lead.id}/forge-site`, { method: 'POST' });
        if (res.lead) setLead(res.lead);
        push('Receptionist forged; the website builds itself in the background. Send both before the meeting.');
      } catch (e) {
        push(e instanceof Error ? e.message : 'Forge failed, you can retry from the deck.', 'error');
      }
    }
    if (getDialSession()) advanceToNext(2200);
  };

  const startPilot = async () => {
    if (!lead) return;
    try {
      const { pilot: p } = await api<{ pilot: Pilot }>('/api/admin/outbound/pilots', { method: 'POST', body: JSON.stringify({ lead_id: lead.id }) });
      setPilot(p);
      setLead((l) => (l ? { ...l, status: 'pilot_live' } : l));
      push('30-day pilot started. Clock is running.');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not start the pilot.', 'error');
    }
  };

  // Batch mode: the rep is walking a frozen, ordered stack, so "next" is the next
  // id in that list — never a re-derived hottest lead.
  const pos = batchPosition(session, leadId);
  const batchNext = pos?.nextId ?? null;
  const batchNextLead = batchNext ? queue.find((qq) => qq.id === batchNext) ?? null : null;

  // Free-roam mode (no batch): "next" is the genuinely next lead in the leads
  // table's stable order, NOT the hottest. Using the heat queue here made the
  // button loop (hottest-that-isn't-current bounced A<->B forever). Fetched from
  // /next-lead so it walks forward through the whole floor deterministically.
  const [freeNext, setFreeNext] = useState<{ id: string; business_name: string } | null>(null);
  useEffect(() => {
    if (pos) return; // batch drives its own next
    let live = true;
    api<{ next: { id: string; business_name: string } | null }>(`/api/admin/outbound/next-lead?after=${leadId}`)
      .then((r) => { if (live) setFreeNext(r.next); })
      .catch(() => { if (live) setFreeNext(null); });
    return () => { live = false; };
  }, [leadId, pos]);

  const nextLead = pos ? batchNextLead : freeNext;
  useEffect(() => {
    // In a batch the id is authoritative even when the lead isn't in the heat
    // queue (most assigned leads won't be) — otherwise the stack would stall on
    // the first cold lead.
    nextLeadIdRef.current = pos ? batchNext : nextLead?.id ?? null;
    batchDoneRef.current = !!pos && !batchNext;
  }, [pos, batchNext, nextLead]);

  // Keyboard shortcuts for the dial floor. Armed only while the call timer is
  // running so a brushed keyboard can never log phantom outcomes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (startedAt == null || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || demoOpen || cbOpen) return;
      const k = e.key.toLowerCase();
      if (k === 'n') void logOutcome('no_answer');
      else if (k === 'v') void logOutcome('voicemail');
      else if (k === 'c') void logOutcome('conversation');
      else if (k === 'g') void logOutcome('gatekeeper');
      else if (k === 'x') void logOutcome('not_interested');
      else if (k === 'b') setDemoOpen(true);
      else if (k === 'k') setCbOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead, repId, startedAt, demoOpen, cbOpen, logging, todayStats]);

  const outcomeBtn = 'w-full text-left px-4 py-3 rounded-xl border-2 font-oswald font-semibold uppercase tracking-[0.08em] text-sm transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none';

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#f7f3e9] pb-24 md:pb-10">
      <AdminHeader active="outbound" title="Call Cockpit" />
      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        <OutboundNav
          active="call"
          right={
            pos && batchNext ? (
              <Link href={`/admin/outbound/call/${batchNext}`} className={btnGhost}>
                Next in batch →
              </Link>
            ) : nextLead ? (
              <Link href={`/admin/outbound/call/${nextLead.id}`} className={btnGhost}>
                Next lead: {nextLead.business_name.slice(0, 24)} →
              </Link>
            ) : undefined
          }
        />

        {session && (
          <div className="mb-5 bg-[#1a1815] border-2 border-[#1a1815] rounded-2xl shadow-[4px_4px_0_0_#3f5d34] px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[10px] uppercase tracking-[0.3em] font-oswald font-semibold text-[#3f5d34]" style={{ color: '#8fb37f' }}>
              {pos ? `● ${session.batch?.repName ?? ''} batch` : '● Session live'}
            </span>
            {(() => {
              void sessionTick;
              const mins = Math.max(1, (Date.now() - session.startedAt) / 60000);
              const pace = Math.round((session.dials / mins) * 60);
              // Position is 0-indexed and -1 when the rep has navigated off the
              // stack; clamp so the counter never reads "Lead 0 of 25".
              const at = pos ? Math.max(0, pos.index) + 1 : 0;
              const pct = pos ? Math.round(((pos.index + 1) / pos.total) * 100) : 0;
              return (
                <>
                  {pos && (
                    <span className="flex items-center gap-2.5">
                      <span className="font-oswald text-[#b58a2a] text-lg leading-none">
                        {at}
                        <span className="text-[#f7f3e9]/40"> / {pos.total}</span>
                      </span>
                      <span className="hidden sm:block w-28 h-2 rounded-full bg-[#f7f3e9]/15 overflow-hidden" aria-hidden>
                        <span className="block h-full bg-[#b58a2a] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                  )}
                  <span className="font-oswald text-[#f7f3e9] text-lg leading-none">
                    {session.dials} <span className="text-xs text-[#f7f3e9]/50 uppercase">dials</span>
                  </span>
                  <span className="font-oswald text-[#f7f3e9] text-lg leading-none">
                    {session.demos} <span className="text-xs text-[#f7f3e9]/50 uppercase">demos</span>
                  </span>
                  <span className="font-oswald text-[#b58a2a] text-lg leading-none">
                    {pace} <span className="text-xs text-[#f7f3e9]/50 uppercase">per hr pace</span>
                  </span>
                  <span className="font-sans text-xs text-[#f7f3e9]/45">
                    {Math.round(mins)} min in ·{' '}
                    {pos
                      ? pos.last
                        ? 'last one in the stack'
                        : `${pos.total - Math.max(0, pos.index) - 1} left after this`
                      : 'outcomes auto-advance to the next hottest lead'}
                  </span>
                </>
              );
            })()}
            <button onClick={endSession} className="ml-auto text-[10px] uppercase tracking-[0.18em] font-oswald font-semibold text-[#f7f3e9]/60 hover:text-[#f7f3e9] border-2 border-[#f7f3e9]/30 hover:border-[#f7f3e9] rounded-lg px-3 py-1.5 transition-colors">
              {pos ? 'End batch' : 'End session'}
            </button>
          </div>
        )}

        {alsoOnLead.length > 0 && (
          <div className="mb-5 flex items-center gap-2.5 bg-[#a03123] border-2 border-[#1a1815] rounded-2xl shadow-[4px_4px_0_0_#1a1815] px-5 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f7f3e9] animate-pulse shrink-0" aria-hidden />
            <p className="font-sans text-sm text-[#f7f3e9]">
              <span className="font-oswald font-semibold uppercase tracking-[0.08em]">{alsoOnLead.join(' & ')}</span>{' '}
              {alsoOnLead.length > 1 ? 'are' : 'is'} on this same lead right now. Check before you dial so you don&apos;t double-call.
            </p>
          </div>
        )}

        {error && (
          <div className={`${card} p-5 mb-6 border-[#a03123] shadow-[5px_5px_0_0_#a03123]`}>
            <p className="font-sans text-sm text-[#a03123] font-medium">{error}</p>
          </div>
        )}
        {loading && <div className={`${card} p-10 text-center font-oswald uppercase text-[#1a1815]/40`}>Loading the cockpit...</div>}

        {lead && (
          <>
            {/* Lead header */}
            <section className={`${card} p-5 md:p-6 mb-6`}>
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={eyebrow}>{lead.city ? `${lead.city}${lead.state ? ', ' + lead.state : ''}` : 'On the list'}</span>
                    <StatusChip status={lead.status} />
                    <NicheChip niche={lead.niche} />
                    {!lead.dnc_checked && (
                      <span className="text-[9px] uppercase tracking-[0.14em] font-oswald font-semibold text-[#a03123] border border-[#a03123]/40 rounded-md px-1.5 py-0.5">
                        DNC unscrubbed
                      </span>
                    )}
                  </div>
                  <h1 className="font-oswald font-semibold uppercase text-3xl md:text-4xl text-[#1a1815] tracking-tight leading-none mt-1.5 truncate">
                    {lead.business_name}
                  </h1>
                  <p className="font-sans text-sm text-[#1a1815]/60 mt-1">
                    {lead.contact_name ? `${lead.contact_name} · ` : ''}{formatPhone(lead.phone)}
                    {lead.website ? <> · <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-[#b58a2a] hover:underline">site ↗</a></> : null}
                  </p>
                  {/* The address every email on this page goes to. It used to be invisible. */}
                  <p className="font-sans text-sm mt-0.5">
                    {lead.email ? (
                      <>
                        <span className="text-[10px] uppercase tracking-[0.18em] font-oswald font-semibold text-[#1a1815]/45 mr-1.5">Email</span>
                        <a href={`mailto:${lead.email}`} className="font-medium text-[#1a1815] hover:text-[#b58a2a] transition-colors break-all">{lead.email}</a>
                        {lead.last_email_at && (
                          <span className="text-[#1a1815]/45 ml-2">
                            last sent {new Date(lead.last_email_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' })} MT
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[#a03123]/80 font-medium">No email on file. Run &ldquo;Find site &amp; email&rdquo; before you can write them.</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right mr-1 hidden sm:block">
                    <span className="block text-[10px] uppercase tracking-[0.18em] font-oswald text-[#1a1815]/45">On call</span>
                    <span className={`font-oswald font-semibold text-2xl tabular-nums ${startedAt ? 'text-[#3f5d34]' : 'text-[#1a1815]/30'}`}>{mmss}</span>
                  </div>
                  <a
                    href={`tel:${lead.phone.replace(/[^+\d]/g, '')}`}
                    onClick={() => { setStartedAt(Date.now()); setElapsed(0); }}
                    className={`${btnPrimary} !text-base !px-6 !py-3.5`}
                  >
                    ☎ Dial
                  </a>
                  {startedAt == null ? (
                    <button onClick={() => { setStartedAt(Date.now()); setElapsed(0); }} className={`${btnGhost} !px-3.5`} title="Start the call timer without dialing from this device">
                      Start timer
                    </button>
                  ) : (
                    <button onClick={() => { setStartedAt(null); setElapsed(0); }} className={`${btnGhost} !px-3.5`}>
                      Stop
                    </button>
                  )}
                </div>
              </div>

              <ReachOutDeck
                lead={lead}
                onLead={setLead}
                push={push}
                onOpenThread={() => setThreadOpen(true)}
                auditing={auditing}
                onRunAudit={() => void runAudit()}
              />

              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t-2 border-[#1a1815]/[0.08]">
                <span className="text-[10px] uppercase tracking-[0.2em] font-oswald font-medium text-[#1a1815]/50">Dialing as</span>
                <div className="flex items-center gap-1.5">
                  {reps.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => pickRep(r.id)}
                      className={`px-3.5 py-1.5 rounded-lg border-2 font-oswald font-semibold uppercase tracking-[0.1em] text-xs transition-all ${
                        repId === r.id ? 'bg-[#1a1815] text-[#b58a2a] border-[#1a1815]' : 'bg-transparent text-[#1a1815]/55 border-[#1a1815]/25 hover:border-[#1a1815]'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
                {rep && (
                  <span className="font-sans text-xs text-[#1a1815]/60 ml-auto">
                    {rep.name} today: <strong className="font-oswald text-sm">{myToday.dials}</strong>/{rep.daily_dial_goal} dials ·{' '}
                    <strong className="font-oswald text-sm">{myToday.demos_booked}</strong>/{rep.daily_demo_goal} demos
                  </span>
                )}
                {(lead.status === 'demo_booked' || lead.status === 'pilot_live') && (
                  pilot ? (
                    <Link href="/admin/outbound/pilots" className="font-sans text-xs font-semibold text-[#3f5d34] hover:underline">Pilot running → tracker</Link>
                  ) : (
                    <button onClick={() => void startPilot()} className={`${btnSeed} !px-3.5 !py-1.5 !text-xs`}>Start 30-day pilot</button>
                  )
                )}
              </div>
            </section>

            <LeadFile lead={lead} onLead={setLead} push={push} />

            <PersonalVideoCard leadId={lead.id} push={push} />

            <div className="grid lg:grid-cols-12 gap-5 items-start">
              {/* a. Script rail */}
              <section className="lg:col-span-5 space-y-4">
                {/* Pitch lane: website vs voice, auto-picked from the lead, flippable live. */}
                <div className={`${card} p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#1a1815]/60">Pitch lane</span>
                      <p className="text-[11px] text-[#1a1815]/55 mt-0.5">{laneReason}</p>
                    </div>
                    <div className="flex rounded-full border-2 border-[#1a1815] overflow-hidden shrink-0">
                      {(['website', 'voice'] as const).map((ln) => (
                        <button
                          key={ln}
                          onClick={() => setLaneOverride(ln)}
                          className={`px-3.5 py-1.5 font-oswald font-semibold uppercase text-xs tracking-wide transition-colors ${lane === ln ? 'bg-[#1a1815] text-[#b58a2a]' : 'bg-transparent text-[#1a1815]/55 hover:text-[#1a1815]'}`}
                        >
                          {ln === 'website' ? 'Website' : 'Voice'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <ReviewAmmoCard lead={lead} />
                <AuditIntelCard lead={lead} onRun={() => void runAudit()} auditing={auditing} />
                {([
                  ['opener', 'Opener'],
                  ['hook_bad', "Why I'm calling"],
                  ['hook_good', 'What we do'],
                  ['gap_question', 'The gap question'],
                  ['revenue_math', 'The math'],
                  ['close', 'The close'],
                ] as const).map(([stage, label], idx) => {
                  const primary = primaryFor(stage);
                  const his = verbatimFor(stage);
                  if (primary.length === 0 && his.length === 0) return null;
                  return (
                    <div key={stage} className={`${card} p-5 relative`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-[#1a1815] text-[#b58a2a] font-oswald font-semibold text-xs flex items-center justify-center">{idx + 1}</span>
                        <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#1a1815]/60">{label}</span>
                        {primary[0]?.niche && (
                          <span className="text-[9px] uppercase tracking-[0.12em] font-oswald text-[#3f5d34] border border-[#3f5d34]/40 rounded px-1.5 py-0.5">
                            {NICHE_LABELS[primary[0].niche]} version
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                        {primary.map((s) => <ScriptBody key={s.id} body={s.body} vars={vars} />)}
                      </div>
                      <HisWords scripts={his} />
                    </div>
                  );
                })}

                {/* Voicemail + gatekeeper pocket scripts */}
                <div className={`${card} p-5`}>
                  <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#1a1815]/60">Pocket scripts</span>
                  {(['gatekeeper', 'voicemail'] as const).map((stage) => (
                    <details key={stage} className="mt-2.5 group">
                      <summary className="cursor-pointer font-oswald uppercase tracking-[0.1em] text-sm text-[#b58a2a] font-semibold list-none">
                        <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span> {stage === 'gatekeeper' ? 'Gatekeeper' : 'Voicemail'}
                      </summary>
                      <div className="mt-2 space-y-3">
                        {primaryFor(stage).map((s) => <ScriptBody key={s.id} body={s.body} vars={vars} />)}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* b. Live revenue calculator (the weapon) */}
              <section className="lg:col-span-4 lg:sticky lg:top-24">
                <div className="bg-[#1a1815] border-2 border-[#1a1815] rounded-2xl shadow-[6px_6px_0_0_#b58a2a] p-6 overflow-hidden relative">
                  <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#b58a2a 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} />
                  <span className="text-[10px] uppercase tracking-[0.3em] font-oswald font-semibold text-[#b58a2a] relative">Live revenue calculator</span>
                  <div className="grid grid-cols-3 gap-3 mt-4 relative">
                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.16em] font-oswald text-[#f7f3e9]/50 mb-1.5">Avg job $</label>
                      <input
                        inputMode="decimal"
                        value={avg || ''}
                        onChange={(e) => setAvg(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                        onBlur={() => void saveCalc()}
                        className="w-full bg-[#f7f3e9]/10 border-2 border-[#f7f3e9]/20 focus:border-[#b58a2a] rounded-xl px-3 py-2.5 font-oswald text-lg text-[#f7f3e9] outline-none tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.16em] font-oswald text-[#f7f3e9]/50 mb-1.5">Missed / wk</label>
                      <input
                        inputMode="numeric"
                        value={missed || ''}
                        onChange={(e) => setMissed(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
                        onBlur={() => void saveCalc()}
                        className="w-full bg-[#f7f3e9]/10 border-2 border-[#f7f3e9]/20 focus:border-[#b58a2a] rounded-xl px-3 py-2.5 font-oswald text-lg text-[#f7f3e9] outline-none tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.16em] font-oswald text-[#f7f3e9]/50 mb-1.5">Close rate %</label>
                      <input
                        inputMode="numeric"
                        value={close || ''}
                        onChange={(e) => setClose(Math.min(100, Number(e.target.value.replace(/[^\d]/g, '')) || 0))}
                        onBlur={() => void saveCalc()}
                        className="w-full bg-[#f7f3e9]/10 border-2 border-[#f7f3e9]/20 focus:border-[#b58a2a] rounded-xl px-3 py-2.5 font-oswald text-lg text-[#f7f3e9] outline-none tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="mt-6 text-center relative">
                    <span className="text-[10px] uppercase tracking-[0.24em] font-oswald text-[#f7f3e9]/55">They are leaking</span>
                    <p className="font-oswald font-bold text-6xl md:text-7xl leading-none tabular-nums text-[#b58a2a] mt-1.5 [text-shadow:0_0_34px_rgba(181,138,42,0.45)]">
                      {fmtMoney(shownLeak)}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.28em] font-oswald text-[#f7f3e9]/60 mt-2">per month</p>
                    <p className="font-sans text-sm text-[#f7f3e9]/70 mt-3">
                      {fmtMoney(leak * 12)} a year
                    </p>
                    <p className="font-sans italic text-[13px] text-[#f7f3e9]/55 mt-4 border-t border-[#f7f3e9]/15 pt-3.5">
                      {`Read this out loud: “That’s ${leak > 0 ? fmtMoney(leak) : 'real money'} a month walking out the door because nobody picked up.”`}
                    </p>
                  </div>
                  <p className="relative font-mono text-[10px] text-[#f7f3e9]/35 text-center mt-3">
                    {missed || 0} missed × 4.3 wks × {close || 0}% close × {fmtMoney(avg || 0)}
                  </p>
                </div>
              </section>

              {/* c. Outcome panel */}
              <section className="lg:col-span-3 space-y-4">
                <div className={`${card} p-4`}>
                  <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#1a1815]/60">Log the call</span>
                  <p className="font-sans text-[11px] text-[#1a1815]/40 mt-0.5">Letter shortcuts work while the timer runs.</p>
                  <div className="mt-3 space-y-2">
                    <button onClick={() => setDemoOpen(true)} disabled={logging || !repId} className={`${btnPrimary} w-full !py-3.5 !text-base`}>
                      ★ Demo booked <span className="font-mono text-[10px] opacity-60">B</span>
                    </button>
                    <button onClick={() => void logOutcome('conversation')} disabled={logging || !repId} className={`${outcomeBtn} bg-[#3f5d34]/10 border-[#3f5d34]/60 text-[#3f5d34] hover:bg-[#3f5d34]/20`}>
                      Conversation <span className="font-mono text-[10px] opacity-50 float-right mt-0.5">C</span>
                    </button>
                    <button onClick={() => setCbOpen(true)} disabled={logging || !repId} className={`${outcomeBtn} bg-[#b58a2a]/10 border-[#b58a2a]/60 text-[#7a5c1a] hover:bg-[#b58a2a]/20`}>
                      Callback <span className="font-mono text-[10px] opacity-50 float-right mt-0.5">K</span>
                    </button>
                    <button onClick={() => void logOutcome('voicemail')} disabled={logging || !repId} className={`${outcomeBtn} bg-white border-[#1a1815]/25 text-[#1a1815]/75 hover:border-[#1a1815]`}>
                      Voicemail <span className="font-mono text-[10px] opacity-50 float-right mt-0.5">V</span>
                    </button>
                    <button onClick={() => void logOutcome('no_answer')} disabled={logging || !repId} className={`${outcomeBtn} bg-white border-[#1a1815]/25 text-[#1a1815]/75 hover:border-[#1a1815]`}>
                      No answer <span className="font-mono text-[10px] opacity-50 float-right mt-0.5">N</span>
                    </button>
                    <button onClick={() => void logOutcome('gatekeeper')} disabled={logging || !repId} className={`${outcomeBtn} bg-white border-[#1a1815]/25 text-[#1a1815]/75 hover:border-[#1a1815]`}>
                      Gatekeeper <span className="font-mono text-[10px] opacity-50 float-right mt-0.5">G</span>
                    </button>
                    <button onClick={() => void logOutcome('not_interested')} disabled={logging || !repId} className={`${outcomeBtn} bg-white border-[#a03123]/40 text-[#a03123] hover:border-[#a03123]`}>
                      Not interested <span className="font-mono text-[10px] opacity-50 float-right mt-0.5">X</span>
                    </button>
                  </div>
                </div>

                {/* Recent activity */}
                {logs.length > 0 && (
                  <div className={`${card} p-4`}>
                    <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#1a1815]/60">Last calls</span>
                    <ul className="mt-2 space-y-1.5">
                      {logs.slice(0, 5).map((lg) => (
                        <li key={lg.id} className="flex items-center justify-between font-sans text-xs text-[#1a1815]/65">
                          <span>{OUTCOME_LABELS[lg.outcome]}</span>
                          <span className="text-[#1a1815]/40">
                            {new Date(lg.called_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Objection handlers */}
                <div className={`${card} p-4`}>
                  <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#1a1815]/60">Objections</span>
                  <div className="mt-2 divide-y divide-[#1a1815]/[0.08]">
                    {objections.map((s) => (
                      <details key={s.id} className="py-2 group">
                        <summary className="cursor-pointer list-none font-sans text-[13px] font-semibold text-[#1a1815]/80 hover:text-[#b58a2a] transition-colors">
                          <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>{' '}
                          {s.name.replace(/^Objection: /i, '').replace(/^Cahill /i, '')}
                          {s.is_verbatim && <span className="ml-1.5 text-[9px] uppercase tracking-[0.1em] font-oswald text-[#b58a2a]">his words</span>}
                        </summary>
                        <div className="mt-1.5 pl-3">
                          <ScriptBody body={s.body} vars={vars} />
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {/* Mobile quick-log bar */}
      {lead && (
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#1a1815] border-t-2 border-[#b58a2a] px-3 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setDemoOpen(true)} disabled={logging || !repId} className="shrink-0 bg-[#b58a2a] text-[#1a1815] rounded-lg px-3.5 py-2 font-oswald font-semibold uppercase text-xs">★ Demo</button>
          <button onClick={() => void logOutcome('conversation')} disabled={logging || !repId} className="shrink-0 bg-[#3f5d34] text-[#f7f3e9] rounded-lg px-3.5 py-2 font-oswald font-semibold uppercase text-xs">Convo</button>
          <button onClick={() => setCbOpen(true)} disabled={logging || !repId} className="shrink-0 bg-[#f7f3e9]/15 text-[#f7f3e9] rounded-lg px-3.5 py-2 font-oswald font-semibold uppercase text-xs">Callback</button>
          <button onClick={() => void logOutcome('voicemail')} disabled={logging || !repId} className="shrink-0 bg-[#f7f3e9]/15 text-[#f7f3e9] rounded-lg px-3.5 py-2 font-oswald font-semibold uppercase text-xs">VM</button>
          <button onClick={() => void logOutcome('no_answer')} disabled={logging || !repId} className="shrink-0 bg-[#f7f3e9]/15 text-[#f7f3e9] rounded-lg px-3.5 py-2 font-oswald font-semibold uppercase text-xs">No ans</button>
          <button onClick={() => void logOutcome('not_interested')} disabled={logging || !repId} className="shrink-0 bg-[#a03123] text-[#f7f3e9] rounded-lg px-3.5 py-2 font-oswald font-semibold uppercase text-xs">Not int</button>
        </div>
      )}

      {burst > 0 && <SeedBurst key={burst} />}

      {/* Demo booked modal */}
      <DemoModal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        hasDemo={Boolean(lead?.demo_url) && Boolean(lead?.site_demo_status && lead.site_demo_status !== 'failed')}
        onSave={(iso, notes, forge) => { setDemoOpen(false); void handleDemoBooked(iso, notes, forge); }}
      />
      {/* Callback modal */}
      <CallbackModal open={cbOpen} onClose={() => setCbOpen(false)} onSave={(iso, note) => { setCbOpen(false); void logOutcome('callback', { next_action_at: iso, next_action: note || 'Callback' }); }} />

      {/* Conversation thread */}
      {lead && <ThreadPanel lead={lead} open={threadOpen} onClose={() => setThreadOpen(false)} push={push} />}

      <ToastHost toasts={toasts} />
    </div>
  );
}

/** Default date/time slots expressed in Mountain Time, not the machine clock. */
function nextHourPlus(hours: number): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(Date.now() + hours * 3600000));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${String(Number(get('hour')) % 24).padStart(2, '0')}:00` };
}

function DemoModal({ open, onClose, onSave, hasDemo }: { open: boolean; onClose: () => void; onSave: (iso: string, notes: string, forge: boolean) => void; hasDemo: boolean }) {
  const init = nextHourPlus(3);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [notes, setNotes] = useState('');
  const [forge, setForge] = useState(true);
  return (
    <Modal open={open} onClose={onClose} eyebrow="The win" title="Demo booked" subtitle="Lock the slot while they are still warm." size="sm" headerTone="dark">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Time (MT)</label>
          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} min-h-[70px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Partner joining, wants to hear the AI live, build demo from their site first." />
        </div>
      </div>
      {!hasDemo && (
        <label className="flex items-center gap-2 font-sans text-sm text-[#1a1815]/75 cursor-pointer mt-3">
          <input type="checkbox" checked={forge} onChange={(e) => setForge(e.target.checked)} className="accent-[#3f5d34] w-4 h-4" />
          Forge their AI demo and their demo website now, so they can see both before the meeting
        </label>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button
          onClick={() => {
            onSave(denverIso(date, time || '10:00'), notes, !hasDemo && forge);
            setNotes('');
          }}
          disabled={!date}
          className={btnPrimary}
        >
          Book it
        </button>
      </div>
    </Modal>
  );
}

function CallbackModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (iso: string, note: string) => void }) {
  const init = nextHourPlus(24);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState('10:00');
  const [note, setNote] = useState('');
  return (
    <Modal open={open} onClose={onClose} eyebrow="Outbound" title="Schedule the callback" subtitle="It lands in the queue when it is due." size="sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Time (MT)</label>
          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>What happens next</label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Owner back Thursday, ask for Dana" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button
          onClick={() => {
            onSave(denverIso(date, time || '10:00'), note);
            setNote('');
          }}
          disabled={!date}
          className={btnPrimary}
        >
          Save callback
        </button>
      </div>
    </Modal>
  );
}
