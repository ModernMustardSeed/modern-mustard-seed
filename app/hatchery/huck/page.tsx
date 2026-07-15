import { buildMetadata } from '@/lib/seo';
import HuckVoiceWidget from '@/components/hatchery/HuckVoiceWidget';

export const metadata = buildMetadata({
  title: 'Meet Huck — Born at the Mustard Hatchery',
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
    <div className="min-h-screen bg-[#0d0a05] text-[#FBF6EA] overflow-hidden" style={{ fontFamily: 'var(--font-body, DM Sans, sans-serif)' }}>
      <style>{`
        @keyframes candle { 0%,100%{opacity:.85} 42%{opacity:1} 58%{opacity:.78} 70%{opacity:.95} }
        @keyframes hatchIn { from{opacity:0; transform:translateY(26px) scale(.985)} to{opacity:1; transform:none} }
        @keyframes sparkle { 0%,100%{opacity:.25} 50%{opacity:.9} }
        .glow { background: radial-gradient(ellipse 68% 46% at 50% 30%, rgba(245,183,0,.22), rgba(232,165,66,.08) 55%, transparent 75%); animation: candle 3.8s ease-in-out infinite; }
        .rise { animation: hatchIn .8s cubic-bezier(.2,.8,.25,1) both; }
        .rise2 { animation: hatchIn .8s .18s cubic-bezier(.2,.8,.25,1) both; }
        .rise3 { animation: hatchIn .8s .34s cubic-bezier(.2,.8,.25,1) both; }
        .star { position:absolute; width:3px; height:3px; border-radius:99px; background:#F5B700; animation: sparkle 2.6s ease-in-out infinite; }
      `}</style>

      {/* candle glow + sparks */}
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
          <p className="text-[10px] uppercase tracking-[0.45em] text-[#F5B700] font-mono font-bold">The Mustard Hatchery presents</p>
          <h1 className="mt-4 text-5xl md:text-7xl font-bold leading-[1.02]" style={{ fontFamily: 'var(--font-display, Playfair Display, serif)' }}>
            Meet Huck.
          </h1>
          <p className="mt-4 text-lg md:text-xl text-[#FBF6EA]/80 italic max-w-xl mx-auto" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)' }}>
            The official mascot of The Huckleberry Scoop, Kalispell, Montana. Born the fourteenth of July by candlelight, certificate No. 000.
          </p>
        </header>

        {/* the hatching film */}
        <section className="mt-10 rise2">
          <div className="rounded-2xl overflow-hidden border-2 border-[#F5B700]/70 shadow-[0_0_80px_-18px_rgba(245,183,0,.45)]">
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
          <p className="text-center text-xs text-[#FBF6EA]/50 mt-3 font-mono uppercase tracking-[0.25em]">The hatching, as it happened</p>
        </section>

        {/* call him: the unforgettable thing */}
        <section className="mt-12 text-center rise3">
          <div className="inline-block bg-[#FBF6EA] text-[#161616] rounded-2xl border-2 border-[#161616] px-8 py-7 shadow-[6px_6px_0_0_#B54423]" style={{ transform: 'rotate(-1.2deg)' }}>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#B54423] font-mono font-bold">He answers his own phone</p>
            <a
              href="tel:+14067470139"
              className="block mt-2 text-4xl md:text-5xl font-bold tracking-tight hover:opacity-80 transition-opacity"
              style={{ fontFamily: 'var(--font-display, Playfair Display, serif)' }}
            >
              (406) 747-0139
            </a>
            <p className="mt-2 text-sm text-[#161616]/70" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontStyle: 'italic' }}>
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
          <figure className="rounded-2xl overflow-hidden border-2 border-[#FBF6EA]/25">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hatchery/huck-model-sheet.png" alt="Huck's official model sheet: four poses of a round huckleberry mascot with a leaf swoop and stubby arms" className="w-full block" />
            <figcaption className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#FBF6EA]/50 px-4 py-3 bg-[#FBF6EA]/5">
              The canonical model sheet
            </figcaption>
          </figure>
          <div className="bg-[#FBF6EA]/5 border border-[#FBF6EA]/15 rounded-2xl p-6">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#F5B700] font-mono font-bold">From his Character Storybook</p>
            <blockquote className="mt-4 space-y-4 text-[#FBF6EA]/85" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)', fontSize: '1.15rem', lineHeight: 1.55 }}>
              <p>
                &ldquo;Picked on a September morning up the Jewel Basin trail, Huck rolled off the scale, under the counter, and refused to be weighed. The founder laughed so hard she gave him a name instead of a price.&rdquo;
              </p>
              <p>
                &ldquo;He has considered himself staff ever since: unpaid, unsupervised, and entirely in charge of saying hello.&rdquo;
              </p>
            </blockquote>
            <p className="mt-5 text-sm text-[#FBF6EA]/60">
              Every hatched mascot ships with a full Character Storybook, this model sheet, the hatching film, a hand-numbered Birth Certificate, and their own phone line.
            </p>
          </div>
        </section>

        {/* honesty + the pitch */}
        <footer className="mt-14 text-center border-t border-[#FBF6EA]/15 pt-8 pb-4">
          <p className="text-sm text-[#FBF6EA]/55 max-w-xl mx-auto">
            The Huckleberry Scoop is a fictional shop, and Huck is an AI mascot character (he will tell you so himself, cheerfully). He was hatched as the pilot for the Mustard Hatchery, where real businesses get their official mascot born.
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.35em] font-mono text-[#F5B700]/80">
            Hatched by Modern Mustard Seed · Kalispell, Montana
          </p>
        </footer>
      </main>
    </div>
  );
}
