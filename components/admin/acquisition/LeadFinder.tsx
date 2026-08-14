'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Section, Stat, Chip, api, card, btnPrimary, btnGhost, inputCls, labelCls, timeAgo } from '@/components/admin/acquisition/ui';

type Run = {
  id: string;
  label: string | null;
  status: string;
  target: number;
  searched: number;
  found: number;
  with_email: number;
  verified: number;
  duplicates: number;
  invalid: number;
  inserted: number;
  current_market: string | null;
  log: { at: string; line: string }[];
  error: string | null;
  heartbeat_at: string | null;
  created_at: string;
  finished_at: string | null;
  params: Record<string, unknown>;
};

type WorkerStatus = { state: 'working' | 'waiting' | 'stalled' | 'absent'; headline: string; detail: string; command: string | null };
type Payload = {
  runs: Run[];
  sourcedTotal: number;
  markets: { key: string; label: string; tier: number }[];
  workerCommand: string;
  worker: WorkerStatus;
};

/** What the Status tile says. "IDLE" is deliberately absent: it was the word
 *  that hid an unattended queue for thirty eight minutes. */
const WORKER_LABEL: Record<WorkerStatus['state'], string> = {
  working: 'RUNNING',
  waiting: 'READY',
  stalled: 'STALLED',
  absent: 'NO WORKER',
};

