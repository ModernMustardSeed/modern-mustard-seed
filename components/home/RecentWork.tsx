import Image from 'next/image';
import Link from 'next/link';

/**
 * Recent Work. Real sites we shipped, framed as little browser windows with
 * a live screenshot, toward the bottom of the homepage. Each card links out
 * to the real thing. Pop-art cards (ink border + hard offset shadow), a faux
 * URL bar, and a hover lift. Screenshots live in public/home/work/ and are
 * refreshed by scripts (Playwright).
 */

type Work = {
  name: string;
  domain: string;
  url: string;
  tag: string;
  desc: string;
  shot: string;
  tilt: string;
  /** Featured card: spans both columns with a wide cinematic crop. */
  wide?: boolean;
};

const WORK: Work[] = [
  // HUCKWILD card is parked until the real domain + waitlist are finished
  // (Sarah, 2026-07-21). Shot stays at /home/work/huckwild.jpg; restore as
  // the wide featured card when drinkhuckwild.com is live.
  {
    name: 'Wild Hope',
    domain: 'wildhopehq.com',
    url: 'https://wildhopehq.com',
    tag: 'Retreat village + brand',
    desc: 'A Flathead Lake retreat told as a Book of Hours: seventeen original oil paintings, a night-to-dawn scroll, and a booking ledger sealed in wax.',
    shot: '/home/work/wild-hope.jpg',
    tilt: '-rotate-[0.8deg]',
  },
  {
    name: 'Cross + Covenant',
    domain: 'crossandcovenant.co',
    url: 'https://crossandcovenant.co',
    tag: 'Faith apparel brand',
    desc: 'A direct-to-consumer storefront and fashion house, sketch to live collection in 60 days.',
    shot: '/home/work/cross-covenant.jpg',
    tilt: 'rotate-[0.8deg]',
  },
  {
    name: 'Fiat Lux Design',
    domain: 'fiatluxdesign.co',
    url: 'https://fiatluxdesign.co',
    tag: 'AI interior staging',
    desc: 'An AI studio that stages any empty room for listing photos in seconds, built for realtors and designers.',
    shot: '/home/work/fiat-lux.jpg',
    tilt: '-rotate-[0.8deg]',
  },
  {
    name: 'Lago Society',
    domain: 'lagosociety.com',
    url: 'https://lagosociety.com',
    tag: 'Resort-wear boutique',
    desc: 'An old-money lakeside fashion house with a live shop and an AI personal stylist.',
    shot: '/home/work/lago-society.jpg',
    tilt: 'rotate-[0.8deg]',
  },
  {
    name: 'D&D Landscaping',
    domain: 'ddlandscaping.pro',
    url: 'https://ddlandscaping.pro',
    tag: 'Design-build landscaping',
    desc: 'A design-build landscaper with an AI yard visualizer and a full back office behind it.',
    shot: '/home/work/dnd-landscaping.jpg',
    tilt: '-rotate-[0.8deg]',
  },
  {
    name: 'Bare Earth',
    domain: 'bare-earth.vercel.app',
    url: 'https://bare-earth.vercel.app',
    tag: 'Estate landscaping + AI office',
    desc: 'An estate groundskeeper brand with instant quoting, an AI concierge that books walkthroughs, and a command center behind it.',
    shot: '/home/work/bare-earth.jpg',
    tilt: 'rotate-[0.8deg]',
  },
];

export default function RecentWork() {
  return (
    <section className="relative bg-[#FBF6EA] border-t-2 border-[#161616] py-16 md:py-24 overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 md:mb-16">
          <p className="font-mono font-bold text-[11px] uppercase tracking-[0.35em] text-[#E0301E]">
            Live in the wild // Real sites, real businesses
          </p>
          <h2 className="font-display font-black tracking-tight leading-[1.03] text-[#161616] mt-4 text-[clamp(2.25rem,6vw,4rem)]">
            Work we&rsquo;ve shipped.
          </h2>
          <p className="font-body text-base md:text-lg text-[#161616]/70 leading-relaxed mt-4 max-w-2xl mx-auto">
            Not mockups. Real businesses, running on the web right now. Go poke around.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-7 md:gap-9">
          {WORK.map((w) => (
            <Link
              key={w.domain}
              href={w.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group block rounded-2xl border-2 border-[#161616] bg-white shadow-[7px_7px_0_0_#161616] overflow-hidden transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[10px_10px_0_0_#161616] ${w.tilt} hover:rotate-0 ${w.wide ? 'sm:col-span-2' : ''}`}
            >
              {/* Faux browser chrome */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b-2 border-[#161616] bg-[#FBF6EA]">
                <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E0301E] border border-[#161616]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F5B700] border border-[#161616]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1E50C8] border border-[#161616]" />
                </div>
                <span className="flex-1 min-w-0 truncate rounded-full bg-white border-2 border-[#161616] px-3 py-1 font-mono text-[11px] text-[#161616]/70 text-center">
                  {w.domain}
                </span>
              </div>

              {/* Live screenshot */}
              <div className={`relative overflow-hidden bg-[#F5F0E8] ${w.wide ? 'aspect-[16/10] sm:aspect-[21/9]' : 'aspect-[16/10]'}`}>
                <Image
                  src={w.shot}
                  alt={`The ${w.name} website, built by Modern Mustard Seed`}
                  fill
                  sizes={w.wide ? '(max-width: 640px) 90vw, 1120px' : '(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 560px'}
                  className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${w.wide ? 'object-[center_58%]' : 'object-top'}`}
                />
              </div>

              {/* Caption */}
              <div className="p-5 md:p-6 border-t-2 border-[#161616]">
                <p className="font-mono font-bold text-[10px] uppercase tracking-[0.25em] text-[#8f6600]">
                  {w.tag}
                </p>
                <h3 className="font-display font-black text-2xl text-[#161616] mt-1.5">{w.name}</h3>
                <p className="font-body text-sm text-[#161616]/70 leading-relaxed mt-2">{w.desc}</p>
                <span className="inline-flex items-center gap-1.5 mt-4 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] text-[#1E50C8] group-hover:text-[#E0301E] transition-colors">
                  Visit the live site
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17 17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/work"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-[#F5B700] px-8 py-3.5 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5"
          >
            See more of the work
          </Link>
        </div>
      </div>
    </section>
  );
}
