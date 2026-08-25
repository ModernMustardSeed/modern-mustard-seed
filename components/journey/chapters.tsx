'use client';

/**
 * THE FLATHEAD JOURNEY. Chapters of the landing page as one scrolling drive
 * around the lake: pickup, orchards, roadside signs, the gate, the planting,
 * the tree, and the four doors. Direction approved 2026-08-07: Big Sky Cinema
 * world (scroll-cinema footage, alpenglow grade) wearing the pop-art sticker
 * chrome the rest of the site already speaks.
 *
 * Rules honored here:
 * - Motion is transform/opacity only; everything enters once (ENTER) or rides
 *   scroll (SCRUB, handled by JourneyRig). prefers-reduced-motion collapses to
 *   a fully readable static page and swaps footage for posters.
 * - Every offer stays reachable: the roadside signs link the live funnels.
 * - No em dashes, no prices, Title Case labels.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Anton, Caveat } from 'next/font/google';
import { track } from '@vercel/analytics';
import RingMeNow from '@/components/RingMeNow';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const caveat = Caveat({ weight: '600', subsets: ['latin'], display: 'swap' });

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One-time ENTER reveal: adds data-in when the node crosses the viewport. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (REDUCED()) { el.dataset.in = '1'; return; }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { el.dataset.in = '1'; io.disconnect(); } }),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/**
 * Full-bleed footage that only plays on screen and never plays under reduced motion.
 * `mediaClass` rides the video/img itself, which is how a chapter moves the crop's
 * focal point (a portrait phone window is a narrow slice of a 16:9 frame).
 */
function Footage({ src, poster, className = '', dim = 0.25, mediaClass = '' }: { src: string; poster: string; className?: string; dim?: number; mediaClass?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (REDUCED()) { setStill(true); return; }
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) v.play().catch(() => setStill(true)); else v.pause(); }),
      { threshold: 0.1 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {still ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className={`h-full w-full object-cover ${mediaClass}`} />
      ) : (
        <video ref={ref} muted loop playsInline preload="metadata" poster={poster} className={`h-full w-full object-cover ${mediaClass}`}>
          <source src={src} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0" style={{ background: `rgba(8,10,12,${dim})` }} />
      {/* Film grain, the world's texture */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23n)\' opacity=\'0.9\'/%3E%3C/svg%3E")' }} />
    </div>
  );
}

/** Mono eyebrow chip in the pop chrome. */
function Mile({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <span className={`inline-block font-mono font-bold text-[11px] tracking-[0.22em] uppercase border-2 border-[#161616] px-3 py-1 shadow-[3px_3px_0_0_#161616] ${dark ? 'bg-[#F5B700] text-[#161616]' : 'bg-white text-[#8f6600]'}`}>
      {label}
    </span>
  );
}

/** Children of a `group` container that useReveal marks with data-in="1". */
const revealBase =
  'mm-r opacity-0 translate-y-6 transition-all duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-data-[in="1"]:opacity-100 group-data-[in="1"]:translate-y-0 motion-reduce:transition-none';

function openMustard(source: string) {
  track('journey_door', { door: source });
  window.dispatchEvent(new CustomEvent('mms:launcher:open', { detail: { mode: 'voice', source } }));
}

/* ------------------------------------------------------------------ */
/* MI 0 · The Pickup                                                   */
/* ------------------------------------------------------------------ */

