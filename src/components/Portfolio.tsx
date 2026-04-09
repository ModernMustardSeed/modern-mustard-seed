const projects = [
  {
    title: 'Make Me Studio',
    subtitle: 'AI creative studio for video, image & asset generation',
    tags: ['Next.js', 'Gemini', 'Stripe'],
    href: 'https://source-zip.vercel.app',
    color: 'from-amber-900/40 to-amber-800/20',
  },
  {
    title: 'Cross + Covenant',
    subtitle: 'Headless e-commerce with WebGL particles & print-on-demand',
    tags: ['Shopify', 'WebGL', 'Printify'],
    href: 'https://cross-covenant.vercel.app',
    color: 'from-emerald-900/40 to-emerald-800/20',
  },
  {
    title: 'Olive Shoot',
    subtitle: 'Agentic OS for solopreneurs. tRPC, real-time, AI-native',
    tags: ['Next.js 16', 'tRPC', 'Zustand'],
    href: 'https://olive-shoot.vercel.app',
    color: 'from-blue-900/40 to-blue-800/20',
  },
  {
    title: 'Ignition',
    subtitle: 'Multi-agent idea-to-income swarm. Coordinated AI collaboration',
    tags: ['Multi-Agent', 'Claude', 'Gemini'],
    href: 'https://ignition-sarah-7990s-projects.vercel.app',
    color: 'from-emerald-900/40 to-emerald-800/20',
  },
  {
    title: 'Alive Notes',
    subtitle: 'An OS for human intention. Mobile-first, beautifully crafted',
    tags: ['Expo', 'React Native', 'Zustand'],
    href: 'https://alive-notes-landing.vercel.app',
    color: 'from-indigo-900/40 to-indigo-800/20',
  },
  {
    title: 'Kingdom Lab',
    subtitle: 'AI experimentation playground. Prototypes & showcases',
    tags: ['Next.js', 'AI APIs', 'Vercel'],
    href: 'https://kingdom-lab.vercel.app',
    color: 'from-amber-900/40 to-amber-800/20',
  },
  {
    title: 'Luxe Design',
    subtitle: 'AI interior design & virtual staging for real estate pros',
    tags: ['Replicate', 'Stripe', 'Supabase'],
    href: 'https://luxedesign-five.vercel.app',
    color: 'from-rose-900/40 to-rose-800/20',
  },
  {
    title: 'AdForge Studio',
    subtitle: 'AI-powered ad creative generation & campaign design',
    tags: ['AI', 'Creative', 'Studio'],
    href: 'https://adforge-studio.vercel.app',
    color: 'from-emerald-900/40 to-emerald-800/20',
  },
  {
    title: 'The Claw Concierge',
    subtitle: 'Premium setup service. Three tiers from $697 to $15K+',
    tags: ['Brand', 'Service', 'Community'],
    href: 'https://theclawconcierge.com',
    color: 'from-amber-900/40 to-amber-800/20',
  },
  {
    title: 'Upskill Academy',
    subtitle: 'AI workforce development. 25 courses, WIOA-eligible',
    tags: ['React', 'Zustand', 'Education'],
    href: 'https://modern-mustard-seed-academy.vercel.app',
    color: 'from-indigo-900/40 to-indigo-800/20',
  },
  {
    title: 'What Next',
    subtitle: 'AI decision intelligence. Scenario modeling & outcome prediction',
    tags: ['AI', 'Supabase', 'TypeScript'],
    href: 'https://what-next-ruddy.vercel.app',
    color: 'from-rose-900/40 to-rose-800/20',
  },
  {
    title: 'Wild Things',
    subtitle: 'Personal portfolio. VHS aesthetic, scroll-driven storytelling',
    tags: ['Next.js', 'Framer Motion', 'WebGL'],
    href: 'https://wild-things-pi.vercel.app',
    color: 'from-amber-900/40 to-amber-800/20',
  },
];

const Portfolio: React.FC = () => {
  return (
    <section id="portfolio" className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40">
      {/* Divider */}
      <div className="flex justify-center mb-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between max-w-6xl mx-auto mb-16">
        <div>
          <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
            The Collection
          </span>
          <h2 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Ideas Brought to <span className="text-gradient-mustard">Life</span>
          </h2>
        </div>
        <span className="hidden md:block text-[10px] uppercase tracking-[0.3em] text-white/20 font-mono font-bold mt-4 md:mt-0">
          {projects.length} of 40+ Products
        </span>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {projects.map((project, i) => (
          <a
            key={project.title}
            href={project.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-end aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.04] hover:border-mustard-500/20 transition-all duration-500"
          >
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${project.color} group-hover:opacity-80 transition-opacity duration-500`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Number badge */}
            <div className="absolute top-4 right-4">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/15 font-mono">
                No. {String(i + 1).padStart(2, '0')}
              </span>
            </div>

            {/* Content */}
            <div className="relative z-10 p-5 md:p-6">
              <h3 className="font-sans text-lg font-bold text-white group-hover:text-mustard-100 tracking-wide mb-1.5 transition-colors duration-500">
                {project.title}
              </h3>
              <p className="text-white/40 text-xs font-body font-light leading-relaxed mb-4 group-hover:text-white/55 transition-colors duration-500">
                {project.subtitle}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="skill-pill border-white/[0.08] text-white/30 text-[8px] group-hover:border-mustard-500/20 group-hover:text-mustard-400/60 transition-all duration-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Arrow */}
              <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                <span className="text-[10px] uppercase tracking-[0.2em] text-mustard-400 font-sans font-bold">
                  View Live
                </span>
                <svg className="w-3.5 h-3.5 text-mustard-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Extra projects mention */}
      <p className="text-center text-white/20 mt-12 text-sm font-body font-light italic max-w-2xl mx-auto">
        Plus: CXC Design Studio, Glacier Landing, Good Company, AI Deal Analyzer,
        PTG Deal Assistant, Wild Hope Ranch & Homes, Miracle Witness Network, D&D Landscaping, Roar Coffee, and more.
      </p>

      {/* Gallery CTA */}
      <div className="flex justify-center mt-10">
        <a
          href="https://wild-things-pi.vercel.app/gallery"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-3 border border-mustard-500/20 hover:border-mustard-500/40 px-8 py-4 rounded-full transition-all duration-500 hover:bg-mustard-500/5"
        >
          <span className="text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white/40 group-hover:text-mustard-400 transition-colors">
            View the Full Archive
          </span>
          <svg className="w-4 h-4 text-mustard-400/40 group-hover:text-mustard-400 group-hover:translate-x-1 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </section>
  );
};

export default Portfolio;
