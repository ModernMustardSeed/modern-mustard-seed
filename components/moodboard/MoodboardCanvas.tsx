'use client';

/**
 * THE DIRECTION BOARD. One renderer for both the admin preview and the
 * client portal, so what Sarah approves-to-send and what the client
 * approves-to-build can never drift.
 *
 * The board is a gallery artifact: a paper-white canvas where the CLIENT'S
 * direction (their type pairing, their palette, their photos) is the art
 * and the studio chrome stays out of the way. Real fonts load per-board via
 * a one-off Google Fonts link so the client sees actual letters, not names.
 */

import { useEffect } from 'react';
import { getPairing, type Moodboard } from '@/lib/moodboard-shared';

/**
 * Load the board's Google Fonts by appending a <link> to <head> once per
 * pairing. Rendering a raw <link rel="stylesheet"> as a child trips React
 * 19's resource handling in some renderers, and head injection also survives
 * the board appearing inside modals or previews.
 */
function useBoardFonts(href: string) {
  useEffect(() => {
    if (document.head.querySelector(`link[data-mb-fonts="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-mb-fonts', href);
    document.head.appendChild(link);
  }, [href]);
}

type Props = {
  board: Moodboard;
  businessName: string;
  logoUrl?: string | null;
  photos?: string[];
  /** stamped across the corner once the client approves */
  approvedAt?: string | null;
};

export default function MoodboardCanvas({ board, businessName, logoUrl, photos = [], approvedAt }: Props) {
  const pairing = getPairing(board.pairingId);
  const fontHref = `https://fonts.googleapis.com/css2?${pairing.googleQuery}&display=swap`;
  useBoardFonts(fontHref);

  const display = `'${pairing.display}', serif`;
  const body = `'${pairing.body}', sans-serif`;

  const anchor = board.palette[1]?.hex || '#1c1c1c';
  const accent = board.palette.find((s) => /signature|accent/i.test(s.role))?.hex || board.palette[2]?.hex || '#B8860B';
  const neutral = board.palette[0]?.hex || '#F6F3EC';
  const shots = photos.slice(0, 4);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#161616] bg-white shadow-[8px_8px_0_0_#161616]">
      {/* letterpress header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-[#161616] px-6 py-3.5 md:px-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#161616]/60">
          Direction Board · {businessName}
        </p>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#161616]/40">
          Modern Mustard Seed Studio
        </p>
      </div>

      {approvedAt && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-5 top-14 z-[2] rotate-[8deg] rounded-md border-[3px] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ borderColor: '#1d7a3c', color: '#1d7a3c', background: 'rgba(255,255,255,0.82)' }}
        >
          Approved
        </div>
      )}

      <div className="p-6 md:p-10 space-y-10">
        {/* 01 · the direction */}
        <section>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#161616]/45 mb-3">01 · The Direction</p>
          <h3 className="leading-[0.98] text-[#161616]" style={{ fontFamily: display, fontSize: 'clamp(2.4rem, 6vw, 4.4rem)', fontWeight: 700 }}>
            {board.directionName}
          </h3>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#3a3733]" style={{ fontFamily: body }}>
            {board.directionLine}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {board.vibeWords.map((w) => (
              <span
                key={w}
                className="rounded-full border-2 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ borderColor: anchor, color: anchor }}
              >
                {w}
              </span>
            ))}
          </div>
        </section>

        {/* 02 · type + 03 · palette */}
        <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-xl border border-[#161616]/15 p-6" style={{ background: neutral }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#161616]/45 mb-4">02 · The Letters</p>
            <div className="flex items-end gap-5">
              <span style={{ fontFamily: display, fontSize: '4.6rem', lineHeight: 1, color: anchor }}>Aa</span>
              <div className="pb-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50">Headlines</p>
                <p className="text-lg text-[#161616]" style={{ fontFamily: display }}>{pairing.display}</p>
              </div>
            </div>
            <p className="mt-3 truncate text-[15px] text-[#161616]/70" style={{ fontFamily: display }}>
              ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890
            </p>
            <div className="mt-5 border-t border-[#161616]/15 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50">Everything else · {pairing.body}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#161616]" style={{ fontFamily: body }}>
                Clean, friendly, and effortless to read on a phone in the truck, which is where your customers will meet you.
              </p>
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#161616]/45 mb-4">03 · The Colors</p>
            <div className="grid grid-cols-5 gap-2.5 h-44 md:h-52">
              {board.palette.map((s) => (
                <div key={s.hex + s.name} className="group flex flex-col overflow-hidden rounded-lg border border-[#161616]/20">
                  <div className="flex-1" style={{ background: s.hex }} />
                  <div className="bg-white px-1.5 py-2">
                    <p className="text-[10px] font-bold leading-tight text-[#161616]" style={{ fontFamily: body }}>{s.name}</p>
                    <p className="font-mono text-[8px] uppercase text-[#161616]/45">{s.hex}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-snug text-[#161616]/60" style={{ fontFamily: body }}>
              {board.palette.map((s) => `${s.name}: ${s.role}`).join(' · ')}
            </p>
          </div>
        </section>

        {/* 04 · the hero, mocked in their own direction */}
        <section>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#161616]/45 mb-4">04 · How It Opens</p>
          <div className="overflow-hidden rounded-xl border-2 border-[#161616]">
            <div className="flex items-center gap-1.5 border-b-2 border-[#161616] bg-white px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E0301E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#F5B700]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#1d7a3c]" />
              <span className="ml-3 font-mono text-[10px] text-[#161616]/40 truncate">{businessName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com</span>
            </div>
            <div className="relative px-7 py-12 md:px-12 md:py-16" style={{ background: shots[0] ? `linear-gradient(100deg, ${anchor}f2 30%, ${anchor}99), url(${shots[0]}) center/cover` : anchor }}>
              {logoUrl && (
                <div className="mb-6 inline-flex rounded-lg bg-white/92 p-2.5">
                  {/* client logos are arbitrary uploads; plain img keeps every format */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="" className="h-10 w-auto max-w-[160px] object-contain" />
                </div>
              )}
              <h4 className="max-w-xl text-white" style={{ fontFamily: display, fontSize: 'clamp(1.7rem, 4vw, 2.9rem)', lineHeight: 1.08, fontWeight: 700 }}>
                {board.heroLine}
              </h4>
              <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-white/85" style={{ fontFamily: body }}>
                {board.heroSub}
              </p>
              <span
                className="mt-6 inline-block rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em]"
                style={{ background: accent, color: '#ffffff', fontFamily: body }}
              >
                Get My Free Quote
              </span>
            </div>
          </div>
        </section>

        {/* 05 · their photographs */}
        {shots.length > 0 && (
          <section>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#161616]/45 mb-4">05 · Your Photographs</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {shots.map((src, i) => (
                <div key={src} className={`overflow-hidden rounded-lg border border-[#161616]/20 ${i % 2 ? 'rotate-[0.6deg]' : 'rotate-[-0.6deg]'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[#161616]/65" style={{ fontFamily: body }}>{board.imageryNotes}</p>
          </section>
        )}
        {shots.length === 0 && board.imageryNotes && (
          <section>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#161616]/45 mb-2">05 · The Photography</p>
            <p className="max-w-2xl text-[13px] leading-relaxed text-[#161616]/65" style={{ fontFamily: body }}>{board.imageryNotes}</p>
          </section>
        )}

        {/* 06 · the signature moment */}
        <section className="rounded-xl border-2 border-[#161616] p-6 md:p-7" style={{ background: '#FBF6EA' }}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] mb-2" style={{ color: '#8f6600' }}>
            06 · The One Unforgettable Thing
          </p>
          <p className="text-[16px] md:text-[17px] leading-relaxed text-[#161616]" style={{ fontFamily: body }}>
            {board.signatureMoment}
          </p>
        </section>

        {/* footnotes */}
        <section className="grid gap-4 sm:grid-cols-2 border-t border-dashed border-[#161616]/20 pt-6">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#161616]/45 mb-1.5">How It Moves</p>
            <p className="text-[12px] leading-relaxed text-[#161616]/65" style={{ fontFamily: body }}>{board.motionNotes}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#161616]/45 mb-1.5">How It Talks</p>
            <p className="text-[12px] leading-relaxed text-[#161616]/65" style={{ fontFamily: body }}>{board.voiceNote}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
