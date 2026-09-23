import Image from 'next/image';
import Link from '@/components/AttributionLink';

/**
 * The 404. A broken link is the one place most sites feel dead, so this one
 * is Mr. Mustard, a joke, and three ways home. Next serves it with a 404 status
 * and keeps it out of search on its own.
 */
export default function NotFound() {
  const door = 'inline-flex min-h-[54px] items-center justify-center gap-3 border-2 border-[#161616] px-6 font-sans text-[14px] font-bold transition-transform hover:-translate-y-0.5';
  return (
    <main className="relative overflow-hidden bg-[#F5B700] text-[#161616]">
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#161616_1.3px,transparent_1.5px)] [background-size:11px_11px] [mask-image:linear-gradient(115deg,transparent_35%,#000_80%)]" />
      <div className="relative mx-auto grid min-h-[88vh] max-w-6xl items-center gap-10 px-6 pb-16 pt-32 md:grid-cols-[1.1fr_.9fr]">
        <div>
          <span className="inline-block -rotate-1 bg-[#161616] px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5B700]">404 · Page not found</span>
          <h1 className="mt-6 flex flex-col items-start font-sans text-[2.6rem] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-6xl lg:text-[5rem]">
            <span>Well, this seed</span>
            <span className="my-[0.12em] -rotate-2 border-[3px] border-[#161616] bg-[#FBF6EA] px-[0.18em] pb-[0.08em] font-display font-medium italic tracking-[-0.03em] shadow-[7px_7px_0_0_#E0301E]">didn’t sprout.</span>
          </h1>
          <p className="mt-8 max-w-lg font-body text-lg font-medium leading-relaxed">
            The page you wanted is not here. It may have moved, or the link had a typo. Everything else is a click away.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/" className={`${door} bg-[#161616] text-[#FBF6EA] shadow-[5px_5px_0_0_#FBF6EA]`}>Back to the homepage <span aria-hidden="true" className="text-[#F5B700]">↗</span></Link>
            <Link href="/work" className={`${door} bg-[#FBF6EA] shadow-[5px_5px_0_0_#161616]`}>See the work</Link>
            <Link href="/inquire" className={`${door} bg-[#FBF6EA] shadow-[5px_5px_0_0_#161616]`}>Tell us what you need</Link>
          </div>
        </div>
        <div className="relative mx-auto flex w-full max-w-[380px] justify-center">
          <div aria-hidden="true" className="absolute inset-[-8%] rounded-full bg-[#FBF6EA] [clip-path:polygon(50%_0,58%_17%,75%_7%,74%_26%,93%_25%,83%_41%,100%_50%,83%_59%,93%_75%,74%_74%,75%_93%,58%_83%,50%_100%,42%_83%,25%_93%,26%_74%,7%_75%,17%_59%,0_50%,17%_41%,7%_25%,26%_26%,25%_7%,42%_17%)]" />
          <Image src="/brand/mascot-full.png" alt="Mr. Mustard waving, as if to say this way home" width={876} height={1190} sizes="(max-width: 768px) 60vw, 380px" className="relative h-auto w-[78%] -rotate-6 drop-shadow-[8px_8px_0_rgba(8,12,22,0.9)]" />
        </div>
      </div>
    </main>
  );
}
