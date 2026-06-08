import Link from 'next/link';
import WebsiteAuditEngine from '@/components/WebsiteAuditEngine';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Free Website Audit. Real Score. Real To-Do List.',
  description:
    'Drop your website URL. Get a numeric score 0-100, letter grade A through F, and a prioritized to-do list across brand, trust, SEO, GEO, AI features, conversion, and design. Powered by Claude.',
  path: '/website-audit',
});

const FAQS = [
  {
    q: 'What is the free website audit?',
    a: 'A real, multi-category website audit graded by Anthropic Claude. You drop your URL. We fetch the page, extract every signal that matters (metadata, structured data, headings, content, scripts, llms.txt, ai.txt, sitemap), and Claude judges the site across seven categories: brand, trust, SEO, GEO and AI-search readiness, AI features, conversion, and visual design. You get a numeric score 0 to 100, a letter grade, an honest one-sentence headline, a 2 to 3 paragraph analysis, the three highest-leverage fixes, and a full 10 to 15 item to-do list ranked by priority.',
  },
  {
    q: 'Is the audit really free?',
    a: 'Yes. No credit card. No email required to see the result. The full report renders on the page. If you want it saved to your inbox we capture your email, but you can run the audit and read the full report without it.',
  },
  {
    q: 'How long does the audit take?',
    a: '30 to 60 seconds. The page fetch takes a few seconds. Claude grades the site in about 20 to 40 seconds depending on size and complexity. You see a live progress indicator while it runs.',
  },
  {
    q: 'What is GEO and why does it have its own category?',
    a: 'GEO is generative engine optimization. It is the next frontier of search. ChatGPT, Perplexity, Claude, and Google AI Overviews pull answers from structured signals on your site: llms.txt, FAQ schema, citable claims, named brand mentions, structured Q and A blocks. Most websites score F in this category because they were built before LLM search mattered. We weight GEO heavily because the websites that lead here over the next five years are the ones that built for it now.',
  },
  {
    q: 'What does the score actually measure?',
    a: 'Seven categories, each independently scored. Brand clarity, trust signals, SEO foundations, GEO and AI-search readiness, AI feature presence (chatbots, voice agents, embedded agents), conversion mechanics, and visual design quality. The overall score is the weighted aggregate, with the heaviest weighting on the categories that move revenue and the lightest on aesthetic-only signals.',
  },
  {
    q: 'How accurate is the grading?',
    a: 'Claude is reading real signals from your page. It is not a personality quiz. The score reflects what is on the page right now. We tested it on dozens of sites including ours, our case study clients, and reference sites like Linear, Stripe, and Apple. The grading lands within a letter grade of an experienced human auditor in nearly every case.',
  },
  {
    q: 'Can you build the A version?',
    a: 'Yes. The Seed Site engagement (14 days) ships a beautiful site that gets you to a strong baseline. The Full-Service Business Build (30 days) ships the engine: site plus bespoke booking with embedded CRM, AI sales-development rep, funnels, back office, embedded AI agents. Both come with the SEO and GEO foundations we score on baked in from day one. Each is scoped and quoted after a free discovery call.',
  },
  {
    q: 'What if my site fails the audit?',
    a: 'Most sites do not score A on the first run. That is the point. The to-do list is ranked by priority so you know exactly what to fix first. Send your email and we will follow up with case studies and a path to the A version.',
  },
];

const auditServiceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE.url}/website-audit#service`,
  name: 'Free AI Website Audit',
  description:
    'AI-powered website grading across brand, trust, SEO, GEO, AI features, conversion, and design. Returns a 0 to 100 score, letter grade, and a prioritized to-do list. Powered by Anthropic Claude.',
  provider: { '@id': `${SITE.url}/#organization` },
  serviceType: 'Website audit',
  areaServed: 'Worldwide',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function WebsiteAuditPage() {
  return (
    <>
      <JsonLd
        data={[
          auditServiceJsonLd,
          serviceJsonLd({
            name: 'AI Website Audit',
            description:
              'Free AI-graded website audit. Score 0-100, letter grade, per-category breakdown, prioritized to-do list to get to an A.',
          }),
          faqJsonLd(FAQS),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Website Audit', url: '/website-audit' },
          ]),
        ]}
      />
      <article className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-24">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative">
        {/* Hero */}
        <header className="max-w-4xl mx-auto px-6 md:px-8 text-center mb-16">
          <span className="text-[10px] uppercase tracking-[0.45em] text-[#E0301E] font-mono font-bold mb-7 block">
            Free Website Audit
          </span>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#161616] tracking-tight leading-[1.02] mb-7">
            Get a real grade on your{' '}
            <span className="text-[#F5B700] italic" style={{ WebkitTextStroke: '2px #161616' }}>
              website
            </span>
          </h1>
          <p className="font-display italic font-bold text-2xl md:text-3xl text-[#161616] leading-snug mb-5">
            In 60 seconds
          </p>
          <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto">
            Drop your URL. Get a numeric score, a letter grade, an honest one-line headline, the three things to fix first, and a full to-do list to get to an A. Across brand, trust, SEO, GEO, AI features, conversion, and design.
          </p>
        </header>

        {/* The tool */}
        <section className="max-w-5xl mx-auto px-6 md:px-8 mb-24">
          <WebsiteAuditEngine />
        </section>

        {/* What we score */}
        <section className="max-w-5xl mx-auto px-6 md:px-8 mb-24">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.45em] text-[#E0301E] font-mono font-bold mb-5 block">
              What we score
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
              Seven categories{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                no vibes
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                t: 'Brand',
                d: 'Name and tagline clarity. Value proposition. Voice. Visual coherence. Does a stranger know what you do in three seconds.',
              },
              {
                t: 'Trust',
                d: 'Testimonials, social proof, real names, real photos, About page, contact info, privacy, terms, security signals, press, awards.',
              },
              {
                t: 'SEO',
                d: 'Title tag, meta description, H1 hierarchy, JSON-LD structured data, canonical URLs, robots.txt, sitemap.xml, alt text, internal linking, content depth.',
              },
              {
                t: 'GEO (AI search)',
                d: 'The next frontier. llms.txt, .well-known/ai.txt, FAQ schema, citable claims, named mentions, structured Q&A blocks. Most sites score F here.',
              },
              {
                t: 'AI features',
                d: 'Embedded chatbot, voice agent, personalization, dynamic content, AI-powered search, AI-augmented forms. Zero presence is the default.',
              },
              {
                t: 'Conversion',
                d: 'Primary CTA clarity. Hero CTA above the fold. Form simplicity. Friction. Urgency. Pricing visibility. Trust + commerce ratio.',
              },
              {
                t: 'Design',
                d: 'Typography. Color hierarchy. Whitespace. Mobile responsiveness. Visual rhythm. Modern feel.',
              },
            ].map((c) => (
              <div key={c.t} className="pop-card p-7">
                <h3 className="font-display text-xl text-[#161616] font-black tracking-tight mb-2">
                  {c.t}
                </h3>
                <p className="text-[#3a3733] text-sm font-body leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* From C to A */}
        <section className="max-w-4xl mx-auto px-6 md:px-8 mb-24">
          <div className="pop-card-yellow p-8 md:p-12">
            <span className="text-[10px] uppercase tracking-[0.45em] text-[#161616] font-mono font-bold mb-5 block">
              From C to A
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mb-4">
              Want us to build the{' '}
              <span className="text-white" style={{ WebkitTextStroke: '2px #161616' }}>
                A version
              </span>
              ?
            </h2>
            <p className="text-[#161616]/80 text-base md:text-lg font-body font-medium leading-relaxed mb-7">
              The audit shows you exactly what to fix. We can ship the fixed version for you. Two engagement paths depending on where you want to land.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
              <div className="p-5 rounded-xl border-2 border-[#161616] bg-white">
                <p className="font-display text-lg text-[#161616] font-black tracking-tight mb-2">
                  Seed Site
                </p>
                <p className="text-[#3a3733] text-sm font-body leading-relaxed mb-3">
                  Beautiful, fast, brand-aligned site. Loads in under two seconds. Looks like a real business.
                </p>
                <p className="text-[#161616]/55 text-[11px] uppercase tracking-[0.25em] font-mono font-bold">
                  14 days · quoted after a free call
                </p>
              </div>
              <div className="p-5 rounded-xl border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616]">
                <p className="font-display text-lg text-[#161616] font-black tracking-tight mb-2">
                  Full-Service Business Build
                </p>
                <p className="text-[#3a3733] text-sm font-body leading-relaxed mb-3">
                  Site + bespoke booking with CRM + AI SDR + funnels + back office + embedded agents. The engine.
                </p>
                <p className="text-[#161616]/55 text-[11px] uppercase tracking-[0.25em] font-mono font-bold">
                  30 days · quoted after a free call
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/work-with-us"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all text-center"
              >
                See engagements
              </Link>
              <Link
                href="/build-queue"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all text-center"
              >
                Apply to build queue
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-6 md:px-8">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.45em] text-[#E0301E] font-mono font-bold mb-5 block">
              FAQ
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
              Common{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                questions
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((item) => (
              <details key={item.q} className="pop-card p-6 group cursor-pointer">
                <summary className="flex justify-between items-start gap-4 list-none">
                  <h3 className="font-display text-lg md:text-xl text-[#161616] font-black tracking-tight">
                    {item.q}
                  </h3>
                  <span className="text-[#E0301E] text-2xl flex-shrink-0 transition-transform group-open:rotate-45 leading-none font-black">
                    +
                  </span>
                </summary>
                <p className="text-[#3a3733] text-sm md:text-base font-body leading-relaxed mt-4">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
        </div>
      </article>
    </>
  );
}
