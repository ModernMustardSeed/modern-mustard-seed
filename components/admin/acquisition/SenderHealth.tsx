'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import TheHold, { useHold } from '@/components/admin/acquisition/TheHold';
import { AcqNav, Section, Stat, Chip, api, card, cardFlat, btnPrimary, btnGhost, btnDanger, inputCls, labelCls, eyebrow } from '@/components/admin/acquisition/ui';

type Check = { id: string; label: string; level: 'pass' | 'warning' | 'error' | 'unknown'; detail: string; fix?: string };
type Health = {
  domain: string;
  identity: string;
  state: string;
  stateLabel: string;
  stateReason: string | null;
  checks: Check[];
  volume: { sent24h: number; sent1h: number; allowance: number; ceiling: number; hourlyCap: number; usedPct: number };
  rates: { bouncePct: number | null; complaintPct: number | null; unsubPct: number | null; measurable: boolean; maxBouncePct: number; maxComplaintPct: number };
  statuses: Record<string, number>;
  ramp: { steps: number[]; current: number; next: number | null };
  worst: string;
};

const TONE: Record<string, 'good' | 'warn' | 'bad' | 'neutral'> = { pass: 'good', warning: 'warn', error: 'bad', unknown: 'neutral' };

export default function SenderHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const { hold, reload: reloadHold } = useHold();

  const load = useCallback(async () => {
    try {
      const res = await api<{ health: Health }>('/api/admin/acquisition/sender-health');
      setHealth(res.health);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read sender health.');
    }
    reloadHold();
  }, [reloadHold]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(String(body.action));
    setNotice('');
    try {
      const res = await api<{ health: Health; result?: { reason: string; from: number; to: number } }>('/api/admin/acquisition/sender-health', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setHealth(res.health);
      reloadHold();
      if (res.result) setNotice(res.result.from === res.result.to ? res.result.reason : `${res.result.from} to ${res.result.to}. ${res.result.reason}`);
      else setNotice('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy('');
    }
  };

  if (!health) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
        <AdminHeader active="acquisition" title="Acquisition" />
        <main className="max-w-6xl mx-auto px-5 py-6">
          <AcqNav active="sender" />
          <p className="text-sm text-[#161616]/65">{error || 'Reading DNS and the provider...'}</p>
        </main>
      </div>
    );
  }

  const v = health.volume;
  const headline = health.worst === 'error' ? 'ERROR' : health.worst === 'warning' ? 'WARNING' : health.worst === 'unknown' ? 'PARTIAL' : 'PASS';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[86rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav
          active="sender"
          right={
            <span
              className={`px-3 py-1.5 rounded-lg border-2 border-[#161616] font-oswald text-xs font-bold uppercase tracking-[0.14em] ${
                headline === 'PASS' ? 'bg-[#3f5d34] text-white' : headline === 'ERROR' ? 'bg-[#E0301E] text-white' : 'bg-[#F5B700] text-[#161616]'
              }`}
            >
              {headline}
            </span>
          }
        />

        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        <div className="mb-6">
          <TheHold hold={hold} />
        </div>

        <section className={`${card} p-6 mb-6`}>
          <p className={eyebrow}>Sending as</p>
          <h1 className="mt-1 font-oswald text-2xl font-bold uppercase tracking-tight">{health.identity}</h1>
          <p className="mt-1 text-sm text-[#161616]/60">
            State: <strong>{health.stateLabel}</strong>
            {health.stateReason ? `. ${health.stateReason}` : '.'}
          </p>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Sent, rolling 24h" value={v.sent24h.toLocaleString()} big />
            <Stat label="Allowance" value={v.allowance.toLocaleString()} tone="mustard" sub="What the governor permits today" />
            <Stat label="Hard ceiling" value={v.ceiling.toLocaleString()} tone="red" sub="A ceiling, never a target" />
            <Stat label="Sent this hour" value={v.sent1h} />
            <Stat
              label="Bounce rate"
              value={health.rates.measurable ? `${health.rates.bouncePct!.toFixed(2)}%` : 'Not yet'}
              tone={health.rates.measurable && health.rates.bouncePct! > health.rates.maxBouncePct ? 'red' : 'ink'}
              sub={`ceiling ${health.rates.maxBouncePct}%`}
            />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#161616]/65 mb-1.5">
              <span>{v.sent24h} of {v.allowance} allowed</span>
              <span>ceiling {v.ceiling}</span>
            </div>
            <div className="h-4 rounded-full bg-[#161616]/10 border-2 border-[#161616] overflow-hidden relative">
              <div className="h-full bg-[#F5B700]" style={{ width: `${Math.min(100, (v.sent24h / Math.max(1, v.ceiling)) * 100)}%` }} />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#E0301E]"
                style={{ left: `${Math.min(100, (v.allowance / Math.max(1, v.ceiling)) * 100)}%` }}
                title="The adaptive allowance"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {health.ramp.steps.map((s) => (
              <span
                key={s}
                className={`px-2 py-1 rounded-md border-2 text-[11px] font-mono font-bold ${
                  s === health.ramp.current
                    ? 'bg-[#F5B700] border-[#161616]'
                    : s < health.ramp.current
                      ? 'bg-[#3f5d34]/15 border-[#3f5d34]/40 text-[#2c4225]'
                      : 'border-[#161616]/15 text-[#161616]/65'
                }`}
              >
                {s.toLocaleString()}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#161616]/65 max-w-3xl">
            The allowance rises only after a full day spent near the current step with clean rates, and falls a whole step
            the moment bounces or complaints cross their ceiling. Raising it by hand is possible and is almost always the
            wrong move.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className={btnPrimary} disabled={busy !== ''} onClick={() => void act({ action: 'ramp' })}>
              {busy === 'ramp' ? 'Evaluating...' : 'Evaluate the ramp now'}
            </button>
            <button className={btnGhost} disabled={busy !== ''} onClick={() => void act({ action: 'set-state', state: 'validating', allowance: 100, reason: 'Reset to validating by hand.' })}>
              Reset to validating
            </button>
            <button className={btnDanger} disabled={busy !== ''} onClick={() => void act({ action: 'set-state', state: 'paused', reason: 'Paused by hand from Sender Health.' })}>
              Hold all cold sending
            </button>
          </div>
        </section>

        <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
          <Section title="Authentication and plumbing" note="Checked live against DNS and the provider. Nothing here is assumed.">
            <ul className="space-y-2.5">
              {health.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <Chip label={c.level} tone={TONE[c.level]} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold">{c.label}</p>
                    <p className="text-[12px] text-[#161616]/65 leading-snug break-words">{c.detail}</p>
                    {c.fix && <p className="text-[12px] font-mono text-[#a32315] mt-0.5">{c.fix}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <div className="space-y-6">
            <Section title="What the provider reported" note="The last seven days of acquisition sends, by the status Resend actually gave us.">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(health.statuses).map(([k, n]) => (
                  <Stat key={k} label={k} value={n.toLocaleString()} tone={k === 'bounced' || k === 'complaint' ? 'red' : k === 'delivered' ? 'seed' : 'ink'} />
                ))}
              </div>
              <p className="mt-3 text-xs text-[#161616]/65">
                Accepted is not delivered, and delivered is not read. Inbox against Promotions against Spam is not visible
                from here, so this engine never claims to know it.
              </p>
            </Section>

            <Section title="Limits" note="The ceiling stays below five thousand in a rolling day, by rule.">
              <div className={`${cardFlat} p-4 space-y-3`}>
                <div>
                  <label className={labelCls}>Rolling 24 hour ceiling</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={4999}
                    defaultValue={v.ceiling}
                    onBlur={(e) => {
                      if (Number(e.target.value) !== v.ceiling) void act({ action: 'limits', global_rolling_24h_ceiling: Number(e.target.value) });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Max bounce %</label>
                    <input
                      className={inputCls}
                      type="number"
                      step="0.1"
                      defaultValue={health.rates.maxBouncePct}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== health.rates.maxBouncePct) void act({ action: 'limits', max_bounce_rate_pct: Number(e.target.value) });
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Max complaint %</label>
                    <input
                      className={inputCls}
                      type="number"
                      step="0.01"
                      defaultValue={health.rates.maxComplaintPct}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== health.rates.maxComplaintPct) void act({ action: 'limits', max_complaint_rate_pct: Number(e.target.value) });
                      }}
                    />
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}
