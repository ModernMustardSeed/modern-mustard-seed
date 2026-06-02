import { NextResponse } from 'next/server';
import { captureHarvestInbound } from '@/lib/harvest-capture';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Harvest Module 0: capture the submission as a pre-qualified inbound lead.
    // Best-effort, never blocks or breaks the audit response.
    await captureHarvestInbound({ url });

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API not configured' }, { status: 500 });
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
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = (data.content || []).map((c: { text?: string }) => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Audit error:', err);
    return NextResponse.json({
      error: true,
      businessName: 'Your business',
      industry: 'Unknown',
      score: 65,
      strengths: ['Web presence detected', 'Digital footprint exists', 'Growth potential identified'],
      gaps: [
        'AI integration opportunities found',
        'Automation gaps detected',
        'Process optimization needed',
        'Customer experience can be enhanced',
      ],
      topTools: [
        { name: 'AI Voice Agent', impact: 92, reason: 'Capture leads 24/7' },
        { name: 'Process Automation', impact: 87, reason: 'Reduce manual workflows' },
        { name: 'Content Intelligence', impact: 83, reason: 'Scale content production' },
        { name: 'Customer Insights AI', impact: 79, reason: 'Understand customer behavior' },
        { name: 'Smart Scheduling', impact: 75, reason: 'Optimize time management' },
      ],
      monthlyTimeSaved: 30,
      estimatedROI: 15000,
      quickWins: [
        'Deploy AI voice agent for calls',
        'Automate email follow-ups',
        'AI-powered content creation',
      ],
      competitiveEdge:
        'Early AI adoption creates a significant moat against slower competitors',
      riskOfInaction:
        'Competitors adopting AI will capture market share through faster response times and better customer experience',
    });
  }
}
