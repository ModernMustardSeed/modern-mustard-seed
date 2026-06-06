import Image from 'next/image';

/**
 * Featured live sites we built. Real screenshots in a browser frame, the whole
 * card links out to the live site. Pop-art styling to match the cream body.
 */
const SITES = [
  {
    name: 'Cross + Covenant',
    url: 'https://crossandcovenant.co',
    domain: 'crossandcovenant.co',
    image: '/work/crossandcovenant.jpg',
    blurb: 'A faith movement and apparel house. Storefront, brand system, and commerce, designed and built end to end.',
    tag: 'Brand + Commerce',
  },
  {
    name: 'The Claw Concierge',
    url: 'https://theclawconcierge.com',
    domain: 'theclawconcierge.com',
    image: '/work/theclawconcierge.jpg',
    blurb: 'A white-glove AI concierge service. Brand, marketing site, booking, and voice agents shipped as one system.',
    tag: 'AI Service + Site',
  },
];

export default function FeaturedSites({ heading = 'Live sites we shipped' }: { heading?: string }) {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-16 md:py-20 border-y-4 border-[#161616]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold block mb-3">
            Real work, live
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight">{heading}</h2>
          <p className="text-[#3a3733] font-body mt-3 max-w-xl mx-auto">Click any preview to visit the real site.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
          {SITES.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="group block">
              <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] overflow-hidden transition-all group-hover:-translate-y-1 group-hover:shadow-[10px_10px_0_0_#161616]">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161616]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E0301E]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F5B700]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5ad17f]" />
                  <span className="ml-3 flex-1 truncate rounded-full bg-white/10 px-3 py-1 text-[11px] font-mono text-white/70">
                    {s.domain}
                  </span>
                </div>
                {/* Screenshot */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#FBF6EA]">
                  <Image
                    src={s.image}
                    alt={`${s.name} website`}
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              </div>

              {/* Caption */}
              <div className="mt-5">
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-0.5">
                  {s.tag}
                </span>
                <h3 className="font-display text-2xl font-black text-[#161616] mt-2">{s.name}</h3>
                <p className="text-[#3a3733] font-body text-sm mt-1 leading-relaxed">{s.blurb}</p>
                <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] group-hover:text-[#E0301E] transition-colors">
                  Visit live site
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
