'use client';

/**
 * THE PARABLE SLAB. The verse the studio is named for, extruded into a real
 * 3D object and hung off the bottom of the hero (it lives INSIDE the hero
 * section, so the ink border closes underneath it and the halftone field
 * runs behind it unbroken).
 *
 * The depth is honest, not a drop shadow: six ink plates stacked back through
 * Z inside a preserve-3d card, so tilting parallaxes the slab's side and the
 * floating pieces (perched birds, mascot stamp, reference chip) separate from
 * the face. Underneath, a mustard grid plane recedes to a horizon: the field
 * the seed gets planted in.
 *
 * Device tiers: cursor parallax on fine pointers, a fixed hero-lean on touch,
 * the same still lean under prefers-reduced-motion.
 */

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { PARABLE_REFERENCE, PARABLE_SEGMENTS } from '@/data/parable';

/** The verse, with an alternating tilt resolved onto each stamped word. */
const VERSE = PARABLE_SEGMENTS.map((seg, i) => ({
  ...seg,
  tilt: seg.stamp
    ? PARABLE_SEGMENTS.slice(0, i).filter((s) => s.stamp).length % 2 === 0
      ? '-rotate-[1.2deg]'
      : 'rotate-[1.2deg]'
    : '',
}));

/** Resting pose, so the slab reads as a solid even with no cursor on it. */
const REST_X = 4;
const REST_Y = -5;

/** The body of the slab: offset down-right and back through Z. Gold rim last. */
const PLATES = [
  { o: 20, z: -78, c: '#F5B700' },
  { o: 16, z: -62, c: '#161616' },
  { o: 12.5, z: -48, c: '#161616' },
  { o: 9, z: -35, c: '#161616' },
  { o: 6, z: -23, c: '#161616' },
  { o: 3, z: -11, c: '#161616' },
];

