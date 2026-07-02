import type { Metadata } from 'next';
import GleanerDeck from '@/components/admin/GleanerDeck';

export const metadata: Metadata = {
  title: 'Gleaner | MMS Admin',
  robots: { index: false, follow: false },
};

export default function GleanerPage() {
  return <GleanerDeck />;
}
