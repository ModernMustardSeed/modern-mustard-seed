import Link from 'next/link';
import MascotSeed from './MascotSeed';

export default function HeroIdeaToProduct() {
  return (
    <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-6 pt-32 md:pt-40 pb-20 text-center">
      <div className="opacity-0 animate-fade-in-up max-w-4xl mx-auto">
        <span className="text-[10px] tracking-[0.4em] uppercase text-mustard-500/70 font-mono font-medium block mb-7">
          Modern Mustard Seed
        </span>

        <div className="flex justify-center mb-7">
          <MascotSeed size={180} priority />
        </div>

        <h1 className="font-sans text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] text-white">
          We build <span className="text-gradient-mustard">apps, sites,</span> and{' '}
          <span className="text-gradient-mustard">specialty AI tools</span> for your business.
        </h1>

        <p className="text-white/60 text-base md:text-lg font-body font-light tracking-normal max-w-2xl mx-auto leading-relaxed mt-7 mb-3">
          From your first website to your custom AI tool. Shipped in 30 days, four builds per quarter.
        </p>
        <p className="text-white/45 text-sm md:text-base font-body font-light tracking-normal max-w-2xl mx-auto leading-relaxed mb-10">
          For everyone. You do not need to know much about AI to start.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center opacity-0 animate-fade-in-up-delay">
          <Link
            href="/build-queue"
            className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(200,164,21,0.25)] transition-all"
          >
            Join the Build Queue
          </Link>
          <Link
            href="/work"
            className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/50 transition-all"
          >
            See the Work
          </Link>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse-slow opacity-50">
        <span className="text-[8px] uppercase tracking-[0.3em] text-white/25 font-mono">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  );
}
