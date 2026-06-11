import Link from 'next/link';
import LaunchChecklistTool from '@/components/LaunchChecklistTool';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { PHASES } from '@/data/launch-checklist';

export const metadata = buildMetadata({
  title: 'The New Business Launch Checklist',
  description:
    'Every step to open and digitize a new business, tailored to your industry. LLC, EIN, licenses, insurance, bank, Google and Maps, website, CRM, AI agents, funnels, and ads. Free, with a branded PDF.',
  path: '/launch-checklist',
});

const checklistFaq = [
  {
    q: 'What is the New Business Launch Checklist?',
    a: 'A complete, step-by-step checklist for opening and digitizing a new business. It covers the legal foundation (LLC, EIN, licenses, insurance), money and books, getting found on Google and Maps, your website and brand, the CRM and AI agents that answer and book for you, and the funnels, lead magnets, and ads that bring in customers. Each step has a short how-to, official links, and the option to have Modern Mustard Seed do it for you.',
  },
  {
    q: 'Is it free?',
    a: 'Yes. The interactive checklist and the branded PDF one-pager are free. Enter your email and we send you the PDF tailored to your industry.',
  },
  {
    q: 'Is it tailored to my industry?',
    a: 'Yes. Pick your field (home and field services and trades, food, retail and ecommerce, health, beauty, wellness and fitness, or professional, creative and real estate) and the licenses, permits, tools, and tips adjust to what your specific business actually needs. There is also a general path for any other field.',
  },
  {
    q: 'Can Modern Mustard Seed set it all up for me?',
    a: 'Yes. That is what we do. We build the website, CRM, AI voice and chat agents, automations, funnels, and ad systems that the checklist describes, properly and fast, usually shipped in 30 days. Most owners use the checklist to get the legal and money basics in place, then hand the digital build to us.',
  },
  {
    q: 'What does it cover that a generic startup checklist does not?',
    a: 'The digital side. Most checklists stop at LLC and EIN. This one keeps going through Google Business Profile, Bing and Apple Maps, a real website with SEO and GEO, a CRM, AI agents that answer and book around the clock, automations, lead magnets, funnels, email and SMS, and ads, which is where new businesses actually win or stall today.',
  },
];

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to launch and digitize a new business',
  description:
    'The six phases of opening a new business and getting it online, from legal foundation to bringing in customers.',
  totalTime: 'P30D',
  step: PHASES.map((phase, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: phase.title,
    text: phase.blurb,
    url: `${SITE.url}/launch-checklist#${phase.id}`,
  })),
};

export default function LaunchChecklistPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'The New Business Launch Checklist', url: '/launch-checklist' },
          ]),
          faqJsonLd(checklistFaq),
          howToJsonLd,
        ]}
      />

      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-24">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative">
          {/* Hero */}
          <div className="max-w-3xl mx-auto px-6 md:px-8 text-center mb-14">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-6 block">
              Free tool for new business owners
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.08] mb-6">
              The New Business{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                Launch Checklist
              </span>
            </h1>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto mb-4">
              Every step to get your business open, online, and bringing in customers. The legal and money basics, then the website, CRM, AI agents, and funnels most checklists skip. Tailored to your field, with how-tos and links on every step.
            </p>
            <p className="text-[#161616]/50 text-sm font-body italic mb-7">
              Pick your industry, work the list, and grab the branded PDF to keep.
            </p>
            <a
              href="#get-it"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Get the free PDF →
            </a>
          </div>

          {/* The tool */}
          <LaunchChecklistTool />

          {/* Reassurance / CTA to us */}
          <div className="max-w-4xl mx-auto px-6 md:px-8 mt-20">
            <div className="pop-card-yellow p-10 text-center">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#161616] font-mono font-bold mb-4 block">
                Rather not do it all yourself?
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-4">
                We build the digital half for you
              </h2>
              <p className="text-[#161616]/75 text-base font-body font-medium mb-7 max-w-xl mx-auto">
                Website, CRM, AI voice and chat agents, automations, funnels, and ads. The whole stack the checklist describes, built right and shipped in about 30 days. You get the basics in place. We handle the engine.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/work-with-us"
                  className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  See how we work
                </Link>
                <Link
                  href="/build-queue"
                  className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.35)] hover:-translate-y-0.5 transition-all"
                >
                  Tell us what you are building
                </Link>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 mt-20">
            <NewsletterSignup
              headline="Get the plays we use in real client builds."
              subhead="One short email a week. The same systems on this checklist, broken down so you can run them."
            />
          </div>
        </div>
      </div>
    </>
  );
}