export default function ScriptureSlab() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const cur = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Touch devices keep the static lean: there is no cursor to follow and the
    // stacked plates already carry the depth.
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;

    let raf = 0;
    let alive = false;
    let hovering = false;

    const loop = () => {
      cur.current.x += (target.current.x - cur.current.x) * 0.09;
      cur.current.y += (target.current.y - cur.current.y) * 0.09;
      const rx = REST_X - cur.current.y * 6;
      const ry = REST_Y + cur.current.x * 10;
      card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      const settled =
        Math.abs(target.current.x - cur.current.x) < 0.002 &&
        Math.abs(target.current.y - cur.current.y) < 0.002;
      if (!hovering && settled) {
        alive = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (alive) return;
      alive = true;
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      target.current.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      target.current.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      hovering = true;
      kick();
    };
    const onLeave = () => {
      hovering = false;
      target.current.x = 0;
      target.current.y = 0;
      kick();
    };

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="relative px-6 pb-24 md:pb-32">
      {/* The field: a mustard grid plane laid flat, receding to a horizon. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-[460px] w-[190%]"
        style={{
          transform: 'translateX(-50%) perspective(560px) rotateX(66deg)',
          transformOrigin: 'center bottom',
          backgroundImage:
            'linear-gradient(rgba(245,183,0,0.85) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(245,183,0,0.85) 1.5px, transparent 1.5px)',
          backgroundSize: '74px 74px',
          maskImage: 'radial-gradient(ellipse 82% 88% at 50% 100%, #000 8%, transparent 76%)',
          WebkitMaskImage: 'radial-gradient(ellipse 82% 88% at 50% 100%, #000 8%, transparent 76%)',
        }}
      />

      {/* The stem: the hero drops a seed straight into the verse. */}
      <div aria-hidden="true" className="relative mx-auto mb-1 flex w-full flex-col items-center">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-[#161616] bg-[#F5B700]" />
        <span className="h-9 w-[3px] bg-[#161616]" />
      </div>

      <div ref={wrapRef} className="relative mx-auto max-w-4xl" style={{ perspective: '1200px' }}>
        {/* Gold bloom behind the slab, same light as the hero lockup. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-16"
          style={{
            background:
              'radial-gradient(circle, rgba(245,183,0,0.42) 0%, rgba(245,183,0,0.15) 46%, transparent 70%)',
          }}
        />

        {/* Contact shadow, so the slab reads as hovering over the field. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-[76%] -translate-x-1/2 rounded-[50%] bg-[#161616]/20 blur-2xl"
        />

        <div
          ref={cardRef}
          className="relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${REST_X}deg) rotateY(${REST_Y}deg)`,
          }}
        >
          {/* The slab body, plate by plate back through Z. */}
          {PLATES.map((p) => (
            <div
              key={p.z}
              aria-hidden="true"
              className="absolute inset-0 rounded-[20px] border-2 border-[#161616]"
              style={{
                background: p.c,
                transform: `translate3d(${p.o}px, ${p.o}px, ${p.z}px)`,
                backfaceVisibility: 'hidden',
              }}
            />
          ))}

          {/* Two birds perch on the top edge (Matthew 13:32). */}
          <svg
            aria-hidden="true"
            viewBox="0 0 120 46"
            className="absolute -top-[30px] right-10 w-[104px] md:right-16 md:w-[124px]"
            style={{ transform: 'translateZ(28px)', overflow: 'visible' }}
          >
            <g transform="translate(30, 34)">
              <ellipse cx="0" cy="0" rx="10" ry="8.5" fill="#F5B700" stroke="#161616" strokeWidth="2.2" />
              <circle cx="9" cy="-7" r="5.6" fill="#F5B700" stroke="#161616" strokeWidth="2.2" />
              <path d="M 14 -7.5 L 20 -6 L 14 -4.5 Z" fill="#E0301E" stroke="#161616" strokeWidth="1" strokeLinejoin="round" />
              <circle cx="10" cy="-8" r="1.4" fill="#161616" />
              <path d="M -3 8 L -3 12 M 3.5 8 L 3.5 12" stroke="#161616" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g transform="translate(84, 36) scale(-0.85, 0.85)">
              <ellipse cx="0" cy="0" rx="10" ry="8.5" fill="#FFDD55" stroke="#161616" strokeWidth="2.4" />
              <circle cx="9" cy="-7" r="5.6" fill="#FFDD55" stroke="#161616" strokeWidth="2.4" />
              <path d="M 14 -7.5 L 20 -6 L 14 -4.5 Z" fill="#E0301E" stroke="#161616" strokeWidth="1.1" strokeLinejoin="round" />
              <circle cx="10" cy="-8" r="1.5" fill="#161616" />
              <path d="M -3 8 L -3 12 M 3.5 8 L 3.5 12" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          </svg>

          {/* The face. */}
          <figure
            className="relative overflow-hidden rounded-[20px] border-2 border-[#161616] bg-white px-6 py-10 sm:px-10 md:px-16 md:py-14"
            style={{ transform: 'translateZ(0px)' }}
          >
            <div aria-hidden="true" className="halftone-bg pointer-events-none absolute inset-0 opacity-40" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 55%)' }}
            />

            <blockquote className="relative">
              <p className="text-center font-display text-[22px] italic leading-[1.62] text-[#161616] sm:text-[26px] md:text-[32px] md:leading-[1.55]">
                &ldquo;
                {VERSE.map((seg, i) =>
                  seg.stamp ? (
                    <span
                      key={i}
                      className={`inline-block whitespace-nowrap rounded-[5px] bg-[#161616] px-2 py-[3px] align-[0.02em] font-mono text-[0.82em] not-italic leading-none text-[#F5B700] shadow-[2px_2px_0_0_rgba(245,183,0,0.65)] ${seg.tilt}`}
                    >
                      {seg.t}
                    </span>
                  ) : (
                    <span key={i}>{seg.t}</span>
                  )
                )}
                &rdquo;
              </p>
            </blockquote>

            <div className="relative mt-8 flex items-center justify-center gap-4">
              <span className="h-[2px] w-10 bg-[#161616]/25 sm:w-16" />
              <span className="h-2.5 w-2.5 rotate-45 border-2 border-[#161616] bg-[#F5B700]" />
              <span className="h-[2px] w-10 bg-[#161616]/25 sm:w-16" />
            </div>

            <figcaption className="relative mt-5 text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#8f6600] sm:text-[11px]">
              <span className="block sm:inline">You bring the seed.</span>{' '}
              <span className="block sm:inline">We build the tree.</span>
            </figcaption>
          </figure>

          {/* The reference, stamped on the corner like a sticker. */}
          <cite
            className="absolute -top-4 left-6 not-italic md:left-10"
            style={{ transform: 'translateZ(52px) rotate(-2.5deg)' }}
          >
            <span className="inline-block rounded-full border-2 border-[#161616] bg-[#F5B700] px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#161616] shadow-[3px_3px_0_0_#161616]">
              {PARABLE_REFERENCE}
            </span>
          </cite>

          {/* Mascot stamp, popped furthest forward. */}
          <div
            aria-hidden="true"
            className="absolute -bottom-5 right-8 grid h-14 w-[3.25rem] place-items-center rounded-[6px] border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_rgba(22,22,22,0.35)] md:right-14"
            style={{ transform: 'translateZ(64px) rotate(3deg)' }}
          >
            <span className="relative h-9 w-9">
              <Image src="/brand/mascot.png" alt="" fill sizes="36px" className="object-contain" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
