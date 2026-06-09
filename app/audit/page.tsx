import BottleneckBreaker from '@/components/BottleneckBreaker';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Bottleneck Breaker',
  description:
    'Drop your website. The Bottleneck Breaker finds the one thing quietly costing your business the most, and shows exactly how to break it. Free, 60 seconds.',
  path: '/audit',
});

const breakerFaq = [
  {
    q: 'What is the Bottleneck Breaker?',
    a: 'A free 60-second analysis of any business. Drop a website URL and it finds your biggest bottleneck, the one thing quietly costing you the most, then shows the highest-leverage fixes, the time and money it is worth, and where to start. No email gate to see the result.',
  },
  {
    q: 'How does it work?',
    a: 'It reads your public website, infers your business model, maps it against fixes that have shipped before, and returns your bottlenecks, the services that break them, ROI estimates, and quick wins. Powered by Anthropic Claude.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes. No credit card, no upsell. It is a free read on your business. If the result is useful and you want the work built, the next step is a free discovery call.',
  },
  {
    q: 'What kinds of businesses does it work for?',
    a: 'Any business with a public website. It is most useful for service businesses, professional firms, retail operators, regional brands, and SaaS or product companies, anyone with operations that AI and good software can compress.',
  },
  {
    q: 'What happens after I run it?',
    a: 'You see your bottlenecks and the plan to break them on screen, and can have it emailed to you. Most businesses follow up with a free 30-minute call to scope the highest-priority build. No obligation.',
  },
];

export default function BottleneckBreakerPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Bottleneck Breaker', url: '/audit' },
          ]),
          faqJsonLd(breakerFaq),
        ]}
      />
      <BottleneckBreaker />
    </>
  );
}
