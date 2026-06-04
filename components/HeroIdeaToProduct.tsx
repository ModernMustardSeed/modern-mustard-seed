import Link from 'next/link';
import MagneticLink from './MagneticLink';
import HeroVideo from './HeroVideo';

export default function HeroIdeaToProduct() {
  return (
    <section className="relative isolate min-h-[94vh] flex flex-col items-center justify-center px-6 pt-36 md:pt-44 pb-24 text-center overflow-hidden">
      {/* Layer 0: Warm mustard plate that matches the video so there is no flash */}
      <div className="absolute inset-0 z-0 bg-[#D1A02B]" aria-hidden="true" />

      {/* Layer 1: Real cinematic backdrop video with optional soundtrack */}
      <HeroVideo />

      {/* Layer 2: Warm mustard base tint over the video so the brand owns the color */}
      <div
        className="absolute inset-0 z-[1] bg-[#D1A02B]/20 mix-blend-multiply pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 3: Sky gradient — bright blue top, cream-pale bottom, breathing room */}
      <div
        className="absolute inset-0 z-[1] mix-blend-screen pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(143,192,239,0.32) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(245,240,232,0.18) 0%, transparent 55%)',
        }}
      />

      {/* Layer 5: Bottom fade into next section */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 z-[3] bg-gradient-to-b from-transparent via-[#0F1422]/40 to-[#080c16] pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Live status pill: cream + brass, celebratory tone */}
        <div className="opacity-0 animate-fade-in-up inline-flex items-center gap-2.5 px-4 py-1.5 mb-10 rounded-full border border-cream-100/40 bg-midnight-700/35 backdrop-blur-md shadow-[0_0_30px_rgba(245,240,232,0.18)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-light opacity-80" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-light" />
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-cream-100 font-mono font-medium">
            Now booking
          </span>
          <span className="w-px h-3 bg-cream-100/25" aria-hidden="true" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-gold-light font-mono font-medium">
            New builds welcome
          </span>
        </div>

        {/* Readability card: a translucent scrim so the copy is legible while
            the video still reads through and all around it. */}
        <div className="opacity-0 animate-fade-in-up mb-12 mx-auto max-w-3xl rounded-[2rem] border border-cream-100/10 bg-midnight-900/45 backdrop-blur-md px-6 py-10 md:px-14 md:py-12 shadow-[0_8px_50px_rgba(8,12,22,0.5)]">
          <span className="text-[10px] tracking-[0.4em] uppercase text-cream-100/80 font-mono font-medium block mb-8">
            Modern Mustard Seed
          </span>

          {/* Headline: the brand's strongest line. Mustard-seed metaphor.
              You bring the seed, we build the tree. No periods. */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-[-0.015em] leading-[1.0] text-cream-50 drop-shadow-[0_3px_30px_rgba(8,12,22,0.75)]">
            You bring the seed
            <br />
            We build the{' '}
            <span className="text-gradient-brass italic">tree</span>
          </h1>

          {/* Hairline divider with shimmer */}
          <div className="relative mt-10 mb-8 mx-auto h-px w-24">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-light/70 to-transparent" />
            <div className="shimmer-line absolute inset-0" />
          </div>

          <p className="font-display text-2xl md:text-3xl font-semibold italic tracking-tight leading-[1.25] text-cream-100 max-w-2xl mx-auto mb-6 drop-shadow-[0_2px_18px_rgba(8,12,22,0.6)]">
            Your dream, built to fullness
          </p>

          <p className="text-cream-100/90 text-base md:text-lg font-body font-light tracking-normal max-w-2xl mx-auto leading-relaxed mb-4 drop-shadow-[0_1px_12px_rgba(8,12,22,0.55)]">
            Apps, sites, and specialty AI tools for founders, operators, and small business owners who finally have a partner to ship what they have been carrying. Built in 30 days. Now booking new builds. Yours, fully.
          </p>

          <p className="text-gold-light text-sm md:text-base font-body font-medium tracking-normal max-w-2xl mx-auto leading-relaxed drop-shadow-[0_1px_12px_rgba(8,12,22,0.55)]">
            The era of the entrepreneur is here. Bring your idea. We will build it real.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center opacity-0 animate-fade-in-up-delay-3 mb-14">
          <MagneticLink
            href="/build-queue"
            className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_55px_rgba(255,107,53,0.6),0_0_28px_rgba(232,200,138,0.5)]"
          >
            Join the Build Queue
          </MagneticLink>
          <Link
            href="/work"
            className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-100 border border-cream-100/35 rounded-full bg-midnight-700/30 backdrop-blur-sm hover:bg-midnight-700/50 hover:border-cream-100/60 transition-all"
          >
            See the Work
          </Link>
        </div>

        {/* Scripture: the verse that names the brand. */}
        <div className="opacity-0 animate-fade-in-up-delay-3 max-w-2xl mx-auto">
          <div className="relative px-7 py-7 md:px-10 md:py-8 rounded-2xl border border-gold-light/25 bg-midnight-700/40 backdrop-blur-md">
            <span className="text-[9px] uppercase tracking-[0.5em] text-gold-light/85 font-mono font-bold block mb-4">
              Matthew 17:20
            </span>
            <p className="font-serif text-lg md:text-2xl italic text-cream-50 leading-relaxed tracking-tight">
              &ldquo;If you have faith as small as a{' '}
              <span className="text-gradient-brass not-italic font-medium">mustard seed</span>
              ,&hellip;&nbsp;nothing will be impossible for you.&rdquo;
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-pulse-slow opacity-50">
        <span className="text-[8px] uppercase tracking-[0.3em] text-cream-100/50 font-mono">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-cream-100/40 to-transparent" />
      </div>
    </section>
  );
}
