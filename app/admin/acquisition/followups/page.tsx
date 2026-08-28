import Followups from '@/components/admin/acquisition/Followups';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Follow Up', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionFollowupsPage() {
  return <Followups />;
}
