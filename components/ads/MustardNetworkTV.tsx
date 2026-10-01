'use client';

/**
 * THE MUSTARD NETWORK: the signature moment on /ads. A pop-art CRT television
 * that flips between real commercials the studio has shipped, with a static
 * burst between channels and a channel dial that actually turns. Every
 * channel is proof: these are the films we run for our own brands.
 * Videos are preload="none" + poster so the set costs nothing until clicked.
 */

import { useRef, useState } from 'react';
import Reveal from '@/components/mustard-mode/Reveal';

type Channel = {
  n: string;
  title: string;
  note: string;
  src: string;
  poster: string;
};

const CHANNELS: Channel[] = [
  {
    n: '01',
    title: 'Timberline Lawn Co.',
    note: 'Landscaping: the company name mowed into the lawn beneath the peaks. Fictional company, real craft.',
    src: '/ads/broadcast-demo-16x9.mp4',
    poster: '/ads/broadcast-demo-poster.jpg',
  },
  {
    n: '02',
    title: 'Glacier Air Heating + Cooling',
    note: 'HVAC: the name spelled in frost on the front window while summer bakes outside. Cold you can see.',
    src: '/ads/broadcast-demo-hvac-16x9.mp4',
    poster: '/ads/broadcast-demo-hvac-poster.jpg',
  },
  {
    n: '03',
    title: 'The Stone Age Is Over',
    note: 'Our flagship spot: a business chisels its website by hand until one golden seed rebuilds the world.',
    src: '/ads/stone-age-16x9.mp4',
    poster: '/ads/stone-age-poster.png',
  },
  {
    n: '04',
    title: 'The Dinner Rush',
    note: 'Restaurant vertical: the family runs a trattoria while the agentic host books tables in two languages.',
    src: '/ads/restaurant-16x9.mp4',
    poster: '/ads/restaurant-poster.png',
  },
  {
    n: '05',
    title: 'Take the Bridge',
    note: 'A retro starship bridge, entirely original, zero royalties, pure nostalgia targeting.',
    src: '/ads/bridge-16x9.mp4',
    poster: '/ads/bridge-poster.png',
  },
  {
    n: '06',
    title: 'The Good News',
    note: 'Our own brand film. We run the same ads we sell, with our own money.',
    src: '/ads/good-news-16x9.mp4',
    poster: '/ads/good-news-poster.png',
  },
  {
    n: '07',
    title: 'Cross + Covenant',
    note: 'The only channel you can shop. A real storefront, live right now, and every frame is the actual site.',
    src: '/ads/cxc-16x9.mp4',
    poster: '/ads/cxc-poster.jpg',
  },
  {
    n: '08',
    title: '9:47 PM',
    note: 'Nothing the voice says here was written. We called our own voice agent after hours, recorded what it said back, and cut the ad from that.',
    src: '/ads/after-hours-16x9.mp4',
    poster: '/ads/after-hours-poster.jpg',
  },
  {
    n: '09',
    title: 'Say Whaaa',
    note: 'The only channel where the product builds something while you watch. Every frame is our own live site, scrolled in real time, and Mr. Mustard makes the offer out loud.',
    src: '/ads/say-whaa-16x9.mp4',
    poster: '/ads/say-whaa-poster.jpg',
  },
  {
    n: '10',
    title: 'HUCKWILD',
    note: 'A concept build for a wild Montana huckleberry drink. Every frame is the live site: the glass you stir, the berries you tap, 400 numbered pouches.',
    src: '/ads/huckwild/huckwild-wide.mp4',
    poster: '/ads/huckwild/huckwild-wide-poster.jpg',
  },
  {
    n: '11',
    title: 'Frames That Roar',
    note: 'Eyewear: a demo optometrist on safari, and the launch film was shot from its own website. Fictional practice, real craft.',
    src: '/ads/wild-things/frames-that-roar-16x9.mp4',
    poster: '/ads/wild-things/poster.jpg',
  },
  {
    n: '12',
    title: 'Cairnfell',
    note: 'Luxury mountain homes: a concept builder with a website, an owner portal, and a studio behind it, filmed from the build itself.',
    src: '/ads/cairnfell/cairnfell-16x9.mp4',
    poster: '/ads/cairnfell/poster.jpg',
  },
  {
    n: '13',
    title: 'The Whole Weekend',
    note: 'Weddings: one couple, one Glacier weekend, a website, a guest app, and a planner. Made for venues, planners, and photographers.',
    src: '/ads/whole-weekend/whole-weekend-16x9.mp4',
    poster: '/ads/whole-weekend/poster.jpg',
  },
];

