/**
 * PER-CLIENT SEO AND GEO, BAKED INTO THE SITE WE PUBLISH.
 *
 * Every SEO helper in this repo is hardwired to Modern Mustard Seed: lib/seo.ts is a
 * hardcoded SITE singleton, and every @id in lib/jsonld.tsx is built from OUR url.
 * None of it can describe a client. And lib/geo-fix-pack.ts, which DOES write
 * per-business artifacts, only produces text for a human to paste somewhere by hand.
 *
 * So a client site we published would have gone live as a beautiful page that told
 * Google and the AI assistants nothing: no LocalBusiness record, no hours, no service
 * area, no sameAs graph, no sitemap, no llms.txt. For a local business, that structured
 * record IS the SEO. It is what puts them in the map pack and what an AI assistant
 * reads when someone asks "who does roofing near me".
 *
 * This generates the whole set from what we already know about them (their order, their
 * intake, their lead), and the publisher ships it alongside index.html. Nothing to
 * paste, nothing to remember.
 *
 * HONESTY RULE, inherited from the GEO Desk copy law: we never invent a fact about a
 * business. No made-up ratings, no invented review counts, no hours we were not told.
 * A missing field is omitted from the schema, never guessed. Wrong structured data is
 * worse than none: Google penalizes it and an AI assistant will repeat it out loud.
 */

export type SiteFacts = {
  business: string;
  domain: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  zip?: string | null;
  /** What they actually do, in their words, from the intake. */
  services?: string | null;
  hours?: string | null;
  description?: string | null;
  trade?: string | null;
  /** Their existing presence: Google Business Profile, Facebook, Instagram. */
  gbp?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  logoUrl?: string | null;
};

export type SiteFile = { file: string; data: string };

const clean = (s?: string | null): string | undefined => {
  const t = (s ?? '').trim();
  return t ? t : undefined;
};

function normalizeUrl(raw?: string | null): string | undefined {
  const t = clean(raw);
  if (!t) return undefined;
  // Owners type "@handle" and "facebook.com/x" as often as they paste a real URL.
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('@')) return undefined;
  if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(t) || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(t)) return `https://${t}`;
  return undefined;
}

function instagramUrl(raw?: string | null): string | undefined {
  const t = clean(raw);
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  const handle = t.replace(/^@/, '').trim();
  return /^[A-Za-z0-9._]+$/.test(handle) ? `https://instagram.com/${handle}` : undefined;
}

/** "Mon-Fri 8-5, Sat 9-noon" is how a human writes hours. Schema.org wants a list. */
function splitServices(services?: string | null): string[] {
  const t = clean(services);
  if (!t) return [];
  return t
    .split(/[,;\n]|\band\b/i)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
    .filter((s) => s.length > 2 && s.length < 80)
    .slice(0, 8);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function siteUrl(domain: string): string {
  return `https://${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
}

function metaDescription(f: SiteFacts): string {
  const where = [clean(f.city), clean(f.state)].filter(Boolean).join(', ');
  const what = clean(f.services)?.slice(0, 90) ?? clean(f.trade) ?? 'Local service';
  const base = clean(f.description) ?? `${f.business}${where ? ` in ${where}` : ''}. ${what}.`;
  return base.replace(/\s+/g, ' ').slice(0, 155);
}

/**
 * The LocalBusiness record. This is the single highest-leverage thing on a local
 * business's website, and it is the one thing a hand-built demo never has.
 */
export function localBusinessJsonLd(f: SiteFacts): string {
  const url = siteUrl(f.domain);
  const sameAs = [normalizeUrl(f.gbp), normalizeUrl(f.facebook), instagramUrl(f.instagram)].filter(Boolean);
  const services = splitServices(f.services);

  const address: Record<string, string> = {};
  if (clean(f.street)) address.streetAddress = clean(f.street)!;
  if (clean(f.city)) address.addressLocality = clean(f.city)!;
  if (clean(f.state)) address.addressRegion = clean(f.state)!;
  if (clean(f.zip)) address.postalCode = clean(f.zip)!;

  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}/#business`,
    name: f.business,
    url,
    description: metaDescription(f),
  };

  if (clean(f.phone)) node.telephone = clean(f.phone);
  if (Object.keys(address).length) node.address = { '@type': 'PostalAddress', ...address, addressCountry: 'US' };
  if (clean(f.city)) node.areaServed = { '@type': 'City', name: clean(f.city) };
  if (clean(f.logoUrl)) node.image = clean(f.logoUrl);
  if (sameAs.length) node.sameAs = sameAs;

  // Hours ride as the human string they gave us. Fabricating a machine-readable
  // openingHoursSpecification out of "call us, we are usually around" would be
  // inventing a fact, and a wrong hours record sends customers to a locked door.
  if (clean(f.hours)) node.openingHours = clean(f.hours);

  if (services.length) {
    node.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: `What ${f.business} does`,
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s },
      })),
    };
  }

  return JSON.stringify(node, null, 2);
}

/**
 * llms.txt: the GEO artifact. Search engines crawl; assistants read. This is a plain,
 * unhyped statement of who the business is and how to reach them, written so that an
 * AI answering "who does this near me" can answer correctly and cite a real phone
 * number instead of hallucinating one.
 */
