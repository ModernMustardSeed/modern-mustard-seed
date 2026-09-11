import Link from '@/components/AttributionLink';
import { AI_RESOURCE_SLUGS } from '@/data/ai-resources';
import { listContent } from '@/lib/content';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/jsonld';

const description = 'Field notes from a Kalispell AI product studio: AI websites, ChatGPT search visibility, GEO, technical SEO and measuring real enquiries.';
export const metadata = buildMetadata({ title: 'AI Search and Website Resources for Montana Businesses', description, path: '/resources' });

export default function ResourcesPage() {
  const posts = listContent('blog');
  const guides = AI_RESOURCE_SLUGS.flatMap((slug) => posts.find((p) => p.slug === slug) ?? []);
  return <article className="bg-[#FBF6EA] text-[#161616] pt-28 md:pt-40 pb-20">
    <JsonLd data={[
      collectionPageJsonLd({ url: `${SITE.url}/resources`, name: 'AI Search Field Notes', description, itemListElement: guides.map((p) => ({ name: p.title, url: `${SITE.url}/blog/${p.slug}` })) }),
      breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: 'Resources', url: '/resources' }]),
    ]} />
    <header className="max-w-5xl mx-auto px-6 pb-12"><p className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4160B]">From the GEO Desk · Kalispell, Montana</p><h1 className="font-display text-4xl md:text-6xl font-black mt-5 leading-tight">Field notes for<br /><em>getting found.</em></h1><p className="mt-6 max-w-2xl text-lg leading-relaxed">An AI answer needs something worth pointing to. These guides explain what to build, what to measure and which claims deserve a raised eyebrow. Written by <Link href="/about" className="underline text-[#1E50C8] font-bold">Sarah Scarano</Link>, founder of Modern Mustard Seed.</p></header>
    <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-6">{guides.map((p, i) => <Link key={p.slug} href={`/blog/${p.slug}`} className="pop-card p-7 md:p-9 hover:-translate-y-1 transition-transform"><p className="font-mono text-xs font-bold text-[#C4160B]">FIELD NOTE {String(i + 1).padStart(2, '0')}</p><h2 className="mt-4 font-display text-2xl md:text-3xl font-bold leading-tight">{p.title}</h2><p className="mt-4 leading-relaxed text-[#3a3733]">{p.description}</p><p className="mt-6 font-bold text-[#1E50C8]">Read the guide <span aria-hidden="true">→</span></p></Link>)}</div>
    <section className="max-w-5xl mx-auto px-6 mt-14"><div className="pop-card-yellow p-8"><h2 className="font-display text-3xl font-black">Bring it back to your business.</h2><p className="mt-4 leading-relaxed">The <Link href="/website-audit" className="underline font-bold">GEO Desk audit</Link> checks your current site. Our <Link href="/ai-websites" className="underline font-bold">AI website guide</Link> explains the build. <Link href="/work" className="underline font-bold">The work</Link> gives you examples to inspect. We build from <Link href="/montana/kalispell" className="underline font-bold">Kalispell</Link> for <Link href="/montana" className="underline font-bold">Montana</Link> and clients nationwide.</p><div className="mt-6 flex flex-wrap gap-4"><Link href="/inquire" className="pop-card px-6 py-4 font-bold">Begin an Engagement</Link><Link href="/blog" className="pop-card px-6 py-4 font-bold">All Studio Writing</Link></div></div></section>
  </article>;
}