export function JourneyHero() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section
      id="tour-top"
      data-journey-chapter="The Pickup"
      data-mile="MI 0"
      data-letterbox
      className="relative h-[132vh] bg-[#0B0B0B]"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <Footage
          src="/journey/drive.mp4"
          poster="/journey/poster-drive.jpg"
          dim={0.3}
          // Phones see a narrow slice of the 16:9 frame. Centered, that slice cuts
          // Mr. Mustard in half; 38% puts the two of them mid-window for the whole pan.
          mediaClass="object-[38%_50%] sm:object-center"
        />
        {/* Sarah 2026-08-07: the headline was sitting on Mr. and Mrs. Mustard's
            faces (they ride center-left of the footage). Desktop: the copy
            moves to the open water on the RIGHT, vertically centered. Phones:
            the whole invitation drops BELOW their faces, which means smaller
            type, a shorter line, and one CTA (the launcher pill already offers
            Mr. Mustard down there). The sticky box hangs ~119px past the fold
            at rest, so the bottom pad is measured in vh to clear it. */}
        {/* The bottom pad is not decoration on phones. At rest the sticky box
            hangs ~130px past the fold, so a centered column ends up centered on
            a point below the screen, and the padding lifts the stack back into
            view. Desktop is back to 0: the ring box moved out of the hero
            2026-08-19 and the headline gets the open water to itself again. */}
        <div ref={ref} className="group relative z-10 flex h-full flex-col items-center justify-end px-6 pb-[11vh] text-center lg:items-end lg:justify-center lg:pb-0 lg:pr-[6vw] lg:text-right">
          <span className={`${caveat.className} text-2xl md:text-3xl text-[#FFDD55] rotate-[-2deg] ${revealBase}`} data-in-stagger>
            Flathead Lake, Montana
          </span>
          <h1
            className={`${anton.className} mt-3 sm:mt-4 uppercase leading-[0.92] text-transparent ${revealBase}`}
            style={{ WebkitTextStroke: '2.5px #FBF6EA', fontSize: 'clamp(44px, 8.5vw, 136px)', transitionDelay: '120ms' }}
          >
            Come For
            <br />
            A Drive
          </h1>
          <p className={`mt-3 sm:mt-5 max-w-2xl lg:max-w-xl text-base sm:text-lg md:text-xl text-[#FBF6EA]/95 font-body ${revealBase}`} style={{ transitionDelay: '240ms' }}>
            Websites that talk and voice agents that answer, built as one thing.
            Live in about a week.
            <span className="hidden sm:inline"> This is Modern Mustard Seed, and this is the scenic route.</span>
          </p>
          <div className={`mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-4 lg:justify-end ${revealBase}`} style={{ transitionDelay: '360ms' }}>
            <a
              href="#tour-orchard"
              className="bg-[#F5B700] text-[#161616] font-bold border-2 border-[#161616] px-7 py-3.5 shadow-[4px_4px_0_0_#161616] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616] transition-all"
              onClick={() => track('journey_start_drive')}
            >
              Start The Drive
            </a>
            <button
              onClick={() => openMustard('hero')}
              className="hidden lg:inline-block bg-white/10 backdrop-blur text-[#FBF6EA] font-bold border-2 border-[#FBF6EA] px-7 py-3.5 hover:bg-white/20 transition-colors"
            >
              Skip Ahead, Talk To Mr. Mustard
            </button>
          </div>
        </div>
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 text-[#FBF6EA]/80 font-mono text-[11px] tracking-[0.3em] uppercase motion-reduce:hidden">
          <span className="inline-block animate-bounce">▼ Scroll</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MI 4 · The Turnout (the ring box)                                   */
/* ------------------------------------------------------------------ */

/**
 * THE TURNOUT. The first place to pull over after the drive starts.
 *
 * Sarah 2026-08-19: the ring box was riding inside the sticky hero next to the
 * headline and the button row, and the hero felt packed. It gets its own band
 * now, one screen down, where it is the only thing on the page. Mustard behind
 * it so the cream card reads as an object you stop at, not another line of
 * hero furniture. Full card, not the dense cut, because there is room here for
 * the offer to say what it is.
 */
export function JourneyRing() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section
      id="tour-ring"
      className="relative bg-[#F5B700] border-b-2 border-[#161616] py-14 md:py-20"
    >
      <div ref={ref} className="group mx-auto flex max-w-xl flex-col items-center px-6 text-center">
        <span className={`${caveat.className} text-2xl md:text-3xl text-[#161616] rotate-[-1.5deg] ${revealBase}`}>
          the fastest way to hear one is to answer one
        </span>
        <div className={`mt-5 w-full ${revealBase}`} style={{ transitionDelay: '120ms' }}>
          <RingMeNow source="home-turnout" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MI 12 · The Orchards                                                */
/* ------------------------------------------------------------------ */

/**
 * THREE CROPS, NOT FOUR. The Command Center was the third row here until Sarah
 * said on 2026-08-25: "I am not pushing command center anywhere." It is still
 * sold at /command-center and /pay/command-center; the orchard just stops
 * planting it next to the things we build for free. Do not add it back.
 */
const CROPS = [
  {
    href: '/websites',
    label: 'The Website',
    line: 'Built to be found on Google and to greet whoever lands on it. Your site reads its own tour out loud.',
  },
  {
    href: '/voice-agents',
    label: 'The Voice Agent',
    line: 'Answers every call on the first ring, at noon and at two in the morning. Books the job while your hands are full.',
  },
  {
    href: '/book',
    label: 'The Custom Build',
    line: 'Full apps, stores, and agentic software grown from scratch for your operation. Bring the idea, book a call, and we scope it together.',
  },
];

export function JourneyOrchard() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section
      id="tour-orchard"
      data-journey-chapter="The Orchards"
      data-mile="MI 12"
      className="relative bg-[#FBF6EA] border-y-2 border-[#161616] py-24 md:py-32 overflow-hidden"
    >
      <div ref={ref} className="group mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
        <div>
          <Mile label="MI 12 · The Orchards" />
          <h2 className={`${anton.className} mt-5 uppercase text-[#161616] leading-[0.95] ${revealBase}`} style={{ fontSize: 'clamp(40px,5vw,72px)' }}>
            We Grow
            <br />
            Three Things
          </h2>
          <p className={`mt-5 max-w-xl text-lg text-[#161616]/80 ${revealBase}`} style={{ transitionDelay: '120ms' }}>
            The orchards up here hang heavy every summer because somebody planted rows on purpose.
            Same idea down at the studio. Two crops planted together, and a third row for
            whatever your business needs built custom.
          </p>
          <div className="mt-8 space-y-4">
            {CROPS.map((c, i) => (
              <Link
                key={c.href}
                href={c.href}
                className={`group block border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#F5B700] hover:-translate-y-0.5 transition-all ${revealBase}`}
                style={{ transitionDelay: `${180 + i * 90}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-display text-xl font-extrabold text-[#161616]">{c.label}</span>
                  <span className="font-mono text-[#C4160B] group-hover:translate-x-1 transition-transform" aria-hidden>
                    →
                  </span>
                </div>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#161616]/75">{c.line}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className={`relative ${revealBase}`} style={{ transitionDelay: '200ms' }}>
          <div className="relative rotate-[1.6deg] border-2 border-[#161616] bg-white p-3 shadow-[8px_8px_0_0_#161616]">
            <div className="relative aspect-video overflow-hidden">
              <Footage src="/journey/orchard.mp4" poster="/journey/poster-orchard.jpg" dim={0.05} />
            </div>
            <p className={`${caveat.className} mt-3 text-center text-2xl text-[#161616]`}>cherry season on the east shore</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MI 31 · The Roadside                                                */
/* ------------------------------------------------------------------ */

const SIGNS = [
  {
    href: '/talking-website',
    big: true,
    label: 'The Talking Website',
    line: 'The flagship. A site and a voice agent built as one thing off one brain. The answer a visitor reads is the answer a midnight caller hears.',
    cta: 'Read The Sign',
  },
  { href: '/demos', label: 'The Demo Build', line: 'Tell us your trade. We build your website and your voice agent before you pay anything.', cta: 'Build Mine Free' },
  { href: '/website-audit', label: 'The Free Audit', line: 'Point our AI at your current website and get the honest report in minutes.', cta: 'Run My Audit' },
  { href: '/pictures', label: 'Mustard Pictures', line: 'Commercials, brand films, and social cuts, directed by the studio AI.', cta: 'Visit The Studio' },
  { href: '/store', label: 'The Playbook Store', line: 'The exact playbooks the studio runs on, written down and ready to use.', cta: 'Browse The Store' },
  { href: '/mustard-mode', label: 'Mustard Mode', line: 'Coach-led training that makes you dangerous with Claude. First session free.', cta: 'Take The Ramp' },
  { href: '/comic', label: 'Mustard Life', line: 'The whole catalog told as a glossy magazine comic. Every product, every price, printed in ink. Free.', cta: 'Read The Issue' },
  { href: '/hundredfold', label: 'HUNDREDFOLD', line: 'The scaling program for the operator who already has something working. We interview you, build the offer, and build the agents that run the plan.', cta: 'See The Program' },
];

/**
 * The flagship sign spans two columns at md and lg, so the grid only lands even
 * when the remaining cells fill the row. At lg (3 up) that is automatic with the
 * current count; at md (2 up) an odd cell total leaves one card orphaned, so the
 * final sign stretches the row instead of sitting half-width next to nothing.
 */
const SIGN_CELLS = 2 + (SIGNS.length - 1);
const MD_ORPHAN = SIGN_CELLS % 2 === 1;

export function JourneySigns() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section
      id="tour-signs"
      data-journey-chapter="The Roadside"
      data-mile="MI 31"
      className="relative py-24 md:py-32 overflow-hidden"
    >
      <div className="absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/journey/water.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B]/60 via-[#0B0B0B]/30 to-[#0B0B0B]/60" />
      </div>
      <div ref={ref} className="group relative z-10 mx-auto max-w-7xl px-6">
        <div className="text-center">
          <Mile label="MI 31 · The Roadside" dark />
          <h2 className={`${anton.className} mt-5 uppercase text-transparent leading-[0.95] ${revealBase}`} style={{ WebkitTextStroke: '2px #FBF6EA', fontSize: 'clamp(40px,6vw,88px)' }}>
            Watch The Roadside
          </h2>
          <p className={`mx-auto mt-4 max-w-2xl text-lg text-[#FBF6EA]/90 ${revealBase}`} style={{ transitionDelay: '120ms' }}>
            Every sign on this road is real. Walk into any of them today.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SIGNS.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => track('journey_sign', { sign: s.href })}
              className={`group relative flex flex-col border-2 border-[#161616] bg-[#FBF6EA] p-6 shadow-[6px_6px_0_0_#161616] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#F5B700] transition-all ${s.big ? 'md:col-span-2 lg:col-span-2 bg-[#F5B700]' : ''} ${!s.big && MD_ORPHAN && i === SIGNS.length - 1 ? 'md:col-span-2 lg:col-span-1' : ''} ${revealBase} ${i % 2 ? 'rotate-[0.6deg]' : 'rotate-[-0.6deg]'}`}
              style={{ transitionDelay: `${150 + i * 70}ms` }}
            >
              {s.big && (
                <span className="absolute -top-3 right-6 bg-[#E0301E] text-white font-mono font-bold text-[10px] tracking-[0.18em] uppercase border-2 border-[#161616] px-2 py-0.5 shadow-[2px_2px_0_0_#161616]">
                  The Flagship
                </span>
              )}
              <span className="font-display text-2xl font-extrabold text-[#161616]">{s.label}</span>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#161616]/80">{s.line}</p>
              <span className="mt-4 font-mono font-bold text-[12px] tracking-[0.16em] uppercase text-[#C4160B] group-hover:text-[#161616] transition-colors">
                {s.cta} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MI 47 · The Town Square                                             */
/* ------------------------------------------------------------------ */

/**
 * Sarah 2026-08-08: *"add into the audio tour and the page how we connect it to
 * your google business profile and optimize and get you seen in the social
 * square called the internet... but go into cro and funnels and things as well
 * that are all baked into the talking sites."*
 *
 * The honest framing matters here. GBP discovery is category-gated and Kalispell
 * is 26K people ([[mms-seo-indexing]]), so nothing on this page promises a rank
 * or a position. It promises the work: the profile wired correctly, the reviews
 * asked for and answered, the same facts published everywhere the square looks,
 * and the conversion path measured. All of it inside the build, not billed after.
 */
const SQUARE = [
  {
    tag: 'Google',
    label: 'Your Google Profile, Wired In',
    line:
      'We claim it or clean it up, then set the categories that actually decide which searches you are eligible for. Services written, photos loaded, hours and phone and address matching the site exactly, because matching is the part Google checks.',
  },
  {
    tag: 'Reviews',
    label: 'Your Reviews, Handled For You',
    line:
      'We ask while the work is still warm, with a link that opens the review box in one tap instead of four. Then we answer every review that lands, the glowing ones and the hard ones. Nothing scripted, nothing paid for, nothing fake.',
  },
  {
    tag: 'The Square',
    label: 'Seen All Over The Square',
    line:
      'One set of true facts about your business, published everywhere people look now: Google, Bing, Apple Maps, and the AI assistants they ask instead of searching. When every source agrees, you are easier to find and far easier to believe.',
  },
  {
    tag: 'CRO',
    label: 'The Path To The Button',
    line:
      'Every page gets exactly one obvious next move, and everything between a visitor and that move gets taken out of the way. We watch what people actually click, then keep moving things until more of them press it.',
  },
  {
    tag: 'Funnels',
    label: 'The Follow Up Runs Itself',
    line:
      'Most people are not ready on the first visit. So there is something free worth having, an email that shows up on its own, a missed call that texts back in seconds, and a booking link that never sleeps.',
  },
  {
    tag: 'Proof',
    label: 'The Numbers, In Plain English',
    line:
      'You see calls answered, forms filled, reviews collected, and where every one of them came from. Written in sentences, not charts you have to decode.',
  },
];

export function JourneySquare() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section
      id="tour-square"
      data-journey-chapter="The Town Square"
      data-mile="MI 47"
      className="relative bg-[#FBF6EA] border-y-2 border-[#161616] py-24 md:py-32 overflow-hidden"
    >
      {/* Faint street grid, the square underfoot. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(#161616 1px, transparent 1px), linear-gradient(90deg, #161616 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div ref={ref} className="group relative mx-auto max-w-7xl px-6">
        <div className="text-center">
          <Mile label="MI 47 · The Town Square" />
          <h2
            className={`${anton.className} mt-5 uppercase text-[#161616] leading-[0.95] ${revealBase}`}
            style={{ fontSize: 'clamp(38px,5.6vw,84px)' }}
          >
            Every Town Square
            <br />
            Moved Online
          </h2>
          <p className={`mx-auto mt-5 max-w-2xl text-lg text-[#161616]/80 ${revealBase}`} style={{ transitionDelay: '110ms' }}>
            There used to be one square where the whole town could see you. Now the square is the
            internet, everybody is standing in it holding a phone, and being findable there is its
            own trade. We do that trade. It comes inside the build.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SQUARE.map((s, i) => (
            <div
              key={s.label}
              className={`relative flex flex-col border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#F5B700] ${revealBase}`}
              style={{ transitionDelay: `${150 + i * 80}ms` }}
            >
              <span className="absolute -top-3 left-5 border-2 border-[#161616] bg-[#F5B700] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#161616] shadow-[2px_2px_0_0_#161616]">
                {s.tag}
              </span>
              <span className="mt-2 font-display text-xl font-extrabold leading-tight text-[#161616]">{s.label}</span>
              <p className="mt-2.5 flex-1 text-[15px] leading-relaxed text-[#161616]/75">{s.line}</p>
            </div>
          ))}
        </div>
        <div className={`mt-12 text-center ${revealBase}`} style={{ transitionDelay: '640ms' }}>
          <p className={`${caveat.className} text-2xl text-[#161616]/80`}>
            all of it standard on a Talking Website, none of it a line item
          </p>
          <Link
            href="/talking-website"
            onClick={() => track('journey_square', { to: 'talking-website' })}
            className="mt-5 inline-block border-2 border-[#161616] bg-[#F5B700] px-6 py-3 font-bold text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#161616]"
          >
            See What Is Baked In
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MI 68 · The Gate                                                    */
/* ------------------------------------------------------------------ */

export function JourneyGate() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section
      id="tour-gate"
      data-journey-chapter="The Gate"
      data-mile="MI 68"
      data-letterbox
      className="relative h-[120vh] bg-[#0B0B0B]"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <Footage src="/journey/gate.mp4" poster="/journey/poster-sign.jpg" dim={0.18} />
        <div ref={ref} className="group relative z-10 flex h-full flex-col items-center justify-end pb-24 px-6 text-center">
          <span className={`${caveat.className} text-2xl md:text-3xl text-[#FFDD55] rotate-[-1.5deg] ${revealBase}`}>
            mile 68, end of the pavement
          </span>
          <h2 className={`${anton.className} mt-3 uppercase text-[#FBF6EA] leading-[0.95] drop-shadow-[3px_3px_0_rgba(22,22,22,0.9)] ${revealBase}`} style={{ fontSize: 'clamp(40px,6vw,84px)', transitionDelay: '120ms' }}>
            Welcome To The Ranch
          </h2>
          <p className={`mt-4 max-w-2xl text-lg text-[#FBF6EA]/95 ${revealBase}`} style={{ transitionDelay: '240ms' }}>
            Everything below this gate was grown here: real builds, real numbers, real owners who got their evenings back.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MI 89 · The Planting                                                */
/* ------------------------------------------------------------------ */

export function JourneyPlanting() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section
      id="tour-planting"
      data-journey-chapter="The Planting"
      data-mile="MI 89"
      className="relative bg-[#161616] py-24 md:py-32 overflow-hidden"
    >
      <div ref={ref} className="group mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
        <div className={`relative order-2 lg:order-1 ${revealBase}`} style={{ transitionDelay: '160ms' }}>
          <div className="relative rotate-[-1.4deg] border-2 border-[#F5B700] bg-[#0B0B0B] p-3 shadow-[8px_8px_0_0_#F5B700]">
            <div className="relative aspect-video overflow-hidden">
              <Footage src="/journey/planting.mp4" poster="/journey/poster-planting.jpg" dim={0.05} />
            </div>
            <p className={`${caveat.className} mt-3 text-center text-2xl text-[#FFDD55]`}>one seed, planted on purpose</p>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Mile label="MI 89 · The Planting" dark />
          <blockquote className={`mt-6 font-display italic text-2xl md:text-[28px] leading-snug text-[#FBF6EA] ${revealBase}`}>
            &ldquo;The kingdom of heaven is like a grain of mustard seed... it is the smallest of all seeds, but when it
            has grown it is larger than all the garden plants and becomes a tree, so that the birds of the air come and
            make nests in its branches.&rdquo;
          </blockquote>
          <p className={`mt-3 font-mono text-[12px] tracking-[0.2em] uppercase text-[#F5B700] ${revealBase}`} style={{ transitionDelay: '100ms' }}>
            Matthew 13:31&ndash;32
          </p>
          <p className={`mt-6 max-w-xl text-lg text-[#FBF6EA]/80 ${revealBase}`} style={{ transitionDelay: '200ms' }}>
            That verse is the whole business plan. Every build here starts seed sized: one website and one voice agent
            for one owner. Then it gets tended every day until the branches can hold weight.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MI 92 · The Tree                                                    */
/* ------------------------------------------------------------------ */

export function JourneyTree() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section
      id="tour-tree"
      data-journey-chapter="The Tree"
      data-mile="MI 92"
      data-letterbox
      className="relative h-[135vh] bg-[#0B0B0B]"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <Footage src="/journey/tree.mp4" poster="/journey/poster-tree.jpg" dim={0.12} />
        <div ref={ref} className="group relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <h2
            className={`${anton.className} uppercase text-transparent leading-[0.92] ${revealBase}`}
            style={{ WebkitTextStroke: '2.5px #FBF6EA', fontSize: 'clamp(52px,9vw,150px)' }}
          >
            The Birds
            <br />
            Come Home
          </h2>
          <p className={`mt-6 max-w-2xl text-lg md:text-xl text-[#FBF6EA]/95 ${revealBase}`} style={{ transitionDelay: '160ms' }}>
            Your customers, your calls, your bookings. All finding their way back to you, day and night,
            because there is finally something sturdy to land on.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Arrival · The Four Doors                                            */
/* ------------------------------------------------------------------ */

const DOORS = [
  {
    key: 'call',
    label: 'Ask Him Anything',
    line: 'Mr. Mustard is live right now. Ask how any of this works, what it would look like for your business, or anything else on your mind.',
    cta: 'Talk To Mr. Mustard',
    action: 'voice' as const,
  },
  {
    key: 'demo',
    label: 'Hear A Live Demo',
    line: 'Have him step into character as YOUR receptionist and take a pretend call for your business, on the spot.',
    cta: 'Run The Demo',
    href: '/voice-agents',
  },
  {
    key: 'forge',
    label: 'Build My Custom Demo',
    line: 'Give us your name and trade. We build your website and your voice agent to keep or toss.',
    cta: 'Start The Build',
    href: '/demos',
  },
  {
    key: 'book',
    label: 'Book A Call With Sarah',
    line: 'Thirty minutes, free, with the person who will actually build it. She takes every call herself.',
    cta: 'See The Calendar',
    href: '/book',
  },
];

export function JourneyDoors() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section
      id="tour-doors"
      data-journey-chapter="Four Doors"
      data-mile="Arrival"
      className="relative bg-[#FBF6EA] border-y-2 border-[#161616] py-24 md:py-32"
    >
      <div ref={ref} className="group mx-auto max-w-7xl px-6 text-center">
        <Mile label="Arrival · The Ranch House" />
        <h2 className={`${anton.className} mt-5 uppercase text-[#161616] leading-[0.95] ${revealBase}`} style={{ fontSize: 'clamp(40px,5.5vw,80px)' }}>
          Four Doors,
          <br className="md:hidden" /> All Open
        </h2>
        <p className={`mx-auto mt-4 max-w-2xl text-lg text-[#161616]/80 ${revealBase}`} style={{ transitionDelay: '100ms' }}>
          The drive is over. However you like to walk in, somebody answers.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DOORS.map((d, i) => {
            const inner = (
              <>
                <span className="font-mono font-bold text-[11px] tracking-[0.2em] uppercase text-[#C4160B]">Door {i + 1}</span>
                <span className="mt-2 font-display text-xl font-extrabold text-[#161616] leading-tight">{d.label}</span>
                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[#161616]/75">{d.line}</p>
                <span className="mt-4 inline-block bg-[#F5B700] text-[#161616] font-bold text-sm border-2 border-[#161616] px-4 py-2 shadow-[3px_3px_0_0_#161616] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[2px_2px_0_0_#161616] transition-all">
                  {d.cta}
                </span>
              </>
            );
            const cls = `group flex h-full flex-col items-center text-center border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#F5B700] transition-all ${revealBase}`;
            const delay = { transitionDelay: `${140 + i * 90}ms` };
            return d.action === 'voice' ? (
              <button key={d.key} onClick={() => openMustard('doors')} className={cls} style={delay}>
                {inner}
              </button>
            ) : (
              <Link key={d.key} href={d.href!} onClick={() => track('journey_door', { door: d.key })} className={cls} style={delay}>
                {inner}
              </Link>
            );
          })}
        </div>
        <p className={`${caveat.className} mt-10 text-2xl text-[#161616]/80 ${revealBase}`} style={{ transitionDelay: '400ms' }}>
          or just call the ranch line: <a href="tel:+14063121223" className="underline decoration-[#F5B700] decoration-2 underline-offset-4">(406) 312-1223</a>. Mr. Mustard picks up.
        </p>
      </div>
    </section>
  );
}
