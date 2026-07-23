'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import Modal from '@/components/ui/Modal';
import { formatPhone, fmtMoney } from '@/lib/outbound';
import type { ForgeCounts, HeatReason, Rep } from '@/lib/outbound';
import { GoalRing, OutboundNav, StatusChip, NicheChip, HeatChip, useCountUp, api, card, btnPrimary, btnSeed, btnGhost, eyebrow, labelCls, setDialSession } from '@/components/admin/outbound/ui';

type Stat = { dials: number; conversations: number; demos_booked: number };
type QueueLead = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string;
  niche: string;
  city: string | null;
  status: string;
  owner_rep_id: string | null;
  dnc_checked: boolean;
  next_action_at: string | null;
  next_action: string | null;
  audit_score: number | null;
  last_open_at: string | null;
  email_open_count: number;
  heat: number;
  reason: HeatReason;
};
type BatchRep = { id: string; name: string; ready: number };
type RepPresence = {
  id: string;
  name: string;
  role: string;
  online: boolean;
  last_seen_at: string | null;
  current_lead: { id: string; business_name: string } | null;
  batch: { cursor: number; total: number } | null;
  dials_today: number;
  is_me: boolean;
};
type ResumeInfo = {
  repId: string;
  repName: string;
  leadIds: string[];
  cursor: number;
  resumeLeadId: string;
  position: number;
  total: number;
  remaining: number;
  lastLead: { id: string; business_name: string } | null;
};
type Overview = {
  reps: Rep[];
  today: Record<string, Stat>;
  week: Record<string, Stat>;
  queue: QueueLead[];
  lockedUnscrubbed: number;
  selfServe?: { today: number; waiting: number };
  pilots: { running: number; totalRecovered: number; endingSoon: { id: string; ends_at: string; business_name: string }[] };
  day: string;
};

const ZERO: Stat = { dials: 0, conversations: 0, demos_booked: 0 };

