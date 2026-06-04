import { Suspense } from 'react';
import ContactForm from '@/components/ContactForm';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Contact',
  description:
    'Get in touch with Modern Mustard Seed. Book a discovery call, send a message, or email Sarah directly.',
  path: '/contact',
});

type SearchParams = Promise<{ package?: string }>;

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const pkg = params.package;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Contact', url: '/contact' },
        ])}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-28 md:pt-32">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative">
          <Suspense fallback={null}>
            <ContactForm defaultPackage={pkg} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
