import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import RoadmapsDesk from '@/components/admin/RoadmapsDesk';
import { buildMetadata } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata: Metadata = buildMetadata({ title: 'Roadmap Desk', noindex: true });

export default async function AdminRoadmapsPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  return <RoadmapsDesk />;
}
