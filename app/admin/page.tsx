import CommandCenter from '@/components/admin/CommandCenter';
import { getAdminUser } from '@/lib/admin-auth';

export default async function AdminPage() {
  const user = await getAdminUser();
  return <CommandCenter user={user ? { name: user.name, role: user.role } : undefined} />;
}
