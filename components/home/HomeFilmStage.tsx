import HeroVideo from '@/components/HeroVideo';

/**
 * The main stage. The "Let's build the tree" brand film gets top billing
 * right after the hero, on a warm halftone band with a soft spotlight, so
 * a first-time visitor feels the studio before they scroll past it. The film
 * lived buried in TheClose before; this is its featured slot. HeroVideo keeps
 * its own autoplay-muted + sound toggle + view tracking.
 */
export default function HomeFilmStage() {
  return (
    <section className="relative halftone-bg border-b-2 border-[#161616] overflow-hidden">
      {/* Soft stage spotlight behind the film */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 42%, rgba(245,183,0,0.18) 0%, transparent 60%)' }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
        <span className="font-mono font-bold text-[10px] uppercase tracking-[0.4em] text-[#E0301E] block">
          Now showing // The 24-second version
        </span>
        <h2 className="font-display font-black tracking-tight leading-[1.02] text-[#161616] mt-4 text-[clamp(2.25rem,6vw,4rem)]">
          Watch a seed become a{' '}
          <span className="italic text-[#8f6600]">business.</span>
        </h2>
        <p className="font-body text-base md:text-lg text-[#161616]/70 leading-relaxed mt-4 max-w-2xl mx-auto">
          One desk, your idea, and a few weeks. This is how it grows.
        </p>

        <div className="mt-9 md:mt-12">
          <HeroVideo />
        </div>
      </div>
    </section>
  );
}
