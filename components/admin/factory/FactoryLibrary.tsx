'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Badge, Button, Card, Dial, Empty, Eyebrow, Meter, Notice, Page, PageTitle, Shell, Skeleton, Stat, Tabs,
  figure, inputCls, money, num, pct, sentenceCase,
} from './ui';

/**
 * THE MMS LIBRARY. What the platform can do, what it is made of, and how much
 * of the work is being repeated.
 *
 * Six views of one subject: the reusable parts (templates, modules, value
 * actions, tools), the plans that gate them, and the delivery metrics that say
 * whether reuse is winning. Delivery opens first because it is the only tab
 * that can tell you the company is in trouble.
 *
 * MISSING CAPABILITY IS SHOWN, NOT HIDDEN. A module marked NEEDS DEVELOPMENT
 * appears with its build spec. The Forge refuses to deploy a blueprint that
 * depends on one, which is the whole point of naming them.
 */

type Module = { key: string; name: string; category: string; blurb: string; risk: string; status: string; cost: { unit: string; cents: number } | null; requires: string[]; buildSpec?: string };
type ValueAction = { key: string; name: string; blurb: string; costCents: number; risk: string; status: string; safety: string; successMetric: string };
type Tool = { key: string; name: string; purpose: string; risk: string; moduleKey: string | null; costCents: number };
type Template = { key?: string; name: string; vertical: string | null; blurb: string | null; channel: string; version?: number; parent_key?: string | null; parent?: string | null };
type Plan = { code: string; name: string; blurb: string | null; limits: Record<string, number>; setup_price_cents: number | null; monthly_price_cents: number | null; managed: boolean; status: string };
type Opportunity = { requestKey: string; title: string; count: number; tenants: number; kind: string; status: string; recommendation: string };
type Effort = { count: number; medianMinutes: number | null; meanMinutes: number | null; meanAutomationPct: number | null; byTemplate: { template: string; count: number; medianMinutes: number | null }[]; trend: string };

type Payload = {
  registry: {
    modules: Module[];
    valueActions: ValueAction[];
    tools: Tool[];
    templates: Template[];
    capabilities: { available: { key: string; name: string }[]; gaps: { key: string; name: string; buildSpec: string }[] };
    summary: { modules: number; stableModules: number; proposedModules: number; templates: number; stableTemplates: number };
  };
  plans: Plan[];
  economics: { customerTenants: number; mrrCents: number; variableCostCents: number; grossMarginPct: number | null; arpaCents: number | null; unprofitable: { name: string }[] };
  delivery: {
    effort: Effort;
    opportunities: Opportunity[];
    customCode: { id: string; title: string; purpose: string | null; maintenance_risk: string; reusable: boolean | null }[];
    bottleneck: { area: string; verdict: string; recommendation: string } | null;
  };
  queues: { lane: string; queued: number; running: number; failed: number; oldestSeconds: number | null }[];
};

const TABS = ['Delivery', 'Templates', 'Modules', 'Value actions', 'Tools', 'Plans'] as const;
type Tab = (typeof TABS)[number];

const CATEGORIES = ['data', 'outbound', 'ai', 'value', 'conversion', 'ops'] as const;

