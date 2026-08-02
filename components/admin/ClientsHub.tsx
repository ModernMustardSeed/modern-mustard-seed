'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/**
 * THE CLIENT BOOK. Every client on one page, each card carrying everything we
 * ever made them (live and clickable), where they sit on the pipeline, and one
 * click into their file, their delivery, and their proposal. The front of the
 * pipeline (proposals not yet signed) sits below in the same book, so a lead is
 * worked to completion from one place, the way delivery mode already works.
 */

type Made = { label: string; url: string; tone: 'live' | 'demo' };
type ProjectLite = { id: string; name: string; status: string; progress: number; liveUrl: string | null; carePlan: boolean };
type ProposalLite = {
  id: string;
  status: string;
  depositStatus: string;
  balanceStatus: string | null;
  signedAt: string | null;
  sentAt: string | null;
  shareToken: string | null;
  oneTime: number;
  monthly: number;
};
type NextAction = { label: string; tone: 'red' | 'gold' | 'blue' | 'green'; rank: number };
type ClientRow = {
  email: string;
  name: string | null;
  company: string | null;
  tier: string | null;
  status: string | null;
  createdAt: string;
  nextAction: NextAction;
  spine: { in: boolean; committed: boolean; building: boolean; live: boolean };
  projects: ProjectLite[];
  products: { kind: string; label: string; status: string }[];
  made: Made[];
  proposal: ProposalLite | null;
  revisions: { used: number; included: number };
  openRequests: number;
};
type Prospect = {
  id: string;
  email: string | null;
  company: string;
  name: string | null;
  status: string;
  sentAt: string | null;
  signedAt: string | null;
  shareToken: string | null;
  oneTime: number;
  monthly: number;
  demoLinks: { label: string; url: string }[];
  viewCount: number;
  lastViewedAt: string | null;
};
type Stats = { total: number; live: number; building: number; awaiting: number; openRequests: number };

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const BTN_QUIET =
  'px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform no-underline inline-block';

type Filter = 'all' | 'live' | 'building' | 'waiting' | 'attention';

/** The one line that says what this client needs from Sarah today. */
function NextActionStrip({ a }: { a: NextAction }) {
  const cls = {
    red: 'bg-[#E0301E]/10 border-[#E0301E]/40 text-[#C4160B]',
    gold: 'bg-[#F5B700]/15 border-[#8f6600]/35 text-[#8f6600]',
    blue: 'bg-blue-50 border-[#1E50C8]/30 text-[#1E50C8]',
    green: 'bg-emerald-50 border-emerald-700/25 text-emerald-800',
  }[a.tone];
  return (
    <p className={`mt-3 rounded-lg border px-2.5 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.02em] ${cls}`}>
      {a.rank === 0 ? '⚡ ' : ''}
      {a.label}
    </p>
  );
}

