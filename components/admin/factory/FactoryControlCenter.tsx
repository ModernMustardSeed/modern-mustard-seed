'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import FactoryIntegrations from './FactoryIntegrations';
import {
  Badge, Button, Card, Dial, Empty, Eyebrow, Meter, Notice, Page, PageTitle, Shell, Skeleton, Stat,
  ago, figure, money, num, pct, sentenceCase, toneForScore,
} from './ui';

/**
 * THE FACTORY CONTROL CENTRE.
 *
 * One screen for one Factory: is it healthy, what is it allowed to do, what
 * has it produced, where is it failing, what does it cost, and the switches to
 * stop it.
 *
 * The activation checklist sits above the results on purpose. A Factory that
 * has not passed it has no results worth reading, and burying the reason it
 * cannot go live under a funnel chart is how a launch stalls for a week.
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
        if (!res.ok) setError([json.error, ...(json.blockers ?? [])].filter(Boolean).join(' '));
        else if (action === 'deploy') setNotice(`Deployed. ${(json.changes ?? []).join(' ')}`.trim());
        else if (action === 'activate') setNotice('Activated. This Factory is live and can contact real prospects.');
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
      <Shell>
        <AdminHeader active="factories" title="Client Factory" />
        <Page><Card><Empty title="This Factory did not open">{error}</Empty></Card></Page>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <AdminHeader active="factories" title="Client Factory" />
        <Page><Card eyebrow="Working" title="Opening the Factory"><Skeleton rows={5} /></Card></Page>
      </Shell>
    );
  }

  const f = data.factory;
  const checks = data.preflight?.checks ?? [];
  const blockers = checks.filter((c) => c.status === 'fail' && c.blocker);
  const warnings = checks.filter((c) => c.status === 'warn' || (c.status === 'fail' && !c.blocker));
  const passes = checks.filter((c) => c.status === 'pass');
  const switches: { key: string; label: string; paused: boolean }[] = [
    { key: 'sourcing', label: 'Sourcing', paused: f.sourcing_paused },
    { key: 'outreach', label: 'Outreach', paused: f.outreach_paused },
    { key: 'ai', label: 'The AI', paused: f.ai_paused },
    { key: 'followup', label: 'Follow-up', paused: f.followup_paused },
  ];

  return (
    <Shell>
      <AdminHeader active="factories" title={f.name} onRefresh={() => void load()} />
      <Page>
        <PageTitle
          eyebrow={data.tenant?.name ?? 'Client Factory'}
          title={f.name}
          sub={
            f.status === 'live'
              ? 'Live. It is contacting real prospects right now.'
              : f.mode === 'test'
                ? 'In test mode. It can only ever touch a test record.'
                : `In ${f.status}.`
          }
          actions={
            <>
              <Badge tone={f.status}>{f.status}</Badge>
              <Badge tone={f.mode === 'test' ? 'test' : 'live'}>{f.mode} mode</Badge>
              <Badge tone="draft">{f.autonomy}</Badge>
            </>
          }
        />

        {error && <Notice kind="bad">{error}</Notice>}
        {notice && <Notice kind="good">{notice}</Notice>}
        {f.pause_reason && <Notice kind="warn">{f.pause_reason}</Notice>}

        {/* ── health and controls ── */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card eyebrow="Health" title="How it is doing">
            <div className="flex flex-wrap items-center gap-5">
              <Dial score={data.health.overall} label={data.health.band} />
              <div className="min-w-0 space-y-2.5">
                {Object.entries(data.health.dimensions).map(([key, dim]) => (
                  <div key={key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#5C5850]">{key}</span>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-[#161616]">{dim.score}</span>
                    </div>
                    <Meter pct={dim.score} tone={toneForScore(dim.score)} height="sm" />
                  </div>
                ))}
              </div>
            </div>
            {data.health.reasons.length > 0 && (
              <ul className="mt-4 pt-4 border-t-2 border-[#161616]/12 space-y-1.5">
                {data.health.reasons.map((r) => (
                  <li key={r} className="flex gap-2 font-body text-[14px] text-[#3A362D] leading-snug">
                    <span className="text-[#C4160B] font-bold shrink-0" aria-hidden>&rsaquo;</span>{r}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card eyebrow="Controls" title="Stop any part of it" className="lg:col-span-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Button
                  tone={f.status === 'paused' ? 'primary' : 'danger'}
                  onClick={() => void control('factory', f.status !== 'paused')}
                  disabled={busy !== null}
                  className="w-full"
                >
                  {f.status === 'paused' ? 'Resume the whole Factory' : 'Pause the whole Factory'}
                </Button>
              </div>
              {switches.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => void control(s.key, !s.paused)}
                  disabled={busy !== null}
                  className={`flex items-center justify-between gap-3 rounded-lg border-2 border-[#161616] px-3.5 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/40 disabled:cursor-not-allowed ${
                    s.paused ? 'bg-[#FBE3E1]' : 'bg-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#161616]'
                  }`}
                >
                  <span>
                    <span className="block font-sans text-[13px] font-bold text-[#161616]">{s.label}</span>
                    <span className={`block font-mono text-[10px] uppercase tracking-[0.14em] ${s.paused ? 'text-[#8E1007]' : 'text-[#5C5850]'}`}>
                      {s.paused ? 'paused' : 'running'}
                    </span>
                  </span>
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${s.paused ? 'text-[#8E1007]' : 'text-[#3A362D]'}`}>
                    {s.paused ? 'Resume' : 'Pause'}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t-2 border-[#161616]/12 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Setup score" value={data.preflight ? `${data.preflight.overall}%` : 'n/a'} size="sm" tone={data.preflight?.ok ? 'good' : 'warn'} />
              <Stat label="Plan" value={data.plan?.name ?? 'None'} size="sm" />
              <Stat label="Blueprint" value={data.blueprintMeta ? `v${data.blueprintMeta.version}` : 'none'} size="sm" sub={data.blueprintMeta?.status} />
              <Stat label="Activated" value={f.activated_at ? ago(f.activated_at) : 'Not yet'} size="sm" />
            </div>
          </Card>
        </div>

        {/* ── activation checklist ── */}
        <Card
          eyebrow="Before it can go live"
          title="Activation checklist"
          right={
            <>
              <Button size="sm" onClick={() => void act('deploy')} disabled={busy !== null || !data.blueprintValid} title={!data.blueprintValid ? 'Needs a valid blueprint first' : undefined}>
                {busy === 'deploy' ? 'Deploying' : 'Deploy blueprint'}
              </Button>
              <Button size="sm" onClick={() => void act('test_run')} disabled={busy !== null || f.mode !== 'test'} title={f.mode !== 'test' ? 'Switch to test mode to run a test' : undefined}>
                {busy === 'test_run' ? 'Running' : 'Test run'}
              </Button>
              <Button size="sm" onClick={() => void act('simulate')} disabled={busy !== null}>
                {busy === 'simulate' ? 'Simulating' : 'Simulate agent'}
              </Button>
              <Button
                size="sm"
                tone="primary"
                onClick={() => void act('activate')}
                disabled={busy !== null || !data.preflight?.ok}
                title={data.preflight?.ok ? undefined : `${blockers.length} blocker${blockers.length === 1 ? '' : 's'} still open`}
              >
                {busy === 'activate' ? 'Activating' : 'Activate'}
              </Button>
            </>
          }
        >
          {!data.blueprintValid && (
            <div className="mb-4"><Notice kind="bad">This Factory has no valid blueprint. Forge one or fix the configuration before anything else.</Notice></div>
          )}

          {data.preflight && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
                {Object.entries(data.preflight.scores).map(([area, score]) => (
                  <div key={area}>
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#5C5850] truncate">{area}</span>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-[#161616]">{score}%</span>
                    </div>
                    <Meter pct={score} tone={score === 100 ? 'good' : score >= 60 ? 'warn' : 'bad'} height="sm" />
                  </div>
                ))}
              </div>

              {blockers.length > 0 && (
                <div className="rounded-xl border-2 border-[#8E1007] bg-[#FBE3E1] p-4 mb-4">
                  <Eyebrow>Blocking activation</Eyebrow>
                  <ul className="mt-2 space-y-2.5">
                    {blockers.map((c) => (
                      <li key={c.key} className="flex flex-wrap items-start gap-2">
                        <Badge tone="fail">fix</Badge>
                        <span className="font-body text-[14px] text-[#161616] leading-snug flex-1 min-w-[14rem]">
                          <strong className="font-bold">{c.label}.</strong> {c.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {warnings.length > 0 && (
                <details className="mb-3 rounded-xl border-2 border-[#6B4400] bg-[#FFE9B8] px-4 py-3">
                  <summary className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B4400]">
                    {warnings.length} warning{warnings.length === 1 ? '' : 's'}, not blocking
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {warnings.map((c) => (
                      <li key={c.key} className="font-body text-[14px] text-[#161616] leading-snug">
                        <strong className="font-bold">{c.label}.</strong> {c.detail}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <details className="rounded-xl border-2 border-[#12502B] bg-[#DFF0E4] px-4 py-3">
                <summary className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#12502B]">
                  {passes.length} passing
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {passes.map((c) => (
                    <li key={c.key} className="font-body text-[13px] text-[#161616] leading-snug">
                      <strong className="font-bold">{c.label}.</strong> {c.detail}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}

          {testSteps && (
            <div className="mt-5 pt-5 border-t-2 border-[#161616]/12">
              <Eyebrow>Test run</Eyebrow>
              <ul className="mt-2.5 space-y-2">
                {testSteps.map((s) => (
                  <li key={s.step} className="flex flex-wrap items-start gap-2">
                    <Badge tone={s.ok ? 'pass' : 'fail'}>{s.ok ? 'ok' : 'fail'}</Badge>
                    <span className="font-body text-[14px] text-[#3A362D] leading-snug flex-1 min-w-[14rem]">
                      <strong className="font-bold text-[#161616]">{s.step}.</strong> {s.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sim && (
            <div className="mt-5 pt-5 border-t-2 border-[#161616]/12">
              <div className="flex flex-wrap items-center gap-5 mb-3">
                <Stat label="AI sales readiness" value={`${sim.score}`} sub="out of 100" tone={sim.score < 70 ? 'bad' : sim.score < 85 ? 'warn' : 'good'} />
                <p className="font-body text-[13px] text-[#3A362D] flex-1 min-w-[16rem] leading-snug">{sim.disclaimer}</p>
              </div>
              <ul className="space-y-2">
                {sim.results.map((r) => (
                  <li key={r.key} className="flex flex-wrap items-start gap-2">
                    <Badge tone={r.passed ? 'pass' : r.critical ? 'fail' : 'warn'}>{r.passed ? 'pass' : r.critical ? 'critical' : 'fail'}</Badge>
                    <span className="font-body text-[14px] text-[#3A362D] leading-snug flex-1 min-w-[14rem]">
                      <strong className="font-bold text-[#161616]">{r.name}.</strong> {r.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* ── integrations ── */}
        <FactoryIntegrations factoryId={factoryId} onChange={() => void load()} />

        {/* ── results ── */}
        {data.summary && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card eyebrow="This month" title="The funnel" className="lg:col-span-2">
              <Funnel stages={data.summary.funnel.stages} />
            </Card>

            <div className="space-y-5">
              <Card tone="ink" eyebrow="Money" title="What it produced">
                <div className="grid grid-cols-2 gap-5">
                  <DarkStat label="Pipeline" value={money(data.summary.pipelineCents)} />
                  <DarkStat label="Closed" value={money(data.summary.closedCents)} />
                  <DarkStat label="Factory cost" value={money(data.summary.costCents, 2)} />
                  <DarkStat label="ROI" value={pct(data.summary.roi)} sub={data.summary.roi === null ? 'connect revenue' : undefined} />
                </div>
                {data.tenant?.kind !== 'internal' && (
                  <div className="mt-4 pt-4 border-t-2 border-white/20 grid grid-cols-2 gap-5">
                    <DarkStat label="They pay" value={money(data.usage.margin.revenueCents)} sub="per month" />
                    <DarkStat label="Our margin" value={pct(data.usage.margin.grossPct)} sub={(data.usage.margin.grossPct ?? 100) < 40 ? 'below the floor' : undefined} />
                  </div>
                )}
              </Card>

              <Card eyebrow="Speed" title="Time to value">
                <dl className="space-y-2">
                  {Object.entries(data.summary.timeToValue).map(([label, days]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3 border-b-2 border-[#161616]/10 pb-2 last:border-0 last:pb-0">
                      <dt className="font-body text-[14px] text-[#3A362D]">{label}</dt>
                      <dd className="font-mono text-[13px] font-bold tabular-nums text-[#161616]">{days === null ? 'not yet' : `${days} days`}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </div>
          </div>
        )}

        {data.summary?.bottleneck && (
          <Card tone="yellow" eyebrow="Primary bottleneck" title={data.summary.bottleneck.label}>
            <p className="font-display text-xl font-semibold text-[#161616] leading-snug">{data.summary.bottleneck.verdict}</p>
            <p className="font-body text-[15px] text-[#161616] mt-2 leading-relaxed">{data.summary.bottleneck.recommendation}</p>
          </Card>
        )}

        {/* ── reservoir and hot ── */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card eyebrow="Inventory" title="Prospect reservoir">
            <Stat label="Held" value={num(data.reservoir.total)} size="lg" sub="contactable and not contactable, this Factory only" />
            <dl className="mt-4 space-y-1.5">
              {Object.entries(data.reservoir)
                .filter(([k, v]) => k !== 'total' && v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([state, count]) => (
                  <div key={state} className="flex items-baseline justify-between gap-3">
                    <dt className="font-body text-[14px] text-[#3A362D]">{sentenceCase(state)}</dt>
                    <dd className="font-mono text-[13px] font-bold tabular-nums text-[#161616]">{num(count)}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          <Card eyebrow="Buying intent" title="Hot right now" className="lg:col-span-2">
            {data.hot.length ? (
              <ul className="divide-y-2 divide-[#161616]/10">
                {data.hot.map((h) => (
                  <li key={h.id} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-sans text-[15px] font-bold text-[#161616] truncate">{h.company}</p>
                      <p className="font-body text-[13px] text-[#3A362D] leading-snug">{h.reasons.join(' · ')}</p>
                    </div>
                    <span className={`${figure} text-2xl text-[#161616] shrink-0`}>{h.heat}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="Nobody is showing intent yet">
                This fills with prospects who replied, opened what the Factory made for them, or asked about pricing. Only tracked behaviour, never inferred.
              </Empty>
            )}
          </Card>
        </div>

        {/* ── usage ── */}
        <Card eyebrow="Against the plan" title="Usage this month">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {data.limits.map((l) => (
              <div key={l.metric}>
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#5C5850] truncate">{(l.limitKey ?? l.metric).replace(/_/g, ' ')}</span>
                  <span className="font-mono text-[11px] font-bold tabular-nums text-[#161616]">
                    {num(l.used)}{l.limit === null ? '' : ` / ${num(l.limit)}`}
                  </span>
                </div>
                <Meter pct={l.pct ?? 0} tone={l.exceeded ? 'bad' : (l.pct ?? 0) > 80 ? 'warn' : 'good'} height="sm" />
                {l.limit === null && <p className="font-body text-[12px] text-[#5C5850] mt-1">No cap on this plan</p>}
              </div>
            ))}
          </div>
        </Card>

        {/* ── learning ── */}
        {data.segments && data.segments.length > 0 && (
          <Card eyebrow="What is working" title="Winning segments" right={<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5C5850]">30 prospect minimum for a rate</span>}>
            <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
              <table className="w-full min-w-[34rem] border-collapse">
                <thead>
                  <tr className="text-left">
                    {['Segment', 'Sample', 'Engaged', 'Won', 'Win rate'].map((h) => (
                      <th key={h} className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#C4160B] pb-2.5 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.segments.slice(0, 10).map((s) => (
                    <tr key={s.key} className="border-t-2 border-[#161616]/10">
                      <td className="py-2.5 pr-4 font-sans text-[14px] font-semibold text-[#161616]">{s.label}</td>
                      <td className="py-2.5 pr-4 font-mono text-[13px] tabular-nums text-[#3A362D]">{num(s.sample)}</td>
                      <td className="py-2.5 pr-4 font-mono text-[13px] tabular-nums text-[#3A362D]">{num(s.engaged)}</td>
                      <td className="py-2.5 pr-4 font-mono text-[13px] tabular-nums text-[#3A362D]">{num(s.won)}</td>
                      <td className="py-2.5 pr-4 font-mono text-[13px] tabular-nums text-[#3A362D]">
                        {s.winRate === null ? <span className="text-[#5C5850]">sample too small</span> : `${s.winRate.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.findMoreLike && (
              <div className="mt-4 rounded-xl border-2 border-[#161616] bg-[#F5B700] p-4 shadow-[3px_3px_0_0_#161616]">
                <Eyebrow tone="ink">Find more like these</Eyebrow>
                <p className="font-display text-lg font-semibold text-[#161616] mt-1">{data.findMoreLike.criteria.join(' · ')}</p>
                <p className="font-body text-[13px] text-[#161616] mt-1.5">{data.findMoreLike.evidence}</p>
              </div>
            )}
          </Card>
        )}

        {/* ── configuration ── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card eyebrow="History" title="Blueprint versions" right={data.blueprintMeta ? <Badge tone={data.blueprintMeta.status}>v{data.blueprintMeta.version}</Badge> : null}>
            {data.history.length ? (
              <ul className="divide-y-2 divide-[#161616]/10">
                {data.history.slice(0, 10).map((v) => (
                  <li key={v.id} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-body text-[14px] text-[#161616] leading-snug">
                        <strong className="font-bold">v{v.version}</strong> {v.summary ?? 'No summary.'}
                      </p>
                      <p className="font-mono text-[11px] text-[#5C5850] mt-0.5">{v.by ?? 'system'} · {ago(v.at)}</p>
                    </div>
                    <Badge tone={v.status}>{v.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="No versions yet">A blueprint appears here the moment the Forge writes one.</Empty>
            )}
          </Card>

          <Card eyebrow="Leverage" title="Productization">
            {data.productization ? (
              <>
                <div className="flex flex-wrap items-center gap-5">
                  <Dial score={data.productization.reusablePct} label="reusable" size={110} />
                  <div className="min-w-0 space-y-3">
                    <Stat label="Custom pieces" value={num(data.productization.custom)} size="sm" tone={data.productization.custom ? 'warn' : 'good'} />
                    <Stat label="Modules" value={num(data.productization.fromModules)} size="sm" />
                    <Stat label="Configured areas" value={num(data.productization.fromConfiguration)} size="sm" />
                  </div>
                </div>
                <p className="font-body text-[14px] text-[#3A362D] mt-4 leading-relaxed">{data.productization.note}</p>
                {data.complexity && (
                  <p className="font-body text-[13px] text-[#5C5850] mt-2 leading-relaxed">
                    {sentenceCase(data.complexity.level)} deployment, about {data.complexity.estimatedMinutes} human minutes estimated. {data.complexity.drivers.join(' ')}
                  </p>
                )}
              </>
            ) : (
              <Empty title="Needs a valid blueprint">The reuse ratio is computed from what the blueprint actually composes.</Empty>
            )}
          </Card>
        </div>

        {/* ── audit ── */}
        <Card eyebrow="Everything that happened" title="Audit log">
          {data.events.length ? (
            <ul className="divide-y-2 divide-[#161616]/10">
              {data.events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 py-2 first:pt-0 last:pb-0">
                  {e.severity !== 'info' && <Badge tone={e.severity === 'critical' ? 'fail' : 'warn'}>{e.severity}</Badge>}
                  <span className="font-mono text-[12px] font-bold text-[#161616]">{e.action}</span>
                  <span className="font-body text-[13px] text-[#3A362D]">{e.actor ?? 'system'}</span>
                  <span className="ml-auto font-mono text-[11px] text-[#5C5850]">{ago(e.occurred_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Nothing recorded yet">Every activation, pause, deploy, send and escalation lands here.</Empty>
          )}
        </Card>
      </Page>
    </Shell>
  );
}

function DarkStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">{label}</div>
      <div className={`${figure} text-[26px] mt-1.5 text-white`}>{value}</div>
      {sub && <div className="font-body text-[12px] text-[#CFC9BA] mt-1.5 leading-snug">{sub}</div>}
    </div>
  );
}

/**
 * The funnel, drawn as a funnel.
 *
 * Bars are proportional to the widest stage and the conversion rate sits
 * BETWEEN the rows it describes, because a rate printed beside a count reads
 * as a property of that count rather than of the step into it. Rates below
 * their stage's benchmark are marked, so the eye lands on the leak.
 */
function Funnel({ stages }: { stages: Stage[] }) {
  const top = stages[0]?.count ?? 0;
  if (!top) {
    return <Empty title="No prospects yet this month">The funnel fills from the top the moment sourcing or an import puts prospects in the reservoir.</Empty>;
  }

  return (
    <ol className="space-y-1">
      {stages.map((s, i) => {
        const width = Math.max(2, (s.count / top) * 100);
        const weak = s.rateFromPrevious !== null && s.rateFromPrevious < 20 && i > 0;
        return (
          <li key={s.key}>
            {i > 0 && (
              <div className="flex items-center gap-2 py-1 pl-1">
                <span aria-hidden className="font-mono text-[10px] text-[#5C5850]">&darr;</span>
                <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${weak ? 'text-[#C4160B]' : 'text-[#5C5850]'}`}>
                  {s.rateFromPrevious === null ? 'no data' : `${s.rateFromPrevious.toFixed(1)}% through`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="w-28 sm:w-32 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#3A362D]">{s.label}</span>
              <div className="flex-1 min-w-0">
                <div
                  className="h-8 rounded-md border-2 border-[#161616] bg-[#F5B700] flex items-center justify-end px-2 transition-[width] duration-500"
                  style={{ width: `${width}%` }}
                >
                  <span className={`${figure} text-[15px] text-[#161616]`}>{num(s.count)}</span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
