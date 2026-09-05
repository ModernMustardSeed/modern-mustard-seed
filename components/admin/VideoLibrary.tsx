'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { MARKETING_VIDEOS, type MarketingVideo } from '@/data/marketing-videos';

/**
 * Every finished film in one place, playable, with an honest account of where
 * each one actually runs. Data lives in data/marketing-videos.ts.
 *
 * ⚠️ THE SERVE CHECK IS A CLIENT-SIDE HEAD, ON PURPOSE. The obvious version of
 * this page stats public/video on the server. That is the exact bug lib/films.ts
 * exists to document: `existsSync` on public/ is false on any render that
 * happens at request time, because public/ is not in the traced lambda bundle,
 * and it fails silently. So the browser asks the CDN, which is the thing that
 * actually serves the file. If it 200s with a length, it is really there.
 */

type Filter = 'All' | 'Live' | 'Unused';
const FILTERS: Filter[] = ['All', 'Live', 'Unused'];

type Probe = { status: number; bytes: number } | { status: 0; bytes: 0 } | undefined;

const CARD = 'bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616]';
const CHIP =
  'text-[10px] uppercase tracking-[0.1em] font-mono font-bold px-2 py-0.5 border-2 whitespace-nowrap';

function runtime(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `0:${String(r).padStart(2, '0')}`;
}

function mb(bytes: number) {
  return bytes > 0 ? `${(bytes / 1048576).toFixed(1)} MB` : '';
}

function CopyLink({ url, label = 'Copy path' }: { url: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(url).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className="text-[11px] uppercase tracking-[0.14em] font-sans font-bold text-[#161616] px-3.5 py-2 rounded-lg border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform active:translate-y-0"
    >
      {done ? 'Copied' : label}
    </button>
  );
}

