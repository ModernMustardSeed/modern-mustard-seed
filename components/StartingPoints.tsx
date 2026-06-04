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
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-5 block">
          For everyone
        </span>
        <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight mb-4">
          Three{' '}
          <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
            ways in
          </span>
        </h2>
        <p className="text-[#3a3733] text-base font-body leading-relaxed">
          You do not need to know much about AI. You do not need a technical co-founder. Pick the path
          that sounds like you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto mb-10">
        {PATHS.map((p) => (
          <article
            key={p.label}
            className="pop-card p-7 md:p-8 flex flex-col hover:-translate-y-1 transition-transform duration-300"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-4">
              {p.eyebrow}
            </span>
            <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-4 leading-snug">
              {p.label}
            </h3>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mb-5 flex-1">{p.body}</p>
            <p className="text-[#161616] text-sm font-body font-bold italic leading-relaxed pt-4 border-t-2 border-[#161616]/10">
              {p.outcome}
            </p>
            <p className="text-[#161616]/45 text-xs font-body leading-relaxed mt-3">For: {p.forWho}</p>
          </article>
        ))}
      </div>

      <div className="flex justify-center">
        <Link
          href="/build-queue"
          className="inline-block px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
        >
          Tell us what you need
        </Link>
      </div>
    </section>
  );
}
