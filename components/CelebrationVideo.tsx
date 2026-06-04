import Link from 'next/link';

/**
 * CelebrationVideo. The closing moment of the homepage. A bold ink comic panel
 * with a partnership message and a CTA to the build queue.
 */
export default function CelebrationVideo() {
  return (
    <section className="relative isolate w-full flex flex-col items-center justify-center overflow-hidden px-6 py-28 md:py-36 text-center bg-[#161616] border-y-4 border-[#161616]">
      {/* Halftone + warm glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(245,183,0,0.16) 1.4px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 85%, rgba(245,183,0,0.22) 0%, transparent 55%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto">
        <span className="text-[10px] uppercase tracking-[0.5em] text-[#F5B700] font-mono font-bold mb-7 block">
          The era of the entrepreneur
        </span>

        <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-[-0.01em] leading-[1.02] text-[#FBF6EA] mb-8">
          You finally have a{' '}
          <span className="text-[#F5B700] italic" style={{ WebkitTextStroke: '2px #FBF6EA' }}>
            partner
          </span>
        </h2>

        <p className="font-display italic font-bold text-2xl md:text-3xl text-[#FBF6EA]/95 leading-snug mb-6 max-w-2xl mx-auto">
          One who can build with you what you have been carrying alone.
        </p>

        <p className="text-[#FBF6EA]/80 text-base md:text-lg font-body leading-relaxed mb-12 max-w-2xl mx-auto">
          Your dream does not need to wait for a co-founder, a hire, or a perfect time. It needs a partner who can ship. Now booking new builds. Yours, fully, when we are done.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
      </div>
    </section>
  );
}