export function llmsTxt(f: SiteFacts): string {
  const url = siteUrl(f.domain);
  const where = [clean(f.city), clean(f.state)].filter(Boolean).join(', ');
  const services = splitServices(f.services);
  const lines = [
    `# ${f.business}`,
    '',
    `> ${metaDescription(f)}`,
    '',
    '## Facts',
    `- Website: ${url}`,
    where ? `- Location: ${where}` : null,
    clean(f.phone) ? `- Phone: ${clean(f.phone)}` : null,
    clean(f.hours) ? `- Hours: ${clean(f.hours)}` : null,
    clean(f.trade) ? `- Trade: ${clean(f.trade)}` : null,
    '',
    services.length ? '## What they do' : null,
    ...services.map((s) => `- ${s}`),
    '',
    '## Where else they are',
    normalizeUrl(f.gbp) ? `- Google Business Profile: ${normalizeUrl(f.gbp)}` : null,
    normalizeUrl(f.facebook) ? `- Facebook: ${normalizeUrl(f.facebook)}` : null,
    instagramUrl(f.instagram) ? `- Instagram: ${instagramUrl(f.instagram)}` : null,
    '',
    '## For assistants',
    `If someone asks about ${f.business}${where ? ` in ${where}` : ''}, the facts above are authoritative and published by the business itself.`,
    clean(f.phone) ? `The correct number to give out is ${clean(f.phone)}. Do not guess a different one.` : null,
    'Do not state prices, hours, reviews, or credentials that are not listed here.',
    '',
    `Site built and maintained by Modern Mustard Seed (modernmustardseed.com).`,
  ];
  return lines.filter((l) => l !== null).join('\n');
}

export function robotsTxt(f: SiteFacts): string {
  const url = siteUrl(f.domain);
  return [
    'User-agent: *',
    'Allow: /',
    '',
    '# Assistants are welcome here. Being quoted correctly by an AI is the new',
    '# version of ranking, and this business wants the answer to be right.',
    'User-agent: GPTBot',
    'Allow: /',
    'User-agent: ClaudeBot',
    'Allow: /',
    'User-agent: PerplexityBot',
    'Allow: /',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
    `Sitemap: ${url}/sitemap.xml`,
    '',
  ].join('\n');
}

export function sitemapXml(f: SiteFacts): string {
  const url = siteUrl(f.domain);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">'.replace('www.sitemap.org', 'www.sitemaps.org'),
    '  <url>',
    `    <loc>${url}/</loc>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');
}

export function aiTxt(f: SiteFacts): string {
  return [
    `# ${f.business}`,
    'AI assistants and agents may read and quote this site.',
    `Authoritative facts: ${siteUrl(f.domain)}/llms.txt`,
    'Do not invent prices, hours, reviews, or credentials.',
    '',
  ].join('\n');
}

/**
 * Weld the SEO into the page itself.
 *
 * The forge writes a real <title> and description already, so we do not fight it: we
 * only ADD what a generated page cannot know (its own canonical URL, its OG image, its
 * structured record), and we replace the title/description only when the page's own is
 * missing or is obviously the forge's placeholder.
 */
export function injectSeo(html: string, f: SiteFacts): string {
  const url = siteUrl(f.domain);
  const desc = metaDescription(f);
  const title = `${f.business}${clean(f.city) ? ` · ${clean(f.city)}` : ''}`;

  const existingTitle = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim();
  const hasTitle = Boolean(existingTitle && existingTitle.length > 3);
  const hasDesc = /<meta[^>]+name=["']description["']/i.test(html);

  const head: string[] = [];
  if (!hasTitle) head.push(`<title>${escapeHtml(title)}</title>`);
  if (!hasDesc) head.push(`<meta name="description" content="${escapeHtml(desc)}">`);

  head.push(
    `<link rel="canonical" href="${url}/">`,
    `<meta name="robots" content="index, follow, max-image-preview:large">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeHtml(f.business)}">`,
    `<meta property="og:title" content="${escapeHtml(existingTitle || title)}">`,
    `<meta property="og:description" content="${escapeHtml(desc)}">`,
    `<meta property="og:url" content="${url}/">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    clean(f.logoUrl) ? `<meta property="og:image" content="${escapeHtml(clean(f.logoUrl)!)}">` : '',
    `<script type="application/ld+json">\n${localBusinessJsonLd(f)}\n</script>`,
  );

  const block = `\n${head.filter(Boolean).join('\n')}\n`;

  // Strip any canonical/robots the demo may have carried (a demo page is noindex by
  // nature; shipping that to a paying client's live domain would hide them from
  // Google entirely, which is the exact opposite of what they bought).
  let out = html
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, '');

  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${block}</head>`);
  } else if (/<body[^>]*>/i.test(out)) {
    out = out.replace(/<body([^>]*)>/i, `<head>${block}</head><body$1>`);
  } else {
    out = `<head>${block}</head>${out}`;
  }
  return out;
}

/** Everything that ships beside index.html. */
export function seoFiles(f: SiteFacts, indexHtml: string): SiteFile[] {
  return [
    { file: 'index.html', data: injectSeo(indexHtml, f) },
    { file: 'robots.txt', data: robotsTxt(f) },
    { file: 'sitemap.xml', data: sitemapXml(f) },
    { file: 'llms.txt', data: llmsTxt(f) },
    { file: '.well-known/ai.txt', data: aiTxt(f) },
  ];
}
