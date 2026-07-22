import Link from 'next/link';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';

/**
 * FLAGSHIP OFFER. Homepage beat: the studio's headline product, forged free and
 * kept for a monthly. Three pieces, and the command center's price is STRUCK
 * THROUGH under a "free with either" stamp (the signature moment, the hook).
 * Pop-art cabin system: cream canvas, ink pop-cards, gold, halftone. Every
 * price DERIVES from DEMO_PRODUCTS / DEMO_BUNDLE (never typed).
 */

type Tone = 'ink' | 'gold' | 'white';

const PIECES: { key: 'voice' | 'site' | 'os'; icon: string; name: string; desc: string; tone: Tone; free?: boolean }[] = [
  {
    key: 'voice',
    icon: '🎙',
    name: 'AI Receptionist',
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
  {
    key: 'os',
    icon: '⚙',
    name: 'Business Command Center',
    desc: 'Your back office: every call transcribed, your website traffic, customers, reviews, and money on one board.',
    tone: 'white',
    free: true,
  },
];

const priceLine = (key: 'voice' | 'site' | 'os') => {
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
          A receptionist, a website,<br />and the brain that runs them.
        </h2>
        <p className="font-body text-[15px] md:text-[17px] text-[#161616]/75 mt-5 max-w-2xl leading-relaxed">
          Tell us your business and we forge all three, free, in about a minute. Keep what you love. Add the website or
          the receptionist and your command center comes free, so the back office is on the house.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-12 items-stretch">
          {PIECES.map((c) => {
            const inkCard = c.tone === 'ink';
            const goldCard = c.tone === 'gold';
            const bodyColor = inkCard ? 'text-[#FBF6EA]/75' : 'text-[#161616]/75';
            return (
              <div
                key={c.key}
                className={`relative flex flex-col border-2 border-[#161616] p-7 transition-transform hover:-translate-y-1 ${
                  inkCard
                    ? 'bg-[#161616] shadow-[6px_6px_0_0_#F5B700]'
                    : goldCard
                      ? 'bg-[#F5B700] shadow-[6px_6px_0_0_#161616]'
                      : 'bg-white shadow-[8px_8px_0_0_#161616]'
                }`}
              >
                {/* Signature moment: the FREE rubber-stamp on the command center. */}
                {c.free ? (
                  <span
                    aria-hidden
                    className="absolute -top-4 -right-3 rotate-[8deg] select-none bg-[#C4160B] text-[#FBF6EA] font-mono font-extrabold text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 border-2 border-[#161616] shadow-[3px_3px_0_0_#161616]"
                  >
                    Free with either
                  </span>
                ) : null}

                <span className="text-3xl leading-none" aria-hidden>{c.icon}</span>
                <h3 className={`font-display italic font-extrabold text-2xl mt-3 ${inkCard ? 'text-[#FBF6EA]' : 'text-[#161616]'}`}>
                  {c.name}
                </h3>
                <p className={`font-body text-[14px] mt-3 leading-relaxed ${bodyColor}`}>{c.desc}</p>

                {/* Price pill pinned to a common baseline (mt-auto). */}
                <div className="mt-auto pt-6">
                  {c.free ? (
                    <p className="font-mono text-[13px] font-bold">
                      <span className={`line-through ${inkCard ? 'text-[#FBF6EA]/40' : 'text-[#161616]/40'}`}>
                        {priceLine(c.key)}
                      </span>
                      <span className="block mt-1 text-[#C4160B] font-extrabold text-[15px] not-italic">
                        Free with your site or receptionist
                      </span>
                    </p>
                  ) : (
                    <p className={`font-mono text-[13px] font-bold ${inkCard ? 'text-[#F5B700]' : 'text-[#161616]'}`}>
                      <span className={`block text-[10px] uppercase tracking-[0.14em] ${inkCard ? 'text-[#FBF6EA]/50' : 'text-[#161616]/55'}`}>
                        Free demo, then
                      </span>
                      {priceLine(c.key)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Whole-system callout + the forge CTA. */}
        <div className="mt-8 border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] p-7 md:p-8 md:flex md:items-center md:justify-between gap-8">
          <div className="md:flex-1">
            <span className="font-mono font-bold text-[10px] uppercase tracking-[0.3em] text-[#C4160B] block">
              The whole system, one login
            </span>
            <h3 className="font-display italic font-extrabold text-2xl md:text-3xl text-[#161616] mt-2">
              Receptionist + website + free command center
            </h3>
            <p className="font-body text-[14px] text-[#161616]/75 mt-2 leading-relaxed max-w-xl">
              Take both paid pieces for {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo + {formatUsd(DEMO_BUNDLE.setupCents)} setup,
              command center on the house. Month to month, cancel anytime, no trials. The demo was the trial.
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex flex-col gap-3 shrink-0">
            <Link
              href="/demos"
              className="text-center px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Forge my three demos, free →
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
