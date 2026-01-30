import { useState, useEffect, useCallback } from 'react';

interface Project {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  skills: string[];
  link: string;
  category: string;
}

const projects: Project[] = [
  {
    id: 1,
    title: "Kingdom Lab",
    subtitle: "Innovation Portfolio",
    description: "A curated portfolio of AI-powered products, immersive experiences, and business systems — each built with faith, precision, and the audacity to ship what others only dream about.",
    skills: ["React", "p5.js", "Tailwind CSS", "Vite", "Creative Coding"],
    link: "https://kingdom-lab.vercel.app",
    category: "Creative Tech",
  },
  {
    id: 2,
    title: "Ignition",
    subtitle: "Idea-to-Income Agentic Swarm",
    description: "10 AI agents orchestrated to take ideas from concept to monetization. Real-time dashboard, artifact generation, and full export — from brainstorm to business plan in minutes.",
    skills: ["Next.js", "Prisma", "Trigger.dev", "Google Gemini", "Multi-Agent Systems"],
    link: "",
    category: "AI Products",
  },
  {
    id: 3,
    title: "Make Me Studio",
    subtitle: "10K Agency in a Box",
    description: "AI-powered creative studio for content creators. Video generation, image creation, viral intelligence, and brand DNA extraction — everything a creator needs to scale.",
    skills: ["Next.js 15", "Supabase", "Stripe", "Gemini", "Veo & Imagen"],
    link: "",
    category: "AI Products",
  },
  {
    id: 4,
    title: "Looking Glass",
    subtitle: "Predictive Analytics Platform",
    description: "Intelligence platform for predictive analytics. Multi-scenario analysis, intel reports, prediction markets, and AI trading agents that see around corners.",
    skills: ["React", "Express", "Supabase", "Gemini + Claude", "Real-Time Analytics"],
    link: "",
    category: "AI Products",
  },
  {
    id: 5,
    title: "Voice Staff",
    subtitle: "Enterprise Voice Intelligence",
    description: "Enterprise-grade AI voice assistants for staffing and customer engagement. 24/7 phone coverage that listens, learns, books appointments, and qualifies leads.",
    skills: ["VAPI", "Next.js", "Telephony APIs", "NLP", "CRM Integration"],
    link: "",
    category: "Voice AI",
  },
  {
    id: 6,
    title: "The Daily Seed",
    subtitle: "Digital Devotional Platform",
    description: "A daily devotional application designed to nurture spiritual growth. Curated inspiration delivered through a serene, modern interface that meets you where you are.",
    skills: ["Mobile-First", "Content Systems", "Push Notifications", "Scripture APIs", "Personalization"],
    link: "",
    category: "Faith Tech",
  },
  {
    id: 7,
    title: "AS IF AI",
    subtitle: "AI Fashion Atelier",
    description: "Professional AI styling atelier and wardrobe curator. Inspired by the iconic closet of Cher Horowitz — reimagined for the AI era with Gemini-powered recommendations.",
    skills: ["Gemini API", "Image Generation", "Style Matching", "Fashion ML", "UX Design"],
    link: "",
    category: "AI Products",
  },
  {
    id: 8,
    title: "The Ledger",
    subtitle: "Agentic CRM & Sales",
    description: "Agentic CRM and Sales System for automated pipeline management. AI agents handle customer interactions, follow-ups, and deal progression autonomously.",
    skills: ["Multi-Agent AI", "Pipeline Automation", "Sales Analytics", "Workflow Engine", "CRM"],
    link: "",
    category: "Business Tools",
  },
];

const categories = ['All', 'AI Products', 'Voice AI', 'Creative Tech', 'Business Tools', 'Faith Tech'];

