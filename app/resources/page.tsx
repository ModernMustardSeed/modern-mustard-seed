import Link from '@/components/AttributionLink';
import { AI_RESOURCE_SLUGS } from '@/data/ai-resources';
import { listContent } from '@/lib/content';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/jsonld';
import PopPageHero from '@/components/pop/PopPageHero';

const description = 'Field notes from a Kalispell agentic product studio: agentic websites, ChatGPT search visibility, GEO, technical SEO and measuring real enquiries.';
export const metadata = buildMetadata({ title: 'Answer Engine and Website Resources', description, path: '/resources' });

export default function ResourcesPage() {
  const posts = listContent('blog');
  const guides = AI_RESOURCE_SLUGS.flatMap((slug) => posts.find((p) => p.slug === slug) ?? []);
  return <article className="bg-[#FBF6EA] text-[#161616] pb-20 overflow-x-clip">
    <JsonLd data={[
      collectionPageJsonLd({ url: `${SITE.url}/resources`, name: 'Answer Engine Field Notes', description, itemListElement: guides.map((p) => ({ name: p.title, url: `${SITE.url}/blog/${p.slug}` })) }),
      breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: 'Resources', url: '/resources' }]),
    ]} />
    <PopPageHero
      eyebrow={<span>From the GEO Desk · Kalispell, Montana</span>}
      title={<>Field notes for<br /><em>getting found.</em></>}
      issue={{ no: 'No.8', lines: ['Field notes', 'The GEO Desk'] }}
      sticker="Found!"
      mascot={{ bubble: 'Fresh field notes!' }}
    >
      <p>An answer engine needs something worth pointing to. These guides explain what to build, what to measure and which claims deserve a raised eyebrow. Written by <Link href="/about" className="underline text-[#B92417] font-bold">Sarah Scarano</Link>, founder of Modern Mustard Seed.</p>
    </PopPageHero>
    <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-6">{guides.map((p, i) => <Link key={p.slug} href={`/blog/${p.slug}`} className="pop-card p-7 md:p-9 hover:-translate-y-1 transition-transform"><p className="font-mono text-xs font-bold text-[#C4160B]">FIELD NOTE {String(i + 1).padStart(2, '0')}</p><h2 className="mt-4 font-display text-2xl md:text-3xl font-bold leading-tight">{p.title}</h2><p className="mt-4 leading-relaxed text-[#3a3733]">{p.description}</p><p className="mt-6 font-bold text-[#B92417]">Read the guide <span aria-hidden="true">→</span></p></Link>)}</div>
    <section className="max-w-5xl mx-auto px-6 mt-14"><div className="pop-card-yellow p-8"><h2 className="font-display text-3xl font-black">Bring it back to your business.</h2><p className="mt-4 leading-relaxed">The <Link href="/website-audit" className="underline font-bold">GEO Desk audit</Link> checks your current site. Our <Link href="/agentic-websites" className="underline font-bold">agentic website guide</Link> explains the build. <Link href="/work" className="underline font-bold">The work</Link> gives you examples to inspect. We build from <Link href="/montana/kalispell" className="underline font-bold">Kalispell</Link> for <Link href="/montana" className="underline font-bold">Montana</Link> and clients nationwide.</p><div className="mt-6 flex flex-wrap gap-4"><Link href="/book" className="pop-card px-6 py-4 font-bold">Begin an Engagement</Link><Link href="/blog" className="pop-card px-6 py-4 font-bold">All Studio Writing</Link></div></div></section>
  </article>;
}
