import Image from 'next/image';
import Link from 'next/link';
import MagneticLink from './MagneticLink';
import MrMustardHeroCTA from './MrMustardHeroCTA';

// Pop-art hero. Cream + halftone, the logo-with-mascot front and center, bold
// black comic type, and the lion video moved down to a framed band at the
// bottom. No periods in the headline (brand rule).
export default function HeroIdeaToProduct() {
  return (
    <section className="relative isolate overflow-hidden bg-[#FBF6EA] border-b-4 border-[#161616] pt-32 md:pt-40 pb-20 px-6">
      {/* Halftone dot field */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(245,183,0,0.30) 1.5px, transparent 1.6px)',
          backgroundSize: '18px 18px',
        }}
      />
      {/* Comic sunburst glow behind the logo */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-20 -translate-x-1/2 w-[700px] h-[700px] max-w-[130vw] z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(245,183,0,0.38) 0%, rgba(245,183,0,0.14) 38%, transparent 64%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Now booking pill */}
        <div className="opacity-0 animate-fade-in-up inline-flex items-center gap-2 px-3.5 py-1.5 mb-7 rounded-full border-2 border-[#161616] bg-white">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E0301E] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E0301E]" />
          </span>
          <span className="text-[10px] tracking-[0.25em] uppercase font-mono font-bold text-[#161616]">
            Now booking new builds
          </span>
        </div>

        {/* Logo lockup with mascot */}
        <div className="opacity-0 animate-fade-in-up relative mx-auto w-[290px] sm:w-[380px] md:w-[460px] mb-8">
          <Image
            src="/brand/logo-lockup.png"
            alt="Modern Mustard Seed"
            width={1135}
            height={1235}
            priority
            className="w-full h-auto drop-shadow-[6px_6px_0_rgba(22,22,22,0.14)]"
          />
        </div>

        {/* Headline */}
        <h1 className="opacity-0 animate-fade-in-up font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.03] text-[#161616]">
          You bring the{' '}
          <span className="inline-block align-middle mx-1.5 -rotate-[6deg] rounded-[10px] border-[3px] border-[#161616] bg-[#FBF6EA] px-3 md:px-4 py-1 text-[0.6em] leading-none font-sans font-black uppercase tracking-tight text-[#161616] shadow-[3px_3px_0_0_#161616,6px_6px_0_0_#1E50C8]">
            seed
          </span>
          <br />
          we build the{' '}
          <span className="inline-block align-middle mx-1.5 -rotate-[6deg] rounded-[10px] border-[3px] border-[#161616] bg-[#FBF6EA] px-3 md:px-4 py-1 text-[0.6em] leading-none font-sans font-black uppercase tracking-tight text-[#161616] shadow-[3px_3px_0_0_#161616,6px_6px_0_0_#1E50C8]">
            tree
          </span>
        </h1>

        <p className="opacity-0 animate-fade-in-up-delay mt-6 text-base md:text-xl font-body text-[#3a3733] max-w-2xl mx-auto leading-relaxed">
          Apps, sites, and specialty AI tools for founders, operators, and small business owners.{' '}
          <span className="font-bold text-[#161616]">Live in as little as 2 weeks.</span>
        </p>

        <p className="opacity-0 animate-fade-in-up-delay-2 mt-3 text-sm md:text-base font-body font-bold text-[#E0301E] max-w-2xl mx-auto">
          The era of the entrepreneur is here. Bring your idea. We build it. You own it.
        </p>

        {/* CTAs */}
        <div className="opacity-0 animate-fade-in-up-delay-3 mt-8 flex flex-col sm:flex-row gap-3.5 justify-center">
          <MagneticLink
            href="/build-queue"
            className="px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            Join the Build Queue
          </MagneticLink>
          <Link
            href="/work"
            className="px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            See the Work
          </Link>
        </div>

        {/* Mr. Mustard: live voice or chat, visitor's choice */}
        <MrMustardHeroCTA />

        {/* Multilingual voice agent highlight */}
        <div className="opacity-0 animate-fade-in-up-delay-3 mt-6">
          <Link
            href="/voice-agents"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#161616] bg-white text-[11px] font-sans font-bold text-[#161616] shadow-[3px_3px_0_0_#161616] hover:bg-[#F5B700] hover:-translate-y-0.5 transition-all"
          >
            <span aria-hidden="true">🌍</span> Our AI voice agents now speak 100+ languages. Hear one →
          </Link>
        </div>

        {/* Scripture card */}
        <div className="opacity-0 animate-fade-in-up-delay-3 mt-12 max-w-2xl mx-auto">
          <div className="rounded-2xl border-2 border-[#161616] bg-white px-7 py-6 shadow-[5px_5px_0_0_#161616]">
            <span className="text-[9px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">
              Matthew 17:20
            </span>
            <p className="font-display text-lg md:text-2xl italic text-[#161616] leading-relaxed">
              &ldquo;If you have faith as small as a{' '}
              <span className="text-[#F5B700] not-italic font-bold" style={{ WebkitTextStroke: '1px #161616' }}>
                mustard seed
              </span>
              , nothing will be impossible for you.&rdquo;
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
