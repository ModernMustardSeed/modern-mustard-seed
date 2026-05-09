import StaticBackground from '@/components/StaticBackground';
import AIAuditEngine from '@/components/AIAuditEngine';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Free AI Audit',
  description:
    'Drop your website URL. Our AI audit engine analyzes your business and returns AI opportunities, ROI projections, and quick wins in 60 seconds. Free.',
  path: '/audit',
});

export default function AuditPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'AI Audit', url: '/audit' },
        ])}
      />
      <StaticBackground />
      <div className="relative pt-28 md:pt-32">
        <AIAuditEngine />
      </div>
    </>
  );
}
