/**
 * THE MACHINE FILTER.
 *
 * Corporate mail is scanned before a human ever sees it. Proofpoint, Mimecast,
 * Barracuda, Defender for Office and a dozen others open every message and
 * follow every URL inside it to decide whether the link is safe. To our stack
 * that is indistinguishable from a contractor tapping the button: same GET,
 * same redirect, same landing page, same row on the timeline.
 *
 * Left unfiltered it does three specific harms:
 *
 *   1. The funnel lies. "67 clicks" reads as interest when it is antivirus.
 *   2. The reservoir lies. A scanner hit flipped a lead to `engaged`, so the
 *      board filled with prospects who never saw the email.
 *   3. Every decision downstream is made on the lie. Copy gets judged, budget
 *      gets moved, a channel gets called working, all off machine traffic.
 *
 * So every inbound engagement hit is classified before it is recorded. Nothing
 * is discarded: a machine hit still gets its timeline row, tagged `machine`
 * with the reason, because "this address is behind a scanner" is real
 * intelligence about a prospect. It just never counts as a person.
 *
 * THE ONE MISTAKE THIS FILE MUST NOT MAKE is throwing away a real human, so
 * every rule below is bounded. The agent test and the clock test can only ever
 * discount a hit, never a prospect; the poller test refuses to touch a
 * prospect's first two hits; and proof-of-life overrides all three the moment
 * somebody proves they exist by consenting, replying or picking up the phone.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** The event kinds this filter judges. */
export type HitType = 'link_clicked' | 'permission_visited' | 'email_opened';

/**
 * THE CLOCK TEST.
 *
 * Under this many seconds after the send it followed, a hit is machinery.
 *
 * Five minutes is not a round number picked for comfort, it is where the
 * observed distribution ends. Across the first 93 dated hits on this campaign:
 * 34 under a minute, 21 in the second minute, 17 in the third, 7 through the
 * fifth, then it falls off a cliff to 3. That shoulder is the delivery
 * pipeline finishing its sweep. Everything past it is either a person or a
 * re-validation loop, and the poller test below separates those two.
 *
 * Re-derive this if the sending infrastructure changes. A threshold inherited
 * from a distribution that no longer exists is just a superstition.
 */
export const HUMAN_DELAY_SECONDS = 300;

/**
 * THE POLLER TEST, and the reason the clock alone is not enough.
 *
 * Some gateways do not follow the link once at delivery. They re-validate it
 * on a schedule, and the schedule is visible in the data: one prospect
 * produced clicks at 12, 26, 41, 54 and 64 minutes after the send, another at
 * 14, 36, 49 and 64. Gaps of thirteen to fifteen minutes, five times running.
 * A person clicks the button. A person does not click it every quarter hour
 * all afternoon.
 *
 * Once a lead has already produced this many hits of the same kind inside the
 * window, the next one is a poll rather than a visit.
 *
 * Note what this deliberately does NOT do: it never flags the first two hits,
 * so no prospect can be erased from the board by this rule. The most it costs
 * is a repeat that was never worth counting twice.
 */
export const POLL_WINDOW_MINUTES = 90;
export const POLL_PRIOR_HITS = 2;

/**
 * Events that prove a person is real. Nobody's antivirus consents to a call,
 * writes a reply or holds a conversation. Once any of these is on a lead, the
 * filter stops second-guessing that lead's clicks: a prospect who gave us
 * their number on Tuesday and clicks again on Thursday is a prospect.
 */
const PROOF_OF_LIFE = [
  'consent_captured',
  'reply',
  'call_started',
  'call_completed',
  'call_inbound',
  'meeting_booked',
  'purchased',
] as const;

/**
 * Agents that announce themselves. Security gateways, link expanders, chat
 * unfurlers and plain scripting clients. Matched case-insensitively as a
 * substring, so a version suffix does not defeat an entry.
 *
 * This is the weakest of the three tests and gets weaker every year, because
 * the serious gateways now present a current Chrome string. It is kept because
 * it is free and it catches the honest ones.
 */
const MACHINE_AGENTS = [
  // Mail security gateways and URL detonation
  'proofpoint', 'mimecast', 'barracuda', 'symantec', 'messagelabs', 'forcepoint',
  'fireeye', 'ironport', 'zscaler', 'netskope', 'trendmicro', 'trend micro',
  'sophos', 'eset', 'avast', 'kaspersky', 'mcafee', 'fortinet', 'fortigate',
  'paloalto', 'wildfire', 'area1', 'abnormal', 'ironscales', 'vadesecure',
  'spamtitan', 'hornetsecurity', 'cloudmark', 'safelinks', 'urldefense',
  'bitdefender', 'gdata', 'clearswift', 'retarus', 'libraesva', 'sonicwall',
  // Microsoft, Google and friends fetching on the reader's behalf
  'bingpreview', 'skypeuripreview', 'microsoftpreview', 'googleimageproxy',
  'google-read-aloud', 'feedfetcher', 'appengine', 'yahoomailproxy', 'yandexbot',
  // Unfurlers
  'slackbot', 'slack-imgproxy', 'discordbot', 'facebookexternalhit', 'twitterbot',
  'linkedinbot', 'whatsapp', 'telegrambot', 'skypepreview', 'redditbot',
  'embedly', 'quora link preview', 'pinterest',
  // Plain automation
  'curl/', 'wget', 'python-requests', 'python-urllib', 'go-http-client', 'okhttp',
  'axios', 'node-fetch', 'httpclient', 'java/', 'libwww', 'lwp::', 'guzzle',
  'phantomjs', 'headlesschrome', 'puppeteer', 'playwright', 'selenium',
  // The generic tail
  'bot', 'crawler', 'spider', 'scanner', 'monitor', 'validator', 'preview',
  'fetcher', 'archiver', 'checker',
];

