import { NextResponse } from 'next/server';
import { createInterview, upsertMember } from '@/lib/hundredfold-store';
import { getRoadmapBySlug } from '@/lib/roadmap-store';
import { interviewSystemPrompt, type InterviewChannel } from '@/lib/hundredfold-interview';
import { SPEAKING_PIPELINE, demoModel, getAssistantModel } from '@/lib/sidekick';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Start an interview.
 *
 * Creates (or finds) the member, opens an interview row, and hands back the
 * coach's brief. The voice paths pass that brief straight to Vapi as an
 * assistant override so Mr. Mustard runs the whole conversation himself; the
 * typed path keeps it and sends it back with every turn.
 *
 * If they came from a free roadmap we load it and fold the findings into the
 * brief, so he never asks a question their own website already answered. That
 * continuity is the moment the funnel stops feeling like a funnel.
 */
export async function POST(req: Request) {
  let body: {
    email?: string;
    name?: string;
    business_name?: string;
    phone?: string;
    url?: string;
    roadmap_slug?: string;
    channel?: InterviewChannel;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'We need a real email so your plan has somewhere to go.' }, { status: 400 });
  }

  const channel: InterviewChannel =
    body.channel === 'phone' || body.channel === 'typed' ? body.channel : 'web';

  // Their free roadmap, if they ran one. Best effort: a missing roadmap just
  // means Mr. Mustard walks in without the homework done.
  let roadmapSummary: string | null = null;
  let businessName = (body.business_name ?? '').trim() || null;
  let host: string | null = null;
  let url = (body.url ?? '').trim() || null;

  if (body.roadmap_slug) {
    const row = await getRoadmapBySlug(body.roadmap_slug);
    if (row) {
      businessName = businessName ?? row.business_name;
      host = row.host;
      url = url ?? row.url;
      const r = row.report;
      roadmapSummary = [
        `We read their website and built them a roadmap already.`,
        `Stage: ${r.stage}. Scale score: ${r.scale_score} out of 100.`,
        `Our read: "${r.headline}"`,
        `The constraint we named from the outside: ${r.constraint?.type}. ${r.constraint?.title}`,
        `What we saw: ${r.constraint?.evidence}`,
        `Their current offer, as their site presents it: ${r.offer?.name}. ${r.offer?.promise}`,
        ``,
        `Use this. Do not read it back to them. It exists so your questions can be sharper, and so you can test whether what the website says matches what the owner says. Where they disagree, the owner wins and that gap is worth one extra question.`,
      ].join('\n');
    }
  }

  const member = await upsertMember({
    email,
    name: (body.name ?? '').trim() || null,
    business_name: businessName,
    host,
    phone: (body.phone ?? '').trim() || null,
    roadmap_slug: body.roadmap_slug ?? null,
    status: 'interviewing',
  });

  const interview = await createInterview({
    member_id: member?.id ?? null,
    email,
    business_name: businessName,
    url,
    channel,
  });

  if (!interview) {
    return NextResponse.json(
      { error: 'Could not start the interview. Email sarah@modernmustardseed.com and she will run it herself.' },
      { status: 500 }
    );
  }

  const firstName = (body.name ?? '').trim().split(/\s+/)[0] || null;
  const systemPrompt = interviewSystemPrompt({
    businessName,
    host,
    firstName,
    roadmapSummary,
    channel,
  });

  // The voice call config.
  //
  // Vapi 400s on a PARTIAL model override, so the live assistant's whole model
  // object is fetched and the interview brief is merged into it. Same pattern
  // the build uses, and the same reason: a bare `{ messages: [...] }` looks
  // right and is rejected. Every named tool is stripped, because Mr. Mustard
  // must not wander off and book a call in the middle of the interview.
  let call: Record<string, unknown> | null = null;
  if (channel !== 'typed') {
    const apiKey = (process.env.VAPI_API_KEY || '').trim();
    const model = apiKey ? await getAssistantModel(apiKey) : null;
    if (model) {
      call = {
        firstMessage: `Hey${firstName ? ` ${firstName}` : ''}, Mr. Mustard here. Before we start: this is about twenty minutes and roughly thirty questions, and a few of them are going to be uncomfortable. Everything you tell me turns into your plan, so the more honest the answers the better the plan. Are you somewhere you can talk straight for a bit?`,
        model: demoModel(model, systemPrompt, new Set<string>()),
        ...SPEAKING_PIPELINE,
        // A real interview runs long. The default demo ceiling would hang up on
        // them somewhere around question twelve.
        maxDurationSeconds: 2400,
        metadata: { kind: 'hundredfold-interview', interviewId: interview.id, memberId: member?.id ?? '' },
      };
    }
  }

  return NextResponse.json({
    ok: true,
    interviewId: interview.id,
    memberId: member?.id ?? null,
    channel,
    systemPrompt,
    call,
    // The browser can fall back to typing rather than showing a dead button.
    voiceReady: Boolean(call),
    firstName,
    businessName,
  });
}
