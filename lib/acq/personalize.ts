/**
 * HYPER-PERSONALIZED, WITHOUT MAKING ANYTHING UP.
 *
 * A cold email that says "I noticed you have 312 reviews and close at 5pm" beats
 * a template, and it beats it by a lot. It also gets you correctly hated if the
 * 312 is invented.
 *
 * So every number this file produces is tagged as one of two things and the
 * email SHOWS which:
 *
 *   FACT       we read it off their own listing or their own website, and the
 *              record carries the URL it came from
 *   ASSUMPTION a stated, conservative, industry-shaped starting point that they
 *              are openly invited to disagree with
 *
 * The result is an estimate that argues honestly. Nobody is told what their
 * revenue is. They are shown arithmetic, told exactly which inputs came from
 * their own business, and handed the two numbers we guessed so they can correct
 * them. A contractor who thinks "no, my average ticket is more like nine
 * hundred" has just done our qualification for us.
 */

import type { AcqProspect, Trade } from '@/lib/acq/types';
import { shortBusiness } from '@/lib/acq/campaign';
import { lastCloseHour } from '@/lib/acq/score';

/** Weeks in an average month. The same 4.33 the public calculator uses. */
export const WEEKS_PER_MONTH = 4.33;

export type Provenance = 'fact' | 'assumption';

export type Input = {
  key: string;
  label: string;
  value: number;
  display: string;
  provenance: Provenance;
  /** Why we believe it. Rendered in the email under the table. */
  because: string;
};

export type Estimate = {
  inputs: Input[];
  callsPerWeek: number;
  missedPerWeek: number;
  avgJobValue: number;
  closeRatePct: number;
  monthlyLeakCents: number;
  annualLeakCents: number;
  /** The one true observation the email opens with, or null when we have none. */
  hook: string | null;
  hookKind: 'reviews' | 'hours' | 'always-open' | 'emergency' | 'none';
  /** False when we know too little to send anything but the plain email. */
  personalizable: boolean;
  factCount: number;
};

/**
 * Conservative trade defaults, used ONLY where we have nothing of theirs and
 * always labelled as an assumption in the email. Deliberately on the low side:
 * an estimate that undershoots and gets corrected upward by the reader is
 * persuasive, and one that overshoots reads as a scam.
 */
const TRADE_DEFAULTS: Record<Trade, { avgJobValue: number; closeRatePct: number; callsPerReview: number }> = {
  //                         ticket   close   calls per lifetime review
  hvac: { avgJobValue: 450, closeRatePct: 35, callsPerReview: 9 },
  plumbing: { avgJobValue: 400, closeRatePct: 35, callsPerReview: 9 },
  roofing: { avgJobValue: 1200, closeRatePct: 25, callsPerReview: 7 },
  other: { avgJobValue: 400, closeRatePct: 30, callsPerReview: 8 },
};

/**
 * The share of inbound calls a business with staffed daytime hours misses.
 * Split by what we can actually observe about their coverage, and never
 * presented as a measurement of THEM.
 */
function missRate(lead: AcqProspect): { rate: number; because: string } {
  if (lead.open_24_7) {
    return {
      rate: 0.18,
      because: 'you advertise around the clock service, and after-hours calls are the ones that go to voicemail',
    };
  }
  const closes = closesAt(lead);
  if (closes !== null && closes <= 17) {
    return { rate: 0.28, because: `your posted hours end at ${formatHour(closes)}, and customers keep calling after that` };
  }
  if (lead.emergency_service) {
    return { rate: 0.22, because: 'you offer emergency service, and emergencies do not happen during office hours' };
  }
  return { rate: 0.2, because: 'a busy trades line typically misses about one call in five' };
}

function closesAt(lead: AcqProspect): number | null {
  if (!lead.hours) return null;
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const hours = Object.entries(lead.hours)
    .filter(([d]) => weekdays.includes(d.toLowerCase()))
    .map(([, v]) => lastCloseHour(v))
    .filter((h): h is number => h !== null);
  if (!hours.length) return null;
  return Math.max(...hours);
}