export type HitVerdict = {
  /** True when this hit is software, not a person. */
  machine: boolean;
  /** Short, human-readable reason. Goes straight onto the timeline row. */
  why: string;
  /** The agent string as sent, trimmed for storage. Null when absent. */
  ua: string | null;
  /** Seconds between the send this hit followed and the hit, when known. */
  secondsAfterSend: number | null;
  /** Hits of this kind already on this prospect inside the poll window. */
  priorHits: number | null;
  /** True when this prospect has already proved they are a person. */
  knownHuman: boolean;
};

/**
 * Classify a user agent on its own. Used where there is no prospect to date
 * the hit against, and as one test inside `classifyHit`.
 *
 * An absent or trivially short agent counts as machine: every real browser
 * sends one, so a request without one came from a script.
 */
export function classifyAgent(uaRaw: string | null | undefined): { machine: boolean; why: string } {
  const ua = (uaRaw ?? '').trim();
  if (ua.length < 12) return { machine: true, why: 'No browser agent on the request' };
  const lower = ua.toLowerCase();
  for (const needle of MACHINE_AGENTS) {
    if (lower.includes(needle)) return { machine: true, why: `Scanner or automated agent (${needle})` };
  }
  return { machine: false, why: 'Looks like a browser' };
}

/**
 * The full verdict for an engagement hit on a known prospect.
 *
 * Two round trips, no more: one for the send this hit is following, one that
 * fetches the prospect's own recent history and answers both the poller test
 * and proof-of-life at once.
 *
 * Never throws and never blocks. A classifier that cannot reach the database
 * falls back to the agent test alone rather than sitting between a curious
 * contractor and the page they clicked toward.
 */
export async function classifyHit(
  db: SupabaseClient | null,
  args: { leadId: string | null; type: HitType; headers: Headers },
): Promise<HitVerdict> {
  const { leadId, type, headers } = args;
  const uaRaw = headers.get('user-agent');
  const ua = uaRaw ? uaRaw.slice(0, 400) : null;
  const agent = classifyAgent(uaRaw);

  const bare = { ua, secondsAfterSend: null, priorHits: null, knownHuman: false };
  if (!db || !leadId) {
    return agent.machine ? { machine: true, why: agent.why, ...bare } : { machine: false, why: 'Human', ...bare };
  }

  const now = Date.now();
  let secondsAfterSend: number | null = null;
  let priorHits: number | null = null;
  let knownHuman = false;

  // The send this hit is FOLLOWING, meaning the most recent one at or before
  // now. Never the prospect's newest send in the abstract: a click made thirty
  // seconds after email one must not start looking considered the moment email
  // two goes out a week later.
  try {
    const { data } = await db
      .from('acq_events')
      .select('occurred_at')
      .eq('lead_id', leadId)
      .eq('type', 'email_sent')
      .lte('occurred_at', new Date(now).toISOString())
      .order('occurred_at', { ascending: false })
      .limit(1);
    const sentAt = (data ?? [])[0]?.occurred_at as string | undefined;
    if (sentAt) {
      const delta = (now - new Date(sentAt).getTime()) / 1000;
      if (delta >= 0) secondsAfterSend = Math.round(delta);
    }
  } catch {
    /* an unreadable timeline costs us the clock signal, nothing more */
  }

  try {
    const { data } = await db
      .from('acq_events')
      .select('type,occurred_at')
      .eq('lead_id', leadId)
      .in('type', [type, ...PROOF_OF_LIFE])
      .order('occurred_at', { ascending: false })
      .limit(200);
    const rows = (data ?? []) as { type: string; occurred_at: string }[];
    const since = now - POLL_WINDOW_MINUTES * 60_000;
    priorHits = rows.filter((r) => r.type === type && new Date(r.occurred_at).getTime() >= since).length;
    knownHuman = rows.some((r) => (PROOF_OF_LIFE as readonly string[]).includes(r.type));
  } catch {
    /* same: a missing history costs us two signals, not the request */
  }

  const detail = { ua, secondsAfterSend, priorHits, knownHuman };

  // Proof of life outranks every heuristic below it. Somebody who has already
  // given us their number is not reclassified as antivirus by a fast click.
  if (knownHuman) return { machine: false, why: 'Prospect has already proved they are a person', ...detail };

  if (agent.machine) return { machine: true, why: agent.why, ...detail };

  if (secondsAfterSend !== null && secondsAfterSend < HUMAN_DELAY_SECONDS) {
    return {
      machine: true,
      why: `Arrived ${secondsAfterSend}s after the send, inside the delivery scan window`,
      ...detail,
    };
  }

  if (priorHits !== null && priorHits >= POLL_PRIOR_HITS) {
    return {
      machine: true,
      why: `Hit ${priorHits + 1} from this prospect inside ${POLL_WINDOW_MINUTES} minutes: a re-validation loop, not a visit`,
      ...detail,
    };
  }

  return { machine: false, why: 'Human', ...detail };
}

/** The detail blob every classified engagement event carries. */
export function verdictDetail(v: HitVerdict): Record<string, unknown> {
  return {
    machine: v.machine,
    machine_why: v.machine ? v.why : null,
    ua: v.ua,
    seconds_after_send: v.secondsAfterSend,
    prior_hits: v.priorHits,
    known_human: v.knownHuman,
  };
}
