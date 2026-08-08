/**
 * THE BUILD FACTORY.
 *
 * Until now `hundredfold_systems` was a QUEUE: the coach filed a row saying what
 * should exist, the desk moved it along by hand, and nothing ever made the
 * thing. Sarah, 2026-08-07: "i want the members to see real stuff appear", and
 * then, on the arsenal producing without publishing, that "produces but does not
 * publish" is explicitly not the immersion she wants.
 *
 * So this module both MAKES and PUBLISHES:
 *
 *   images           fal (Seedream v4), real files on fal's CDN
 *   copy · script    Claude, text the member can lift straight out
 *   email-sequence   Claude, a real multi-touch sequence with subjects
 *   social-campaign  Claude, dated posts per platform
 *   pdf              Claude writes the structure, lib/hundredfold-pdf renders it,
 *                    Supabase storage serves it. A lead magnet with THEIR name
 *                    on it, not ours.
 *   page             Claude, one self-contained HTML document, PUBLISHED at a
 *                    real URL on this domain
 *   tool             the one Sarah asked for by name: a calculator, quoter, or
 *                    intake form, self-contained, PUBLISHED, embeddable on the
 *                    member's own site, and wired to a real capture endpoint so
 *                    a submission actually reaches the owner
 *
 * Agents, automations, and dashboards stay STUDIO_BUILT. The factory will not
 * pretend to have wired a phone line.
 *
 * ⚠️ TWO GUARDS, BOTH FAIL CLOSED, BOTH BEFORE ANY WORK RUNS:
 *   1. `needsApproval(kind)` (lib/hundredfold-coach.ts). Video and ad campaigns
 *      wait for the owner's yes with the cost shown first. An unrecognised kind
 *      is treated as spending.
 *   2. The per-member credit meter (lib/hundredfold-credit.ts) against
 *      HUNDREDFOLD.monthlyAiCreditCents. Past the cap the build queues to the
 *      next cycle rather than running.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractJson } from './claude-code-json';
import { needsApproval, STUDIO_BUILT, type BuildKind } from './hundredfold-coach';
import { affords, claudeCostCents, recordSpend, FAL_IMAGE_CENTS, type Meter } from './hundredfold-credit';
import { buildMemberPdf, type PdfDoc } from './hundredfold-pdf';
import type { Member, SystemRow } from './hundredfold-store';
import { SITE } from './seo';

export const FACTORY_MODEL = process.env.HUNDREDFOLD_FACTORY_MODEL || 'claude-opus-5';
const FAL_IMAGE_MODEL = 'fal-ai/bytedance/seedream/v4/text-to-image';
const STORAGE_BUCKET = 'hundredfold';

/** What the member sees land on the row. */
export type Asset = {
  kind: 'image' | 'text' | 'file' | 'page' | 'tool';
  title: string;
  url?: string;
  text?: string;
  /** For a `tool`: the snippet the member pastes on their own site. */
  embed?: string;
  at: string;
};

export type BuildOutcome =
  | { ok: true; assets: Asset[]; spentCents: number; status: 'live'; url?: string; meter: Meter }
  | { ok: false; reason: string; status: 'proposed' | 'queued'; meter?: Meter };

/** How many stills one `images` build produces. The estimate must match it. */
const IMAGES_PER_BUILD = 3;

/**
 * Rough cost of a build BEFORE it runs, so the meter can refuse it in advance.
 *
 * ⚠️ Every number here must be at or ABOVE what the build actually costs. An
 * estimate that comes in low lets a build through the gate and then overspends
 * the cycle, which is the meter failing OPEN. Caught on the first live run:
 * `images` was priced for one still while the generator makes three.
 */
