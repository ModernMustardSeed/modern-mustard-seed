import type { Metadata } from 'next';
import { Suspense } from 'react';
import ClientCalls from '@/components/portal/ClientCalls';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Calls',
  robots: { index: false, follow: false },
};

export default function PortalCallsPage() {
  return (
    <Suspense fallback={null}>
      <ClientCalls />
    </Suspense>
  );
}
