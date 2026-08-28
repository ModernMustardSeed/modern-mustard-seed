'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Badge, Button, Card, Dial, Empty, Eyebrow, LinkButton, Notice, Page, PageTitle, Shell, Skeleton,
  ago, figure, money, num, pct, toneForScore,
} from './ui';

/**
 * FACTORY OPERATIONS. Every Client Factory MMS runs, ranked by what needs a
 * person.
 *
 * Deliberately not an alphabetical list. At a thousand tenants nobody scrolls,
 * so the board opens on CRITICAL and NEEDS ATTENTION, healthy Factories
 * collapse into a single line you can expand, and the platform economics sit
 * on the ink band at the top where an operator sees whether the business is
 * scaling or just getting busier.
 */

type Health = {
  overall: number;
  band: 'critical' | 'attention' | 'healthy' | 'growth' | 'new' | 'paused';
  dimensions: Record<string, { score: number; note: string }>;
  reasons: string[];
  at: string;
};

type Row = {
  id: string;
  name: string;
  tenantId: string;
  tenantName: string;
  planCode: string | null;
  status: string;
  mode: string;
  autonomy: string;
  templateKey: string | null;
  activatedAt: string | null;
  health: Health;
  paused: { sourcing: boolean; outreach: boolean; ai: boolean; followup: boolean };
};

type Platform = {
  factories: number;
  live: number;
  tenants: number;
  customerTenants: number;
  mrrCents: number;
  variableCostCents: number;
  grossMarginPct: number | null;
  unprofitable: { name: string; grossPct: number | null }[];
};

const BAND_LABEL: Record<Health['band'], string> = {
  critical: 'Critical',
  attention: 'Needs attention',
  new: 'New',
  paused: 'Paused',
  healthy: 'Healthy',
  growth: 'High growth',
};

const BAND_NOTE: Record<Health['band'], string> = {
  critical: 'Something is broken. These come first.',
  attention: 'Running, but a number is heading the wrong way.',
  new: 'Inside the first two weeks. Too early to judge.',
  paused: 'Stopped on purpose, by us or by the customer.',
  healthy: 'Nothing needs a person today.',
  growth: 'Healthy and pulling ahead.',
};

const ORDER: Health['band'][] = ['critical', 'attention', 'new', 'paused', 'healthy', 'growth'];
const QUIET = new Set<Health['band']>(['healthy', 'growth']);

export default function FactoryOperations() {
  const [rows, setRows] = useState<Row[]>([]);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/factories${refresh ? '?refresh=1' : ''}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not load the Factories.');
      setRows(json.factories ?? []);
      setPlatform(json.platform ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the Factories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const grouped = ORDER.map((band) => ({ band, items: rows.filter((r) => r.health.band === band) })).filter((g) => g.items.length);
  const visible = showAll ? grouped : grouped.filter((g) => !QUIET.has(g.band));
  const quietCount = grouped.filter((g) => QUIET.has(g.band)).reduce((s, g) => s + g.items.length, 0);
  const attention = rows.filter((r) => r.health.band === 'critical' || r.health.band === 'attention').length;

  return (
    <Shell>
      <AdminHeader active="factories" title="Factory Operations" onRefresh={() => void load(true)} />
      <Page>
        <PageTitle
          eyebrow="Client Factory"
          title={<>Every machine, ranked by <em className="font-display italic">what needs you</em></>}
          sub="Healthy Factories are meant to be invisible. What is left on this screen is the work."
          actions={
            <>
              <LinkButton href="/admin/factories/library">Library</LinkButton>
              <LinkButton href="/admin/factories/new" tone="primary">+ New Client Factory</LinkButton>
            </>
          }
        />

        {error && <Notice kind="bad">{error}</Notice>}

        {platform && (
          <Card tone="ink" eyebrow="The platform" title="What the whole thing is doing" right={<Badge tone={attention ? 'attention' : 'healthy'}>{attention ? `${attention} need attention` : 'all clear'}</Badge>}>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
              <DarkStat label="Factories" value={num(platform.factories)} sub={`${platform.live} live`} />
              <DarkStat label="Customers" value={num(platform.customerTenants)} sub={`${platform.tenants} tenants total`} />
              <DarkStat label="Factory MRR" value={money(platform.mrrCents)} sub="recurring" />
              <DarkStat label="Variable cost" value={money(platform.variableCostCents, 2)} sub="this month" />
              <DarkStat
                label="Gross margin"
                value={pct(platform.grossMarginPct)}
                sub={platform.grossMarginPct === null ? 'no revenue connected' : platform.grossMarginPct < 40 ? 'below the 40% floor' : 'healthy'}
                tone={platform.grossMarginPct === null ? 'muted' : platform.grossMarginPct < 40 ? 'bad' : 'good'}
              />
              <DarkStat
                label="Below 40%"
                value={num(platform.unprofitable.length)}
                sub={platform.unprofitable.map((u) => u.name).join(', ') || 'nobody'}
                tone={platform.unprofitable.length ? 'bad' : 'good'}
              />
            </div>
          </Card>
        )}

        {loading && !rows.length && (
          <Card eyebrow="Working" title="Scoring every Factory"><Skeleton rows={4} /></Card>
        )}

        {!loading && !rows.length && !error && (
          <Card>
            <Empty
              title="No Client Factories yet"
              action={<LinkButton href="/admin/factories/new" tone="primary">Build the first one</LinkButton>}
            >
              A Factory starts from a customer&apos;s website. The Build reads it, picks a template, and writes the blueprint you review.
            </Empty>
          </Card>
        )}

        {visible.map((group) => (
          <section key={group.band} className="space-y-3">
            <div className="border-b-2 border-[#161616]/15 pb-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-[#161616]">
                  {BAND_LABEL[group.band]}
                </h2>
                <span className={`${figure} text-lg text-[#5C5850]`}>{group.items.length}</span>
                <p className="font-body text-[13px] text-[#3A362D]">{BAND_NOTE[group.band]}</p>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {group.items.map((row) => <FactoryCard key={row.id} row={row} />)}
            </div>
          </section>
        ))}

        {quietCount > 0 && !showAll && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Eyebrow>Quiet</Eyebrow>
                <p className="font-display text-lg font-semibold text-[#161616] mt-1">
                  {quietCount} Factor{quietCount === 1 ? 'y is' : 'ies are'} healthy and need nothing
                </p>
                <p className="font-body text-[14px] text-[#3A362D] mt-1">That is the whole point. Open them only if you want to.</p>
              </div>
              <Button onClick={() => setShowAll(true)}>Show them anyway</Button>
            </div>
          </Card>
        )}
      </Page>
    </Shell>
  );
}

