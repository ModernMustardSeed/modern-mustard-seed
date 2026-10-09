/**
 * THE IDEA DIRECTOR WORKSHEET. The pre-work every ticket and cohort seat does
 * before kickoff: seven questions that turn one idea into a brief an agent can
 * build from. The answers save to the person's room, Sarah reads them before
 * Day 2 (the front row is picked from them), and the brief at the bottom is
 * what they paste into their first agent on Day 3.
 *
 * Questions are written for an owner, not an engineer. Each one has an
 * example from a real kind of business so nobody stares at a blank box.
 */

export type WorksheetQuestion = {
  key: string;
  n: number;
  title: string;
  prompt: string;
  example: string;
  /** Short answers stay one line; long ones get a paragraph box. */
  long: boolean;
};

export const WORKSHEET_NAME = 'The Idea Director Worksheet';
export const WORKSHEET_MINUTES = 20;

export const worksheetQuestions: WorksheetQuestion[] = [
  {
    key: 'business',
    n: 1,
    title: 'The business, in one sentence',
    prompt: 'What you sell, to whom, and where. The sentence a stranger would need to understand everything after it.',
    example: 'We build custom homes and do whole-house remodels in the Flathead Valley, mostly for families moving here from out of state.',
    long: false,
  },
  {
    key: 'job',
    n: 2,
    title: 'The job you would hand off first',
    prompt: 'The recurring work that eats your week. How often it comes up, and roughly how long it takes you each time.',
    example: 'Following up on plan requests. Three to five a week, and each one is a call, two emails and a reminder to myself that I usually miss.',
    long: true,
  },
  {
    key: 'done',
    n: 3,
    title: 'What done right looks like',
    prompt: 'How you would know the agent did the job. Be specific enough that you could check it in two minutes.',
    example: 'Every plan request gets a reply inside an hour, the site walk is on my calendar within three days, and I get one line a morning saying who is booked.',
    long: true,
  },
  {
    key: 'never',
    n: 4,
    title: 'What it must never do',
    prompt: 'The walls. Money, promises, prices, tone, anything that leaves the building without you.',
    example: 'Never quote a price. Never promise a start date. Never text anyone after 8 PM. Never send anything that sounds like a robot wrote it.',
    long: true,
  },
  {
    key: 'tools',
    n: 5,
    title: 'Where the work lives',
    prompt: 'The tools and accounts the agent would touch: calendar, inbox, phone line, CRM, website, the spreadsheet you swear you will replace.',
    example: 'Google Calendar, the info@ inbox, the contact form on our site, and a Google Sheet of every job since 2019.',
    long: false,
  },
  {
    key: 'voice',
    n: 6,
    title: 'How it should sound',
    prompt: 'Three words for your voice, and one sentence you have actually said to a customer that sounds like you.',
    example: 'Warm, plain, local. "We would love to walk the lot with you; Thursday or Friday morning?"',
    long: false,
  },
  {
    key: 'idea',
    n: 7,
    title: 'The idea you would build if someone else did the building',
    prompt: 'Not the job above. The thing you have wanted to exist for a year: a product, a tool, a new line of business, a system.',
    example: 'A portal where every client sees their build week by week, with photos, the next decision they owe us and the money to date.',
    long: true,
  },
];

const blank = (v: string | undefined) => !v || !v.trim();

/** How many of the seven are answered. */
export function worksheetProgress(answers: Record<string, string>): number {
  return worksheetQuestions.filter((q) => !blank(answers[q.key])).length;
}

/**
 * The brief an agent can build from, assembled from the answers. This is the
 * page they paste into their first agent on Day 3, so it reads as an
 * instruction, in second person to the agent.
 */
export function buildBrief(answers: Record<string, string>, who?: { name?: string | null; business?: string | null }): string {
  const a = (k: string) => (answers[k] ?? '').trim();
  const lines: string[] = [];
  const owner = who?.name?.trim();
  const biz = who?.business?.trim();
  lines.push(`BRIEF: ${biz || 'my business'}${owner ? `, from ${owner}` : ''}`);
  lines.push('');
  if (a('business')) lines.push(`The business: ${a('business')}`, '');
  if (a('job')) lines.push(`Your job: ${a('job')}`, '');
  if (a('done')) lines.push(`Done right means: ${a('done')}`, '');
  if (a('never')) lines.push(`You must never: ${a('never')}`, 'If a task would cross one of these lines, stop and ask me instead.', '');
  if (a('tools')) lines.push(`You work in: ${a('tools')}`, '');
  if (a('voice')) lines.push(`You sound like: ${a('voice')}`, '');
  lines.push('Every morning, tell me in three lines what you did, what is waiting on me, and anything that looked wrong.');
  if (a('idea')) lines.push('', `Later, the idea we build next: ${a('idea')}`);
  return lines.join('\n').trim();
}

export const WORKSHEET_KEYS = worksheetQuestions.map((q) => q.key);
export const WORKSHEET_ANSWER_MAX = 1500;
