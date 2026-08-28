'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  AcqNav,
  SeedBurst,
  ToastHost,
  api,
  btnGhost,
  btnPrimary,
  card,
  cardFlat,
  eyebrow,
  inputCls,
  timeAgo,
  useToasts,
} from '@/components/admin/acquisition/ui';
import { possessive } from '@/lib/business-name';

/**
 * THE ACQUISITION FORGE.
 *
 * Outbound has had a forge board since July. Acquisition has had the bigger
 * list and no way to build anybody anything unless they first agreed to let an
 * AI phone them. The people who clicked, read, walked all the way to the
 * permission page and then closed the tab were the warmest audience the
 * campaign produced, and they were the only ones with nothing to open.
 *
 * This board leads with exactly them. The dark panel at the top is not a
 * dashboard statistic, it is a work order: this many businesses showed you
 * interest and never gave you a number, select them and build.
 */

/* ------------------------------- the shapes ------------------------------- */

type Segment =
  | 'forging'
  | 'failed'
  | 'door'
  | 'warm'
  | 'opened'
  | 'consented'
  | 'called'
  | 'built'
  | 'sent'
  | 'cold'
  | 'closed';

type Suite = {
  stage: string;
  voiceUrl: string | null;
  siteUrl: string | null;
  siteStatus: string | null;
  osUrl: string | null;
  /** Always false: the prospect never sees a command center. */
  osShown: boolean;
  hubUrl: string | null;
  filmStatus: string | null;
  pieces: number;
};

type Movement = {
  opened: boolean;
  clicked: boolean;
  visitedDoor: boolean;
  replied: boolean;
  lastAt: string | null;
  hits: number;
};

type SiteRun = {
  id: string;
  status: string;
  kind: string | null;
  error: string | null;
  created_at: string;
  claimed_at: string | null;
  built_at: string | null;
};

type Row = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string;
  website: string | null;
  city: string | null;
  state: string | null;
  trade: string | null;
  rating: number | null;
  review_count: number | null;
  lead_score: number | null;
  acq_stage: string;
  consent_status: string | null;
  call_stage: string | null;
  last_call_at: string | null;
  demo_emailed_at: string | null;
  checkout_sent_at: string | null;
  client_status: string | null;
  unsubscribed_at: string | null;
  is_test: boolean;
  suite: Suite;
  movement: Movement;
  segment: Segment;
  siteRun: SiteRun | null;
  personalVideo: boolean;
};

type Vitals = {
  state: 'polling' | 'building' | 'blocked';
  reason: string | null;
  freeMb: number | null;
  minFreeMb: number | null;
  queued: number | null;
  worker: string | null;
  stallMs?: number | null;
  current?: { id: string; name: string | null; since: string } | null;
  at: string;
  ageSeconds: number;
  alive: boolean;
};

type Payload = { rows: Row[]; counts: Record<Segment | 'all', number>; worker: Vitals | null; truncated?: number };

/**
 * How many rows the list paints at once. A bucket with four thousand rows in it
 * is a bucket you search, not one you scroll, and painting all of them is how a
 * board becomes unusable on the day it finally matters.
 */
const RENDER_CAP = 300;

const ORDER: Segment[] = ['door', 'warm', 'opened', 'forging', 'failed', 'built', 'consented', 'called', 'sent', 'cold', 'closed'];

const LABELS: Record<Segment, string> = {
  forging: 'On the anvil',
  failed: 'Build failed',
  door: 'Reached the door',
  warm: 'Clicked, no number',
  opened: 'Opened, no number',
  consented: 'Consented',
  called: 'Talked',
  built: 'Built, never sent',
  sent: 'Suite sent',
  cold: 'Quiet',
  closed: 'Closed',
};

const NOTES: Record<Segment, string> = {
  forging: 'Their website is being built on your machine right now. The anvil above shows the clock.',
  failed: 'The last website build failed. Retry puts it straight back on the anvil.',
  door:
    'They opened the permission page and did not type their number in. Nobody gets closer to yes than this without saying it. Build their suite and send it.',
  warm:
    'A person clicked the button and never gave a number. Rarer than it looks: four in five recorded clicks turn out to be mail security software following the link, and those are filtered out before this count.',
  opened:
    'They opened at least one email and went no further. The softest real signal there is, and still an audience nobody has ever handed anything to.',
  consented: 'They gave permission to be called. Their suite should already exist.',
  called: 'Mr. Mustard has talked to them, so everything he heard goes straight into the build.',
  built: 'Finished suites nobody has sent. This is work already paid for, sitting there.',
  sent: 'They have their suite. The follow-up sequence is chasing from here.',
  cold: 'In the campaign, nothing built, no movement yet.',
  closed: 'They bought, opted out, or were lost. Work stops.',
};

