'use client';

import { useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { ARTIFACTS, type ArtifactEntry, type ArtifactKind, type ArtifactVenture } from '@/data/artifacts';

/**
 * The artifact directory: every published Claude artifact (moodboards, decks,
 * calendars, briefings, plans) searchable in one place, so a link is never lost
 * in a chat again. Data lives in data/artifacts.ts (curated, newest first).
 */

const KINDS: (ArtifactKind | 'All')[] = ['All', 'Playbook', 'Social', 'Moodboard', 'Briefing', 'Guide', 'Preview', 'Plan', 'Build Log'];
const VENTURES: (ArtifactVenture | 'All')[] = ['All', 'MMS', 'CXC', 'Wild Hope', 'Huckwild', 'Cross-venture'];

// Each venture gets a stable accent from the locked pop-art set.
const ventureAccent: Record<ArtifactVenture, string> = {
  MMS: '#F5B700',
  CXC: '#1E50C8',
  'Wild Hope': '#2E7D5B',
  Huckwild: '#E0301E',
  'Cross-venture': '#8f6600',
};

function fmtDate(s: string) {
  return new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(url).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}
      className="text-[11px] uppercase tracking-[0.14em] font-sans font-bold text-[#161616] px-3.5 py-2 rounded-lg border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform active:translate-y-0"
    >
      {done ? 'Copied' : 'Copy link'}
    </button>
  );
}

function Card({ a }: { a: ArtifactEntry }) {
  const accent = ventureAccent[a.venture];
  return (
    <article className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.1em] font-mono font-bold px-2 py-0.5 border-2 text-[#161616]" style={{ background: accent, borderColor: '#161616' }}>{a.venture}</span>
          <span className="text-[10px] uppercase tracking-[0.1em] font-mono font-bold px-2 py-0.5 border-2 border-[#161616]/25 text-[#161616]/65">{a.kind}</span>
          {a.pinned && <span className="text-[10px] uppercase tracking-[0.1em] font-mono font-bold px-2 py-0.5 border-2 border-[#E0301E] text-[#E0301E]">Pinned</span>}
        </div>
        <time className="text-[11px] font-mono text-[#161616]/55 tabular-nums whitespace-nowrap">{fmtDate(a.updated)}</time>
      </div>
      <h3 className="font-display text-xl font-extrabold leading-tight text-balance">{a.title}</h3>
      <p className="text-[15px] font-sans text-[#161616]/70 leading-relaxed flex-1">{a.description}</p>
      <div className="flex gap-2.5 items-center flex-wrap pt-1">
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] uppercase tracking-[0.14em] font-sans font-bold text-[#161616] px-3.5 py-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform active:translate-y-0"
        >
          Open ↗
        </a>
        <CopyLink url={a.url} />
      </div>
    </article>
  );
}

export default function ArtifactsDirectory() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<ArtifactKind | 'All'>('All');
  const [venture, setVenture] = useState<ArtifactVenture | 'All'>('All');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ARTIFACTS.filter((a) => {
      if (kind !== 'All' && a.kind !== kind) return false;
      if (venture !== 'All' && a.venture !== venture) return false;
      if (needle && !`${a.title} ${a.description} ${a.venture} ${a.kind}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, kind, venture]);

  const pinned = filtered.filter((a) => a.pinned);
  const rest = filtered.filter((a) => !a.pinned);

  const chip = (active: boolean) =>
    `whitespace-nowrap text-[11px] uppercase tracking-[0.12em] font-sans font-bold px-3 py-1.5 rounded-lg border-2 transition-colors ${
      active
        ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]'
        : 'border-[#161616]/15 bg-[#FBF6EA] text-[#161616]/60 hover:border-[#161616] hover:text-[#161616]'
    }`;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="artifacts" title="Artifacts" />

      <main className="max-w-5xl mx-auto px-5 md:px-6 py-8">
        <header className="mb-6">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">The Directory</span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold mt-1.5">Every artifact, one place</h2>
          <p className="text-[#161616]/70 mt-2 max-w-2xl font-sans">
            The moodboards, decks, calendars, briefings, and plans we have published, so you never dig through a chat for a link again.
            Ask me to &ldquo;update the artifacts tab&rdquo; whenever you want the newest ones pulled in.
          </p>
        </header>

        {/* Search + filters */}
        <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4 mb-7 flex flex-col gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search artifacts by name, venture, or type..."
            aria-label="Search artifacts"
            className="w-full border-2 border-[#161616] rounded-lg px-3.5 py-2.5 font-sans text-[15px] bg-[#FBF6EA] placeholder:text-[#161616]/40 focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
          />
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={chip(kind === k)}>{k}</button>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VENTURES.map((v) => <button key={v} type="button" onClick={() => setVenture(v)} className={chip(venture === v)}>{v}</button>)}
          </div>
        </div>

        <p className="text-[11px] uppercase tracking-[0.14em] font-mono font-bold text-[#8f6600] mb-4 tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'artifact' : 'artifacts'}
          {(kind !== 'All' || venture !== 'All' || q) && ` of ${ARTIFACTS.length}`}
        </p>

        {filtered.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#161616]/25 p-10 text-center">
            <p className="font-sans text-[#161616]/60">No artifacts match that filter. Try clearing the search or picking &ldquo;All&rdquo;.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {pinned.length > 0 && (
              <section>
                <span className="text-[10px] uppercase tracking-[0.22em] text-[#E0301E] font-mono font-bold block mb-3">Pinned · the ones you reach for</span>
                <div className="grid md:grid-cols-2 gap-5">
                  {pinned.map((a) => <Card key={a.id} a={a} />)}
                </div>
              </section>
            )}
            <section>
              {pinned.length > 0 && <span className="text-[10px] uppercase tracking-[0.22em] text-[#161616]/45 font-mono font-bold block mb-3">Everything else · newest first</span>}
              <div className="grid md:grid-cols-2 gap-5">
                {rest.map((a) => <Card key={a.id} a={a} />)}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
