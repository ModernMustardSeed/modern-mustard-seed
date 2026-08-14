import { buildMetadata } from '@/lib/seo';
import FactoryOperations from '@/components/admin/factory/FactoryOperations';

export const metadata = buildMetadata({ title: 'Factory Operations', noindex: true });

export default function AdminFactoriesPage() {
  return <FactoryOperations />;
}
