import { redirect } from 'next/navigation';
import TeamBoard from '@/components/admin/TeamBoard';
import { getAdminUser } from '@/lib/admin-auth';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Team', noindex: true });

export default async function AdminTeamPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  if (user.role !== 'owner') redirect('/admin');
  return <TeamBoard />;
}