const TONE: Record<Segment, string> = {
  forging: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  failed: 'bg-[#E0301E] text-white border-[#161616]',
  door: 'bg-[#161616] text-[#F5B700] border-[#161616]',
  warm: 'bg-[#F5B700] text-[#161616] border-[#161616]',
  opened: 'bg-[#F5B700]/25 text-[#7a5c00] border-[#F5B700]',
  consented: 'bg-[#3f5d34]/15 text-[#2c4225] border-[#3f5d34]/45',
  called: 'bg-[#3f5d34] text-white border-[#161616]',
  built: 'bg-[#FFFDF8] text-[#161616] border-[#161616]',
  sent: 'bg-[#161616]/[0.06] text-[#161616]/70 border-[#161616]/25',
  cold: 'bg-transparent text-[#161616]/45 border-[#161616]/20',
  closed: 'bg-transparent text-[#161616]/35 border-[#161616]/15',
};

/* ------------------------------- small parts ------------------------------ */

function minsSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

/**
 * The forge worker runs on Sarah's machine, not on Vercel, so this board has to
 * say out loud whether it is up. With an empty queue a dead worker looks exactly
 * like an idle one, and a website that never builds is the single most expensive
 * silent failure in the whole machine.
 */
function WorkerVitals({ vitals }: { vitals: Vitals | null }) {
  const down = !vitals || !vitals.alive;
  const blocked = !down && vitals!.state === 'blocked';
  const bad = down || blocked;
  const age = (s: number) => (s < 90 ? `${s}s` : `${Math.round(s / 60)}m`);
  const gb = (mb: number | null | undefined) => (mb == null ? null : mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb}MB`);

  let headline: string;
  let detail: React.ReactNode = null;
  if (!vitals) {
    headline = 'The forge worker has never reported in';
    detail = <>It writes its health on every poll, so no row at all means it has not run since this shipped.</>;
  } else if (!vitals.alive) {
    headline = `The forge worker is DOWN (last heard ${age(vitals.ageSeconds)} ago)`;
  } else if (vitals.state === 'blocked') {
    headline = 'The forge worker is up and refusing to claim';
    detail = <>{vitals.reason}. It resumes on its own the moment the machine frees up, so close something heavy rather than restarting it.</>;
  } else if (vitals.state === 'building' && vitals.current) {
    headline = `Building ${vitals.current.name || vitals.current.id}`;
    detail = (
      <>
        {minsSince(vitals.current.since)}m in on {vitals.worker}. Free memory {gb(vitals.freeMb)}.
      </>
    );
  } else {
    headline = 'The forge worker is up and polling';
    detail = (
      <>
        {vitals.queued ?? 0} queued. Free memory {gb(vitals.freeMb)} against a {gb(vitals.minFreeMb)} floor. Heard {age(vitals.ageSeconds)} ago.
      </>
    );
  }

  return (
    <div
      className={`mt-4 flex items-start gap-2.5 rounded-xl border-2 px-4 py-3 font-sans text-[13px] leading-relaxed text-[#FBF6EA] ${
        bad ? 'border-[#E0301E]/60 bg-[#E0301E]/15' : 'border-[#FBF6EA]/15 bg-[#FBF6EA]/[0.05]'
      }`}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${bad ? 'bg-[#f0a79c]' : 'bg-[#8fbf7a] animate-pulse'}`} aria-hidden />
      <span className="min-w-0">
        <strong className="font-oswald uppercase tracking-[0.06em]">{headline}</strong>
        {detail ? <> {detail}</> : null}
        {down && (
          <>
            {' '}Voice agents still forge instantly; only the websites wait. Start it with{' '}
            <code className="font-mono text-[12px] text-[#F5B700]">node scripts/demo-site-worker.mjs</code> and the queue moves on its own.
          </>
        )}
      </span>
    </div>
  );
}

