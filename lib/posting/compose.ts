/**
 * SHAPE IT NOW. The same editor the nightly planner uses, run while the owner
 * is still standing there, so they see every platform's version before it is
 * on the calendar rather than the morning after.
 *
 * Why this exists next to `planner.ts` rather than inside it: the planner is a
 * queue worker with all night to wait for Claude, and this is a person with a
 * cursor blinking. So the wait is bounded, and when the drainer does not
 * answer inside it the mechanical editor's version is shown immediately,
 * labelled honestly, and the queued job is remembered on the row so the
 * better words can replace it before the hour comes. Nobody waits on a model
 * and nobody is shown a spinner that might never stop.
 *
 * Nothing here writes. Composing is reading; `scheduleComposed` is the write,
 * and it only runs when a person has seen the versions and pressed the button.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { LlmUnavailable, llmEnqueue, llmJson } from '@/lib/llm';
import { CAPTION_SCHEMA, captionsFromJson, scrub, systemPrompt, templateCaptions, userPrompt, type Brief } from './captions';
import { firstPublishAt, platformsFor } from './planner';
import { addDays, mountainDate } from './time';
import { PLATFORMS, type Captions, type Notes, type Platform, type SettingsRow } from './types';

/** How long the owner waits for Claude before the mechanical edit is shown instead. */
const WAIT_MS = 24_000;

export type Composed = {
  headline: string;
  captions: Captions;
  notes: Notes;
  /** Who shaped these words: Claude's edit, or the mechanical editor. */
  by: 'claude' | 'template';
  /** The queued edit, when the wait ran out. The scheduler keeps it so better words can still land. */
  jobId: string | null;
  /** The day it would take, and each platform's hour on that day. */
  date: string;
  hours: Array<{ platform: Platform; hour: number; at: string }>;
};

export type ComposeInput = { text: string; url?: string | null; link?: string | null; platforms?: Platform[] | null; note?: string | null; date?: string | null };

/** The next day with nothing on it, so a composed post never lands on top of one already there. */
export async function nextOpenDay(sb: SupabaseClient, clientEmail: string, from?: string): Promise<string> {
  const today = mountainDate();
  let date = from && from >= today ? from : today;
  const { data } = await sb.from('posting_posts').select('scheduled_for').eq('client_email', clientEmail).gte('scheduled_for', date).neq('status', 'skipped');
  const taken = new Set((data ?? []).map((r) => String(r.scheduled_for)));
  for (let i = 0; i < 400 && taken.has(date); i++) date = addDays(date, 1);
  return date;
}

