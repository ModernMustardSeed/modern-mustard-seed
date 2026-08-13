import MustardEngine from '@/components/admin/acquisition/MustardEngine';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Mr. Mustard Demo Engine', noindex: true });
export const dynamic = 'force-dynamic';

export default function MustardEnginePage() {
  return <MustardEngine />;
}