const Portfolio: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');

  const ITEMS_PER_PAGE = 2;

  const filtered = activeFilter === 'All'
    ? projects
    : projects.filter((p) => p.category === activeFilter);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentProjects = filtered.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(0);
    setIsFlipping(false);
  }, [activeFilter]);

  const flipTo = useCallback((direction: 'next' | 'prev') => {
    if (isFlipping) return;
    const target = direction === 'next' ? currentPage + 1 : currentPage - 1;
    if (target < 0 || target >= totalPages) return;
    setFlipDirection(direction);
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(target);
      setTimeout(() => setIsFlipping(false), 50);
    }, 300);
  }, [isFlipping, currentPage, totalPages]);

  const ProjectCard: React.FC<{ project: Project; className?: string }> = ({ project, className = '' }) => {
    const isLive = project.link !== '';
    const Wrapper = isLive ? 'a' : 'div';
    const wrapperProps = isLive
      ? { href: project.link, target: '_blank' as const, rel: 'noopener noreferrer' }
      : {};

    return (
      <Wrapper
        {...wrapperProps}
        className={`group relative block p-10 md:p-14 transition-all duration-500 hover:bg-white/[0.02] overflow-hidden ${
          isLive ? 'cursor-pointer' : 'cursor-default'
        } ${className}`}
      >
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full blur-[100px] bg-mustard-500/10 opacity-0 group-hover:opacity-60 transition-opacity duration-1000 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full min-h-[380px]">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[9px] uppercase tracking-[0.3em] text-mustard-500/50 font-mono font-bold">
              {project.category}
            </span>
            <div className="flex items-center gap-3">
              {!isLive && (
                <span className="text-[8px] uppercase tracking-[0.2em] text-mustard-500/40 font-mono font-bold px-2.5 py-1 rounded-full border border-mustard-500/15 bg-mustard-500/[0.04]">
                  Coming Soon
                </span>
              )}
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/15 font-mono">
                No. {String(project.id).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className={`font-serif italic text-3xl md:text-4xl transition-colors duration-500 mb-2 leading-[1.1] ${
              isLive ? 'text-white group-hover:text-mustard-100' : 'text-white/70'
            }`}>
              {project.title}
            </h3>
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/25 font-sans font-medium mt-3">
              {project.subtitle}
            </p>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-mustard-500/20 via-white/[0.06] to-transparent mb-6" />

          <p className="text-neutral-400 text-sm leading-7 mb-6 flex-grow font-body font-light">
            {project.description}
          </p>

          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {project.skills.map((skill) => (
                <span
                  key={skill}
                  className="skill-pill border-mustard-500/15 text-mustard-400/60 bg-mustard-500/[0.04] group-hover:border-mustard-500/30 group-hover:text-mustard-300/80 group-hover:bg-mustard-500/[0.08]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-white/[0.04]">
            {isLive ? (
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-mustard-400 font-sans font-bold">
                View Live
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </span>
            ) : (
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/15 font-mono">
                Deploying
              </span>
            )}
          </div>
        </div>
      </Wrapper>
    );
  };

  return (
    <section id="portfolio" className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40">
      <div className="flex justify-center mb-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
          The Portfolio
        </span>
        <h2 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
          Seeds <span className="text-gradient-mustard">Planted</span>
        </h2>
        <p className="text-white/30 text-sm font-body font-light leading-relaxed">
          Each project is a seed — built from conviction, shipped with precision, designed to grow.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-14">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-5 py-2.5 text-[10px] md:text-xs uppercase tracking-[0.2em] font-sans font-semibold rounded-full border transition-all duration-300 ${
              activeFilter === cat
                ? 'border-mustard-500/50 bg-mustard-500/10 text-mustard-400 shadow-[0_0_15px_rgba(200,164,21,0.08)]'
                : 'border-white/[0.06] bg-transparent text-white/35 hover:border-white/15 hover:text-white/55'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Magazine Spread */}
      <div>
        <div className="flex items-center justify-between mb-8 px-2">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-mono">
            Issue No. {String(currentPage + 1).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-mono">
            {currentPage + 1} / {totalPages}
          </span>
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-mono">
            {activeFilter === 'All' ? 'Full Collection' : activeFilter}
          </span>
        </div>

        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-white/[0.04] bg-neutral-950/40 backdrop-blur-sm shadow-2xl transition-all duration-500 ${
            isFlipping
              ? flipDirection === 'next'
                ? 'opacity-0 translate-x-[-40px] scale-[0.98]'
                : 'opacity-0 translate-x-[40px] scale-[0.98]'
              : 'opacity-100 translate-x-0 scale-100'
          }`}
        >
          {currentProjects.map((project, idx) => (
            <ProjectCard
              key={project.id}
              project={project}
              className={idx === 0 && currentProjects.length > 1 ? 'lg:border-r border-white/[0.04]' : ''}
            />
          ))}
        </div>

        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-6 mt-10">
          <button
            onClick={() => flipTo('prev')}
            disabled={currentPage === 0}
            className={`group flex items-center gap-2 px-6 py-3 rounded-full border transition-all duration-300 ${
              currentPage === 0
                ? 'border-white/[0.03] text-white/10 cursor-not-allowed'
                : 'border-white/10 text-white/40 hover:border-mustard-500/30 hover:text-mustard-400'
            }`}
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold">Prev</span>
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i === currentPage) return;
                  setFlipDirection(i > currentPage ? 'next' : 'prev');
                  setIsFlipping(true);
                  setTimeout(() => {
                    setCurrentPage(i);
                    setTimeout(() => setIsFlipping(false), 50);
                  }, 300);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === currentPage
                    ? 'bg-mustard-500/60 w-6'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => flipTo('next')}
            disabled={currentPage >= totalPages - 1}
            className={`group flex items-center gap-2 px-6 py-3 rounded-full border transition-all duration-300 ${
              currentPage >= totalPages - 1
                ? 'border-white/[0.03] text-white/10 cursor-not-allowed'
                : 'border-white/10 text-white/40 hover:border-mustard-500/30 hover:text-mustard-400'
            }`}
          >
            <span className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold">Next</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