/** What is actually built for them, as links they can open right now. */
function SuiteChips({ row }: { row: Row }) {
  const chip = 'text-[10px] uppercase tracking-[0.1em] font-oswald font-semibold px-2 py-1 rounded-md border-2 transition-colors';
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {row.suite.voiceUrl && (
        <a href={row.suite.voiceUrl} target="_blank" rel="noopener noreferrer" className={`${chip} border-[#3f5d34]/50 bg-[#3f5d34]/10 text-[#2c4225] hover:border-[#3f5d34]`}>
          ☎ Voice agent ↗
        </a>
      )}
      {row.suite.siteUrl && (
        <a href={row.suite.siteUrl} target="_blank" rel="noopener noreferrer" className={`${chip} border-[#F5B700] bg-[#F5B700]/20 text-[#7a5c00] hover:bg-[#F5B700]/35`}>
          🌐 Website ↗
        </a>
      )}
      {!row.suite.siteUrl && (row.suite.siteStatus === 'queued' || row.suite.siteStatus === 'building') && (
        <span className={`${chip} border-[#161616]/25 bg-[#161616]/[0.05] text-[#161616]/60`}>
          🌐 Website building{row.siteRun ? ` · ${minsSince(row.siteRun.claimed_at ?? row.siteRun.created_at)}m` : ''}
        </span>
      )}
      {/*
        YOURS, NOT THEIRS. The command center is off the suite and out of the
        offer, so this chip is an internal link to something you built by hand.
        The prospect's page has no door for it and their email never names it.
      */}
      {row.suite.osUrl && (
        <a
          href={row.suite.osUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${chip} border-dashed border-[#161616]/25 bg-transparent text-[#161616]/40 hover:border-[#161616]/60`}
          title="Yours only. The command center is not part of the suite or the offer: they never see it and it is never suggested to them."
        >
          ⚙ Command center · yours only ↗
        </a>
      )}
      {row.suite.hubUrl && (
        <a href={row.suite.hubUrl} target="_blank" rel="noopener noreferrer" className={`${chip} border-[#161616] bg-[#161616] text-[#F5B700] hover:-translate-y-0.5`}>
          ▦ Their suite ↗
        </a>
      )}
      {row.personalVideo ? (
        <span className={`${chip} border-[#E0301E]/45 bg-[#E0301E]/10 text-[#a32315]`} title="A face-to-camera video is attached. It leads their suite page and their email.">
          ▶ Your video
        </span>
      ) : (
        row.suite.pieces > 0 && (
          <Link
            href={`/admin/acquisition/prospects/${row.id}`}
            className={`${chip} border-dashed border-[#161616]/25 bg-transparent text-[#161616]/45 hover:border-[#E0301E] hover:text-[#a32315]`}
            title="Attach a face-to-camera video. It then leads their suite page and their email."
          >
            + Add your video
          </Link>
        )
      )}
      {row.suite.filmStatus === 'ready' && (
        <span className={`${chip} border-[#3f5d34]/45 bg-[#3f5d34]/10 text-[#2c4225]`} title="The walkthrough film cut from their own suite is ready.">
          🎬 Film
        </span>
      )}
      {row.segment === 'failed' && row.siteRun?.error && (
        <span className="max-w-[420px] truncate font-sans text-[11px] text-[#a32315]" title={row.siteRun.error}>
          {row.siteRun.error}
        </span>
      )}
    </div>
  );
}

/** What THEY did, on their side. The reason this row is on the board. */
function MovementChips({ m }: { m: Movement }) {
  const chip = 'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide whitespace-nowrap';
  return (
    <span className="flex flex-wrap items-center gap-1">
      {m.visitedDoor && <span className={`${chip} border-[#161616] bg-[#161616] text-[#F5B700]`} title="They opened the permission page">Door</span>}
      {m.clicked && <span className={`${chip} border-[#F5B700] bg-[#F5B700]/25 text-[#7a5c00]`}>Clicked</span>}
      {m.opened && <span className={`${chip} border-[#161616]/20 bg-[#161616]/[0.06] text-[#161616]/70`}>Opened</span>}
      {m.replied && <span className={`${chip} border-[#E0301E] bg-[#E0301E] text-white`}>Replied</span>}
      {!m.hits && <span className="font-sans text-[11px] text-[#161616]/35">No movement yet</span>}
    </span>
  );
}

/* --------------------------------- board ---------------------------------- */

export default function AcqForge() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [segment, setSegment] = useState<Segment | 'all'>('door');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [designTier, setDesignTier] = useState<2 | 3>(2);
  const [talkingWebsite, setTalkingWebsite] = useState(false);
  const [withSite, setWithSite] = useState(true);
  const [busy, setBusy] = useState('');
  const [burst, setBurst] = useState(0);
  const { toasts, push } = useToasts();
  const [, setTick] = useState(0);
  const forgingRef = useRef<Set<string>>(new Set());
  const armed = useRef(false);

  const load = useCallback(
    async (background = false) => {
      if (!background) setLoading(true);
      try {
        const next = await api<Payload>('/api/admin/acquisition/forge');
        // The payoff: a build that was on the anvil last poll and is live now
        // gets announced rather than quietly changing color.
        const landed = next.rows.filter((r) => forgingRef.current.has(r.id) && r.suite.siteUrl);
        if (armed.current && landed.length) {
          setBurst((b) => b + 1);
          push(
            landed.length === 1
              ? `${possessive(landed[0].business_name)} website just landed. Send their suite. 🌱`
              : `${landed.length} websites just landed. Send them. 🌱`,
          );
        }
        forgingRef.current = new Set(next.rows.filter((r) => r.segment === 'forging').map((r) => r.id));
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
    if (typeof window !== 'undefined') {
      const s = new URLSearchParams(window.location.search).get('segment');
      if (s && (s === 'all' || (ORDER as string[]).includes(s))) setSegment(s as Segment | 'all');
    }
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
    if (segment === 'all') p.delete('segment');
    else p.set('segment', segment);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [segment]);

  const rows = data?.rows ?? [];
  const counts = data?.counts;
  const forging = useMemo(() => rows.filter((r) => r.segment === 'forging'), [rows]);
  const stalled = useMemo(
    () => forging.filter((r) => r.siteRun && !r.siteRun.claimed_at && minsSince(r.siteRun.created_at) >= 10),
    [forging],
  );
  const interested = (counts?.door ?? 0) + (counts?.warm ?? 0) + (counts?.opened ?? 0);

  const visible = useMemo(() => {
    let out = rows;
    if (segment !== 'all') out = out.filter((r) => r.segment === segment);
    else out = out.filter((r) => r.segment !== 'closed');
    const needle = q.trim().toLowerCase();
    if (needle) {
      out = out.filter((r) =>
        [r.business_name, r.contact_name, r.city, r.phone, r.email, r.website].some((v) => v?.toLowerCase().includes(needle)),
      );
    }
    return out;
  }, [rows, segment, q]);

  // A selection that survives a filter change is a selection that sends a demo
  // to somebody you cannot see. It is cleared whenever the view changes.
  useEffect(() => setSelected(new Set()), [segment, q]);

  // The cap applies to PAINTING, never to selecting: "select all 1,240" has to
  // mean all 1,240 or the button is lying about what it just queued.
  const painted = useMemo(() => visible.slice(0, RENDER_CAP), [visible]);
  const visibleIds = useMemo(() => visible.map((r) => r.id), [visible]);
  const allShown = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const act = async (action: string, ids: string[], extra: Record<string, unknown> = {}) => {
    if (!ids.length) return;
    setBusy(action);
    try {
      const res = await api<{ note?: string; refused?: string[]; failures?: string[]; results?: { ok: boolean; business: string; note: string }[] }>(
        '/api/admin/acquisition/forge',
        {
          method: 'POST',
          body: JSON.stringify({ action, ids, site: withSite, designTier, talkingWebsite, ...extra }),
        },
      );
      push(res.note ?? 'Done.');
      // Refusals are named out loud. A silent skip in a batch of fifty is how
      // you end up believing you sent something you did not.
      for (const line of [...(res.refused ?? []), ...(res.failures ?? [])].slice(0, 4)) push(line, 'error');
      for (const r of (res.results ?? []).filter((x) => !x.ok).slice(0, 4)) push(`${r.business}: ${r.note}`, 'error');
      setSelected(new Set());
      await load(true);
    } catch (e) {
      push(e instanceof Error ? e.message : 'That did not go through.', 'error');
    } finally {
      setBusy('');
    }
  };

  const selectedRows = rows.filter((r) => selected.has(r.id));
  // No email address means no suite email, ever. Counting those as sendable is
  // how a button promises fifty sends and quietly performs eleven. The outbound
  // cockpit forges plenty of phone-only leads and they land in these buckets too.
  const sendable = (r: Row) => Boolean(r.email) && Boolean(r.suite.hubUrl) && r.suite.pieces > 0 && !r.demo_emailed_at;
  const sendableCount = selectedRows.filter(sendable).length;

  return (
    <div className="min-h-screen bg-[#FBF6EA] pb-32 text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition · The Forge" onRefresh={() => void load()} />
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-6">
        <AcqNav
          active="forge"
          badge={{ forge: interested }}
          right={
            <span className="flex items-center gap-2 font-sans text-xs text-[#161616]/45">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#3f5d34]" aria-hidden />
              Live · refreshes itself
            </span>
          }
        />

        {error && (
          <div className={`${card} mb-6 border-[#E0301E] p-5 shadow-[5px_5px_0_0_#E0301E]`}>
            <p className="font-sans text-sm font-medium text-[#E0301E]">{error}</p>
          </div>
        )}

        {/* ── The work order: who is warm, and what is on the anvil ── */}
        <section className="mb-6 overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#161616] p-5 shadow-[6px_6px_0_0_#F5B700] md:p-6">
          <style>{`
            @keyframes mms-acq-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }
            @keyframes mms-acq-ember { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
          `}</style>

          <div className="flex flex-wrap items-end justify-between gap-5">
            <button onClick={() => setSegment('door')} className="group text-left" title="They opened the permission page and never typed a number">
              <span className={`${eyebrow} block`}>Interested, never gave a number</span>
              <p className="mt-1 font-oswald text-5xl font-bold leading-none text-[#F5B700] md:text-6xl">
                {interested.toLocaleString()}
                <span className="ml-2 text-base font-semibold uppercase tracking-[0.1em] text-[#FBF6EA]/45 md:text-lg">
                  {interested === 1 ? 'business' : 'businesses'}
                </span>
              </p>
              <p className="mt-1.5 max-w-xl font-sans text-[13px] leading-relaxed text-[#FBF6EA]/60">
                {(counts?.door ?? 0).toLocaleString()} walked all the way to the permission page and stopped.{' '}
                {(counts?.warm ?? 0).toLocaleString()} clicked the button. The rest opened and read. Build their suite,
                put a video on it, and lead with the thing instead of the ask.
              </p>
            </button>

            <div className="flex gap-3">
              <div className="rounded-xl border-2 border-[#FBF6EA]/15 px-4 py-3">
                <span className="block font-oswald text-[10px] uppercase tracking-[0.22em] text-[#FBF6EA]/45">On the anvil</span>
                <span className="font-oswald text-3xl font-bold leading-none text-[#FBF6EA]">{forging.length}</span>
              </div>
              <button
                onClick={() => setSegment('built')}
                className="rounded-xl border-2 border-[#F5B700]/50 px-4 py-3 text-left transition-colors hover:border-[#F5B700]"
                title="Finished suites nobody has sent yet"
              >
                <span className="block font-oswald text-[10px] uppercase tracking-[0.22em] text-[#FBF6EA]/45">Built, never sent</span>
                <span className="font-oswald text-3xl font-bold leading-none text-[#F5B700]">{counts?.built ?? 0}</span>
              </button>
            </div>
          </div>

          <WorkerVitals vitals={data?.worker ?? null} />

          {stalled.length >= 2 && data?.worker?.alive && data.worker.state !== 'blocked' && (
            <p className="mt-3 flex items-start gap-2.5 rounded-xl border-2 border-[#F5B700]/50 bg-[#F5B700]/10 px-4 py-3 font-sans text-[13px] leading-relaxed text-[#FBF6EA]">
              <span aria-hidden>⚠</span>
              <span>
                <strong className="font-oswald uppercase tracking-[0.06em]">{stalled.length} builds are waiting behind it</strong>{' '}
                (oldest {Math.max(...stalled.map((r) => minsSince(r.siteRun!.created_at)))}m). The forge builds one at a time, so a deep queue is slow, not broken.
              </span>
            </p>
          )}

          {forging.length > 0 && (
            <div className="mt-4 space-y-2">
              {forging.slice(0, 5).map((r) => {
                const started = r.siteRun?.claimed_at ?? r.siteRun?.created_at ?? null;
                const mins = started ? minsSince(started) : 0;
                const isStalled = stalled.some((s) => s.id === r.id);
                return (
                  <div key={r.id} className="rounded-xl border border-[#FBF6EA]/15 bg-[#FBF6EA]/[0.05] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="shrink-0 text-base" style={{ animation: 'mms-acq-ember 1.8s ease-in-out infinite' }} aria-hidden>
                        {isStalled ? '⚠' : '⚒'}
                      </span>
                      <Link
                        href={`/admin/acquisition/prospects/${r.id}`}
                        className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-[#FBF6EA] transition-colors hover:text-[#F5B700]"
                      >
                        {r.business_name}
                      </Link>
                      <span className={`shrink-0 font-oswald text-[11px] uppercase tracking-[0.12em] ${isStalled ? 'text-[#f0a79c]' : 'text-[#FBF6EA]/55'}`}>
                        {isStalled ? `queued ${mins}m` : `${r.siteRun?.kind === 'edit' ? 'reforging' : 'building'} · ${mins}m`}
                      </span>
                    </div>
                    <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[#FBF6EA]/12">
                      <span
                        className={`absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent to-transparent ${isStalled ? 'via-[#FBF6EA]/25' : 'via-[#F5B700]'}`}
                        style={{ animation: `mms-acq-sweep ${isStalled ? '4.5s' : '2.2s'} linear infinite` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                );
              })}
              {forging.length > 5 && (
                <p className="pt-1 text-center font-oswald text-[11px] uppercase tracking-[0.14em] text-[#FBF6EA]/45">
                  and {forging.length - 5} more building
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Buckets and build settings ── */}
        <div className={`${card} mb-5 p-4`}>
          <div className="mb-3 flex flex-wrap items-center gap-2 border-b-2 border-[#161616]/10 pb-3">
            <span className={`${eyebrow} mr-1`}>Workbench</span>
            {(['all', ...ORDER] as const).map((k) => {
              const n = k === 'all' ? (counts ? counts.all - counts.closed : 0) : (counts?.[k] ?? 0);
              if ((k === 'closed' || k === 'cold') && n === 0) return null;
              const active = segment === k;
              return (
                <button
                  key={k}
                  onClick={() => setSegment(k)}
                  className={`rounded-lg border-2 px-3 py-1.5 font-oswald text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    active
                      ? 'border-[#161616] bg-[#161616] text-[#FBF6EA] shadow-[2px_2px_0_0_#F5B700]'
                      : 'border-[#161616]/20 bg-white text-[#161616]/70 hover:border-[#F5B700] hover:text-[#161616]'
                  }`}
                >
                  {k === 'all' ? 'Everything' : LABELS[k]}
                  <span className={`ml-1.5 tabular-nums ${active ? 'text-[#F5B700]' : 'text-[#161616]/40'}`}>{n}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search business, contact, city, phone, site"
              className={`${inputCls} !w-80 !py-2`}
              aria-label="Search the forge board"
            />
            <span className="flex items-center gap-1.5" role="group" aria-label="Design tier for website builds">
              <span className={`${eyebrow} mr-0.5`}>Design</span>
              {([2, 3] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDesignTier(t)}
                  title={t === 2 ? 'The Wildmere award-site world. The house style.' : 'The Journey site (the Flathead homepage template)'}
                  className={`rounded-lg border-2 px-3 py-1.5 font-oswald text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    designTier === t
                      ? 'border-[#161616] bg-[#161616] text-[#FBF6EA] shadow-[2px_2px_0_0_#F5B700]'
                      : 'border-[#161616]/20 bg-white text-[#161616]/70 hover:border-[#F5B700]'
                  }`}
                >
                  {t === 3 ? 'Tier 3 · Journey' : 'Tier 2 · World'}
                </button>
              ))}
              <button
                onClick={() => setTalkingWebsite((v) => !v)}
                aria-pressed={talkingWebsite}
                title="Make the talking layer the star: the hero names it and a sign pitches The Talking Website by name"
                className={`rounded-lg border-2 px-3 py-1.5 font-oswald text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  talkingWebsite
                    ? 'border-[#161616] bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616]'
                    : 'border-[#161616]/20 bg-white text-[#161616]/70 hover:border-[#F5B700]'
                }`}
              >
                🗣 Talking Website
              </button>
              <button
                onClick={() => setWithSite((v) => !v)}
                aria-pressed={withSite}
                title={
                  withSite
                    ? 'A forge builds the voice agent AND queues the website.'
                    : 'A forge builds only the instant piece: the voice agent.'
                }
                className={`rounded-lg border-2 px-3 py-1.5 font-oswald text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  withSite
                    ? 'border-[#161616] bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616]'
                    : 'border-[#161616]/20 bg-white text-[#161616]/70 hover:border-[#F5B700]'
                }`}
              >
                {withSite ? '🌐 Website included' : '⚡ Instant pieces only'}
              </button>
            </span>
            <span className="ml-auto flex items-center gap-3">
              {visible.length > 0 && (
                <button
                  onClick={() => setSelected(allShown ? new Set() : new Set(visibleIds))}
                  className="font-oswald text-[11px] uppercase tracking-[0.1em] text-[#161616]/55 underline decoration-[#F5B700] decoration-2 underline-offset-4 hover:text-[#161616]"
                >
                  {allShown ? 'Clear selection' : `Select all ${visible.length}`}
                </button>
              )}
              <span className="font-oswald text-sm uppercase tracking-[0.1em] text-[#161616]/50">
                {visible.length} {visible.length === 1 ? 'business' : 'businesses'}
              </span>
            </span>
          </div>
        </div>

        {segment !== 'all' && (
          <p className="mb-3 px-1 font-sans text-sm leading-relaxed text-[#161616]/65">{NOTES[segment]}</p>
        )}

        {/* ── The list ── */}
        <div className={`${card} overflow-hidden`}>
          {loading && <div className="p-10 text-center font-oswald uppercase text-[#161616]/40">Loading the workbench...</div>}

          {!loading && visible.length === 0 && (
            <div className="p-12 text-center">
              <p className="font-oswald text-lg uppercase text-[#161616]/50">
                {segment === 'door' || segment === 'warm' ? 'Nobody warm is going unbuilt' : 'Nothing here'}
              </p>
              <p className="mt-1 font-sans text-sm text-[#161616]/55">
                {segment === 'door' || segment === 'warm'
                  ? 'Everyone who moved has a suite built for them. That is exactly how this should look.'
                  : q
                    ? 'No match for that search in this bucket.'
                    : 'Try another bucket.'}
              </p>
            </div>
          )}

          <ul className="divide-y divide-[#161616]/[0.08]">
            {painted.map((r) => {
              const checked = selected.has(r.id);
              return (
                <li key={r.id} className={`px-4 py-4 transition-colors md:px-5 ${checked ? 'bg-[#F5B700]/[0.13]' : 'hover:bg-[#F5B700]/[0.06]'}`}>
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                    <label className="mt-1 flex shrink-0 cursor-pointer items-center" title={`Select ${r.business_name}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(r.id)}
                        className="h-4 w-4 cursor-pointer accent-[#161616]"
                        aria-label={`Select ${r.business_name}`}
                      />
                    </label>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/acquisition/prospects/${r.id}`}
                          className="font-sans text-[15px] font-semibold text-[#161616] transition-colors hover:text-[#8a6a1f]"
                        >
                          {r.business_name}
                        </Link>
                        <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 font-oswald text-[9px] font-bold uppercase tracking-[0.12em] ${TONE[r.segment]}`}>
                          {LABELS[r.segment]}
                        </span>
                        {r.is_test && (
                          <span className="rounded-md border border-[#161616]/20 bg-[#161616]/[0.06] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#161616]/60">
                            test
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 font-sans text-xs text-[#161616]/55">
                        {r.city && <span>{r.city}{r.state ? `, ${r.state}` : ''}</span>}
                        {r.trade && <span>· {r.trade.replace(/_/g, ' ')}</span>}
                        {r.rating != null && r.review_count != null && (
                          <span title="Read off their own public listing. The site brief prints these verbatim.">
                            · {r.rating}★ on {r.review_count.toLocaleString()} reviews
                          </span>
                        )}
                        {r.lead_score != null && <span className="font-oswald">· score {r.lead_score}</span>}
                        {!r.website && <span className="font-semibold text-[#a32315]">· no website</span>}
                        {!r.email && (
                          <span className="font-semibold text-[#a32315]" title="No email address on the record, so their suite can only be handed over by phone.">
                            · phone only, no email
                          </span>
                        )}
                      </div>

                      <SuiteChips row={r} />
                    </div>

                    <div className="w-full shrink-0 sm:w-52">
                      <span className="block font-oswald text-[10px] uppercase tracking-[0.18em] text-[#161616]/40">What they did</span>
                      <div className="mt-1"><MovementChips m={r.movement} /></div>
                      {r.movement.lastAt && (
                        <span className="mt-1 block font-sans text-[11px] text-[#161616]/45">last {timeAgo(r.movement.lastAt)}</span>
                      )}
                      {r.demo_emailed_at && (
                        <span className="mt-0.5 block font-sans text-[11px] font-semibold text-[#2c4225]">suite sent {timeAgo(r.demo_emailed_at)}</span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {r.segment === 'failed' && (
                        <button
                          onClick={() => void act('retry-site', [r.id])}
                          disabled={busy !== ''}
                          className={`${btnGhost} !border-[#E0301E] !px-3 !py-2 !text-xs !text-[#E0301E] !shadow-[3px_3px_0_0_#E0301E]`}
                        >
                          Retry build
                        </button>
                      )}
                      {r.suite.pieces === 0 && r.segment !== 'closed' && (
                        <button onClick={() => void act('forge', [r.id])} disabled={busy !== ''} className={`${btnPrimary} !px-3.5 !py-2 !text-xs`}>
                          {busy === 'forge' ? 'Forging…' : '⚒ Forge'}
                        </button>
                      )}
                      {/* Built, but no website: name the website on the button that
                          builds it. */}
                      {r.suite.pieces > 0 && !r.suite.siteUrl && r.segment !== 'forging' && r.segment !== 'closed' && (
                        <button
                          onClick={() => void act('forge', [r.id])}
                          disabled={busy !== ''}
                          className={`${btnPrimary} !px-3.5 !py-2 !text-xs`}
                          title="Queue their demo website. Twenty to forty minutes on your machine."
                        >
                          {busy === 'forge' ? 'Queuing…' : '🌐 Forge website'}
                        </button>
                      )}
                      {sendable(r) && (
                        <button onClick={() => void act('send-suite', [r.id])} disabled={busy !== ''} className={`${btnPrimary} !px-3.5 !py-2 !text-xs`}>
                          {busy === 'send-suite' ? 'Sending…' : '✉ Send suite'}
                        </button>
                      )}
                      <Link href={`/admin/acquisition/prospects/${r.id}`} className={`${btnGhost} !px-3 !py-2 !text-xs`}>
                        Open
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {visible.length > painted.length && (
            <p className="border-t-2 border-[#161616]/10 px-5 py-4 text-center font-sans text-[13px] text-[#161616]/60">
              Showing the first {painted.length} of {visible.length.toLocaleString()}. Search to narrow it, or press
              &ldquo;Select all {visible.length.toLocaleString()}&rdquo; above, which selects every one of them and not
              just the ones on screen.
            </p>
          )}
        </div>

        {(data?.truncated ?? 0) > 0 && (
          <p className="mt-4 px-1 font-sans text-[13px] leading-relaxed text-[#161616]/60">
            {(data?.truncated ?? 0).toLocaleString()} more prospects matched but were left off this board to keep it
            fast. They are still in the campaign and nothing has been lost; work these buckets down and they surface.
          </p>
        )}
      </main>

      {/* ── The bulk bar: only ever visible when something is selected ── */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-[#161616] bg-[#161616] px-5 py-3.5 shadow-[0_-4px_0_0_#F5B700]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
            <span className="font-oswald text-sm font-semibold uppercase tracking-[0.1em] text-[#F5B700]">
              {selected.size} selected
            </span>
            <span className="hidden font-sans text-[12px] text-[#FBF6EA]/55 sm:inline">
              Tier {designTier}
              {talkingWebsite ? ' · Talking Website' : ''}
              {withSite ? ' · website included' : ' · instant pieces only'}
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => void act('forge', [...selected])}
                disabled={busy !== ''}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#161616] bg-[#F5B700] px-4 py-2.5 font-oswald text-sm font-semibold uppercase tracking-[0.08em] text-[#161616] shadow-[3px_3px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
              >
                {busy === 'forge' ? 'Forging…' : `⚒ Forge ${selected.size} suite${selected.size === 1 ? '' : 's'}`}
              </button>
              <button
                onClick={() => void act('send-suite', [...selected])}
                disabled={busy !== '' || sendableCount === 0}
                title={sendableCount === 0 ? 'None of these have a built suite that has not already been sent.' : undefined}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#FBF6EA] bg-transparent px-4 py-2.5 font-oswald text-sm font-medium uppercase tracking-[0.08em] text-[#FBF6EA] transition-all hover:-translate-y-0.5 hover:bg-[#FBF6EA] hover:text-[#161616] disabled:pointer-events-none disabled:opacity-30"
              >
                {busy === 'send-suite' ? 'Sending…' : `✉ Send ${sendableCount} now`}
              </button>
              <button
                onClick={() => void act('queue-suite', [...selected])}
                disabled={busy !== ''}
                title="Hand them to the engine, which sends inside the window and under the caps."
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#FBF6EA]/40 bg-transparent px-4 py-2.5 font-oswald text-sm font-medium uppercase tracking-[0.08em] text-[#FBF6EA]/80 transition-all hover:border-[#FBF6EA] hover:text-[#FBF6EA] disabled:pointer-events-none disabled:opacity-30"
              >
                {busy === 'queue-suite' ? 'Queuing…' : 'Queue the sends'}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="font-oswald text-[11px] uppercase tracking-[0.12em] text-[#FBF6EA]/50 hover:text-[#FBF6EA]"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {burst > 0 && <SeedBurst key={burst} />}
      <ToastHost toasts={toasts} />
    </div>
  );
}
