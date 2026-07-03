import Link from 'next/link';
import HeroVideo from '@/components/HeroVideo';
import NewsletterSignup from '@/components/NewsletterSignup';

/**
 * TheClose. Beat 06: one cinematic midnight band that ends the page.
 * Merges the old CelebrationVideo, the scripture card, the lion HeroVideo,
 * and the NewsletterSignup into a single closing moment: manifesto line,
 * scripture with the mustard seed lit up, the ask, the film, the list.
 */
export default function TheClose() {
  return (
    <section className="relative bg-[#080C16] border-t-4 border-[#161616] overflow-hidden">
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
        <span className="font-mono font-bold text-[10px] uppercase tracking-[0.5em] text-[#F5B700] block">
          The era of the entrepreneur
        </span>

        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[1.02] text-[#FBF6EA] mt-7">
          Your idea deserves to{' '}
          <span
            className="not-italic font-mono text-[#F5B700]"
            style={{ textShadow: '3px 3px 0 #FBF6EA' }}
          >
            ship
          </span>
        </h2>

        <p className="font-sans text-base md:text-lg text-[#FBF6EA]/80 leading-relaxed mt-7 max-w-2xl mx-auto">
          One person with the right tools can now build what used to take a team of fifty. That is
          the era we are in. No co-founder, no perfect timing required. Bring what you have and we
          will build the rest.
        </p>

        {/* Scripture: the name on the door */}
        <div className="mt-12 max-w-2xl mx-auto border-2 border-[#F5B700]/40 bg-[#0F1422] px-7 py-6">
          <span className="font-mono font-bold text-[9px] uppercase tracking-[0.4em] text-[#F5B700] block mb-3">
            Matthew 17:20
          </span>
          <p className="font-display text-lg md:text-2xl italic text-[#FBF6EA] leading-relaxed">
            &ldquo;If you have faith as small as a{' '}
            <span className="text-[#F5B700] not-italic font-bold">mustard seed</span>, nothing will
            be impossible for you.&rdquo;
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-12">
          <Link
            href="/book"
            className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(251,246,234,0.4)] hover:-translate-y-0.5 transition-all"
          >
            Book a call with Sarah
          </Link>
          <Link
            href="/build-queue"
            className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#FBF6EA] bg-transparent border-2 border-[#FBF6EA] rounded-full hover:bg-[#FBF6EA]/10 transition-all"
          >
            Join the Build Queue
          </Link>
        </div>

        {/* The film */}
        <div className="mt-16 max-w-3xl mx-auto">
          <span className="font-mono font-bold text-[10px] uppercase tracking-[0.35em] text-[#F5B700]/70 block mb-4">
            Watch
          </span>
          <HeroVideo />
        </div>

        {/* The list */}
        <div className="mt-16">
          <NewsletterSignup />
        </div>
      </div>
    </section>
  );
}