export default function LeadFinder() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const [industry, setIndustry] = useState('all');
  const [count, setCount] = useState(500);
  const [tier, setTier] = useState(3);
  const [requireEmail, setRequireEmail] = useState(true);
  const [minReviews, setMinReviews] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [excludeChains, setExcludeChains] = useState(true);

  const load = useCallback(async (background = false) => {
    try {
      setData(await api<Payload>('/api/admin/acquisition/lead-finder'));
      setError('');
    } catch (e) {
      if (!background) setError(e instanceof Error ? e.message : 'Could not load the Lead Finder.');
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(true), 12000);
    return () => window.clearInterval(t);
  }, [load]);

  const start = async () => {
    setBusy(true);
    setNotice('');
    try {
      await api('/api/admin/acquisition/lead-finder', {
        method: 'POST',
        body: JSON.stringify({ industry, count, tier, requireEmail, minReviews, minScore, excludeChains }),
      });
      setNotice('Run queued. The local worker picks it up within fifteen seconds.');
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the run.');
    } finally {
      setBusy(false);
    }
  };

  const running = data?.runs.find((r) => r.status === 'running');
  const worker: WorkerStatus = data?.worker ?? { state: 'waiting', headline: '', detail: '', command: null };

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[86rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav active="finder" />

        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6">
          <Section
            title="Find more prospects"
            note="Public business data only: Google Maps and OpenStreetMap for discovery, the company's own website for the email. Nothing is fabricated, and a business with no findable address is recorded as having none."
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Industry</label>
                <select className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  <option value="all">All three</option>
                  <option value="hvac">HVAC</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="roofing">Roofing</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>How many</label>
                <select className={inputCls} value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {[50, 100, 250, 500, 1000].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Market depth</label>
                <select className={inputCls} value={tier} onChange={(e) => setTier(Number(e.target.value))}>
                  <option value={1}>Priority metros only</option>
                  <option value={2}>Priority plus secondary</option>
                  <option value={3}>Every market we know</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Minimum lead score</label>
                <input className={inputCls} type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Minimum reviews</label>
                <input className={inputCls} type="number" min={0} value={minReviews} onChange={(e) => setMinReviews(Number(e.target.value))} />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <Toggle label="Require a public email" checked={requireEmail} onChange={setRequireEmail} hint="Off means banking businesses we cannot email yet." />
              <Toggle label="Exclude national chains" checked={excludeChains} onChange={setExcludeChains} hint="A corporate call centre already answers the phone." />
              <p className="text-xs text-[#161616]/55">Existing prospects are always excluded. Dedupe runs against every table we have ever touched.</p>
            </div>
            <button className={`${btnPrimary} mt-4 w-full`} disabled={busy} onClick={() => void start()}>
              {busy ? 'Queueing...' : 'Start sourcing'}
            </button>
            <p className="mt-3 text-[12px] text-[#161616]/55 leading-relaxed">
              Runs are served by the local worker, the same way the demo-site forge is: a run reads hundreds of company
              websites and drives a real browser, which no serverless function can do. Start it once and leave it up:
              <code className="ml-1 px-1.5 py-0.5 rounded bg-[#161616]/[0.07] font-mono text-[11px]">{data?.workerCommand}</code>
            </p>
          </Section>

          <div className="space-y-6">
            {/* The loudest thing on the screen when nothing is listening. It
                names the problem and carries the exact command that fixes it. */}
            {(worker.state === 'absent' || worker.state === 'stalled') && (
              <div className="rounded-xl border-2 border-[#E0301E] bg-[#E0301E]/[0.06] p-4">
                <p className="font-display text-[17px] font-bold text-[#E0301E]">{worker.headline}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#161616]/75">{worker.detail}</p>
                {worker.command && (
                  <code className="mt-3 block rounded-lg border-2 border-[#161616] bg-white px-3 py-2 font-mono text-[12px] font-semibold">
                    {worker.command}
                  </code>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              <Stat label="Sourced by the finder" value={(data?.sourcedTotal ?? 0).toLocaleString()} tone="seed" big />
              <Stat label="Runs" value={data?.runs.length ?? 0} />
              {/* Never claim IDLE when work is queued. Idle means nothing is
                  waiting; a queued run with no worker is abandoned, and the
                  two used to render identically. */}
              <Stat
                label="Status"
                value={WORKER_LABEL[worker.state]}
                tone={worker.state === 'working' ? 'seed' : worker.state === 'waiting' ? 'ink' : 'red'}
                sub={running?.current_market ?? undefined}
              />
            </div>

            {running && (
              <Section title="In flight" note={running.label ?? undefined}>
                <Progress run={running} />
                <pre className="mt-3 max-h-64 overflow-y-auto text-[11px] leading-relaxed font-mono bg-white border-2 border-[#161616]/15 rounded-lg p-3">
                  {(running.log ?? []).slice(-40).map((l) => `${l.at.slice(11, 19)} ${l.line}`).join('\n')}
                </pre>
              </Section>
            )}

            <Section title="Runs" note="Every sourcing job, and exactly what it rejected.">
              {!data?.runs.length ? (
                <p className="text-sm text-[#161616]/45">No runs yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.runs.map((r) => (
                    <li key={r.id} className={`${card} p-4`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip
                          label={r.status}
                          tone={r.status === 'done' ? 'good' : r.status === 'failed' ? 'bad' : r.status === 'running' ? 'warn' : 'neutral'}
                        />
                        <span className="font-semibold text-sm">{r.label ?? 'Sourcing run'}</span>
                        <span className="ml-auto text-[11px] font-mono text-[#161616]/45">{timeAgo(r.created_at)}</span>
                      </div>
                      <Progress run={r} />
                      {r.error && <p className="mt-2 text-[12px] text-[#E0301E]">{r.error}</p>}
                      <button className="mt-2 text-xs underline font-semibold" onClick={() => setOpen(open === r.id ? null : r.id)}>
                        {open === r.id ? 'Hide log' : 'Show log'}
                      </button>
                      {open === r.id && (
                        <pre className="mt-2 max-h-72 overflow-y-auto text-[11px] leading-relaxed font-mono bg-white border-2 border-[#161616]/15 rounded-lg p-3">
                          {(r.log ?? []).map((l) => `${l.at.slice(11, 19)} ${l.line}`).join('\n') || 'No log.'}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Progress({ run }: { run: Run }) {
  const frac = run.target > 0 ? Math.min(1, run.inserted / run.target) : 0;
  return (
    <div className="mt-2">
      <div className="h-2.5 rounded-full bg-[#161616]/10 overflow-hidden border border-[#161616]/15">
        <div className="h-full bg-[#F5B700]" style={{ width: `${frac * 100}%`, transition: 'width 600ms ease' }} />
      </div>
      <p className="mt-1.5 text-[12px] font-mono tabular-nums text-[#161616]/65">
        {run.inserted} / {run.target} banked · {run.searched} searched · {run.found} researched · {run.with_email} with email ·{' '}
        {run.verified} verified · {run.duplicates} duplicates rejected · {run.invalid} invalid
        {run.current_market ? ` · now: ${run.current_market}` : ''}
      </p>
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-[#F5B700] w-4 h-4" />
      <span>
        <span className="text-[13px] font-semibold">{label}</span>
        {hint && <span className="block text-[11px] text-[#161616]/50">{hint}</span>}
      </span>
    </label>
  );
}
