import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { getMailerDeskData } from '@/lib/mailer/desk';
import MailerDesk from '@/components/admin/MailerDesk';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'The Mailer' };

export default async function AdminMailerPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  const data = await getMailerDeskData();
  return <MailerDesk data={data} />;
}
