const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 md:pt-6 text-center">
      {/* Eyebrow */}
      <div className="mb-6 opacity-0 animate-fade-in-up">
        <span className="text-[10px] tracking-[0.5em] uppercase text-mustard-500/60 font-mono font-bold block mb-6">
          Where Faith Meets Innovation
        </span>

        {/* Brand Name */}
        <h1 className="font-sans text-4xl md:text-7xl lg:text-8xl font-extrabold tracking-tight uppercase leading-[0.95]">
          <span className="text-gradient-mustard">Modern</span>
          <br />
          <span className="text-gradient-mustard">Mustard</span>
          <br />
          <span className="text-liquid-metal text-5xl md:text-8xl lg:text-9xl font-black tracking-wider drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">Seed</span>
        </h1>
      </div>

      {/* Divider */}
      <div className="w-24 h-px bg-gradient-to-r from-transparent via-mustard-500/40 to-transparent mb-6 opacity-0 animate-fade-in-up-delay" />

      {/* Tagline */}
      <p className="text-white/60 text-base md:text-lg font-body font-light tracking-wider max-w-xl mx-auto leading-relaxed mb-4 opacity-0 animate-fade-in-up-delay">
        God-sized vision. Relentless execution.
      </p>

      {/* Value-first description */}
      <p className="text-white/45 text-sm md:text-base font-body font-light tracking-wider max-w-xl mx-auto leading-relaxed mb-10 opacity-0 animate-fade-in-up-delay">
        We build voice agents, production apps, and brand systems that grow businesses — powered by AI, grounded in faith.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 mb-14 opacity-0 animate-fade-in-up-delay-2">
        <a
          href="#demo"
          className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(200,164,21,0.2)] transition-all duration-300"
        >
          Try a Live Demo
        </a>
        <a
          href="#services"
          className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/50 transition-all duration-300"
        >
          Explore Services
        </a>
      </div>

      {/* Scripture — moved below CTAs, subtler */}
      <div className="max-w-lg opacity-0 animate-fade-in-up-delay-2">
        <div className="glass-card px-6 py-5 md:px-8 md:py-6">
          <span className="text-[9px] md:text-[10px] text-mustard-500/70 font-bold tracking-[0.4em] uppercase font-mono drop-shadow-[0_0_6px_rgba(200,164,21,0.3)] block mb-2">
            Matthew 17:20
          </span>
          <p className="text-white/60 font-sans font-semibold text-sm md:text-base tracking-wide leading-relaxed">
            "If you have faith as small as a mustard seed… <span className="text-gradient-mustard">Nothing will be impossible for you.</span>"
          </p>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse-slow">
        <span className="text-[8px] uppercase tracking-[0.3em] text-white/15 font-mono">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  );
};

export default Hero;
