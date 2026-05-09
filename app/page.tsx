import PageBackground from '@/components/PageBackground';
import Hero from '@/components/Hero';
import SocialProof from '@/components/SocialProof';
import Portfolio from '@/components/Portfolio';
import VideoShowcase from '@/components/VideoShowcase';
import Services from '@/components/Services';
import BlogTeaser from '@/components/BlogTeaser';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import Link from 'next/link';

export const metadata = buildMetadata();

const services = [
  'AI-Powered Products',
  'Voice Agents',
  'Full-Stack Development',
  'Business Automation',
  'Brand & Strategy',
  'Creative & Generative Tech',
];

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://modernmustardseed.com/#webpage',
  url: 'https://modernmustardseed.com',
  name: 'Modern Mustard Seed | Creativity x Strategy x Faith',
  description:
    'AI-powered products, voice agents, and business automation. Built with faith, precision, and full-stack execution.',
  isPartOf: { '@id': 'https://modernmustardseed.com/#website' },
  about: { '@id': 'https://modernmustardseed.com/#organization' },
};

const itemListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Services',
  itemListElement: services.map((name, i) => ({
    '@type': 'Service',
    position: i + 1,
    name,
    provider: { '@id': 'https://modernmustardseed.com/#organization' },
  })),
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={[homeJsonLd, itemListJsonLd, breadcrumbJsonLd([{ name: 'Home', url: '/' }])]} />
      <PageBackground />
      <Hero />
      <SocialProof />
      <Portfolio limit={8} showHeader />
      <VideoShowcase />
      <Services limit={3} />

      {/* Audit CTA band */}
      <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-16">
        <div className="max-w-4xl mx-auto glass-card p-8 md:p-12 text-center">
          <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-4 block">
            Free AI Audit
          </span>
          <h3 className="font-sans text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
            Where is the AI leverage in <span className="text-gradient-mustard">your business</span>?
          </h3>
          <p className="text-white/55 text-base font-body font-light max-w-xl mx-auto leading-relaxed mb-8">
            Drop your website. We will tell you in 60 seconds where AI can save the most time, recover the most revenue, and stop the bleeding.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/audit"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(200,164,21,0.2)] transition-all"
            >
              Run the Free Audit
            </Link>
            <Link
              href="/work-with-us"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 transition-all"
            >
              See How We Engage
            </Link>
          </div>
        </div>
      </section>

      <BlogTeaser />

      <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-20">
        <NewsletterSignup />
      </section>
    </>
  );
}
