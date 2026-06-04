import { NextResponse } from 'next/server';
import { captureHarvestInbound } from '@/lib/harvest-capture';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Trim defensively: a stray newline or literal "\n" pasted into the env var
// produces a silent 401, which is easy to miss.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim().replace(/\\n$/, '');

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
            content: `You are an expert AI integration consultant performing a rapid website audit. Analyze this business website URL: ${url}

Based on the URL and what you can infer about this business, respond ONLY with a valid JSON object (no markdown, no backticks, no preamble) with this exact structure:
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
