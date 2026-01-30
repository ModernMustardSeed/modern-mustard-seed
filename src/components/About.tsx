const disciplines = [
  { name: 'AI Engineering', detail: 'LLMs, Agents, NLP, Computer Vision' },
  { name: 'Full-Stack Architecture', detail: 'React, Next.js, Node, Databases' },
  { name: 'Voice & Conversational AI', detail: 'VAPI, Telephony, NLU, Real-Time' },
  { name: 'Creative & Generative Tech', detail: 'p5.js, WebGL, Three.js, Shaders' },
  { name: 'Business Automation', detail: 'CRM, Pipelines, Workflow Orchestration' },
  { name: 'Product Design & Strategy', detail: 'UX, Brand DNA, Go-to-Market' },
];

const About: React.FC = () => {
  return (
    <section id="about" className="w-full max-w-7xl mx-auto px-6 md:px-12 py-28 md:py-40">
      {/* Divider */}
      <div className="flex justify-center mb-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      {/* Opening Statement */}
      <div className="text-center max-w-4xl mx-auto mb-24 md:mb-32">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-8 block">
          The Builder
        </span>
        <h2 className="font-serif italic text-4xl md:text-6xl lg:text-7xl text-white leading-[1.15] mb-10">
          I plant seeds.{' '}
          <br className="hidden md:block" />
          God gives the <span className="text-gradient-mustard">increase</span> — and I{' '}
          <span className="text-gradient-mustard">ship it</span>.
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-mustard-500/40 to-transparent mx-auto" />
      </div>

      {/* Two-Column Story */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20 mb-28 md:mb-36">
        {/* Left Column — The Story */}
        <div className="lg:col-span-7 space-y-8">
          <p className="text-neutral-200 text-lg md:text-xl leading-9 font-body font-light">
            I'm Sarah — founder of <span className="text-white font-medium">Modern Mustard Seed</span>.
            I build AI-powered products, voice agents, immersive digital experiences, and business systems
            that move at the speed of faith. Every product started the same way:
            a conviction, a blank screen, and the discipline to see it through to deployment.
          </p>

          <p className="text-neutral-400 text-base md:text-lg leading-8 font-body font-light">
            I work at the intersection of deep technical execution and creative vision. I architect
            full-stack platforms from zero, engineer AI systems that think and act autonomously,
            build voice agents that handle real phone conversations, and design experiences that stop
            people mid-scroll. From enterprise voice AI to generative art that responds to human
            presence — the range is the resume.
          </p>

          <p className="text-neutral-400 text-base md:text-lg leading-8 font-body font-light">
            What sets this work apart isn't just the technology. It's the <em className="text-mustard-300/80 not-italic font-medium">why</em>.
            Every line of code is an act of stewardship. Every shipped product is a seed planted.
            I believe the same God who created the universe also created innovation — and I'm here to
            build at that standard. Not for accolades, but for impact that outlasts the algorithm.
          </p>

          <div className="pt-6">
            <blockquote className="border-l-2 border-mustard-500/30 pl-6">
              <p className="text-mustard-200/70 font-sans font-extrabold text-lg md:text-xl leading-relaxed">
                "Whatever you do, work at it with all your heart, as working for the Lord."
              </p>
              <cite className="text-[10px] uppercase tracking-[0.3em] text-mustard-500/50 font-mono font-bold mt-3 block not-italic">
                Colossians 3:23
              </cite>
            </blockquote>
          </div>
        </div>

        {/* Right Column — Disciplines & Signal */}
        <div className="lg:col-span-5">
          <div className="sticky top-32">
            <span className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-mono font-bold mb-6 block">
              Core Disciplines
            </span>

            <div className="space-y-0">
              {disciplines.map((d, i) => (
                <div
                  key={d.name}
                  className="group py-5 border-b border-white/[0.04] hover:border-mustard-500/20 transition-colors duration-300"
                >
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-white/80 group-hover:text-white text-sm md:text-base font-sans font-semibold tracking-wide transition-colors">
                      {d.name}
                    </h4>
                    <span className="text-[9px] text-white/15 font-mono">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/25 group-hover:text-mustard-400/50 mt-1.5 font-mono tracking-wide transition-colors">
                    {d.detail}
                  </p>
                </div>
              ))}
            </div>

            {/* Signal */}
            <div className="mt-10 p-6 rounded-xl border border-white/[0.04] bg-neutral-950/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold">
                  Currently Available
                </span>
              </div>
              <p className="text-white/40 text-xs leading-5 font-body font-light">
                Open to ventures, partnerships, and projects that align with the mission.
                If you're building something meaningful — let's talk.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.03] rounded-2xl overflow-hidden">
        {[
          { value: '14+', label: 'Products Shipped', sublabel: 'Zero to deployed' },
          { value: 'AI-First', label: 'Engineering', sublabel: 'Every project' },
          { value: 'Full Stack', label: 'Execution', sublabel: 'Design to deploy' },
          { value: 'Kingdom', label: 'Driven', sublabel: 'Faith as foundation' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="text-center p-8 md:p-10 bg-neutral-950/60 backdrop-blur-sm"
          >
            <div className="text-2xl md:text-3xl font-sans font-extrabold text-gradient-mustard mb-2">
              {stat.value}
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-sans font-semibold mb-1">
              {stat.label}
            </div>
            <div className="text-[9px] text-white/20 font-mono tracking-wider">
              {stat.sublabel}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default About;
