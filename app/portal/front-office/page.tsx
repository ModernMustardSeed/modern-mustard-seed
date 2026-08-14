import type { Metadata } from 'next';
import FrontOfficeScreen from '@/components/portal/FrontOffice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Front Office',
  robots: { index: false, follow: false },
};

export default function FrontOfficePage() {
  return <FrontOfficeScreen />;
}
