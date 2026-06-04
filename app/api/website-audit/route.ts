import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { parse } from 'node-html-parser';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the senior website auditor for Modern Mustard Seed, a one-person product studio in Kalispell, Montana. You judge websites the way Sarah Scarano would: honest, direct, no hedging, no buzzword soup, no em dashes, plain words.

You grade websites across 7 categories, returning a 0-100 score and a letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D, F) per category, plus an overall score, an honest headline, a 2-3 paragraph overall analysis, three top fixes, and a prioritized 10-15 item to-do list.

# The 7 categories

1. **Brand**. Name and tagline clarity. Value proposition. Voice. Visual coherence. Does a stranger know what this business does in 3 seconds.

2. **Trust**. Testimonials, social proof, real names, real photos, About page, contact information, privacy and terms, security signals, named clients, press, awards.

3. **SEO**. Title tag, meta description, H1 hierarchy, structured data (JSON-LD), canonical URLs, robots.txt, sitemap.xml, alt text on images, internal linking, content depth.

4. **GEO (AI search)**. The next frontier. llms.txt presence, /.well-known/ai.txt, FAQ schema, citable claims, named brand mentions in content, structured Q&A blocks, content that LLMs can quote verbatim. Most sites score F here. Sarah's own site (modernmustardseed.com) is a reference example.

5. **AI features**. Embedded chatbot, voice agent, personalization, dynamic content, AI-powered search, AI-augmented forms. Zero presence is the default.

6. **Conversion**. Primary CTA clarity. Hero CTA above the fold. Form simplicity. Friction. Urgency. Lead capture. Pricing visibility. Trust + commerce ratio.

7. **Design**. Typography. Color hierarchy. Whitespace. Mobile responsiveness implied by viewport meta and CSS. Visual rhythm. Modern feel.

# Voice and tone for the output

- No em dashes. Periods, commas, parentheses only.
- Direct. "The hero is weak" not "the hero could be stronger".
- Specific. "Your H1 reads 'Welcome'" not "the headline lacks impact".
- Encouraging but honest. Visitor needs to know what to fix, not feel bad.
- "You" not "the user" or "they".

# Scoring rubric

A range (90-100): elite, almost nothing to add.
B range (80-89): strong, a few specific gaps.
C range (70-79): solid baseline, multiple meaningful gaps.
D range (60-69): below average, foundational issues.
F (0-59): broken or missing the basics.

# The three top fixes

These are the highest-leverage moves the visitor can make. Order by impact, not alphabet. Each one has a title (3-7 words), a why (one sentence), and a how (one to two sentences with specifics).

# Full to-do list

10 to 15 items. Each carries a category, priority (high/medium/low), and a specific task. Order top to bottom by priority.

# Headline

One sentence. Honest. Memorable. Quotable. Examples:
- "Beautiful brand. Weak SEO foundation. Zero GEO."
- "Strong copy, missing trust signals, no chatbot."
- "Almost there. Three fixes from an A."

