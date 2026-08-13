'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Section, Stat, Chip, api, card, btnPrimary, btnGhost, btnDanger, inputCls, labelCls, eyebrow } from '@/components/admin/acquisition/ui';

type Settings = {
  master_paused: boolean;
  sourcing_enabled: boolean;
  enrichment_enabled: boolean;
  email_enabled: boolean;
  calls_enabled: boolean;
  followups_enabled: boolean;
  daily_sourcing_enabled: boolean;
  daily_sourcing_target: number;
  daily_sourcing_split: Record<string, number>;
  total_campaign_max: number;
  min_lead_score: number;
  paused_reason: string | null;
  updated_at: string;
};
type Check = { id: string; level: string; label: string; detail: string; fix: string };
type Payload = { settings: Settings; preflight: { checks: Check[]; blockers: Check[]; warnings: Check[] }; counts: Record<string, number> };

const TOGGLES: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'sourcing_enabled', label: 'Lead sourcing', hint: 'The Lead Finder may start new runs.' },
  { key: 'enrichment_enabled', label: 'Enrichment', hint: 'Re-researching prospects we already hold.' },
  { key: 'email_enabled', label: 'Outbound email', hint: 'The MEET MR. MUSTARD sequence and every follow-up.' },
  { key: 'calls_enabled', label: 'Mr. Mustard calls', hint: 'New outbound demo calls. Consent is still required for each one.' },
  { key: 'followups_enabled', label: 'Follow-up automation', hint: 'The behaviour-driven nudges after a call or a demo.' },
];

export default function SettingsScreen() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<Payload>('/api/admin/acquisition/settings'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load settings.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    setNotice('');
    try {
      await api('/api/admin/acquisition/settings', { method: 'POST', body: JSON.stringify(patch) });
      setNotice('Saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save.');
    } finally {
      setBusy(false);
    }
  };

  const s = data?.settings;
  const status = s?.master_paused ? 'PAUSED' : (data?.preflight.blockers.length ?? 0) > 0 ? 'ERROR' : 'LIVE';

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[74rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav active="settings" />
        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        {!s ? (
          <p className="text-sm text-[#161616]/50">Loading...</p>
        ) : (
          <div className="space-y-6">
            {/* ── the master switch ── */}
            <section
              className={`${card} p-6 ${s.master_paused ? 'bg-[#F5B700]/20' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className={eyebrow}>Master switch</p>
                  <h2 className="mt-1 font-oswald text-3xl font-bold uppercase tracking-tight">
                    {status === 'LIVE' ? 'The engine is live' : status === 'PAUSED' ? 'Everything is paused' : 'Blocked'}
                  </h2>
                  <p className="mt-1 text-sm text-[#161616]/65 max-w-xl">
                    {s.master_paused
                      ? s.paused_reason || 'No email, no follow-up and no new call leaves the building. Queue state is untouched, so resuming continues rather than restarting.'
                      : 'Outbound email, follow-ups and Mr. Mustard calls are all allowed, within the campaign pacing.'}
                  </p>
                </div>
                {s.master_paused ? (
                  <button className={btnPrimary} disabled={busy} onClick={() => void save({ master_paused: false })}>
                    Release the pause
                  </button>
                ) : (
                  <button
                    className={btnDanger}
                    disabled={busy}
                    onClick={() => void save({ master_paused: true, reason: 'Master pause pressed in Acquisition settings.' })}
                  >
                    MASTER PAUSE
                  </button>
                )}
              </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-6">
              <Section title="Individual switches" note="Narrower than the master pause, for when one part needs holding.">
                <div className="space-y-3">
                  {TOGGLES.map((t) => (
                    <label key={String(t.key)} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-[#F5B700] w-4 h-4"
                        checked={Boolean(s[t.key])}
                        disabled={busy}
                        onChange={(e) => void save({ [t.key]: e.target.checked })}
                      />
                      <span>
                        <span className="text-[14px] font-semibold">{t.label}</span>
                        <span className="block text-[12px] text-[#161616]/55">{t.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </Section>

              <Section title="Limits" note="The ceilings that keep this from becoming a machine nobody can steer.">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Minimum lead score to email</label>
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={s.min_lead_score}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== s.min_lead_score) void save({ min_lead_score: Number(e.target.value) });
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Total campaign maximum</label>
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      defaultValue={s.total_campaign_max}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== s.total_campaign_max) void save({ total_campaign_max: Number(e.target.value) });
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-[#F5B700] w-4 h-4"
                      checked={s.daily_sourcing_enabled}
                      disabled={busy}
                      onChange={(e) => void save({ daily_sourcing_enabled: e.target.checked })}
                    />
                    <span>
                      <span className="text-[14px] font-semibold">Automatic daily sourcing</span>
                      <span className="block text-[12px] text-[#161616]/55">
                        Off by default on purpose. Uncontrolled sourcing is how a prospect list becomes a liability.
                      </span>
                    </span>
                  </label>
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>New prospects a day</label>
                      <input
                        className={inputCls}
                        type="number"
                        min={0}
                        max={2000}
                        defaultValue={s.daily_sourcing_target}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== s.daily_sourcing_target) void save({ daily_sourcing_target: Number(e.target.value) });
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Split</label>
                      <p className="text-[13px] pt-2.5 font-mono">
                        {Object.entries(s.daily_sourcing_split).map(([k, v]) => `${k} ${v}`).join(' · ')}
                      </p>
                    </div>
                  </div>
                </div>
              </Section>
            </div>

            {/*
              A standing decision, written where it cannot be missed. Two
              systems can technically mail this prospect list, and two systems
              mailing one list is the single worst outcome available: duplicate
              cold email from the same domain to the same contractor.
            */}
            <Section title="Who owns MMS outbound" note="A standing decision, not a setting. Changing it is a deliberate act.">
              <p className="text-[14px] leading-relaxed text-[#161616]/80">
                <strong>This engine owns Modern Mustard Seed&apos;s own outbound.</strong> It holds the prospects, the
                consent ledger, the governor and the send history, and every send it makes is counted against one rolling
                ceiling.
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#161616]/80">
                Client Factory sells the machine to other businesses. Its MMS tenant stays in test mode with outreach
                paused, which is how it was built. If that ever changes, turn this engine off first, in this order, or
                the same contractor gets the same cold email twice from the same domain.
              </p>
              <p className="mt-2 text-[12px] font-mono text-[#161616]/50">
                acq_* tables and the outbound governor · factory_* tables and the blueprint compiler
              </p>
            </Section>

            <Section title="Production readiness" note="Checked live. A blocker means the campaign refuses to start.">
              <ul className="space-y-2">
                {data.preflight.checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-3">
                    <Chip label={c.level} tone={c.level === 'ok' ? 'good' : c.level === 'warning' ? 'warn' : 'bad'} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold">{c.label}</p>
                      <p className="text-[12px] text-[#161616]/65 leading-snug">{c.detail}</p>
                      {c.fix && <p className="text-[12px] font-mono text-[#a32315]">{c.fix}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Queue health" right={<button className={btnGhost} disabled={busy} onClick={() => void save({ action: 'reclaim' })}>Reclaim stuck jobs</button>}>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {Object.entries(data.counts).map(([k, v]) => (
                  <Stat key={k} label={k} value={v} tone={k === 'failed' && v > 0 ? 'red' : 'ink'} />
                ))}
              </div>
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}
