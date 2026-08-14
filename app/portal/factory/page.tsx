import { buildMetadata } from '@/lib/seo';
import ClientFactoryDashboard from '@/components/portal/ClientFactoryDashboard';

export const metadata = buildMetadata({ title: 'Your Client Factory', noindex: true });

export default function PortalFactoryPage() {
  return <ClientFactoryDashboard />;
}
