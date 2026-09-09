import type { Metadata } from 'next';
import { Suspense } from 'react';
import PostingCalendar from '@/components/portal/PostingCalendar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily Posting',
  robots: { index: false, follow: false },
};

export default function PostingPage() {
  return (
    <Suspense fallback={null}>
      <PostingCalendar />
    </Suspense>
  );
}
