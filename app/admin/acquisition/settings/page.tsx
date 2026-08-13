import SettingsScreen from '@/components/admin/acquisition/SettingsScreen';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Acquisition Settings', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionSettingsPage() {
  return <SettingsScreen />;
}
