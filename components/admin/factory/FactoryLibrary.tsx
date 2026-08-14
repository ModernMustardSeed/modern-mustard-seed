'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Badge, Bar, Button, Card, Empty, Field, Stat, inputCls, money, pct } from './ui';

/**
 * THE MMS LIBRARY. What the platform can do, what it is made of, and how much
 * of the work is being repeated.
 *
 * Four things live here because they are the same subject: the reusable parts
 * (modules, value actions, tools, templates), the plans that gate them, the
 * delivery metrics that say whether reuse is winning, and the queue of
 * customer requests that decides what gets built next.
 *
 * MISSING CAPABILITY IS SHOWN, NOT HIDDEN. A module marked NEEDS DEVELOPMENT
 * appears in the list with its build spec. The Forge will refuse to deploy a
 * blueprint that depends on one, which is the whole point of naming them.
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

export default function FactoryLibrary() {
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<Tab>('Delivery');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
      const res = await fetch('/api/admin/factories/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setNotice(res.ok ? summarize(body.action as string, json) : json.error ?? 'That did not work.');
      await load();
      setBusy(null);
    },
    [load],
  );

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FBF6EA]">
        <AdminHeader active="factories" title="Factory Library" />
        <main className="max-w-7xl mx-auto px-5 py-10"><Empty>Loading.</Empty></main>
      </div>
    );
  }

  const { registry, delivery, economics } = data;

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="factories" title="Factory Library" onRefresh={() => void load()} />

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-6 space-y-5">
        {notice && <div className="border-2 border-[#161616] bg-white rounded-xl px-4 py-3 text-sm text-[#161616]">{notice}</div>}

        <Card title="Platform" right={<Button onClick={() => void post({ action: 'bootstrap' }, 'bootstrap')} disabled={busy !== null}>{busy === 'bootstrap' ? 'Syncing…' : 'Sync registries'}</Button>}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Stat label="Modules" value={registry.summary.modules} sub={`${registry.summary.stableModules} stable`} />
            <Stat label="Needs building" value={registry.summary.proposedModules} tone={registry.summary.proposedModules ? 'warn' : 'good'} />
            <Stat label="Templates" value={registry.summary.templates} sub={`${registry.summary.stableTemplates} stable`} />
            <Stat label="Customers" value={economics.customerTenants} />
            <Stat label="ARPA" value={money(economics.arpaCents)} />
            <Stat label="Gross margin" value={pct(economics.grossMarginPct)} tone={economics.grossMarginPct === null ? 'muted' : economics.grossMarginPct < 40 ? 'bad' : 'good'} />
          </div>
        </Card>

        <nav className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono text-[10px] uppercase tracking-[0.14em] font-bold px-3 py-2 rounded-lg border-2 transition-colors ${
                tab === t ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]' : 'border-transparent text-[#161616]/55 hover:text-[#161616] hover:bg-[#161616]/[0.05]'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === 'Delivery' && (
          <div className="space-y-4">
            {delivery.bottleneck && (
              <Card title="Current MMS scale bottleneck">
                <p className="font-sans font-bold text-[#161616]">{delivery.bottleneck.area}</p>
                <p className="text-sm text-[#161616]/75">{delivery.bottleneck.verdict}</p>
                <p className="text-sm text-[#161616]/85 mt-1">{delivery.bottleneck.recommendation}</p>
              </Card>
            )}

            <Card title="Deployment effort">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <Stat label="Deployments" value={delivery.effort.count} />
                <Stat label="Median human minutes" value={delivery.effort.medianMinutes ?? 'not recorded'} tone={(delivery.effort.medianMinutes ?? 0) > 60 ? 'warn' : 'good'} />
                <Stat label="Automated" value={delivery.effort.meanAutomationPct === null ? 'unknown' : `${delivery.effort.meanAutomationPct}%`} />
                <Stat
                  label="Trend"
                  value={delivery.effort.trend}
                  tone={delivery.effort.trend === 'falling' ? 'good' : delivery.effort.trend === 'rising' ? 'bad' : 'muted'}
                />
              </div>
              <p className="text-xs text-[#161616]/50">
                The target for a standard template deployment is under sixty human minutes. It should fall as templates improve, not hold flat.
              </p>
              {delivery.effort.byTemplate.length > 0 && (
                <div className="mt-3 space-y-1">
                  {delivery.effort.byTemplate.map((t) => (
                    <div key={t.template} className="flex justify-between text-sm">
                      <span className="text-[#161616]/60">{t.template}</span>
                      <span className="font-mono tabular-nums text-[#161616]">{t.medianMinutes ?? 'not recorded'} min · {t.count} launches</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Repeated requests" right={<span className="font-mono text-[9px] text-[#161616]/40">Once is custom. Three times is a module.</span>}>
              <div className="flex gap-2 mb-3">
                <input className={inputCls} value={requestTitle} onChange={(e) => setRequestTitle(e.target.value)} placeholder="A customer asked for…" />
                <Button
                  onClick={() => { void post({ action: 'log_request', title: requestTitle }, 'request'); setRequestTitle(''); }}
                  disabled={busy !== null || requestTitle.trim().length < 3}
                >
                  Log it
                </Button>
              </div>
              {delivery.opportunities.length ? (
                <ul className="space-y-2">
                  {delivery.opportunities.map((o) => (
                    <li key={o.requestKey} className="flex items-start justify-between gap-3 border-b border-[#161616]/8 pb-2 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm text-[#161616]"><strong>{o.title}</strong></p>
                        <p className="text-xs text-[#161616]/55">{o.recommendation}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-sans font-bold tabular-nums text-[#161616]">{o.tenants}</span>
                        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#161616]/40">customers</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No requests logged yet.</Empty>
              )}
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Custom code registry">
                {delivery.customCode.length ? (
                  <ul className="space-y-1.5">
                    {delivery.customCode.map((c) => (
                      <li key={c.id} className="text-sm flex gap-2">
                        <Badge tone={c.maintenance_risk === 'high' ? 'fail' : c.maintenance_risk === 'medium' ? 'warn' : 'pass'}>{c.maintenance_risk}</Badge>
                        <span className="text-[#161616]/80"><strong>{c.title}.</strong> {c.purpose ?? ''}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>No tenant-specific code. Everything shipped is reusable.</Empty>
                )}
              </Card>

              <Card title="Queues">
                {data.queues.length ? (
                  <ul className="space-y-1">
                    {data.queues.map((q) => (
                      <li key={q.lane} className="flex justify-between text-sm">
                        <span className="text-[#161616]/60">{q.lane}</span>
                        <span className="font-mono tabular-nums text-[#161616]">
                          {q.queued} queued · {q.running} running{q.failed ? ` · ${q.failed} failed` : ''}
                          {q.oldestSeconds !== null && q.oldestSeconds > 300 ? ` · ${Math.round(q.oldestSeconds / 60)}m lag` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Every queue is empty.</Empty>
                )}
                <Button className="mt-3" onClick={() => void post({ action: 'requeue_stale' }, 'requeue')} disabled={busy !== null}>Requeue stale jobs</Button>
              </Card>
            </div>
          </div>
        )}

        {tab === 'Templates' && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {registry.templates.map((t) => (
              <Card key={`${t.key ?? t.name}-${t.version ?? 1}`} title={t.name} right={<Badge tone={t.channel}>{t.channel}</Badge>}>
                <p className="text-sm text-[#161616]/70">{t.blurb}</p>
                <p className="text-xs text-[#161616]/45 mt-2">
                  {t.vertical ?? 'General'}{t.parent_key || t.parent ? ` · inherits ${t.parent_key ?? t.parent}` : ''}{t.version ? ` · v${t.version}` : ''}
                </p>
                {t.key && t.version && (
                  <div className="flex gap-1.5 mt-3">
                    {(['beta', 'stable', 'deprecated'] as const).map((channel) => (
                      <Button
                        key={channel}
                        onClick={() => void post({ action: 'publish_template', key: t.key, version: t.version, channel }, `publish-${t.key}`)}
                        disabled={busy !== null || t.channel === channel}
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
          <div className="space-y-4">
            {registry.capabilities.gaps.length > 0 && (
              <Card title="Missing capability">
                <ul className="space-y-2">
                  {registry.capabilities.gaps.map((g) => (
                    <li key={g.key} className="text-sm">
                      <p className="text-[#161616]"><strong>{g.name}</strong> <Badge tone="proposed">needs development</Badge></p>
                      <p className="text-xs text-[#161616]/55">{g.buildSpec}</p>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[#161616]/45 mt-3">
                  A blueprint that depends on one of these will not deploy. Build the module, remove the feature, or make it a manual step.
                </p>
              </Card>
            )}
            {['data', 'outbound', 'ai', 'value', 'conversion', 'ops'].map((category) => {
              const mine = registry.modules.filter((m) => m.category === category);
              if (!mine.length) return null;
              return (
                <Card key={category} title={category}>
                  <ul className="space-y-2">
                    {mine.map((m) => (
                      <li key={m.key} className="flex items-start justify-between gap-3 border-b border-[#161616]/8 pb-2 last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm text-[#161616]"><strong>{m.name}</strong> <span className="font-mono text-[10px] text-[#161616]/40">{m.key}</span></p>
                          <p className="text-xs text-[#161616]/60">{m.blurb}</p>
                          {m.requires.length > 0 && <p className="text-[11px] text-[#161616]/40 mt-0.5">Needs: {m.requires.join(', ')}</p>}
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <Badge tone={m.status}>{m.status}</Badge>
                          {m.cost && <p className="font-mono text-[10px] text-[#161616]/45">{m.cost.cents}c / {m.cost.unit}</p>}
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
          <div className="grid gap-3 md:grid-cols-2">
            {registry.valueActions.map((a) => (
              <Card key={a.key} title={a.name} right={<Badge tone={a.status}>{a.status}</Badge>}>
                <p className="text-sm text-[#161616]/75">{a.blurb}</p>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex gap-2"><dt className="text-[#161616]/40 w-20 shrink-0">Cost</dt><dd className="text-[#161616]/70">{a.costCents ? `${a.costCents}c per run` : 'free'}</dd></div>
                  <div className="flex gap-2"><dt className="text-[#161616]/40 w-20 shrink-0">Safety</dt><dd className="text-[#161616]/70">{a.safety}</dd></div>
                  <div className="flex gap-2"><dt className="text-[#161616]/40 w-20 shrink-0">Measured by</dt><dd className="text-[#161616]/70">{a.successMetric}</dd></div>
                </dl>
              </Card>
            ))}
          </div>
        )}

        {tab === 'Tools' && (
          <Card title="Tool registry">
            <p className="text-xs text-[#161616]/50 mb-3">
              Authorized per Factory, checked server-side where the tool runs. High-risk tools stay off unless the blueprint explicitly enables them.
            </p>
            <ul className="space-y-2">
              {registry.tools.map((t) => (
                <li key={t.key} className="flex items-start justify-between gap-3 border-b border-[#161616]/8 pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-[#161616]"><strong>{t.name}</strong> <span className="font-mono text-[10px] text-[#161616]/40">{t.key}</span></p>
                    <p className="text-xs text-[#161616]/60">{t.purpose}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={t.risk === 'high' ? 'fail' : t.risk === 'medium' ? 'warn' : 'pass'}>{t.risk} risk</Badge>
                    {t.moduleKey && <p className="font-mono text-[9px] text-[#161616]/35 mt-1">{t.moduleKey}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {tab === 'Plans' && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.plans.map((p) => (
              <Card key={p.code} title={p.name} right={<Badge tone={p.status === 'public' ? 'stable' : p.status}>{p.status}</Badge>}>
                <p className="text-sm text-[#161616]/70">{p.blurb}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Stat label="Setup" value={money(p.setup_price_cents)} />
                  <Stat label="Monthly" value={money(p.monthly_price_cents)} />
                </div>
                <p className="text-[11px] text-[#161616]/40 mt-1">
                  {p.setup_price_cents === null || p.monthly_price_cents === null
                    ? 'Not priced yet. Nothing publishes a number MMS has not set.'
                    : p.managed ? 'Managed engagement.' : 'Self-serve.'}
                </p>
                <ul className="mt-3 space-y-0.5">
                  {Object.entries(p.limits).slice(0, 8).map(([k, v]) => (
                    <li key={k} className="flex justify-between text-xs">
                      <span className="text-[#161616]/50">{k}</span>
                      <span className="font-mono tabular-nums text-[#161616]/75">{v.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function summarize(action: string, json: Record<string, unknown>): string {
  if (action === 'bootstrap') {
    const notes = (json.notes as string[]) ?? [];
    return `Synced ${json.modules} modules, ${json.valueActions} value actions and ${json.templates} templates. ${notes.join(' ')}`.trim();
  }
  if (action === 'requeue_stale') return `Requeued ${json.requeued} stale job(s).`;
  if (action === 'log_request') {
    const o = json.opportunity as Opportunity | null;
    return o ? `Logged. ${o.tenants} customer(s) have asked for this. ${o.recommendation}` : 'Logged.';
  }
  if (action === 'publish_template') {
    const t = json.template as { key: string; version: number; channel: string };
    return `${t.key} v${t.version} is now ${t.channel}.`;
  }
  return 'Done.';
}