Return JSON matching the schema exactly. Nothing else.`;

const CATEGORY_SCHEMA = {
  type: 'object' as const,
  properties: {
    score: { type: 'number' },
    letter: {
      type: 'string',
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    },
    notes: { type: 'string' },
  },
  required: ['score', 'letter', 'notes'],
  additionalProperties: false,
};

const REPORT_SCHEMA = {
  type: 'object' as const,
  properties: {
    overall_score: { type: 'number' },
    letter_grade: {
      type: 'string',
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    },
    headline: { type: 'string' },
    overall_analysis: { type: 'string' },
    categories: {
      type: 'object' as const,
      properties: {
        brand: CATEGORY_SCHEMA,
        trust: CATEGORY_SCHEMA,
        seo: CATEGORY_SCHEMA,
        geo: CATEGORY_SCHEMA,
        ai_features: CATEGORY_SCHEMA,
        conversion: CATEGORY_SCHEMA,
        design: CATEGORY_SCHEMA,
      },
      required: ['brand', 'trust', 'seo', 'geo', 'ai_features', 'conversion', 'design'],
      additionalProperties: false,
    },
    top_three_fixes: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          how: { type: 'string' },
        },
        required: ['title', 'why', 'how'],
        additionalProperties: false,
      },
    },
    full_todo: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          category: {
            type: 'string',
            enum: ['brand', 'trust', 'seo', 'geo', 'ai_features', 'conversion', 'design'],
          },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          task: { type: 'string' },
        },
        required: ['category', 'priority', 'task'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'overall_score',
    'letter_grade',
    'headline',
    'overall_analysis',
    'categories',
    'top_three_fixes',
    'full_todo',
  ],
  additionalProperties: false,
};

type Signals = {
  url: string;
  status: number;
  title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  meta_robots: string | null;
  viewport: string | null;
  canonical: string | null;
  h1_texts: string[];
  h1_count: number;
  h2_count: number;
  h3_count: number;
  og_tags: Record<string, string | null>;
  twitter_tags: Record<string, string | null>;
  json_ld_count: number;
  json_ld_types: string[];
  img_count: number;
  img_missing_alt: number;
  form_count: number;
  iframe_count: number;
  link_count: number;
  external_link_count: number;
  body_text_snippet: string | null;
  script_srcs: string[];
  has_chat_widget_hint: boolean;
  has_analytics: boolean;
  aux: {
    llms_txt: boolean;
    ai_txt: boolean;
    robots_txt: boolean;
    sitemap_xml: boolean;
  };
};

async function fetchAuxFile(origin: string, path: string): Promise<boolean> {
  try {
    const resp = await fetch(`${origin}${path}`, {
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });
    return resp.ok;
  } catch {
    return false;
  }
}

function extractSignals(url: URL, html: string, status: number): Signals {
  const root = parse(html, { lowerCaseTagName: true });
  const headOf = (sel: string) => root.querySelector(sel);
  const allOf = (sel: string) => root.querySelectorAll(sel);

  const ogTags: Record<string, string | null> = {};
  for (const m of allOf('meta[property^="og:"]')) {
    const k = m.getAttribute('property');
    if (k) ogTags[k] = m.getAttribute('content') ?? null;
  }
  const twTags: Record<string, string | null> = {};
  for (const m of allOf('meta[name^="twitter:"]')) {
    const k = m.getAttribute('name');
    if (k) twTags[k] = m.getAttribute('content') ?? null;
  }

  const jsonLdTypes: string[] = [];
  for (const s of allOf('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(s.text);
      if (Array.isArray(parsed)) {
        for (const p of parsed) if (p?.['@type']) jsonLdTypes.push(String(p['@type']));
      } else if (parsed?.['@graph']) {
        for (const p of parsed['@graph']) if (p?.['@type']) jsonLdTypes.push(String(p['@type']));
      } else if (parsed?.['@type']) {
        jsonLdTypes.push(String(parsed['@type']));
      }
    } catch {
      // skip malformed JSON-LD
    }
  }

  const imgs = allOf('img');
  const links = allOf('a');
  const externalLinks = links.filter((a) => {
    const href = a.getAttribute('href') ?? '';
    return href.startsWith('http') && !href.includes(url.hostname);
  });
  const scriptSrcs = allOf('script[src]')
    .map((s) => s.getAttribute('src') ?? '')
    .filter(Boolean)
    .slice(0, 30);

  const chatHints = ['intercom', 'crisp', 'tawk', 'tidio', 'drift', 'hubspot', 'zendesk', 'mustard-seed', 'chatbot', 'livechat'];
  const analyticsHints = ['gtag', 'googletagmanager', 'analytics', 'segment', 'mixpanel', 'amplitude', 'plausible', 'fathom', 'umami', 'vercel'];

  return {
    url: url.toString(),
    status,
    title: headOf('title')?.text?.trim()?.slice(0, 300) ?? null,
    meta_description: headOf('meta[name="description"]')?.getAttribute('content')?.slice(0, 500) ?? null,
    meta_keywords: headOf('meta[name="keywords"]')?.getAttribute('content')?.slice(0, 300) ?? null,
    meta_robots: headOf('meta[name="robots"]')?.getAttribute('content') ?? null,
    viewport: headOf('meta[name="viewport"]')?.getAttribute('content') ?? null,
    canonical: headOf('link[rel="canonical"]')?.getAttribute('href') ?? null,
    h1_texts: allOf('h1').slice(0, 3).map((h) => h.text.trim().slice(0, 180)),
    h1_count: allOf('h1').length,
    h2_count: allOf('h2').length,
    h3_count: allOf('h3').length,
    og_tags: ogTags,
    twitter_tags: twTags,
    json_ld_count: allOf('script[type="application/ld+json"]').length,
    json_ld_types: Array.from(new Set(jsonLdTypes)).slice(0, 20),
    img_count: imgs.length,
    img_missing_alt: imgs.filter((i) => !i.getAttribute('alt')).length,
    form_count: allOf('form').length,
    iframe_count: allOf('iframe').length,
    link_count: links.length,
    external_link_count: externalLinks.length,
    body_text_snippet: root.querySelector('body')?.text?.trim()?.replace(/\s+/g, ' ')?.slice(0, 5000) ?? null,
    script_srcs: scriptSrcs,
    has_chat_widget_hint: scriptSrcs.some((s) => chatHints.some((h) => s.toLowerCase().includes(h))),
    has_analytics: scriptSrcs.some((s) => analyticsHints.some((h) => s.toLowerCase().includes(h))),
    aux: { llms_txt: false, ai_txt: false, robots_txt: false, sitemap_xml: false },
  };
}

export async function POST(req: Request) {
  try {
    // Trim defensively: a stray newline or literal "\n" pasted into the env var
    // produces an "invalid x-api-key" 401, which is easy to miss.
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/\\n$/, '');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Audit is not configured. Email sarah@modernmustardseed.com.' },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { url?: string };
    let raw = (body.url ?? '').trim();
    if (!raw) {
      return NextResponse.json({ error: 'Drop your website URL.' }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return NextResponse.json({ error: 'That URL is not valid.' }, { status: 400 });
    }

    let pageResp: Response;
    try {
      pageResp = await fetch(target.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; MMS-WebsiteAudit/1.0; +https://modernmustardseed.com/website-audit)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      return NextResponse.json(
        { error: 'Could not load that URL. Check it works in a browser and try again.' },
        { status: 400 }
      );
    }

    if (!pageResp.ok) {
      return NextResponse.json(
        { error: `That URL returned HTTP ${pageResp.status}. Check it and try again.` },
        { status: 400 }
      );
    }

    const html = (await pageResp.text()).slice(0, 250_000);

    const [llmsTxt, aiTxt, robotsTxt, sitemapXml] = await Promise.all([
      fetchAuxFile(target.origin, '/llms.txt'),
      fetchAuxFile(target.origin, '/.well-known/ai.txt'),
      fetchAuxFile(target.origin, '/robots.txt'),
      fetchAuxFile(target.origin, '/sitemap.xml'),
    ]);

    const signals = extractSignals(target, html, pageResp.status);
    signals.aux = { llms_txt: llmsTxt, ai_txt: aiTxt, robots_txt: robotsTxt, sitemap_xml: sitemapXml };

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8000,
      output_config: {
        effort: 'high',
        format: { type: 'json_schema' as const, schema: REPORT_SCHEMA },
      },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Audit this website. Use the extracted signals to inform every category score. Be specific. Reference what you actually see.

URL: ${target.toString()}

Extracted signals (truncated):
${JSON.stringify(signals, null, 2)}

Return the JSON report.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Audit failed to generate a report.' }, { status: 500 });
    }

    let report: {
      top_three_fixes?: unknown[];
      full_todo?: unknown[];
      [key: string]: unknown;
    };
    try {
      report = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json({ error: 'Audit returned malformed JSON.' }, { status: 500 });
    }

    // The schema can no longer enforce item counts (structured outputs rejects
    // minItems/maxItems), so trim to the promised shape here.
    if (Array.isArray(report.top_three_fixes)) {
      report.top_three_fixes = report.top_three_fixes.slice(0, 3);
    }
    if (Array.isArray(report.full_todo)) {
      report.full_todo = report.full_todo.slice(0, 15);
    }

    return NextResponse.json({
      ok: true,
      url: target.toString(),
      report,
      signals_summary: {
        title: signals.title,
        h1: signals.h1_texts[0] ?? null,
        json_ld_count: signals.json_ld_count,
        llms_txt: signals.aux.llms_txt,
        ai_txt: signals.aux.ai_txt,
        has_chat_widget: signals.has_chat_widget_hint,
        img_missing_alt: signals.img_missing_alt,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'Audit is busy. Try again in a moment.' },
        { status: 429 }
      );
    }
    // Distinguish the failure mode so the next issue surfaces fast in logs.
    if (err instanceof Anthropic.APIError) {
      const kind =
        err.status === 401
          ? 'auth (invalid x-api-key)'
          : err.status === 400
            ? 'bad request (likely schema)'
            : `status ${err.status}`;
      console.error(`website-audit: anthropic ${kind}:`, err.message);
    } else {
      console.error('website-audit: unexpected error', err);
    }
    return NextResponse.json(
      { error: 'Audit hit a snag. Try again or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
