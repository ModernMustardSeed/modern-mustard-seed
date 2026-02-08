const posts = [
  {
    date: 'Feb 2026',
    tag: 'Voice AI',
    title: 'Why Every Small Business Needs a Voice Agent in 2026',
    excerpt: 'Your competitors are hiring AI receptionists that never sleep. Here\'s how voice agents are changing the game for small businesses — and why waiting is costing you leads.',
    readTime: '4 min read',
  },
  {
    date: 'Feb 2026',
    tag: 'Product',
    title: 'From Idea to Production App in 30 Days',
    excerpt: 'How we took VoiceStaff from concept to handling thousands of live calls — the stack, the process, and the lessons learned shipping fast with AI.',
    readTime: '6 min read',
  },
  {
    date: 'Jan 2026',
    tag: 'Strategy',
    title: 'The AI-First Agency Model',
    excerpt: 'Traditional agencies charge $10K/month and move slow. We built a model where AI handles 80% of the execution, so clients get better results at a fraction of the cost.',
    readTime: '5 min read',
  },
];

const Insights: React.FC = () => {
  return (
    <section id="insights" className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40">
      {/* Divider */}
      <div className="flex justify-center mb-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
          Insights
        </span>
        <h2 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
          Thinking Out <span className="text-gradient-mustard">Loud</span>
        </h2>
        <p className="text-white/50 text-base md:text-lg font-body font-light leading-relaxed">
          Lessons from the frontlines of building AI products, voice agents, and businesses that move fast.
        </p>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {posts.map((post) => (
          <article
            key={post.title}
            className="group glass-card p-6 md:p-8 hover:border-mustard-500/20 transition-all duration-500 cursor-pointer"
          >
            {/* Meta */}
            <div className="flex items-center gap-3 mb-4">
              <span className="skill-pill text-mustard-400/70 border-mustard-500/20 text-[8px]">
                {post.tag}
              </span>
              <span className="text-[10px] text-white/25 font-mono">{post.date}</span>
            </div>

            {/* Title */}
            <h3 className="font-sans text-base md:text-lg font-bold text-white/85 group-hover:text-white tracking-wide mb-3 leading-snug transition-colors">
              {post.title}
            </h3>

            {/* Excerpt */}
            <p className="text-white/40 text-sm font-body font-light leading-6 mb-4">
              {post.excerpt}
            </p>

            {/* Read time */}
            <span className="text-[9px] uppercase tracking-[0.2em] text-mustard-500/40 font-mono font-bold group-hover:text-mustard-500/70 transition-colors">
              {post.readTime}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Insights;
