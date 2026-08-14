'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

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
 * rather than showing a zero that reads like a failure or a placeholder that
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

const money = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? 'not connected' : (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

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
    return (
      <Shell>
        <div className="rounded-xl border-2 border-[#E0301E] bg-[#E0301E]/[0.06] px-4 py-3 text-sm text-[#E0301E]">{error}</div>
      </Shell>
    );
  }
  if (!data) return <Shell><p className="text-sm text-[#161616]/45">Loading.</p></Shell>;

  if (!data.factory) {
    return (
      <Shell name={data.tenant.name}>
        <Panel>
          <h2 className="font-sans text-lg font-bold text-[#161616]">Your Client Factory is being built</h2>
          <p className="text-sm text-[#161616]/65 mt-1">{data.note ?? 'We will let you know the moment it is ready to review.'}</p>
        </Panel>
      </Shell>
    );
  }

  const f = data.factory;
  const stages = data.summary?.funnel.stages ?? [];
  const found = stages.find((s) => s.key === 'found')?.count ?? 0;
  const readOnly = data.role === 'viewer';

  return (
    <Shell name={data.tenant.name}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-[#161616]">{f.name}</h1>
          <p className="text-sm text-[#161616]/55">
            {f.status === 'live' ? 'Running' : f.status === 'paused' ? 'Paused' : `In ${f.status}`}
            {f.mode === 'test' ? ', in test mode so nobody real is contacted' : ''}
            {data.agent ? `. ${data.agent.name} is your ${data.agent.role.toLowerCase()}.` : '.'}
          </p>
        </div>
        {data.factories.length > 1 && (
          <select
            className="rounded-lg border-2 border-[#161616]/25 bg-white px-3 py-2 text-sm"
            value={f.id}
            onChange={(e) => setSelected(e.target.value)}
          >
            {data.factories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
      </div>

      {f.pauseReason && (
        <Panel tone="warn"><p className="text-sm text-[#161616]/85">{f.pauseReason}</p></Panel>
      )}

      {data.health.reasons.length > 0 && (
        <Panel tone="warn">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/60">Needs a look</h2>
          <ul className="mt-1.5 space-y-1">
            {data.health.reasons.map((r) => <li key={r} className="text-sm text-[#161616]/80">{r}</li>)}
          </ul>
        </Panel>
      )}

      {/* ── this month ── */}
      <Panel>
        <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-3">This month</h2>
        {stages.length ? (
          <div className="space-y-2">
            {stages.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm text-[#161616]/60">{s.label}</span>
                <span className="w-16 shrink-0 font-sans text-lg font-bold tabular-nums text-[#161616]">{s.count.toLocaleString()}</span>
                <div className="h-2 flex-1 rounded-full bg-[#161616]/10 overflow-hidden">
                  <div className="h-full bg-[#F5B700]" style={{ width: `${found ? Math.min(100, (s.count / found) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#161616]/45">Nothing to show yet. The numbers appear as the Factory runs.</p>
        )}

        {data.summary && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[#161616]/10 pt-4">
            <Metric label="Pipeline" value={money(data.summary.pipelineCents)} />
            <Metric label="Closed" value={money(data.summary.closedCents)} />
            <Metric label="Return" value={data.summary.roi === null ? 'connect revenue' : `${data.summary.roi.toFixed(0)}%`} />
            <Metric label="Prospects held" value={data.reservoir.total.toLocaleString()} />
          </div>
        )}
      </Panel>

      {data.summary?.bottleneck && (
        <Panel tone="highlight">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/60">Where you are losing them</h2>
          <p className="font-sans font-bold text-[#161616] mt-0.5">{data.summary.bottleneck.label}</p>
          <p className="text-sm text-[#161616]/75">{data.summary.bottleneck.verdict}</p>
          <p className="text-sm text-[#161616]/85 mt-1">{data.summary.bottleneck.recommendation}</p>
        </Panel>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel>
          <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-2">Hot right now</h2>
          {data.hot.length ? (
            <ul className="space-y-2">
              {data.hot.map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-3 border-b border-[#161616]/8 pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="font-sans font-semibold text-sm text-[#161616] truncate">{h.company}</p>
                    <p className="text-xs text-[#161616]/55">{h.reasons.join(' · ')}</p>
                  </div>
                  <span className="font-sans font-bold tabular-nums text-[#161616] shrink-0">{h.heat}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#161616]/45">Nobody is showing buying intent yet.</p>
          )}
        </Panel>

        <Panel>
          <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-2">Needs a human</h2>
          {data.inbox.length ? (
            <ul className="space-y-2">
              {data.inbox.slice(0, 8).map((m) => (
                <li key={m.id} className="border-b border-[#161616]/8 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#161616]/45">{m.classification}</span>
                    <span className="text-xs text-[#161616]/40">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-[#161616] truncate">{m.subject ?? '(no subject)'}</p>
                  {m.body && <p className="text-xs text-[#161616]/55 line-clamp-2">{m.body.slice(0, 180)}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#161616]/45">Nothing waiting on you.</p>
          )}
        </Panel>
      </div>

      {data.meetings.length > 0 && (
        <Panel>
          <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-2">Booked</h2>
          <ul className="space-y-1.5">
            {data.meetings.map((m) => (
              <li key={m.id} className="flex justify-between text-sm">
                <span className="text-[#161616]">{m.attendee_name ?? m.attendee_email ?? 'Prospect'}</span>
                <span className="font-mono text-[#161616]/60">{new Date(m.starts_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ── plan usage ── */}
      <Panel>
        <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-3">
          Your plan{data.tenant.plan ? `: ${data.tenant.plan.name}` : ''}
        </h2>
        {data.usage.warnings.length > 0 && (
          <ul className="mb-3 space-y-1">
            {data.usage.warnings.map((w) => <li key={w} className="text-sm text-amber-800">{w}</li>)}
          </ul>
        )}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {data.usage.limits.map((l) => (
            <div key={l.metric}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#161616]/50">{(l.limitKey ?? l.metric).replace(/_/g, ' ')}</span>
                <span className="font-mono text-[10px] tabular-nums">{l.used}{l.limit === null ? '' : ` / ${l.limit}`}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#161616]/10 overflow-hidden">
                <div
                  className={`h-full ${l.exceeded ? 'bg-[#E0301E]' : (l.pct ?? 0) > 80 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                  style={{ width: `${Math.min(100, l.pct ?? 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── controls ── */}
      <Panel>
        <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-1">Your controls</h2>
        <p className="text-sm text-[#161616]/55 mb-3">
          {readOnly ? 'Your access is read only. Ask an owner on your account to change these.' : 'Stop any part of it whenever you want. Nothing needs an email to us.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <ControlButton label={f.status === 'paused' ? 'Resume everything' : 'Pause everything'} primary disabled={readOnly || busy !== null} onClick={() => void control('factory', f.status !== 'paused')} />
          <ControlButton label={f.paused.sourcing ? 'Resume finding prospects' : 'Stop finding prospects'} disabled={readOnly || busy !== null} onClick={() => void control('sourcing', !f.paused.sourcing)} />
          <ControlButton label={f.paused.outreach ? 'Resume outreach' : 'Stop outreach'} disabled={readOnly || busy !== null} onClick={() => void control('outreach', !f.paused.outreach)} />
          <ControlButton label={f.paused.ai ? 'Resume the AI' : 'Stop the AI'} disabled={readOnly || busy !== null} onClick={() => void control('ai', !f.paused.ai)} />
          <ControlButton label={f.paused.followup ? 'Resume follow-up' : 'Stop follow-up'} disabled={readOnly || busy !== null} onClick={() => void control('followup', !f.paused.followup)} />
        </div>
      </Panel>
    </Shell>
  );
}

function Shell({ children, name }: { children: React.ReactNode; name?: string }) {
  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <header className="border-b-2 border-[#161616] bg-[#FBF6EA]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 md:px-6 py-3.5 flex items-center justify-between gap-3">
          <div>
            <span className="block font-mono text-[9px] uppercase tracking-[0.4em] font-bold text-[#E0301E]">Modern Mustard Seed</span>
            <h1 className="font-sans text-lg font-bold tracking-tight text-[#161616]">Client Factory{name ? ` · ${name}` : ''}</h1>
          </div>
          <Link href="/portal" className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold px-3 py-2 rounded-lg border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616]">
            Portal
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 md:px-6 py-6 space-y-4">{children}</main>
    </div>
  );
}

function Panel({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'warn' | 'highlight' }) {
  const cls =
    tone === 'warn' ? 'border-amber-700 bg-amber-50' : tone === 'highlight' ? 'border-[#161616] bg-[#F5B700]/25' : 'border-[#161616] bg-white';
  return <section className={`rounded-xl border-2 ${cls} shadow-[3px_3px_0_0_#161616] p-4`}>{children}</section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50">{label}</div>
      <div className="font-sans text-xl font-bold tracking-tight tabular-nums text-[#161616]">{value}</div>
    </div>
  );
}

function ControlButton({ label, onClick, disabled, primary }: { label: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-mono text-[10px] uppercase tracking-[0.16em] font-bold px-3 py-2 rounded-lg border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        primary ? 'bg-[#F5B700] text-[#161616]' : 'bg-white text-[#161616]'
      }`}
    >
      {label}
    </button>
  );
}
