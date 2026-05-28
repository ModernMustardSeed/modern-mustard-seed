import Link from 'next/link';
import MagneticLink from './MagneticLink';

export default function HeroIdeaToProduct() {
  return (
    <section className="relative isolate min-h-[92vh] flex flex-col items-center justify-center px-6 pt-36 md:pt-44 pb-24 text-center overflow-hidden">
      {/* Layer 0: Aubergine plate behind the video so first paint is on-brand,
          not the browser's default black. Eliminates the load flash. */}
      <div className="absolute inset-0 z-0 bg-[#1A1140]" aria-hidden="true" />

      {/* Layer 1: Cinematic video background with slow Ken Burns drift.
          No poster: a static frame with its own text was flashing and
          competing with the hero copy on first paint. */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0 animate-ken-burns motion-reduce-hide"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{ backgroundColor: '#1A1140' }}
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      {/* Layer 2: Aubergine base tint so the video carries brand color */}
      <div
        className="absolute inset-0 z-[1] bg-[#1A1140]/55 mix-blend-multiply pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 3: Dawn sky color wash. Three-stop cool palette. */}
      <div
        className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_top_right,rgba(78,205,196,0.18)_0%,transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(79,146,216,0.18)_0%,transparent_50%),radial-gradient(ellipse_at_top_left,rgba(111,172,231,0.12)_0%,transparent_55%)] mix-blend-screen pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 4: Center vignette focuses the eye */}
      <div
        className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_28%,rgba(14,8,36,0.72)_85%,rgba(14,8,36,0.92)_100%)] pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 5: Bottom fade into next section */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 z-[1] bg-gradient-to-b from-transparent via-[#1A1140]/70 to-[#1A1140] pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 6: Cinematic film grain */}
      <div className="absolute inset-0 z-[2] film-grain pointer-events-none" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Live status pill with quiet urgency */}
        <div className="opacity-0 animate-fade-in-up inline-flex items-center gap-2.5 px-4 py-1.5 mb-10 rounded-full border border-sky-400/45 bg-night-900/40 backdrop-blur-md shadow-[0_0_30px_rgba(78,205,196,0.12)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sunrise-cyan opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sunrise-cyan" />
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/90 font-mono font-medium">
            Now booking
          </span>
          <span className="w-px h-3 bg-white/20" aria-hidden="true" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-sunrise-cyan font-mono font-medium">
            2 slots left this quarter
          </span>
        </div>

        <span className="opacity-0 animate-fade-in-up text-[10px] tracking-[0.4em] uppercase text-white/70 font-mono font-medium block mb-10">
          Modern Mustard Seed
        </span>

        <h1 className="opacity-0 animate-fade-in-up font-display text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-0.01em] leading-[1.02] text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.6)]">
          The moment light hits the{' '}
          <span className="text-gradient-sunrise italic">peak</span>.
        </h1>
        <p className="opacity-0 animate-fade-in-up-delay font-display text-2xl md:text-3xl lg:text-4xl font-light tracking-tight leading-[1.15] text-white/90 max-w-3xl mx-auto mt-6 drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
          We build <span className="text-gradient-sunrise">apps, sites,</span> and{' '}
          <span className="text-gradient-sunrise">specialty AI tools</span> for your business.
        </p>

        {/* Hairline divider with shimmer */}
        <div className="relative mt-10 mb-8 mx-auto h-px w-24 opacity-0 animate-fade-in-up-delay">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400/65 to-transparent" />
          <div className="shimmer-line absolute inset-0" />
        </div>

        <p className="opacity-0 animate-fade-in-up-delay text-white/80 text-base md:text-lg font-body font-light tracking-normal max-w-2xl mx-auto leading-relaxed mb-3 drop-shadow-[0_1px_12px_rgba(0,0,0,0.5)]">
          From your first website to your custom AI tool. Shipped in 30 days, four builds per quarter.
        </p>
        <p className="opacity-0 animate-fade-in-up-delay-2 text-cloud-100/95 text-sm md:text-base font-body font-medium tracking-normal max-w-2xl mx-auto leading-relaxed mb-12 drop-shadow-[0_1px_12px_rgba(0,0,0,0.5)]">
          You do not need to know a single thing about AI. That is literally why you hire us.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center opacity-0 animate-fade-in-up-delay-3">
          <MagneticLink
            href="/build-queue"
            className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-sunrise-warm rounded-full shadow-[0_0_40px_rgba(78,205,196,0.4)] hover:shadow-[0_0_50px_rgba(78,205,196,0.55)]"
          >
            Join the Build Queue
          </MagneticLink>
          <Link
            href="/work"
            className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white border border-white/30 rounded-full bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/50 transition-all"
          >
            See the Work
          </Link>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-pulse-slow opacity-60">
        <span className="text-[8px] uppercase tracking-[0.3em] text-white/50 font-mono">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent" />
      </div>
    </section>
  );
}
