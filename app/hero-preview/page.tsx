import type { Metadata } from 'next';
import StudioHome from '@/components/home/StudioHome';
import CoverHero from '@/components/home/CoverHero';

/**
 * Private preview of the magazine-cover hero (2026-09-30). Not linked, not
 * indexed. When Sarah approves it, CoverHero replaces the sand story on the
 * homepage and this route is deleted.
 */
export const metadata: Metadata = { title: 'Hero preview', robots: { index: false, follow: false } };

export default function HeroPreview() {
  return <StudioHome faq={[]} hero={<CoverHero />} />;
}