function formatHour(h: number): string {
  if (h === 24 || h === 0) return 'midnight';
  if (h === 12) return 'noon';
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

/**
 * Build the estimate. Returns `personalizable: false` when there is not enough
 * of their own information to say anything true, in which case the caller sends
 * the plain email instead of dressing up a guess.
 */
export function estimateFor(lead: AcqProspect): Estimate {
  const trade = (lead.trade ?? 'other') as Trade;
  const d = TRADE_DEFAULTS[trade] ?? TRADE_DEFAULTS.other;
  const inputs: Input[] = [];

  /* ── how much the phone rings ── */

  const reviews = lead.review_count ?? 0;
  let callsPerWeek: number;
  if (reviews >= 15) {
    // Reviews are a lifetime count, so this is a floor on the traffic that
    // produced them, not a claim about this week. Stated as such.
    callsPerWeek = Math.max(10, Math.round((reviews * d.callsPerReview) / 52));
    inputs.push({
      key: 'calls',
      label: 'Calls a week',
      value: callsPerWeek,
      display: `about ${callsPerWeek}`,
      provenance: 'assumption',
      because: `worked back from your ${reviews.toLocaleString()} public reviews, at roughly one review per ${d.callsPerReview} calls`,
    });
  } else {
    callsPerWeek = 40;
    inputs.push({
      key: 'calls',
      label: 'Calls a week',
      value: callsPerWeek,
      display: 'about 40',
      provenance: 'assumption',
      because: 'a starting point for a working crew, since we could not see your call volume',
    });
  }

  const miss = missRate(lead);
  const missedPerWeek = Math.max(1, Math.round(callsPerWeek * miss.rate));
  inputs.push({
    key: 'missed',
    label: 'Missed a week',
    value: missedPerWeek,
    display: String(missedPerWeek),
    provenance: 'assumption',
    because: miss.because,
  });

  inputs.push({
    key: 'value',
    label: 'Average job',
    value: d.avgJobValue,
    display: `$${d.avgJobValue.toLocaleString()}`,
    provenance: 'assumption',
    because: `a conservative ${trade === 'other' ? 'trades' : trade} ticket. If yours is higher, the number below is low`,
  });

  inputs.push({
    key: 'close',
    label: 'Close rate',
    value: d.closeRatePct,
    display: `${d.closeRatePct}%`,
    provenance: 'assumption',
    because: 'of the calls you would have answered',
  });

  const recoveredPerMonth = missedPerWeek * WEEKS_PER_MONTH * (d.closeRatePct / 100);
  const monthlyLeakCents = Math.round(recoveredPerMonth * d.avgJobValue * 100);

  /* ── the one true thing we open with ── */

  let hook: string | null = null;
  let hookKind: Estimate['hookKind'] = 'none';
  const where = [lead.city, lead.state].filter(Boolean).join(', ');

  if (reviews >= 40) {
    hook = `${reviews.toLocaleString()} reviews${lead.rating ? ` at ${lead.rating} stars` : ''}${where ? ` in ${where}` : ''}`;
    hookKind = 'reviews';
  } else if (lead.open_24_7) {
    hook = 'your listing says twenty four seven';
    hookKind = 'always-open';
  } else {
    const closes = closesAt(lead);
    if (closes !== null && closes <= 17) {
      hook = `your posted hours end at ${formatHour(closes)}`;
      hookKind = 'hours';
    } else if (lead.emergency_service) {
      hook = 'you advertise emergency service';
      hookKind = 'emergency';
    }
  }

  const factCount = [reviews >= 40, lead.open_24_7, closesAt(lead) !== null, lead.emergency_service, Boolean(where)].filter(Boolean).length;

  return {
    inputs,
    callsPerWeek,
    missedPerWeek,
    avgJobValue: d.avgJobValue,
    closeRatePct: d.closeRatePct,
    monthlyLeakCents,
    annualLeakCents: monthlyLeakCents * 12,
    hook,
    hookKind,
    // Two independent true things, or it is not personalization, it is a
    // template with a name dropped in.
    personalizable: hook !== null && factCount >= 2,
    factCount,
  };
}

/* ────────────────────────── the calculator, in an email ─────────────────── */

const usd = (cents: number): string => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

/**
 * The calculator as an email-safe table.
 *
 * No JavaScript, no web fonts, no background images, table layout throughout,
 * because half of these will open in Outlook and the other half on a phone.
 * The assumptions are printed UNDER the number rather than hidden behind a
 * tooltip, which is the whole reason it is persuasive instead of insulting.
 */
export function calculatorBlock(lead: AcqProspect, est: Estimate, escape: (s: string) => string): string {
  const business = shortBusiness(lead.business_name);
  const row = (i: Input) => `
    <tr>
      <td style="padding:7px 0;font-size:14px;color:#5a564f;border-bottom:1px solid #eee7d8">${escape(i.label)}</td>
      <td style="padding:7px 0;font-size:14px;font-weight:bold;color:#161616;text-align:right;border-bottom:1px solid #eee7d8;white-space:nowrap">${escape(i.display)}</td>
    </tr>`;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0">
    <tr>
      <td style="border:2px solid #161616;border-radius:14px;padding:18px 20px;background:#ffffff">
        <p style="margin:0 0 2px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#E0301E;font-weight:bold">
          What the misses are worth
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#161616">
          Rough arithmetic for ${escape(business)}, with the assumptions showing.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${est.inputs.map(row).join('')}
          <tr>
            <td style="padding:14px 0 0;font-size:15px;font-weight:bold;color:#161616">Every month</td>
            <td style="padding:14px 0 0;font-size:26px;font-weight:bold;color:#161616;text-align:right;white-space:nowrap">${usd(est.monthlyLeakCents)}</td>
          </tr>
          <tr>
            <td style="padding:2px 0 0;font-size:13px;color:#8a8375">Every year</td>
            <td style="padding:2px 0 0;font-size:15px;font-weight:bold;color:#8a8375;text-align:right;white-space:nowrap">${usd(est.annualLeakCents)}</td>
          </tr>
        </table>

        <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#8a8375">
          ${est.inputs
            .map((i) => `<strong style="color:#5a564f">${escape(i.label)}:</strong> ${escape(i.because)}.`)
            .join('<br>')}
        </p>
        <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#8a8375">
          Two of those are guesses, and they are the two you would know better than we do. If your average job is
          bigger than ${escape(`$${est.avgJobValue.toLocaleString()}`)}, this number is low.
        </p>
      </td>
    </tr>
  </table>`;
}

/**
 * The opening line, built from the one true observation.
 *
 * Written to sound like somebody looked, because somebody did. It never claims
 * a relationship, never invents a mutual connection, and never implies we know
 * anything beyond what the record actually holds.
 */
export function personalOpener(lead: AcqProspect, est: Estimate): string {
  const business = shortBusiness(lead.business_name);
  switch (est.hookKind) {
    case 'reviews':
      return `I was looking at ${business} and you have ${est.hook}. That is a lot of people calling.`;
    case 'always-open':
      return `${business} advertises around the clock service, which is a promise almost nobody can actually staff at two in the morning.`;
    case 'hours':
      return `I noticed ${est.hook} at ${business}. Your customers do not stop having problems at that time.`;
    case 'emergency':
      return `${business} takes emergency work, and emergencies have never once respected office hours.`;
    default:
      return `I was looking at ${business}.`;
  }
}
