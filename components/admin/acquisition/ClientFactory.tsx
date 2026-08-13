'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Section, Stat, Chip, api, card, cardFlat, btnPrimary, btnGhost, inputCls, labelCls, eyebrow, usd, pct } from '@/components/admin/acquisition/ui';

type Rate = { key: string; label: string; numerator: number; denominator: number; ratePct: number | null; thin: boolean };
type Forecast = { target: number; prospectsNeeded: number | null; emailsNeeded: number | null; permissionsNeeded: number | null; callsNeeded: number | null; forgesNeeded: number | null; low: number | null; high: number | null; basedOn: string; confident: boolean };
type Report = {
  campaign: { id: string; goal_clients: number; goal_revenue_cents: number; goal_horizon_months: number; monthly_client_target_min: number; monthly_client_target_stretch: number; status: string } | null;
  path: { goalRevenueCents: number; realizedRevenueCents: number; remainingCents: number; monthsElapsed: number; monthsRemaining: number; requiredMonthlyCents: number; currentMonthlyRunRateCents: number; arrRunRateCents: number; status: string; activeClients: number; newThisMonth: number; targetMin: number; targetStretch: number; activeMrrCents: number } | null;
  movement: { newCents: number; expansionCents: number; reactivationCents: number; contractionCents: number; churnCents: number; paymentLossCents: number; netNewCents: number; activeMrrCents: number; churnedClients: number; newClients: number; nrrPct: number | null; logoChurnPct: number | null };
  ladder: { clients: { value: number; reached: boolean; current: boolean }[]; mrr: { cents: number; reached: boolean; current: boolean }[] };
  bottleneck: { rates: Rate[]; primary: Rate | null; constraint: { id: string; label: string; detail: string; severity: string }; advice: string };
  reservoir: { total: number; byState: Record<string, number>; ready: number; targetReady: number; daysOfInventory: number | null; suppressed: number };
  forecasts: Forecast[];
  health: { stateLabel: string; worst: string; volume: { sent24h: number; allowance: number; ceiling: number } };
};