function hoursFor(s: SettingsRow, date: string, platforms: Platform[]): Composed['hours'] {
  return platforms
    .map((platform) => {
      const at = firstPublishAt(s, date, [platform]);
      return { platform, hour: at.getHours(), at: at.toISOString() };
    })
    .sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Their words in, every platform's version out, now. Never throws on a slow
 * model: a bounded wait, then the mechanical editor, with the job id kept.
 */
export async function compose(sb: SupabaseClient, s: SettingsRow, input: ComposeInput): Promise<Composed> {
  const date = await nextOpenDay(sb, s.client_email, input.date ?? undefined);
  const platforms = platformsFor(s, input.platforms ?? null);
  const brief: Brief = {
    material: {
      text: input.text,
      note: input.note ?? null,
      url: input.url ?? null,
      wants_graphic: false,
      graphic_brief: null,
      link: input.link ?? null,
      platforms,
    },
    dateStr: date,
  };

  const fallback = () => {
    const t = templateCaptions(s, brief);
    return { headline: t.headline, captions: t.captions, notes: t.notes };
  };

  let words = fallback();
  let by: Composed['by'] = 'template';
  let jobId: string | null = null;

  try {
    const json = await llmJson<unknown>({
      system: systemPrompt(s),
      user: userPrompt(brief),
      label: `compose:${s.client_email}:${date}`,
      model: 'sonnet',
      schema: CAPTION_SCHEMA,
      timeoutMs: WAIT_MS,
    });
    const parsed = captionsFromJson(json);
    if (parsed) {
      words = parsed;
      by = 'claude';
    }
  } catch (err) {
    // A queued job is not a failure, it is a later answer. Keep its id so the
    // words can be upgraded on the row before the post's hour comes.
    if (err instanceof LlmUnavailable) {
      jobId = err.jobId;
    } else {
      // Any other fault (no drainer configured at all) still leaves them with
      // their own words, shaped. Silence here is deliberate: the caller has
      // something to show either way.
      try {
        jobId = await llmEnqueue({ system: systemPrompt(s), user: userPrompt(brief), label: `compose:${s.client_email}:${date}`, model: 'sonnet', schema: CAPTION_SCHEMA });
      } catch {
        jobId = null;
      }
    }
  }

  return { headline: words.headline, captions: scrub(words.captions), notes: words.notes, by, jobId, date, hours: hoursFor(s, date, platforms) };
}

export type ScheduleInput = {
  text: string;
  captions: Captions;
  notes?: Notes | null;
  headline?: string | null;
  url?: string | null;
  link?: string | null;
  platforms?: Platform[] | null;
  date?: string | null;
  jobId?: string | null;
  /**
   * True when a person changed a version by hand on the way through. It
   * decides whether a late answer from the model may still replace these
   * words: an untouched mechanical edit should be upgraded when Claude
   * finally answers, and a line somebody typed themselves must never be.
   */
  edited?: boolean;
  /** The person at the desk, for the record on both rows. */
  by: string;
};

export type Scheduled = { date: string; postId: string; platforms: Platform[]; hours: Composed['hours'] };

/**
 * Put the versions a person has just read onto the calendar.
 *
 * The material row is written first and marked used, so the nightly planner
 * never gives the same words a second day. The post lands already written and
 * already approved: a person read every version on the screen they pressed
 * the button on, which is what approval means. `edited_by` records them, so
 * the desk can tell a hand-shaped post from a queued one.
 */
export async function scheduleComposed(sb: SupabaseClient, s: SettingsRow, input: ScheduleInput): Promise<Scheduled | { error: string }> {
  const text = input.text.trim().slice(0, 4000);
  if (text.length < 3) return { error: 'Type what you want said first.' };

  const platforms = platformsFor(s, input.platforms ?? null);
  if (!platforms.length) return { error: 'Pick at least one place to post it.' };

  const captions = scrub(input.captions ?? {});
  const missing = platforms.filter((p) => !(captions[p] ?? '').trim());
  if (missing.length) return { error: `There are no words for ${missing.join(', ')} yet.` };

  const date = await nextOpenDay(sb, s.client_email, input.date ?? undefined);

  const { data: material, error: materialError } = await sb
    .from('posting_materials')
    .insert({
      client_email: s.client_email,
      kind: 'post',
      text,
      url: input.url ?? null,
      platforms,
      link: input.link ?? null,
      wants_graphic: false,
      graphic_brief: null,
      note: null,
      uploaded_by: input.by,
      // Used on the way in: this post has its day already, and a fresh row
      // would have the planner hand the same words a second one.
      status: 'used',
      used_count: 1,
      last_used_on: date,
    })
    .select('id')
    .single();
  if (materialError || !material) return { error: 'That did not save. Try once more.' };

  const notes: Notes = {};
  for (const p of PLATFORMS) {
    const n = input.notes?.[p];
    if (typeof n === 'string' && n.trim()) notes[p] = n.trim().slice(0, 240);
  }

  const now = new Date().toISOString();
  const { data: post, error } = await sb
    .from('posting_posts')
    .upsert(
      {
        client_email: s.client_email,
        scheduled_for: date,
        publish_at: firstPublishAt(s, date, platforms).toISOString(),
        material_id: material.id,
        image_url: input.url ?? null,
        link: input.link ?? null,
        platforms,
        headline: (input.headline ?? text.split(/[.!?\n]/)[0] ?? 'Post').trim().slice(0, 80) || 'Post',
        captions,
        notes: Object.keys(notes).length ? notes : null,
        source: 'material',
        evergreen_key: null,
        status: 'scheduled',
        results: {},
        // Read on screen, version by version, before the button was pressed.
        approved_at: now,
        approved_by: input.by,
        llm_job_id: input.jobId ?? null,
        written_by: input.jobId ? 'template' : 'claude',
        // Only a hand edit blocks `upgradeWords`. An untouched mechanical
        // edit stays open to the better words if the drainer answers before
        // the hour.
        edited_by: input.edited ? input.by : null,
        updated_at: now,
      },
      { onConflict: 'client_email,scheduled_for' },
    )
    .select('id')
    .single();
  if (error || !post) return { error: 'That did not reach the calendar. Try once more.' };

  return { date, postId: String(post.id), platforms, hours: hoursFor(s, date, platforms) };
}
