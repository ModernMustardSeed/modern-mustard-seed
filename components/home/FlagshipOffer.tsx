import Link from 'next/link';
import { DEMO_BUNDLE } from '@/lib/demo-order';

/**
 * FLAGSHIP OFFER. Homepage beat: the studio's headline product, built free and
 * kept for a monthly. TWO pieces, and the saving is the bundle itself.
 *
 * ⚠️ THE COMMAND CENTER IS NOT A PIECE OF THIS OFFER (Sarah, 2026-08-22, again
 * on 2026-08-25: "I am not pushing command center anywhere"). There used to be
 * a third card here with its price struck through under a "free with both"
 * rubber stamp. It is still sold on its own page and its own pay link, it is
 * simply never bundled, never stamped free, and never suggested next to
 * anything. Do not add it back to PIECES.
 *
 * Pop-art cabin system: cream canvas, ink pop-cards, gold, halftone. Every
 * price DERIVES from DEMO_PRODUCTS / DEMO_BUNDLE (never typed).
 */

type Tone = 'ink' | 'gold';

const PIECES: { key: 'voice' | 'site'; icon: string; name: string; desc: string; tone: Tone }[] = [
  {
    key: 'voice',
    icon: '🎙',
    name: 'Voice Agent',
    desc: 'Answers your real number 24/7 in a natural voice, books the job, and texts you the details. Never a missed call again.',
    tone: 'ink',
  },
  {
    key: 'site',
    icon: '🌐',
    name: 'Your New Website',
    desc: 'Designed from scratch for your trade and your town. A real working site on your own domain, live in about a week.',
    tone: 'gold',
  },
];

const priceLine = () => 'Request a quote';

export default function FlagshipOffer() {
  return (
    <section className="relative bg-[#fbf5ea] py-20 md:py-28 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
          Our flagship // Built free before you pay a cent
        </p>
        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#0b3b44] mt-3 leading-[1.02] max-w-3xl">
          A voice agent and a website,<br />built off one brain.
        </h2>
        <p className="font-body text-[15px] md:text-[17px] text-[#0b3b44]/75 mt-5 max-w-2xl leading-relaxed">
          Tell us your business and we build both, free, in about a minute. Keep what you love. Take the website
          and the voice agent together and they are built as one thing, for less than the two apart.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-12 items-stretch">
          {PIECES.map((c) => {
            const inkCard = c.tone === 'ink';
            const bodyColor = inkCard ? 'text-[#fbf5ea]/75' : 'text-[#0b3b44]/75';
            return (
              <div
                key={c.key}
                className={`relative flex flex-col border-2 border-[#0b3b44] p-7 transition-transform hover:-translate-y-1 ${
                  inkCard
                    ? 'bg-[#0b3b44] shadow-[6px_6px_0_0_#f5b700]'
                    : 'bg-[#f5b700] shadow-[6px_6px_0_0_#0b3b44]'
                }`}
              >
                <span className="text-3xl leading-none" aria-hidden>{c.icon}</span>
                <h3 className={`font-display italic font-extrabold text-2xl mt-3 ${inkCard ? 'text-[#fbf5ea]' : 'text-[#0b3b44]'}`}>
                  {c.name}
                </h3>
                <p className={`font-body text-[14px] mt-3 leading-relaxed ${bodyColor}`}>{c.desc}</p>

                {/* Price pill pinned to a common baseline (mt-auto). */}
                <div className="mt-auto pt-6">
                  <p className={`font-mono text-[13px] font-bold ${inkCard ? 'text-[#f5b700]' : 'text-[#0b3b44]'}`}>
                    <span className={`block text-[10px] uppercase tracking-[0.14em] ${inkCard ? 'text-[#fbf5ea]/50' : 'text-[#0b3b44]/55'}`}>
                      Free demo, then
                    </span>
                    {priceLine()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Whole-system callout + the build CTA. */}
        <div className="mt-8 border-2 border-[#0b3b44] bg-white shadow-[6px_6px_0_0_#0b3b44] p-7 md:p-8 md:flex md:items-center md:justify-between gap-8">
          <div className="md:flex-1">
            <span className="font-mono font-bold text-[10px] uppercase tracking-[0.3em] text-[#C4160B] block">
              The first of its kind
            </span>
            <h3 className="font-display italic font-extrabold text-2xl md:text-3xl text-[#0b3b44] mt-2">
              {DEMO_BUNDLE.name}: a website that answers its own phone
            </h3>
            <p className="font-body text-[14px] text-[#0b3b44]/75 mt-2 leading-relaxed max-w-xl">
              Your site and your voice agent built as one thing, off one brain, so the answer a
              visitor reads is the answer a caller hears. We quote your website and voice agent in the conversation, with the scope and price agreed before work starts.
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex flex-col gap-3 shrink-0">
            <Link
              href="/demos"
              className="text-center px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0b3b44] bg-[#f5b700] rounded-full border-2 border-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44] hover:-translate-y-0.5 transition-all"
            >
              Build my demos, free →
            </Link>
            <Link
              href="/book"
              className="text-center px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0b3b44] bg-white rounded-full border-2 border-[#0b3b44] shadow-[4px_4px_0_0_rgba(11,59,68,0.25)] hover:-translate-y-0.5 transition-all"
            >
              Book a free call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
