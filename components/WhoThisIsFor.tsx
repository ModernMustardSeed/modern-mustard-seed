const archetypes = [
  {
    eyebrow: 'Second-business operators',
    title: 'Operators launching a second business.',
    description:
      'Realtors, doctors, contractors, consultants. People who already built one thing well and are ready to build another without burning the first one down.',
    outcome: 'Your second business ships before the first one’s quarterly review.',
  },
  {
    eyebrow: 'Service businesses going AI-native',
    title: 'Trades and service businesses going AI-native.',
    description:
      'Existing operators who see the AI shift coming and want to own their stack before someone else automates the industry from underneath them.',
    outcome: 'You become the AI-native version of your industry, not the casualty.',
  },
  {
    eyebrow: 'Capitalized founders with urgency',
    title: 'Founders who already have the capital and the idea.',
    description:
      'You have the vision, the savings, and no patience for a six-month founder runway. You want the product live, the brand on the wall, and the first revenue counted this quarter.',
    outcome: 'From idea to revenue in the time most founders spend choosing a name.',
  },
];

export default function WhoThisIsFor() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-24 md:py-32">
      <div className="flex justify-center mb-16">
        <div className="w-px h-20 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
          Who this is for
        </span>
        <h2 className="font-sans text-4xl md:text-5xl font-semibold text-white tracking-tight mb-5">
          Three Kinds of <span className="text-gradient-mustard">Builders</span>
        </h2>
        <p className="text-white/55 text-base md:text-lg font-body font-light leading-relaxed">
          One offer. Three buyers. If you see yourself here, you are in the right place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {archetypes.map((a) => (
          <article
            key={a.title}
            className="glass-card p-8 md:p-10 flex flex-col hover:border-mustard-500/20 transition-all duration-500"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold mb-5">
              {a.eyebrow}
            </span>
            <h3 className="font-sans text-xl md:text-2xl font-bold text-white tracking-tight mb-4 leading-snug">
              {a.title}
            </h3>
            <p className="text-white/50 text-sm md:text-base font-body font-light leading-7 mb-6 flex-1">
              {a.description}
            </p>
            <p className="text-mustard-300/80 text-sm font-body italic leading-relaxed pt-5 border-t border-white/[0.05]">
              {a.outcome}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
