'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import {
  Badge, Button, Card, Empty, Eyebrow, Meter, Notice, Skeleton, Stat,
  figure, money, num, sentenceCase,
} from '@/components/admin/factory/ui';

/**
 * WHAT DID YOUR CLIENT FACTORY DO?
 *
 * The customer's screen. Their results, what needs their attention, what it is
 * costing them against their plan, and the switches to stop it.
 *
 * WHAT IS DELIBERATELY NOT HERE. Our variable cost, our margin, the template
 * internals, other tenants, the module registry. Those are how the product is
 * built, not what the customer bought, and showing them would give away the
 * reusable engine while telling the customer nothing they can act on.
 *
 * EVERY NUMBER IS REAL OR ABSENT. A metric with nothing behind it says so
 * rather than showing a zero that reads like failure or a placeholder that
 * reads like a lie.
 */

type Stage = { key: string; label: string; count: number; rateFromPrevious: number | null };
type LimitState = { metric: string; limitKey: string | null; limit: number | null; used: number; pct: number | null; exceeded: boolean };
type HotRow = { id: string; company: string; contact_name: string | null; heat: number; reasons: string[] };
type InboxRow = { id: string; subject: string | null; body: string | null; classification: string | null; created_at: string };
type Meeting = { id: string; starts_at: string; attendee_name: string | null; attendee_email: string | null; status: string };

type Payload = {
  tenant: { id: string; name: string; plan: { code: string; name: string } | null };
  role: 'owner' | 'member' | 'viewer';
  factories: { id: string; name: string; status: string; mode: string }[];
  factory: {
    id: string; name: string; status: string; mode: string; autonomy: string; activatedAt: string | null;
    paused: { sourcing: boolean; outreach: boolean; ai: boolean; followup: boolean };
    pauseReason: string | null;
  } | null;
  agent: { name: string; role: string } | null;
  health: { overall: number; band: string; reasons: string[] };
  summary: {
    funnel: { stages: Stage[] };
    bottleneck: { label: string; verdict: string; recommendation: string } | null;
    pipelineCents: number; closedCents: number; roi: number | null;
    timeToValue: Record<string, number | null>;
  } | null;
  pipeline: { stage: string; count: number; valueCents: number }[] | null;
  reservoir: Record<string, number> & { total: number };
  hot: HotRow[];
  inbox: InboxRow[];
  meetings: Meeting[];
  usage: { limits: LimitState[]; warnings: string[]; valueActions: number; emails: number; conversations: number };
  note?: string;
};

const CLASS_LABEL: Record<string, string> = {
  positive: 'Interested',
  question: 'Asked a question',
  pricing: 'Asked about pricing',
  meeting: 'Wants to meet',
};

