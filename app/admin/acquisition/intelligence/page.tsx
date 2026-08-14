import Intelligence from '@/components/admin/acquisition/Intelligence';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Campaign Intelligence', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionIntelligencePage() {
  return <Intelligence />;
}
