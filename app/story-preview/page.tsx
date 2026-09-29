import type { Metadata } from 'next';
import StudioHome from '@/components/home/StudioHome';
import SandHero from '@/components/home/SandHero';
import GoldenHour from '@/components/home/GoldenHour';

/**
 * Private preview of the sand-writing hero (2026-09-29). Not linked, not
 * indexed. When Sarah approves it, SandHero replaces RivieraHero on the
 * homepage and this route is deleted.
 */
export const metadata: Metadata = { title: 'Story hero preview', robots: { index: false, follow: false } };

export default function StoryPreview() {
  return <StudioHome faq={[]} hero={<SandHero />} afterHero={<GoldenHour />} />;
}
