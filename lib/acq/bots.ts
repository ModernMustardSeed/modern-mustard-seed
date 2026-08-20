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
 *   2. The reservoir lies. A scanner hit flips a lead to `engaged`, so the
 *      board fills with prospects who never saw the email.
 *   3. The decisions that follow are made on the lie. Copy gets judged, budget
 *      gets moved, a channel gets called working, all off machine traffic.
 *
 * So every inbound engagement hit is classified before it is recorded. Nothing
 * is discarded: a machine hit still gets its timeline row, tagged `machine`
 * with the reason, because "this address is behind a scanner" is real
 * intelligence about a prospect. It just never counts as a person.
 *
 * TWO SIGNALS, and the second is the one that actually works.
 *
 * The user agent catches the honest scanners. Increasingly they spoof a real
 * Chrome string, so it catches fewer every year and is the weaker test.
 *
 * The clock catches the rest. A scanner follows the link inside the delivery
 * pipeline, seconds after the send. A human reads their mail on their own
 * schedule. Nobody receives a cold email and clicks it 40 seconds later, and
 * when most of a campaign appears to do exactly that, the campaign is being
 * read by software.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Under this many seconds after the send, a click is machinery. Two minutes is
 * deliberately conservative: it will let some scanners through rather than
 * discard a fast real human, and the funnel we want is the pessimistic one.
 */
export const HUMAN_DELAY_SECONDS = 120;

/**
 * Agents that announce themselves. Security gateways, link expanders, chat
 * unfurlers and plain scripting clients. Matched case-insensitively against
 * the whole string, so a substring is enough.
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
  'bingpreview', 'skypeuripreview', 'microsoftpreview', 'office', 'outlook',
  'googleimageproxy', 'google-read-aloud', 'feedfetcher', 'appengine',
  'yahoomailproxy', 'yandexbot',
  // Unfurlers
  'slackbot', 'slack-imgproxy', 'discordbot', 'facebookexternalhit', 'twitterbot',
  'linkedinbot', 'whatsapp', 'telegrambot', 'skypepreview', 'redditbot',
  'embedly', 'quora link preview', 'pinterest',
  // Plain automation
  'curl/', 'wget', 'python-requests', 'python-urllib', 'go-http-client', 'okhttp',
  'axios', 'node-fetch', 'httpclient', 'java/', 'libwww', 'lwp::', 'guzzle',
  'phantomjs', 'headlesschrome', 'puppeteer', 'playwright', 'selenium',
  // The generic tail
  'bot', 'crawler', 'spider', 'scanner', 'scan.', 'monitor', 'validator',
  'preview', 'fetcher', 'archiver', 'checker',
];

export type HitVerdict = {
  /** True when this hit is software, not a person. */
  machine: boolean;
  /** Short, human-readable reason. Goes straight onto the timeline row. */
  why: string;
  /** The agent string as sent, trimmed for storage. Null when absent. */
  ua: string | null;
  /** Seconds between our send and this hit, when we could work it out. */
  secondsAfterSend: number | null;
};

/**
 * Classify a user agent on its own. Used where there is no lead to date the
 * hit against, and as the first half of `classifyHit`.
 *
 * An absent or trivially short agent counts as machine: every real browser
 * sends one, and a request without one came from a script.
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
 * Never throws and never blocks: a classifier that cannot reach the database
 * returns the agent verdict alone rather than sitting between a curious
 * contractor and the page they clicked toward.
 */
export async function classifyHit(
  db: SupabaseClient | null,
  leadId: string | null,
  headers: Headers,
): Promise<HitVerdict> {
  const uaRaw = headers.get('user-agent');
  const ua = uaRaw ? uaRaw.slice(0, 400) : null;
  const agent = classifyAgent(uaRaw);

  let secondsAfterSend: number | null = null;
  if (db && leadId) {
    try {
      const { data } = await db
        .from('acq_events')
        .select('occurred_at')
        .eq('lead_id', leadId)
        .eq('type', 'email_sent')
        .order('occurred_at', { ascending: false })
        .limit(1);
      const sentAt = (data ?? [])[0]?.occurred_at as string | undefined;
      if (sentAt) {
        const delta = (Date.now() - new Date(sentAt).getTime()) / 1000;
        if (delta >= 0) secondsAfterSend = Math.round(delta);
      }
    } catch {
      /* an unreadable timeline costs us the clock signal, nothing more */
    }
  }

  if (agent.machine) return { machine: true, why: agent.why, ua, secondsAfterSend };

  if (secondsAfterSend !== null && secondsAfterSend < HUMAN_DELAY_SECONDS) {
    return {
      machine: true,
      why: `Arrived ${secondsAfterSend}s after the send, inside the delivery scan window`,
      ua,
      secondsAfterSend,
    };
  }

  return { machine: false, why: 'Human', ua, secondsAfterSend };
}

/** The detail blob every classified engagement event carries. */
export function verdictDetail(v: HitVerdict): Record<string, unknown> {
  return { machine: v.machine, machine_why: v.machine ? v.why : null, ua: v.ua, seconds_after_send: v.secondsAfterSend };
}
