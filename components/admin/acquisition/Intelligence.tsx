'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Section, Stat, api, card, pct } from '@/components/admin/acquisition/ui';

type Segment = {
  key: string;
  label: string;
  prospects: number;
  emailed: number;
  consented: number;
  conversations: number;
  demos: number;
  clients: number;
  permissionRatePct: number | null;
  closeRatePct: number | null;
};
type Payload = {
  intel: {
    byTrade: Segment[];
    byCity: Segment[];
    byVariant: Segment[];
    objections: { label: string; count: number }[];
    scenarios: { label: string; count: number; clients: number }[];
    conversationsPerSale: number | null;
  };
  stats: {
    funnel: { stage: string; label: string; count: number; fromPrevious: number | null }[];
    goal: { goal: number; clients: number; remaining: number; observedRate: number | null; prospectsNeeded: number | null };
    totals: Record<string, number | null>;
  };
  variants: { id: string; key: string; step: number; subject: string; active: boolean }[];
};

export default function Intelligence() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<Payload>('/api/admin/acquisition/intelligence'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load campaign intelligence.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subjectFor = (key: string, step: number): string =>
    data?.variants.find((v) => v.key === key && v.step === step)?.subject ?? key;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[86rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav active="intelligence" />
        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}

        {!data ? (
          <p className="text-sm text-[#161616]/65">Loading...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-4 gap-3">
              <Stat
                label="Conversations per sale"
                value={data.intel.conversationsPerSale ?? 'Not yet'}
                tone="mustard"
                big
                sub="Completed Mr. Mustard calls per client"
              />
              <Stat label="Clients" value={data.stats.goal.clients} tone="seed" big />
              <Stat
                label="Prospects still needed"
                value={data.stats.goal.prospectsNeeded?.toLocaleString() ?? 'Not yet'}
                sub={data.stats.goal.observedRate ? `At ${(data.stats.goal.observedRate * 100).toFixed(2)}% observed` : 'Needs a win first'}
              />
              <Stat label="Permission clicks" value={Number(data.stats.totals.permissionClicks ?? 0)} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <SegmentTable title="Which trade converts" note="HVAC vs plumbing vs roofing, on this campaign's own numbers." rows={data.intel.byTrade} />
              <SegmentTable
                title="Which email earns the call"
                note="Ranked by clients, not by opens. An open is not a customer."
                rows={data.intel.byVariant.map((v) => ({ ...v, label: subjectFor(v.key.replace('Variant ', ''), 1) }))}
              />
            </div>

            <SegmentTable title="Which city converts" note="Top twenty five markets by clients, then consent." rows={data.intel.byCity} />

            <div className="grid lg:grid-cols-2 gap-6">
              <Section title="What they object to" note="Pulled from what Mr. Mustard logged at the end of each call.">
                {data.intel.objections.length === 0 ? (
                  <p className="text-sm text-[#161616]/60">No objections recorded yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.intel.objections.map((o) => (
                      <li key={o.label} className="flex items-center gap-3">
                        <span className="flex-1 text-[13px]">{o.label}</span>
                        <span className="w-32 h-2 rounded-full bg-[#161616]/10 overflow-hidden">
                          <span
                            className="block h-full bg-[#E0301E]"
                            style={{ width: `${(o.count / Math.max(1, data.intel.objections[0].count)) * 100}%` }}
                          />
                        </span>
                        <span className="w-8 text-right font-mono text-[12px] tabular-nums">{o.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Which roleplay converts" note="The scenario he acted out, and how many of those became clients.">
                {data.intel.scenarios.length === 0 ? (
                  <p className="text-sm text-[#161616]/60">No roleplays recorded yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.intel.scenarios.map((s) => (
                      <li key={s.label} className="flex items-center gap-3 text-[13px]">
                        <span className="flex-1 truncate">{s.label}</span>
                        <span className="font-mono text-[12px] tabular-nums text-[#161616]/65">{s.count} run</span>
                        <span className="font-mono text-[12px] tabular-nums text-[#3f5d34] w-16 text-right">{s.clients} won</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SegmentTable({ title, note, rows }: { title: string; note: string; rows: Segment[] }) {
  return (
    <Section title={title} note={note}>
      {rows.length === 0 ? (
        <p className="text-sm text-[#161616]/60">Nothing to compare yet.</p>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-2 border-[#161616] text-left">
                {['', 'Prospects', 'Emailed', 'Consented', 'Talked', 'Demos', 'Clients', 'Permission', 'Close'].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-oswald font-semibold text-[#161616]/65 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-[#161616]/10">
                  <td className="px-3 py-2 font-semibold max-w-[18rem] truncate" title={r.label}>
                    {r.label}
                  </td>
                  <Num v={r.prospects} />
                  <Num v={r.emailed} />
                  <Num v={r.consented} />
                  <Num v={r.conversations} />
                  <Num v={r.demos} />
                  <td className="px-3 py-2 text-right font-oswald font-bold tabular-nums text-[#3f5d34]">{r.clients}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-[#161616]/60">{pct(r.permissionRatePct)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-[#161616]/60">{pct(r.closeRatePct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function Num({ v }: { v: number }) {
  return <td className="px-3 py-2 text-right font-mono tabular-nums text-[#161616]/70">{v.toLocaleString()}</td>;
}