function DarkStat({ label, value, sub, tone = 'ink' }: { label: string; value: string; sub?: string; tone?: 'ink' | 'good' | 'bad' | 'muted' }) {
  const color = tone === 'good' ? 'text-[#7FD79B]' : tone === 'bad' ? 'text-[#FF9A8F]' : tone === 'muted' ? 'text-[#B8B2A4]' : 'text-white';
  // A long value ("Not measurable") steps down rather than dominating a row of
  // short counts, which is what it did on the first pass.
  const scale = value.length > 9 ? 'text-lg' : 'text-[26px]';
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">{label}</div>
      <div className={`${figure} ${scale} mt-1.5 ${color}`}>{value}</div>
      {sub && <div className="font-body text-[12px] text-[#CFC9BA] mt-1.5 leading-snug truncate">{sub}</div>}
    </div>
  );
}

function FactoryCard({ row }: { row: Row }) {
  const paused = Object.entries(row.paused).filter(([, v]) => v).map(([k]) => k);

  return (
    <Link
      href={`/admin/factories/${row.id}`}
      className="group block rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#161616] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/40"
    >
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <Eyebrow>{row.tenantName}</Eyebrow>
          <h3 className="font-display text-xl font-semibold tracking-tight text-[#161616] mt-1 leading-tight break-words">{row.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <Badge tone={row.status}>{row.status}</Badge>
            {row.mode === 'test' && <Badge tone="test">test mode</Badge>}
            <Badge tone="draft">{row.autonomy}</Badge>
          </div>
        </div>
        <Dial score={row.health.overall} size={96} />
      </div>

      <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
        {row.health.reasons.length > 0 ? (
          <ul className="space-y-1.5">
            {row.health.reasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex gap-2 font-body text-[13px] text-[#3A362D] leading-snug">
                <span className="text-[#C4160B] font-bold shrink-0" aria-hidden>&rsaquo;</span>
                <span>{reason}</span>
              </li>
            ))}
            {row.health.reasons.length > 3 && (
              <li className="font-body text-[13px] text-[#5C5850]">and {row.health.reasons.length - 3} more</li>
            )}
          </ul>
        ) : (
          <p className="font-body text-[13px] text-[#3A362D]">Nothing needs attention on this one.</p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {Object.entries(row.health.dimensions)
            .sort((a, b) => a[1].score - b[1].score)
            .slice(0, 2)
            .map(([key, dim]) => (
              <div key={key} className="flex items-baseline justify-between gap-2">
                <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#5C5850] truncate">{key}</dt>
                <dd className={`${figure} text-[13px] ${dim.score < 45 ? 'text-[#C4160B]' : dim.score < 70 ? 'text-[#8A5A00]' : 'text-[#1B6B3A]'}`}>{dim.score}</dd>
              </div>
            ))}
        </dl>

        {paused.length > 0 && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#8E1007]">
            Paused: {paused.join(', ')}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 border-t-2 border-[#161616]/12 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5C5850]">
          <span>{row.planCode ?? 'no plan'}</span>
          <span aria-hidden className="text-[#161616]/25">/</span>
          <span>{row.templateKey ?? 'no template'}</span>
          <span className="ml-auto normal-case tracking-normal">scored {ago(row.health.at)}</span>
        </div>
      </div>
    </Link>
  );
}