export default function ClientFactoryDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async (factoryId?: string) => {
    try {
      const res = await fetch(`/api/portal/factory${factoryId ? `?factoryId=${factoryId}` : ''}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not load your Client Factory.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your Client Factory.');
    }
  }, []);

  useEffect(() => { void load(selected ?? undefined); }, [load, selected]);

  const control = useCallback(
    async (control: string, paused: boolean) => {
      if (!data?.factory) return;
      setBusy(control);
      await fetch('/api/portal/factory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factoryId: data.factory.id, control, paused }),
      });
      await load(data.factory.id);
      setBusy(null);
    },
    [data, load],
  );

  if (error) {
    return <Shell><Notice kind="bad">{error}</Notice></Shell>;
  }
  if (!data) {
    return <Shell><Card eyebrow="Working" title="Opening your Factory"><Skeleton rows={4} /></Card></Shell>;
  }

  if (!data.factory) {
    return (
      <Shell name={data.tenant.name}>
        <Card tone="yellow" eyebrow="Nearly there" title="Your Client Factory is being built">
          <p className="font-body text-[16px] text-[#161616] leading-relaxed max-w-2xl">
            {data.note ?? 'We are configuring it now. You will hear from us the moment there is something to review, and nothing contacts anybody until you have seen it.'}
          </p>
        </Card>
      </Shell>
    );
  }

  const f = data.factory;
  const stages = data.summary?.funnel.stages ?? [];
  const found = stages.find((s) => s.key === 'found')?.count ?? 0;
  const readOnly = data.role === 'viewer';

  return (
    <Shell name={data.tenant.name}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Eyebrow>{data.tenant.plan?.name ?? 'Client Factory'}</Eyebrow>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#161616] mt-1.5 leading-[1.1]">{f.name}</h1>
          <p className="font-body text-[15px] text-[#3A362D] mt-2 leading-relaxed">
            {f.status === 'live' ? 'Running.' : f.status === 'paused' ? 'Paused.' : `In ${f.status}.`}
            {f.mode === 'test' ? ' In test mode, so nobody real is being contacted.' : ''}
            {data.agent ? ` ${data.agent.name} is your ${data.agent.role.toLowerCase()}.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge tone={f.status}>{f.status}</Badge>
          {f.mode === 'test' && <Badge tone="test">test mode</Badge>}
          {data.factories.length > 1 && (
            <select
              className="rounded-lg border-2 border-[#161616] bg-white px-3 py-2 font-sans text-[13px] font-bold text-[#161616] shadow-[3px_3px_0_0_#161616]"
              value={f.id}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Choose a Factory"
            >
              {data.factories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          )}
        </div>
      </header>

      {f.pauseReason && <Notice kind="warn">{f.pauseReason}</Notice>}

      {data.health.reasons.length > 0 && (
        <Card eyebrow="Worth a look" title="What we would fix first">
          <ul className="space-y-2">
            {data.health.reasons.map((r) => (
              <li key={r} className="flex gap-2.5 font-body text-[15px] text-[#3A362D] leading-snug">
                <span className="text-[#C4160B] font-bold shrink-0" aria-hidden>&rsaquo;</span>{r}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── this month ── */}
      <Card eyebrow="This month" title="What your Factory did">
        {stages.length && found ? (
          <ol className="space-y-1">
            {stages.map((s, i) => (
              <li key={s.key}>
                {i > 0 && (
                  <div className="flex items-center gap-2 py-1 pl-1">
                    <span aria-hidden className="font-mono text-[10px] text-[#5C5850]">&darr;</span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#5C5850]">
                      {s.rateFromPrevious === null ? 'no data' : `${s.rateFromPrevious.toFixed(1)}% through`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="w-32 sm:w-36 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#3A362D]">{s.label}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="h-9 rounded-md border-2 border-[#161616] bg-[#F5B700] flex items-center justify-end px-2.5 transition-[width] duration-500"
                      style={{ width: `${Math.max(3, (s.count / found) * 100)}%` }}
                    >
                      <span className={`${figure} text-base text-[#161616]`}>{num(s.count)}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="Nothing to show yet">
            The numbers fill in as the Factory runs. Prospects first, then replies, then meetings.
          </Empty>
        )}

        {data.summary && (
          <div className="mt-6 pt-6 border-t-2 border-[#161616]/12 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <Stat label="Pipeline" value={money(data.summary.pipelineCents)} sub="open opportunities" />
            <Stat label="Closed" value={money(data.summary.closedCents)} sub="won this month" />
            <Stat
              label="Return"
              value={data.summary.roi === null ? 'Not yet' : `${data.summary.roi.toFixed(0)}%`}
              tone={data.summary.roi === null ? 'muted' : data.summary.roi > 0 ? 'good' : 'bad'}
              sub={data.summary.roi === null ? 'connect revenue to see this' : 'against what the Factory cost'}
            />
            <Stat label="Prospects held" value={num(data.reservoir.total)} sub="ready for the next campaign" />
          </div>
        )}
      </Card>

      {data.summary?.bottleneck && (
        <Card tone="yellow" eyebrow="Where you are losing them" title={data.summary.bottleneck.label}>
          <p className="font-display text-xl font-semibold text-[#161616] leading-snug">{data.summary.bottleneck.verdict}</p>
          <p className="font-body text-[16px] text-[#161616] mt-2 leading-relaxed">{data.summary.bottleneck.recommendation}</p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card eyebrow="Buying intent" title="Hot right now">
          {data.hot.length ? (
            <ul className="divide-y-2 divide-[#161616]/10">
              {data.hot.map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
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
              This fills with prospects who replied, opened what your Factory made for them, or asked what it costs.
            </Empty>
          )}
        </Card>

        <Card eyebrow="Your move" title="Needs a human">
          {data.inbox.length ? (
            <ul className="divide-y-2 divide-[#161616]/10">
              {data.inbox.slice(0, 8).map((m) => (
                <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={m.classification === 'meeting' ? 'live' : m.classification === 'pricing' ? 'test' : 'beta'}>
                      {CLASS_LABEL[m.classification ?? ''] ?? m.classification}
                    </Badge>
                    <span className="font-mono text-[11px] text-[#5C5850]">{new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <p className="font-sans text-[15px] font-bold text-[#161616] mt-1 truncate">{m.subject ?? 'No subject'}</p>
                  {m.body && <p className="font-body text-[13px] text-[#3A362D] mt-0.5 leading-snug line-clamp-2">{m.body.slice(0, 180)}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Nothing waiting on you">Replies that need a person land here. Everything else your AI handles.</Empty>
          )}
        </Card>
      </div>

      {data.meetings.length > 0 && (
        <Card eyebrow="On the calendar" title="Booked">
          <ul className="divide-y-2 divide-[#161616]/10">
            {data.meetings.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="font-sans text-[15px] font-bold text-[#161616]">{m.attendee_name ?? m.attendee_email ?? 'Prospect'}</span>
                <span className="font-mono text-[13px] text-[#3A362D]">
                  {new Date(m.starts_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── plan ── */}
      <Card eyebrow="Your plan" title={data.tenant.plan?.name ?? 'Usage this month'}>
        {data.usage.warnings.length > 0 && (
          <div className="mb-5 space-y-2">
            {data.usage.warnings.map((w) => <Notice key={w} kind="warn">{w}</Notice>)}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {data.usage.limits.map((l) => (
            <div key={l.metric}>
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#5C5850] truncate">
                  {sentenceCase((l.limitKey ?? l.metric).replace(/_month$/, ''))}
                </span>
                <span className="font-mono text-[11px] font-bold tabular-nums text-[#161616]">
                  {num(l.used)}{l.limit === null ? '' : ` / ${num(l.limit)}`}
                </span>
              </div>
              <Meter pct={l.pct ?? 0} tone={l.exceeded ? 'bad' : (l.pct ?? 0) > 80 ? 'warn' : 'good'} height="sm" />
              {l.limit === null && <p className="font-body text-[12px] text-[#5C5850] mt-1">No cap</p>}
            </div>
          ))}
        </div>
      </Card>

      {/* ── controls ── */}
      <Card eyebrow="Yours to stop" title="Your controls">
        <p className="font-body text-[15px] text-[#3A362D] mb-5 max-w-2xl leading-relaxed">
          {readOnly
            ? 'Your access is read only. An owner on your account can change these.'
            : 'Stop any part of it whenever you want, and start it again the same way. Nothing here needs an email to us.'}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Button
              tone={f.status === 'paused' ? 'primary' : 'danger'}
              disabled={readOnly || busy !== null}
              onClick={() => void control('factory', f.status !== 'paused')}
              className="w-full"
              title={readOnly ? 'Read-only access' : undefined}
            >
              {f.status === 'paused' ? 'Resume everything' : 'Pause everything'}
            </Button>
          </div>
          {[
            { key: 'sourcing', label: 'Finding prospects', paused: f.paused.sourcing },
            { key: 'outreach', label: 'Outreach', paused: f.paused.outreach },
            { key: 'ai', label: 'The AI', paused: f.paused.ai },
            { key: 'followup', label: 'Follow-up', paused: f.paused.followup },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => void control(s.key, !s.paused)}
              disabled={readOnly || busy !== null}
              className={`flex items-center justify-between gap-3 rounded-lg border-2 border-[#161616] px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/40 disabled:cursor-not-allowed ${
                s.paused ? 'bg-[#FBE3E1]' : 'bg-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#161616]'
              }`}
            >
              <span>
                <span className="block font-sans text-[15px] font-bold text-[#161616]">{s.label}</span>
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
      </Card>
    </Shell>
  );
}

function Shell({ children, name }: { children: React.ReactNode; name?: string }) {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <div className="halftone-bg" style={{ backgroundSize: '22px 22px', opacity: 0.5, position: 'fixed', inset: 0, pointerEvents: 'none' }} aria-hidden />
      <div className="relative">
        <header className="border-b-2 border-[#161616] bg-[#FBF6EA]/95 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-9 w-auto" priority />
              <div className="min-w-0">
                <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.4em] text-[#C4160B]">Modern Mustard Seed</span>
                <p className="font-display text-lg font-semibold tracking-tight text-[#161616] truncate">
                  Client Factory{name ? ` · ${name}` : ''}
                </p>
              </div>
            </div>
            <Link
              href="/portal"
              className="shrink-0 font-sans text-[11px] font-bold uppercase tracking-[0.14em] px-3.5 py-2.5 rounded-lg border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#161616] transition-all"
            >
              Portal
            </Link>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">{children}</main>
      </div>
    </div>
  );
}
