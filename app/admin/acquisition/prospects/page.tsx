import Prospects from '@/components/admin/acquisition/Prospects';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Acquisition Prospects', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionProspectsPage() {
  return <Prospects />;
}
