import type { Metadata } from 'next';
import StudioHome from '@/components/home/StudioHome';
import Paper3DHero from '@/components/home/Paper3DHero';

/**
 * Private preview of the paper Riviera in real 3D (2026-10-01). Not linked,
 * not indexed. When Sarah approves it, Paper3DHero replaces PaperHero on the
 * homepage and this route is deleted.
 */
export const metadata: Metadata = { title: 'Hero preview', robots: { index: false, follow: false } };

export default function LabPreview() {
  return <StudioHome faq={[]} hero={<Paper3DHero />} />;
}
