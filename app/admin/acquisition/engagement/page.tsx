import Engagement from '@/components/admin/acquisition/Engagement';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Who is moving', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionEngagementPage() {
  return <Engagement />;
}
