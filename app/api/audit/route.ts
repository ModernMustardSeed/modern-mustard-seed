import { NextResponse } from 'next/server';
import { parse } from 'node-html-parser';
import { captureHarvestInbound } from '@/lib/harvest-capture';
import { claimDailySpend, clientIp, ipAllowed } from '@/lib/spend-guard';
import { llmText, LlmUnavailable } from '@/lib/llm';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Spend guards for the Bottleneck Breaker. Cheaper per call than the full
 * website audit (sonnet-4-6, 1500 output tokens) but just as open: this route
 * is linked from the homepage and took a raw URL with no email and no throttle.
 */
const DAILY_CAP = Number(process.env.AUDIT_DAILY_CAP || 120);
const PER_IP_HOURLY = Number(process.env.AUDIT_IP_HOURLY || 5);

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

    // The lead is captured either way, so a throttled visitor still reaches
    // Sarah. What they do not get is another metered model call.
    if (!ipAllowed('audit', clientIp(req), PER_IP_HOURLY)) {
      return NextResponse.json(
        { error: true, message: 'You have run several audits already. Try again in an hour. Your details are saved and Sarah will follow up.' },
        { status: 429 },
      );
    }

    if (!(await claimDailySpend('audit', DAILY_CAP))) {
      return NextResponse.json(
        { error: true, message: 'The audit is at capacity for today. Your details are saved and Sarah will follow up.' },
        { status: 429 },
      );
    }

    // Pull the real page so the analysis is grounded, not guessed from the URL.
    const pageContext = await fetchPageContext(url);
    const groundingBlock = pageContext
      ? `Here is what was actually fetched from the page. Ground every score, strength, gap, and recommendation in this real content. If an important signal is absent (no chat widget, no structured data, missing alt text, thin copy), that absence is itself a finding.

Fetched page signals:
${pageContext}`
      : `The live page could not be fetched, so infer cautiously from the URL alone and keep the score conservative.`;

    const text = await llmText({
      label: 'bottleneck-audit',
      model: 'sonnet',
      system: 'You are the Bottleneck Breaker. Return only the JSON object you are asked for, with no preamble and no markdown fence.',
      timeoutMs: 45_000,
      user: `You are the Bottleneck Breaker, an expert operator who finds the single biggest bottleneck quietly costing a business the most, then the highest-leverage fixes (software and AI). Analyze this business: ${url}

${groundingBlock}

Lead with ONE sharp headline bottleneck: the single thing most worth fixing, named in plain, specific language a busy owner feels instantly (not jargon). The gaps, tools, and quick wins should all support breaking that bottleneck.

Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble) with this exact structure:
{
  "businessName": "inferred business name",
  "industry": "detected industry",
  "score": 72,
  "headlineBottleneck": "One sharp, specific sentence naming the #1 bottleneck, e.g. New leads wait hours for a reply and most go cold.",
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
    });

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
    // The lead was captured before a token was spent, so a queued audit still
    // reaches Sarah even though the visitor's page could not wait for it.
    if (err instanceof LlmUnavailable) {
      return NextResponse.json(
        { error: true, message: 'The audit is queued and finishing now. Your details are saved and Sarah will follow up.' },
        { status: 503 }
      );
    }
    console.error('audit: unexpected error', err);
    return NextResponse.json(
      { error: true, message: 'The audit hit a snag. Please try again or book a call.' },
      { status: 500 }
    );
  }
}
