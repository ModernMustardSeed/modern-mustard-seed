import PortalLogin from '@/components/portal/PortalLogin';
import { Suspense } from 'react';

export default function PortalLoginPage() {
  return (
    <Suspense fallback={null}>
      <PortalLogin />
    </Suspense>
  );
}
