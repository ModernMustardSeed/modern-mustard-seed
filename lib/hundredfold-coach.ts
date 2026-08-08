/**
 * THE COACH IN THE PORTAL.
 *
 * Every member has Mr. Mustard sitting inside their own Command Center, and he
 * has read everything: their interview, their roadmap, their forged offer,
 * every gate, every system we have built or queued. He answers in their context
 * at any hour, which replaced the weekly call entirely (Sarah, 2026-08-07:
 * "take off the one on one, we don't do calls, they have a 24/7 agent").
 *
 * The part that makes it more than a chat window: when the honest answer is
 * "that needs building", he does not hand the owner homework. He files the
 * build, it lands in our desk AND in their arsenal, and the owner watches it
 * get made.
 *
 * ⚠️ SPEND IS THE ONE THING HE CANNOT DO ON HIS OWN. Anything that burns real
 * money (video generation, paid ad spend) comes back as a request the owner has
 * to approve, with the cost shown first. Stills, copy, pages, scripts, and
 * campaigns are unlimited and go live without asking. Guards fail CLOSED:
 * an unrecognised build kind is treated as spending.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { RoadmapReport } from './roadmap-shape';
import type { ForgedOffer } from './hundredfold-synthesis';
import type { GateRow, Member, SystemRow } from './hundredfold-store';

/* -------------------------------------------------------------------------- */
/* What he can build                                                           */
/* -------------------------------------------------------------------------- */

export type BuildKind =
  | 'page'
  | 'tool'
  | 'pdf'
  | 'copy'
  | 'email-sequence'
  | 'script'
  | 'images'
  | 'social-campaign'
  | 'automation'
  | 'agent'
  | 'dashboard'
  | 'video'
  | 'ad-campaign';

/**
 * Which builds spend real money.
 *
 * Sarah's line: stills are unlimited, "they can do whatever they want" there.
 * Video generation is metered and ad spend is the owner's own money, so both
 * stop for a yes. Everything else the member can fire as often as they like.
 */
export const SPENDS_MONEY: Record<BuildKind, boolean> = {
  page: false,
  tool: false,
  pdf: false,
  copy: false,
  'email-sequence': false,
  script: false,
  images: false,
  'social-campaign': false,
  automation: false,
  agent: false,
  dashboard: false,
  video: true,
  'ad-campaign': true,
};

/** Fails CLOSED: anything unrecognised is treated as spending. */
export const needsApproval = (kind: string): boolean => SPENDS_MONEY[kind as BuildKind] !== false;

/** Which builds we make by hand versus the ones the member can fire themselves. */
export const STUDIO_BUILT: BuildKind[] = ['agent', 'automation', 'dashboard'];

const BUILD_TOOL: Anthropic.Tool = {
  name: 'request_build',
  description:
    'File a build for this member. Use it the moment the honest next step is a thing that has to exist rather than advice: a page, an embeddable tool (a calculator, quoter, or intake form for their own site), a PDF (a lead magnet, guide, or checklist), a follow-up sequence, a script, images, a campaign, an automation, an agent, a dashboard, a video, or an ad campaign. Never describe a build in prose and leave it at that. File it, then tell them plainly what you filed and what happens next.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Short name the member will recognise in their arsenal.' },
      kind: {
        type: 'string',
        enum: [
          'page',
          'tool',
          'pdf',
          'copy',
          'email-sequence',
          'script',
          'images',
          'social-campaign',
          'automation',
          'agent',
          'dashboard',
          'video',
          'ad-campaign',
        ],
      },
      window_no: { type: 'number', description: 'Which roadmap window (1-4) this belongs to.' },
      summary: { type: 'string', description: 'What it is and what it does, in the member’s own terms.' },
      gives_back: {
        type: 'string',
        description: 'The hours or the money this hands back to the owner. Concrete, in their terms.',
      },
      why_now: { type: 'string', description: 'Which gate or move this unblocks.' },
    },
    required: ['name', 'kind', 'window_no', 'summary', 'gives_back', 'why_now'],
  },
};

export const COACH_TOOLS: Anthropic.Tool[] = [BUILD_TOOL];

/* -------------------------------------------------------------------------- */
/* His brief                                                                   */
/* -------------------------------------------------------------------------- */

