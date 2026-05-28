import Link from 'next/link';

export default function BuiltByGoodPeople() {
  return (
    <section className="relative w-full px-6 md:px-16 lg:px-24 xl:px-32 py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none">
        <div className="w-px h-20 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto text-center relative">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-7 block">
          Why we build
        </span>

        <h2 className="font-sans text-3xl md:text-5xl font-semibold text-white tracking-tight leading-[1.15] mb-8">
          Good people in tech, <br className="hidden md:block" />
          building <span className="text-gradient-mustard">beautiful things</span>
        </h2>

        <p className="text-white/70 text-base md:text-lg font-body font-light leading-relaxed mb-5">
          We are a small studio that treats your business like a calling, not a contract. Faith-driven. Stewardship-minded. Honest with our quotes and honest with our timelines.
        </p>

        <p className="text-white/55 text-base md:text-lg font-body font-light leading-relaxed mb-12">
          And you do not need to know a single thing about AI. That is literally why you hire us. We translate, we build, you ship. The good stuff stays simple.
        </p>

        <div className="flex justify-center mb-8">
          <div className="h-px w-20 bg-mustard-500/40" />
        </div>

        <p className="font-serif italic text-mustard-200/55 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-3">
          &ldquo;Whatever you do, work at it with all your heart, as working for the Lord.&rdquo;
        </p>
        <cite className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/50 font-mono font-bold not-italic block mb-12">
          Colossians 3:23
        </cite>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/about"
            className="px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/50 transition-all"
          >
            Read our story
          </Link>
          <Link
            href="/work-with-us"
            className="px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white/55 hover:text-white transition-all"
          >
            See how we work →
          </Link>
        </div>
      </div>
    </section>
  );
}
