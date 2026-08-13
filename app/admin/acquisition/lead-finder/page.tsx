import LeadFinder from '@/components/admin/acquisition/LeadFinder';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Lead Finder', noindex: true });
export const dynamic = 'force-dynamic';

export default function LeadFinderPage() {
  return <LeadFinder />;
}
