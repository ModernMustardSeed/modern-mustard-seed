import type { SupabaseClient } from '@supabase/supabase-js';
import { LlmUnavailable, llmJson } from '@/lib/llm';
import { resendClient } from '@/lib/send-email';
import { SITE } from '@/lib/seo';
import type { ClientProject } from '@/lib/client-leads';

/**
 * THE WEBSITE WORKBENCH.
 *
 * A client's website goes stale in a particular way. Not because nobody cares,
 * but because the finished house is photographed on a Friday, the person who
 * would write about it has fourteen other things to do, and there is no door
 * marked "put this on our website". So the site keeps showing the work of two
 * years ago while the best work of the business sits on a phone.
 *
 * This is the door. Three kinds go through it:
 *
 *   A NEW PROJECT PAGE. Photographs and three short questions, and the story
 *   comes back written in their voice, from what is actually in the pictures,
 *   for them to correct before anybody sees it.
 *
 *   A PIECE FOR THEIR OWN BLOG. Carmen already writes monthly for somebody
 *   else's publication, which earns keywords for somebody else's domain. Same
 *   effort, their own site, with a draft to start from.
 *
 *   ANYTHING ELSE. "Move that photo." "We do barndominiums now." Typed in one
 *   box, landing in the same queue, with a status they can see.
 *
 * WHAT THIS IS NOT. It does not publish. Their site is a built, deployed
 * artifact and it stays that way, which is why it loads in under a second and
 * cannot be broken by a text box. What arrives here is a request with the work
 * already 80 percent done, and a person ships it. The status on the row is the
 * honest version of that, rather than a progress bar that means nothing.
 */

export type SiteKind = 'project' | 'article' | 'change' | 'photos';
export type SiteStatus = 'new' | 'read' | 'done';

export type SiteRequest = {
  id: string;
  kind: SiteKind | 'note';
  title: string | null;
  body: string;
  details: Record<string, unknown>;
  photos: string[];
  status: SiteStatus;
  status_note: string | null;
  live_url: string | null;
  created_at: string;
  updated_at: string | null;
};

export const SITE_REQUEST_COLUMNS = 'id, kind, title, body, details, photos, status, status_note, live_url, created_at, updated_at';

/** What a client reads instead of a database word. */
export const STATUS_WORD: Record<SiteStatus, string> = {
  new: 'Asked for',
  read: 'We are on it',
  done: 'Live on your site',
};

export async function listSiteRequests(sb: SupabaseClient, clientEmail: string): Promise<SiteRequest[]> {
  const { data } = await sb
    .from('client_requests')
    .select(SITE_REQUEST_COLUMNS)
    .eq('client_email', clientEmail.toLowerCase().trim())
    .neq('kind', 'note')
    .order('created_at', { ascending: false })
    .limit(60);
  return ((data ?? []) as SiteRequest[]).map((r) => ({ ...r, photos: r.photos ?? [], details: r.details ?? {} }));
}

/* ─────────────────────── writing the draft ─────────────────────── */

const PROJECT_SCHEMA = {
  type: 'object',
  required: ['title', 'story', 'highlights', 'saw'],
  properties: {
    title: { type: 'string', description: 'A page title in the style of their existing pages: the place and the character of the build, four to seven words. No colon, no marketing words.' },
    story: { type: 'string', description: 'Two or three short paragraphs about this house, in the business’s own voice (we, us, our). Only what the photographs and their answers support.' },
    highlights: { type: 'array', items: { type: 'string' }, description: 'Three to six short lines: materials, features, the things a person would point at. Only what is visible or stated.' },
    saw: { type: 'array', items: { type: 'string' }, description: 'One line per photograph: what is in it. Checked by a person, so be literal.' },
  },
} as const;

