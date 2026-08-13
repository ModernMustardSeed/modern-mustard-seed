'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Badge, Bar, Button, Card, Empty, Stat, ago, money, pct } from './ui';

/**
 * THE FACTORY CONTROL CENTRE.
 *
 * One screen for one Factory: is it healthy, what is it allowed to do, what has
 * it produced, where is it failing, what does it cost, and the switches to stop
 * it. The activation checklist sits above the results on purpose. A Factory
 * that has not passed it has no results worth reading, and burying the reason
 * it cannot go live under a funnel chart is how a launch stalls for a week.
 */

type Check = { key: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string; blocker: boolean };
type Preflight = { ok: boolean; checks: Check[]; scores: Record<string, number>; overall: number; at: string };
type Health = { overall: number; band: string; dimensions: Record<string, { score: number; note: string }>; reasons: string[]; at: string };
type Stage = { key: string; label: string; count: number; rateFromPrevious: number | null };
type Bottleneck = { stage: string; label: string; rate: number; benchmark: number; verdict: string; recommendation: string } | null;
type LimitState = { metric: string; limitKey: string | null; limit: number | null; used: number; remaining: number | null; pct: number | null; exceeded: boolean };
type HotRow = { id: string; company: string; contact_name: string | null; score: number; heat: number; reasons: string[] };
type Version = { id: string; version: number; status: string; summary: string | null; by: string | null; at: string };
type TestStep = { step: string; ok: boolean; detail: string };
type SimResult = { key: string; name: string; critical: boolean; passed: boolean; score: number; reason: string; reply: string };

type Payload = {
  factory: {
    id: string; name: string; status: string; mode: string; autonomy: string; template_key: string | null;
    sourcing_paused: boolean; outreach_paused: boolean; ai_paused: boolean; followup_paused: boolean;
    pause_reason: string | null; activated_at: string | null;
  };
  tenant: { id: string; name: string; kind: string; plan_code: string | null; mrr_cents: number | null; client_email: string | null } | null;
  plan: { code: string; name: string; managed: boolean } | null;
  blueprint: Record<string, unknown> | null;
  blueprintMeta: { id: string; version: number; status: string; changeSummary: string | null; createdBy: string | null; createdAt: string } | null;
  blueprintValid: boolean;
  history: Version[];
  preflight: Preflight | null;
  health: Health;
  reservoir: Record<string, number> & { total: number };
  hot: HotRow[];
  summary: { funnel: { stages: Stage[] }; bottleneck: Bottleneck; pipelineCents: number; closedCents: number; costCents: number; roi: number | null; timeToValue: Record<string, number | null> } | null;
  pipeline: { stage: string; count: number; valueCents: number }[] | null;
  segments: { key: string; label: string; sample: number; engaged: number; won: number; engagementRate: number; winRate: number | null }[] | null;
  findMoreLike: { criteria: string[]; evidence: string } | null;
  complexity: { level: string; drivers: string[]; estimatedMinutes: number } | null;
  productization: { reusablePct: number; fromTemplate: number; fromModules: number; fromConfiguration: number; custom: number; note: string } | null;
  usage: { byMetric: Record<string, { quantity: number; costCents: number }>; totalCostCents: number; margin: { revenueCents: number; costCents: number; grossCents: number; grossPct: number | null } };
  limits: LimitState[];
  queues: { lane: string; queued: number; running: number; failed: number; oldestSeconds: number | null }[];
  events: { id: string; action: string; actor: string | null; severity: string; occurred_at: string; meta: Record<string, unknown> }[];
};

