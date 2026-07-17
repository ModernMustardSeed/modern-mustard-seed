import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ContactForm from '@/components/ContactForm';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Contact',
  description:
    'Get in touch with Modern Mustard Seed. Send Sarah a note and a human answers inside a day, book a free 30-minute discovery call, or email her directly.',
  path: '/contact',
});

type SearchParams = Promise<{ package?: string }>;

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const pkg = params.package;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Contact', url: '/contact' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Contact Modern Mustard Seed',
            url: `${SITE.url}/contact`,
            description:
              'Send Modern Mustard Seed a note about a build, a partnership, or press. A human answers inside a day.',
            mainEntity: {
              '@type': 'Organization',
              name: SITE.name,
              url: SITE.url,
              email: SITE.email,
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Sales and general enquiries',
                email: SITE.email,
                areaServed: 'US',
                availableLanguage: 'English',
              },
            },
          },
        ]}
      />

      {/* ───────────────  HERO — the mailbox  ─────────────── */}
      <section className="relative overflow-hidden border-b-2 border-[#161616] halftone-bg">
        <div className="relative z-[2] max-w-6xl mx-auto px-6 pt-28 md:pt-36 pb-14 md:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] font-bold bg-white text-[#E0301E] border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">
                ✉ No postage necessary
              </span>
              <h1 className="mt-6 font-display font-extrabold leading-[0.98] tracking-tight text-5xl md:text-6xl lg:text-[4.6rem] text-[#161616]">
                Drop us a <em className="italic text-[#B48600]">line</em>.
              </h1>
              <p className="mt-6 max-w-xl text-lg md:text-xl text-[#3d382e] font-body leading-relaxed">
                A build, a partnership, a question, or just hello. Tear off the card, fill it in, and mail it. It lands in Sarah&rsquo;s inbox and a human answers inside a day.
              </p>
              <p className="mt-6 font-body text-[15px] text-[#5c554a]">
                Would rather talk it through?{' '}
                <Link href="/book" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
                  Get on the book
                </Link>{' '}
                for a free 30 minutes with Sarah.
              </p>
            </div>

            <div className="lg:col-span-6">
              <figure className="relative rotate-[1.5deg] rounded-2xl border-[3px] border-[#161616] bg-white p-2.5 shadow-[9px_9px_0_0_#1E50C8]">
                <Image
                  src="/contact/mailbox-hero.jpg"
                  alt="Pop-art screenprint: a hand drops a mustard-gold reply card into a black mailbox as more cards fly past"
                  width={1600}
                  height={900}
                  priority
                  sizes="(min-width: 1024px) 48vw, 92vw"
                  className="rounded-xl border-2 border-[#161616] w-full h-auto"
                />
                <figcaption className="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5c554a] text-center">
                  Fill it in · mail it · a human answers
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────  THE REPLY CARD (signature)  ─────────────── */}
      <section className="relative pt-14 md:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 halftone-bg opacity-40" />
        <div className="relative">
          <Suspense fallback={null}>
            <ContactForm defaultPackage={pkg} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
