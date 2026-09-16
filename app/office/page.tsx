import type { Metadata } from 'next';
import OfficeShell from '@/components/office/OfficeShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Command Center',
  robots: { index: false, follow: false },
};

/**
 * THE CLIENT'S OWN COMMAND CENTER, at their own address. The same app and
 * the same sign-in as the portal; their name, their marks, their colours,
 * and only what they bought. Reached through office.<their domain>, which
 * hands every request here.
 */
export default function OfficePage() {
  return <OfficeShell />;
}
