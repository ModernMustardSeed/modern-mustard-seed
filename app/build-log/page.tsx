import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readSnapshot } from '@/lib/build-log';
import PublicBuildLog from '@/components/PublicBuildLog';

export const dynamic = 'force-dynamic';

// Shareable by direct link, but kept out of search until Sarah wants it indexed.
export const metadata: Metadata = {
  title: 'Build Log · Modern Mustard Seed',
  description: 'A live look at the pace and shape of the work across every Modern Mustard Seed venture.',
  robots: { index: false, follow: false },
};

export default async function PublicBuildLogPage() {
  const { published, snapshot } = await readSnapshot();
  if (!published || !snapshot) notFound();
  return <PublicBuildLog snap={snapshot} />;
}
