'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AdminHeader from './AdminHeader';
import {
  PORTFOLIO,
  PORTFOLIO_COUNT,
  PORTFOLIO_LIVE,
  type PortfolioItem,
  type ProjectStatus,
} from '@/data/portfolio';

const STATUS: Record<ProjectStatus, { label: string; dot: string; pill: string }> = {
  live: { label: 'Live', dot: 'bg-emerald-500', pill: 'text-emerald-800 border-emerald-800/25 bg-emerald-100' },
  demo: { label: 'Demo', dot: 'bg-[#1E50C8]', pill: 'text-[#1E50C8] border-[#1E50C8]/25 bg-[#1E50C8]/10' },
  building: { label: 'Building', dot: 'bg-[#F5B700]', pill: 'text-amber-800 border-amber-800/25 bg-amber-100' },
};

function hostOf(url: string, internal?: boolean) {
  if (internal) return `modernmustardseed.com${url}`;
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function ProjectCard({ item }: { item: PortfolioItem }) {
  const s = STATUS[item.status];
  return (
    <div className="group flex flex-col bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4 transition-all hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sans text-[15px] font-bold text-[#161616] leading-tight truncate">{item.name}</h3>
          {item.owner && (
            <span className="block text-[10px] uppercase tracking-[0.14em] font-mono text-[#E0301E]/80 mt-0.5 truncate">
              for {item.owner}
            </span>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] font-mono font-bold px-2 py-0.5 rounded border ${s.pill}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${item.status === 'live' ? 'animate-pulse' : ''}`} />
          {s.label}
        </span>
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed font-body text-[#3A3733] flex-1">{item.blurb}</p>

      {item.tags && item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <span key={t} className="text-[9px] uppercase tracking-[0.1em] font-mono text-[#161616]/45 bg-[#FFFDF6] border border-[#161616]/12 rounded px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3.5 pt-3 border-t border-[#161616]/10 flex items-center justify-between gap-2">
        {item.url ? (
          item.internal ? (
            <Link
              href={item.url}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] hover:bg-[#FFD23F] border-2 border-[#161616] rounded-lg px-3.5 py-1.5 shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Open ↗
            </Link>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] hover:bg-[#FFD23F] border-2 border-[#161616] rounded-lg px-3.5 py-1.5 shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Visit ↗
            </a>
          )
        ) : (
          <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-[#161616]/40">In development</span>
        )}

        <span className="text-[10px] font-mono text-[#161616]/40 truncate max-w-[52%] text-right">
          {item.url ? hostOf(item.url, item.internal) : ''}
        </span>
      </div>

      {item.links && item.links.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {item.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-[0.12em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PortfolioBoard() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    return PORTFOLIO.map((c) => ({
      ...c,
      items: c.items.filter((i) => {
        if (cat !== 'all' && c.key !== cat) return false;
        if (!query) return true;
        const hay = `${i.name} ${i.blurb} ${i.owner ?? ''} ${(i.tags ?? []).join(' ')}`.toLowerCase();
        return hay.includes(query);
      }),
    })).filter((c) => c.items.length > 0);
  }, [query, cat]);

  const shownCount = filtered.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="portfolio" title="My Projects" />
      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        {/* Hero / signature band */}
        <section className="relative overflow-hidden bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 mb-8">
          <div className="absolute -right-8 -top-10 text-[190px] leading-none font-sans font-black text-white/[0.04] select-none pointer-events-none">
            {PORTFOLIO_COUNT}
          </div>
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold block mb-2">
            The Workshop
          </span>
          <h2 className="font-sans text-2xl md:text-3xl font-black tracking-tight max-w-xl">
            Everything you have built, in one place.
          </h2>
          <p className="mt-2 text-[13px] font-body text-[#FBF6EA]/70 max-w-lg">
            Ventures, products, client sites, and demos. Every link here was checked live.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <div>
              <span className="block text-3xl font-sans font-black text-[#F5B700] leading-none">{PORTFOLIO_COUNT}</span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-[#FBF6EA]/55">Projects</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="block text-3xl font-sans font-black text-[#FBF6EA] leading-none">{PORTFOLIO_LIVE}</span>
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-[#FBF6EA]/55">Live right now</span>
              </div>
            </div>
            <div>
              <span className="block text-3xl font-sans font-black text-[#FBF6EA] leading-none">{PORTFOLIO.length}</span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-[#FBF6EA]/55">Categories</span>
            </div>
          </div>
        </section>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-7">
          <div className="relative md:w-72">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects…"
              className="w-full bg-white border-2 border-[#161616] rounded-lg pl-9 pr-3 py-2 text-sm text-[#161616] placeholder-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#161616]/40 text-sm" aria-hidden>
              ⌕
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCat('all')}
              className={`text-[10px] uppercase tracking-[0.16em] font-sans font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${
                cat === 'all'
                  ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]'
                  : 'border-[#161616]/20 text-[#161616]/55 hover:text-[#161616] hover:border-[#161616]'
              }`}
            >
              All
            </button>
            {PORTFOLIO.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`text-[10px] uppercase tracking-[0.16em] font-sans font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${
                  cat === c.key
                    ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]'
                    : 'border-[#161616]/20 text-[#161616]/55 hover:text-[#161616] hover:border-[#161616]'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        {shownCount === 0 ? (
          <p className="text-[#161616]/60 text-sm font-body py-12 text-center">
            Nothing matches “{q}”. Try another word or clear the search.
          </p>
        ) : (
          <div className="space-y-10">
            {filtered.map((c) => (
              <section key={c.key}>
                <div className="flex items-baseline gap-3 mb-3.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">{c.title}</span>
                  <span className="text-[10px] font-mono text-[#161616]/40">{c.kicker}</span>
                  <span className="text-[10px] font-mono text-[#161616]/40 ml-auto">{c.items.length}</span>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {c.items.map((i) => (
                    <ProjectCard key={`${c.key}-${i.name}`} item={i} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
