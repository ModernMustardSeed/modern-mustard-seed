const services = [
  {
    icon: '🎙️',
    title: 'Voice Agents',
    description: 'Enterprise-grade voice AI that handles real phone conversations. Demo calls, appointment booking, customer service, and lead qualification — 24/7.',
    outcomes: ['24/7 phone coverage', 'Appointment booking', 'Lead qualification'],
  },
  {
    icon: '🏗️',
    title: 'Full-Stack Development',
    description: 'Production-grade web applications from concept to deployment. React, Next.js, databases, APIs, authentication, payments — the full stack.',
    outcomes: ['Production apps', 'API architecture', 'Database design'],
  },
  {
    icon: '🎯',
    title: 'Brand & Strategy',
    description: 'Brand DNA extraction, content strategy, and go-to-market execution. Building identities that resonate and strategies that convert.',
    outcomes: ['Brand identity', 'Content strategy', 'Go-to-market'],
  },
];

const secondaryCapabilities = [
  'AI-Powered Products',
  'Business Automation',
  'Creative & Generative Tech',
];

const Services: React.FC = () => {
  return (
    <section id="services" className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40">
      {/* Divider */}
      <div className="flex justify-center mb-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-20">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
          What We Build
        </span>
        <h2 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
          <span className="text-gradient-mustard">Creativity</span> x{' '}
          <span className="text-white/80">Strategy</span> x{' '}
          <span className="text-gradient-mustard">Faith</span>
        </h2>
        <p className="text-white/50 text-base md:text-lg font-body font-light leading-relaxed">
          Every engagement is a seed planted — built with excellence, shipped with conviction,
          and designed to grow beyond what anyone expected.
        </p>
      </div>

      {/* Primary Service Grid — 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.03] rounded-2xl overflow-hidden mb-12">
        {services.map((service) => (
          <div
            key={service.title}
            className="group p-8 md:p-10 bg-neutral-950/60 hover:bg-neutral-950/40 transition-all duration-500 relative overflow-hidden"
          >
            {/* Hover glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 rounded-full blur-[80px] bg-mustard-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="relative z-10">
              {/* Icon */}
              <div className="text-3xl mb-6">{service.icon}</div>

              {/* Title */}
              <h3 className="font-sans text-lg font-bold text-white/90 group-hover:text-white tracking-wide mb-4 transition-colors">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-white/50 text-sm md:text-base font-body font-light leading-7 mb-6">
                {service.description}
              </p>

              {/* Outcomes */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono block mb-2">Key Outcomes</span>
                {service.outcomes.map((outcome) => (
                  <div key={outcome} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-mustard-500/50 group-hover:bg-mustard-500/80 transition-colors" />
                    <span className="text-xs text-white/50 group-hover:text-mustard-300/70 font-mono tracking-wide transition-colors">
                      {outcome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Capabilities */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold mr-1">Also:</span>
        {secondaryCapabilities.map((cap, i) => (
          <span key={cap} className="flex items-center gap-3">
            <span className="skill-pill text-white/50 border-white/[0.08] hover:text-mustard-400/80 hover:border-mustard-500/30">
              {cap}
            </span>
            {i < secondaryCapabilities.length - 1 && (
              <span className="text-white/15 text-xs hidden sm:inline">·</span>
            )}
          </span>
        ))}
      </div>
    </section>
  );
};

export default Services;
