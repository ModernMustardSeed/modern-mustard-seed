import MustardLifeComic from '@/components/comic/MustardLifeComic';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Mustard Life. The Family Business Issue',
  description:
    'A glossy magazine comic starring Mr. and Mrs. Mustard: how one family yachts, brunches, and premieres while AI staff answer the phones, build the websites, and run the ads. Every product, every price, printed in ink.',
  path: '/comic',
  image: '/comic/og.jpg',
});

const comicJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ComicStory',
  '@id': `${SITE.url}/comic#comic`,
  name: 'Mustard Life: The Family Business Issue',
  url: `${SITE.url}/comic`,
  description:
    'A magazine-style comic in which the Mustard family showcases every Modern Mustard Seed product: AI receptionists, websites, command centers, commercials, managed ads, print, launch coaching, GEO, franchise switchboards, mascots, and courses. With real prices and links.',
  author: { '@id': `${SITE.url}/#organization` },
  publisher: { '@id': `${SITE.url}/#organization` },
  image: `${SITE.url}/comic/og.jpg`,
  genre: 'Humor, Advertising',
  inLanguage: 'en-US',
  isAccessibleForFree: true,
};

const offerIndexJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Everything in this issue',
  itemListElement: [
    { name: 'The Sidekick Forge (AI receptionist)', url: `${SITE.url}/sidekick` },
    { name: 'The Demo Station (websites and command centers)', url: `${SITE.url}/demos` },
    { name: 'Mustard Pictures (commercials)', url: `${SITE.url}/pictures` },
    { name: 'Mustard Broadcast (managed ads)', url: `${SITE.url}/ads` },
    { name: 'Mustard Press (print)', url: `${SITE.url}/press` },
    { name: 'Mustard Launch (AI launch coach)', url: `${SITE.url}/mustard-launch` },
    { name: 'GEO Desk (AI findability)', url: `${SITE.url}/website-audit` },
    { name: 'The Switchboard (franchise concierge)', url: `${SITE.url}/switchboard` },
    { name: 'Mustard Hatchery (business mascots)', url: `${SITE.url}/hatchery` },
    { name: 'Mustard Mode (Claude coaching)', url: `${SITE.url}/mustard-mode` },
    { name: 'The Store (playbooks and courses)', url: `${SITE.url}/store` },
    { name: 'Custom builds', url: `${SITE.url}/services` },
    { name: 'Partner Program', url: `${SITE.url}/partners` },
  ].map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    url: item.url,
  })),
};

export default function ComicPage() {
  return (
    <>
      <JsonLd
        data={[
          comicJsonLd,
          offerIndexJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Mustard Life Comic', url: '/comic' },
          ]),
        ]}
      />
      <MustardLifeComic />
    </>
  );
}
