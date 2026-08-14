import Calls from '@/components/admin/acquisition/Calls';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Mr. Mustard Calls', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionCallsPage() {
  return <Calls />;
}