export default function ClientFactory() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editGoal, setEditGoal] = useState(false);

  const load = useCallback(async (background = false) => {
    try {
      setData(await api<Report>('/api/admin/acquisition/factory'));
      setError('');
    } catch (e) {
      if (!background) setError(e instanceof Error ? e.message : 'Could not load the Client Factory.');
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(t);
  }, [load]);

  const saveGoal = async (patch: Record<string, unknown>) => {
    try {
      await api('/api/admin/acquisition/factory', { method: 'POST', body: JSON.stringify(patch) });
      setNotice('Goal updated.');
      setEditGoal(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save.');
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FBF6EA]">
        <AdminHeader active="acquisition" title="Acquisition" />
        <main className="max-w-6xl mx-auto px-5 py-6">
          <AcqNav active="factory" />
          <p className="text-sm text-[#161616]/50">{error || 'Counting...'}</p>
        </main>
      </div>
    );
  }

  const m = data.movement;
  const p = data.path;
  const compounding = m.netNewCents > 0;

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[92rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav active="factory" />

        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        {/* ── the north star ── */}
        <section className={`${card} p-6 mb-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={eyebrow}>The north star, this month</p>
              <h1 className={`mt-1 font-oswald text-5xl md:text-6xl font-bold uppercase tracking-tight ${compounding ? 'text-[#3f5d34]' : m.netNewCents < 0 ? 'text-[#E0301E]' : 'text-[#161616]'}`}>
                {m.netNewCents >= 0 ? '+' : ''}
                {usd(m.netNewCents)}
              </h1>
              <p className="mt-1 font-oswald text-sm uppercase tracking-[0.18em] text-[#161616]/55">Net new MRR</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-0">
              <Stat label="Active MRR" value={usd(m.activeMrrCents)} tone="seed" big />
              <Stat label="ARR run rate" value={usd((p?.arrRunRateCents ?? 0))} />
              <Stat label="Active clients" value={p?.activeClients ?? 0} big />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-3">
            <Stat label="New" value={`+${usd(m.newCents)}`} tone="seed" sub={`${m.newClients} client${m.newClients === 1 ? '' : 's'}`} />
            <Stat label="Expansion" value={`+${usd(m.expansionCents)}`} tone="seed" />
            <Stat label="Reactivation" value={`+${usd(m.reactivationCents)}`} />
            <Stat label="Contraction" value={usd(m.contractionCents)} tone={m.contractionCents < 0 ? 'red' : 'ink'} />
            <Stat label="Churn" value={usd(m.churnCents)} tone={m.churnCents < 0 ? 'red' : 'ink'} sub={`${m.churnedClients} lost`} />
            <Stat label="Payment losses" value={usd(m.paymentLossCents)} tone={m.paymentLossCents < 0 ? 'red' : 'ink'} />
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-[#161616]/65">
            <span>Net revenue retention: <strong>{m.nrrPct != null ? `${m.nrrPct}%` : 'no base yet'}</strong></span>
            <span>Logo churn: <strong>{m.logoChurnPct != null ? `${m.logoChurnPct}%` : 'no base yet'}</strong></span>
            <span className="text-[#161616]/45">
              {compounding ? 'The company is compounding this month.' : m.netNewCents === 0 ? 'Nothing has moved this month yet.' : 'More left than arrived this month.'}
            </span>
          </div>
        </section>

        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6 mb-6">
          {/* ── the bottleneck ── */}
          <Section
            title="What is actually stopping us"
            note="Two different questions, kept apart on purpose. The rates say where prospects are being lost. The constraint says what is capping throughput."
          >
            <div
              className={`${cardFlat} p-4 mb-4 ${
                data.bottleneck.constraint.severity === 'blocking'
                  ? 'border-[#E0301E] bg-[#E0301E]/[0.06]'
                  : data.bottleneck.constraint.severity === 'tight'
                    ? 'border-[#F5B700] bg-[#F5B700]/10'
                    : ''
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.22em] font-oswald font-semibold text-[#161616]/50">Current constraint</p>
              <p className="mt-1 font-oswald text-xl font-bold uppercase tracking-tight">{data.bottleneck.constraint.label}</p>
              <p className="mt-1 text-[13px] text-[#161616]/70">{data.bottleneck.constraint.detail}</p>
            </div>

            <ul className="space-y-2">
              {data.bottleneck.rates.map((r) => {
                const worst = data.bottleneck.primary?.key === r.key;
                return (
                  <li key={r.key} className="flex items-center gap-3">
                    <span className="w-52 shrink-0 text-[12px] font-oswald uppercase tracking-[0.08em] text-[#161616]/70">{r.label}</span>
                    <span className="flex-1 h-3 rounded-full bg-[#161616]/10 overflow-hidden border border-[#161616]/10">
                      <span
                        className={`block h-full ${worst ? 'bg-[#E0301E]' : 'bg-[#F5B700]'}`}
                        style={{ width: `${Math.min(100, r.ratePct ?? 0)}%` }}
                      />
                    </span>
                    <span className={`w-16 text-right font-mono text-[12px] tabular-nums ${worst ? 'text-[#E0301E] font-bold' : 'text-[#161616]/65'}`}>
                      {pct(r.ratePct)}
                    </span>
                    <span className="w-24 text-right font-mono text-[11px] text-[#161616]/40">
                      {r.numerator}/{r.denominator}
                      {r.thin ? ' thin' : ''}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 rounded-lg border-2 border-[#161616] bg-[#F5B700]/25 px-3 py-2.5 text-[13px] font-semibold">
              {data.bottleneck.advice}
            </p>
          </Section>

          {/* ── path to the goal ── */}
          <Section
            title="Path to the goal"
            note="Realized revenue only. No proposals, no pipeline, no hypothetical upsells."
            right={
              <button className={btnGhost} onClick={() => setEditGoal((v) => !v)}>
                {editGoal ? 'Close' : 'Change the goal'}
              </button>
            }
          >
            {p && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Stat label="Goal" value={usd(p.goalRevenueCents)} sub={`over ${p.monthsElapsed + p.monthsRemaining} months`} />
                  <Stat label="Realized" value={usd(p.realizedRevenueCents)} tone="seed" big />
                  <Stat label="Remaining" value={usd(p.remainingCents)} />
                  <Stat label="Months left" value={p.monthsRemaining} />
                  <Stat label="Needed per month" value={usd(p.requiredMonthlyCents)} tone="mustard" />
                  <Stat
                    label="Running at"
                    value={usd(p.currentMonthlyRunRateCents)}
                    tone={p.status === 'ahead' ? 'seed' : p.status === 'below track' ? 'red' : 'ink'}
                    sub={p.status.toUpperCase()}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Stat label="New this month" value={p.newThisMonth} tone={p.newThisMonth >= p.targetMin ? 'seed' : 'ink'} />
                  <Stat label="Monthly minimum" value={p.targetMin} />
                  <Stat label="Stretch" value={p.targetStretch} />
                </div>
              </>
            )}

            {editGoal && data.campaign && (
              <div className={`${cardFlat} p-4 mt-4 grid sm:grid-cols-2 gap-3`}>
                <div>
                  <label className={labelCls}>Client milestone</label>
                  <select className={inputCls} defaultValue={data.campaign.goal_clients} onChange={(e) => void saveGoal({ goal_clients: Number(e.target.value) })}>
                    {[50, 100, 210, 500, 1000, 2500, 5000, data.campaign.goal_clients]
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .sort((a, b) => a - b)
                      .map((v) => (
                        <option key={v} value={v}>
                          {v.toLocaleString()} clients
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Revenue goal</label>
                  <select className={inputCls} defaultValue={data.campaign.goal_revenue_cents} onChange={(e) => void saveGoal({ goal_revenue_cents: Number(e.target.value) })}>
                    {[25_000_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000, 1_000_000_000].map((v) => (
                      <option key={v} value={v}>
                        {usd(v)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Horizon (months)</label>
                  <input className={inputCls} type="number" min={1} max={60} defaultValue={data.campaign.goal_horizon_months} onBlur={(e) => void saveGoal({ goal_horizon_months: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={labelCls}>Monthly minimum / stretch</label>
                  <div className="flex gap-2">
                    <input className={inputCls} type="number" min={1} defaultValue={data.campaign.monthly_client_target_min} onBlur={(e) => void saveGoal({ monthly_client_target_min: Number(e.target.value) })} />
                    <input className={inputCls} type="number" min={1} defaultValue={data.campaign.monthly_client_target_stretch} onBlur={(e) => void saveGoal({ monthly_client_target_stretch: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── the ladder ── */}
        <Section title="The ladder" note="Every rung is a milestone. None of them is a ceiling.">
          <div className="flex flex-wrap gap-2 mb-4">
            {data.ladder.clients.map((c) => (
              <span
                key={c.value}
                className={`px-3 py-2 rounded-xl border-2 font-oswald text-sm font-bold ${
                  c.reached
                    ? 'bg-[#3f5d34] text-white border-[#161616]'
                    : c.current
                      ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[3px_3px_0_0_#161616]'
                      : 'border-[#161616]/20 text-[#161616]/40'
                }`}
              >
                {c.value.toLocaleString()} clients
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.ladder.mrr.map((c) => (
              <span
                key={c.cents}
                className={`px-3 py-2 rounded-xl border-2 font-mono text-xs font-bold ${
                  c.reached
                    ? 'bg-[#3f5d34] text-white border-[#161616]'
                    : c.current
                      ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[3px_3px_0_0_#161616]'
                      : 'border-[#161616]/20 text-[#161616]/40'
                }`}
              >
                {usd(c.cents)} MRR
              </span>
            ))}
          </div>
        </Section>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          {/* ── the reservoir ── */}
          <Section
            title="The reservoir"
            note="Prospect inventory, not a campaign list. Sourcing replenishes toward the target and stops at the cap."
            right={
              <Link className={btnGhost} href="/admin/acquisition/lead-finder">
                Find more
              </Link>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="In the reservoir" value={data.reservoir.total.toLocaleString()} big />
              <Stat label="Ready to mail" value={data.reservoir.ready.toLocaleString()} tone="seed" big />
              <Stat label="Target ready" value={data.reservoir.targetReady.toLocaleString()} />
              <Stat
                label="Days of inventory"
                value={data.reservoir.daysOfInventory ?? '—'}
                tone={(data.reservoir.daysOfInventory ?? 0) < 3 ? 'red' : 'ink'}
                sub={`at ${data.health.volume.allowance}/day`}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Object.entries(data.reservoir.byState)
                .sort((a, b) => b[1] - a[1])
                .map(([state, n]) => (
                  <Chip key={state} label={`${state.replace(/_/g, ' ')} ${n.toLocaleString()}`} />
                ))}
            </div>
          </Section>

          {/* ── the forecast ── */}
          <Section title="What it would take" note="Computed from this campaign's own observed rates. Projection, not guarantee.">
            {data.forecasts.every((f) => f.prospectsNeeded === null) ? (
              <p className="text-sm text-[#161616]/55">{data.forecasts[0]?.basedOn ?? 'Not enough of the funnel has run yet.'}</p>
            ) : (
              <div className="space-y-3">
                {data.forecasts
                  .filter((f) => f.prospectsNeeded !== null)
                  .map((f) => (
                    <div key={f.target} className={`${cardFlat} p-4`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-oswald text-lg font-bold uppercase tracking-tight">{f.target} more clients</p>
                        <Chip label={f.confident ? 'good sample' : 'thin sample'} tone={f.confident ? 'good' : 'warn'} />
                      </div>
                      <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[13px]">
                        <Pair label="Emails" v={f.emailsNeeded} />
                        <Pair label="Permissions" v={f.permissionsNeeded} />
                        <Pair label="Calls" v={f.callsNeeded} />
                        <Pair label="Forges" v={f.forgesNeeded} />
                      </dl>
                      <p className="mt-2 text-[11px] font-mono text-[#161616]/50">
                        Range {f.low?.toLocaleString()} to {f.high?.toLocaleString()} emails. {f.basedOn}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </Section>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link className={btnPrimary} href="/admin/acquisition/command">
            Open the Command Center
          </Link>
          <Link className={btnGhost} href="/admin/acquisition/sender-health">
            Sender health: {data.health.stateLabel} ({data.health.volume.sent24h}/{data.health.volume.allowance} today)
          </Link>
        </div>
      </main>
    </div>
  );
}

function Pair({ label, v }: { label: string; v: number | null }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] font-oswald text-[#161616]/45">{label}</dt>
      <dd className="font-mono tabular-nums">{v?.toLocaleString() ?? '—'}</dd>
    </div>
  );
}