const ARTICLE_SCHEMA = {
  type: 'object',
  required: ['title', 'body', 'summary'],
  properties: {
    title: { type: 'string', description: 'A headline a local person would click. Plain, specific, no colon.' },
    summary: { type: 'string', description: 'One sentence for the blog index and the share card.' },
    body: { type: 'string', description: 'The article in their voice, four to eight short paragraphs, in plain text with blank lines between paragraphs. Local, specific, useful. Never invented facts about their own jobs.' },
  },
} as const;

function voice(project: ClientProject): string {
  return [
    `You write for ${project.business}. The business speaks as itself: we, us, our.`,
    'Plain, warm, specific. Short sentences. No marketing language, no superlatives they have not earned, no "nestled", no "dream home" unless they said it.',
    'Never invent a fact: not a material, not a square footage, not a timeline, not a price, not an award, not a client name.',
    'No em dashes anywhere. At most one exclamation mark.',
  ].join('\n');
}

export type ProjectDraft = { title: string; story: string; highlights: string[]; saw: string[] };

/** Photographs and three answers become a project page draft. */
export async function draftProject(
  project: ClientProject,
  input: { town: string; kind: string; answers: string; files: Array<{ url: string; name?: string; type?: string }> },
): Promise<{ ok: true; draft: ProjectDraft } | { ok: false; queued: true; jobId: string | null } | { ok: false; queued: false; error: string }> {
  const system = [
    voice(project),
    'You are writing a project page for a house this builder finished. The reader is somebody in the same valley thinking about building.',
    'Work from the photographs and their answers. Describe what is actually in the pictures: the materials, the roofline, the light, the setting. If the photographs do not show something, it does not go in.',
    'A project page never carries the homeowner’s name and never carries the street address. The town is the most location it may ever carry.',
    'Return only the JSON.',
  ].join('\n');

  const user = [
    `The build: ${input.kind}${input.town ? ` in ${input.town}` : ''}.`,
    input.files.length ? `${input.files.length} photograph${input.files.length === 1 ? '' : 's'} of it.` : 'No photographs, so work from their answers alone.',
    input.answers.trim() ? `What they said about it:\n"""${input.answers.trim().slice(0, 3000)}"""` : 'They did not write anything, so the photographs have to carry it.',
    'Write the JSON.',
  ].join('\n');

  try {
    const j = await llmJson<ProjectDraft>({
      system,
      user,
      label: `site:project:${project.clientEmail}`,
      model: 'sonnet',
      schema: PROJECT_SCHEMA,
      attachments: input.files,
      timeoutMs: 50_000,
    });
    return {
      ok: true,
      draft: {
        title: String(j.title ?? '').trim().slice(0, 120),
        story: String(j.story ?? '').trim().slice(0, 6000),
        highlights: (Array.isArray(j.highlights) ? j.highlights : []).map((h) => String(h).trim().slice(0, 200)).filter(Boolean).slice(0, 8),
        saw: (Array.isArray(j.saw) ? j.saw : []).map((h) => String(h).trim().slice(0, 200)).filter(Boolean).slice(0, 12),
      },
    };
  } catch (err) {
    if (err instanceof LlmUnavailable) return { ok: false, queued: true, jobId: err.jobId };
    return { ok: false, queued: false, error: 'Nothing could write that just now. Try again in a minute.' };
  }
}

export type ArticleDraft = { title: string; summary: string; body: string };