function Card({ v, probes }: { v: MarketingVideo; probes: Record<string, Probe> }) {
  const [cut, setCut] = useState(0);
  const [playing, setPlaying] = useState(false);
  const active = v.formats[cut];
  const probe = probes[active.file];
  const unused = v.runsAt.length === 0;
  const missing = probe && probe.status !== 200;

  return (
    <article className={`${CARD} p-5 flex flex-col gap-3.5`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={CHIP} style={{ background: '#F5B700', borderColor: '#161616' }}>
            {runtime(v.runtime)}
          </span>
          {unused ? (
            <span className={`${CHIP} border-[#E0301E] text-[#E0301E]`}>Unused</span>
          ) : (
            <span className={`${CHIP} border-[#161616]/25 text-[#161616]/65`}>
              {v.runsAt.length} place{v.runsAt.length === 1 ? '' : 's'}
            </span>
          )}
          {v.silent && <span className={`${CHIP} border-[#161616]/25 text-[#161616]/65`}>Silent</span>}
        </div>
        {probe && (
          <span
            className={`text-[11px] font-mono tabular-nums whitespace-nowrap ${
              missing ? 'text-[#E0301E] font-bold' : 'text-[#161616]/55'
            }`}
          >
            {missing ? `Not serving (${probe.status || 'no response'})` : mb(probe.bytes)}
          </span>
        )}
      </div>

      <h3 className="font-display text-xl font-extrabold leading-tight text-balance">{v.title}</h3>

      <div className="border-2 border-[#161616] bg-black overflow-hidden">
        {playing ? (
          <video
            key={active.file}
            src={active.file}
            poster={v.poster}
            controls
            autoPlay
            playsInline
            className="w-full h-auto block"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play ${v.title}`}
            className="relative w-full block group"
            style={{ aspectRatio: `${active.width} / ${active.height}` }}
          >
            {v.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <span className="absolute inset-0 bg-[#080C16]" />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-16 h-16 rounded-full bg-[#F5B700] border-[3px] border-[#161616] shadow-[3px_3px_0_0_#161616] flex items-center justify-center group-hover:-translate-y-0.5 transition-transform">
                <span className="border-y-[10px] border-y-transparent border-l-[16px] border-l-[#161616] ml-1.5" />
              </span>
            </span>
          </button>
        )}
      </div>

      {v.formats.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {v.formats.map((f, i) => (
            <button
              key={f.file}
              type="button"
              onClick={() => {
                setCut(i);
                setPlaying(false);
              }}
              className={`text-[10px] uppercase tracking-[0.1em] font-mono font-bold px-2.5 py-1 border-2 border-[#161616] ${
                i === cut ? 'bg-[#161616] text-white' : 'bg-white text-[#161616]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <p className="text-[15px] font-sans text-[#161616]/70 leading-relaxed flex-1">{v.summary}</p>

      <div className="text-[12px] font-mono text-[#161616]/60 leading-relaxed">
        {unused ? (
          <span className="text-[#E0301E]">Referenced nowhere in the codebase.</span>
        ) : (
          <>
            <span className="text-[#C4160B] uppercase tracking-[0.14em] font-bold">Runs at</span>
            <br />
            {v.runsAt.map((r) => (
              <span key={r} className="block break-all">
                {r}
              </span>
            ))}
          </>
        )}
      </div>

      {v.source && (
        <p className="text-[12px] font-mono text-[#161616]/45 break-all">Built in {v.source}</p>
      )}

      <div className="flex gap-2.5 items-center flex-wrap pt-1">
        {v.watchUrl && (
          <a
            href={v.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] uppercase tracking-[0.14em] font-sans font-bold text-[#161616] px-3.5 py-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform active:translate-y-0"
          >
            Watch page ↗
          </a>
        )}
        <a
          href={active.file}
          download
          className="text-[11px] uppercase tracking-[0.14em] font-sans font-bold text-[#161616] px-3.5 py-2 rounded-lg border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform active:translate-y-0"
        >
          Download
        </a>
        <CopyLink url={active.file} />
      </div>
    </article>
  );
}

export default function VideoLibrary() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [probes, setProbes] = useState<Record<string, Probe>>({});

  // Ask the CDN, not the filesystem. See the note at the top of this file.
  useEffect(() => {
    let alive = true;
    const files = MARKETING_VIDEOS.flatMap((v) => v.formats.map((f) => f.file));
    Promise.all(
      files.map(async (file) => {
        try {
          const r = await fetch(file, { method: 'HEAD' });
          return [file, { status: r.status, bytes: Number(r.headers.get('content-length')) || 0 }] as const;
        } catch {
          return [file, { status: 0 as const, bytes: 0 as const }] as const;
        }
      }),
    ).then((pairs) => {
      if (alive) setProbes(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return MARKETING_VIDEOS.filter((v) => {
      if (filter === 'Live' && v.runsAt.length === 0) return false;
      if (filter === 'Unused' && v.runsAt.length > 0) return false;
      if (!needle) return true;
      return (
        v.title.toLowerCase().includes(needle) ||
        v.summary.toLowerCase().includes(needle) ||
        v.runsAt.join(' ').toLowerCase().includes(needle) ||
        v.formats.some((f) => f.file.toLowerCase().includes(needle))
      );
    });
  }, [q, filter]);

  const unusedCount = MARKETING_VIDEOS.filter((v) => v.runsAt.length === 0).length;
  const totalBytes = Object.values(probes).reduce((n, p) => n + (p?.bytes ?? 0), 0);
  const notServing = Object.values(probes).filter((p) => p && p.status !== 200).length;
  const probed = Object.keys(probes).length > 0;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="videos" title="Videos" />

      <main className="max-w-[1400px] mx-auto px-5 sm:px-8 py-8 flex flex-col gap-7">
        <header className="flex flex-col gap-2.5">
          <p className="text-[11px] uppercase tracking-[0.24em] font-mono font-bold text-[#C4160B]">
            Marketing
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-[0.95] text-balance">
            The video library
          </h1>
          <p className="text-[16px] text-[#161616]/70 max-w-[62ch] leading-relaxed">
            Every finished film, playable here, with the places in the codebase that actually play
            it. Runtimes are measured, not estimated. Sizes come from the CDN, so a file that stopped
            serving says so instead of looking fine.
          </p>
        </header>

        <div className={`${CARD} px-5 py-4 flex flex-wrap gap-x-9 gap-y-3`}>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] font-mono font-bold text-[#C4160B]">
              Films
            </div>
            <div className="font-display text-2xl font-extrabold tabular-nums">
              {MARKETING_VIDEOS.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] font-mono font-bold text-[#C4160B]">
              Unused
            </div>
            <div className="font-display text-2xl font-extrabold tabular-nums">{unusedCount}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] font-mono font-bold text-[#C4160B]">
              On the CDN
            </div>
            <div className="font-display text-2xl font-extrabold tabular-nums">
              {probed ? `${(totalBytes / 1048576).toFixed(0)} MB` : '...'}
            </div>
          </div>
          {probed && notServing > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] font-mono font-bold text-[#E0301E]">
                Not serving
              </div>
              <div className="font-display text-2xl font-extrabold tabular-nums text-[#E0301E]">
                {notServing}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles, files, routes"
            aria-label="Search the video library"
            className="flex-1 min-w-[240px] px-4 py-2.5 border-2 border-[#161616] bg-white font-sans text-[15px] shadow-[3px_3px_0_0_#161616] focus:outline-none focus:-translate-y-0.5 transition-transform"
          />
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`text-[11px] uppercase tracking-[0.12em] font-sans font-bold px-3.5 py-2.5 border-2 border-[#161616] ${
                  filter === f ? 'bg-[#161616] text-white' : 'bg-white text-[#161616]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="text-[15px] text-[#161616]/60">Nothing matches that.</p>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))] items-start">
            {shown.map((v) => (
              <Card key={v.id} v={v} probes={probes} />
            ))}
          </div>
        )}

        <p className="text-[13px] font-mono text-[#161616]/50 max-w-[70ch] leading-relaxed">
          Adding a film: put the cut and its poster in public/video/, add an entry to
          data/marketing-videos.ts, then run npx tsx scripts/verify-films.mts before committing.
        </p>
      </main>
    </div>
  );
}