export function estimateCents(kind: string, count = IMAGES_PER_BUILD): number {
  switch (kind) {
    case 'images':
      // fal per still, plus the Claude call that writes the art direction.
      return FAL_IMAGE_CENTS * count + 10;
    case 'page':
    case 'tool':
      // A whole self-contained document is the most expensive thing here.
      return 90;
    case 'pdf':
      return 55;
    case 'email-sequence':
    case 'social-campaign':
      return 40;
    case 'copy':
    case 'script':
      return 30;
    default:
      // Fails closed: an unknown kind is priced like the most expensive one.
      return 90;
  }
}

/* -------------------------------------------------------------------------- */
/* The brief                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * What the model knows about this member when it builds.
 *
 * Deliberately narrow. The coach gets the whole file because he is having a
 * conversation; the factory gets the business, the constraint, and the offer,
 * because a generator handed a whole roadmap writes about the roadmap instead
 * of writing the thing.
 */
function briefFor(member: Member, system: SystemRow): string {
  const r = member.deep_roadmap;
  const o = member.offer;
  const lines = [
    `BUSINESS: ${member.business_name ?? member.email}`,
    member.host ? `SITE: ${member.host}` : '',
    r ? `WHAT THEY DO: ${r.one_liner}` : '',
    r ? `THE ONE THING CAPPING THEM: ${r.constraint.type}. ${r.constraint.title}` : '',
    r ? `EVIDENCE: ${r.constraint.evidence}` : '',
    o ? `THEIR OFFER: ${o.name}. ${o.promise} Price: ${o.price}. Guarantee: ${o.guarantee}` : '',
    o?.call_opening ? `HOW THEY OPEN ON THE PHONE: "${o.call_opening}"` : '',
    r?.lead_engine ? `PRIMARY CHANNEL: ${r.lead_engine.primary_channel}` : '',
    system.window_no ? `THIS IS WINDOW ${system.window_no} OF THEIR PLAN.` : '',
    `WHAT THEY ASKED FOR: ${system.name}. ${system.summary ?? ''}`,
    system.brief ? `THEIR OWN WORDS: ${system.brief}` : '',
    system.gives_back ? `WHAT IT SHOULD HAND BACK: ${system.gives_back}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

const HOUSE_RULES = `
Write as the business owner would, for their customers. Never mention Modern Mustard Seed, Hundredfold, Mr. Mustard, or that any of this was generated. This is their asset, not ours.

Hard rules:
- NO em dashes, ever. Periods, commas, parentheses.
- Never invent a statistic, a review, a testimonial, a case result, a certification, or a years-in-business claim. If a number would help and you do not have it, write the sentence so it does not need one, or leave an obvious [FILL IN] the owner replaces.
- Never promise a specific result, a ranking, or a timeline the business cannot control.
- Plain, concrete, human. No corporate filler: leverage as a verb, synergy, unlock, seamless, robust, holistic, elevate, empower.`;

async function callClaude(
  system: string,
  user: string,
  opts: { maxTokens?: number; effort?: 'low' | 'medium' | 'high' } = {}
): Promise<{ text: string; cents: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('The build engine is offline.');
  const anthropic = new Anthropic({ apiKey });

  /**
   * ⚠️ ALWAYS STREAMED, never `.create()`.
   *
   * A whole self-contained page or tool needs a 24k output ceiling, and the SDK
   * refuses a non-streaming request that large ("Streaming is required for
   * operations that may take longer than 10 minutes"). Found the honest way:
   * the first live `tool` build failed instantly on it. Streaming everything
   * keeps one code path rather than a size-dependent branch that would break
   * again the next time a prompt grew.
   */
  const stream = anthropic.messages.stream({
    model: FACTORY_MODEL,
    max_tokens: opts.maxTokens ?? 12000,
    output_config: { effort: opts.effort ?? 'medium' },
    system,
    messages: [{ role: 'user', content: user }],
  });
  const res = await stream.finalMessage();

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();

  return { text, cents: claudeCostCents(FACTORY_MODEL, res.usage) };
}

/* -------------------------------------------------------------------------- */
/* Generators                                                                  */
/* -------------------------------------------------------------------------- */

async function makeImages(member: Member, system: SystemRow): Promise<{ assets: Asset[]; cents: number }> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error('Image generation is not configured.');

  const { text, cents: promptCents } = await callClaude(
    `You write art direction for commercial photography. Return ONLY a JSON object: {"prompts":[{"title":"...","prompt":"..."}]} with exactly 3 entries.

Each prompt describes ONE photograph: the subject, the setting, the light, the lens feel. Editorial commercial photography. No text, no lettering, no logos, no watermarks, no recognisable faces in close-up. Nothing that implies a claim the business cannot make.${HOUSE_RULES}`,
    `${briefFor(member, system)}\n\nWrite three images this business could actually publish.`,
    { maxTokens: 2000, effort: 'low' }
  );

  const parsed = extractJson(text, { prompts: [] }, 'hundredfold-images') as {
    prompts?: { title?: string; prompt?: string }[];
  };
  const prompts = (parsed.prompts ?? []).filter((p) => p.prompt).slice(0, IMAGES_PER_BUILD);
  if (!prompts.length) throw new Error('No usable art direction came back.');

  const assets: Asset[] = [];
  let cents = promptCents;

  for (const p of prompts) {
    const res = await fetch(`https://fal.run/${FAL_IMAGE_MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `${p.prompt}. Editorial commercial photography, natural light, no text, no lettering, no watermark, no logos.`,
        image_size: { width: 1536, height: 1024 },
        num_images: 1,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      // A dead key or a dry wallet will not heal on the next image. Stop, keep
      // what landed, and report honestly rather than burning the whole set.
      console.error(`hundredfold factory: fal ${res.status}`, body);
      if (res.status === 401 || res.status === 403 || /exhausted balance|locked/i.test(body)) break;
      continue;
    }
    const json = (await res.json()) as { images?: { url?: string }[] };
    const url = json.images?.[0]?.url;
    // Charged on the generation, not on the download: fal billed us either way.
    cents += FAL_IMAGE_CENTS;
    if (url) assets.push({ kind: 'image', title: p.title ?? 'Image', url, at: new Date().toISOString() });
  }

  if (!assets.length) throw new Error('The image service did not return anything. Nothing was charged to your cycle.');
  return { assets, cents };
}

