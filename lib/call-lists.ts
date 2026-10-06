import { z } from 'zod';

/**
 * Call Lists: the cold-call sheets of businesses that just opened, one row per
 * business in public.call_list_rows. Each list is ranked into three groups,
 * and each group has its own opener. Whoever dials marks the outcome on the row.
 */

export const CALL_GROUPS = ['no_site', 'page_only', 'has_site'] as const;
export type CallGroup = (typeof CALL_GROUPS)[number];

export const GROUP_COPY: Record<CallGroup, { title: string; sub: string; script: string }> = {
  no_site: {
    title: 'No website',
    sub: 'Their Google listing has no website at all. The strongest calls.',
    script:
      "Hi, is this the owner? This is Sarah with Modern Mustard Seed. I saw you just opened, congratulations! I build websites for small businesses, and I'd love to make you a free sketch of yours, no strings attached. If you love it, it's $497 to keep it: your photos and style, on your own domain, built so Google and ChatGPT can find and recommend you. Can I make you one?",
  },
  page_only: {
    title: 'A page, not a website',
    sub: 'Their Google listing sends people to a booking page, a Facebook or Instagram profile, a directory, or a site with almost nothing on it.',
    script:
      "...I saw you just opened, congratulations! I noticed your Google listing sends people to your [booking page / Facebook page]. I build websites for small businesses, and I'd love to make you a free sketch of a real one, no strings attached. If you love it, it's $497 to keep it, on your own domain, built so Google and ChatGPT can find and recommend you. Can I make you one?",
  },
  has_site: {
    title: 'New, with a site',
    sub: 'Owner-run and brand new, with a site already. Lead with being found, not with the site.',
    script:
      "...I saw you just opened, congratulations! I build websites that Google and ChatGPT recommend, and I'd love to make you a free sketch of a new homepage, no strings attached. If you love it, it's $497. Want to see it?",
  },
};

export const ON_A_YES =
  'Get four things: the business name spelled out, the best email or cell for the link, a Facebook page or a few photos to pull from, and what they want customers to do (call, book, stop in). The sketch goes out first; the $147 a month comes up after they have seen it. Outside Montana, say "Modern Mustard Seed," never Kalispell.';

export const CALL_OUTCOMES = ['new', 'no_answer', 'voicemail', 'call_back', 'not_interested', 'yes', 'wrong_number'] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  new: 'Not called',
  no_answer: 'No answer',
  voicemail: 'Voicemail',
  call_back: 'Call back',
  not_interested: 'Not interested',
  yes: 'Yes, sketch it',
  wrong_number: 'Wrong number',
};

/** Outcomes that mean the row still needs another dial. */
export const OPEN_OUTCOMES: CallOutcome[] = ['new', 'no_answer', 'voicemail', 'call_back'];

export type CallListRow = {
  id: string;
  list_slug: string;
  list_title: string;
  position: number;
  grp: CallGroup;
  business_name: string;
  category: string | null;
  town: string | null;
  phone: string;
  opened: string | null;
  finding: string | null;
  website: string | null;
  maps_url: string | null;
  place_id: string | null;
  outcome: CallOutcome;
  notes: string | null;
  called_by: string | null;
  called_at: string | null;
  created_at: string;
  updated_at: string;
};

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const rowPatchSchema = z.object({
  outcome: z.enum(CALL_OUTCOMES).optional(),
  notes: z.preprocess(emptyToNull, z.string().trim().max(4000).nullable()).optional(),
  called_by: z.preprocess(emptyToNull, z.string().trim().max(80).nullable()).optional(),
});

/** tel: link for a US number as printed on Google ("(406) 555-0101" or "+1 406..."). */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:+${digits.length === 10 ? `1${digits}` : digits}`;
}
