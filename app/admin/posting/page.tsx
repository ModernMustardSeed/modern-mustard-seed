import { Suspense } from 'react';
import PostingDesk from '@/components/admin/PostingDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Daily Posting', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PostingDesk />
    </Suspense>
  );
}
