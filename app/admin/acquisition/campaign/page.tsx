import CampaignScreen from '@/components/admin/acquisition/Campaign';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Meet Mr. Mustard Campaign', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionCampaignPage() {
  return <CampaignScreen />;
}
