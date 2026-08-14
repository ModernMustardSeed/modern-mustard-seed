'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Badge, Bar, Button, Card, Empty, Stat, ago, money, pct } from './ui';

/**
 * FACTORY OPERATIONS. Every Client Factory MMS runs, ranked by what needs a
 * person.
 *
 * Deliberately not an alphabetical list. At a thousand tenants nobody scrolls,
 * so the board opens on CRITICAL and NEEDS ATTENTION, healthy Factories collapse
 * into a count, and the platform economics sit at the top where an operator can
 * see whether the business is scaling or just getting busier.
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

const ORDER: Health['band'][] = ['critical', 'attention', 'new', 'paused', 'healthy', 'growth'];

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
  const quiet = new Set<Health['band']>(['healthy', 'growth']);
  const visible = showAll ? grouped : grouped.filter((g) => !quiet.has(g.band));
  const quietCount = grouped.filter((g) => quiet.has(g.band)).reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="factories" title="Factory Operations" onRefresh={() => void load(true)} />

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#161616]/60 max-w-2xl">
            Every Client Factory, ranked by what needs a person today. Healthy ones are meant to be invisible.
          </p>
          <div className="flex gap-2">
            <Link href="/admin/factories/library" className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold px-3 py-2 rounded-lg border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616]">
              Library
            </Link>
            <Link href="/admin/factories/new" className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold px-3 py-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616]">
              + New Client Factory
            </Link>
          </div>
        </div>

        {error && (
          <div className="border-2 border-[#E0301E] bg-[#E0301E]/[0.06] rounded-xl px-4 py-3 text-sm text-[#E0301E]">{error}</div>
        )}

        {platform && (
          <Card title="Platform">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Stat label="Factories" value={platform.factories} sub={`${platform.live} live`} />
              <Stat label="Customers" value={platform.customerTenants} sub={`${platform.tenants} tenants`} />
              <Stat label="Factory MRR" value={money(platform.mrrCents)} />
              <Stat label="Variable cost" value={money(platform.variableCostCents, 2)} sub="this month" />
              <Stat
                label="Gross margin"
                value={pct(platform.grossMarginPct)}
                tone={platform.grossMarginPct === null ? 'muted' : platform.grossMarginPct < 40 ? 'bad' : platform.grossMarginPct < 65 ? 'warn' : 'good'}
              />
              <Stat
                label="Below 40%"
                value={platform.unprofitable.length}
                tone={platform.unprofitable.length ? 'bad' : 'good'}
                sub={platform.unprofitable.map((u) => u.name).join(', ') || 'none'}
              />
            </div>
          </Card>
        )}

        {loading && !rows.length && <Empty>Scoring every Factory.</Empty>}

        {!loading && !rows.length && !error && (
          <Card>
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-[#161616]/60">No Client Factories yet.</p>
              <p className="text-xs text-[#161616]/45 max-w-md mx-auto">
                Run the bootstrap from the Library to seed the module, value action and template registries, then forge the first one.
              </p>
            </div>
          </Card>
        )}

        {visible.map((group) => (
          <div key={group.band} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone={group.band}>{BAND_LABEL[group.band]}</Badge>
              <span className="font-mono text-[10px] text-[#161616]/45">{group.items.length}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((row) => <FactoryCard key={row.id} row={row} />)}
            </div>
          </div>
        ))}

        {quietCount > 0 && !showAll && (
          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#161616]/60">
                {quietCount} Factor{quietCount === 1 ? 'y is' : 'ies are'} healthy and need nothing.
              </p>
              <Button onClick={() => setShowAll(true)}>Show them</Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

function FactoryCard({ row }: { row: Row }) {
  const paused = Object.entries(row.paused).filter(([, v]) => v).map(([k]) => k);
  const tone = row.health.overall < 45 ? 'bad' : row.health.overall < 70 ? 'warn' : 'good';

  return (
    <Link
      href={`/admin/factories/${row.id}`}
      className="block border-2 border-[#161616] bg-white rounded-xl shadow-[3px_3px_0_0_#161616] hover:shadow-[5px_5px_0_0_#161616] transition-shadow p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-sans font-bold text-[#161616] tracking-tight truncate">{row.name}</h3>
          <p className="text-xs text-[#161616]/50 truncate">{row.tenantName}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge tone={row.status}>{row.status}</Badge>
          {row.mode === 'test' && <Badge tone="test">test mode</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1"><Bar pct={row.health.overall} tone={tone} /></div>
        <span className="font-sans text-lg font-bold tabular-nums text-[#161616]">{row.health.overall}</span>
      </div>

      {row.health.reasons.length > 0 ? (
        <ul className="space-y-1">
          {row.health.reasons.slice(0, 3).map((reason) => (
            <li key={reason} className="text-xs text-[#161616]/70 flex gap-1.5">
              <span className="text-[#E0301E] shrink-0">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[#161616]/45">Nothing needs attention.</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#161616]/10">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#161616]/40">{row.planCode ?? 'no plan'}</span>
        <span className="text-[#161616]/20">/</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#161616]/40">{row.autonomy}</span>
        {row.templateKey && (
          <>
            <span className="text-[#161616]/20">/</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#161616]/40">{row.templateKey}</span>
          </>
        )}
        <span className="ml-auto font-mono text-[9px] text-[#161616]/35">{ago(row.health.at)}</span>
      </div>

      {paused.length > 0 && (
        <p className="text-[11px] text-[#E0301E] font-mono uppercase tracking-[0.14em]">Paused: {paused.join(', ')}</p>
      )}
    </Link>
  );
}
