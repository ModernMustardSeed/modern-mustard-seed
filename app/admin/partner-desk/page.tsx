import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { buildMetadata } from '@/lib/seo';
import PartnerDesk from '@/components/admin/PartnerDesk';

export const metadata = buildMetadata({ title: 'Partner Desk', noindex: true });
export const dynamic = 'force-dynamic';

export default async function PartnerDeskPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin');
  return <PartnerDesk />;
}
