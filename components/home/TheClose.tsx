import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';

/**
 * TheClose. Beat 06: one cinematic midnight band that ends the page.
 * Merges the scripture card and the NewsletterSignup into a single closing
 * moment: manifesto line, scripture with the mustard seed lit up, the ask,
 * the list. (The brand film moved up to its own main stage, HomeFilmStage,
 * right after the hero.)
 */
export default function TheClose() {
  return (
    <section className="relative bg-[#0d0d0d] border-t-4 border-[#0d0d0d] overflow-hidden">
      {/* Halftone + warm glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(245,183,0,0.14) 1.4px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 90%, rgba(245,183,0,0.20) 0%, transparent 55%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
        <span className="font-mono font-bold text-[10px] uppercase tracking-[0.5em] text-[#ffd400] block">
          The era of the entrepreneur
        </span>

        {/* The crescendo: the one headline on the page allowed to go huge. */}
        <h2 className="font-display italic font-extrabold tracking-tight leading-[1.02] text-[#f1ede4] mt-7 text-[clamp(3rem,9vw,7.5rem)]">
          Your idea deserves to{' '}
          <span className="not-italic font-mono inline-block rotate-[-2deg] bg-[#ffd400] text-[#0d0d0d] px-4 md:px-6 border-2 border-[#0d0d0d] shadow-[6px_6px_0_0_rgba(251,246,234,0.35)]">
            ship
          </span>
        </h2>

        <p className="font-sans text-base md:text-lg text-[#f1ede4]/80 leading-relaxed mt-8 max-w-2xl mx-auto">
          One person with the right tools can now build what used to take a team of fifty. That is
          the era we are in. No co-founder, no perfect timing required. Bring the seed you have. We
          will build the rest.
        </p>

        {/* Scripture: the name on the door */}
        <div className="mt-12 max-w-2xl mx-auto border-2 border-[#ffd400]/40 bg-[#0F1422] px-7 py-6">
          <span className="font-mono font-bold text-[9px] uppercase tracking-[0.4em] text-[#ffd400] block mb-3">
            The name on the door
          </span>
          <p className="font-display text-lg md:text-2xl italic text-[#f1ede4] leading-relaxed">
            &ldquo;If you have faith as small as a{' '}
            <span className="text-[#ffd400] not-italic font-bold">mustard seed</span>, nothing will
            be impossible for you.&rdquo;
          </p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.4em] text-[#ffd400]/70">Matthew 17:20</p>
          <p className="mt-4 font-body text-sm text-[#f1ede4]/70 leading-relaxed">
            The studio is named for this. Every build here starts seed-sized. That is not the
            limitation, that is the plan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-12">
          <Link
            href="/book"
            className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#0d0d0d] bg-[#ffd400] rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_rgba(251,246,234,0.4)] hover:-translate-y-0.5 transition-all"
          >
            Book a Free Call
          </Link>
          <Link
            href="/work"
            className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#f1ede4] bg-transparent border-2 border-[#f1ede4] rounded-full hover:bg-[#f1ede4]/10 transition-all"
          >
            See The Work
          </Link>
        </div>

        {/* The list */}
        <div className="mt-16">
          <NewsletterSignup />
        </div>
      </div>
    </section>
  );
}
