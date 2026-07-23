'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { formatPhone } from '@/lib/outbound';
import { FORGE_STAGE_LABELS } from '@/lib/outbound';
import type { ForgeCounts, ForgeRow, ForgeStage, Rep } from '@/lib/outbound';
import {
  OutboundNav,
  BackButton,
  NicheChip,
  StatusChip,
  ToastHost,
  useToasts,
  SeedBurst,
  api,
  card,
  btnPrimary,
  btnGhost,
  inputCls,
  eyebrow,
} from '@/components/admin/outbound/ui';

/**
 * THE FORGE BOARD. Everything with work already invested in it, in one place.
 *
 * Forging a suite is the expensive half of the job, and until now it left no
 * trace you could find later: you forged a receptionist and a website for a
 * business, got pulled away, and the lead sank into a floor of thousands with
 * a finished demo nobody ever showed them. This board keeps that work visible
 * until it has been spent, and leads with the bucket that costs the most:
 * built, and never contacted.
 */

type Payload = { rows: ForgeRow[]; counts: ForgeCounts; reps: Rep[] };

const STAGE_ORDER: ForgeStage[] = ['forging', 'failed', 'uncontacted', 'waiting', 'landed', 'closed'];

/** How many live builds the anvil shows before folding the rest behind a toggle. */
const ANVIL_PREVIEW = 5;

const STAGE_TONE: Record<ForgeStage, string> = {
  forging: 'bg-[#b58a2a] text-[#1a1815] border-[#1a1815]',
  failed: 'bg-[#a03123] text-[#f7f3e9] border-[#1a1815]',
  uncontacted: 'bg-[#1a1815] text-[#b58a2a] border-[#1a1815]',
  waiting: 'bg-[#fffdf8] text-[#1a1815]/70 border-[#1a1815]/30',
  landed: 'bg-[#3f5d34] text-[#f7f3e9] border-[#1a1815]',
  closed: 'bg-transparent text-[#1a1815]/40 border-[#1a1815]/20',
};

