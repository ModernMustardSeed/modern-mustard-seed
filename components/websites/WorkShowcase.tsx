import Image from 'next/image';
import { WORK_SITES } from '@/data/website-work';

/**
 * The bottom scroll: real sites the studio shipped, gliding past in a marquee
 * that pauses on hover and stands still under reduced-motion. Each card links to
 * the live site. Pop-art cabin framing, full-bleed so it feels like a reel.
 */

export default function WorkShowcase() {
  // Duplicate the list so the -50% translate loops seamlessly.
  const row = [...WORK_SITES, ...WORK_SITES];

  return (
    <section aria-labelledby="work-showcase" className="relative bg-[#FBF6EA] border-t-2 border-[#161616] py-16 md:py-20 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
          Real work // Real businesses
        </p>
        <h2 id="work-showcase" className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
          Sites we have actually shipped.
        </h2>
        <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed">
          Every one of these is a real business, live on the web, designed and built by the studio. Hover to slow the
          reel down.
        </p>
      </div>

      {/* The reel */}
      <div className="wsx-wrap relative mt-10">
        <div className="wsx-track flex gap-5 w-max px-6">
          {row.map((s, i) => (
            <div
              key={`${s.key}-${i}`}
              aria-hidden={i >= WORK_SITES.length ? true : undefined}
              className="wsx-card shrink-0 w-[300px] sm:w-[380px]"
            >
              <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] overflow-hidden">
                <div className="relative aspect-[16/10] bg-[#161616]">
                  <Image
                    src={s.img}
                    alt={`${s.name}, a ${s.trade.toLowerCase()} website built by Modern Mustard Seed`}
                    fill
                    sizes="380px"
                    className="object-cover object-top"
                  />
                </div>
                <div className="px-4 py-3 border-t-2 border-[#161616]">
                  <p className="font-display italic font-extrabold text-[15px] text-[#161616] truncate">{s.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f6600] truncate">{s.trade} · {s.place}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .wsx-wrap { -webkit-mask-image: linear-gradient(90deg, transparent, #000 3%, #000 97%, transparent); mask-image: linear-gradient(90deg, transparent, #000 3%, #000 97%, transparent); }
        .wsx-track { animation: wsxScroll 70s linear infinite; }
        .wsx-wrap:hover .wsx-track { animation-play-state: paused; }
        @keyframes wsxScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) {
          .wsx-track { animation: none; }
          .wsx-wrap { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
        }
      `}</style>
    </section>
  );
}
