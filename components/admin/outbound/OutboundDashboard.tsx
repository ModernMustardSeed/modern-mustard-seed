'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { formatPhone, fmtMoney } from '@/lib/outbound';
import type { HeatReason, Rep } from '@/lib/outbound';
import { GoalRing, OutboundNav, StatusChip, NicheChip, HeatChip, useCountUp, api, card, btnPrimary, btnGhost, eyebrow, setDialSession } from '@/components/admin/outbound/ui';

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
type Overview = {
  reps: Rep[];
  today: Record<string, Stat>;
  week: Record<string, Stat>;
  queue: QueueLead[];
  lockedUnscrubbed: number;
  pilots: { running: number; totalRecovered: number; endingSoon: { id: string; ends_at: string; business_name: string }[] };
  day: string;
};

const ZERO: Stat = { dials: 0, conversations: 0, demos_booked: 0 };

export default function OutboundDashboard() {
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

  const startSession = () => {
    const first = data?.queue[0];
    if (!first) return;
    setDialSession({ startedAt: Date.now(), dials: 0, demos: 0 });
    router.push(`/admin/outbound/call/${first.id}`);
  };

  const recovered = useCountUp(data?.pilots.totalRecovered ?? 0, 900);

  return (
    <div className="min-h-screen bg-[#f7f3e9]">
      <AdminHeader active="outbound" title="Outbound" onRefresh={() => void load()} />
      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        <OutboundNav
          active="dashboard"
          right={
            data?.queue[0] ? (
              <button onClick={startSession} className={btnPrimary}>
                ▶ Start session ({data.queue.length} hot)
              </button>
            ) : undefined
          }
        />

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
            return (
              <div key={rep.id} className={`${card} p-6 relative overflow-hidden ${bothMet ? 'border-[#3f5d34] shadow-[5px_5px_0_0_#3f5d34]' : ''}`}>
                {bothMet && (
                  <span className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-[#3f5d34] text-[#f7f3e9] border-2 border-[#1a1815] text-[10px] uppercase tracking-[0.18em] font-oswald font-semibold">
                    Goals hit
                  </span>
                )}
                <span className={eyebrow}>{rep.role === 'player-coach' ? 'Player coach' : 'Primary rep'}</span>
                <h2 className="font-oswald font-semibold uppercase text-3xl text-[#1a1815] tracking-tight mt-0.5">{rep.name}</h2>
                <div className="flex items-center justify-around mt-4">
                  <GoalRing value={today.dials} goal={rep.daily_dial_goal} label="Dials today" />
                  <GoalRing value={today.demos_booked} goal={rep.daily_demo_goal} label="Demos today" size={96} />
                  <div className="hidden sm:flex flex-col items-center gap-1.5">
                    <span className="font-oswald font-semibold text-4xl text-[#1a1815] leading-none">{today.conversations}</span>
                    <span className="text-[10px] uppercase tracking-[0.22em] font-oswald font-medium text-[#1a1815]/55">Convos</span>
                  </div>
                </div>
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
    </div>
  );
}
