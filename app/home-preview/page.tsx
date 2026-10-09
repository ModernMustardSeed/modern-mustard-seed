import StorybookHome from '@/components/home/StorybookHome';
import { buildMetadata } from '@/lib/seo';

/** Preview of the storybook homepage before it replaces the live one. Not indexed. */
export const metadata = buildMetadata({
  title: 'Homepage Preview',
  description: 'A preview of the next Modern Mustard Seed homepage.',
  path: '/home-preview',
  noindex: true,
});

export default function HomePreview() {
  return <StorybookHome />;
}
