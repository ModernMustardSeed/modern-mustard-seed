import Link from 'next/link';

export default function HeroIdeaToProduct() {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 pt-36 md:pt-44 text-center">
      <div className="mb-6 opacity-0 animate-fade-in-up">
        <span className="text-[10px] tracking-[0.5em] uppercase text-mustard-500/60 font-mono font-bold block mb-8">
          Modern Mustard Seed
        </span>

        <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-5xl mx-auto">
          <span className="text-white">Your idea does not need more validation.</span>
          <br />
          <span className="text-gradient-mustard">It needs a shipped product.</span>
        </h1>
      </div>

      <div className="w-24 h-px bg-gradient-to-r from-transparent via-mustard-500/40 to-transparent my-8 opacity-0 animate-fade-in-up-delay" />

      <p className="text-white/65 text-base md:text-xl font-body font-light tracking-wide max-w-2xl mx-auto leading-relaxed mb-10 opacity-0 animate-fade-in-up-delay">
        Idea to shipped product in 30 days. Fixed scope. Fixed timeline. Four builds per quarter. Waitlist only.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-14 opacity-0 animate-fade-in-up-delay-2">
        <Link
          href="/build-queue"
          className="px-9 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_40px_rgba(200,164,21,0.3)] transition-all duration-300"
        >
          Join the Build Queue
        </Link>
        <Link
          href="/work"
          className="px-9 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/50 transition-all duration-300"
        >
          See What We&rsquo;ve Shipped
        </Link>
      </div>

      <div className="max-w-lg opacity-0 animate-fade-in-up-delay-2">
        <div className="glass-card px-6 py-4 md:px-8 md:py-5">
          <p className="text-white/55 font-body text-sm md:text-base tracking-wide leading-relaxed">
            <span className="text-mustard-500/70 font-mono text-[10px] uppercase tracking-[0.3em] block mb-2">
              Stewardship over extraction
            </span>
            Built by a faith-driven operator who treats your business like it has to last. Matthew 17:20.
          </p>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse-slow">
        <span className="text-[8px] uppercase tracking-[0.3em] text-white/15 font-mono">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  );
}
