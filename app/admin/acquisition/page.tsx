import ClientFactory from '@/components/admin/acquisition/ClientFactory';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Client Factory', noindex: true });
export const dynamic = 'force-dynamic';

export default function ClientFactoryPage() {
  return <ClientFactory />;
}
