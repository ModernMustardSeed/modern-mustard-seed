import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd } from '@/lib/jsonld';
import WorldExperience from './WorldExperience';

const TITLE = 'The Mustard Seed World';
const DESC =
  'Scroll through a handmade claymation world of Modern Mustard Seed: a studio on the shore of Flathead Lake that builds custom apps, websites, and specialty AI tools in weeks, not months. Plant your seed and tell us what you want to grow.';

export const metadata = buildMetadata({
  title: TITLE,
  description: DESC,
  path: '/world',
  image: '/world/og.jpg',
});

export default function WorldPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE.url}/world#webpage`,
        url: `${SITE.url}/world`,
        name: `${TITLE} | ${SITE.name}`,
        description: DESC,
        isPartOf: { '@id': `${SITE.url}/#website` },
        about: { '@id': `${SITE.url}/#organization` },
        primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE.url}/world/og.jpg`, width: 1200, height: 630 },
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'h2'] },
        inLanguage: 'en-US',
      },
      {
        '@type': 'CreativeWork',
        '@id': `${SITE.url}/world#experience`,
        name: TITLE,
        creator: { '@id': `${SITE.url}/#organization` },
        author: { '@id': `${SITE.url}/#sarah` },
        description:
          'An interactive, scroll-driven claymation diorama of the Modern Mustard Seed studio on Flathead Lake in Kalispell, Montana. A brand experience that ends in a project intake.',
        keywords:
          'Modern Mustard Seed, claymation, scroll experience, Flathead Lake, AI studio, custom apps, websites, AI tools, Kalispell Montana',
        genre: 'Interactive brand experience',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
          { '@type': 'ListItem', position: 2, name: TITLE, item: `${SITE.url}/world` },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <WorldExperience />
    </>
  );
}
