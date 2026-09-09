import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { JsonLd, siteGraphJsonLd, ORG_ID, serviceJsonLd, breadcrumbJsonLd } from '../lib/jsonld';
import { buildMetadata, canonicalUrl, SITE } from '../lib/seo';
import sitemap from '../app/sitemap';
import robots from '../app/robots';
import { AI_RESOURCE_SLUGS } from '../data/ai-resources';
import { getContent } from '../lib/content';
import { attributionFrom, attributedHref, classifyAIReferrer } from '../lib/ai-attribution';

test('JSON-LD cannot close its script and preserves original string values', () => {
  const payload = { text: '</script><img src=x onerror=alert(1)>' };
  const markup = renderToStaticMarkup(<JsonLd data={payload} />);
  assert.equal((markup.match(/<script/g) ?? []).length, 1);
  assert.equal((markup.match(/<\/script>/g) ?? []).length, 1);
  assert.ok(!markup.includes('<img'));
  assert.deepEqual(JSON.parse(markup.replace(/^<script[^>]*>|<\/script>$/g, '')), payload);
});

test('the graph describes one business and services reference it', () => {
  const businesses = siteGraphJsonLd['@graph'].filter((item) => Array.isArray(item['@type']) && item['@type'].includes('LocalBusiness'));
  assert.equal(businesses.length, 1);
  assert.equal(businesses[0]['@id'], ORG_ID);
  const service = serviceJsonLd({ path: '/ai-websites', name: 'AI websites', description: SITE.description });
  assert.equal(service.provider['@id'], ORG_ID);
  assert.equal(service['@id'], `${SITE.url}/ai-websites#service`);
  assert.ok(!JSON.stringify(siteGraphJsonLd).includes('SearchAction'));
  assert.ok(!JSON.stringify(siteGraphJsonLd).includes('foundingDate'));
});

test('canonical normalization strips campaigns and fragments and rejects external hosts', () => {
  assert.equal(canonicalUrl('/ai-websites/?utm_source=chatgpt#prices'), `${SITE.url}/ai-websites`);
  assert.equal(canonicalUrl('/'), SITE.url);
  assert.throws(() => canonicalUrl('https://example.org/wrong'));
  assert.equal(breadcrumbJsonLd([{ name: 'Home', url: SITE.url }]).itemListElement[0].item, SITE.url);
  assert.equal(buildMetadata({ path: '/ai-websites?utm_source=test' }).alternates?.canonical, `${SITE.url}/ai-websites`);
});

test('sitemap contains public resources once and keeps operational routes out', () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);
  assert.equal(urls.length, new Set(urls).size);
  for (const path of ['/ai-websites', '/resources', '/montana/kalispell', ...AI_RESOURCE_SLUGS.map((slug) => `/blog/${slug}`)]) assert.ok(urls.includes(`${SITE.url}${path}`), path);
  for (const entry of entries) {
    assert.equal(canonicalUrl(entry.url), entry.url);
    assert.ok(!/\/(admin|portal|demo|proposal|pay)(\/|$)/.test(new URL(entry.url).pathname));
    if (entry.lastModified) assert.ok(Number.isFinite(new Date(entry.lastModified).getTime()));
  }
});

test('search-specific rules repeat exclusions without changing training settings', () => {
  const rules = robots().rules;
  assert.ok(Array.isArray(rules));
  const discovery = rules.find((rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes('OAI-SearchBot'));
  assert.ok(discovery);
  assert.equal(discovery.allow, '/');
  assert.deepEqual(discovery.disallow, ['/api/', '/admin/', '/portal/']);
  assert.ok(!JSON.stringify(rules).includes('GPTBot'));
});

test('editorial records have real dates, attribution and substantial content', () => {
  for (const slug of AI_RESOURCE_SLUGS) {
    const post = getContent('blog', slug);
    assert.ok(post && !post.meta.draft, slug);
    assert.equal(post.meta.author, SITE.founder);
    assert.ok(post.meta.wordCount > 450, `${slug}: ${post.meta.wordCount}`);
    assert.equal(post.meta.date, '2026-09-08');
    assert.ok(!post.body.includes('\u2014'));
  }
  assert.equal(getContent('blog', '../../package'), null);
});

test('AI referrers use hostname boundaries and distinguish UTMs from actual referrals', () => {
  assert.equal(classifyAIReferrer('https://chatgpt.com/c/123'), 'chatgpt');
  assert.equal(classifyAIReferrer('https://www.perplexity.ai/search/abc'), 'perplexity');
  assert.equal(classifyAIReferrer('https://chatgpt.com.attacker.example'), undefined);
  assert.equal(classifyAIReferrer('https://fakechatgpt.com'), undefined);
  assert.equal(classifyAIReferrer('not a URL'), undefined);
  assert.equal(attributionFrom(`${SITE.url}/ai-websites?utm_source=chatgpt`, '').ai_source_evidence, 'utm');
  assert.equal(attributionFrom(`${SITE.url}/ai-websites?utm_source=chatgpt`, 'https://perplexity.ai/').ai_source, 'perplexity');
  assert.equal(attributionFrom(`${SITE.url}/?email=private@example.com&utm_campaign=private@example.com`, '').campaign.utm_campaign, undefined);
});

test('campaign preservation respects existing parameters, fragments and protected destinations', () => {
  const context = attributionFrom(`${SITE.url}/ai-websites?utm_source=chatgpt&utm_campaign=field-notes`, '');
  assert.equal(attributedHref('/book?idea=roof#calendar', context), '/book?idea=roof&utm_source=chatgpt&utm_campaign=field-notes#calendar');
  assert.equal(attributedHref('/demos?utm_source=partner', context), '/demos?utm_source=partner&utm_campaign=field-notes');
  for (const path of ['/pay/site', '/portal', '/demo/hub/token', 'https://stripe.com/pay', '//example.com', 'tel:+14063121223']) assert.equal(attributedHref(path, context), path);
  assert.equal(attributedHref('/book'), '/book');
});
