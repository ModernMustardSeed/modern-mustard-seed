/**
 * THE PROOF BANK.
 *
 * Every number we quote at a stranger about missed calls and response speed,
 * in one place, so the /voice-agents page and the cold emails can never drift
 * apart and nobody has to retype a figure from memory.
 *
 * ── THE BAR ──────────────────────────────────────────────────────────────────
 * A number goes in here only if it has a NAMED, DATED, PUBLISHED source that a
 * skeptical contractor could go and read. That is not fussiness. Our whole cold
 * pitch is "here is the arithmetic, with the assumptions showing," and one
 * invented statistic discredits the honest ones sitting next to it.
 *
 * Numbers deliberately kept OUT, all of which circulate widely in this industry
 * and none of which have a traceable primary source:
 *   "85% of callers never call back"       no primary study, cited circularly
 *   "$126,000 a year in lost revenue"      a vendor blog figure with no method
 *   "62% of business calls go unanswered"  same vendor blog family
 *
 * Where the honest answer is a RANGE, we publish the range. `spread` exists for
 * exactly that. A range reads as somebody who actually looked; a suspiciously
 * round single number reads as somebody who did not.
 */

export type ProofStat = {
  /** Stable id. Referenced by the email sequence, so do not renumber. */
  id: string;
  /** The headline figure, already formatted. */
  figure: string;
  /** Three or four words. The card label. */
  label: string;
  /** One or two sentences. Plain language, no jargon, no hype. */
  body: string;
  /** Shown verbatim under the figure. Never blank. */
  source: string;
  /**
   * Set when published estimates genuinely disagree. When present, the email
   * copy must show the spread rather than pretending `figure` is settled.
   */
  spread?: string;
};

/**
 * The public wall, on /voice-agents and /mustard. Verified when those pages
 * were built and the canonical set for public marketing.
 *
 * ⚠️ PULLED 2026-08-18, on Sarah's instruction: "take the 52% stat off
 * everywhere". That was `prefer-the-ai`, CallRail 2025, "52% say an AI
 * answering after hours signals better service". It met the sourcing bar above,
 * so this is a judgement call about what we want to argue, not a correction.
 * Do not put it back without asking her. Its hand-written copies on
 * /talking-website and in data/social-cards.ts came out in the same commit.
 */
export const CALL_STATS: ProofStat[] = [
  {
    id: 'call-the-next-guy',
    figure: '82%',
    label: 'Call the next guy',
    body: 'After one unanswered call, most people do not try again. They call a competitor.',
    source: 'CallRail, 2025',
  },
  {
    id: 'already-walked',
    figure: '78%',
    label: 'Already walked',
    body: 'Have abandoned a business over a call nobody picked up. Not a bad review. Just gone.',
    source: 'CallRail, 2025',
  },
  {
    id: 'within-the-hour',
    figure: '7x',
    label: 'Within the hour',
    body: 'Higher odds of qualifying a lead when you respond inside an hour. Your agent responds in one ring.',
    source: 'Harvard Business Review, 2011',
  },
];

/**
 * Speed to lead. Same 2011 HBR paper as `within-the-hour` above: Oldroyd,
 * McElheran and Elkington, "The Short Life of Online Sales Leads," built on
 * roughly 100,000 call attempts. The 7x figure is the one-hour window; this is
 * the one-minute window from the same dataset.
 *
 * Scope stated honestly because it matters: the underlying data is outbound
 * call-center activity, so treat it as direction and magnitude rather than a
 * promise about any one HVAC company's phone.
 */
export const SPEED_TO_LEAD: ProofStat = {
  id: 'first-minute',
  figure: '391%',
  label: 'The first minute',
  body: 'Higher conversion when the call is answered inside one minute rather than thirty. Speed is the variable, not the script.',
  source: 'Oldroyd, McElheran & Elkington, Harvard Business Review, 2011',
};

/**
 * The voicemail hangup.
 *
 * Sarah asked for the round 80%. Published estimates run from 67% (BIA/Kelsey)
 * to 86%, with Marchex and Hiya landing near 80, and no single study is the
 * agreed primary. So the figure carries its spread and the copy says "roughly."
 * The claim underneath ("most people who reach voicemail hang up") is not in
 * dispute anywhere, and it is the claim that actually does the work.
 */
export const VOICEMAIL_SILENCE: ProofStat = {
  id: 'voicemail-silence',
  figure: '~80%',
  label: 'Say nothing at all',
  body: 'Most people who reach a business voicemail hang up without leaving one. You never learn they called.',
  source: 'Marchex and Hiya call data',
  spread: 'published estimates run from 67% to 86%',
};

/** Look one up by id. Throws loudly rather than rendering an empty email. */
export function proofStat(id: string): ProofStat {
  const all = [...CALL_STATS, SPEED_TO_LEAD, VOICEMAIL_SILENCE];
  const found = all.find((s) => s.id === id);
  if (!found) throw new Error(`No proof stat with id "${id}". Add it to data/proof-stats.ts with a real citation.`);
  return found;
}