export default function MustardNetworkTV() {
  const [active, setActive] = useState(0);
  const [staticBurst, setStaticBurst] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const flip = (idx: number) => {
    if (idx === active) return;
    setStaticBurst(true);
    window.setTimeout(() => {
      setActive(idx);
      setStaticBurst(false);
      // A channel flip is a user gesture, so playing with sound is allowed.
      window.requestAnimationFrame(() => {
        const v = videoRef.current;
        if (v) {
          v.muted = false;
          void v.play().catch(() => undefined);
        }
      });
    }, 380);
  };

  const ch = CHANNELS[active];

  return (
    <section id="network" className="py-16 md:py-24 bg-[#0b3b44] border-b-2 border-[#0b3b44] overflow-hidden">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-10 md:mb-14">
          <Reveal variant="eyebrow">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#f5b700] font-bold mb-4">[ THE MUSTARD NETWORK ]</p>
          </Reveal>
          <Reveal variant="slam">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#fbf5ea] tracking-tight leading-[1.05]">
              Change the channel.
              <br className="hidden md:block" /> It is all us.
            </h2>
          </Reveal>
          <Reveal variant="rise" delay={100}>
            <p className="font-body text-[#fbf5ea]/65 max-w-2xl mx-auto mt-4">
              Every film on this set was written, shot, scored, and cut by the studio that will make yours. No stock footage on any channel.
            </p>
          </Reveal>
        </div>

        <Reveal variant="rise" delay={120}>
          <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start max-w-6xl mx-auto">
            {/* The set */}
            <div className="rounded-[1.75rem] bg-[#fbf5ea] border-2 border-[#0b3b44] shadow-[10px_10px_0_0_#ff6f59] p-4 md:p-6">
              <div className="relative rounded-xl overflow-hidden border-2 border-[#0b3b44] bg-black">
                <video
                  key={ch.src}
                  ref={videoRef}
                  className="w-full block aspect-video"
                  src={ch.src}
                  poster={ch.poster}
                  controls
                  playsInline
                  preload="none"
                  aria-label={`${ch.title} commercial`}
                />
                {/* Scanlines */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.12]"
                  style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 4px)' }}
                  aria-hidden="true"
                />
                {/* Static burst between channels */}
                {staticBurst && (
                  <div className="absolute inset-0 tv-static flex items-center justify-center" aria-hidden="true">
                    <p className="font-mono text-xs uppercase tracking-[0.4em] text-white/80 bg-black/40 px-3 py-1 rounded">CH {CHANNELS[active].n} → </p>
                  </div>
                )}
                {/* Channel bug */}
                <p className="absolute top-2 right-3 font-mono text-[11px] uppercase tracking-[0.25em] text-white/85 drop-shadow" aria-hidden="true">
                  CH {ch.n}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 px-1">
                <div>
                  <p className="font-sans font-extrabold text-[#0b3b44]">{ch.title}</p>
                  <p className="font-body text-sm text-[#0b3b44]/65 max-w-md">{ch.note}</p>
                </div>
                {/* The dial */}
                <div className="hidden md:flex flex-col items-center gap-1" aria-hidden="true">
                  <div
                    className="w-14 h-14 rounded-full bg-[#0b3b44] border-2 border-[#0b3b44] shadow-[3px_3px_0_0_#f5b700] flex items-center justify-center transition-transform duration-300"
                    style={{ transform: `rotate(${active * 65}deg)` }}
                  >
                    <div className="w-1.5 h-5 bg-[#f5b700] rounded-full -translate-y-2.5" />
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#0b3b44]/50">Dial</p>
                </div>
              </div>
            </div>

            {/* Channel buttons */}
            <div className="grid grid-cols-2 gap-3">
              {CHANNELS.map((c, i) => (
                <button
                  key={c.n}
                  type="button"
                  onClick={() => flip(i)}
                  aria-pressed={i === active}
                  className={`text-left rounded-xl border-2 border-[#0b3b44] px-3 py-2.5 transition-all hover:-translate-y-0.5 ${
                    i === active
                      ? 'bg-[#f5b700] shadow-[4px_4px_0_0_#fbf5ea] text-[#0b3b44]'
                      : 'bg-[#fbf5ea] shadow-[4px_4px_0_0_#f5b700] text-[#0b3b44]'
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] font-bold">CH {c.n}</p>
                  <p className="font-sans font-bold text-sm leading-tight mt-0.5">{c.title}</p>
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <style>{`
        .tv-static {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 140px 140px;
          animation: tv-flicker 90ms steps(2) infinite;
        }
        @keyframes tv-flicker {
          0% { background-position: 0 0; filter: brightness(1.4); }
          50% { background-position: 40px 60px; filter: brightness(0.9); }
          100% { background-position: -30px 20px; filter: brightness(1.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tv-static { animation: none; }
        }
      `}</style>
    </section>
  );
}