async function makeText(
  member: Member,
  system: SystemRow,
  kind: 'copy' | 'script' | 'email-sequence' | 'social-campaign'
): Promise<{ assets: Asset[]; cents: number }> {
  const shape =
    kind === 'email-sequence'
      ? `{"pieces":[{"title":"Email 1: <what it does>","body":"Subject: ...\\n\\n<the full email>"}]} with 4 to 5 emails. Each is a complete, sendable email, not an outline. Say when to send it in the title.`
      : kind === 'social-campaign'
        ? `{"pieces":[{"title":"<platform>, <what it is for>","body":"<the full post, ready to publish>"}]} with 6 to 8 posts across the channels this business actually uses.`
        : kind === 'script'
          ? `{"pieces":[{"title":"<the situation>","body":"<the script, with the objection handling underneath>"}]} with 2 to 4 scripts.`
          : `{"pieces":[{"title":"<where it goes>","body":"<the finished copy>"}]} with 3 to 5 pieces.`;

  const { text, cents } = await callClaude(
    `You write for small business owners who will use this today. Return ONLY a JSON object of the shape ${shape}${HOUSE_RULES}`,
    `${briefFor(member, system)}\n\nWrite it. Everything you produce should be usable as-is, in their voice, aimed at the constraint above.`,
    { maxTokens: 14000, effort: 'medium' }
  );

  const parsed = extractJson(text, { pieces: [] }, `hundredfold-${kind}`) as {
    pieces?: { title?: string; body?: string }[];
  };
  const pieces = (parsed.pieces ?? []).filter((p) => p.body?.trim());
  if (!pieces.length) throw new Error('The writer came back empty. Nothing was charged.');

  return {
    cents,
    assets: pieces.map((p) => ({
      kind: 'text' as const,
      title: (p.title ?? 'Untitled').slice(0, 140),
      text: p.body!.trim(),
      at: new Date().toISOString(),
    })),
  };
}

