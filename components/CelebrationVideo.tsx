import Link from 'next/link';

/**
 * CelebrationVideo. The closing moment of the homepage. Cinematic backdrop
 * with a partnership message and a CTA to the build queue. No peak/light
 * language. About finding a partner to bring your dream to fullness.
 */
export default function CelebrationVideo() {
  return (
    <section className="relative isolate w-full min-h-[80vh] flex flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      {/* Deep sky plate */}
      <div className="absolute inset-0 z-0 bg-[#080c16]" aria-hidden="true" />

      {/* Cinematic backdrop */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0 motion-reduce-hide"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        style={{ backgroundColor: '#080c16' }}
      >
        <source src="/video/celebration.mp4" type="video/mp4" />
      </video>

      {/* Dark sky wash so the copy reads */}
      <div
        className="absolute inset-0 z-[1] bg-[#080c16]/55 mix-blend-multiply pointer-events-none"
        aria-hidden="true"
      />

      {/* Sky glow + warm horizon kiss */}
      <div
        className="absolute inset-0 z-[1] mix-blend-screen pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at 50% 90%, rgba(200,150,78,0.22) 0%, transparent 55%), radial-gradient(ellipse at top, rgba(143,192,239,0.22) 0%, transparent 50%)',
        }}
      />

      {/* Top and bottom fade to midnight */}
      <div className="absolute inset-x-0 top-0 h-1/4 z-[2] bg-gradient-to-b from-[#080c16] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 z-[2] bg-gradient-to-t from-[#080c16] to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto">
        <span className="text-[10px] uppercase tracking-[0.5em] text-gold-light/85 font-mono font-medium mb-7 block">
          The era of the entrepreneur
        </span>

        <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-0.01em] leading-[1.02] text-cream-50 mb-8 drop-shadow-[0_2px_30px_rgba(8,12,22,0.7)]">
          You finally have a{' '}
          <span className="text-gradient-brass italic">partner</span>
        </h2>

        <p className="font-display italic text-2xl md:text-3xl font-light text-cream-100/95 leading-snug mb-6 max-w-2xl mx-auto drop-shadow-[0_2px_18px_rgba(8,12,22,0.65)]">
          One who can build with you what you have been carrying alone.
        </p>

        <p className="text-cream-100/85 text-base md:text-lg font-body font-light leading-relaxed mb-12 max-w-2xl mx-auto drop-shadow-[0_1px_12px_rgba(8,12,22,0.55)]">
          Your dream does not need to wait for a co-founder, a hire, or a perfect time. It needs a partner who can ship. Four builds a quarter, by design. Yours, fully, when we are done.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/build-queue"
            className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_55px_rgba(255,107,53,0.55),0_0_28px_rgba(232,200,138,0.4)] transition-all"
          >
            Join the Build Queue
          </Link>
          <Link
            href="/audit"
            className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-100 border border-cream-100/35 rounded-full bg-midnight-700/30 backdrop-blur-sm hover:bg-midnight-700/55 hover:border-cream-100/65 transition-all"
          >
            Run the Free AI Audit
          </Link>
        </div>
      </div>
    </section>
  );
}
