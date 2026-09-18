'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PA_BASE, PA_CAROUSEL, PA_LINKS, PA_PLATFORMS, PA_POSTS } from '@/data/presence-audit-campaign';

/**
 * CAMPAIGN 28 / THE FREE PRESENCE AUDIT, on the Ads Playbook.
 *
 * Everything the 2026-09-18 organic launch needs in one place: the tally of
 * requests each platform has sent, the 20-second film, the six-card carousel
 * (also as a LinkedIn PDF), the story and link cards, the copy per platform
 * with a copy button on each, and the tracked links. Nothing here posts on its
 * own; it is the kit, and the Audit Desk is where the requests land.
 */

const card = 'border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616]';
const button =
  'inline-flex items-center justify-center border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-sm font-bold text-[#161616] hover:bg-[#FFDD55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';
const ghost =
  'inline-flex items-center justify-center border-2 border-[#161616] bg-white px-4 py-2 text-sm font-bold text-[#161616] hover:bg-[#FFF8E6]';

function useCopy(text: string) {
  const [status, setStatus] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied');
    } catch {
      area.current?.focus();
      area.current?.select();
      setStatus('Selected. Press Ctrl+C.');
    }
  };
  return { status, area, copy };
}

function CopyCard({ title, text }: { title: string; text: string }) {
  const { status, area, copy } = useCopy(text);
  return (
    <article className={card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-bold text-[#161616]">{title}</h4>
        <button type="button" onClick={copy} className={button} aria-label={`Copy ${title}`}>
          Copy
        </button>
      </div>
      <textarea
        ref={area}
        readOnly
        aria-label={title}
        value={text}
        rows={Math.min(16, Math.max(3, text.split('\n').length + Math.ceil(text.length / 110)))}
        className="w-full resize-y rounded border border-[#161616]/20 bg-[#FBF6EA] p-3 text-sm leading-relaxed text-[#161616]"
      />
      <p role="status" className="mt-2 min-h-5 text-xs text-[#161616]/70">{status}</p>
    </article>
  );
}

function LinkRow({ platform }: { platform: (typeof PA_PLATFORMS)[number] }) {
  const l = PA_LINKS[platform];
  const { status, copy } = useCopy(l.url);
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#161616]/10 py-3 last:border-0">
      <span className="w-24 shrink-0 font-bold text-[#161616]">{l.label}</span>
      <code className="min-w-0 flex-1 break-all rounded bg-[#FBF6EA] px-2 py-1 text-xs text-[#161616]">{l.url}</code>
      <span className="text-xs text-[#161616]/60">{l.where}</span>
      <button type="button" onClick={copy} className={button}>
        {status === 'Copied' ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

type Tally = Record<string, { requests: number; sent: number }>;

function Scoreboard() {
  const [tally, setTally] = useState<Tally | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/audit/requests?by=source', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => { if (alive) setTally(j.tally as Tally); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Could not load'); });
    return () => { alive = false; };
  }, []);

  const rows = [...PA_PLATFORMS, 'direct'] as const;
  return (
    <section className={card} aria-label="Requests by platform">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#E0301E]">The scoreboard</p>
          <h3 className="font-display text-2xl font-bold text-[#161616]">Audit requests by platform</h3>
          <p className="text-sm text-[#161616]/65">Real requests from the form, counted by the tracked link they came in on. Direct is anyone who arrived without one.</p>
        </div>
        <Link href="/admin/audit" className={ghost}>Open the Audit Desk →</Link>
      </div>
      {error ? (
        <p className="text-sm text-[#8a1c10]">Could not load the tally ({error}).</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {rows.map((k) => {
            const t = tally?.[k] ?? { requests: 0, sent: 0 };
            return (
              <div key={k} className="border-2 border-[#161616] bg-[#FBF6EA] p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#161616]/60">
                  {k === 'direct' ? 'Direct' : PA_LINKS[k].label}
                </p>
                <p className="mt-1 font-display text-4xl font-black tabular-nums text-[#161616]">{tally ? t.requests : '·'}</p>
                <p className="text-xs text-[#161616]/60">{tally ? `${t.sent} sent` : 'loading'}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function PresenceAuditCampaign() {
  return (
    <div className="space-y-8 text-[#161616]" id="presence-audit-campaign">
      {/* ── the header ── */}
      <section className="border-2 border-[#161616] bg-[#080C16] p-6 text-[#FBF6EA] shadow-[6px_6px_0_0_#F5B700] md:p-8">
        <p className="font-mono text-xs text-[#F5B700]">Campaign 28 / Free Presence Audit / Organic launch</p>
        <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
          Most people decide about you <span className="italic text-[#F5B700]">before</span> they reach your website.
        </h2>
        <p className="mt-4 max-w-3xl">
          The launch kit for /presence-audit on LinkedIn, Facebook, Instagram and TikTok: a six-card carousel, a 20-second
          vertical film, a story, a link card, and the copy for each platform. Every link is tracked, so each request on the
          Audit Desk says which platform sent it.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a className={button} href={`${PA_BASE}/presence-audit-campaign.zip`} download>Download the whole kit</a>
          <a className={button} href={`${PA_BASE}/presence-audit-linkedin-carousel.pdf`} download>LinkedIn carousel PDF</a>
          <a className={ghost} href="/presence-audit" target="_blank" rel="noopener noreferrer">View the landing page ↗</a>
        </div>
        <p className="mt-4 text-sm text-[#FBF6EA]/70">Prepared assets. Nothing posts from this page.</p>
      </section>

      <Scoreboard />

      {/* ── the film ── */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]" aria-label="The film">
        <div className={card}>
          <h3 className="mb-3 font-bold">20-second film · TikTok and Reels</h3>
          <video
            controls
            playsInline
            preload="none"
            poster={`${PA_BASE}/reel-poster.jpg`}
            className="aspect-[9/16] w-full bg-[#080C16]"
            src={`${PA_BASE}/presence-audit-9x16.mp4`}
          />
          <p className="my-3 text-sm">1080 × 1920, no audio. Add a sound in the app at low volume; every word is on screen.</p>
          <a className={button} href={`${PA_BASE}/presence-audit-9x16.mp4`} download>Download the film</a>
        </div>
        <div className="space-y-5">
          <div className={card}>
            <h3 className="mb-2 font-bold">The story card</h3>
            <div className="flex flex-wrap items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${PA_BASE}/story-1080x1920.png`} alt="Story: most people decide about you before they reach your website, sample score 64, tap the link to get yours free." width={180} height={320} loading="lazy" className="h-[320px] w-[180px] border-2 border-[#161616] object-cover" />
              <div className="min-w-0 flex-1 space-y-3 text-sm">
                <p>1080 × 1920 for Instagram and Facebook stories. Put a link sticker on it pointing at that platform&apos;s tracked link below.</p>
                <a className={button} href={`${PA_BASE}/story-1080x1920.png`} download>Download story</a>
              </div>
            </div>
          </div>
          <div className={card}>
            <h3 className="mb-2 font-bold">The link card</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${PA_BASE}/link-card-1200x627.png`} alt="Link card: most people decide about you before they reach your website, with a sample report scoring 64." width={1200} height={627} loading="lazy" className="w-full border-2 border-[#161616]" />
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span>1200 × 627 for a Facebook or LinkedIn link post.</span>
              <a className={button} href={`${PA_BASE}/link-card-1200x627.png`} download>Download link card</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── the carousel ── */}
      <section aria-label="The carousel">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-bold">The carousel, in order</h3>
            <p className="text-sm text-[#161616]/65">1080 × 1350. Instagram carousel and Facebook multi-photo post. LinkedIn takes the PDF of the same six.</p>
          </div>
          <a className={button} href={`${PA_BASE}/presence-audit-linkedin-carousel.pdf`} download>Download the PDF</a>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {PA_CAROUSEL.map((c, i) => (
            <figure key={c.file} className={card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${PA_BASE}/${c.file}.png`} alt={c.alt} width={1080} height={1350} loading="lazy" className="w-full border-2 border-[#161616]" />
              <figcaption className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm font-bold">
                  <span className="mr-1.5 font-mono text-[#E0301E]">{String(i + 1).padStart(2, '0')}</span>
                  {c.label}
                </span>
                <a className={button} href={`${PA_BASE}/${c.file}.png`} download>Download</a>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── tracked links ── */}
      <section className={card} aria-label="Tracked links">
        <h3 className="font-display text-2xl font-bold">Tracked links</h3>
        <p className="mb-2 text-sm text-[#161616]/65">One per platform. Instagram and TikTok go in the bio before anything is posted.</p>
        {PA_PLATFORMS.map((p) => (
          <LinkRow key={p} platform={p} />
        ))}
      </section>

      {/* ── the copy, per platform ── */}
      {PA_POSTS.map((post) => (
        <section key={post.platform} aria-label={`${post.platform} copy`}>
          <div className="mb-4">
            <h3 className="font-display text-2xl font-bold">{post.platform}</h3>
            <p className="text-sm text-[#161616]/70">{post.assets}</p>
            {post.steps && (
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-[#161616]/80">
                {post.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            )}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {post.copy.map((c) => (
              <CopyCard key={c.title} title={c.title} text={c.text} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