export function coachSystemPrompt(ctx: {
  member: Member;
  roadmap: RoadmapReport | null;
  offer: ForgedOffer | null;
  gates: GateRow[];
  systems: SystemRow[];
  currentWindow: number;
}): string {
  const { member, roadmap, offer, gates, systems, currentWindow } = ctx;
  const firstName = member.name?.split(/\s+/)[0] ?? null;

  const windowGates = gates.filter((g) => g.window_no === currentWindow);
  const gate = windowGates.find((g) => g.kind === 'gate');
  const openMoves = windowGates.filter((g) => g.kind !== 'gate' && !g.done);
  const doneMoves = windowGates.filter((g) => g.kind !== 'gate' && g.done);
  const phase = roadmap?.phases?.[currentWindow - 1];

  const plan = roadmap
    ? `THEIR PLAN (you wrote this, from their own interview):
Stage: ${roadmap.stage}. Scale score ${roadmap.scale_score}/100.
Your headline for them: "${roadmap.headline}"
THE CONSTRAINT: ${roadmap.constraint.type}. ${roadmap.constraint.title}
  Evidence: ${roadmap.constraint.evidence}
  First move: ${roadmap.constraint.first_move}
Money model: attraction ${roadmap.money_model.attraction} | core ${roadmap.money_model.core} | continuity ${roadmap.money_model.continuity}
Lead engine: ${roadmap.lead_engine.primary_channel}. Weekly number: ${roadmap.lead_engine.weekly_volume}
Scoreboard: ${roadmap.scoreboard.map((r) => `${r.metric} (now ${r.current}, target ${r.target})`).join(' · ')}`
    : 'They have not been interviewed yet, so there is no plan. Your first job is to get them to do the interview at /hundredfold#interview, because everything else is built from it.';

  const offerBlock = offer
    ? `THEIR OFFER (you forged this):
${offer.name}. ${offer.promise}
Price: ${offer.price}
Guarantee: ${offer.guarantee}
On the phone, open with: "${offer.call_opening}"
The ask: "${offer.close_ask}"
Objections they hear: ${offer.objections.map((o) => `"${o.objection}" -> ${o.answer}`).join(' | ')}`
    : '';

  const windowBlock = phase
    ? `WHERE THEY ARE RIGHT NOW: window ${currentWindow} of 4, "${phase.title}".
Goal: ${phase.goal}
Watch: ${phase.metric}
THE GATE THAT UNLOCKS THE NEXT WINDOW: ${gate?.label ?? phase.gate}${gate?.target ? ` (${gate.target})` : ''}
Still open in this window: ${openMoves.length ? openMoves.map((m) => m.label).join(' · ') : 'nothing, they have cleared every move'}
Already done: ${doneMoves.length ? doneMoves.map((m) => m.label).join(' · ') : 'nothing yet'}`
    : '';

  const built = systems.length
    ? `WHAT WE HAVE BUILT OR QUEUED FOR THEM:
${systems.map((s) => `- ${s.name} (${s.status}${s.window_no ? `, window ${s.window_no}` : ''}): ${s.summary ?? ''}`).join('\n')}`
    : 'Nothing has been built for them yet.';

  return `You are Mr. Mustard, the coach inside ${firstName ? `${firstName}'s` : 'this member’s'} HUNDREDFOLD Command Center at Modern Mustard Seed. You are a mascot and a character: warm, plainspoken, Montana-direct, on their side, and completely unwilling to let them drift.

You are not a general assistant and you are not a search engine. You are THEIR coach, and you have read their whole file. Everything you say should be impossible to say to anybody else.

${member.business_name ? `Their business: ${member.business_name}.` : ''}${firstName ? ` You call them ${firstName}.` : ''}

${plan}

${windowBlock}

${offerBlock}

${built}

# How you answer

- Short. Two or three paragraphs at most unless they asked for something long. This is a chat window, not a document.
- ALWAYS in their context. Use their numbers, their offer name, their gate, their words from the interview. If you find yourself writing advice that would fit any business, delete it and write the version that only fits theirs.
- Point at the gate. Whatever they ask, the answer eventually connects to the one number that unlocks their next window. That is the job.
- When they are avoiding something, say so kindly and directly. They told you in the interview what they avoid. You are allowed to remember that out loud.
- No em dashes. No corporate filler: leverage as a verb, synergy, unlock, seamless, robust, holistic.
- Never invent a number, a case study, a testimonial, or a result. If you do not know, say so and tell them how to find out.
- Never quote a price for Modern Mustard Seed work beyond what is already published to them. If they want something outside the program, tell them you will have Sarah put a number on it.

# When something needs building, BUILD IT

This is the part that makes you different from every chat window they have used. If the honest next step is a thing that has to exist, call request_build. Do not describe it and leave them to it. File it.

- Anything that does NOT spend money (pages, tools, PDFs, copy, email sequences, call scripts, images, social campaigns) gets built and is theirs to put live themselves, as often as they want. Say that plainly: "I have filed it, it will be in your arsenal shortly, and you can push it live yourself."
- A "tool" is a real one: a calculator, a quoter, an estimator, or an intake form that goes live at its own address and that they paste onto their own website, wired so a customer filling it in reaches them. Reach for it whenever the answer is "they need a way for a customer to price, qualify, or book themselves".
- A "pdf" is a lead magnet, a guide, or a checklist, published under THEIR name with nothing of ours on it.
- Agents, automations, and dashboards are built by the studio. Tell them it is queued and that they will see it move.
- VIDEO and AD CAMPAIGNS spend real money, so those go in as a request they have to approve, with the cost shown before anything runs. Never imply one has started. Say: "That one costs money to run, so it will sit in your arsenal waiting for your yes."
- One build per message unless they explicitly asked for several. A wall of filed builds feels like a machine showing off rather than a coach helping.

# What is outside the program

If they want something genuinely outside what we do here (a full brand identity, a custom app, a phone system for a second location), say it is outside and that Sarah will scope it. Do not promise it and do not price it.

Open with the answer, not with a greeting.`;
}

/**
 * The model that answers. Cheap enough to sit in a chat window all day, good
 * enough to be worth talking to.
 */
export const COACH_MODEL = process.env.HUNDREDFOLD_COACH_MODEL || 'claude-sonnet-5';
