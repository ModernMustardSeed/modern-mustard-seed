import Link from 'next/link';

const PATHS = [
  {
    eyebrow: 'Path 1',
    label: 'New to online',
    body:
      'You need a real website, a way to take bookings or payments, and to show up when people search for what you do. We build the whole thing, brand to launch.',
    outcome: 'Live, paying-customer-grade site in 30 days.',
    forWho: 'Small businesses. Creators. Service pros. Anyone starting fresh.',
  },
  {
    eyebrow: 'Path 2',
    label: 'Already running',
    body:
      'Your business works. You want AI to handle the busy parts so the day stops dissolving into small jobs. We audit, we build, we hand it off.',
    outcome: 'Less inbox. More output.',
    forWho: 'Existing operators. Owners with revenue to protect.',
  },
  {
    eyebrow: 'Path 3',
    label: 'Building something new',
    body:
      'You have an app, a tool, or a product idea. We design it, build it, brand it, and ship it. End to end. You bring the vision.',
    outcome: 'Live product, real customers, 30 days.',
    forWho: 'Founders. Second-business operators. AI-curious builders.',
  },
];

export default function StartingPoints() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-20 md:py-28">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium mb-5 block">
          For everyone
        </span>
        <h2 className="font-sans text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
          Three <span className="text-gradient-mustard">ways in</span>.
        </h2>
        <p className="text-white/55 text-base font-body font-light leading-relaxed">
          You do not need to know much about AI. You do not need a technical co-founder. Pick the path that sounds like you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto mb-10">
        {PATHS.map((p) => (
          <article
            key={p.label}
            className="glass-card p-7 md:p-8 flex flex-col hover:border-mustard-500/20 transition-all duration-500"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-medium mb-4">
              {p.eyebrow}
            </span>
            <h3 className="font-sans text-xl md:text-2xl font-semibold text-white tracking-tight mb-4 leading-snug">
              {p.label}.
            </h3>
            <p className="text-white/55 text-sm md:text-base font-body font-light leading-7 mb-5 flex-1">
              {p.body}
            </p>
            <p className="text-mustard-300/80 text-sm font-body italic leading-relaxed pt-4 border-t border-white/[0.05]">
              {p.outcome}
            </p>
            <p className="text-white/35 text-xs font-body leading-relaxed mt-3">
              For: {p.forWho}
            </p>
          </article>
        ))}
      </div>

      <div className="flex justify-center">
        <Link
          href="/build-queue"
          className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(200,164,21,0.25)] transition-all"
        >
          Tell us what you need
        </Link>
      </div>
    </section>
  );
}
