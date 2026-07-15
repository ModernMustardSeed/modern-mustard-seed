import type { Metadata } from 'next';
import SwitchboardMinter from '@/components/admin/SwitchboardMinter';

export const metadata: Metadata = {
  title: 'Switchboard | MMS Admin',
  robots: { index: false, follow: false },
};

export default function AdminSwitchboardPage() {
  return <SwitchboardMinter />;
}
