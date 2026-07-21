import Image from 'next/image';
import Link from 'next/link';

/**
 * The newsstand: homepage teaser for the Mustard Life magazine comic
 * (/comic). The cover leans on a rack like a fresh issue at the checkout
 * stand; the whole catalog with prices lives one click away.
 */
export default function ComicRack() {
  return (
    <section className="relative border-t-2 border-[#161616] bg-[#FBF6EA] overflow-hidden">
      <div aria-hidden className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-[1fr_1.1fr] md:py-28 md:px-8">
        {/* The issue on the rack */}
        <Link href="/comic" className="group relative mx-auto block w-64 md:w-80" aria-label="Read Mustard Life, the family business issue">
          <span
            aria-hidden
            className="absolute -top-4 -right-6 z-[2] grid h-20 w-20 rotate-12 place-items-center rounded-full border-2 border-[#161616] bg-[#E0301E] text-center font-mono text-[10px] font-extrabold uppercase leading-tight tracking-[0.08em] text-white shadow-[3px_3px_0_0_#161616] transition-transform group-hover:rotate-[18deg]"
          >
            New
            <br />
            Issue
          </span>
          <span className="block overflow-hidden rounded-xl border-2 border-[#161616] shadow-[10px_10px_0_0_#161616] transition-transform duration-300 rotate-[-2deg] group-hover:rotate-0 group-hover:-translate-y-2">
            <span className="relative block aspect-[3/4]">
              <Image
                src="/comic/cover.webp"
                alt="Mustard Life magazine cover: the Mustard family yachting at golden hour"
                fill
                sizes="(min-width: 768px) 320px, 256px"
                className="object-cover"
              />
              <span aria-hidden className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#FBF6EA]/85 to-transparent px-4 pb-8 pt-3 text-center">
                <span className="font-display text-3xl font-black italic tracking-tight text-[#161616]" style={{ textShadow: '2px 2px 0 #F5B700' }}>
                  Mustard Life
                </span>
              </span>
            </span>
          </span>
        </Link>

        {/* The pitch */}
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-[#E0301E]">
            Hot Off the Press // The Family Business Issue
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold italic leading-[1.02] text-[#161616] md:text-5xl">
            The Mustards are on the newsstand.
          </h2>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-[#3a3733] md:text-lg">
            Our whole catalog, told as a glossy magazine comic: the family yachts, brunches, and premieres
            while the AI staff answer the phones, build the websites, and run the ads. Every product, every
            price, printed in ink. Free to read, dangerously easy to quote.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/comic"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-[#F5B700] px-8 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#161616]"
            >
              Read the Issue
              <span aria-hidden>→</span>
            </Link>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#8f6600]">
              Free. The magazine, not the yacht.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
