import Link from 'next/link';

export default function AiProofPromo() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-12">
      <div className="relative max-w-4xl mx-auto pop-card-cream p-7 md:p-9 overflow-hidden">
        <div className="relative md:flex md:items-center md:justify-between gap-8">
          <div className="md:flex-1 mb-5 md:mb-0">
            <span className="text-[10px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold block mb-2">
              Already running?
            </span>
            <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-2">
              Need to defend the moat?
            </h3>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-relaxed">
              For owners with revenue to protect. We audit your operation against the AI shift, harden what is exposed, and re-equip your team for the new stack.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/ai-proof"
              className="inline-block px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              AI-Proof Your Business
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