async function makePdf(
  sb: SupabaseClient,
  member: Member,
  system: SystemRow
): Promise<{ assets: Asset[]; cents: number }> {
  const { text, cents } = await callClaude(
    `You write lead magnets, guides, and checklists that a small business hands to a real customer. Return ONLY a JSON object:

{"title":"...","subtitle":"...","promise":"one line on what the reader gets","blocks":[
  {"type":"heading","text":"..."},
  {"type":"paragraph","text":"..."},
  {"type":"bullets","items":["..."]},
  {"type":"checklist","items":["..."]},
  {"type":"steps","items":[{"title":"...","text":"..."}]},
  {"type":"callout","title":"...","text":"..."}
],"cta":{"text":"the one thing to do next","contact":"how to reach the business"}}

Eight to sixteen blocks. Open with the reader's problem in their own words, not with the business. Every section has to be worth the download on its own: if a paragraph would survive being pasted into any other business's guide, rewrite it or cut it.${HOUSE_RULES}`,
    `${briefFor(member, system)}\n\nWrite the document.`,
    { maxTokens: 14000, effort: 'medium' }
  );

  const doc = extractJson(text, { blocks: [] }, 'hundredfold-pdf') as Partial<PdfDoc>;
  if (!doc.title || !Array.isArray(doc.blocks) || !doc.blocks.length) {
    throw new Error('The document came back incomplete. Nothing was charged.');
  }
  // A rendered PDF cannot be read back without a viewer, so the authored
  // structure is the only way to inspect what a member actually receives.
  if (process.env.HUNDREDFOLD_DEBUG) console.log(JSON.stringify(doc, null, 2));

  const bytes = await buildMemberPdf({
    title: doc.title,
    subtitle: doc.subtitle,
    promise: doc.promise,
    business: member.business_name ?? member.email,
    blocks: doc.blocks as PdfDoc['blocks'],
    cta: doc.cta,
  });

  const path = `${member.id}/${system.id}-${slug(doc.title)}.pdf`;
  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw new Error(`The document was written but could not be stored: ${error.message}`);

  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return {
    cents,
    assets: [{ kind: 'file', title: doc.title, url: data.publicUrl, at: new Date().toISOString() }],
  };
}

/* -------------------------------------------------------------------------- */
/* The deployable half                                                         */
/* -------------------------------------------------------------------------- */

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'build';

/**
 * A page or a tool is one self-contained HTML document, exactly like the site
 * forge produces. Self-contained is not a style preference: the document is
 * served from our origin and iframed onto the member's own site, so anything it
 * fetches from elsewhere is a request that can be blocked, throttled, or gone
 * next year, on a page with their name on it.
 */
const DOCUMENT_LAW = `
Return ONE complete HTML document and nothing else. No prose before it, no markdown fence, no explanation after it.

It must be entirely self-contained:
- All CSS in one <style> tag. All JS in one <script> tag. No frameworks, no CDNs, no external fonts, no external images, no fetch to any third party.
- System font stack only.
- Responsive by real layout (flex/grid, relative units), correct from 360px to 1440px. Never scroll horizontally.
- Accessible: labels tied to inputs, visible focus, colour contrast at least 4.5:1, sensible heading order.
- Fast: no animation that blocks reading, nothing that runs on a timer forever.

Design it like a studio would, in the character of THIS business. Never the generic AI look: no purple gradient on white, no Inter/Roboto/system-default-everything, no three identical cards in a row, no stock-photo-shaped grey boxes. Pick a palette and a type scale that fit the trade and commit to them.`;

