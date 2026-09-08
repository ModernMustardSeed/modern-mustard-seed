import { Suspense } from 'react';
import CallsPanel from '@/components/admin/CallsPanel';

export const dynamic = 'force-dynamic';

export default function AdminCallsPage() {
  return (
    <Suspense fallback={null}>
      <CallsPanel />
    </Suspense>
  );
}
