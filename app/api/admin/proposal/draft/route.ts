import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { llmJson } from '@/lib/llm';
import { byId, listPrice } from '@/data/proposal-menu';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You write proposals for Modern Mustard Seed, Sarah Scarano's one-person AI product studio in Kalispell, Montana. You write the way she does: direct, warm, concrete, stewardship not extraction.

Voice rules, apply to every word:
- No em dashes, ever. Periods, commas, parentheses, colons.
- No hedging. Direct statements.
- No AI-tell words (unlock, leverage, seamless, dive in, in today's fast-paced world, robust, elevate).
- Short words, short sentences, concrete nouns.
- Stewardship framing. Frame the work as giving their customers a clearer path, not squeezing more out of anyone.

Hard rule: do NOT state, invent, or imply any dollar amounts in your prose. Prices live in a separate table the app builds. Your job is the words around the work, not the numbers.

You are given the client, their situation (from Sarah's notes or an audit), and the services Sarah has chosen. Write a tailored proposal narrative. Reference their actual situation, not generic filler. The item_framing is one sentence per chosen service that connects that service to THIS client's situation.`;

const SCHEMA = {
  type: 'object' as const,
  properties: {
    intro: { type: 'string' },
    situation: { type: 'string' },
    recommendation: { type: 'string' },
    item_framing: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: { id: { type: 'string' }, line: { type: 'string' } },
        required: ['id', 'line'],
        additionalProperties: false,
      },
    },
    close: { type: 'string' },
  },
  required: ['intro', 'situation', 'recommendation', 'item_framing', 'close'],
  additionalProperties: false,
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client, notes, serviceIds } = (await req.json()) as {
    client?: { name?: string; company?: string; url?: string; situation?: string };
    notes?: string;
    serviceIds?: string[];
  };

  const chosen = (serviceIds ?? []).map(byId).filter(Boolean);
  if (!chosen.length) {
    return NextResponse.json({ error: 'Choose at least one service to draft around.' }, { status: 400 });
  }

  const serviceContext = chosen
    .map(
      (s) =>
        `- [${s!.id}] ${s!.name}: ${s!.description}\n  Scope: ${s!.scope.join('; ')}\n  List price: ${listPrice(s!)}`
    )
    .join('\n');

  const clientBlock = [
    client?.name ? `Name: ${client.name}` : null,
    client?.company ? `Company: ${client.company}` : null,
    client?.url ? `Site: ${client.url}` : null,
    client?.situation ? `Situation: ${client.situation}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const userMsg = `Client
${clientBlock || '(not specified)'}

Sarah's notes / audit context
${notes?.trim() || '(none provided)'}

Services chosen (write item_framing for each, keyed by the id in brackets)
${serviceContext}

Return the JSON proposal narrative. Remember: no dollar amounts anywhere in the prose.`;

  try {
    const draft = await llmJson<{ item_framing?: { id: string; line: string }[]; [k: string]: unknown }>({
      label: 'proposal-draft',
      model: 'sonnet',
      system: SYSTEM,
      user: userMsg,
      schema: SCHEMA,
      timeoutMs: 90_000,
    });

    // Reshape item_framing into a simple map for the UI.
    const framing: Record<string, string> = {};
    for (const f of draft.item_framing ?? []) framing[f.id] = f.line;

    return NextResponse.json({
      intro: draft.intro ?? '',
      situation: draft.situation ?? '',
      recommendation: draft.recommendation ?? '',
      framing,
      close: draft.close ?? '',
    });
  } catch (err) {
    console.error('proposal/draft: unexpected error', err);
    return NextResponse.json({ error: 'Drafting hit a snag. Try again.' }, { status: 500 });
  }
}