/** Notes become an article for their own blog. */
export async function draftArticle(
  project: ClientProject,
  input: { topic: string; notes: string },
): Promise<{ ok: true; draft: ArticleDraft } | { ok: false; queued: true; jobId: string | null } | { ok: false; queued: false; error: string }> {
  const towns = 'the Flathead Valley';
  const system = [
    voice(project),
    `You are writing a piece for this business’s own blog. The reader lives in ${towns} or is moving there.`,
    'Useful beats clever. Explain the thing a homeowner actually does not know: what a stage costs them in time, what a decision locks in, what the weather does to a schedule here, what to ask a builder.',
    'Use the local words: the towns, the trades, the seasons. Never claim an award, a ranking or a statistic.',
    'Return only the JSON.',
  ].join('\n');

  const user = [
    `What they want to write about: ${input.topic.trim().slice(0, 300)}`,
    input.notes.trim() ? `Their notes:\n"""${input.notes.trim().slice(0, 4000)}"""` : 'They left the notes empty, so write from the topic alone and keep it general enough to be true.',
    'Write the JSON.',
  ].join('\n');

  try {
    const j = await llmJson<ArticleDraft>({ system, user, label: `site:article:${project.clientEmail}`, model: 'sonnet', schema: ARTICLE_SCHEMA, timeoutMs: 50_000 });
    return {
      ok: true,
      draft: { title: String(j.title ?? '').trim().slice(0, 140), summary: String(j.summary ?? '').trim().slice(0, 300), body: String(j.body ?? '').trim().slice(0, 12_000) },
    };
  } catch (err) {
    if (err instanceof LlmUnavailable) return { ok: false, queued: true, jobId: err.jobId };
    return { ok: false, queued: false, error: 'Nothing could write that just now. Try again in a minute.' };
  }
}

/* ─────────────────────── asking for it ─────────────────────── */

const LABEL: Record<SiteKind, string> = { project: 'a new project page', article: 'a piece for the blog', change: 'a change to the site', photos: 'photos for a page' };

/**
 * Put the request in the queue and tell Sarah.
 *
 * The row is written first and the email is best effort, because a request
 * that exists and was not emailed is a delay, and an email about a request
 * that does not exist is a thing nobody can find.
 */
export async function askForSite(
  sb: SupabaseClient,
  project: ClientProject,
  input: { kind: SiteKind; title: string; body: string; details?: Record<string, unknown>; photos?: string[]; by: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const body = input.body.trim();
  if (body.length < 4) return { ok: false, error: 'Say a little more about what you want.' };

  const { data, error } = await sb
    .from('client_requests')
    .insert({
      client_email: project.clientEmail,
      client_name: project.business,
      kind: input.kind,
      title: input.title.trim().slice(0, 200) || null,
      body: body.slice(0, 12_000),
      details: input.details ?? {},
      photos: (input.photos ?? []).slice(0, 40),
      source: 'note',
      status: 'new',
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'That did not save. Try once more.' };

  try {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const photos = (input.photos ?? []).slice(0, 12);
    await resendClient().emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: ['sarah@modernmustardseed.com'],
      replyTo: [input.by],
      subject: `${project.business} asked for ${LABEL[input.kind]}${input.title ? `: ${input.title}` : ''}`,
      html: [
        '<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:600px">',
        `<p><strong>${esc(project.business)}</strong> (${esc(input.by)}) asked for ${LABEL[input.kind]}.</p>`,
        input.title ? `<p style="font:600 17px/1.3 Georgia,serif">${esc(input.title)}</p>` : '',
        `<div style="white-space:pre-wrap;border-left:3px solid #F5B700;padding-left:12px">${esc(body.slice(0, 4000))}</div>`,
        photos.length ? `<p style="margin-top:16px">${photos.map((u) => `<a href="${u}">${esc(u.split('/').pop() ?? 'photo')}</a>`).join('<br>')}</p>` : '',
        `<p style="opacity:.6;font-size:13px;margin-top:18px">It is in client_requests as ${esc(input.kind)}, status new. Moving it to read shows them "we are on it"; done with a live_url shows them the link. Desk: ${SITE.url}/admin</p>`,
        '</div>',
      ].join(''),
      text: `${project.business} (${input.by}) asked for ${LABEL[input.kind]}.\n${input.title ?? ''}\n\n${body.slice(0, 4000)}\n\n${photos.join('\n')}`,
    });
  } catch {
    /* the row is the truth; the email is the courtesy */
  }

  return { ok: true, id: String(data.id) };
}
