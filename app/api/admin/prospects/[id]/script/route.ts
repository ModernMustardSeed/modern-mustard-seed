import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { buildLeadScript, categoryLabel } from '@/lib/lead-script';
import type { Prospect } from '@/lib/prospects';

export const runtime = 'nodejs';
export const maxDuration = 45;

const SYSTEM_PROMPT = `You write cold-call scripts for a Modern Mustard Seed rep dialing a local small business. Modern Mustard Seed is a one-person product studio in Kalispell, Montana that builds AI tools for small businesses: a voice agent and chat assistant that answer the phone and book appointments around the clock, plus fast, modern websites.

The ONLY goal of the call is to book a short (about 10 minute) live demo. Never try to close on the call.

Write in Sarah Scarano's voice:
- Warm, human, direct. Never pushy or salesy. No buzzwords.
- No em dashes anywhere. Periods, commas, parentheses only.
- Plain spoken words a real person would say out loud on a phone.
- Respectful of their time. This is a cold call and you acknowledge that honestly.

You will be given the business, its city, its category, the rep's first name, the booking link to mention, and (when available) a real website audit of the business with a score and specific findings. When you have audit findings, USE them: open a real, specific observation about their site (for example "I took a quick look at your site and noticed there is no way to book online"). Specificity is what earns the demo. When there is no audit, lead with the pain that type of business feels when calls get missed.

Return JSON only, matching the schema:
- steps: 5 to 6 ordered steps. Each has a short label (2-4 words like "Open", "Why I'm calling", "The hook", "Offer the demo", "Lock it in", "If they hesitate") and a "line" that is the exact words to say, written to be read aloud. Keep each line to 1-3 sentences.
- voicemail: one natural voicemail to leave if no one picks up, about 3 sentences, mentioning the rep's name and the business.
- objections: exactly 3 likely pushbacks for THIS business, each with q (what they say) and a (a calm, honest one to two sentence reply).`;

const SCRIPT_SCHEMA = {
  type: 'object' as const,
  properties: {
    steps: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: { label: { type: 'string' }, line: { type: 'string' } },
        required: ['label', 'line'],
        additionalProperties: false,
      },
    },
    voicemail: { type: 'string' },
    objections: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: { q: { type: 'string' }, a: { type: 'string' } },
        required: ['q', 'a'],
        additionalProperties: false,
      },
    },
  },
  required: ['steps', 'voicemail', 'objections'],
  additionalProperties: false,
};

function fullTextOf(business: string, city: string, steps: { label: string; line: string }[], voicemail: string): string {
  return (
    `Call script for ${business} (${city})\n\n` +
    steps.map((s, i) => `${i + 1}. ${s.label}\n${s.line}`).join('\n\n') +
    `\n\nIf you get voicemail:\n${voicemail}`
  );
}

/**
 * Generate a call script tailored to one specific prospect. When a website
 * audit has been run, the script opens with a real, specific observation about
 * their site. Falls back to the instant deterministic script if the API is not
 * configured or the model call fails, so the rep always has something to read.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { repName?: string; bookDisplay?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* defaults below */
  }
  const repName = (body.repName ?? '').trim();
  const bookDisplay = (body.bookDisplay ?? 'modernmustardseed.com/book').trim();

  const { data, error } = await supabase.from('rep_prospects').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const prospect = data as Prospect;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/\\n$/, '');
  // No key, no problem: hand back the deterministic script.
  if (!apiKey) {
    return NextResponse.json({ ok: true, fallback: true, script: buildLeadScript(prospect, repName, bookDisplay) });
  }

  const category = categoryLabel(prospect.notes);
  const audit = prospect.audit_json;
  const auditBlock = audit
    ? `Website audit of ${prospect.website ?? prospect.audit_url ?? 'their site'}:
- Score: ${audit.overall_score}/100 (grade ${audit.letter_grade})
- Headline: ${audit.headline}
- Top fixes: ${(audit.top_three_fixes ?? []).map((f) => f.title).join('; ') || 'n/a'}
- Summary: ${(audit.overall_analysis ?? '').slice(0, 600)}`
    : 'No website audit has been run for this business. Lead with the pain of missed calls for this category.';

  const userContent = `Write the call script for this prospect.

Business: ${prospect.business}
City: ${prospect.city ?? 'their area'}
Category: ${category || 'local service business'}
Rep first name: ${repName.split(' ')[0] || 'the rep'}
Booking link to mention if they hesitate: ${bookDisplay}
${prospect.notes ? `Rep notes: ${prospect.notes}` : ''}

${auditBlock}

Return the JSON script.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2500,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema' as const, schema: SCRIPT_SCHEMA },
      },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userContent }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('no text block');
    const parsed = JSON.parse(textBlock.text) as {
      steps: { label: string; line: string }[];
      voicemail: string;
      objections: { q: string; a: string }[];
    };

    const script = {
      category,
      steps: parsed.steps,
      voicemail: parsed.voicemail,
      objections: parsed.objections,
      fullText: fullTextOf(prospect.business, prospect.city ?? 'your area', parsed.steps, parsed.voicemail),
    };
    return NextResponse.json({ ok: true, fallback: false, usedAudit: !!audit, script });
  } catch (err) {
    console.error('prospect script generation failed', err);
    // Never leave the rep empty-handed.
    return NextResponse.json({ ok: true, fallback: true, script: buildLeadScript(prospect, repName, bookDisplay) });
  }
}
