/**
 * LEAD SCORING. One question, asked honestly: does a Voice Agent obviously make
 * this business money?
 *
 * The score is the sum of named reasons, and every reason is stored on the lead
 * so the CRM can show WHY a lead is worth calling rather than an unexplained
 * number. A reason with negative points is a real objection to the lead, not a
 * rounding adjustment: national chains and dead businesses are supposed to sink.
 *
 * Two component scores ride alongside the total because they are the actual
 * sales argument:
 *   callVolume  — how much this phone rings
 *   missedCall  — how much of that ringing currently goes unanswered
 */

import type { ScoreReason, Trade } from '@/lib/acq/types';

export type ScoreInput = {
  business_name?: string | null;
  trade?: Trade | null;
  website?: string | null;
  email?: string | null;
  email_status?: string | null;
  phone?: string | null;
  rating?: number | null;
  review_count?: number | null;
  hours?: Record<string, string> | null;
  open_24_7?: boolean | null;
  emergency_service?: boolean | null;
  city?: string | null;
  state?: string | null;
  /** Free text we scraped (tagline, services, meta description). */
  blurb?: string | null;
  /** True when the business is flagged closed by its source. */
  permanently_closed?: boolean | null;
};

export type ScoreResult = {
  score: number;
  callVolume: number;
  missedCall: number;
  priority: 1 | 2 | 3 | 4;
  reasons: ScoreReason[];
};

/** Recognizable national chains and franchise brands. Corporate call centers
 *  already answer the phone, so the offer has no economic case. */
const CHAINS = [
  'roto-rooter', 'roto rooter', 'mr rooter', 'mister rooter', 'benjamin franklin plumbing',
  'one hour heating', 'one hour air', 'aire serv', 'mister sparky', 'ars/rescue', 'ars rescue',
  'rescue rooter', 'servpro', 'servicemaster', 'leaffilter', 'leaf filter', 'lowes', "lowe's",
  'home depot', 'sears home', 'terminix', 'orkin', 'culligan', 'window world', 'power home remodeling',
  'renewal by andersen', 'champion windows', 'four seasons', 'horizon services', 'len the plumber',
  'michael and son', 'parker and sons', 'goettl', 'george brazil', 'chas roberts', 'hays cooling',
  'sila heating', 'sears', 'american residential', 'ars ', 'nexstar', 'blue dot', 'comfort systems usa',
  'abc home', 'tnt home', 'wm henderson', 'legacy air', 'aaa cooling',
];

const EMERGENCY_RE =
  /\b(24[\s/-]?7|24 hours?|24hr|around the clock|emergency|same[- ]day|after[- ]hours|nights? and weekends|anytime)\b/i;
const HIGH_TICKET_RE =
  /\b(replacement|install|installation|new system|re-?roof|full roof|repipe|water heater|furnace|heat pump|mini[- ]split|sewer line|main line|trenchless)\b/i;
const MULTI_TRUCK_RE =
  /\b(our (technicians|team|crews?|fleet)|\d{1,3}\s*(trucks?|technicians?|crews?)|locations? in|serving [a-z ,]+ and surrounding|family owned since)\b/i;