async function makePage(member: Member, system: SystemRow): Promise<{ html: string; title: string; cents: number }> {
  const { text, cents } = await callClaude(
    `You build one page for a small business. ${DOCUMENT_LAW}

The page has a job: it converts the visitor into a lead or a booking. Give it a real headline (their promise, not an adjective), the proof they actually have, the objections handled in plain words, and ONE clear action. Put a working form on it if the job calls for one; the form posts nowhere and simply shows a thank-you, and you must say so in a comment.${HOUSE_RULES}`,
    `${briefFor(member, system)}\n\nBuild the page.`,
    { maxTokens: 24000, effort: 'medium' }
  );

  const html = cleanDocument(text);
  if (!html) throw new Error('The page came back malformed. Nothing was charged.');
  return { html, title: system.name, cents };
}

/**
 * The TOOL, the piece Sarah named: a calculator, a quoter, or an intake form the
 * member puts on their own site.
 *
 * The part that makes it a tool rather than a picture of one is the last
 * paragraph of the brief: it POSTs to a real endpoint on this domain, and that
 * endpoint files the submission and emails the owner. A quoter that computes a
 * number and forgets it would look identical in a screenshot and be worthless
 * on a Tuesday.
 */
async function makeTool(
  member: Member,
  system: SystemRow,
  publicSlug: string
): Promise<{ html: string; title: string; cents: number }> {
  const endpoint = `${SITE.url}/api/built/${publicSlug}/submit`;

  const { text, cents } = await callClaude(
    `You build ONE interactive tool for a small business to embed on their own website: a calculator, a quoter, an estimator, a booking-intake form, or a qualifier. ${DOCUMENT_LAW}

It must actually work:
- Every input is labelled, validated, and usable on a phone.
- If it calculates, show the working, not just a number, and state plainly what the number is and is not (an estimate is an estimate).
- Never quote a price the business has not published. If you need a rate to compute with, put it in a clearly marked JS constant at the top of the script with a comment telling the owner to set it.

THE SUBMIT IS REAL. When the visitor finishes, POST application/json to:
  ${endpoint}
with a flat object of the fields you collected. Always include name, email, and phone if you collected them, plus a "summary" string describing the result in one sentence. Handle the response: on ok show a confirmation in the tool, on failure show a short retry message and never lose what they typed. Never send anything the visitor did not enter.

The tool will be iframed on the owner's own site, so it must look right on a white page and on a dark one, and it must not assume any surrounding stylesheet.${HOUSE_RULES}`,
    `${briefFor(member, system)}\n\nBuild the tool.`,
    { maxTokens: 24000, effort: 'medium' }
  );

  const html = cleanDocument(text);
  if (!html) throw new Error('The tool came back malformed. Nothing was charged.');
  return { html, title: system.name, cents };
}

/** Strip a fence or a preamble and confirm we have a real document. */
function cleanDocument(text: string): string | null {
  let out = text.trim();
  const fenced = out.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced) out = fenced[1].trim();
  const start = out.search(/<!doctype html|<html[\s>]/i);
  if (start > 0) out = out.slice(start);
  const end = out.toLowerCase().lastIndexOf('</html>');
  if (end !== -1) out = out.slice(0, end + 7);
  // A "page" under 2KB is a preamble, an apology, or a stub, never a page.
  if (!/<html[\s>]/i.test(out) || out.length < 2000) return null;
  return out;
}

/* -------------------------------------------------------------------------- */
/* The run                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Build one filed system. Both guards run BEFORE any work, and the row is only
 * moved to `live` once an artifact exists.
 */
