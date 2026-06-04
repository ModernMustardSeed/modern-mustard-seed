import { NextResponse } from 'next/server';
import { parse } from 'node-html-parser';
import { captureHarvestInbound } from '@/lib/harvest-capture';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Trim defensively: a stray newline or literal "\n" pasted into the env var
// produces a silent 401, which is easy to miss.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim().replace(/\\n$/, '');

// Fetch the real page and pull the signals that matter for an AI-readiness read.
// Best-effort: returns null if the page cannot be loaded, so the audit still
// runs (degrading to URL inference) rather than failing outright.
async function fetchPageContext(rawUrl: string): Promise<string | null> {
  let target: URL;
  try {
    target = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    return null;
  }

  let html: string;
  try {
    const resp = await fetch(target.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MMS-Audit/1.0; +https://modernmustardseed.com/audit)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) return null;
    html = (await resp.text()).slice(0, 200_000);
  } catch {
    return null;
  }

  const root = parse(html, { lowerCaseTagName: true });
  const all = (sel: string) => root.querySelectorAll(sel);
  const text = (sel: string) => root.querySelector(sel)?.text?.trim() ?? null;
  const attr = (sel: string, a: string) => root.querySelector(sel)?.getAttribute(a) ?? null;

  const scriptSrcs = all('script[src]').map((s) => s.getAttribute('src') ?? '').filter(Boolean);
  const chatHints = ['intercom', 'crisp', 'tawk', 'tidio', 'drift', 'hubspot', 'zendesk', 'chatbot', 'livechat'];
  const analyticsHints = ['gtag', 'googletagmanager', 'analytics', 'segment', 'mixpanel', 'plausible', 'fathom'];
  const imgs = all('img');

  const signals = {
    url: target.toString(),
    title: text('title')?.slice(0, 300) ?? null,
    meta_description: attr('meta[name="description"]', 'content')?.slice(0, 400) ?? null,
    h1: all('h1').slice(0, 3).map((h) => h.text.trim().slice(0, 160)),
    h1_count: all('h1').length,
    h2_count: all('h2').length,
    has_json_ld: all('script[type="application/ld+json"]').length > 0,
    img_count: imgs.length,
    img_missing_alt: imgs.filter((i) => !i.getAttribute('alt')).length,
    form_count: all('form').length,
    has_chat_widget: scriptSrcs.some((s) => chatHints.some((h) => s.toLowerCase().includes(h))),
    has_analytics: scriptSrcs.some((s) => analyticsHints.some((h) => s.toLowerCase().includes(h))),
    body_text: root.querySelector('body')?.text?.replace(/\s+/g, ' ').trim().slice(0, 4000) ?? null,
  };

  return JSON.stringify(signals, null, 2);
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: true, message: 'URL is required' }, { status: 400 });
    }

    // Harvest Module 0: capture the submission as a pre-qualified inbound lead.
    // Best-effort, never blocks or breaks the audit response.
    await captureHarvestInbound({ url });

    if (!ANTHROPIC_API_KEY) {
      console.error('audit: ANTHROPIC_API_KEY is not set');
      return NextResponse.json(
        { error: true, message: 'The audit is not configured yet. Sarah has been notified.' },
        { status: 500 }
      );
    }

    // Pull the real page so the analysis is grounded, not guessed from the URL.
    const pageContext = await fetchPageContext(url);
    const groundingBlock = pageContext
      ? `Here is what was actually fetched from the page. Ground every score, strength, gap, and recommendation in this real content. If an important signal is absent (no chat widget, no structured data, missing alt text, thin copy), that absence is itself a finding.

Fetched page signals:
${pageContext}`
      : `The live page could not be fetched, so infer cautiously from the URL alone and keep the score conservative.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `You are an expert AI integration consultant performing a rapid website audit for this business: ${url}

${groundingBlock}

Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble) with this exact structure:
{
  "businessName": "inferred business name",
  "industry": "detected industry",
  "score": 72,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "gaps": ["gap 1", "gap 2", "gap 3", "gap 4"],
  "topTools": [
    {"name": "Tool Name", "impact": 92, "reason": "why this tool matters"},
    {"name": "Tool Name", "impact": 87, "reason": "why this tool matters"},
    {"name": "Tool Name", "impact": 84, "reason": "why this tool matters"},
    {"name": "Tool Name", "impact": 80, "reason": "why this tool matters"},
    {"name": "Tool Name", "impact": 76, "reason": "why this tool matters"}
  ],
  "monthlyTimeSaved": 35,
  "estimatedROI": 18000,
  "quickWins": ["quick win 1", "quick win 2", "quick win 3"],
  "competitiveEdge": "One sentence about how AI gives them an edge over competitors",
  "riskOfInaction": "One sentence about what happens if they don't adopt AI"
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      // Distinguish the failure mode so the next issue surfaces fast in logs.
      const kind =
        response.status === 401
          ? 'auth (invalid x-api-key)'
          : response.status === 429
            ? 'rate limit'
            : response.status >= 500
              ? 'anthropic server error'
              : 'bad request';
      console.error(`audit: anthropic ${response.status} (${kind}) ${detail.slice(0, 300)}`);
      const message =
        response.status === 429
          ? 'The audit is busy right now. Try again in a moment.'
          : 'The audit could not be generated right now. Your details are saved and Sarah will follow up.';
      return NextResponse.json({ error: true, message }, { status: 502 });
    }

    const data = await response.json();
    const text = (data.content || []).map((c: { text?: string }) => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();

    let result: unknown;
    try {
      result = JSON.parse(clean);
    } catch {
      console.error('audit: model returned unparseable JSON:', clean.slice(0, 300));
      return NextResponse.json(
        { error: true, message: 'The audit returned an unreadable response. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('audit: unexpected error', err);
    return NextResponse.json(
      { error: true, message: 'The audit hit a snag. Please try again or book a call.' },
      { status: 500 }
    );
  }
}
