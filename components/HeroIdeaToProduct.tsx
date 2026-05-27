import Link from 'next/link';
import MagneticLink from './MagneticLink';

export default function HeroIdeaToProduct() {
  return (
    <section className="relative isolate min-h-[92vh] flex flex-col items-center justify-center px-6 pt-36 md:pt-44 pb-24 text-center overflow-hidden">
      {/* Layer 1: Cinematic video background with slow Ken Burns drift */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0 animate-ken-burns motion-reduce-hide"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        poster="/opengraph-image"
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      {/* Layer 2: Slight base tint so the video reads as part of the brand, not a foreign asset */}
      <div
        className="absolute inset-0 z-[1] bg-[#0a0804]/40 mix-blend-multiply pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 3: Brand gold wash, scarce and luxurious */}
      <div
        className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_top_right,rgba(255,224,130,0.10)_0%,transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(200,164,21,0.08)_0%,transparent_50%)] mix-blend-screen pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 4: Radial vignette focuses the eye on the headline */}
      <div
        className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_28%,rgba(10,8,4,0.72)_85%,rgba(10,8,4,0.92)_100%)] pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 5: Bottom fade carries the eye into the next section */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 z-[1] bg-gradient-to-b from-transparent via-[#0a0804]/70 to-[#0a0804] pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 6: Cinematic film grain. Taste-obsessed, never busy. */}
      <div className="absolute inset-0 z-[2] film-grain pointer-events-none" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Live status pill. Quiet urgency, no friction. */}
        <div className="opacity-0 animate-fade-in-up inline-flex items-center gap-2.5 px-4 py-1.5 mb-10 rounded-full border border-mustard-500/30 bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(200,164,21,0.08)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mustard-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mustard-400" />
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/85 font-mono font-medium">
            Now booking
          </span>
          <span className="w-px h-3 bg-white/15" aria-hidden="true" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-mustard-300/80 font-mono font-medium">
            2 slots left this quarter
          </span>
        </div>

        <span className="opacity-0 animate-fade-in-up text-[10px] tracking-[0.4em] uppercase text-mustard-500/70 font-mono font-medium block mb-10">
          Modern Mustard Seed
        </span>

        <h1 className="opacity-0 animate-fade-in-up font-sans text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.6)]">
          We build <span className="text-gradient-mustard">apps, sites,</span> and{' '}
          <span className="text-gradient-mustard">specialty AI tools</span> for your business.
        </h1>

        {/* Hairline divider with shimmer */}
        <div className="relative mt-10 mb-8 mx-auto h-px w-24 opacity-0 animate-fade-in-up-delay">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-mustard-500/50 to-transparent" />
          <div className="shimmer-line absolute inset-0" />
        </div>

        <p className="opacity-0 animate-fade-in-up-delay text-white/75 text-base md:text-lg font-body font-light tracking-normal max-w-2xl mx-auto leading-relaxed mb-3 drop-shadow-[0_1px_12px_rgba(0,0,0,0.5)]">
          From your first website to your custom AI tool. Shipped in 30 days, four builds per quarter.
        </p>
        <p className="opacity-0 animate-fade-in-up-delay-2 text-mustard-200/80 text-sm md:text-base font-body font-medium tracking-normal max-w-2xl mx-auto leading-relaxed mb-12 drop-shadow-[0_1px_12px_rgba(0,0,0,0.5)]">
          You do not need to know a single thing about AI. That is literally why you hire us.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center opacity-0 animate-fade-in-up-delay-3">
          <MagneticLink
            href="/build-queue"
            className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full shadow-[0_0_40px_rgba(200,164,21,0.25)] hover:shadow-[0_0_50px_rgba(200,164,21,0.45)]"
          >
            Join the Build Queue
          </MagneticLink>
          <Link
            href="/work"
            className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/40 rounded-full bg-black/20 backdrop-blur-sm hover:bg-mustard-500/10 hover:border-mustard-500/60 transition-all"
          >
            See the Work
          </Link>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-pulse-slow opacity-60">
        <span className="text-[8px] uppercase tracking-[0.3em] text-white/40 font-mono">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </section>
  );
}
