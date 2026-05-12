import Link from 'next/link';

export default function AiProofPromo() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-12">
      <div className="max-w-4xl mx-auto glass-card p-7 md:p-9">
        <div className="md:flex md:items-center md:justify-between gap-8">
          <div className="md:flex-1 mb-5 md:mb-0">
            <span className="text-[10px] uppercase tracking-[0.35em] text-mustard-500/70 font-mono font-medium block mb-2">
              Already running?
            </span>
            <h3 className="font-sans text-xl md:text-2xl font-semibold text-white tracking-tight mb-2">
              Need to defend the moat?
            </h3>
            <p className="text-white/55 text-sm md:text-base font-body font-light leading-relaxed">
              For owners with revenue to protect. We audit your operation against the AI shift, harden what is exposed, and re-equip your team for the new stack.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/ai-proof"
              className="inline-block px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/50 transition-all whitespace-nowrap"
            >
              AI-Proof Your Business
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