/** Short "4m / 3h / 2d ago". */
function ago(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

/** Minutes a build has been sitting, for the anvil clock. */
function minsSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function dayLabel(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Denver' });
}

/** Who put this suite on the anvil: matters, because a self-serve forge is a warm arrival. */
function forgedBy(row: ForgeRow): { label: string; title: string } | null {
  if (row.source === 'demo-station') return { label: '⚡ They forged it', title: 'Self-serve: this owner built their own demos off an ad and is waiting on a call.' };
  if (row.origin === 'partner' || row.source === 'partner-forge') return { label: '🤝 Partner', title: 'A partner minted this suite as a warm intro.' };
  if (row.origin === 'rep' || row.source === 'rep-forge') return { label: '⚒ You forged it', title: 'Minted from the cockpit by the team.' };
  return null;
}

export default function OutboundForge() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<ForgeStage | 'all'>('uncontacted');
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);
  const [anvilAll, setAnvilAll] = useState(false);
  const [burst, setBurst] = useState(0);
  const { toasts, push } = useToasts();
  // Ticks the clock so "6m on the anvil" keeps counting between polls.
  const [, setTick] = useState(0);
  const forgingRef = useRef<Map<string, string>>(new Map());
  const armed = useRef(false);

  const load = useCallback(
    async (background = false) => {
      if (!background) setLoading(true);
      try {
        const next = await api<Payload>('/api/admin/outbound/forge');
        // The payoff moment: a build that was on the anvil last poll and is live
        // now gets announced instead of quietly changing color.
        const wasForging = forgingRef.current;
        const landed = next.rows.filter((r) => wasForging.has(r.id) && r.stage !== 'forging' && r.site?.status === 'ready');
        if (armed.current && landed.length > 0) {
          setBurst((b) => b + 1);
          push(
            landed.length === 1
              ? `${landed[0].business_name}'s website just landed. Send it. 🌱`
              : `${landed.length} demo websites just landed. Send them. 🌱`,
          );
        }
        forgingRef.current = new Map(next.rows.filter((r) => r.stage === 'forging').map((r) => [r.id, r.site?.status ?? 'queued']));
        armed.current = true;
        setData(next);
        setError('');
      } catch (e) {
        if (!background) setError(e instanceof Error ? e.message : 'Could not load the forge board.');
      } finally {
        if (!background) setLoading(false);
      }
    },
    [push],
  );

  useEffect(() => {
    void load();
    // Deep link: /admin/outbound/forge?stage=forging (no useSearchParams, so no
    // Suspense boundary needed — same pattern as the leads table).
    if (typeof window !== 'undefined') {
      const s = new URLSearchParams(window.location.search).get('stage');
      if (s && (s === 'all' || (STAGE_ORDER as string[]).includes(s))) setStage(s as ForgeStage | 'all');
    }
    // A build finishing is the whole reason to keep this page open, so it
    // refreshes itself. The anvil clock ticks every 15s in between.
    const poll = window.setInterval(() => void load(true), 20000);
    const tick = window.setInterval(() => setTick((t) => t + 1), 15000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    if (stage === 'all') p.delete('stage');
    else p.set('stage', stage);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [stage]);

  const rows = data?.rows ?? [];
  const counts = data?.counts;
  const forging = useMemo(() => rows.filter((r) => r.stage === 'forging'), [rows]);
  // The worker runs on Sarah's machine. A row nobody claimed in ten minutes is
  // not "building", it is waiting on a process that is not up.
  const stalled = useMemo(
    () => forging.filter((r) => r.site && !r.site.claimed_at && minsSince(r.site.created_at) >= 10),
    [forging],
  );
  const shownForging = anvilAll ? forging : forging.slice(0, ANVIL_PREVIEW);

  const visible = useMemo(() => {
    let out = rows;
    if (stage !== 'all') out = out.filter((r) => r.stage === stage);
    else out = out.filter((r) => r.stage !== 'closed'); // dead leads stay out of "all"
    if (owner) out = out.filter((r) => r.owner_rep_id === owner);
    const needle = q.trim().toLowerCase();
    if (needle) {
      out = out.filter((r) =>
        [r.business_name, r.contact_name, r.city, r.phone, r.email].some((v) => v?.toLowerCase().includes(needle)),
      );
    }
    return out;
  }, [rows, stage, owner, q]);

  const retryForge = async (row: ForgeRow) => {
    setRetrying(row.id);
    try {
      await api(`/api/admin/outbound/leads/${row.id}/forge-site`, { method: 'POST' });
      push(`${row.business_name} is back on the anvil.`);
      await load(true);
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not re-queue that build.', 'error');
    } finally {
      setRetrying(null);
    }
  };

  const repName = (id: string | null) => data?.reps.find((r) => r.id === id)?.name ?? '';

  return (
    <div className="min-h-screen bg-[#f7f3e9]">
      <AdminHeader active="outbound" title="Outbound · Forge" onRefresh={() => void load()} />
      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        <OutboundNav
          active="forge"
          back={<BackButton label="Back" fallback="/admin/outbound" />}
          badge={{ forge: counts?.uncontacted ?? 0 }}
          right={
            <span className="flex items-center gap-2 font-sans text-xs text-[#1a1815]/45">
              <span className="w-2 h-2 rounded-full bg-[#3f5d34] animate-pulse" aria-hidden />
              Live · refreshes itself
            </span>
          }
        />

        {error && (
          <div className={`${card} p-5 mb-6 border-[#a03123] shadow-[5px_5px_0_0_#a03123]`}>
            <p className="font-sans text-sm text-[#a03123] font-medium">{error}</p>
          </div>
        )}

        {/* ── The anvil: what is being built right this minute ── */}
        <section className="bg-[#1a1815] border-2 border-[#1a1815] rounded-2xl shadow-[6px_6px_0_0_#b58a2a] p-5 md:p-6 mb-6 overflow-hidden">
          <style>{`
            @keyframes mms-anvil-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }
            @keyframes mms-ember { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
          `}</style>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-oswald font-semibold text-[#b58a2a]">On the anvil</span>
              <p className="font-oswald font-semibold uppercase text-4xl md:text-5xl text-[#f7f3e9] leading-none mt-1">
                {forging.length}{' '}
                <span className="text-base md:text-lg text-[#f7f3e9]/45">
                  {forging.length === 1 ? 'build running' : 'builds running'}
                </span>
              </p>
            </div>
            {(counts?.uncontacted ?? 0) > 0 && (
              <button
                onClick={() => setStage('uncontacted')}
                className="text-left group"
                title="Suites that are built and have never been called or emailed"
              >
                <span className="text-[10px] uppercase tracking-[0.22em] font-oswald text-[#f7f3e9]/50 block">Built, never contacted</span>
                <span className="font-oswald font-semibold text-3xl text-[#b58a2a] leading-none group-hover:text-[#f7f3e9] transition-colors">
                  {counts?.uncontacted} <span className="text-sm uppercase text-[#f7f3e9]/40">waiting on you →</span>
                </span>
              </button>
            )}
          </div>

          {/* One honest line beats eleven identical spinners: if nothing has
              claimed the queue, the local worker is not running, and no amount
              of waiting on this page will change that. */}
          {stalled.length >= 2 && (
            <p className="mt-4 flex items-start gap-2.5 rounded-xl border-2 border-[#a03123]/60 bg-[#a03123]/15 px-4 py-3 font-sans text-[13px] leading-relaxed text-[#f7f3e9]">
              <span aria-hidden>⚠</span>
              <span>
                <strong className="font-oswald uppercase tracking-[0.06em]">{stalled.length} builds are queued and nothing has claimed them</strong>{' '}
                (oldest {Math.max(...stalled.map((r) => minsSince(r.site!.created_at)))}m). The forge worker runs on your machine. Start it with{' '}
                <code className="font-mono text-[12px] text-[#b58a2a]">node scripts/demo-site-worker.mjs</code> and these move on their own.
              </span>
            </p>
          )}

          <div className="mt-4 space-y-2">
            {shownForging.map((r) => {
              const started = r.site?.claimed_at ?? r.site?.created_at ?? null;
              const mins = started ? minsSince(started) : 0;
              const isStalled = stalled.some((s) => s.id === r.id);
              return (
                <div key={r.id} className="rounded-xl border border-[#f7f3e9]/15 bg-[#f7f3e9]/[0.04] px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base shrink-0" style={{ animation: 'mms-ember 1.8s ease-in-out infinite' }} aria-hidden>
                      {isStalled ? '⚠' : '⚒'}
                    </span>
                    <Link href={`/admin/outbound/call/${r.id}`} className="font-sans font-semibold text-sm text-[#f7f3e9] hover:text-[#b58a2a] transition-colors truncate min-w-0 flex-1">
                      {r.business_name}
                    </Link>
                    <span className={`font-oswald uppercase tracking-[0.12em] text-[11px] shrink-0 ${isStalled ? 'text-[#e8a598]' : 'text-[#f7f3e9]/55'}`}>
                      {isStalled ? `queued ${mins}m` : `${r.site?.kind === 'edit' ? 'reforging' : 'building'} · ${mins}m`}
                    </span>
                  </div>
                  <div className="relative h-1.5 mt-2 rounded-full bg-[#f7f3e9]/12 overflow-hidden">
                    <span
                      className={`absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent to-transparent ${isStalled ? 'via-[#f7f3e9]/25' : 'via-[#b58a2a]'}`}
                      style={{ animation: `mms-anvil-sweep ${isStalled ? '4.5s' : '2.2s'} linear infinite` }}
                      aria-hidden
                    />
                  </div>
                </div>
              );
            })}
            {forging.length > ANVIL_PREVIEW && (
              <button
                onClick={() => setAnvilAll((v) => !v)}
                className="w-full text-center py-2 font-oswald uppercase tracking-[0.14em] text-[11px] text-[#f7f3e9]/50 hover:text-[#b58a2a] transition-colors"
              >
                {anvilAll ? 'Show fewer' : `Show all ${forging.length} builds`}
              </button>
            )}
            {forging.length === 0 && (
              <p className="font-sans text-sm text-[#f7f3e9]/45 py-2">
                The anvil is cool. Nothing is building right now.{' '}
                <Link href="/admin/outbound/leads" className="text-[#b58a2a] font-semibold hover:underline">
                  Open a lead and forge a suite →
                </Link>
              </p>
            )}
          </div>
        </section>

        {/* ── Buckets ── */}
        <div className={`${card} p-4 mb-5`}>
          <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b-2 border-[#1a1815]/10">
            <span className={`${eyebrow} mr-1`}>Workbench</span>
            {(['all', ...STAGE_ORDER] as const).map((k) => {
              const n = k === 'all' ? (counts ? counts.all - counts.closed : 0) : (counts?.[k] ?? 0);
              if (k === 'closed' && n === 0) return null;
              const active = stage === k;
              return (
                <button
                  key={k}
                  onClick={() => setStage(k)}
                  className={`px-3 py-1.5 rounded-lg border-2 font-oswald uppercase tracking-[0.08em] text-[11px] transition-colors ${
                    active
                      ? 'bg-[#1a1815] text-[#f7f3e9] border-[#1a1815] shadow-[2px_2px_0_0_#b58a2a]'
                      : 'bg-white text-[#1a1815]/70 border-[#1a1815]/20 hover:border-[#b58a2a] hover:text-[#1a1815]'
                  }`}
                >
                  {k === 'all' ? 'Everything' : FORGE_STAGE_LABELS[k]}
                  <span className={`ml-1.5 tabular-nums ${active ? 'text-[#b58a2a]' : 'text-[#1a1815]/40'}`}>{n}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search business, contact, city, phone"
              className={`${inputCls} !w-72 !py-2`}
            />
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="bg-white border-2 border-[#1a1815]/20 rounded-lg px-2 py-1.5 font-sans text-xs text-[#1a1815] outline-none focus:border-[#b58a2a]"
              aria-label="Filter by rep"
            >
              <option value="">All reps</option>
              {(data?.reps ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <span className="ml-auto font-oswald text-sm text-[#1a1815]/50 uppercase tracking-[0.1em]">
              {visible.length} {visible.length === 1 ? 'lead' : 'leads'}
            </span>
          </div>
        </div>

        {/* ── The list ── */}
        {stage === 'uncontacted' && (counts?.uncontacted ?? 0) > 0 && (
          <p className="font-sans text-sm text-[#1a1815]/65 mb-3 px-1">
            These businesses have a demo suite built and sitting there. Nobody has called or emailed them yet.
          </p>
        )}

        <div className={`${card} overflow-hidden`}>
          {loading && <div className="p-10 text-center font-oswald uppercase text-[#1a1815]/40">Loading the workbench...</div>}

          {!loading && visible.length === 0 && (
            <div className="p-12 text-center">
              <p className="font-oswald uppercase text-lg text-[#1a1815]/50">
                {stage === 'uncontacted' ? 'Nothing built is going unspent' : 'Nothing here'}
              </p>
              <p className="font-sans text-sm text-[#1a1815]/55 mt-1">
                {stage === 'uncontacted'
                  ? 'Every forged suite has been called or emailed. That is the way it should look.'
                  : 'Try another bucket, or forge a suite from a lead.'}
              </p>
            </div>
          )}

          <ul className="divide-y divide-[#1a1815]/[0.08]">
            {visible.map((r) => {
              const by = forgedBy(r);
              return (
                <li key={r.id} className="px-4 md:px-5 py-4 hover:bg-[#b58a2a]/[0.05] transition-colors">
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/admin/outbound/call/${r.id}`} className="font-sans font-semibold text-[15px] text-[#1a1815] hover:text-[#b58a2a] transition-colors">
                          {r.business_name}
                        </Link>
                        <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-[0.12em] font-oswald font-bold ${STAGE_TONE[r.stage]}`}>
                          {FORGE_STAGE_LABELS[r.stage]}
                        </span>
                        <StatusChip status={r.status} />
                        {by && (
                          <span className="text-[9px] uppercase tracking-[0.12em] font-oswald font-semibold text-[#7a5c1a] border border-[#b58a2a]/50 bg-[#b58a2a]/10 rounded-md px-1.5 py-0.5" title={by.title}>
                            {by.label}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs font-sans text-[#1a1815]/55 flex-wrap">
                        <span>{formatPhone(r.phone)}</span>
                        {r.city && <span>· {r.city}{r.state ? `, ${r.state}` : ''}</span>}
                        <NicheChip niche={r.niche} />
                        {r.audit_score != null && <span className="font-oswald">audit {r.audit_score}</span>}
                        {r.forged_at && <span title={dayLabel(r.forged_at)}>· forged {ago(r.forged_at)}</span>}
                      </div>

                      {/* What is actually built for them */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {r.demo_url && (
                          <a href={r.demo_url} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-[0.1em] font-oswald font-semibold px-2 py-1 rounded-md border-2 border-[#3f5d34]/50 bg-[#3f5d34]/10 text-[#3f5d34] hover:border-[#3f5d34] transition-colors">
                            ☎ Receptionist ↗
                          </a>
                        )}
                        {r.site_demo_status === 'ready' && r.site_demo_url && (
                          <a href={r.site_demo_url} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-[0.1em] font-oswald font-semibold px-2 py-1 rounded-md border-2 border-[#b58a2a]/60 bg-[#b58a2a]/15 text-[#7a5c1a] hover:border-[#b58a2a] transition-colors">
                            🌐 Website ↗
                          </a>
                        )}
                        {r.os_demo_url && (
                          <a href={r.os_demo_url} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-[0.1em] font-oswald font-semibold px-2 py-1 rounded-md border-2 border-[#1a1815]/30 bg-[#1a1815]/[0.05] text-[#1a1815]/75 hover:border-[#1a1815] transition-colors">
                            ⚙ Command center ↗
                          </a>
                        )}
                        {r.hub_demo_url && (
                          <a href={r.hub_demo_url} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-[0.1em] font-oswald font-semibold px-2 py-1 rounded-md border-2 border-[#1a1815] bg-[#1a1815] text-[#b58a2a] hover:-translate-y-0.5 transition-transform">
                            ▦ Their suite ↗
                          </a>
                        )}
                        {r.stage === 'failed' && r.site?.error && (
                          <span className="text-[11px] font-sans text-[#a03123] max-w-[420px] truncate" title={r.site.error}>
                            {r.site.error}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact state: the reason this board exists */}
                    <div className="w-full sm:w-56 shrink-0">
                      <span className="text-[10px] uppercase tracking-[0.18em] font-oswald font-medium text-[#1a1815]/40 block">Contact</span>
                      {r.calls === 0 && !r.last_email_at ? (
                        <span className="font-sans text-[13px] font-semibold text-[#a03123]">Never called or emailed</span>
                      ) : (
                        <span className="font-sans text-[13px] text-[#1a1815]/70">
                          {r.calls > 0 && (
                            <>
                              {r.calls} {r.calls === 1 ? 'call' : 'calls'}
                              {r.last_call_at && <span className="text-[#1a1815]/45"> · last {ago(r.last_call_at)}</span>}
                            </>
                          )}
                          {r.calls > 0 && r.last_email_at && <br />}
                          {r.last_email_at && (
                            <span className="text-[#1a1815]/60">
                              emailed {ago(r.last_email_at)}
                              {r.email_open_count > 0 && <span className="text-[#3f5d34] font-semibold"> · opened {r.email_open_count}x</span>}
                            </span>
                          )}
                        </span>
                      )}
                      {r.hub_view_count > 0 && (
                        <span className="block font-sans text-[12px] text-[#3f5d34] font-semibold mt-0.5" title="They opened their demo suite. Call while it is warm.">
                          👁 Opened their suite {r.hub_view_count}x
                        </span>
                      )}
                      {r.owner_rep_id && (
                        <span className="block font-sans text-[11px] text-[#1a1815]/40 mt-0.5">Rep: {repName(r.owner_rep_id) || 'unassigned'}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.stage === 'failed' && (
                        <button onClick={() => void retryForge(r)} disabled={retrying === r.id} className={`${btnGhost} !px-3 !py-2 !text-xs !border-[#a03123] !text-[#a03123] !shadow-[3px_3px_0_0_#a03123]`}>
                          {retrying === r.id ? 'Queuing…' : 'Retry forge'}
                        </button>
                      )}
                      <Link href={`/admin/outbound/call/${r.id}`} className={`${btnPrimary} !px-3.5 !py-2 !text-xs`}>
                        {r.calls === 0 && !r.last_email_at ? 'Work it' : 'Open'}
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </main>

      {burst > 0 && <SeedBurst key={burst} />}
      <ToastHost toasts={toasts} />
    </div>
  );
}