export default function FactoryControlCenter({ factoryId }: { factoryId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testSteps, setTestSteps] = useState<TestStep[] | null>(null);
  const [sim, setSim] = useState<{ score: number; results: SimResult[]; failures: string[]; disclaimer: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/factories/${factoryId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not load this Factory.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this Factory.');
    }
  }, [factoryId]);

  useEffect(() => { void load(); }, [load]);

  const act = useCallback(
    async (action: string, body: Record<string, unknown> = {}) => {
      setBusy(action);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch(`/api/admin/factories/${factoryId}/lifecycle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...body }),
        });
        const json = await res.json();
        if (action === 'test_run') setTestSteps(json.steps ?? []);
        if (action === 'simulate' && res.ok) setSim(json);
        if (!res.ok) {
          setError([json.error, ...(json.blockers ?? [])].filter(Boolean).join(' '));
        } else if (action === 'deploy') {
          setNotice(`Deployed. ${(json.changes ?? []).join(' ')}`);
        } else if (action === 'activate') {
          setNotice('Activated. This Factory is live and can contact real prospects.');
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not work.');
      } finally {
        setBusy(null);
      }
    },
    [factoryId, load],
  );

  const control = useCallback(
    async (name: string, paused: boolean) => {
      setBusy(name);
      await fetch(`/api/admin/factories/${factoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ control: name, paused }),
      });
      await load();
      setBusy(null);
    },
    [factoryId, load],
  );

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#FBF6EA]">
        <AdminHeader active="factories" title="Client Factory" />
        <main className="max-w-7xl mx-auto px-5 py-10"><Empty>{error}</Empty></main>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-[#FBF6EA]">
        <AdminHeader active="factories" title="Client Factory" />
        <main className="max-w-7xl mx-auto px-5 py-10"><Empty>Loading.</Empty></main>
      </div>
    );
  }

  const f = data.factory;
  const blockers = (data.preflight?.checks ?? []).filter((c) => c.status === 'fail' && c.blocker);
  const warnings = (data.preflight?.checks ?? []).filter((c) => c.status === 'warn' || (c.status === 'fail' && !c.blocker));
  const passes = (data.preflight?.checks ?? []).filter((c) => c.status === 'pass');
  const switches: [string, boolean][] = [
    ['sourcing', f.sourcing_paused],
    ['outreach', f.outreach_paused],
    ['ai', f.ai_paused],
    ['followup', f.followup_paused],
  ];

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="factories" title={f.name} onRefresh={() => void load()} />

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-6 space-y-5">
        {error && <div className="border-2 border-[#E0301E] bg-[#E0301E]/[0.06] rounded-xl px-4 py-3 text-sm text-[#E0301E]">{error}</div>}
        {notice && <div className="border-2 border-emerald-800 bg-emerald-50 rounded-xl px-4 py-3 text-sm text-emerald-900">{notice}</div>}

        {/* ── status and controls ── */}
        <Card
          title="Status"
          right={
            <div className="flex items-center gap-1.5">
              <Badge tone={f.status}>{f.status}</Badge>
              <Badge tone={f.mode === 'test' ? 'test' : 'live'}>{f.mode} mode</Badge>
              <Badge>{f.autonomy}</Badge>
            </div>
          }
        >
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <Stat label="Health" value={data.health.overall} tone={data.health.overall < 45 ? 'bad' : data.health.overall < 70 ? 'warn' : 'good'} sub={data.health.band} />
            <Stat label="Setup score" value={data.preflight ? `${data.preflight.overall}%` : 'no blueprint'} tone={data.preflight?.ok ? 'good' : 'warn'} />
            <Stat label="Customer" value={data.tenant?.name ?? 'unknown'} sub={data.plan?.name ?? 'no plan'} />
            <Stat label="Activated" value={f.activated_at ? ago(f.activated_at) : 'not yet'} />
          </div>

          {data.health.reasons.length > 0 && (
            <ul className="mb-4 space-y-1">
              {data.health.reasons.map((r) => (
                <li key={r} className="text-sm text-[#161616]/75 flex gap-2"><span className="text-[#E0301E]">•</span>{r}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              tone={f.status === 'paused' ? 'primary' : 'danger'}
              onClick={() => void control('factory', f.status !== 'paused')}
              disabled={busy !== null}
            >
              {f.status === 'paused' ? 'Resume Factory' : 'Pause Factory'}
            </Button>
            {switches.map(([name, paused]) => (
              <Button key={name} onClick={() => void control(name, !paused)} disabled={busy !== null}>
                {paused ? `Resume ${name}` : `Pause ${name}`}
              </Button>
            ))}
          </div>
          {f.pause_reason && <p className="text-xs text-[#E0301E] mt-2">{f.pause_reason}</p>}
        </Card>

        {/* ── the activation checklist ── */}
        <Card
          title="Activation checklist"
          right={
            <div className="flex items-center gap-2">
              <Button onClick={() => void act('deploy')} disabled={busy !== null || !data.blueprintValid}>
                {busy === 'deploy' ? 'Deploying…' : 'Deploy blueprint'}
              </Button>
              <Button onClick={() => void act('test_run')} disabled={busy !== null || f.mode !== 'test'}>
                {busy === 'test_run' ? 'Running…' : 'Test run'}
              </Button>
              <Button onClick={() => void act('simulate')} disabled={busy !== null}>
                {busy === 'simulate' ? 'Simulating…' : 'Simulate agent'}
              </Button>
              <Button tone="primary" onClick={() => void act('activate')} disabled={busy !== null || !data.preflight?.ok}>
                {busy === 'activate' ? 'Activating…' : 'Activate'}
              </Button>
            </div>
          }
        >
          {!data.blueprintValid && (
            <p className="text-sm text-[#E0301E] mb-3">This Factory has no valid blueprint. Forge one or fix the configuration before anything else.</p>
          )}

          {data.preflight && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                {Object.entries(data.preflight.scores).map(([area, score]) => (
                  <div key={area}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#161616]/50">{area}</span>
                      <span className="font-mono text-[10px] font-bold tabular-nums">{score}%</span>
                    </div>
                    <Bar pct={score} tone={score === 100 ? 'good' : score >= 60 ? 'warn' : 'bad'} />
                  </div>
                ))}
              </div>

              {blockers.length > 0 && (
                <div className="mb-3">
                  <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#E0301E] mb-1.5">Blocking activation</h3>
                  <ul className="space-y-1.5">
                    {blockers.map((c) => (
                      <li key={c.key} className="text-sm text-[#161616]/85 flex gap-2">
                        <Badge tone="fail">fail</Badge>
                        <span><strong>{c.label}.</strong> {c.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {warnings.length > 0 && (
                <details className="mb-3">
                  <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.2em] text-amber-700">{warnings.length} warnings</summary>
                  <ul className="space-y-1.5 mt-2">
                    {warnings.map((c) => (
                      <li key={c.key} className="text-sm text-[#161616]/70 flex gap-2">
                        <Badge tone="warn">warn</Badge>
                        <span><strong>{c.label}.</strong> {c.detail}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <details>
                <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-700">{passes.length} passing</summary>
                <ul className="space-y-1 mt-2">
                  {passes.map((c) => (
                    <li key={c.key} className="text-xs text-[#161616]/55">{c.label}: {c.detail}</li>
                  ))}
                </ul>
              </details>
            </>
          )}

          {testSteps && (
            <div className="mt-4 border-t-2 border-[#161616]/10 pt-3">
              <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-1.5">Test run</h3>
              <ul className="space-y-1">
                {testSteps.map((s) => (
                  <li key={s.step} className="text-sm flex gap-2">
                    <Badge tone={s.ok ? 'pass' : 'fail'}>{s.ok ? 'ok' : 'fail'}</Badge>
                    <span className="text-[#161616]/80"><strong>{s.step}.</strong> {s.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sim && (
            <div className="mt-4 border-t-2 border-[#161616]/10 pt-3">
              <div className="flex items-center gap-3 mb-2">
                <Stat label="AI sales readiness" value={`${sim.score}/100`} tone={sim.score < 70 ? 'bad' : sim.score < 85 ? 'warn' : 'good'} />
                <p className="text-xs text-[#161616]/50 flex-1">{sim.disclaimer}</p>
              </div>
              <ul className="space-y-1.5">
                {sim.results.map((r) => (
                  <li key={r.key} className="text-sm flex gap-2">
                    <Badge tone={r.passed ? 'pass' : r.critical ? 'fail' : 'warn'}>{r.passed ? 'pass' : r.critical ? 'critical' : 'fail'}</Badge>
                    <span className="text-[#161616]/80"><strong>{r.name}.</strong> {r.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* ── results ── */}
        {data.summary && (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Funnel" className="lg:col-span-2">
              <div className="space-y-2">
                {data.summary.funnel.stages.map((s) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[#161616]/55">{s.label}</span>
                    <span className="w-14 shrink-0 font-sans font-bold tabular-nums text-[#161616]">{s.count}</span>
                    <div className="flex-1"><Bar pct={data.summary!.funnel.stages[0].count ? (s.count / data.summary!.funnel.stages[0].count) * 100 : 0} /></div>
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] tabular-nums text-[#161616]/50">
                      {s.rateFromPrevious === null ? '' : `${s.rateFromPrevious.toFixed(1)}%`}
                    </span>
                  </div>
                ))}
              </div>
              {data.summary.bottleneck && (
                <div className="mt-4 border-2 border-[#161616] bg-[#F5B700]/25 rounded-lg p-3">
                  <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/70">Primary bottleneck</h3>
                  <p className="font-sans font-bold text-[#161616] mt-0.5">{data.summary.bottleneck.label}</p>
                  <p className="text-sm text-[#161616]/75">{data.summary.bottleneck.verdict}</p>
                  <p className="text-sm text-[#161616]/85 mt-1">{data.summary.bottleneck.recommendation}</p>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card title="Money">
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Pipeline" value={money(data.summary.pipelineCents)} />
                  <Stat label="Closed" value={money(data.summary.closedCents)} />
                  <Stat label="Factory cost" value={money(data.summary.costCents, 2)} />
                  <Stat label="ROI" value={pct(data.summary.roi)} tone={data.summary.roi === null ? 'muted' : data.summary.roi > 0 ? 'good' : 'bad'} />
                </div>
                {data.tenant?.kind !== 'internal' && (
                  <div className="mt-3 pt-3 border-t border-[#161616]/10 grid grid-cols-2 gap-4">
                    <Stat label="They pay" value={money(data.usage.margin.revenueCents)} sub="per month" />
                    <Stat
                      label="Our margin"
                      value={pct(data.usage.margin.grossPct)}
                      tone={data.usage.margin.grossPct === null ? 'muted' : data.usage.margin.grossPct < 40 ? 'bad' : 'good'}
                    />
                  </div>
                )}
              </Card>

              <Card title="Time to value">
                <div className="space-y-1">
                  {Object.entries(data.summary.timeToValue).map(([label, days]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-[#161616]/60">{label}</span>
                      <span className="font-mono tabular-nums text-[#161616]">{days === null ? 'not yet' : `${days}d`}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── reservoir, hot, limits ── */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card title="Prospect reservoir">
            <Stat label="Total" value={data.reservoir.total} />
            <div className="mt-3 space-y-1">
              {Object.entries(data.reservoir)
                .filter(([k, v]) => k !== 'total' && v > 0)
                .map(([state, count]) => (
                  <div key={state} className="flex justify-between text-sm">
                    <span className="text-[#161616]/60">{state}</span>
                    <span className="font-mono tabular-nums">{count}</span>
                  </div>
                ))}
            </div>
          </Card>

          <Card title="Hot right now" className="lg:col-span-2">
            {data.hot.length ? (
              <ul className="space-y-2">
                {data.hot.map((h) => (
                  <li key={h.id} className="flex items-start justify-between gap-3 border-b border-[#161616]/8 pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="font-sans font-semibold text-sm text-[#161616] truncate">{h.company}</p>
                      <p className="text-xs text-[#161616]/55">{h.reasons.join(' · ')}</p>
                    </div>
                    <span className="font-sans font-bold tabular-nums text-[#161616] shrink-0">{h.heat}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nothing showing buying intent yet.</Empty>
            )}
          </Card>
        </div>

        {/* ── usage against plan ── */}
        <Card title="Usage against plan">
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.limits.map((l) => (
              <div key={l.metric}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#161616]/50">{l.limitKey ?? l.metric}</span>
                  <span className="font-mono text-[10px] tabular-nums">{l.used}{l.limit === null ? '' : ` / ${l.limit}`}</span>
                </div>
                <Bar pct={l.pct ?? 0} tone={l.exceeded ? 'bad' : (l.pct ?? 0) > 80 ? 'warn' : 'good'} />
              </div>
            ))}
          </div>
        </Card>

        {/* ── learning ── */}
        {data.segments && data.segments.length > 0 && (
          <Card title="Winning segments" right={<span className="font-mono text-[9px] text-[#161616]/40">30 prospect minimum for a rate</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-mono text-[9px] uppercase tracking-[0.16em] text-[#161616]/45">
                    <th className="pb-2">Segment</th><th className="pb-2">Sample</th><th className="pb-2">Engaged</th><th className="pb-2">Won</th><th className="pb-2">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.segments.slice(0, 10).map((s) => (
                    <tr key={s.key} className="border-t border-[#161616]/8">
                      <td className="py-1.5 text-[#161616]">{s.label}</td>
                      <td className="py-1.5 font-mono tabular-nums text-[#161616]/70">{s.sample}</td>
                      <td className="py-1.5 font-mono tabular-nums text-[#161616]/70">{s.engaged}</td>
                      <td className="py-1.5 font-mono tabular-nums text-[#161616]/70">{s.won}</td>
                      <td className="py-1.5 font-mono tabular-nums text-[#161616]/70">{s.winRate === null ? 'sample too small' : `${s.winRate.toFixed(1)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.findMoreLike && (
              <div className="mt-3 border-2 border-[#161616] bg-[#F5B700]/25 rounded-lg p-3">
                <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/70">Find more like these</h3>
                <p className="text-sm text-[#161616]/85 mt-0.5">{data.findMoreLike.criteria.join(' · ')}</p>
                <p className="text-xs text-[#161616]/55 mt-1">{data.findMoreLike.evidence}</p>
              </div>
            )}
          </Card>
        )}

        {/* ── configuration ── */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Blueprint versions" right={data.blueprintMeta ? <Badge tone={data.blueprintMeta.status}>v{data.blueprintMeta.version} {data.blueprintMeta.status}</Badge> : null}>
            {data.history.length ? (
              <ul className="space-y-2">
                {data.history.slice(0, 10).map((v) => (
                  <li key={v.id} className="flex items-start justify-between gap-3 text-sm border-b border-[#161616]/8 pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="text-[#161616]"><strong>v{v.version}</strong> {v.summary ?? 'No summary.'}</p>
                      <p className="text-xs text-[#161616]/45">{v.by ?? 'system'} · {ago(v.at)}</p>
                    </div>
                    <Badge tone={v.status}>{v.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No blueprint versions yet.</Empty>
            )}
          </Card>

          <Card title="Productization">
            {data.productization ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <Stat label="Reusable" value={`${data.productization.reusablePct}%`} tone={data.productization.reusablePct >= 90 ? 'good' : 'warn'} />
                  <Stat label="Custom pieces" value={data.productization.custom} tone={data.productization.custom ? 'warn' : 'good'} />
                </div>
                <p className="text-sm text-[#161616]/70">{data.productization.note}</p>
                {data.complexity && (
                  <p className="text-xs text-[#161616]/50 mt-2">
                    {data.complexity.level} deployment, about {data.complexity.estimatedMinutes} human minutes estimated. {data.complexity.drivers.join(' ')}
                  </p>
                )}
              </>
            ) : (
              <Empty>Needs a valid blueprint.</Empty>
            )}
          </Card>
        </div>

        {/* ── audit ── */}
        <Card title="Audit log">
          {data.events.length ? (
            <ul className="space-y-1">
              {data.events.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-xs border-b border-[#161616]/6 pb-1 last:border-0">
                  {e.severity !== 'info' && <Badge tone={e.severity === 'critical' ? 'fail' : 'warn'}>{e.severity}</Badge>}
                  <span className="font-mono text-[#161616]/70">{e.action}</span>
                  <span className="text-[#161616]/45">{e.actor ?? 'system'}</span>
                  <span className="ml-auto text-[#161616]/35">{ago(e.occurred_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing recorded yet.</Empty>
          )}
        </Card>
      </main>
    </div>
  );
}
