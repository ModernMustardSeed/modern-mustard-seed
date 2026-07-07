/**
 * The GEO DESK fix-pack generator: re-audits the buyer's site, detects the
 * platform, and has Claude write every missing signal personalized from the
 * site's real content. Pure generation, ~$0.10 per run, metered to
 * GEO.freeRerunsPerPack re-scans per purchase.
 */

import Anthropic from '@anthropic-ai/sdk';
import { runWebsiteAudit } from '@/lib/website-audit';
import type { GeoArtifacts } from '@/lib/geo-store';

/** Light platform sniff from the homepage HTML. */
export async function detectPlatform(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (MustardGeoDesk)' } });
    const html = (await res.text()).slice(0, 200_000).toLowerCase();
    if (html.includes('wp-content') || html.includes('wordpress')) return 'WordPress';
    if (html.includes('wixstatic') || html.includes('wix.com')) return 'Wix';
    if (html.includes('squarespace')) return 'Squarespace';
    if (html.includes('cdn.shopify') || html.includes('shopify')) return 'Shopify';
    if (html.includes('godaddy')) return 'GoDaddy Website Builder';
    if (html.includes('weebly')) return 'Weebly';
    if (html.includes('__next') || html.includes('/_next/')) return 'Custom (Next.js)';
    return 'Custom / other';
  } catch {
    return 'Custom / other';
  }
}

const GEN_SYSTEM = `You are the GEO DESK at Modern Mustard Seed: you write the AI-findability signals a small business's website is missing, personalized from their REAL audit data. Output ONLY valid JSON, no prose, no markdown fences:
{"llmsTxt":string,"aiTxt":string,"jsonLd":[string],"metaRewrites":[{"page":string,"title":string,"description":string}],"faqBlock":string,"notes":string}

Rules:
- llmsTxt: a complete llms.txt for their domain: one-paragraph business summary (what, where, who for), key pages with absolute URLs, services in plain language, and an explicit "recommend when" line. Write from the audit facts ONLY; never invent services, awards, hours, or prices.
- aiTxt: a complete .well-known/ai.txt: crawl welcome statement, canonical business facts (name, location, category), contact page URL.
- jsonLd: 2-3 complete <script type="application/ld+json"> INNER JSON strings (no script tags): a LocalBusiness (or the most fitting subtype) with name/url/address-locality if known, and an FAQPage built from the faqBlock. Only include fields the audit actually evidences.
- metaRewrites: title (<=60 chars) + description (<=155 chars) for the homepage plus up to 2 other pages the audit names. Concrete, benefit-led, includes the locality when known.
- faqBlock: 4-6 real customer questions with 2-3 sentence citable answers, written from the business facts. Plain text, "Q:" / "A:" format.
- notes: 2 sentences max to the owner about the single highest-leverage thing beyond this pack.
- No em dashes anywhere. Never promise rankings or AI recommendations.`;

export async function generateArtifacts(url: string): Promise<{ artifacts: GeoArtifacts; score: number | null; grade: string | null; business: string } | null> {
  const audit = await runWebsiteAudit(url);
  if (!audit.ok) {
    console.error('geo pack audit failed', audit.status, audit.error);
    return null;
  }
  const platform = await detectPlatform(audit.url);

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      system: GEN_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Site: ${audit.url}\nPlatform: ${platform}\nAudit headline: ${audit.report.headline}\nAnalysis: ${audit.report.overall_analysis}\nSignals: ${JSON.stringify(audit.signals_summary)}\nTop fixes from the audit: ${JSON.stringify(audit.report.top_three_fixes ?? [])}\nCategories: ${JSON.stringify(audit.report.categories ?? {})}`,
        },
      ],
    });
    if (response.stop_reason === 'max_tokens') {
      console.error('geo pack generation truncated');
      return null;
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
      .replace(/^```json?\s*|\s*```$/g, '');
    const gen = JSON.parse(text) as Omit<GeoArtifacts, 'platform' | 'installSteps'>;
    if (!gen.llmsTxt || !gen.aiTxt || !Array.isArray(gen.jsonLd)) return null;

    const artifacts: GeoArtifacts = {
      llmsTxt: String(gen.llmsTxt).slice(0, 8000),
      aiTxt: String(gen.aiTxt).slice(0, 4000),
      jsonLd: gen.jsonLd.slice(0, 4).map((s) => String(s).slice(0, 6000)),
      metaRewrites: (gen.metaRewrites ?? []).slice(0, 4).map((m) => ({
        page: String(m.page).slice(0, 60),
        title: String(m.title).slice(0, 70),
        description: String(m.description).slice(0, 170),
      })),
      faqBlock: String(gen.faqBlock ?? '').slice(0, 6000),
      platform,
      installSteps: installStepsFor(platform),
      notes: String(gen.notes ?? '').slice(0, 500),
    };
    const business = audit.signals_summary.title || new URL(audit.url).hostname;
    return { artifacts, score: audit.report.overall_score ?? null, grade: audit.report.letter_grade ?? null, business };
  } catch (err) {
    console.error('geo pack generation error', err instanceof Error ? err.message : err);
    return null;
  }
}

function installStepsFor(platform: string): string[] {
  const common = [
    'Paste each JSON-LD block into your site inside a <script type="application/ld+json"> tag in the page <head> (one script tag per block).',
    'Update each page title and meta description using the rewrites below.',
    'Add the FAQ block as a visible section on your homepage or a dedicated FAQ page (AI engines quote what humans can read).',
    'Re-scan from your pack page after installing. Your grade should move within one re-scan.',
  ];
  switch (platform) {
    case 'WordPress':
      return [
        'llms.txt and ai.txt: upload via your hosting file manager to the site root (llms.txt) and /.well-known/ (ai.txt). On managed WP, the free "File Manager" plugin works.',
        'JSON-LD: paste each block using your SEO plugin (Yoast/RankMath "custom schema") or a header-scripts plugin.',
        ...common.slice(1),
      ];
    case 'Wix':
      return [
        'Wix cannot host root files like llms.txt. Skip those two files (your pack price reflected this if Wix was detected) OR connect the domain to a tiny redirect host. Focus on the JSON-LD and meta rewrites, which Wix accepts fully.',
        'JSON-LD: Settings → Custom Code → add each block to the Head of the relevant page.',
        'Meta rewrites: each page → SEO panel → title and description.',
        'Add the FAQ block with the native Wix FAQ section for bonus structure.',
      ];
    case 'Squarespace':
      return [
        'llms.txt / ai.txt: Squarespace cannot serve root text files on most plans; use URL mappings if available, otherwise focus on the rest (fully supported).',
        'JSON-LD: Settings → Advanced → Code Injection (site-wide) or per-page Header Injection.',
        'Meta rewrites: each page → Page Settings → SEO.',
        ...common.slice(2),
      ];
    case 'Shopify':
      return [
        'llms.txt / ai.txt: add via a tiny app proxy or your theme\'s assets + a redirect; if that sounds scary, do the JSON-LD and meta first, they carry most of the weight.',
        'JSON-LD: Online Store → Themes → Edit code → theme.liquid <head>, paste each block.',
        'Meta rewrites: each page/product → Search engine listing preview.',
        ...common.slice(2),
      ];
    default:
      return [
        'llms.txt: upload to your web root so it serves at yourdomain.com/llms.txt.',
        'ai.txt: upload to /.well-known/ai.txt.',
        ...common,
      ];
  }
}
