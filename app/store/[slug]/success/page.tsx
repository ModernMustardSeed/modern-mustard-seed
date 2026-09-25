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
    <main className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] halftone-bg opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />

      <div className="max-w-3xl mx-auto px-6 md:px-8 relative">
        <header className="text-center mb-12 mt-8">
          <span className="text-[10px] uppercase tracking-[0.45em] text-[#B92417] font-mono font-bold mb-7 block">
            Order confirmed
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.05] mb-6">
            Your playbook is ready
          </h1>
          <p className="font-display italic text-xl md:text-2xl text-[#3a3733] leading-snug max-w-2xl mx-auto">
            {item.name}
          </p>
        </header>

        <Suspense fallback={<DownloadShell label="Looking up your order…" />}>
          <SuccessClient slug={slug} />
        </Suspense>

        <section className="mb-16 text-center">
          <div className="pop-card-yellow p-8 md:p-10">
            <span className="text-[10px] uppercase tracking-[0.45em] text-[#161616] font-mono font-bold mb-5 block">
              Want us to ship it for you instead?
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-4">
              Your ${item.priceUsd} credits toward any engagement
            </h2>
            <p className="text-[#161616]/85 text-base font-body leading-relaxed mb-6 max-w-xl mx-auto">
              If you read the playbook and decide you would rather have us build the system, every dollar you spent here comes off any Seed Site or Full-Service Build. Mention it on the discovery call.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/book"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#FBF6EA] bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all text-center"
              >
                Book a free call
              </Link>
              <Link
                href="/work-with-us"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all text-center"
              >
                See engagements
              </Link>
            </div>
          </div>
        </section>

        <p className="text-center text-[#161616]/60 text-xs font-mono uppercase tracking-[0.22em] pb-16">
          Need help? Email sarah@modernmustardseed.com
        </p>
      </div>
    </main>
  );
}

function DownloadShell({ label }: { label: string }) {
  return (
    <section className="pop-card p-8 md:p-10 mb-16 text-center">
      <p className="text-[#3a3733] text-sm font-body">{label}</p>
    </section>
  );
}