/** The pipeline spine: the four beats every client walks, lit as far as they are. */
function Spine({ spine }: { spine: ClientRow['spine'] }) {
  const steps = [
    { label: 'In', done: spine.in },
    { label: 'Committed', done: spine.committed },
    { label: 'Building', done: spine.building },
    { label: 'Live', done: spine.live },
  ];
  const lastDone = steps.reduce((acc, s, i) => (s.done ? i : acc), -1);
  return (
    <div className="mt-3.5">
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={s.label} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <span
              className={`h-3 w-3 rounded-full border-2 border-[#161616] shrink-0 transition-colors ${
                s.done ? 'bg-[#F5B700]' : 'bg-white'
              }`}
            />
            {i < steps.length - 1 && (
              <span className={`h-[3px] flex-1 mx-0.5 rounded ${i < lastDone ? 'bg-[#161616]' : 'bg-[#161616]/12'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        {steps.map((s) => (
          <span
            key={s.label}
            className={`font-mono text-[8px] uppercase tracking-[0.12em] font-bold ${
              s.done ? 'text-[#161616]' : 'text-[#161616]/35'
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function MadeChips({ made }: { made: Made[] }) {
  if (!made.length) return null;
  return (
    <div className="mt-3">
      <span className="block text-[9px] uppercase tracking-[0.22em] text-[#161616]/45 font-mono font-bold mb-1.5">
        Everything we made
      </span>
      <div className="flex flex-wrap gap-1.5">
        {made.map((m) => (
          <a
            key={m.url}
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 rounded-lg border-2 border-[#161616] px-2.5 py-1 font-sans text-[11px] font-bold no-underline hover:-translate-y-0.5 transition-transform ${
              m.tone === 'live' ? 'bg-[#F5B700] text-[#161616]' : 'bg-[#FBF6EA] text-[#161616]'
            }`}
          >
            <span className="max-w-[180px] truncate">{m.label}</span>
            <span aria-hidden="true" className="text-[10px]">↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function ClientsHub() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/clients');
        const j = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok) {
          setError(j?.error ?? 'Could not load the client book.');
          return;
        }
        setClients(j.clients ?? []);
        setProspects(j.prospects ?? []);
        setStats(j.stats ?? null);
      } catch {
        if (alive) setError('Could not load the client book.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (needle) {
        const hay = `${c.company ?? ''} ${c.name ?? ''} ${c.email}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (filter === 'live') return c.spine.live;
      if (filter === 'building') return c.spine.building && !c.spine.live;
      if (filter === 'waiting') return Boolean(c.proposal && !c.proposal.signedAt && c.proposal.status === 'sent');
      if (filter === 'attention') return c.openRequests > 0;
      return true;
    });
  }, [clients, q, filter]);

  const filteredProspects = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return prospects;
    return prospects.filter((p) => `${p.company} ${p.name ?? ''} ${p.email ?? ''}`.toLowerCase().includes(needle));
  }, [prospects, q]);

  const pill = (label: string, value: number | string, tone: 'gold' | 'plain' | 'red' = 'plain') => (
    <span
      className={`inline-flex items-baseline gap-1.5 rounded-lg border-2 border-[#161616] px-3 py-1.5 shadow-[2px_2px_0_0_#161616] ${
        tone === 'gold' ? 'bg-[#F5B700]' : tone === 'red' ? 'bg-[#E0301E] text-white' : 'bg-white'
      }`}
    >
      <span className="font-display text-[17px] font-black leading-none">{value}</span>
      <span className={`font-mono text-[9px] uppercase tracking-[0.14em] font-bold ${tone === 'red' ? 'text-white/85' : 'text-[#161616]/60'}`}>
        {label}
      </span>
    </span>
  );

  const filterChip = (key: Filter, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={`px-3 py-1.5 rounded-lg border-2 text-[10px] uppercase tracking-[0.14em] font-sans font-extrabold transition-colors ${
        filter === key
          ? 'bg-[#F5B700] border-[#161616] text-[#161616] shadow-[2px_2px_0_0_#161616]'
          : 'border-[#161616]/20 text-[#161616]/55 hover:text-[#161616] hover:border-[#161616]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FBF6EA] px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1">
          The Client Book
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[#161616] mb-2 tracking-tight">
          Every client, everything we made
        </h1>
        <p className="font-body text-[#161616]/60 mb-5 max-w-2xl">
          One book for the whole roster. Every card carries their live work, their pipeline position, and
          one click into their file, their delivery, and their proposal.
        </p>

        {stats && (
          <div className="flex flex-wrap gap-2 mb-6">
            {pill('Clients', stats.total, 'gold')}
            {pill('Live', stats.live)}
            {pill('In build', stats.building)}
            {pill('Awaiting signature', stats.awaiting)}
            {stats.openRequests > 0 && pill('Open requests', stats.openRequests, 'red')}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-7">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, company, email…"
            className="w-full sm:w-80 rounded-lg border-2 border-[#161616] bg-white px-3.5 py-2 font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
          />
          <div className="flex flex-wrap gap-1.5">
            {filterChip('all', 'All')}
            {filterChip('live', 'Live')}
            {filterChip('building', 'In build')}
            {filterChip('waiting', 'Waiting on them')}
            {filterChip('attention', 'Needs you')}
          </div>
        </div>

        {loading ? (
          <p className="font-body text-[#161616]/50">Opening the book…</p>
        ) : error ? (
          <div className={`${CARD} p-6`}>
            <p className="font-body text-[#C4160B]">{error}</p>
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className={`${CARD} p-8 text-center`}>
                <p className="font-body text-[#161616]/60">
                  {clients.length === 0 ? 'No clients yet. The moment someone signs or buys, they land here.' : 'Nothing matches that search.'}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filtered.map((c) => (
                  <div key={c.email} className={`${CARD} p-5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#161616] transition-all`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-[21px] font-black text-[#161616] leading-tight truncate">
                          {c.company || c.name || c.email}
                        </h3>
                        <p className="font-mono text-[11px] text-[#161616]/50 mt-0.5 truncate">
                          {[c.name && c.name !== c.company ? c.name : null, c.email].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {c.spine.live ? (
                          <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border text-emerald-800 border-emerald-800/25 bg-emerald-100">Live</span>
                        ) : c.spine.building ? (
                          <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border text-[#161616] border-[#161616]/30 bg-[#F5B700]/25">Building</span>
                        ) : c.proposal && !c.proposal.signedAt ? (
                          <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border text-[#1E50C8] border-[#1E50C8]/30 bg-blue-100">Proposal out</span>
                        ) : (
                          <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border text-[#161616]/70 border-[#161616]/20 bg-[#FBF6EA]">Client</span>
                        )}
                        {c.openRequests > 0 && (
                          <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border text-[#C4160B] border-[#E0301E]/35 bg-[#E0301E]/10">
                            {c.openRequests} open
                          </span>
                        )}
                      </div>
                    </div>

                    <NextActionStrip a={c.nextAction} />
                    <Spine spine={c.spine} />
                    <MadeChips made={c.made} />

                    {(c.products.length > 0 || c.revisions.included > 0 || c.projects.some((p) => p.carePlan)) && (
                      <p className="font-mono text-[10.5px] text-[#161616]/55 mt-3">
                        {[
                          c.products.length ? c.products.map((p) => p.label).slice(0, 3).join(' · ') : null,
                          c.revisions.included ? `${c.revisions.used}/${c.revisions.included} edits` : null,
                          c.projects.some((p) => p.carePlan) ? 'Care Plan ✓' : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-4 pt-3.5 border-t-2 border-[#161616]/10">
                      <Link href={`/admin/clients/${encodeURIComponent(c.email)}`} className={`${BTN_QUIET} !bg-[#F5B700]`}>
                        Open file →
                      </Link>
                      {c.spine.building && (
                        <Link href="/admin/delivery" className={BTN_QUIET}>
                          Delivery
                        </Link>
                      )}
                      <Link href={`/admin/proposals?email=${encodeURIComponent(c.email)}`} className={BTN_QUIET}>
                        Proposal
                      </Link>
                      {c.proposal?.shareToken && (
                        <a href={`/proposal/${c.proposal.shareToken}`} target="_blank" rel="noopener noreferrer" className={BTN_QUIET}>
                          Their doc ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* The front of the pipeline: proposals out in the world, not yet clients. */}
            {filteredProspects.length > 0 && (
              <div className="mt-10">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1">
                  In the pipeline
                </span>
                <h2 className="font-display text-2xl font-bold text-[#161616] mb-4">
                  Proposals out, not signed yet
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredProspects.map((p) => (
                    <div key={p.id} className={`${CARD} p-5`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-[19px] font-black text-[#161616] leading-tight truncate">{p.company}</h3>
                          <p className="font-mono text-[11px] text-[#161616]/50 mt-0.5 truncate">
                            {[p.email, p.oneTime ? usd(p.oneTime) : null, p.monthly ? `${usd(p.monthly)}/mo` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        <span className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border ${
                              p.status === 'sent'
                                ? 'text-[#1E50C8] border-[#1E50C8]/30 bg-blue-100'
                                : p.status === 'declined'
                                  ? 'text-[#161616]/45 border-[#161616]/15 bg-[#161616]/[0.04]'
                                  : 'text-[#161616]/70 border-[#161616]/20 bg-[#FBF6EA]'
                            }`}
                          >
                            {p.status === 'sent' && p.sentAt ? `Sent ${new Date(p.sentAt).toLocaleDateString()}` : p.status}
                          </span>
                          {/* The open receipt: read vs sent-into-the-void. */}
                          {p.status === 'sent' && (
                            <span
                              className={`text-[9px] uppercase tracking-[0.12em] font-mono font-bold px-2 py-0.5 rounded border ${
                                p.viewCount > 0
                                  ? 'text-emerald-800 border-emerald-800/25 bg-emerald-100'
                                  : 'text-[#C4160B] border-[#E0301E]/35 bg-[#E0301E]/10'
                              }`}
                            >
                              {p.viewCount > 0 ? `Opened ${p.viewCount}×` : 'Never opened'}
                            </span>
                          )}
                        </span>
                      </div>
                      {p.demoLinks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {p.demoLinks.map((d) => (
                            <a
                              key={d.url}
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-2.5 py-1 font-sans text-[11px] font-bold text-[#161616] no-underline hover:-translate-y-0.5 transition-transform"
                            >
                              <span className="max-w-[180px] truncate">{d.label}</span>
                              <span aria-hidden="true" className="text-[10px]">↗</span>
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-4 pt-3.5 border-t-2 border-[#161616]/10">
                        <Link
                          href={p.email ? `/admin/proposals?email=${encodeURIComponent(p.email)}` : '/admin/proposals'}
                          className={`${BTN_QUIET} !bg-[#F5B700]`}
                        >
                          Work it →
                        </Link>
                        {p.shareToken && (
                          <a href={`/proposal/${p.shareToken}`} target="_blank" rel="noopener noreferrer" className={BTN_QUIET}>
                            Their doc ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
