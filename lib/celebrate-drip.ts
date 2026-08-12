/**
 * THE CELEBRATE PRE-LAUNCH DRIP.
 *
 * Celebrate is not selling yet. It opens on CELEBRATE_LAUNCH (Monday 19 October
 * 2026), and until then the whole funnel is a countdown and a waitlist. That
 * changes how a sequence has to be built.
 *
 * ⚠️ THE THING THAT MAKES THIS DIFFERENT FROM EVERY OTHER DRIP IN THIS REPO:
 * touches are scheduled against DAYS TO LAUNCH, not days since signup. A
 * sequence anchored to signup date would mail "two weeks to go" to somebody who
 * joined four months out, and would mail nothing at all to somebody who joined
 * at T-minus-six. Anchoring to the clock means every person on the list hears
 * the same message on the same week, which is what a launch actually is.
 *
 * The consequence is a skip rule instead of a replay rule. A late signup does
 * not get four compressed letters catching them up. `nextDue` jumps them to the
 * newest unlocked touch and drops the stale ones. Somebody who joins at T-9
 * gets the concierge letter, then the doors-open letter, then the activation
 * letter. Three, in order, on time.
 *
 * Two lanes, because they are two different buyers. TEAM is an operator with a
 * payroll and a corporate pilot available to them right now. FAMILY is a person
 * who keeps catching their mother's birthday three days late, has no budget
 * approval to give, and should never be sent a pilot CTA.
 *
 * Everything else follows the house pattern in lib/hundredfold-drip.ts:
 *  - State lives in the waitlist entry (lib/celebrate-store.ts) and advances
 *    only after a CONFIRMED send.
 *  - Sends through sendViaResend, so suppression, the Sent store, and the staff
 *    mute all apply. An unsubscribed address is a hard stop, not a fake success.
 *  - Every touch carries RFC 8058 one-click unsubscribe.
 *  - A file closed by a human (booked, bought, bowed out) is never touched.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendViaResend } from '@/lib/send-email';
import { clientEmail, escape } from '@/lib/email';
import { SITE } from '@/lib/seo';
import { mailable } from '@/lib/hundredfold-drip';
import {
  CELEBRATE_LAUNCH,
  celebrateGiftFloorCents,
  celebrateTiers,
  celebrateUsd,
  daysToLaunch,
  type CelebrateAudience,
} from '@/data/celebrate';
import {
  advanceStep,
  listWaitlist,
  type CelebrateEntry,
} from '@/lib/celebrate-store';

/* -------------------------------------------------------------------------- */
/* Guards                                                                      */
/* -------------------------------------------------------------------------- */

const CAP_PER_RUN = 40;
/** Nobody hears from us twice inside three days, whatever the clock says. */
const MIN_SPACING_HRS = 72;
/** The confirmation email lands at signup. Touch one waits for it to breathe. */
const MIN_AGE_HRS = 60;

/** Lead statuses that mean a human already resolved this person. */
const TERMINAL_LEAD = ['booked', 'won', 'lost', 'archived'];

const CELEBRATE_URL = `${SITE.url}/celebrate`;
const PARADE_URL = `${SITE.url}/celebrate#parade`;
const BOOK_URL = `${SITE.url}/book`;

const unsubUrlFor = (email: string) => `${SITE.url}/api/outreach/unsubscribe?c=${encodeURIComponent(email)}`;
const unsubFooter = (url: string) =>
  `<div style="text-align:center;font-size:12px;color:#8a857a;padding:18px 0"><a href="${url}" style="color:#8a857a">Unsubscribe</a> and I will never email you again.</div>`;

/* -------------------------------------------------------------------------- */
/* What we know about them                                                     */
/* -------------------------------------------------------------------------- */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type ParadeStop = { name: string; month: number; day: number; occasion: string };

/**
 * Read back the parade they built. The strings were written by ParadeBuilder in
 * one shape, "Margaret · MAR 14 · Birthday", so this parses our own output and
 * quietly drops anything that does not match rather than guessing.
 */
