import Link from 'next/link';

export default function AiProofPromo() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-20">
      <div className="max-w-4xl mx-auto glass-card p-8 md:p-10">
        <div className="md:flex md:items-center md:justify-between gap-8">
          <div className="md:flex-1 mb-6 md:mb-0">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-bold block mb-3">
              Already running?
            </span>
            <h3 className="font-sans text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3">
              Already running. Need to defend the moat?
            </h3>
            <p className="text-white/55 text-sm md:text-base font-body font-light leading-relaxed">
              If your business already works and you want to make sure AI does not eat it from the inside, that is a separate engagement. Audit, harden, and re-equip your operation so the next decade is one you own.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/ai-proof"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/50 transition-all whitespace-nowrap"
            >
              AI-Proof Your Business
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