const ADS_RE = /\b(gtag|googleads|google_conversion|fbq\(|facebook pixel|gclid)\b/i;
const CLOSED_RE = /\b(permanently closed|out of business|no longer (in business|accepting))\b/i;

/** Trades where a missed call is unambiguously a lost job. */
const CALL_DRIVEN: Trade[] = ['hvac', 'plumbing', 'roofing'];

export function scoreLead(input: ScoreInput): ScoreResult {
  const reasons: ScoreReason[] = [];
  const add = (label: string, points: number) => {
    if (points !== 0) reasons.push({ label, points });
  };

  const name = String(input.business_name || '').toLowerCase();
  const blurb = String(input.blurb || '');
  const reviews = Number(input.review_count ?? 0);
  const rating = Number(input.rating ?? 0);

  /* ── reachability: can we actually run the play at all ── */

  if (input.email_status === 'verified') add('Verified business email', 30);
  else if (input.email_status === 'likely') add('Likely valid business email', 22);
  else if (input.email_status === 'public') add('Email publicly listed by the business', 18);
  else if (input.email_status === 'risky') add('Email looks risky, will not be mailed', -25);
  else if (input.email_status === 'invalid') add('Email is invalid', -60);
  else add('No public email found', -30);

  if (input.website) add('Has a real website', 8);
  else add('No website', -12);

  if (!input.phone) add('No phone number', -40);

  /* ── demand: how much does this phone ring ── */

  let callVolume = 0;
  if (reviews >= 500) { add('500+ public reviews', 26); callVolume += 40; }
  else if (reviews >= 200) { add('200+ public reviews', 22); callVolume += 34; }
  else if (reviews >= 100) { add('100+ public reviews', 18); callVolume += 28; }
  else if (reviews >= 40) { add('40+ public reviews', 11); callVolume += 18; }
  else if (reviews >= 10) { add('A modest review footprint', 5); callVolume += 9; }
  else if (reviews > 0) { add('Very few reviews', -6); callVolume += 3; }
  else add('No review data', 0);

  if (rating >= 4.7 && reviews >= 25) { add('Excellent rating on real volume', 10); callVolume += 8; }
  else if (rating >= 4.3 && reviews >= 15) { add('Strong rating', 6); callVolume += 5; }
  else if (rating > 0 && rating < 3.6 && reviews >= 15) add('Weak rating, harder sell', -6);

  if (input.trade && CALL_DRIVEN.includes(input.trade)) { add('Call-driven trade', 12); callVolume += 14; }

  if (HIGH_TICKET_RE.test(blurb) || HIGH_TICKET_RE.test(name)) { add('Sells high-ticket jobs', 8); callVolume += 8; }
  if (MULTI_TRUCK_RE.test(blurb)) { add('Multiple technicians, trucks or locations', 9); callVolume += 10; }
  if (ADS_RE.test(blurb)) { add('Paying for traffic already', 7); callVolume += 6; }

  /* ── the leak: how much of that demand goes unanswered ── */

  let missedCall = 0;
  const emergency = Boolean(input.emergency_service) || EMERGENCY_RE.test(blurb) || EMERGENCY_RE.test(name);
  if (emergency) { add('Advertises emergency or 24/7 service', 14); missedCall += 30; }

  if (input.open_24_7) {
    // Claiming 24/7 without the staff to answer at 2am IS the pitch, and it is
    // the sharpest one available: they have already promised the customer the
    // thing we sell. Scored above a merely-early closing time for that reason.
    add('Promises 24/7 answering', 10);
    missedCall += 34;
  } else if (input.hours && Object.keys(input.hours).length) {
    const closesEarly = closesBefore(input.hours, 18);
    const closedWeekend = isClosedWeekends(input.hours);
    if (closesEarly) { add('Closes before 6pm while customers still call', 12); missedCall += 24; }
    if (closedWeekend) { add('Closed weekends', 8); missedCall += 16; }
    if (!closesEarly && !closedWeekend) missedCall += 8;
  } else {
    missedCall += 10;
  }

  if (reviews >= 100 && !input.open_24_7) missedCall += 10;

  /* ── disqualifiers ── */

  const chain = CHAINS.find((c) => name.includes(c));
  if (chain) add(`National chain or franchise (${chain.trim()})`, -70);

  if (input.permanently_closed || CLOSED_RE.test(blurb)) add('Business appears closed', -100);

  if (!input.trade || input.trade === 'other') add('Trade not confirmed', -10);

  if (!input.city && !input.state) add('No confirmed geography', -8);

  /* ── total ── */

  const raw = reasons.reduce((s, r) => s + r.points, 0);
  const score = clamp(Math.round(raw), 0, 100);
  callVolume = clamp(callVolume, 0, 100);
  missedCall = clamp(missedCall, 0, 100);

  const priority: 1 | 2 | 3 | 4 = score >= 70 ? 1 : score >= 55 ? 2 : score >= 40 ? 3 : 4;

  return { score, callVolume, missedCall, priority, reasons };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** True when every listed weekday closes before `hour` (24h clock). */
function closesBefore(hours: Record<string, string>, hour: number): boolean {
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const closes: number[] = [];
  for (const [day, text] of Object.entries(hours)) {
    if (!weekdays.includes(day.toLowerCase())) continue;
    const h = lastCloseHour(text);
    if (h != null) closes.push(h);
  }
  return closes.length > 0 && closes.every((h) => h < hour);
}

function isClosedWeekends(hours: Record<string, string>): boolean {
  const sat = String(hours.saturday ?? hours.Saturday ?? '').toLowerCase();
  const sun = String(hours.sunday ?? hours.Sunday ?? '').toLowerCase();
  if (!sat && !sun) return false;
  const closed = (v: string) => !v || /closed/.test(v);
  return closed(sat) && closed(sun);
}

/** Pull the closing hour out of "08:00-17:00", "8am - 5pm", "9:00 AM – 5:00 PM". */
export function lastCloseHour(text: string): number | null {
  const t = String(text || '').toLowerCase();
  if (!t || /closed/.test(t)) return null;
  if (/24\s*\/?\s*7|00:00-24:00|open 24/.test(t)) return 24;
  const times = [...t.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g)];
  if (times.length < 2) return null;
  const last = times[times.length - 1];
  let h = Number(last[1]);
  const mer = last[3];
  if (mer === 'pm' && h < 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  return Number.isFinite(h) ? h : null;
}

/** Human summary of a score, for the CRM row and the prep brief. */
export function scoreHeadline(r: Pick<ScoreResult, 'score' | 'reasons'>): string {
  const top = [...r.reasons].filter((x) => x.points > 0).sort((a, b) => b.points - a.points).slice(0, 3);
  if (!top.length) return 'Nothing here argues for a voice agent yet.';
  return top.map((t) => t.label).join(' · ');
}
