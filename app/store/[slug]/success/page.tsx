import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { buildMetadata, SITE } from '@/lib/seo';
import { getProductBySlug, getBundleBySlug } from '@/data/products';
import SuccessClient from './SuccessClient';

export const metadata: Metadata = buildMetadata({
  title: 'Thank you',
  noindex: true,
});

export default async function StoreSuccessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getProductBySlug(slug) || getBundleBySlug(slug);
  if (!item) return notFound();

  return (
    <main className="min-h-screen bg-midnight-900 text-cream-50 pt-24">
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.08] blur-[120px] pointer-events-none bg-brass" />

      <div className="max-w-3xl mx-auto px-6 md:px-8 relative">
        <header className="text-center mb-12 mt-8">
          <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-7 block">
            Order confirmed
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-medium text-cream-50 tracking-tight leading-[1.05] mb-6">
            Your playbook is ready
          </h1>
          <p className="font-display italic text-xl md:text-2xl text-cream-100/90 font-light leading-snug max-w-2xl mx-auto">
            {item.name}
          </p>
        </header>

        <Suspense fallback={<DownloadShell label="Looking up your order…" />}>
          <SuccessClient slug={slug} />
        </Suspense>

        <section className="mb-16 text-center">
          <div className="glass-card p-8 md:p-10 border-gold-light/20 bg-gradient-to-br from-gold-light/[0.03] via-transparent to-brass/[0.03]">
            <span className="text-[10px] uppercase tracking-[0.45em] text-gold-light/85 font-mono font-medium mb-5 block">
              Want us to ship it for you instead?
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-medium text-cream-50 tracking-tight mb-4">
              Your ${item.priceUsd} credits toward any engagement
            </h2>
            <p className="text-cream-100/75 text-base font-body font-light leading-relaxed mb-6 max-w-xl mx-auto">
              If you read the playbook and decide you would rather have us build the system, every dollar you spent here comes off any Seed Site or Full-Service Build. Mention it on the discovery call.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/build-queue"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_40px_rgba(255,107,53,0.5)] transition-all text-center"
              >
                Apply to build queue
              </Link>
              <Link
                href="/work-with-us"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-100 border border-cream-100/30 rounded-full bg-midnight-700/30 backdrop-blur-sm hover:bg-midnight-700/55 hover:border-cream-100/55 transition-all text-center"
              >
                See engagements
              </Link>
            </div>
          </div>
        </section>

        <p className="text-center text-cream-100/40 text-xs font-mono uppercase tracking-[0.22em] pb-16">
          Need help? Email sarah@modernmustardseed.com
        </p>
      </div>
    </main>
  );
}

function DownloadShell({ label }: { label: string }) {
  return (
    <section className="glass-card p-8 md:p-10 border-gold-light/25 mb-16 text-center">
      <p className="text-cream-100/65 text-sm font-body font-light">{label}</p>
    </section>
  );
}
