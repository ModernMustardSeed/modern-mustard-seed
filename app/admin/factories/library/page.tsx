import { buildMetadata } from '@/lib/seo';
import FactoryLibrary from '@/components/admin/factory/FactoryLibrary';

export const metadata = buildMetadata({ title: 'Factory Library', noindex: true });

export default function FactoryLibraryPage() {
  return <FactoryLibrary />;
}
