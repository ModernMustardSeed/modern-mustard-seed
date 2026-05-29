import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { buildMetadata, SITE } from '@/lib/seo';
import {
  JsonLd,
  breadcrumbJsonLd,
  productJsonLd,
  productHowToJsonLd,
  faqJsonLd,
} from '@/lib/jsonld';
import {
  products,
  bundles,
  getProductBySlug,
  getBundleBySlug,
  isComingSoon,
} from '@/data/products';
import StoreBuyButton from '@/components/StoreBuyButton';

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return [
    ...products.map((p) => ({ slug: p.slug })),
    ...bundles.map((b) => ({ slug: b.slug })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  const bundle = getBundleBySlug(slug);
  const item = product ?? bundle;
  if (!item) return buildMetadata({ title: 'Not found', noindex: true });

  return buildMetadata({
    title: item.name,
    description: item.pitch,
    path: `/store/${slug}`,
  });
}

const PRODUCT_FAQS = (productName: string, priceUsd: number) => [
  {
    q: 'How is the playbook delivered?',
    a: `Instant PDF download after purchase. You will get a checkout-success page with the download link and a copy of the link in your email. Lifetime access. No DRM. Read it on any device.`,
  },
  {
    q: 'Who wrote this playbook?',
    a: `Sarah Scarano, founder of Modern Mustard Seed. The playbook is built from the same systems we ship to paid consulting clients at $225 per hour. Every framework has been used on real production engagements.`,
  },
  {
    q: 'Is there a refund policy?',
    a: `Yes. 14-day refund if you decide it is not for you. Email sarah@modernmustardseed.com with the order number and we will process the refund within one business day.`,
  },
  {
    q: 'Will updates be free?',
    a: `Yes. Every buyer of ${productName} receives free updates for the lifetime of the product. When we ship a new version, you get an email with the new download link.`,
  },
  {
    q: 'Can the playbook credit be applied to a Modern Mustard Seed build?',
    a: `Yes. The $${priceUsd} you spend on this playbook is credited toward any Seed Site ($2,500 to $5,000) or Full-Service Business Build ($8,500 to $22,000). Mention it on your discovery call.`,
  },
];

function isProduct(item: ReturnType<typeof getProductBySlug> | ReturnType<typeof getBundleBySlug>): item is NonNullable<ReturnType<typeof getProductBySlug>> {
  return !!item && 'toc' in item;
}

export default async function StoreItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  const bundle = getBundleBySlug(slug);
  const item = product ?? bundle;
  if (!item) return notFound();

  const isProductItem = isProduct(item);
  const accentColor = isProductItem ? item.accentColor : '#C8964E';
  const url = `${SITE.url}/store/${slug}`;

  const bundleProducts = !isProductItem
    ? (item.productSlugs.map((s) => getProductBySlug(s)).filter(Boolean) as NonNullable<ReturnType<typeof getProductBySlug>>[])
    : [];

  const faqs = isProductItem
    ? PRODUCT_FAQS(item.name, item.priceUsd)
    : PRODUCT_FAQS(item.name, item.priceUsd);

  const jsonLd: object[] = [
    breadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: 'Store', url: '/store' },
      { name: item.name, url: `/store/${slug}` },
    ]),
    productJsonLd({
      slug,
      name: item.name,
      description: isProductItem ? item.whatsInside : item.pitch,
      priceUsd: item.priceUsd,
      category: isProductItem ? item.category : 'Bundle',
      pages: isProductItem
        ? item.pages
        : bundleProducts.reduce((sum, p) => sum + p.pages, 0),
    }),
    faqJsonLd(faqs),
  ];

  if (isProductItem) {
    jsonLd.push(
      productHowToJsonLd({
        slug,
        name: item.name,
        description: item.whatsInside,
        toc: item.toc,
      })
    );
  }

  const configured = !!item.stripePriceId && !isComingSoon(slug);

  return (
    <main className="min-h-screen bg-midnight-900 text-cream-50 pt-24">
      <JsonLd data={jsonLd} />

      {/* Accent halo */}
      <div
        className="absolute top-24 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.08] blur-[120px] pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      <div className="max-w-5xl mx-auto px-6 md:px-8 relative">
        <nav className="text-xs font-mono text-cream-100/45 uppercase tracking-[0.22em] mb-8">
          <Link href="/store" className="hover:text-gold-light transition-colors">
            ← Back to store
          </Link>
        </nav>

        <header className="mb-12">
          <span
            className="text-[10px] uppercase tracking-[0.45em] font-mono font-bold mb-6 block"
            style={{ color: '#E8C88A' }}
          >
            {isProductItem ? item.category : 'Bundle · Save $' + item.savings}
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-medium text-cream-50 tracking-tight leading-[1.05] mb-6">
            {item.name}
          </h1>
          <p className="font-display italic text-xl md:text-2xl text-cream-100/90 font-light leading-snug max-w-3xl">
            {item.pitch}
          </p>
        </header>

        {/* Buy panel */}
        <section className="glass-card p-8 md:p-10 border-gold-light/25 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <div className="flex items-baseline gap-4 mb-3">
                <span className="font-display text-5xl md:text-6xl font-medium text-cream-50 tracking-tight">
                  ${item.priceUsd}
                </span>
                {!isProductItem && (
                  <span className="text-cream-100/45 text-base font-mono line-through">
                    ${item.individualTotal}
                  </span>
                )}
              </div>
              <p className="text-cream-100/65 text-sm font-body font-light leading-relaxed">
                {isProductItem ? (
                  <>
                    {item.pages} pages · PDF · Instant download · Lifetime access · Free updates
                  </>
                ) : (
                  <>
                    {bundleProducts.length} playbooks ·{' '}
                    {bundleProducts.reduce((sum, p) => sum + p.pages, 0)} pages · PDF · Instant
                    download · Lifetime access
                  </>
                )}
              </p>
            </div>
            <StoreBuyButton slug={slug} configured={configured} />

          </div>
        </section>

        {/* What's inside */}
        <section className="mb-16">
          <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-5 block">
            What is inside
          </span>
          <p className="text-cream-100/85 text-base md:text-lg font-body font-light leading-relaxed max-w-3xl">
            {isProductItem ? item.whatsInside : item.pitch}
          </p>
        </section>

        {/* Bundle: list included products */}
        {!isProductItem && (
          <section className="mb-16">
            <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-7 block">
              What is included
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bundleProducts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/store/${p.slug}`}
                  className="group glass-card p-6 hover:border-gold-light/30 transition-all duration-500 flex flex-col"
                  style={{ boxShadow: `inset 3px 0 0 0 ${p.accentColor}` }}
                >
                  <span className="text-[9px] uppercase tracking-[0.3em] text-gold-light/65 font-mono font-medium mb-2">
                    {p.category}
                  </span>
                  <h3 className="font-display text-lg md:text-xl text-cream-50 font-medium tracking-tight leading-snug mb-2">
                    {p.name}
                  </h3>
                  <p className="text-cream-100/60 text-sm font-body font-light leading-relaxed mb-3 flex-1">
                    {p.pitch}
                  </p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-cream-100/45 text-xs font-mono uppercase tracking-[0.22em]">
                      {p.pages} pages
                    </span>
                    <span className="text-cream-100/65 text-sm font-mono">${p.priceUsd}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Table of contents */}
        {isProductItem && (
          <section className="mb-16">
            <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-7 block">
              Table of contents
            </span>
            <ol className="space-y-3 max-w-3xl">
              {item.toc.map((entry, i) => {
                const [title, ...rest] = entry.split('.');
                const body = rest.join('.').trim();
                return (
                  <li
                    key={i}
                    className="flex items-start gap-5 glass-card p-5 hover:border-gold-light/20 transition-colors"
                  >
                    <span className="font-display text-xl md:text-2xl text-gold-light/85 font-medium tracking-tight flex-shrink-0 min-w-[2ch]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-display text-base md:text-lg text-cream-50 font-medium tracking-tight leading-snug mb-1">
                        {title.trim()}
                      </h3>
                      {body && (
                        <p className="text-cream-100/60 text-sm font-body font-light leading-relaxed">
                          {body}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
              <li className="flex items-start gap-5 glass-card p-5 border-gold-light/20">
                <span className="font-display text-xl md:text-2xl text-gold-light/85 font-medium tracking-tight flex-shrink-0 min-w-[2ch]">
                  +
                </span>
                <div>
                  <h3 className="font-display text-base md:text-lg text-cream-50 font-medium tracking-tight leading-snug mb-1">
                    Builder Letter from Sarah Scarano
                  </h3>
                  <p className="text-cream-100/60 text-sm font-body font-light leading-relaxed">
                    The why behind the playbook and how to actually run it.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-5 glass-card p-5 border-gold-light/20">
                <span className="font-display text-xl md:text-2xl text-gold-light/85 font-medium tracking-tight flex-shrink-0 min-w-[2ch]">
                  +
                </span>
                <div>
                  <h3 className="font-display text-base md:text-lg text-cream-50 font-medium tracking-tight leading-snug mb-1">
                    The 10x Companion
                  </h3>
                  <p className="text-cream-100/60 text-sm font-body font-light leading-relaxed">
                    Upload your completed PDF to Claude for personalized coaching tuned to your business.
                  </p>
                </div>
              </li>
            </ol>
          </section>
        )}

        {/* Ideal buyer */}
        {isProductItem && (
          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="glass-card p-7">
                <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-4 block">
                  Built for
                </span>
                <p className="text-cream-100/80 text-base font-body font-light leading-relaxed">
                  {item.idealBuyer}
                </p>
              </div>
              <div className="glass-card p-7">
                <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-4 block">
                  Where it fits
                </span>
                <p className="text-cream-100/80 text-base font-body font-light leading-relaxed">
                  {item.funnelRole}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-20">
          <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-7 block">
            Common questions
          </span>
          <div className="space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="glass-card p-6 group cursor-pointer hover:border-gold-light/20 transition-all"
              >
                <summary className="flex justify-between items-start gap-4 list-none">
                  <h3 className="font-display text-base md:text-lg text-cream-50 font-medium tracking-tight">
                    {item.q}
                  </h3>
                  <span className="text-gold-light/85 text-2xl flex-shrink-0 transition-transform group-open:rotate-45 leading-none">
                    +
                  </span>
                </summary>
                <p className="text-cream-100/70 text-sm md:text-base font-body font-light leading-7 mt-4">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Cross-sell to engagements */}
        <section className="mb-24">
          <div className="glass-card p-8 md:p-12 border-gold-light/20 bg-gradient-to-br from-gold-light/[0.03] via-transparent to-brass/[0.03]">
            <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-5 block">
              Want us to build it for you instead?
            </span>
            <h2 className="font-display text-2xl md:text-4xl font-medium text-cream-50 tracking-tight mb-4">
              Your ${item.priceUsd} credits toward any engagement
            </h2>
            <p className="text-cream-100/75 text-base font-body font-light leading-relaxed mb-7 max-w-2xl">
              Read the playbook, run the worksheets, decide what you want to ship. Then if you would rather have us build the system for you, every dollar you spent here comes off the engagement. Mention it on your discovery call.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/work-with-us"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_40px_rgba(255,107,53,0.5)] transition-all text-center"
              >
                See engagements
              </Link>
              <Link
                href="/build-queue"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-100 border border-cream-100/30 rounded-full bg-midnight-700/30 backdrop-blur-sm hover:bg-midnight-700/55 hover:border-cream-100/55 transition-all text-center"
              >
                Apply to build queue
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