export function parseParade(people: string[]): ParadeStop[] {
  const out: ParadeStop[] = [];
  for (const raw of people) {
    const parts = raw.split('·').map((s) => s.trim());
    if (parts.length < 2) continue;
    const [name, when, occasion] = parts;
    const m = MONTHS.indexOf((when.slice(0, 3) || '').toUpperCase());
    const day = Number(when.slice(3).trim());
    if (m < 0 || !Number.isFinite(day) || day < 1 || day > 31 || !name) continue;
    out.push({ name, month: m, day, occasion: occasion || 'Celebration' });
  }
  return out;
}

/**
 * The first stop on their parade that falls after the doors open. This is the
 * single most useful sentence available to a pre-launch letter: a real name and
 * a real date, in their own handwriting, sitting just past the countdown.
 */
export function firstStopAfterLaunch(stops: ParadeStop[]): ParadeStop | null {
  if (!stops.length) return null;
  const launch = new Date(CELEBRATE_LAUNCH.at);
  const scored = stops
    .map((s) => {
      // Next occurrence of that month and day at or after opening day.
      let year = launch.getUTCFullYear();
      let at = Date.UTC(year, s.month, s.day);
      if (at < launch.getTime()) at = Date.UTC(++year, s.month, s.day);
      return { s, at };
    })
    .sort((a, b) => a.at - b.at);
  return scored[0]?.s ?? null;
}

export const prettyDate = (s: ParadeStop) => `${MONTH_NAMES[s.month]} ${s.day}`;

