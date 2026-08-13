'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Section, Stat, Chip, api, btnPrimary, btnGhost, btnDanger, inputCls, labelCls } from '@/components/admin/acquisition/ui';

type Campaign = {
  id: string;
  name: string;
  status: string;
  goal_clients: number;
  daily_send_cap: number;
  hourly_send_cap: number;
  send_start_hour: number;
  send_end_hour: number;
  send_weekdays_only: boolean;
  from_name: string;
  from_email: string;
  reply_to: string;
  step2_after_days: number;
  step3_after_days: number;
  max_call_attempts: number;
};
type Variant = { id: string; key: string; step: number; subject: string; cta_label: string; weight: number; active: boolean };
type Counts = { pending: number; claimed: number; done: number; failed: number; skipped: number; cancelled: number };

export default function CampaignScreen() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [draft, setDraft] = useState<Partial<Campaign>>({});

  const load = useCallback(async () => {
    try {
      const res = await api<{ campaign: Campaign; variants: Variant[]; counts: Counts }>('/api/admin/acquisition/campaign');
      setCampaign(res.campaign);
      setVariants(res.variants);
      setCounts(res.counts);
      setDraft({});
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the campaign.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    setNotice('');
    setError('');
    try {
      await api('/api/admin/acquisition/campaign', { method: 'POST', body: JSON.stringify({ action, ...extra }) });
      setNotice(`${action} done.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy('');
    }
  };

  const val = <K extends keyof Campaign>(k: K): Campaign[K] | undefined => (draft[k] as Campaign[K]) ?? campaign?.[k];

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#FBF6EA]">
        <AdminHeader active="acquisition" title="Acquisition" />
        <main className="max-w-6xl mx-auto px-5 py-6">
          <AcqNav active="campaign" />
          <p className="text-sm text-[#161616]/50">{error || 'Loading...'}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[86rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav
          active="campaign"
          right={
            <div className="flex gap-2">
              {campaign.status !== 'live' ? (
                <button className={btnPrimary} disabled={busy !== ''} onClick={() => void act(campaign.status === 'paused' ? 'resume' : 'start')}>
                  {campaign.status === 'paused' ? 'Resume' : 'Start'}
                </button>
              ) : (
                <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('pause')}>
                  Pause
                </button>
              )}
              <button className={btnDanger} disabled={busy !== ''} onClick={() => void act('stop')}>
                Stop
              </button>
            </div>
          }
        />

        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        <div className="grid lg:grid-cols-2 gap-6">
          <Section title={campaign.name} note={`Sending as ${campaign.from_name} <${campaign.from_email}>, replies to ${campaign.reply_to}.`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Status" value={campaign.status.toUpperCase()} tone={campaign.status === 'live' ? 'seed' : 'warn'} />
              <Stat label="Queued" value={counts?.pending ?? 0} />
              <Stat label="Sent" value={counts?.done ?? 0} />
              <Stat label="Skipped" value={counts?.skipped ?? 0} sub="Ineligible at send time" />
              <Stat label="Failed" value={counts?.failed ?? 0} tone={(counts?.failed ?? 0) > 0 ? 'red' : 'ink'} />
              <Stat label="Cancelled" value={counts?.cancelled ?? 0} sub="They converted or opted out" />
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <Num label="Daily send cap" k="daily_send_cap" val={val} setDraft={setDraft} />
              <Num label="Hourly send cap" k="hourly_send_cap" val={val} setDraft={setDraft} />
              <Num label="Window opens (Mountain)" k="send_start_hour" val={val} setDraft={setDraft} min={0} max={23} />
              <Num label="Window closes (Mountain)" k="send_end_hour" val={val} setDraft={setDraft} min={1} max={24} />
              <Num label="Days before email 2" k="step2_after_days" val={val} setDraft={setDraft} min={0} max={30} />
              <Num label="Days before email 3" k="step3_after_days" val={val} setDraft={setDraft} min={0} max={30} />
              <Num label="Max call attempts" k="max_call_attempts" val={val} setDraft={setDraft} min={1} max={5} />
              <Num label="Client goal" k="goal_clients" val={val} setDraft={setDraft} min={1} max={5000} />
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                className="accent-[#F5B700] w-4 h-4"
                checked={Boolean(val('send_weekdays_only'))}
                onChange={(e) => setDraft((d) => ({ ...d, send_weekdays_only: e.target.checked }))}
              />
              Weekdays only
            </label>
            <button
              className={`${btnPrimary} mt-4`}
              disabled={busy !== '' || Object.keys(draft).length === 0}
              onClick={() => void act('settings', draft as Record<string, unknown>)}
            >
              Save pacing
            </button>
            <p className="mt-3 text-xs text-[#161616]/55">
              Pacing protects the sending domain, which every client invoice and booking confirmation also rides on. The
              sender stops itself if the day&apos;s bounce rate crosses four percent.
            </p>
          </Section>

          <Section
            title="A/B tests"
            note="Optimized for purchases, not opens. A prospect is assigned deterministically, so the same person always lands in the same arm."
          >
            {[1, 2, 3].map((step) => (
              <div key={step} className="mb-5">
                <p className="text-[10px] uppercase tracking-[0.22em] font-oswald font-semibold text-[#161616]/50 mb-2">Email {step}</p>
                <div className="space-y-2">
                  {variants.filter((v) => v.step === step).map((v) => (
                    <div key={v.id} className="rounded-xl border-2 border-[#161616]/15 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Chip label={v.key} tone={v.active ? 'good' : 'neutral'} />
                        <label className="ml-auto flex items-center gap-1.5 text-[11px]">
                          <input
                            type="checkbox"
                            className="accent-[#F5B700]"
                            checked={v.active}
                            onChange={(e) => void act('variant', { variantId: v.id, active: e.target.checked })}
                          />
                          active
                        </label>
                      </div>
                      <input
                        className={inputCls}
                        defaultValue={v.subject}
                        onBlur={(e) => {
                          if (e.target.value !== v.subject) void act('variant', { variantId: v.id, subject: e.target.value });
                        }}
                      />
                      <input
                        className={`${inputCls} mt-2`}
                        defaultValue={v.cta_label}
                        onBlur={(e) => {
                          if (e.target.value !== v.cta_label) void act('variant', { variantId: v.id, cta_label: e.target.value });
                        }}
                      />
                    </div>
                  ))}
                  {variants.filter((v) => v.step === step).length === 0 && (
                    <p className="text-sm text-[#161616]/45">No variants for this step.</p>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-[#161616]/55">
              <code className="font-mono">{'{{first_name}}'}</code> falls back to the business name when we do not know a
              real first name. Nothing ever addresses a company as a person.
            </p>
          </Section>
        </div>

        <Section title="Run it" note="Both are safe to press twice.">
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} disabled={busy !== ''} onClick={() => void act('enroll', { queue: true })}>
              Enroll eligible and queue email one
            </button>
            <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('drain', { limit: 25 })}>
              Send the next batch now
            </button>
          </div>
        </Section>
      </main>
    </div>
  );
}

function Num({
  label,
  k,
  val,
  setDraft,
  min = 0,
  max = 100000,
}: {
  label: string;
  k: keyof Campaign;
  val: <K extends keyof Campaign>(k: K) => Campaign[K] | undefined;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Campaign>>>;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        className={inputCls}
        type="number"
        min={min}
        max={max}
        value={Number(val(k) ?? 0)}
        onChange={(e) => setDraft((d) => ({ ...d, [k]: Number(e.target.value) }))}
      />
    </div>
  );
}
