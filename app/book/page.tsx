import BookCall from '@/components/BookCall';
import StaticBackground from '@/components/StaticBackground';
import { buildMetadata } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

export const metadata = buildMetadata({
  title: 'Book a Call with Sarah',
  description:
    'Book a free 30-minute discovery call with Sarah Scarano of Modern Mustard Seed. Tell her what you want to build and pick a time. Tuesdays through Fridays.',
  path: '/book',
});

export const dynamic = 'force-dynamic';

export default function BookPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: 'Book a Call', url: '/book' }])} />
      <StaticBackground />
      <div className="relative pt-32 md:pt-40 pb-24 px-6">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">Let's talk</span>
          <h1 className="font-display text-4xl md:text-6xl font-semibold text-cream-50 tracking-tight mb-5">Book a call with Sarah</h1>
          <p className="text-white/55 text-lg font-body font-light leading-relaxed">
            Thirty minutes, no pitch. Tell me what you are building and where you are stuck, pick a time, and I will come prepared. Whether it is a done-for-you build or just figuring out the next move, this is the place to start.
          </p>
        </div>
        <BookCall />
      </div>
    </>
  );
}
