import OnboardingHub from '@/components/admin/OnboardingHub';
import { getAdminUser } from '@/lib/admin-auth';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Onboarding', noindex: true });

export default async function AdminOnboardingPage() {
  const user = await getAdminUser();
  return <OnboardingHub name={user?.name} email={user?.email} role={user?.role} />;
}
