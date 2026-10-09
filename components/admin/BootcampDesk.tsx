'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { BOOTCAMP } from '@/data/bootcamp';
import DeskTab from '@/components/admin/bootcamp/DeskTab';
import OutreachTab from '@/components/admin/bootcamp/OutreachTab';
import HostsTab from '@/components/admin/bootcamp/HostsTab';
import RegistrationsTab from '@/components/admin/bootcamp/RegistrationsTab';
import KitTab from '@/components/admin/bootcamp/KitTab';
import PlanTab from '@/components/admin/bootcamp/PlanTab';
import OfferTab from '@/components/admin/bootcamp/OfferTab';
import StageTab from '@/components/admin/bootcamp/StageTab';
import WebsiteLinks from '@/components/admin/WebsiteLinks';
import { api, type HostRow, type StatsPayload } from '@/components/admin/bootcamp/shared';

export type { HostRow } from '@/components/admin/bootcamp/shared';

/**
 * THE BOOTCAMP DESK. Eight tabs: the numbers, the offer as sold, the stage (live links, the
 * offer switch, the question queue, replays and worksheets), the host
 * outreach engine and its switch, host approvals, registrations, the
 * marketing kit (the commercial first, then every piece of copy) and The Plan.
 * Hosts arrive as props from the server page (their links are signed there);
 * everything else loads from /api/admin/bootcamp/*.
 */

type TabKey = 'desk' | 'offer' | 'stage' | 'outreach' | 'hosts' | 'registrations' | 'kit' | 'plan' | 'links';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'desk', label: 'Desk' },
  { key: 'offer', label: 'The Offer' },
  { key: 'stage', label: 'Stage' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'hosts', label: 'Hosts' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'kit', label: 'Marketing Kit' },
  { key: 'plan', label: 'The Plan' },
  { key: 'links', label: 'Links' },
];

function readTab(): TabKey {
  if (typeof window === 'undefined') return 'desk';
  const h = window.location.hash.replace('#', '') as TabKey;
  return TABS.some((t) => t.key === h) ? h : 'desk';
}

export default function BootcampDesk({ hosts, hostsError }: { hosts: HostRow[]; hostsError: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('desk');
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [statsError, setStatsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setTab(readTab());
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      setStats(await api<StatsPayload>('/api/admin/bootcamp/stats'));
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Could not load the numbers.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const refresh = useCallback(() => {
    void loadStats();
    router.refresh();
  }, [loadStats, router]);

  const pick = (key: TabKey) => {
    setTab(key);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${key}`);
  };

  const applied = stats?.hosts.applied ?? hosts.filter((h) => h.status === 'applied').length;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="bootcamp" title="Bootcamp" onRefresh={refresh} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-2">{BOOTCAMP.launch.replace('-', ' ')}</span>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#161616]">{BOOTCAMP.name}</h1>
            <p className="font-body text-sm text-[#3A3733] mt-2 max-w-2xl">
              The offer as sold, the commercial, seats, hosts, the outreach engine, the registrations, every piece of launch copy, and the plan it all climbs. Prices and dates live in <code className="font-mono text-xs">data/bootcamp.ts</code>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/bootcamp" target="_blank" rel="noopener noreferrer" className="rounded-full border-2 border-[#161616] bg-white px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#161616]">
              Offer page
            </a>
            <a href="/bootcamp/masterclass" target="_blank" rel="noopener noreferrer" className="rounded-full border-2 border-[#161616] bg-white px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#161616]">
              Masterclass
            </a>
            <a href="/bootcamp/host" target="_blank" rel="noopener noreferrer" className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#161616]">
              Host a Room
            </a>
          </div>
        </header>

        <nav aria-label="Bootcamp desk tabs" className="flex flex-wrap gap-1.5 border-b-2 border-[#161616] pb-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => pick(t.key)}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap text-[11px] uppercase tracking-[0.12em] font-sans font-semibold px-3 py-2 rounded-lg border-2 transition-colors ${
                  active ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]' : 'border-transparent text-[#161616]/60 hover:text-[#161616] hover:bg-[#161616]/[0.05]'
                }`}
              >
                {t.label}
                {t.key === 'hosts' && applied > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-mono font-bold text-white bg-[#E0301E] rounded-full align-middle">{applied}</span>
                )}
              </button>
            );
          })}
        </nav>

        {tab === 'desk' && <DeskTab stats={stats} error={statsError} loading={statsLoading} />}
        {tab === 'offer' && <OfferTab />}
        {tab === 'stage' && <StageTab />}
        {tab === 'outreach' && <OutreachTab onChanged={() => void loadStats()} />}
        {tab === 'hosts' && <HostsTab hosts={hosts} error={hostsError} onChanged={refresh} />}
        {tab === 'registrations' && <RegistrationsTab />}
        {tab === 'kit' && <KitTab />}
        {tab === 'plan' && <PlanTab />}
        {tab === 'links' && <WebsiteLinks bootcampOnly />}
      </main>
    </div>
  );
}
