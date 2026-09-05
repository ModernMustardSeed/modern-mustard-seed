import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { buildMetadata } from '@/lib/seo';
import VideoLibrary from '@/components/admin/VideoLibrary';

export const metadata = buildMetadata({ title: 'Videos', noindex: true });
export const dynamic = 'force-dynamic';

export default async function AdminVideosPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin');
  return <VideoLibrary />;
}
