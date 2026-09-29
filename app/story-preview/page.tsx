import type { Metadata } from 'next';
import StudioHome from '@/components/home/StudioHome';
import StoryHero from '@/components/home/StoryHero';

/**
 * Private preview of the scroll-story hero (2026-09-29). Not linked, not
 * indexed. When Sarah approves it, StoryHero replaces RivieraHero on the
 * homepage and this route is deleted.
 */
export const metadata: Metadata = { title: 'Story hero preview', robots: { index: false, follow: false } };

export default function StoryPreview() {
  return <StudioHome faq={[]} hero={<StoryHero />} />;
}