export async function runBuild(
  sb: SupabaseClient,
  member: Member,
  system: SystemRow
): Promise<BuildOutcome> {
  const kind = (system.kind ?? '') as BuildKind;

  // GUARD 1: spend waits for the owner. Unrecognised kinds are treated as
  // spending, so a synthesis-written prose kind ("billing + onboarding
  // automation") lands here rather than in a generator.
  if (needsApproval(kind) && !system.approved_at) {
    return {
      ok: false,
      status: 'proposed',
      reason: STUDIO_BUILT.includes(kind)
        ? 'The studio builds this one by hand. It is queued and you will watch it move.'
        : 'This one costs real money to run, so it waits for your yes. Nothing has run and nothing has been charged.',
    };
  }
  if (STUDIO_BUILT.includes(kind)) {
    return {
      ok: false,
      status: 'queued',
      reason: 'The studio builds agents, automations, and dashboards by hand. This is queued with us.',
    };
  }

  // GUARD 2: the credit meter, checked against the estimate before anything runs.
  const gate = await affords(sb, member, estimateCents(kind));
  if (!gate.ok) return { ok: false, status: 'queued', reason: gate.reason, meter: gate.meter };

  await sb.from('hundredfold_systems').update({ status: 'building', error: null }).eq('id', system.id);

  try {
    let assets: Asset[] = [];
    let cents = 0;
    let html: string | null = null;
    let publicSlug: string | null = system.public_slug ?? null;
    let url: string | undefined;

    if (kind === 'images') {
      ({ assets, cents } = await makeImages(member, system));
    } else if (kind === 'copy' || kind === 'script' || kind === 'email-sequence' || kind === 'social-campaign') {
      ({ assets, cents } = await makeText(member, system, kind));
    } else if (kind === 'pdf') {
      ({ assets, cents } = await makePdf(sb, member, system));
    } else if (kind === 'page' || kind === 'tool') {
      // The slug is minted BEFORE generation and reused on a rebuild, because
      // the tool bakes its own submit URL into the document and a member who
      // has already pasted the embed on their site must never have it break.
      publicSlug =
        publicSlug ??
        `${slug(member.business_name ?? 'member')}-${slug(system.name)}-${system.id.slice(0, 4)}`;
      const built = kind === 'tool' ? await makeTool(member, system, publicSlug) : await makePage(member, system);
      html = built.html;
      cents = built.cents;
      url = `${SITE.url}/built/${publicSlug}`;
      assets = [
        {
          kind,
          title: built.title,
          url,
          at: new Date().toISOString(),
          ...(kind === 'tool'
            ? {
                embed: `<iframe src="${url}" title="${escapeAttr(built.title)}" style="width:100%;min-height:640px;border:0" loading="lazy"></iframe>`,
              }
            : {}),
        },
      ];
    } else {
      return {
        ok: false,
        status: 'queued',
        reason: `We do not build "${system.kind}" automatically yet. It is queued with the studio.`,
      };
    }

    await recordSpend(sb, {
      memberId: member.id,
      systemId: system.id,
      source: kind === 'images' ? 'fal-image' : 'claude',
      kind,
      cents,
      note: system.name,
    });

    const existing = Array.isArray(system.assets) ? (system.assets as Asset[]) : [];
    await sb
      .from('hundredfold_systems')
      .update({
        assets: [...existing, ...assets],
        status: 'live',
        url: url ?? existing.find((a) => a.url)?.url ?? null,
        artifact_html: html,
        public_slug: publicSlug,
        published_at: html ? new Date().toISOString() : null,
        engine: kind === 'images' ? FAL_IMAGE_MODEL : FACTORY_MODEL,
        built_at: new Date().toISOString(),
        live_at: new Date().toISOString(),
        spend_cents: (system.spend_cents ?? 0) + cents,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', system.id);

    const meter = await affords(sb, member, 0);
    return { ok: true, assets, spentCents: cents, status: 'live', url, meter: meter.meter };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('hundredfold factory failed', system.id, message);
    // Back to queued, never stranded in `building`. The member can fire it again.
    await sb
      .from('hundredfold_systems')
      .update({ status: 'queued', error: message.slice(0, 400), updated_at: new Date().toISOString() })
      .eq('id', system.id);
    return { ok: false, status: 'queued', reason: message };
  }
}

const escapeAttr = (s: string) => s.replace(/[<>"&]/g, (c) => `&#${c.charCodeAt(0)};`);
