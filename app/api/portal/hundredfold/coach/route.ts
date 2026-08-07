import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getMemberByEmail, listGates, listSystems } from '@/lib/hundredfold-store';
import {
  COACH_MODEL,
  COACH_TOOLS,
  STUDIO_BUILT,
  coachSystemPrompt,
  needsApproval,
  type BuildKind,
} from '@/lib/hundredfold-coach';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * The member's own coach.
 *
 * One turn in, one turn out, with a tool that files builds. The whole plan is
 * rebuilt into the system prompt every call rather than cached, because a
 * member who just ticked a gate should get an answer that already knows it.
 *
 * Scoped hard to the session email. There is no member id in the request body
 * on purpose: it is read from the session, so nobody can ever talk to another
 * member's coach by guessing an id.
 */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await getMemberByEmail(session.email);
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  let body: { message?: string; history?: { role: 'user' | 'assistant'; text: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }

  const message = (body.message ?? '').trim().slice(0, 4000);
  if (!message) return NextResponse.json({ error: 'Say something first.' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'The coach is offline. Email sarah@modernmustardseed.com.' }, { status: 503 });

  const [gates, systems] = await Promise.all([listGates(member.id), listSystems(member.id)]);

  // The window they are actually in: the first whose gate is not cleared.
  let currentWindow = 1;
  for (let w = 1; w <= 4; w += 1) {
    const g = gates.find((x) => x.window_no === w && x.kind === 'gate');
    if (g && !g.done) {
      currentWindow = w;
      break;
    }
    if (w === 4) currentWindow = 4;
  }

  const system = coachSystemPrompt({
    member,
    roadmap: member.deep_roadmap,
    offer: member.offer,
    gates,
    systems,
    currentWindow,
  });

  // Last few turns only. He has the whole plan in the system prompt, so the
  // chat history is for conversational thread, not for memory.
  const history = (body.history ?? []).slice(-8).map((t) => ({
    role: t.role,
    content: String(t.text ?? '').slice(0, 4000),
  }));

  const anthropic = new Anthropic({ apiKey });
  const filed: { name: string; kind: string; approval: boolean; studio: boolean }[] = [];

  try {
    const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: message }];

    let response = await anthropic.messages.create({
      model: COACH_MODEL,
      max_tokens: 1600,
      system,
      tools: COACH_TOOLS,
      messages,
    });

    // One tool round trip. He is told to file at most one build per message, so
    // a single pass is enough, and capping it keeps a chat turn from becoming a
    // runaway agent loop inside a customer-facing request.
    const toolUses = response.content.filter((b) => b.type === 'tool_use');
    if (toolUses.length) {
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        if (use.type !== 'tool_use') continue;
        const input = use.input as {
          name?: string;
          kind?: string;
          window_no?: number;
          summary?: string;
          gives_back?: string;
          why_now?: string;
        };
        const kind = (input.kind ?? '') as BuildKind;
        const approval = needsApproval(kind);
        const studio = STUDIO_BUILT.includes(kind);
        const name = (input.name ?? 'Untitled build').slice(0, 120);

        const client = getSupabase();
        if (client) {
          await client.from('hundredfold_systems').insert({
            member_id: member.id,
            name,
            window_no: Math.max(1, Math.min(4, Math.round(Number(input.window_no) || currentWindow))),
            kind,
            summary: [input.summary, input.why_now].filter(Boolean).join(' '),
            gives_back: input.gives_back ?? null,
            // Spend waits for a yes; everything else goes straight into the queue.
            status: approval ? 'proposed' : 'queued',
          });
        }
        filed.push({ name, kind, approval, studio });

        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: approval
            ? `Filed "${name}" and put it in their arsenal AWAITING THEIR APPROVAL, because it spends real money. Tell them it is waiting on their yes and that nothing has run or been charged.`
            : studio
              ? `Filed "${name}" and queued it with the studio. Tell them it is queued and they will watch it move in their arsenal.`
              : `Filed "${name}" and queued it. Tell them it will be in their arsenal shortly and that they can push it live themselves whenever they want.`,
        });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: results });
      response = await anthropic.messages.create({
        model: COACH_MODEL,
        max_tokens: 1600,
        system,
        tools: COACH_TOOLS,
        messages,
      });
    }

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim();

    // A filed build is news on our side too. Sarah sees it without anybody
    // having to remember to tell her.
    if (filed.length && process.env.RESEND_API_KEY) {
      try {
        const resend = resendClient();
        await resend.emails.send({
          from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
          to: OWNER_NOTIFY_TO,
          subject: `Hundredfold build filed: ${member.business_name ?? member.email}`,
          html: clientEmail({
            preheader: 'A member’s coach filed a build.',
            eyebrow: 'HUNDREDFOLD BUILD',
            greeting: 'A build just came in.',
            body: `<p><strong>${member.business_name ?? member.email}</strong> asked their coach for something and he filed it.</p><ul>${filed
              .map(
                (f) =>
                  `<li><strong>${f.name}</strong> (${f.kind})${f.approval ? ' — WAITING ON THEIR APPROVAL, it spends money' : f.studio ? ' — queued for the studio to build' : ' — queued, self-serve'}</li>`
              )
              .join('')}</ul><p><a href="${SITE.url}/admin/hundredfold/${member.id}">Open them in the desk</a>.</p>`,
            signature: 'The Hundredfold Desk',
          }),
        });
      } catch (err) {
        console.error('hundredfold build notify failed', err);
      }
    }

    return NextResponse.json({
      ok: true,
      say: text || 'Give me that again, I lost the thread.',
      filed,
    });
  } catch (err) {
    console.error('hundredfold coach failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Mr. Mustard is thinking too hard. Send that again.' }, { status: 503 });
  }
}