export default function FactoryLibrary() {
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<Tab>('Delivery');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [requestTitle, setRequestTitle] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/factories/platform');
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => { void load(); }, [load]);

  const post = useCallback(
    async (body: Record<string, unknown>, label: string) => {
      setBusy(label);
      setNotice(null);
      setProblem(null);
      const res = await fetch('/api/admin/factories/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) setNotice(summarize(body.action as string, json));
      else setProblem(json.error ?? 'That did not work.');
      await load();
      setBusy(null);
    },
    [load],
  );

  if (!data) {
    return (
      <Shell>
        <AdminHeader active="factories" title="Factory Library" />
        <Page><Card eyebrow="Working" title="Opening the library"><Skeleton rows={5} /></Card></Page>
      </Shell>
    );
  }

  const { registry, delivery, economics } = data;

  return (
    <Shell>
      <AdminHeader active="factories" title="Factory Library" onRefresh={() => void load()} />
      <Page>
        <PageTitle
          eyebrow="Modern Mustard Seed IP"
          title={<>The parts every Factory is <em className="font-display italic">built from</em></>}
          sub="Templates, modules, value actions and tools. Everything here is written once and deployed many times, and the delivery numbers say whether that is actually happening."
          actions={
            <Button tone="primary" onClick={() => void post({ action: 'bootstrap' }, 'bootstrap')} disabled={busy !== null}>
              {busy === 'bootstrap' ? 'Syncing' : 'Sync registries'}
            </Button>
          }
        />

        {notice && <Notice kind="good">{notice}</Notice>}
        {problem && <Notice kind="bad">{problem}</Notice>}

        <Card tone="ink" eyebrow="The platform" title="What exists right now">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
            <DarkStat label="Modules" value={num(registry.summary.modules)} sub={`${registry.summary.stableModules} stable`} />
            <DarkStat label="Needs building" value={num(registry.summary.proposedModules)} sub={registry.summary.proposedModules ? 'named, with a spec' : 'no gaps'} />
            <DarkStat label="Templates" value={num(registry.summary.templates)} sub={`${registry.summary.stableTemplates} stable`} />
            <DarkStat label="Customers" value={num(economics.customerTenants)} sub="paying tenants" />
            <DarkStat label="ARPA" value={money(economics.arpaCents)} sub="per customer" />
            <DarkStat label="Gross margin" value={pct(economics.grossMarginPct)} sub={economics.grossMarginPct === null ? 'no revenue yet' : undefined} />
          </div>
        </Card>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'Delivery' && (
          <div className="space-y-5">
            {delivery.bottleneck ? (
              <Card tone="yellow" eyebrow="Current MMS scale bottleneck" title={delivery.bottleneck.area}>
                <p className="font-display text-xl font-semibold text-[#161616] leading-snug">{delivery.bottleneck.verdict}</p>
                <p className="font-body text-[15px] text-[#161616] mt-2 leading-relaxed">{delivery.bottleneck.recommendation}</p>
              </Card>
            ) : (
              <Card eyebrow="Current MMS scale bottleneck" title="Nothing is limiting growth right now">
                <p className="font-body text-[15px] text-[#3A362D] leading-relaxed">
                  Deployment effort is not rising, no customer is below the margin floor, and no request has been asked for enough times to be a module. This changes the moment one of them does.
                </p>
              </Card>
            )}

            <Card eyebrow="The metric that matters" title="Deployment effort">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                <div className="flex justify-center sm:justify-start">
                  <Dial score={delivery.effort.meanAutomationPct ?? 0} label="automated" />
                </div>
                <Stat label="Deployments" value={num(delivery.effort.count)} sub="recorded launches" />
                <Stat
                  label="Median human minutes"
                  value={delivery.effort.medianMinutes === null ? 'Not recorded' : num(delivery.effort.medianMinutes)}
                  tone={(delivery.effort.medianMinutes ?? 0) > 60 ? 'warn' : 'good'}
                  sub="target is under 60 for a standard template"
                />
                <Stat
                  label="Trend"
                  value={sentenceCase(delivery.effort.trend)}
                  tone={delivery.effort.trend === 'falling' ? 'good' : delivery.effort.trend === 'rising' ? 'bad' : 'muted'}
                  sub="it should fall as templates improve"
                />
              </div>
              {delivery.effort.byTemplate.length > 0 && (
                <dl className="mt-5 pt-5 border-t-2 border-[#161616]/12 space-y-2">
                  {delivery.effort.byTemplate.map((t) => (
                    <div key={t.template} className="flex items-baseline justify-between gap-3">
                      <dt className="font-body text-[14px] text-[#3A362D]">{t.template}</dt>
                      <dd className="font-mono text-[13px] font-bold tabular-nums text-[#161616]">
                        {t.medianMinutes === null ? 'not recorded' : `${t.medianMinutes} min`} · {t.count} launch{t.count === 1 ? '' : 'es'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>

            <Card
              eyebrow="Product opportunities"
              title="Repeated requests"
              right={<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5C5850]">Once is custom. Three times is a module.</span>}
            >
              <div className="flex flex-wrap gap-2 mb-4">
                <input
                  className={`${inputCls} flex-1 min-w-[16rem]`}
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  placeholder="A customer asked for bilingual call routing"
                  aria-label="Log a customer request"
                />
                <Button
                  tone="primary"
                  onClick={() => { void post({ action: 'log_request', title: requestTitle }, 'request'); setRequestTitle(''); }}
                  disabled={busy !== null || requestTitle.trim().length < 3}
                  title={requestTitle.trim().length < 3 ? 'Write the request first' : undefined}
                >
                  Log it
                </Button>
              </div>
              {delivery.opportunities.length ? (
                <ul className="divide-y-2 divide-[#161616]/10">
                  {delivery.opportunities.map((o) => (
                    <li key={o.requestKey} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-sans text-[15px] font-bold text-[#161616] leading-snug">{o.title}</p>
                        <p className="font-body text-[13px] text-[#3A362D] mt-0.5 leading-snug">{o.recommendation}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`${figure} text-2xl ${o.tenants >= 3 ? 'text-[#C4160B]' : 'text-[#161616]'}`}>{o.tenants}</span>
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#5C5850]">customers</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title="No requests logged yet">
                  Every time a customer asks for something the platform does not do, log it here. The third customer asking turns it into a module.
                </Empty>
              )}
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card eyebrow="Liability" title="Custom code registry">
                {delivery.customCode.length ? (
                  <ul className="divide-y-2 divide-[#161616]/10">
                    {delivery.customCode.map((c) => (
                      <li key={c.id} className="flex items-start gap-2 py-2.5 first:pt-0 last:pb-0">
                        <Badge tone={c.maintenance_risk === 'high' ? 'fail' : c.maintenance_risk === 'medium' ? 'warn' : 'pass'}>{c.maintenance_risk}</Badge>
                        <span className="font-body text-[14px] text-[#3A362D] leading-snug">
                          <strong className="font-bold text-[#161616]">{c.title}.</strong> {c.purpose ?? ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty title="No tenant-specific code">Everything shipped so far is reusable. That is the number to protect.</Empty>
                )}
              </Card>

              <Card
                eyebrow="Infrastructure"
                title="Queues"
                right={<Button size="sm" onClick={() => void post({ action: 'requeue_stale' }, 'requeue')} disabled={busy !== null}>Requeue stale</Button>}
              >
                {data.queues.length ? (
                  <dl className="divide-y-2 divide-[#161616]/10">
                    {data.queues.map((q) => (
                      <div key={q.lane} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <dt className="font-sans text-[14px] font-bold text-[#161616]">{sentenceCase(q.lane)}</dt>
                        <dd className="font-mono text-[13px] tabular-nums text-[#3A362D]">
                          {q.queued} queued · {q.running} running
                          {q.failed ? <span className="text-[#C4160B] font-bold"> · {q.failed} failed</span> : null}
                          {q.oldestSeconds !== null && q.oldestSeconds > 300 ? <span className="text-[#C4160B] font-bold"> · {Math.round(q.oldestSeconds / 60)}m lag</span> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <Empty title="Every queue is empty">Nothing is waiting and nothing is stuck.</Empty>
                )}
              </Card>
            </div>
          </div>
        )}

        {tab === 'Templates' && (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {registry.templates.map((t) => (
              <Card
                key={`${t.key ?? t.name}-${t.version ?? 1}`}
                eyebrow={t.vertical ?? 'General'}
                title={t.name}
                right={<Badge tone={t.channel}>{t.channel}</Badge>}
              >
                <p className="font-body text-[14px] text-[#3A362D] leading-relaxed">{t.blurb}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5C5850] mt-3">
                  {t.parent_key || t.parent ? `inherits ${t.parent_key ?? t.parent}` : 'root template'}{t.version ? ` · v${t.version}` : ''}
                </p>
                {t.key && t.version && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t-2 border-[#161616]/12">
                    {(['beta', 'stable', 'deprecated'] as const).map((channel) => (
                      <Button
                        key={channel}
                        size="sm"
                        onClick={() => void post({ action: 'publish_template', key: t.key, version: t.version, channel }, `publish-${t.key}-${channel}`)}
                        disabled={busy !== null || t.channel === channel}
                        title={t.channel === channel ? `Already ${channel}` : `Move to ${channel}`}
                      >
                        {channel}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {tab === 'Modules' && (
          <div className="space-y-5">
            {registry.capabilities.gaps.length > 0 && (
              <Card eyebrow="Not built yet" title="Missing capability">
                <ul className="space-y-3">
                  {registry.capabilities.gaps.map((g) => (
                    <li key={g.key} className="rounded-xl border-2 border-[#432076] bg-[#E7DEF7] p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold text-[#161616]">{g.name}</h3>
                        <Badge tone="proposed">needs development</Badge>
                      </div>
                      <p className="font-body text-[14px] text-[#432076] mt-1 leading-snug">{g.buildSpec}</p>
                    </li>
                  ))}
                </ul>
                <p className="font-body text-[13px] text-[#3A362D] mt-4 leading-relaxed">
                  A blueprint that depends on one of these will not deploy. Build the module, remove the feature, or make it a manual step.
                </p>
              </Card>
            )}
            {CATEGORIES.map((category) => {
              const mine = registry.modules.filter((m) => m.category === category);
              if (!mine.length) return null;
              return (
                <Card key={category} eyebrow={`${mine.length} module${mine.length === 1 ? '' : 's'}`} title={sentenceCase(category)}>
                  <ul className="divide-y-2 divide-[#161616]/10">
                    {mine.map((m) => (
                      <li key={m.key} className="flex flex-wrap items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <h3 className="font-sans text-[15px] font-bold text-[#161616]">{m.name}</h3>
                            <code className="font-mono text-[11px] text-[#5C5850]">{m.key}</code>
                          </div>
                          <p className="font-body text-[14px] text-[#3A362D] mt-0.5 leading-snug">{m.blurb}</p>
                          {m.requires.length > 0 && (
                            <p className="font-mono text-[11px] text-[#5C5850] mt-1">needs: {m.requires.join(', ')}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right space-y-1.5">
                          <Badge tone={m.status}>{m.status}</Badge>
                          {m.cost && <p className="font-mono text-[11px] text-[#3A362D]">{m.cost.cents}c per {m.cost.unit.replace(/_/g, ' ')}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}

        {tab === 'Value actions' && (
          <>
            <Card tone="yellow" eyebrow="The differentiator" title="Something useful, before anybody is asked to buy">
              <p className="font-body text-[15px] text-[#161616] leading-relaxed max-w-3xl">
                Any tool can send a sequence. A Value Action is the part a prospect actually keeps: an audit of their own site, the arithmetic on what a problem costs them, a receptionist that answers as their business. It is why the second sentence gets read.
              </p>
            </Card>
            <div className="grid gap-5 md:grid-cols-2">
              {registry.valueActions.map((a) => (
                <Card key={a.key} eyebrow={a.costCents ? `${a.costCents}c per run` : 'free to run'} title={a.name} right={<Badge tone={a.status}>{a.status}</Badge>}>
                  <p className="font-body text-[15px] text-[#3A362D] leading-relaxed">{a.blurb}</p>
                  <dl className="mt-4 space-y-2.5 pt-4 border-t-2 border-[#161616]/12">
                    <div>
                      <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#C4160B]">Safety</dt>
                      <dd className="font-body text-[13px] text-[#3A362D] mt-0.5 leading-snug">{a.safety}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#C4160B]">Measured by</dt>
                      <dd className="font-body text-[13px] text-[#3A362D] mt-0.5 leading-snug">{a.successMetric}</dd>
                    </div>
                  </dl>
                </Card>
              ))}
            </div>
          </>
        )}

        {tab === 'Tools' && (
          <Card eyebrow="What an AI salesperson may hold" title="Tool registry">
            <p className="font-body text-[14px] text-[#3A362D] mb-4 leading-relaxed max-w-3xl">
              Authorized per Factory and checked server-side where the tool runs, not where the prompt is written. High-risk tools stay off unless the blueprint explicitly enables them.
            </p>
            <ul className="divide-y-2 divide-[#161616]/10">
              {registry.tools.map((t) => (
                <li key={t.key} className="flex flex-wrap items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-sans text-[15px] font-bold text-[#161616]">{t.name}</h3>
                      <code className="font-mono text-[11px] text-[#5C5850]">{t.key}</code>
                    </div>
                    <p className="font-body text-[14px] text-[#3A362D] mt-0.5 leading-snug">{t.purpose}</p>
                  </div>
                  <div className="shrink-0 text-right space-y-1.5">
                    <Badge tone={t.risk === 'high' ? 'fail' : t.risk === 'medium' ? 'warn' : 'pass'}>{t.risk} risk</Badge>
                    {t.moduleKey && <p className="font-mono text-[11px] text-[#5C5850]">{t.moduleKey}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {tab === 'Plans' && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {data.plans.map((p) => (
              <Card key={p.code} eyebrow={p.managed ? 'Managed' : 'Self-serve'} title={p.name} right={<Badge tone={p.status === 'public' ? 'stable' : p.status}>{p.status}</Badge>}>
                <p className="font-body text-[14px] text-[#3A362D] leading-relaxed">{p.blurb}</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Stat label="Setup" value={money(p.setup_price_cents)} size="sm" tone={p.setup_price_cents === null ? 'muted' : 'ink'} />
                  <Stat label="Monthly" value={money(p.monthly_price_cents)} size="sm" tone={p.monthly_price_cents === null ? 'muted' : 'ink'} />
                </div>
                {(p.setup_price_cents === null || p.monthly_price_cents === null) && (
                  <p className="font-body text-[12px] text-[#5C5850] mt-2 leading-snug">
                    Not priced yet. Nothing publishes a number that has not been set.
                  </p>
                )}
                <dl className="mt-4 pt-4 border-t-2 border-[#161616]/12 space-y-1.5">
                  {Object.entries(p.limits).slice(0, 8).map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3">
                      <dt className="font-body text-[13px] text-[#3A362D]">{sentenceCase(k)}</dt>
                      <dd className="font-mono text-[12px] font-bold tabular-nums text-[#161616]">{num(v)}</dd>
                    </div>
                  ))}
                  {Object.keys(p.limits).length === 0 && (
                    <p className="font-body text-[13px] text-[#5C5850]">No caps on this plan.</p>
                  )}
                </dl>
              </Card>
            ))}
          </div>
        )}
      </Page>
    </Shell>
  );
}

function DarkStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">{label}</div>
      <div className={`${figure} text-[26px] mt-1.5 text-white`}>{value}</div>
      {sub && <div className="font-body text-[12px] text-[#CFC9BA] mt-1.5 leading-snug truncate">{sub}</div>}
    </div>
  );
}

function summarize(action: string, json: Record<string, unknown>): string {
  if (action === 'bootstrap') {
    const notes = (json.notes as string[]) ?? [];
    return `Synced ${json.modules} modules, ${json.valueActions} value actions and ${json.templates} templates. ${notes.join(' ')}`.trim();
  }
  if (action === 'requeue_stale') return `Requeued ${json.requeued} stale job${json.requeued === 1 ? '' : 's'}.`;
  if (action === 'log_request') {
    const o = json.opportunity as Opportunity | null;
    return o ? `Logged. ${o.tenants} customer${o.tenants === 1 ? ' has' : 's have'} asked for this. ${o.recommendation}` : 'Logged.';
  }
  if (action === 'publish_template') {
    const t = json.template as { key: string; version: number; channel: string };
    return `${t.key} v${t.version} is now ${t.channel}.`;
  }
  return 'Done.';
}
