const steps = [
  {
    number: '01',
    title: 'Scope & Sequence',
    body:
      'One paid scoping call. We map what gets built, in what order, and what gets cut. You leave the call with a fixed scope and a fixed quote.',
  },
  {
    number: '02',
    title: 'Build & Ship',
    body:
      'Sarah builds the product, the brand, and the launch site. You stay in your lane. Weekly check-ins, daily demos, zero handoffs.',
  },
  {
    number: '03',
    title: 'Launch',
    body:
      'Live in 30 days or less. Real domain, real product, real customers. We push the deploy together.',
  },
  {
    number: '04',
    title: 'Hand Off',
    body:
      'You get the repo, the deploy, the docs, every credential. You own the whole thing from day one.',
  },
];

export default function HowItWorks() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-24 md:py-32">
      <div className="flex justify-center mb-16">
        <div className="w-px h-20 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
          How it works
        </span>
        <h2 className="font-sans text-4xl md:text-5xl font-semibold text-white tracking-tight mb-5">
          Four Steps. <span className="text-gradient-mustard">Thirty Days.</span>
        </h2>
        <p className="text-white/55 text-base md:text-lg font-body font-light leading-relaxed">
          The same sequence every time. The repeatable part is what makes the speed possible.
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative glass-card p-7 md:p-8 hover:border-mustard-500/20 transition-all duration-500"
            >
              <span className="font-sans text-3xl md:text-4xl font-semibold text-gradient-mustard-subtle tracking-tight block mb-4">
                {step.number}
              </span>
              <h3 className="font-sans text-lg md:text-xl font-bold text-white tracking-tight mb-3">
                {step.title}
              </h3>
              <p className="text-white/50 text-sm font-body font-light leading-6">{step.body}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-mustard-500/20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
