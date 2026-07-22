import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { getBuildLogData } from '@/lib/build-log';
import BuildLogConsole from '@/components/admin/BuildLogConsole';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Build Log' };

export default async function BuildLogPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  const data = await getBuildLogData();
  return <BuildLogConsole data={data} />;
}
