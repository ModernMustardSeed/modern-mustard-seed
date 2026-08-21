'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Section, Stat, Chip, api, card, cardFlat, btnGhost, timeAgo, pct } from '@/components/admin/acquisition/ui';
import { usePoll } from '@/lib/use-poll';

type Funnel = {
  source: string; label: string; requests: number; consented: number; called: number; completed: number;
  failed: number; refused: number; forged: number; paid: number;
  consentRatePct: number | null; completionRatePct: number | null; forgeRatePct: number | null; paidRatePct: number | null;
};
type Payload = {
  analytics: {
    today: { requests: number; calls: number; completed: number; forged: number; paid: number };
    allTime: { requests: number; calls: number; completed: number; forged: number; paid: number };
    bySource: Funnel[];
    recent: { id: string; source: string; label: string; phone: string | null; business: string | null; status: string; leadId: string | null; createdAt: string }[];
    links: { active: number; used: number; expired: number };
  };
  surface: { slug: string; name: string; cooldown_minutes: number; max_per_phone_per_day: number; max_per_ip_per_hour: number; consent_version: string };
  baseUrl: string;
  entryPoints: { source: string; url: string }[];
};

const STATUS_TONE: Record<string, 'good' | 'warn' | 'bad' | 'neutral'> = {
  completed: 'good', connected: 'good', calling: 'warn', consented: 'warn',
  started: 'neutral', failed: 'bad', refused: 'bad', cancelled: 'neutral',
};

export default function MustardEngine() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async (background = false) => {
    try {
      setData(await api<Payload>('/api/admin/acquisition/mustard'));
      setError('');
    } catch (e) {
      if (!background) setError(e instanceof Error ? e.message : 'Could not load the demo engine.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Live while the panel is on screen, silent while the tab is in the background.
  usePoll(() => void load(true), 30000);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Could not copy. Select the link and copy it by hand.');
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
        <AdminHeader active="acquisition" title="Acquisition" />
        <main className="max-w-6xl mx-auto px-5 py-6">
          <AcqNav active="mustard" />
          <p className="text-sm text-[#161616]/65">{error || 'Counting...'}</p>
        </main>
      </div>
    );
  }

  const a = data.analytics;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[92rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav
          active="mustard"
          right={
            <a className={btnGhost} href={data.baseUrl} target="_blank" rel="noopener noreferrer">
              Open /mustard ↗
            </a>
          }
        />
        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}

        <div className="grid sm:grid-cols-5 gap-3 mb-6">
          <Stat label="Demo requests today" value={a.today.requests} big />
          <Stat label="Calls today" value={a.today.calls} tone="mustard" />
          <Stat label="Completed today" value={a.today.completed} tone="seed" big />
          <Stat label="Forged today" value={a.today.forged} tone="seed" />
          <Stat label="Paid today" value={a.today.paid} tone="seed" big />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
          <Section
            title="The funnel, by where they came from"
            note="One page, one query parameter, every channel. A new channel is tried by inventing a URL, not by shipping a page."
          >
            {a.bySource.length === 0 ? (
              <p className="text-sm text-[#161616]/60">
                Nobody has come through the door yet. Paste one of the links on the right into a Facebook group or a DM.
              </p>
            ) : (
              <div className={`${card} overflow-x-auto`}>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b-2 border-[#161616] text-left">
                      {['Source', 'Requests', 'Consented', 'Called', 'Completed', 'Forged', 'Paid', 'Consent', 'Completion', 'Paid rate'].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-oswald font-semibold text-[#161616]/65 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {a.bySource.map((s) => (
                      <tr key={s.source} className="border-b border-[#161616]/10">
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">{s.label}</td>
                        <Num v={s.requests} />
                        <Num v={s.consented} />
                        <Num v={s.called} />
                        <Num v={s.completed} />
                        <Num v={s.forged} />
                        <td className="px-3 py-2 text-right font-oswald font-bold tabular-nums text-[#3f5d34]">{s.paid}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[#161616]/60">{pct(s.consentRatePct)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[#161616]/60">{pct(s.completionRatePct)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[#161616]/60">{pct(s.paidRatePct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-[#161616]/65">
              All time: {a.allTime.requests} requests, {a.allTime.calls} calls, {a.allTime.completed} completed,{' '}
              {a.allTime.forged} forged, {a.allTime.paid} paid.
            </p>
          </Section>

          <div className="space-y-6">
            <Section title="Your links" note="Copy one, paste it in the DM. The source is the whole tracking system.">
              <ul className="space-y-1.5">
                {data.entryPoints.map((e) => (
                  <li key={e.source} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 text-[12px] font-oswald uppercase tracking-[0.08em] text-[#161616]/65">
                      {e.source.replace(/-/g, ' ')}
                    </span>
                    <button
                      onClick={() => void copy(e.url, e.source)}
                      className="flex-1 min-w-0 text-left truncate rounded-lg border-2 border-[#161616]/15 hover:border-[#161616] px-2.5 py-1.5 font-mono text-[11px] transition-colors"
                      title={e.url}
                    >
                      {copied === e.source ? 'Copied' : e.url.replace(/^https:\/\//, '')}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-[#161616]/65">
                For one specific prospect, open them in Prospects and press <strong>Send Mustard link</strong>. That one
                prefills their number so they type nothing. It still does not consent for them.
              </p>
            </Section>

            <Section title="Guardrails" note="What stops this being a robocall gun aimed at somebody else's phone.">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Cooldown" value={`${data.surface.cooldown_minutes} min`} sub="per number" />
                <Stat label="Per number" value={`${data.surface.max_per_phone_per_day}/day`} />
                <Stat label="Per connection" value={`${data.surface.max_per_ip_per_hour}/hour`} />
                <Stat label="Consent version" value={data.surface.consent_version} />
              </div>
              <p className="mt-3 rounded-lg border-2 border-[#F5B700] bg-[#F5B700]/15 px-3 py-2 text-[12px] leading-snug">
                Consent copy is versioned in code and stored whole on every record. Have counsel review it before
                large-scale national use.
              </p>
              <p className="mt-2 text-xs text-[#161616]/65">
                Magic links: {data.analytics.links.active} active, {data.analytics.links.used} used,{' '}
                {data.analytics.links.expired} expired.
              </p>
            </Section>
          </div>
        </div>

        <Section title="Who just knocked" note="The last forty people through the door.">
          {a.recent.length === 0 ? (
            <p className="text-sm text-[#161616]/60">Nothing yet.</p>
          ) : (
            <ul className="space-y-1.5 max-h-[26rem] overflow-y-auto pr-1">
              {a.recent.map((r) => (
                <li key={r.id} className={`${cardFlat} px-3 py-2 flex flex-wrap items-center gap-2`}>
                  <Chip label={r.status} tone={STATUS_TONE[r.status] ?? 'neutral'} />
                  <Chip label={r.label} />
                  <span className="font-mono text-[12px]">{r.phone ?? '—'}</span>
                  {r.leadId ? (
                    <Link href={`/admin/acquisition/prospects/${r.leadId}`} className="font-semibold text-[13px] hover:underline truncate">
                      {r.business ?? 'Open the prospect'}
                    </Link>
                  ) : (
                    <span className="text-[13px] text-[#161616]/65">{r.business ?? 'no prospect linked'}</span>
                  )}
                  <span className="ml-auto font-mono text-[11px] text-[#161616]/60">{timeAgo(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </main>
    </div>
  );
}

function Num({ v }: { v: number }) {
  return <td className="px-3 py-2 text-right font-mono tabular-nums text-[#161616]/70">{v.toLocaleString()}</td>;
}