/** Compact "3m / 2h / 1d ago" for a last-seen timestamp. */
function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function OutboundDashboard({ adminName = '' }: { adminName?: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      setData(await api<Overview>('/api/admin/outbound/overview'));
      setError('');
    } catch (e) {
      if (!background) setError(e instanceof Error ? e.message : 'Could not load the cockpit.');
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Speed-to-open: refresh every minute so "reading your audit right now"
    // surfaces while it is still true.
    const t = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(t);
  }, [load]);

  // ── live floor: presence + resume ──
  // Presence is its own light poll (every 20s) so the online dots and "on: X"
  // labels feel live without re-running the heat queue. Resume tells the signed-in
  // rep exactly where they left off.
  const [presence, setPresence] = useState<RepPresence[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [resume, setResume] = useState<ResumeInfo | null>(null);

  const [forge, setForge] = useState<ForgeCounts | null>(null);

  const loadFloor = useCallback(async () => {
    try {
      const [pres, bat, fg] = await Promise.all([
        api<{ presence: RepPresence[]; meId: string | null }>('/api/admin/outbound/presence'),
        api<{ resume: ResumeInfo | null }>('/api/admin/outbound/batch'),
        api<{ counts: ForgeCounts }>('/api/admin/outbound/forge?summary=1'),
      ]);
      setPresence(pres.presence);
      setMeId(pres.meId);
      setResume(bat.resume);
      setForge(fg.counts);
    } catch {
      /* floor is ambient; a hiccup shouldn't error the whole page */
    }
  }, []);

  useEffect(() => {
    void loadFloor();
    const t = window.setInterval(() => void loadFloor(), 20000);
    return () => window.clearInterval(t);
  }, [loadFloor]);

  const pickUpWhereLeftOff = useCallback(() => {
    if (!resume) return;
    setDialSession({
      startedAt: Date.now(),
      dials: 0,
      demos: 0,
      batch: { leadIds: resume.leadIds, repId: resume.repId, repName: resume.repName },
    });
    router.push(`/admin/outbound/call/${resume.resumeLeadId}`);
  }, [resume, router]);

  // ── batch mode ──
  // The heat queue is "hottest 40 on the whole floor". A batch is "the next N of
  // MY leads, frozen in order, finishable". With thousands of leads on the floor
  // that difference is the whole job for a rep working an assigned list.
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchReps, setBatchReps] = useState<BatchRep[]>([]);
  const [batchRepId, setBatchRepId] = useState('');
  const [batchSize, setBatchSize] = useState(25);
  const [minting, setMinting] = useState(false);
  const [batchErr, setBatchErr] = useState('');

  const openBatch = useCallback(async () => {
    setBatchOpen(true);
    setBatchErr('');
    try {
      const { reps } = await api<{ reps: BatchRep[] }>('/api/admin/outbound/batch');
      setBatchReps(reps);
      // Default to the signed-in rep's OWN leads. Falling back to "whoever holds
      // the most" would hand a new caller someone else's floor on first login,
      // which is exactly the mistake a fresh browser would make.
      const stored = window.localStorage.getItem('mms_outbound_rep');
      const byName = adminName
        ? reps.find((r) => adminName.toLowerCase().includes(r.name.toLowerCase()))
        : undefined;
      const mine = reps.find((r) => r.id === stored && r.ready > 0);
      const best = [...reps].sort((a, b) => b.ready - a.ready)[0];
      setBatchRepId(byName?.id ?? mine?.id ?? best?.id ?? '');
    } catch (e) {
      setBatchErr(e instanceof Error ? e.message : 'Could not load reps.');
    }
  }, [adminName]);

  const startBatch = useCallback(async () => {
    if (!batchRepId || minting) return;
    setMinting(true);
    setBatchErr('');
    try {
      const res = await api<{ leadIds: string[]; rep: { id: string; name: string }; remaining: number }>(
        '/api/admin/outbound/batch',
        { method: 'POST', body: JSON.stringify({ rep_id: batchRepId, size: batchSize }) },
      );
      if (!res.leadIds.length) {
        setBatchErr('No workable leads for that rep right now.');
        return;
      }
      setDialSession({
        startedAt: Date.now(),
        dials: 0,
        demos: 0,
        batch: { leadIds: res.leadIds, repId: res.rep.id, repName: res.rep.name },
      });
      router.push(`/admin/outbound/call/${res.leadIds[0]}`);
    } catch (e) {
      setBatchErr(e instanceof Error ? e.message : 'Could not build the batch.');
    } finally {
      setMinting(false);
    }
  }, [batchRepId, batchSize, minting, router]);

  const pickedRep = batchReps.find((r) => r.id === batchRepId) ?? null;

  const recovered = useCountUp(data?.pilots.totalRecovered ?? 0, 900);

  return (
    <div className="min-h-screen bg-[#f7f3e9]">
      <AdminHeader active="outbound" title="Outbound" onRefresh={() => void load()} />
      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        <OutboundNav
          active="dashboard"
          badge={{ forge: forge?.uncontacted ?? 0 }}
          right={
            <div className="flex items-center gap-2">
              {resume ? (
                <button onClick={pickUpWhereLeftOff} className={btnPrimary} title={resume.lastLead ? `Last on ${resume.lastLead.business_name}` : undefined}>
                  ⏱ Pick up where you left off ({resume.position}/{resume.total})
                </button>
              ) : null}
              <button onClick={() => void openBatch()} className={resume ? btnGhost : btnSeed}>
                ▦ Start batch
              </button>
            </div>
          }
        />

        {/* Self-serve arrivals. The best news the floor gets, so it says so
            before anything else: these people came off an ad, forged their own
            suite, and are on their hub right now. */}
        {(data?.selfServe?.waiting ?? 0) > 0 && (
          <Link
            href="/admin/outbound/leads?source=demo-station"
            className="flex items-center gap-3 mb-5 px-4 py-3.5 rounded-2xl border-2 border-[#1a1815] bg-[#b58a2a] shadow-[4px_4px_0_0_#1a1815] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#1a1815] transition-all"
          >
            <span className="text-lg" aria-hidden>⚡</span>
            <span className="font-sans text-sm text-[#1a1815]">
              <strong className="font-oswald text-base">{data?.selfServe?.waiting}</strong>{' '}
              {data?.selfServe?.waiting === 1 ? 'owner forged their own demos' : 'owners forged their own demos'} and{' '}
              {data?.selfServe?.waiting === 1 ? 'is' : 'are'} waiting on a call.
              {(data?.selfServe?.today ?? 0) > 0 && (
                <span className="text-[#1a1815]/70"> {data?.selfServe?.today} in the last 24 hours.</span>
              )}
            </span>
            <span className="ml-auto font-oswald uppercase tracking-[0.1em] text-xs font-semibold text-[#1a1815] shrink-0">Work them →</span>
          </Link>
        )}

        {/* Work already paid for. A forged suite nobody has called is the most
            expensive thing on this floor, so it gets a line of its own. */}
        {((forge?.uncontacted ?? 0) > 0 || (forge?.forging ?? 0) > 0 || (forge?.failed ?? 0) > 0) && (
          <Link
            href={`/admin/outbound/forge${(forge?.uncontacted ?? 0) > 0 ? '?stage=uncontacted' : '?stage=forging'}`}
            className="flex items-center gap-3 mb-5 px-4 py-3.5 rounded-2xl border-2 border-[#1a1815] bg-[#1a1815] shadow-[4px_4px_0_0_#b58a2a] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#b58a2a] transition-all"
          >
            <span className="text-lg" aria-hidden>⚒</span>
            <span className="font-sans text-sm text-[#f7f3e9]">
              {(forge?.forging ?? 0) > 0 && (
                <>
                  <strong className="font-oswald text-base text-[#b58a2a]">{forge?.forging}</strong>{' '}
                  {forge?.forging === 1 ? 'demo is' : 'demos are'} on the anvil right now.{' '}
                </>
              )}
              {(forge?.uncontacted ?? 0) > 0 && (
                <>
                  <strong className="font-oswald text-base text-[#b58a2a]">{forge?.uncontacted}</strong> forged{' '}
                  {forge?.uncontacted === 1 ? 'suite has' : 'suites have'} never been called or emailed.
                </>
              )}
              {(forge?.failed ?? 0) > 0 && (
                <span className="text-[#e8a598]"> {forge?.failed} build{forge?.failed === 1 ? '' : 's'} failed.</span>
              )}
            </span>
            <span className="ml-auto font-oswald uppercase tracking-[0.1em] text-xs font-semibold text-[#b58a2a] shrink-0">Open the forge →</span>
          </Link>
        )}

        {(data?.lockedUnscrubbed ?? 0) > 0 && (
          <Link
            href="/admin/outbound/leads?dnc=unchecked"
            className="flex items-center gap-2.5 mb-5 px-4 py-3 rounded-2xl border-2 border-[#a03123]/50 bg-[#a03123]/[0.06] hover:border-[#a03123] transition-colors"
          >
            <span className="text-lg" aria-hidden>🔒</span>
            <span className="font-sans text-sm text-[#1a1815]/80">
              <strong className="font-oswald text-base text-[#a03123]">{data?.lockedUnscrubbed}</strong> leads are locked away from Mr. Mustard until they are DNC-scrubbed.
            </span>
            <span className="ml-auto font-oswald uppercase tracking-[0.1em] text-xs font-semibold text-[#a03123]">Scrub them →</span>
          </Link>
        )}

        {error && (
          <div className={`${card} p-5 mb-6 border-[#a03123] shadow-[5px_5px_0_0_#a03123]`}>
            <p className="font-sans text-sm text-[#a03123] font-medium">{error}</p>
            <p className="font-sans text-xs text-[#1a1815]/55 mt-1">
              If this is the first run, the outbound tables may not exist yet. Apply supabase/migrations/035_outbound.sql, then refresh.
            </p>
          </div>
        )}

        {/* Rep goal cards */}
        <section className="grid md:grid-cols-2 gap-5 mb-8">
          {(data?.reps ?? (loading ? [null, null] : [])).map((rep, i) => {
            if (!rep) {
              return <div key={i} className={`${card} p-6 h-56 animate-pulse`} />;
            }
            const today = data?.today[rep.id] ?? ZERO;
            const bothMet = today.dials >= rep.daily_dial_goal && today.demos_booked >= rep.daily_demo_goal;
            const pres = presence.find((p) => p.id === rep.id);
            const isMe = meId ? meId === rep.id : false;
            const online = pres?.online ?? false;
            return (
              <div
                key={rep.id}
                className={`${card} p-6 relative overflow-hidden transition-shadow ${
                  isMe
                    ? 'border-[#b58a2a] shadow-[6px_6px_0_0_#b58a2a]'
                    : bothMet
                      ? 'border-[#3f5d34] shadow-[5px_5px_0_0_#3f5d34]'
                      : ''
                }`}
              >
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {bothMet && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#3f5d34] text-[#f7f3e9] border-2 border-[#1a1815] text-[10px] uppercase tracking-[0.18em] font-oswald font-semibold">
                      Goals hit
                    </span>
                  )}
                  {isMe && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#b58a2a] text-[#1a1815] border-2 border-[#1a1815] text-[10px] uppercase tracking-[0.18em] font-oswald font-bold">
                      You
                    </span>
                  )}
                </div>
                <span className={eyebrow}>{rep.role === 'player-coach' ? 'Player coach' : rep.role === 'caller' ? 'Caller' : 'Primary rep'}</span>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 border border-[#1a1815]/30 ${online ? 'bg-[#3f5d34] animate-pulse' : 'bg-[#1a1815]/20'}`}
                    title={online ? 'Online now' : pres?.last_seen_at ? `Last seen ${timeAgo(pres.last_seen_at)}` : 'Offline'}
                    aria-hidden
                  />
                  <h2 className="font-oswald font-semibold uppercase text-3xl text-[#1a1815] tracking-tight">{rep.name}</h2>
                </div>

                {/* What this caller is doing right now */}
                <div className="mt-2 min-h-[1.25rem]">
                  {pres?.current_lead ? (
                    <Link
                      href={`/admin/outbound/call/${pres.current_lead.id}`}
                      className="inline-flex items-center gap-1.5 font-sans text-[13px] text-[#1a1815]/70 hover:text-[#b58a2a] transition-colors"
                    >
                      <span className="text-[#a03123]">●</span> On now: <span className="font-semibold">{pres.current_lead.business_name}</span> →
                    </Link>
                  ) : online ? (
                    <span className="font-sans text-[13px] text-[#1a1815]/45">On the floor, between calls</span>
                  ) : pres?.last_seen_at ? (
                    <span className="font-sans text-[13px] text-[#1a1815]/40">Last active {timeAgo(pres.last_seen_at)}</span>
                  ) : (
                    <span className="font-sans text-[13px] text-[#1a1815]/30">Not on the floor yet today</span>
                  )}
                </div>

                {/* Batch progress: where they are in their frozen stack */}
                {pres?.batch && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-[0.18em] font-oswald font-medium text-[#1a1815]/50">Batch progress</span>
                      <span className="font-oswald text-xs text-[#1a1815]/70">{pres.batch.cursor} / {pres.batch.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#1a1815]/[0.08] overflow-hidden">
                      <div
                        className="h-full bg-[#b58a2a] transition-all duration-700"
                        style={{ width: `${Math.round((pres.batch.cursor / pres.batch.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-around mt-4">
                  <GoalRing value={today.dials} goal={rep.daily_dial_goal} label="Dials today" />
                  <GoalRing value={today.demos_booked} goal={rep.daily_demo_goal} label="Demos today" size={96} />
                  <div className="hidden sm:flex flex-col items-center gap-1.5">
                    <span className="font-oswald font-semibold text-4xl text-[#1a1815] leading-none">{today.conversations}</span>
                    <span className="text-[10px] uppercase tracking-[0.22em] font-oswald font-medium text-[#1a1815]/55">Convos</span>
                  </div>
                </div>

                {/* My own card gets an inline resume shortcut */}
                {isMe && resume && (
                  <button
                    onClick={pickUpWhereLeftOff}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-[#1a1815] text-[#b58a2a] border-2 border-[#1a1815] rounded-xl px-4 py-2.5 font-oswald font-semibold uppercase tracking-[0.08em] text-sm shadow-[3px_3px_0_0_#b58a2a] hover:-translate-y-0.5 transition-all"
                  >
                    ⏱ Pick up where you left off · {resume.position}/{resume.total}
                  </button>
                )}
              </div>
            );
          })}
          {!loading && data && data.reps.length === 0 && (
            <div className={`${card} p-6 md:col-span-2`}>
              <p className="font-sans text-sm text-[#1a1815]/70">No reps found. The migration seeds Polly and Sarah; apply 035_outbound.sql to get rolling.</p>
            </div>
          )}
        </section>

        <div className="grid lg:grid-cols-5 gap-5 items-start">
          {/* Today's queue */}
          <section className={`${card} p-0 lg:col-span-3 overflow-hidden`}>
            <div className="px-5 py-4 border-b-2 border-[#1a1815]/10 flex items-center justify-between">
              <div>
                <span className={eyebrow}>Today&apos;s queue</span>
                <h3 className="font-oswald font-semibold uppercase text-xl text-[#1a1815]">Due callbacks + fresh leads</h3>
              </div>
              <Link href="/admin/outbound/leads" className="font-sans text-xs font-semibold text-[#b58a2a] hover:text-[#1a1815] transition-colors">
                All leads →
              </Link>
            </div>
            {loading && <div className="p-5 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-[#1a1815]/[0.05] animate-pulse" />)}</div>}
            {!loading && (data?.queue.length ?? 0) === 0 && (
              <div className="p-8 text-center">
                <p className="font-oswald uppercase text-lg text-[#1a1815]/50">Queue clear</p>
                <p className="font-sans text-sm text-[#1a1815]/55 mt-1">
                  Nothing due. <Link href="/admin/outbound/leads" className="text-[#b58a2a] font-semibold">Import a fresh list</Link> and keep the streak alive.
                </p>
              </div>
            )}
            <ul className="divide-y divide-[#1a1815]/[0.08]">
              {(data?.queue ?? []).map((l, idx) => {
                const overdue = l.next_action_at && new Date(l.next_action_at).getTime() < Date.now();
                return (
                  <li key={l.id} className={`px-5 py-3.5 flex items-center gap-3 hover:bg-[#b58a2a]/[0.06] transition-colors ${l.reason === 'reading_now' ? 'bg-[#a03123]/[0.05]' : ''}`}>
                    <span className="font-oswald text-sm text-[#1a1815]/30 w-5 text-right shrink-0">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sans font-semibold text-sm text-[#1a1815] truncate">{l.business_name}</span>
                        <HeatChip reason={l.reason} lastOpenAt={l.last_open_at} auditScore={l.audit_score} />
                        <StatusChip status={l.status} />
                        {!l.dnc_checked && (
                          <span className="text-[9px] uppercase tracking-[0.14em] font-oswald font-semibold text-[#a03123] border border-[#a03123]/40 rounded-md px-1.5 py-0.5">
                            DNC unscrubbed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs font-sans text-[#1a1815]/55">
                        <span>{formatPhone(l.phone)}</span>
                        {l.city && <span>· {l.city}</span>}
                        <NicheChip niche={l.niche} />
                        {l.audit_score != null && l.reason !== 'worst_audit' && <span className="font-oswald">audit {l.audit_score}</span>}
                        {l.next_action_at && (l.status === 'callback' || l.status === 'contacted') && (
                          <span className={overdue ? 'text-[#a03123] font-semibold' : ''}>
                            {overdue ? 'Overdue' : 'Due'} {new Date(l.next_action_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' })} MT
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/admin/outbound/call/${l.id}`} className={`${btnPrimary} !px-3.5 !py-2 shrink-0`}>
                      Call now
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="lg:col-span-2 space-y-5">
            {/* Leaderboard */}
            <section className={`${card} p-5`}>
              <span className={eyebrow}>Team board</span>
              <h3 className="font-oswald font-semibold uppercase text-xl text-[#1a1815] mb-3">Today + this week</h3>
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.16em] font-oswald text-[#1a1815]/45">
                    <th className="text-left font-medium pb-2">Rep</th>
                    <th className="text-right font-medium pb-2">Dials</th>
                    <th className="text-right font-medium pb-2">Demos</th>
                    <th className="text-right font-medium pb-2">Wk dials</th>
                    <th className="text-right font-medium pb-2">Wk demos</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.reps ?? []).map((rep) => {
                    const t = data?.today[rep.id] ?? ZERO;
                    const w = data?.week[rep.id] ?? ZERO;
                    const leader =
                      (data?.reps ?? []).length > 1 &&
                      w.dials === Math.max(...(data?.reps ?? []).map((r) => (data?.week[r.id] ?? ZERO).dials)) &&
                      w.dials > 0;
                    return (
                      <tr key={rep.id} className="border-t border-[#1a1815]/[0.08]">
                        <td className="py-2.5 font-semibold text-[#1a1815]">
                          {rep.name} {leader && <span title="Leading the week">🌱</span>}
                        </td>
                        <td className="py-2.5 text-right font-oswald text-lg leading-none text-[#1a1815]">{t.dials}</td>
                        <td className="py-2.5 text-right font-oswald text-lg leading-none text-[#1a1815]">{t.demos_booked}</td>
                        <td className="py-2.5 text-right font-oswald text-lg leading-none text-[#1a1815]/60">{w.dials}</td>
                        <td className="py-2.5 text-right font-oswald text-lg leading-none text-[#1a1815]/60">{w.demos_booked}</td>
                      </tr>
                    );
                  })}
                  {(data?.reps ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-[#1a1815]/45 text-xs">No activity yet today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {/* Active pilots strip */}
            <section className="bg-[#1a1815] border-2 border-[#1a1815] rounded-2xl shadow-[5px_5px_0_0_#b58a2a] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] font-oswald font-semibold text-[#b58a2a]">Active pilots</span>
                  <p className="font-oswald font-semibold text-4xl text-[#f7f3e9] leading-tight">
                    {data?.pilots.running ?? 0} <span className="text-base text-[#f7f3e9]/50 uppercase">running</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-[0.22em] font-oswald text-[#f7f3e9]/50">Recovered so far</span>
                  <p className="font-oswald font-semibold text-3xl text-[#b58a2a] leading-tight tabular-nums">{fmtMoney(recovered)}</p>
                </div>
              </div>
              {(data?.pilots.endingSoon.length ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-[#f7f3e9]/15 space-y-1.5">
                  {data?.pilots.endingSoon.map((p) => (
                    <Link key={p.id} href="/admin/outbound/pilots" className="flex items-center justify-between text-sm font-sans text-[#f7f3e9]/85 hover:text-[#b58a2a] transition-colors">
                      <span className="truncate">{p.business_name}</span>
                      <span className="text-[10px] uppercase tracking-[0.14em] font-oswald font-semibold text-[#1a1815] bg-[#b58a2a] rounded-md px-2 py-0.5 ml-2 shrink-0">
                        Convert window
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/admin/outbound/pilots" className={`${btnGhost} w-full mt-4 !bg-transparent !text-[#f7f3e9] !border-[#f7f3e9]/40 !shadow-none hover:!border-[#b58a2a] hover:!text-[#b58a2a]`}>
                Pilot tracker →
              </Link>
            </section>
          </div>
        </div>
      </main>

      <Modal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        eyebrow="Call batch"
        title="Build a finishable stack"
        subtitle="A frozen, ordered slice of one rep's leads. Callbacks that are due come first, then never-touched leads, and inside each the businesses with no real website lead the way."
        headerTone="dark"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setBatchOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button onClick={() => void startBatch()} className={btnPrimary} disabled={!batchRepId || minting || (pickedRep?.ready ?? 0) === 0}>
              {minting ? 'Building…' : `Start ${Math.min(batchSize, pickedRep?.ready ?? batchSize)} calls`}
            </button>
          </div>
        }
      >
        <div>
          <span className={labelCls}>Whose leads</span>
          <div className="flex flex-wrap gap-1.5">
            {batchReps.map((r) => (
              <button
                key={r.id}
                onClick={() => setBatchRepId(r.id)}
                disabled={r.ready === 0}
                className={`px-3.5 py-2 rounded-lg border-2 font-oswald font-semibold uppercase tracking-[0.1em] text-xs transition-all disabled:opacity-35 disabled:pointer-events-none ${
                  batchRepId === r.id
                    ? 'bg-[#1a1815] text-[#b58a2a] border-[#1a1815]'
                    : 'bg-transparent text-[#1a1815]/55 border-[#1a1815]/25 hover:border-[#1a1815]'
                }`}
              >
                {r.name} <span className="opacity-60">· {r.ready}</span>
              </button>
            ))}
            {!batchReps.length && <span className="font-sans text-sm text-[#1a1815]/45">Loading reps…</span>}
          </div>
        </div>

        <div className="mt-4">
          <span className={labelCls}>How many</span>
          <div className="flex flex-wrap gap-1.5">
            {[10, 25, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => setBatchSize(n)}
                className={`px-3.5 py-2 rounded-lg border-2 font-oswald font-semibold uppercase tracking-[0.1em] text-xs transition-all ${
                  batchSize === n
                    ? 'bg-[#3f5d34] text-[#f7f3e9] border-[#1a1815]'
                    : 'bg-transparent text-[#1a1815]/55 border-[#1a1815]/25 hover:border-[#1a1815]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {pickedRep && (
          <p className="mt-4 font-sans text-[13px] leading-relaxed text-[#1a1815]/60">
            {pickedRep.ready === 0 ? (
              <>
                <strong className="text-[#a03123]">{pickedRep.name} has nothing workable right now.</strong> Every lead is either
                worked, or its callback is not due yet.
              </>
            ) : (
              <>
                <strong className="text-[#1a1815]">{pickedRep.name}</strong> has{' '}
                <strong className="text-[#1a1815]">{pickedRep.ready}</strong> workable leads. This takes the next{' '}
                <strong className="text-[#1a1815]">{Math.min(batchSize, pickedRep.ready)}</strong> and steps through them one at a
                time. Outcomes advance automatically, and the stack survives a refresh.
              </>
            )}
          </p>
        )}

        {batchErr && (
          <p className="mt-3 font-sans text-[13px] text-[#a03123] border-2 border-[#a03123]/30 rounded-xl px-3 py-2">{batchErr}</p>
        )}
      </Modal>
    </div>
  );
}
