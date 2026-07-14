import DeliveryBoard from '@/components/admin/DeliveryBoard';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Delivery', noindex: true });

export default function AdminDeliveryPage() {
  return <DeliveryBoard />;
}