/** A usable first name, from the name they gave or the mailbox they typed. */
export function firstNameFrom(entry: CelebrateEntry): string | null {
  const local = entry.email.split('@')[0] ?? '';
  const cleaned = local.replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim().split(/\s+/)[0] ?? '';
  if (cleaned.length < 2 || cleaned.length > 18) return null;
  // Only trust an obvious human name. "info", "hello", "team", "sales" are desks.
  if (/^(info|hello|hi|team|sales|admin|office|contact|support|accounts|billing|orders|mail|owner)$/i.test(cleaned)) {
    return null;
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* The schedule                                                                */
/* -------------------------------------------------------------------------- */

/**
 * `atDays` is the days-to-launch value at which a touch unlocks. They descend,
 * so at any moment the unlocked touches are a prefix of the lane and the newest
 * unlocked one is the letter that matches this week. 9999 means "unlocked from
 * the moment they join", gated only by MIN_AGE_HRS.
 */
type TouchSpec = { atDays: number; label: string };

const TEAM_TOUCHES: TouchSpec[] = [
  { atDays: 9999, label: 'The dates the office misses' },
  { atDays: 45, label: 'Why local, not warehouse' },
  { atDays: 30, label: 'Founding rate and the pilot' },
  { atDays: 14, label: 'Send the list, we load it' },
  { atDays: 2, label: 'Doors open Monday' },
  { atDays: -2, label: 'Open for business' },
];

const FAMILY_TOUCHES: TouchSpec[] = [
  { atDays: 9999, label: 'Three days late, every year' },
  { atDays: 30, label: 'Made down the street' },
  { atDays: 3, label: 'Doors open Monday' },
  { atDays: -2, label: 'Open, and your year is loaded' },
];

export const lane = (a: CelebrateAudience): TouchSpec[] => (a === 'family' ? FAMILY_TOUCHES : TEAM_TOUCHES);
export const TEAM_TOUCH_COUNT = TEAM_TOUCHES.length;
export const FAMILY_TOUCH_COUNT = FAMILY_TOUCHES.length;

/**
 * The touch to send right now, or null.
 *
 * Two rules, and the order matters.
 *
 * TOUCH ONE ALWAYS SENDS FIRST, to everyone, as long as the doors are still
 * shut. It is the only letter that explains what Celebrate is, and the skip
 * rule below was quietly eating it for anyone who joined inside 45 days. A
 * person who joins at T-20 should still hear the pitch before they hear the
 * price. After the doors open it is skipped, because "the doors open Monday" is
 * not a thing to write to somebody on Wednesday.
 *
 * EVERY LATER TOUCH IS THE NEWEST UNLOCKED ONE, not the next one in sequence.
 * That is what makes a late signup join the launch cadence where it currently
 * is instead of replaying two months of stale letters three days apart.
 */
export function nextDue(
  entry: CelebrateEntry,
  now: number
): { step: number; spec: TouchSpec } | null {
  const touches = lane(entry.audience);
  if (entry.done || entry.step >= touches.length) return null;

  const ageHrs = (now - new Date(entry.createdAt).getTime()) / 3600000;
  if (ageHrs < MIN_AGE_HRS) return null;

  const sinceLastHrs = (now - new Date(entry.lastAt).getTime()) / 3600000;
  if (entry.step > 0 && sinceLastHrs < MIN_SPACING_HRS) return null;

  const d = daysToLaunch(now);
  if (entry.step === 0 && d >= 0) return { step: 0, spec: touches[0] };

  let chosen = -1;
  for (let i = entry.step; i < touches.length; i += 1) {
    if (d <= touches[i].atDays) chosen = i;
  }
  return chosen < 0 ? null : { step: chosen, spec: touches[chosen] };
}

/* -------------------------------------------------------------------------- */
/* The letters                                                                 */
/* -------------------------------------------------------------------------- */

const quote = (text: string, color = '#F5B700', bg = '#FFF3CC') =>
  `<blockquote style="margin:0 0 18px;padding:14px 18px;border-left:3px solid ${color};background:${bg};font-size:16px;line-height:1.6">${text}</blockquote>`;

/** "68 days", "one day", "today". Never a bare number with no unit. */
function daysPhrase(d: number): string {
  if (d <= 0) return 'today';
  if (d === 1) return 'one day';
  return `${d} days`;
}

/** How a person says it out loud: "today", "tomorrow", "in 12 days". */
function opensIn(d: number): string {
  if (d <= 0) return 'today';
  if (d === 1) return 'tomorrow';
  return `in ${daysPhrase(d)}`;
}

/** The same thing as a full sentence, for the middle of a paragraph. */
function thatIs(d: number): string {
  if (d <= 0) return 'That is today.';
  if (d === 1) return 'That is tomorrow.';
  return `That is ${daysPhrase(d)} from now.`;
}

const TEAM = celebrateTiers.find((t) => t.slug === 'team') ?? celebrateTiers[0];
const COMPANY = celebrateTiers.find((t) => t.slug === 'company') ?? celebrateTiers[1] ?? TEAM;

export type DripLetter = { subject: string; html: string; snippet: string };

/**
 * Build the letter for one person at one step. Pure: no database, no clock of
 * its own, so the admin preview renders exactly what a prospect receives.
 */
export function celebrateDripEmail(entry: CelebrateEntry, step: number, now: number): DripLetter {
  const first = firstNameFrom(entry);
  const hi = first ? `Hi ${first},` : 'Hi there,';
  const biz = entry.business ? escape(entry.business) : null;
  const stops = parseParade(entry.people);
  const stop = firstStopAfterLaunch(stops);
  const d = daysToLaunch(now);
  const left = daysPhrase(d);
  const openDate = CELEBRATE_LAUNCH.label;

  const seeIt = { label: 'See the countdown', url: CELEBRATE_URL };
  const buildIt = { label: 'Build your parade', url: PARADE_URL };
  const pilot = { label: 'Book a corporate pilot', url: BOOK_URL };

  const paradeLine = stop
    ? `<p>You already told us where the route starts. ${escape(stop.name)}, ${escape(prettyDate(stop))}, ${escape(stop.occasion.toLowerCase())}. That one is loaded and waiting.</p>`
    : '';

  if (entry.audience === 'family') return familyLetter({ entry, step, hi, first, stop, left, openDate, paradeLine, seeIt, buildIt, d });

  /* ── TEAM lane ───────────────────────────────────────────────────────── */

  if (step === 0) {
    return {
      subject: biz ? `${entry.business}: the four dates that already slipped` : 'The four dates that already slipped',
      snippet: 'Team touch 1: the real cost of a calendar nobody owns.',
      html: clientEmail({
        preheader: `Celebrate opens ${CELEBRATE_LAUNCH.short}. Here is what the countdown is actually counting down to.`,
        eyebrow: 'CELEBRATE',
        greeting: hi,
        body:
          `<p>You are on the parade route, and the doors open ${escape(openDate)}. ${escape(thatIs(d))}</p>` +
          `<p>Here is why we built this. Every office keeps a birthday list somewhere, and every office loses it. It lives in one person's head, or a spreadsheet nobody opens, or a calendar invite that stopped firing when someone changed email systems. The list is not the problem. Remembering to look at the list on a Tuesday morning is the problem.</p>` +
          `<p>So the four dates a year that actually mattered to somebody on your team pass quietly, and the person notices. They always notice. Nobody says anything, which is worse.</p>` +
          paradeLine +
          `<p>Celebrate takes the list off your desk. You load names and dates once, set a hard budget per person, and on the right morning a real cake, a bouquet, a board, or a card written in real ink shows up from a shop down the street. You get the delivery photo. That is the whole product.</p>` +
          `<p>While the clock runs, add anyone you left off. The parade you save is the list we load on day one.</p>`,
        cta: buildIt,
        secondary: seeIt,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 1) {
    return {
      subject: 'Fresh joy cannot be warehoused',
      snippet: 'Team touch 2: why Celebrate runs on local shops instead of a fulfillment center.',
      html: clientEmail({
        preheader: 'The difference between a gift and a box of swag is about six hours of freshness.',
        eyebrow: 'THE FOUNDING ROUTE',
        greeting: hi,
        body:
          `<p>${escape(left.charAt(0).toUpperCase() + left.slice(1))} until Celebrate opens. Today, the part of the build most people ask about second and should ask about first: who actually makes the thing.</p>` +
          `<p>The national gifting platforms ship from a shelf. A branded tumbler, a tin of popcorn, a hoodie in the wrong size, packed weeks ago and picked by an algorithm. It arrives, it gets a polite thank you, and it goes in a drawer. That is not a celebration. That is a logistics event.</p>` +
          `<p>Celebrate dispatches from local shops on the founding route: bakeries, florists, and board makers in Kalispell, Whitefish, Columbia Falls, and Bigfork. The cake is baked the morning it arrives. The stems are cut that day. The card is written by a person holding a pen.</p>` +
          quote(
            'Fresh joy cannot be warehoused. That single constraint is the reason the whole system is built the way it is.'
          ) +
          `<p>It costs us more to run and it is slower to scale, because every new city needs real bakers who will answer the phone. That is also why the waitlist matters: every city with enough signups gets a vendor route, and yours moves up the list every time somebody near you joins.</p>` +
          `<p>Gifts run at local-shop prices, from $${celebrateUsd(celebrateGiftFloorCents)}, inside the cap you set. Every dollar of it lands in a register on your own street.</p>`,
        cta: seeIt,
        secondary: buildIt,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 2) {
    return {
      subject: `Founding rate, held until ${CELEBRATE_LAUNCH.short}`,
      snippet: 'Team touch 3: the price, and the pilot that runs before launch.',
      html: clientEmail({
        preheader: `${TEAM.name} is $${celebrateUsd(TEAM.monthlyCents)} a month. Waitlist keeps that number.`,
        eyebrow: 'PRICING',
        greeting: hi,
        body:
          `<p>${escape(left.charAt(0).toUpperCase() + left.slice(1))} out. Time to put the number in front of you, because a waitlist that never states a price is wasting your time.</p>` +
          `<p><strong>${escape(TEAM.name)}, $${celebrateUsd(TEAM.monthlyCents)} a month.</strong> Up to ${TEAM.recipientCap} people on your route. Birthdays, work anniversaries, and the holidays you pick. Approve every send or run full autopilot. Delivery photo on every dispatch.</p>` +
          `<p><strong>${escape(COMPANY.name)}, $${celebrateUsd(COMPANY.monthlyCents)} a month.</strong> Up to ${COMPANY.recipientCap} people, your clients included, plus concierge onboarding where we load the whole list for you.</p>` +
          `<p>Gifts are billed at local-shop prices on top, from $${celebrateUsd(celebrateGiftFloorCents)}, always inside the budget you cap. When a cap is reached we pause and ask. There is no such thing as a surprise bill here, and there is no setup fee on the founding route.</p>` +
          `<p>Two things worth knowing while the clock runs. The founding rate is held for everyone on this list, so the number above is the number you pay. And corporate pilots run now, before the public doors open: we load your full list, run your next 60 days of celebrations end to end, and send you the delivery photos and the reactions. If your team does not feel it, you walk away.</p>` +
          paradeLine +
          `<p>Pilots are limited to the founding route while the vendor network grows. If you are on it, this is the cheapest possible way to find out whether this works on your people.</p>`,
        cta: pilot,
        secondary: seeIt,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 3) {
    return {
      subject: first ? `${first}, send me the list` : 'Send me the list',
      snippet: 'Team touch 4: concierge onboarding, so day one is not a data entry project.',
      html: clientEmail({
        preheader: 'Reply with a spreadsheet and your account is live the morning we open.',
        eyebrow: `${escape(left.toUpperCase())} TO GO`,
        greeting: hi,
        body:
          `<p>${escape(left.charAt(0).toUpperCase() + left.slice(1))} until the doors open, so here is the offer that removes the last piece of work between you and a calendar that runs itself.</p>` +
          paradeLine +
          `<p>Send me your list. A spreadsheet, a CSV export from your HR system, a screenshot of the whiteboard in the break room, a paragraph of names typed into a reply. Whatever shape it is in. We load it, clean the dates, flag the duplicates, and hand you back a finished route before opening day.</p>` +
          `<p>Three columns is all it takes: name, date, occasion. If you have an email or a delivery address for each person, better. If you do not, we collect those from them directly so you are not chasing anyone.</p>` +
          quote(
            'You do this once. Then it is handled for as long as you keep the account open.',
            '#1E50C8',
            '#EEF3FF'
          ) +
          `<p>Concierge onboarding is included on the ${escape(COMPANY.name)} plan, and we are doing it for every waitlist account through launch week whatever tier you pick. Reply to this email with the list attached.</p>`,
        cta: buildIt,
        secondary: pilot,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 4) {
    return {
      subject: `Celebrate opens ${opensIn(d)}`,
      snippet: 'Team touch 5: the doors-open notice.',
      html: clientEmail({
        preheader: `${escape(openDate)}, ${CELEBRATE_LAUNCH.timeLabel}. Your parade is already saved.`,
        eyebrow: 'OPENING DAY',
        greeting: hi,
        body:
          `<p>Celebrate opens ${escape(openDate)} at ${escape(CELEBRATE_LAUNCH.timeLabel)}. ${escape(thatIs(d))}</p>` +
          `<p>What happens on your side: you get one email with a link, you set your budget per person, you confirm the list, and the route starts running. Nothing else. If you sent us your list, it is already loaded and you are confirming rather than typing.</p>` +
          paradeLine +
          `<p>What happens on our side: the bakeries, florists, and makers on the founding route have their standing orders, and the first dispatches go out that week.</p>` +
          `<p>One honest note about capacity. The founding route is a real network of real shops with real ovens, so opening week is capped at what those shops can actually deliver well. Waitlist accounts are seated first, in the order you joined. You do not need to do anything to hold your place.</p>`,
        cta: seeIt,
        secondary: pilot,
        signature: 'Sarah',
      }),
    };
  }

  return {
    subject: 'The doors are open',
    snippet: 'Team touch 6: activation.',
    html: clientEmail({
      preheader: 'Celebrate is live. Your parade is waiting where you left it.',
      eyebrow: 'OPEN',
      greeting: hi,
      body:
        `<p>Celebrate is open. The founding route is running, the shops are taking orders, and your spot on the list is live.</p>` +
        paradeLine +
        `<p>Setting up takes about five minutes: confirm your people, set a budget per person, choose approve mode or autopilot. Then the calendar is off your desk for good.</p>` +
        `<p>If the timing is wrong, that is a real answer and I will not keep writing to you about it. Tell me and I will close the file properly. If you want a hand instead, reply with your list and we will do the setup for you today.</p>` +
        `<p>Either way, this is the last email in this sequence. Thank you for riding the countdown with us.</p>`,
      cta: { label: 'Open your account', url: CELEBRATE_URL },
      secondary: pilot,
      signature: 'Sarah',
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* The family lane                                                             */
/* -------------------------------------------------------------------------- */

function familyLetter(ctx: {
  entry: CelebrateEntry;
  step: number;
  hi: string;
  first: string | null;
  stop: ParadeStop | null;
  left: string;
  openDate: string;
  paradeLine: string;
  seeIt: { label: string; url: string };
  buildIt: { label: string; url: string };
  d: number;
}): DripLetter {
  const { step, hi, first, stop, left, openDate, paradeLine, seeIt, buildIt, d } = ctx;
  const Left = left.charAt(0).toUpperCase() + left.slice(1);

  if (step === 0) {
    return {
      subject: stop ? `${stop.name}, ${prettyDate(stop)}` : 'The birthday you catch three days late',
      snippet: 'Family touch 1: the promise, in their own handwriting.',
      html: clientEmail({
        preheader: `Celebrate opens ${CELEBRATE_LAUNCH.short}. Your people are already on the route.`,
        eyebrow: 'CELEBRATE',
        greeting: hi,
        body:
          `<p>You are on the parade route. The doors open ${escape(openDate)}. ${escape(thatIs(d))}</p>` +
          (stop
            ? `<p>Your route starts with ${escape(stop.name)} on ${escape(prettyDate(stop))}. That is the one we are counting toward.</p>`
            : `<p>Add the people you love while the clock runs, and the year composes itself before opening day.</p>`) +
          // No paradeLine here on purpose. The stop is already named above, and
          // saying it twice in one letter reads like a mail merge that misfired.
          `<p>Here is the thing this fixes. You do not forget the people you love. You forget on a Tuesday, at 4pm, in the middle of something, and by the time you remember it is three days late and a text message is all that is left. The love was never the missing piece. The calendar was.</p>` +
          `<p>Celebrate holds the calendar. On the right morning, a real cake from a real bakery, or peonies wrapped in kraft paper, or a card somebody wrote by hand, shows up at their door. From a shop down the street, not a warehouse. You get the photo of it landing.</p>` +
          `<p>Nobody you love goes uncelebrated. That is the entire point of the thing.</p>`,
        cta: buildIt,
        secondary: seeIt,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 1) {
    return {
      subject: 'Made down the street, not shipped from a shelf',
      snippet: 'Family touch 2: the local maker story.',
      html: clientEmail({
        preheader: 'The cake is baked the morning it arrives. That is not a detail, it is the design.',
        eyebrow: 'THE FOUNDING ROUTE',
        greeting: hi,
        body:
          `<p>${escape(Left)} until Celebrate opens. Today, who actually makes what shows up.</p>` +
          `<p>Every gift on the route comes from a local shop: a bakery in Kalispell, a florist in Whitefish, a board studio in Bigfork. The cake is baked the morning it is delivered. The stems are cut that day. The card is written in real ink, never a printed script font pretending to be handwriting.</p>` +
          quote('Fresh joy cannot be warehoused.') +
          `<p>The gift platforms that ship from a fulfillment center can do volume and they cannot do this, and the difference is obvious the second the box is opened. It is the difference between somebody remembering you and somebody having a subscription.</p>` +
          `<p>It also means every celebration puts money in a register on a street where somebody's kid goes to school. Automating that felt worth the extra work.</p>` +
          `<p>The founding route is ${escape(CELEBRATE_LAUNCH.city)}. Every city with enough people on the waitlist gets a vendor route next, so if yours is not covered yet, the fastest way to move it up is to tell one person who lives near you.</p>`,
        cta: seeIt,
        secondary: buildIt,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 2) {
    return {
      subject: `Celebrate opens ${opensIn(d)}`,
      snippet: 'Family touch 3: the doors-open notice.',
      html: clientEmail({
        preheader: `${escape(openDate)}, ${CELEBRATE_LAUNCH.timeLabel}. The family lane opens with it.`,
        eyebrow: 'OPENING DAY',
        greeting: hi,
        body:
          `<p>Celebrate opens ${escape(openDate)} at ${escape(CELEBRATE_LAUNCH.timeLabel)}. ${escape(thatIs(d))}</p>` +
          `<p>The family lane opens with it. Same route, same local shops, same handwritten cards, sized for the people at your table instead of a payroll.</p>` +
          paradeLine +
          `<p>Setup is one sitting: confirm your people, set what you want to spend per person, decide whether we check with you before each send or just handle it. Five minutes, once, and then the year runs.</p>` +
          `<p>Opening week is capped at what the bakeries can actually deliver well, and waitlist spots are seated first in the order you joined. Yours is held.</p>`,
        cta: seeIt,
        secondary: buildIt,
        signature: 'Sarah',
      }),
    };
  }

  return {
    subject: first ? `It is open, ${first}` : 'The doors are open',
    snippet: 'Family touch 4: activation.',
    html: clientEmail({
      preheader: 'Celebrate is live and your parade is waiting where you left it.',
      eyebrow: 'OPEN',
      greeting: hi,
      body:
        `<p>Celebrate is open. The shops are taking orders and your parade is exactly where you left it.</p>` +
        paradeLine +
        `<p>Confirm your people, set what you want to spend, and the next date on your list is handled without you thinking about it again.</p>` +
        `<p>This is the last email in the countdown sequence. If the timing is wrong, ignore it with a clear conscience and your parade stays saved. If you want help loading the rest of your family, reply to this and I will do it with you.</p>`,
      cta: { label: 'Open your account', url: CELEBRATE_URL },
      secondary: buildIt,
      signature: 'Sarah',
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* The run                                                                     */
/* -------------------------------------------------------------------------- */

export type CelebrateDripResult = {
  /** Days to launch at the moment of the run. Negative after opening day. */
  daysToLaunch: number;
  waitlist: number;
  due: number;
  sent: number;
  skipped: number;
  closed: number;
  dryRun?: true;
  /** What would go out, or did. Ordered as processed. */
  touches: { email: string; audience: CelebrateAudience; step: number; label: string; subject: string }[];
};

/**
 * One pass over the whole waitlist. Safe to run daily: the schedule, the
 * spacing floor, and the step pointer between them mean a person can receive at
 * most one letter per run and at most one every three days.
 */
export async function celebrateDrip(
  sb: SupabaseClient,
  opts: { dryRun?: boolean; onlyEmail?: string } = {}
): Promise<CelebrateDripResult> {
  const now = Date.now();
  const result: CelebrateDripResult = {
    daysToLaunch: daysToLaunch(now),
    waitlist: 0,
    due: 0,
    sent: 0,
    skipped: 0,
    closed: 0,
    touches: [],
    ...(opts.dryRun ? { dryRun: true as const } : {}),
  };

  const all = await listWaitlist(sb);
  result.waitlist = all.length;
  const only = opts.onlyEmail?.trim().toLowerCase();
  const entries = only ? all.filter((e) => e.email === only) : all;
  if (!entries.length) return result;

  // People a human already resolved in the pipeline. One query, not one per row.
  const resolved = await resolvedLeads(sb, entries.map((e) => e.email));

  for (const entry of entries) {
    if (result.sent >= CAP_PER_RUN) break;

    if (entry.done || resolved.has(entry.email)) {
      result.closed += 1;
      continue;
    }
    if (!mailable(entry.email)) {
      result.skipped += 1;
      continue;
    }

    const due = nextDue(entry, now);
    if (!due) continue;

    const letter = celebrateDripEmail(entry, due.step, now);
    result.due += 1;
    result.touches.push({
      email: entry.email,
      audience: entry.audience,
      step: due.step,
      label: due.spec.label,
      subject: letter.subject,
    });
    if (opts.dryRun) continue;

    const unsub = unsubUrlFor(entry.email);
    const send = await sendViaResend({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: entry.email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: letter.subject,
      html: letter.html + unsubFooter(unsub),
      mailbox: 'sarah@modernmustardseed.com',
      unsubscribeUrl: unsub,
    });

    if (!send.ok) {
      // Suppressed, muted, or a provider blip. The pointer does not move, so a
      // suppressed address simply stops here and a blip retries tomorrow.
      console.error(`celebrate drip send failed for ${entry.email}: ${send.error}`);
      result.skipped += 1;
      continue;
    }

    await advanceStep(sb, entry, due.step + 1);
    result.sent += 1;
  }

  return result;
}

/**
 * Emails with a lead row a human already moved to a terminal status.
 *
 * Matched exactly, and the Celebrate capture writes the lead address in lower
 * case for precisely this reason. A row typed in mixed case elsewhere would miss
 * here, which fails toward continuing the sequence rather than dropping someone,
 * so the worst case is one extra letter to a closed file rather than silence to
 * an open one.
 */
async function resolvedLeads(sb: SupabaseClient, emails: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < emails.length; i += 100) {
    const { data } = await sb
      .from('leads')
      .select('email, status')
      .in('email', emails.slice(i, i + 100))
      .in('status', TERMINAL_LEAD);
    for (const r of data ?? []) out.add(String(r.email).trim().toLowerCase());
  }
  return out;
}
