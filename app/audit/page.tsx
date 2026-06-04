import AIAuditEngine from '@/components/AIAuditEngine';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Free AI Audit',
  description:
    'Drop your website URL. Our AI audit engine analyzes your business and returns AI opportunities, ROI projections, and quick wins in 60 seconds. Free.',
  path: '/audit',
});

const auditFaq = [
  {
    q: 'What is the free AI audit?',
    a: 'A 60-second AI-powered analysis of any business. Drop a website URL and the audit engine returns a ranked list of AI opportunities, ROI projections, and quick wins specific to that business. The audit is free, no email required to see the result.',
  },
  {
    q: 'How does the AI audit work?',
    a: 'The audit engine scrapes the public website, infers the business model, maps it against a catalog of AI use cases that have shipped before, and returns the highest-leverage opportunities with revenue or time-saving estimates. Powered by Anthropic Claude.',
  },
  {
    q: 'Is the audit really free?',
    a: 'Yes. No credit card, no upsell. The audit is a free 60-second read on a business. If the result is useful and the business wants the AI work built, the next step is a paid discovery call.',
  },
  {
    q: 'What kinds of businesses can be audited?',
    a: 'Any business with a public website. The audit is most useful for service businesses, professional firms, retail operators, regional brands, and SaaS or product companies. Anyone with operations that AI can compress.',
  },
  {
    q: 'What happens after I run the audit?',
    a: 'The audit returns a downloadable report and a suggested next step. Most businesses follow up with a free 30-minute discovery call to scope the highest-priority AI build. No obligation.',
  },
];

export default function AuditPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'AI Audit', url: '/audit' },
          ]),
          faqJsonLd(auditFaq),
        ]}
      />
      <div className="relative bg-[#161616] pt-28 md:pt-32">
        <AIAuditEngine />
      </div>
    </>
  );
}
