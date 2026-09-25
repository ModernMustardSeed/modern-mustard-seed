import { buildMetadata } from '@/lib/seo';
import HuckVoiceWidget from '@/components/hatchery/HuckVoiceWidget';
import { HUCK } from '@/data/hatchery';

export const metadata = buildMetadata({
  title: 'Meet Huck | Born at the Mustard Hatchery',
  description: 'The official mascot of The Huckleberry Scoop, hatched by Modern Mustard Seed.',
  noindex: true,
});

/**
 * THE PILOT BIRTH: Huck's reveal page, the felt-experience artifact for the
 * Mustard Hatchery (storybook heirloom direction, approved 2026-07-14).
 * The Huckleberry Scoop is fictional and says so; Huck is an AI mascot
 * character and says so. This page doubles as the proof for the Hatchery
 * offer. Deliberately dependency-free: one server component, pure CSS.
 */
export default function HuckRevealPage() {
  return (
    <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] font-body overflow-hidden">
      <style>{`
        @keyframes candle { 0%,100%{opacity:.85} 42%{opacity:1} 58%{opacity:.78} 70%{opacity:.95} }
        @keyframes hatchIn { from{opacity:0; transform:translateY(26px) scale(.985)} to{opacity:1; transform:none} }
        @keyframes sparkle { 0%,100%{opacity:.25} 50%{opacity:.9} }
        .glow { background: radial-gradient(ellipse 68% 46% at 50% 26%, rgba(245,183,0,.30), rgba(245,183,0,.08) 55%, transparent 75%); animation: candle 3.8s ease-in-out infinite; }
        .rise { animation: hatchIn .8s cubic-bezier(.2,.8,.25,1) both; }
        .rise2 { animation: hatchIn .8s .18s cubic-bezier(.2,.8,.25,1) both; }
        .rise3 { animation: hatchIn .8s .34s cubic-bezier(.2,.8,.25,1) both; }
        .star { position:absolute; width:3px; height:3px; border-radius:99px; background:#E0301E; animation: sparkle 2.6s ease-in-out infinite; }
      `}</style>

      {/* candle glow, halftone + sparks */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] halftone-bg opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div aria-hidden className="pointer-events-none fixed inset-0 glow" />
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <span className="star" style={{ top: '12%', left: '18%' }} />
        <span className="star" style={{ top: '22%', left: '78%', animationDelay: '.9s' }} />
        <span className="star" style={{ top: '64%', left: '8%', animationDelay: '1.5s' }} />
        <span className="star" style={{ top: '78%', left: '88%', animationDelay: '.4s' }} />
        <span className="star" style={{ top: '38%', left: '92%', animationDelay: '2s' }} />
      </div>

      <main className="relative max-w-3xl mx-auto px-6 py-14 md:py-20">
        {/* certificate header */}
        <header className="text-center rise">
          <p className="text-[10px] uppercase tracking-[0.45em] text-[#B92417] font-mono font-bold">The Mustard Hatchery presents</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl font-black tracking-tight leading-[1.02]">
            Meet Huck.
          </h1>
          <p className="mt-4 font-display text-lg md:text-xl text-[#3a3733] italic max-w-xl mx-auto">
            The official mascot of The Huckleberry Scoop, Kalispell, Montana. Born the fourteenth of July by candlelight, certificate No. 000.
          </p>
        </header>

        {/* the hatching film */}
        <section className="mt-10 rise2">
          <div className="rounded-2xl overflow-hidden border-2 border-[#161616] bg-[#161616] shadow-[6px_6px_0_0_#F5B700]">
            <video
              controls
              autoPlay
              muted
              loop
              playsInline
              poster="/hatchery/huck-hatch-poster.png"
              src="/hatchery/huck-hatching.mp4"
              className="w-full block"
            />
          </div>
          <p className="text-center text-xs text-[#161616]/60 mt-4 font-mono font-bold uppercase tracking-[0.25em]">The hatching, as it happened</p>
        </section>

        {/* call him: the unforgettable thing */}
        <section className="mt-12 text-center rise3">
          <div className="inline-block bg-[#FBF6EA] text-[#161616] rounded-2xl border-2 border-[#161616] px-8 py-7 shadow-[6px_6px_0_0_#E0301E]" style={{ transform: 'rotate(-1.2deg)' }}>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#B92417] font-mono font-bold">He answers his own phone</p>
            <a
              href={HUCK.phoneHref}
              className="block mt-2 font-display text-4xl md:text-5xl font-black tracking-tight hover:text-[#B92417] transition-colors"
            >
              {HUCK.phone}
            </a>
            <p className="mt-2 font-display italic text-sm text-[#161616]/75">
              Ask him how he got his name. Tell him yours.
            </p>
          </div>

          {/* ...or talk to him right here, no phone required */}
          <div className="mt-8 max-w-xl mx-auto text-left">
            <HuckVoiceWidget />
          </div>
        </section>

        {/* model sheet + storybook excerpt */}
        <section className="mt-14 grid md:grid-cols-[1.15fr_1fr] gap-6 items-start">
          <figure className="pop-card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hatchery/huck-model-sheet.png" alt="Huck's official model sheet: four poses of a round huckleberry mascot with a leaf swoop and stubby arms" className="w-full block" />
            <figcaption className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616] px-4 py-3 bg-[#F5B700] border-t-2 border-[#161616]">
              The canonical model sheet
            </figcaption>
          </figure>
          <div className="pop-card-cream p-6">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#B92417] font-mono font-bold">From his Character Storybook</p>
            <blockquote className="mt-4 space-y-4 font-display italic text-[1.05rem] leading-[1.6] text-[#161616] border-l-4 border-[#F5B700] pl-4">
              <p>
                &ldquo;Picked on a September morning up the Jewel Basin trail, Huck rolled off the scale, under the counter, and refused to be weighed. The founder laughed so hard she gave him a name instead of a price.&rdquo;
              </p>
              <p>
                &ldquo;He has considered himself staff ever since: unpaid, unsupervised, and entirely in charge of saying hello.&rdquo;
              </p>
            </blockquote>
            <p className="mt-5 text-sm text-[#3a3733]">
              Every hatched mascot ships with a full Character Storybook, this model sheet, the hatching film, a hand-numbered Birth Certificate, and their own phone line.
            </p>
          </div>
        </section>

        {/* honesty + the pitch */}
        <footer className="mt-14 text-center border-t-2 border-[#161616] pt-8 pb-4">
          <p className="text-sm text-[#3a3733] max-w-xl mx-auto">
            The Huckleberry Scoop is a fictional shop, and Huck is an agentic mascot character (he will tell you so himself, cheerfully). He was hatched as the pilot for the Mustard Hatchery, where real businesses get their official mascot born.
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.35em] font-mono font-bold text-[#B92417]">
            Hatched by Modern Mustard Seed · Kalispell, Montana
          </p>
        </footer>
      </main>
    </div>
  );
}
