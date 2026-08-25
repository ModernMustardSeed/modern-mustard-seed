import Link from 'next/link';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';

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

const priceLine = (key: 'voice' | 'site') => {
  const p = DEMO_PRODUCTS[key];
  return `${formatUsd(p.monthlyCents)}/mo + ${formatUsd(p.setupCents)} setup`;
};

export default function FlagshipOffer() {
  return (
    <section className="relative bg-[#FBF6EA] py-20 md:py-28 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
          Our flagship // Built free before you pay a cent
        </p>
        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 leading-[1.02] max-w-3xl">
          A voice agent and a website,<br />built off one brain.
        </h2>
        <p className="font-body text-[15px] md:text-[17px] text-[#161616]/75 mt-5 max-w-2xl leading-relaxed">
          Tell us your business and we build both, free, in about a minute. Keep what you love. Take the website
          and the voice agent together and they are built as one thing, for less than the two apart.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-12 items-stretch">
          {PIECES.map((c) => {
            const inkCard = c.tone === 'ink';
            const bodyColor = inkCard ? 'text-[#FBF6EA]/75' : 'text-[#161616]/75';
            return (
              <div
                key={c.key}
                className={`relative flex flex-col border-2 border-[#161616] p-7 transition-transform hover:-translate-y-1 ${
                  inkCard
                    ? 'bg-[#161616] shadow-[6px_6px_0_0_#F5B700]'
                    : 'bg-[#F5B700] shadow-[6px_6px_0_0_#161616]'
                }`}
              >
                <span className="text-3xl leading-none" aria-hidden>{c.icon}</span>
                <h3 className={`font-display italic font-extrabold text-2xl mt-3 ${inkCard ? 'text-[#FBF6EA]' : 'text-[#161616]'}`}>
                  {c.name}
                </h3>
                <p className={`font-body text-[14px] mt-3 leading-relaxed ${bodyColor}`}>{c.desc}</p>

                {/* Price pill pinned to a common baseline (mt-auto). */}
                <div className="mt-auto pt-6">
                  <p className={`font-mono text-[13px] font-bold ${inkCard ? 'text-[#F5B700]' : 'text-[#161616]'}`}>
                    <span className={`block text-[10px] uppercase tracking-[0.14em] ${inkCard ? 'text-[#FBF6EA]/50' : 'text-[#161616]/55'}`}>
                      Free demo, then
                    </span>
                    {priceLine(c.key)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Whole-system callout + the build CTA. */}
        <div className="mt-8 border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] p-7 md:p-8 md:flex md:items-center md:justify-between gap-8">
          <div className="md:flex-1">
            <span className="font-mono font-bold text-[10px] uppercase tracking-[0.3em] text-[#C4160B] block">
              The first of its kind
            </span>
            <h3 className="font-display italic font-extrabold text-2xl md:text-3xl text-[#161616] mt-2">
              {DEMO_BUNDLE.name}: a website that answers its own phone
            </h3>
            <p className="font-body text-[14px] text-[#161616]/75 mt-2 leading-relaxed max-w-xl">
              Your site and your voice agent built as one thing, off one brain, so the answer a
              visitor reads is the answer a caller hears. {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo +{' '}
              {formatUsd(DEMO_BUNDLE.setupCents)} setup. That is{' '}
              {formatUsd(
                DEMO_PRODUCTS.voice.setupCents + DEMO_PRODUCTS.site.setupCents - DEMO_BUNDLE.setupCents
              )}{' '}
              off the setup and{' '}
              {formatUsd(
                DEMO_PRODUCTS.voice.monthlyCents +
                  DEMO_PRODUCTS.site.monthlyCents -
                  DEMO_BUNDLE.monthlyCents
              )}
              /mo off buying the pieces apart. Month to month, no trials. The demo was the trial.
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex flex-col gap-3 shrink-0">
            <Link
              href="/demos"
              className="text-center px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Build my demos, free →
            </Link>
            <Link
              href="/book"
              className="text-center px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.25)] hover:-translate-y-0.5 transition-all"
            >
              Book a free call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
