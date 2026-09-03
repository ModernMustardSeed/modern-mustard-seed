import { z } from 'zod';

/**
 * The Opps Desk: Sarah's own pipeline of fractional seats, contracts, founder
 * programs, expert networks and partner programs. Same house style as the
 * outbound lead: a text status with a CHECK constraint in Postgres, mirrored
 * here as a const tuple and a label map.
 */

export const OPP_STATUSES = ['new', 'shortlist', 'applied', 'replied', 'interview', 'offer', 'won', 'passed'] as const;
export type OppStatus = (typeof OPP_STATUSES)[number];

export const OPP_STATUS_LABELS: Record<OppStatus, string> = {
  new: 'New',
  shortlist: 'Shortlist',
  applied: 'Applied',
  replied: 'Replied',
  interview: 'In conversation',
  offer: 'Offer',
  won: 'Won',
  passed: 'Passed',
};

export const OPP_GROUPS = ['lead', 'eir', 'build', 'creative', 'expert', 'partner'] as const;
export type OppGroup = (typeof OPP_GROUPS)[number];

export const OPP_GROUP_LABELS: Record<OppGroup, string> = {
  lead: 'Fractional leadership',
  eir: 'Founder seats',
  build: 'Build contracts',
  creative: 'Creative direction',
  expert: 'Paid expertise',
  partner: 'Partner programs',
};

export type Opp = {
  id: string;
  company: string;
  title: string;
  url: string;
  group: OppGroup;
  type: string;
  pay: string | null;
  why_fit: string | null;
  source: string | null;
  deadline: string | null;
  verified: boolean;
  status: OppStatus;
  priority: 1 | 2 | 3;
  starred: boolean;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  next_step: string | null;
  next_step_at: string | null;
  applied_at: string | null;
  last_action_at: string | null;
  last_email_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OppMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  from_addr: string | null;
  to_addr: string | null;
  subject: string | null;
  body: string | null;
  snippet: string | null;
  occurred_at: string;
};

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const oppCreateSchema = z.object({
  company: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  url: z.string().trim().url().max(2000),
  group: z.enum(OPP_GROUPS).default('lead'),
  type: z.string().trim().min(1).max(60).default('contract'),
  pay: z.preprocess(emptyToNull, z.string().max(500).nullable()).optional(),
  why_fit: z.preprocess(emptyToNull, z.string().max(2000).nullable()).optional(),
  source: z.preprocess(emptyToNull, z.string().max(300).nullable()).optional(),
  deadline: z.preprocess(emptyToNull, z.string().max(120).nullable()).optional(),
  verified: z.boolean().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  contact_name: z.preprocess(emptyToNull, z.string().max(200).nullable()).optional(),
  contact_email: z.preprocess(emptyToNull, z.string().email().max(320).nullable()).optional(),
  notes: z.preprocess(emptyToNull, z.string().max(20000).nullable()).optional(),
});
export type OppCreate = z.infer<typeof oppCreateSchema>;

export const oppPatchSchema = oppCreateSchema.partial().extend({
  status: z.enum(OPP_STATUSES).optional(),
  starred: z.boolean().optional(),
  next_step: z.preprocess(emptyToNull, z.string().max(500).nullable()).optional(),
  next_step_at: z.preprocess(emptyToNull, z.string().datetime({ offset: true }).nullable()).optional(),
});
export type OppPatch = z.infer<typeof oppPatchSchema>;

export const oppImportSchema = z.object({
  opps: z.array(oppCreateSchema).min(1).max(500),
});

export const oppEmailSchema = z.object({
  to: z.string().trim().email(),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(10000),
});

export const RESUME_URL = 'https://sarahscarano.com';

/**
 * A first-touch draft the desk offers with one click. Deterministic, short,
 * specific to the row, and it always carries the magazine link. Sarah edits
 * before it goes; the desk never sends on its own.
 */
/** The fit notes are written about her; the email is written by her. */
export function firstPerson(s: string): string {
  const verbs: Record<string, string> = { runs: 'run', sells: 'sell', builds: 'build', ships: 'ship', operates: 'operate', qualifies: 'qualify', knows: 'know', does: 'do', has: 'have', wants: 'want', lives: 'live', prospects: 'prospect', speaks: 'speak', delivers: 'deliver' };
  return s
    .replace(/\bshe is\b/gi, 'I am')
    .replace(/\bshe\b/gi, 'I')
    .replace(/\bHer\b/g, 'My')
    .replace(/\bher\b/g, 'my')
    .replace(/\bSarah's\b/g, 'my')
    .replace(/\bSarah\b/g, 'I')
    .replace(/\bI (runs|sells|builds|ships|operates|qualifies|knows|does|has|wants|lives|prospects|speaks|delivers)\b/g, (_m, v: string) => `I ${verbs[v]}`);
}

export function draftIntro(opp: Pick<Opp, 'company' | 'title' | 'why_fit' | 'group'>, contactName?: string | null): { subject: string; body: string } {
  const first = (contactName || '').trim().split(/\s+/)[0];
  const greeting = first ? `Hi ${first},` : 'Hi there,';
  const isPartner = opp.group === 'partner';
  const isExpert = opp.group === 'expert';
  const subject = isPartner
    ? `Modern Mustard Seed and the ${opp.company} partner program`
    : `${opp.title} at ${opp.company}: Sarah Scarano`;
  const why = firstPerson((opp.why_fit || '').replace(/\s+/g, ' ').trim());
  const lines = [
    greeting,
    '',
    isPartner
      ? `I run Modern Mustard Seed, an AI product studio, and we already ship on ${opp.company} for real clients. I would like to be in the ${opp.company} partner program properly.`
      : isExpert
        ? `I saw the ${opp.title} program at ${opp.company} and I would like to be part of it.`
        : `I saw the ${opp.title} seat at ${opp.company} and I want it.`,
    '',
    'The short version: fifteen years of high-ticket sales and design, three years building in AI, automation and code, and the last nine months in the open: 65 repositories, 2,120 commits, and 20 products in production, including voice agents that take orders, send decks and start software builds while the caller is still on the line.',
    '',
    why ? `Why this one: ${why}` : '',
    why ? '' : '',
    `My resume is an art gallery you can walk in two minutes: ${RESUME_URL}`,
    '',
    'If it is worth a conversation, I can have a prototype for you by the second call.',
    '',
    'Sarah',
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));
  return { subject, body: lines.join('\n') };
}
