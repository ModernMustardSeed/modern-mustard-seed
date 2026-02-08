const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Scripture */}
      <div className="mb-12 max-w-2xl animate-fade-in">
        <div className="glass-card p-8 md:p-12">
          <span className="text-[10px] md:text-xs text-mustard-500 font-bold tracking-[0.4em] uppercase font-mono drop-shadow-[0_0_8px_rgba(200,164,21,0.5)] block mb-4">
            Matthew 17:20
          </span>
          <p className="text-white font-sans font-extrabold text-lg md:text-2xl tracking-wide opacity-90 leading-relaxed">
            "If you have faith as small as a mustard seed, you can say to this mountain, 'Move from here to there,' and it will move.{' '}
            <span className="text-gradient-mustard">Nothing will be impossible for you.</span>"
          </p>
        </div>
      </div>

      {/* Logo */}
      <div className="mb-6 opacity-0 animate-fade-in-up">
        <span className="text-[10px] tracking-[0.5em] uppercase text-mustard-500/60 font-mono font-bold block mb-6">
          Where Faith Meets Innovation
        </span>
        <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight uppercase leading-[0.95]">
          <span className="text-gradient-mustard">Modern</span>
          <br />
          <span className="text-gradient-mustard">Mustard</span>
          <br />
          <span className="text-liquid-metal text-6xl md:text-8xl lg:text-9xl font-black tracking-wider drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">Seed</span>
        </h1>
      </div>

      {/* Divider */}
      <div className="w-24 h-px bg-gradient-to-r from-transparent via-mustard-500/40 to-transparent mb-6 opacity-0 animate-fade-in-up-delay" />

      {/* Tagline */}
      <p className="text-white/60 text-base md:text-lg font-body font-light tracking-wider max-w-xl mx-auto leading-relaxed mb-4 opacity-0 animate-fade-in-up-delay">
        God-sized vision. Relentless execution.
      </p>
      <p className="text-white/45 text-sm md:text-base font-body font-light tracking-wider max-w-xl mx-auto leading-relaxed mb-10 opacity-0 animate-fade-in-up-delay">
        AI-powered products, voice agents, immersive experiences, and business automation — each one built with faith, precision, and the audacity to ship what others only dream about.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in-up-delay-2">
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

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse-slow">
        <span className="text-[8px] uppercase tracking-[0.3em] text-white/15 font-mono">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  );
};

export default Hero;
