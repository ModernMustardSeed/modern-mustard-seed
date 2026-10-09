import {
  BOOTCAMP,
  HOSTS,
  OPERATOR,
  bootcampDays,
  bootcampDoors,
  bootcampTiers,
  deliverablesFor,
  fmtMountain,
  fmtMountainTime,
  getBootcampTier,
  operatorWeeks,
  usd,
  type BootcampTierSlug,
} from '@/data/bootcamp';
import { callout, clientEmail, escape, p } from '@/lib/email';
import { complianceFooter, complianceFooterText } from '@/lib/outbound-email';
import { SITE } from '@/lib/seo';
import { inviteUrl, type InviteWhich } from '@/lib/bootcamp/ics';
import { roomLink } from '@/lib/bootcamp/key';
import { WORKSHEET_MINUTES, WORKSHEET_NAME, worksheetQuestions } from '@/data/bootcamp-worksheet';
import type { HostStats } from '@/lib/bootcamp/store';

/**
 * EVERY EMAIL THE BOOTCAMP SENDS, in Sarah's voice.
 *
 * Each template returns subject, html and text so the same letter reads right
 * in a mail client with images off and in the admin preview. Dates are never
 * typed here: they come from data/bootcamp.ts through fmtMountain, so moving
 * a session moves every email with it.
 *
 * Two kinds of letter. Transactional mail (a confirmation, a receipt, a host
 * note) is one-to-one and carries no unsubscribe footer; it sends from the
 * root domain. Drip mail (every reminder, replay and offer the cron sends)
 * takes the registration's signed unsubscribe link and ends with the one-line
 * footer plus the studio's compliance footer; it sends from the outreach
 * subdomain. The root domain refuses anything with an unsubscribe header
 * (lib/send-email.ts), so the two shapes cannot be mixed up by accident.
 *
 * Paragraphs are written as plain text with [label](url) for a link, and the
 * renderer turns them into the house html and into readable text. Keep each
 * letter under 350 words: these land on phones between jobs.
 */

export type BootcampEmail = { subject: string; html: string; text: string };
export type Link = { label: string; url: string };
/** regId, when known, signs the person's room link and calendar files into every letter. */
export type Person = { firstName?: string | null; email?: string | null; regId?: string | null };

type Piece =
  | string
  | { list: string[] }
  | { links: Link[] }
  | { callout: { label: string; title: string; body: string; href?: string; cta?: string } };

type Letter = {
  subject: string;
  preheader: string;
  eyebrow: string;
  greeting: string;
  pieces: Piece[];
  cta?: Link;
  secondary?: Link;
};

type DripFooter = { unsubscribeUrl: string; email: string };

/* -------------------------------------------------------------------------- */
/* Dates, links and shared lines                                               */
/* -------------------------------------------------------------------------- */

const D = BOOTCAMP.dates;
const TZ = BOOTCAMP.tzLabel;

/** "Tuesday, January 26" */
const onDate = (iso: string) => fmtMountain(iso);
/** "January 26" */
const shortDate = (iso: string) => fmtMountain(iso, { weekday: undefined });
/** "1:00 PM" */
const atTime = (iso: string) => fmtMountainTime(iso);
/** "Tuesday, January 26 at 1:00 PM Mountain Time" */
const whenLine = (iso: string) => `${onDate(iso)} at ${atTime(iso)} ${TZ}`;

const BOOTCAMP_URL = `${SITE.url}/bootcamp`;
const TIERS_URL = `${SITE.url}/bootcamp#tiers`;
const DAYS_URL = `${SITE.url}/bootcamp#days`;
const MASTERCLASS_URL = `${SITE.url}/bootcamp/masterclass`;
const OPERATOR_URL = `${SITE.url}/bootcamp/operator`;
const CLAUDE_URL = `${SITE.url}/claude`;
const HOST_URL = `${SITE.url}/bootcamp/host`;

const GA = getBootcampTier('ga') ?? bootcampTiers[0];
const CLOSE_LINE = `${onDate(D.close)} at ${atTime(D.close)} ${TZ}`;
const hi = (who: Person) => (who.firstName ? `Hi ${who.firstName},` : 'Hi there,');

/** The person's own room, or null when the letter is a preview with no registration behind it. */
const roomOf = (who: Person): string | null => (who.regId ? roomLink(SITE.url, who.regId) : null);

/** "[your room](url)" when we know who they are, plain "your room" otherwise. */
const yourRoom = (who: Person, anchor = ''): string => {
  const room = roomOf(who);
  return room ? `[your room](${room}${anchor})` : 'your room';
};

/** Their own calendar file when we know who they are; the public one otherwise. */
const cal = (which: InviteWhich, who: Person) => inviteUrl(which, who.regId);

/**
 * One sentence about the room, the same in every letter: where the live
 * session, the replays and the questions box are. Without a registration
 * behind the letter it points at the morning-of email instead.
 */
function roomLine(who: Person): string {
  return roomOf(who)
    ? `Everything happens in ${yourRoom(who)}: the live session, the replays and the questions box. Same link every time; keep this email.`
    : 'Your room link lands in this inbox the morning of, from this address.';
}

/** The button into the room, with a public page as the fallback. */
const roomCta = (who: Person, label = 'Enter my room', fallback: Link = { label: 'The three days', url: `${SITE.url}/bootcamp#days` }): Link => {
  const room = roomOf(who);
  return room ? { label, url: room } : fallback;
};

const DAY_BY_N = (n: 1 | 2 | 3) => bootcampDays.find((d) => d.n === n) ?? bootcampDays[n - 1];

/* -------------------------------------------------------------------------- */
/* Rendering                                                                   */
/* -------------------------------------------------------------------------- */

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g;

function inlineHtml(s: string): string {
  return escape(s).replace(LINK_RE, (_m, label: string, url: string) => `<a href="${url}" style="color:#C2261A;font-weight:600">${label}</a>`);
}

function inlineText(s: string): string {
  return s.replace(LINK_RE, (_m, label: string, url: string) => `${label} (${url})`);
}

function pieceHtml(piece: Piece): string {
  if (typeof piece === 'string') return p(inlineHtml(piece));
  if ('list' in piece) {
    return `<ul style="margin:0 0 18px;padding-left:22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;color:#3A3733;line-height:1.72">${piece.list
      .map((item) => `<li style="margin:0 0 6px">${inlineHtml(item)}</li>`)
      .join('')}</ul>`;
  }
  if ('links' in piece) {
    return `<p style="margin:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:2">${piece.links
      .map((l) => `<a href="${l.url}" style="color:#C2261A;font-weight:700;text-decoration:none">${escape(l.label)} &rarr;</a>`)
      .join('<br>')}</p>`;
  }
  return callout(piece.callout);
}

function pieceText(piece: Piece): string {
  if (typeof piece === 'string') return inlineText(piece);
  if ('list' in piece) return piece.list.map((item) => `  - ${inlineText(item)}`).join('\n');
  if ('links' in piece) return piece.links.map((l) => `${l.label}: ${l.url}`).join('\n');
  const c = piece.callout;
  return `${c.label.toUpperCase()}: ${c.title}\n${c.body}${c.href ? `\n${c.cta ?? 'Read more'}: ${c.href}` : ''}`;
}

function dripFooterHtml(f: DripFooter): string {
  return (
    `<div style="margin-top:26px;font-size:12px;line-height:1.5;color:#8a8375">You are getting this because you registered for the bootcamp. ` +
    `<a href="${f.unsubscribeUrl}" style="color:#8a8375">Unsubscribe from these reminders.</a></div>` +
    complianceFooter(f.email)
  );
}

function dripFooterText(f: DripFooter): string {
  return (
    `\n\nYou are getting this because you registered for the bootcamp. Unsubscribe from these reminders: ${f.unsubscribeUrl}` +
    complianceFooterText(f.email)
  );
}

function render(letter: Letter, drip?: DripFooter): BootcampEmail {
  const body = letter.pieces.map(pieceHtml).join('') + (drip ? dripFooterHtml(drip) : '');
  const html = clientEmail({
    preheader: letter.preheader,
    eyebrow: letter.eyebrow,
    greeting: letter.greeting,
    body,
    cta: letter.cta,
    secondary: letter.secondary,
    signature: 'Sarah',
  });
  const text =
    [
      letter.greeting,
      '',
      ...letter.pieces.map(pieceText),
      letter.cta ? `${letter.cta.label}: ${letter.cta.url}` : '',
      letter.secondary ? `${letter.secondary.label}: ${letter.secondary.url}` : '',
      '',
      'Sarah',
      'Modern Mustard Seed',
      SITE.url,
    ]
      .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
      .join('\n\n')
      .replace(/\n\n\n+/g, '\n\n') + (drip ? dripFooterText(drip) : '');
  return { subject: letter.subject, html, text };
}

/* -------------------------------------------------------------------------- */
/* The masterclass (free seat)                                                 */
/* -------------------------------------------------------------------------- */

/** Sent by the register route the moment the form lands. Transactional. */
export function masterclassConfirm(who: Person): BootcampEmail {
  return render({
    subject: `Your seat for the masterclass, ${shortDate(D.masterclass)}`,
    preheader: `${whenLine(D.masterclass)}. Sixty minutes, live, the actual studio on screen.`,
    eyebrow: 'The free masterclass',
    greeting: hi(who),
    pieces: [
      `You are in. The masterclass is ${whenLine(D.masterclass)}. Sixty minutes, live.`,
      'I am going to put the real studio on screen: the phone agent that answers our line, the crew and what each one does, the morning briefing that tells me what ran overnight, and what the whole thing costs a month. Not slides. The office.',
      `Add it to your calendar now, while this email is open. ${roomLine(who)}`,
      'Bring one thing: the job in your business you would hand to an agent first. We will use it live.',
    ],
    cta: { label: 'Add it to my calendar', url: cal('masterclass', who) },
    secondary: { label: 'What the bootcamp is', url: BOOTCAMP_URL },
  });
}

export function masterclassReminder24h(who: Person, f: DripFooter): BootcampEmail {
  return render(
    {
      subject: `Tomorrow at ${atTime(D.masterclass)} ${TZ}: the masterclass`,
      preheader: 'One day out. Your room link is inside.',
      eyebrow: 'Tomorrow',
      greeting: hi(who),
      pieces: [
        `The masterclass is tomorrow, ${whenLine(D.masterclass)}. ${roomLine(who)}`,
        'Here is the plan for the hour: a live call to the agent on our phone line, the org chart of the crew with the one job each agent owns, the morning briefing, and the money. Then the two agents every ticket holder builds in February, so you can decide whether that is for you.',
        'Have your website open in another tab. I will ask the room what the first agent in each business should be, and yours will be a better answer if you can see your own front door.',
      ],
      cta: { label: 'Add it to my calendar', url: cal('masterclass', who) },
    },
    f,
  );
}

export function masterclassReminder1h(who: Person, f: DripFooter): BootcampEmail {
  return render(
    {
      subject: 'We start in an hour',
      preheader: `${atTime(D.masterclass)} ${TZ}. The room opens at ten to the hour.`,
      eyebrow: 'One hour',
      greeting: hi(who),
      pieces: [
        `The masterclass starts at ${atTime(D.masterclass)} ${TZ}, one hour from now. ${roomLine(who)} If the link gives you any trouble, reply to this email and I will send it straight back.`,
        'Come a few minutes early. I open the room at ten to the hour and take the first questions then.',
      ],
      cta: roomCta(who, 'Enter my room', { label: 'The masterclass page', url: MASTERCLASS_URL }),
    },
    f,
  );
}

/** Four hours after the masterclass: the replay, and the ticket with the guarantee. */
export function masterclassReplay(who: Person, f: DripFooter): BootcampEmail {
  return render(
    {
      subject: 'The replay, and a seat in February',
      preheader: `The masterclass replay is up. The bootcamp runs ${shortDate(D.day1)}, ${shortDate(D.day2)} and ${shortDate(D.day3)}.`,
      eyebrow: 'The replay',
      greeting: hi(who),
      pieces: [
        `Thank you for today. The replay is up in ${yourRoom(who)} and on [the masterclass page](${MASTERCLASS_URL}), and it stays up until enrollment closes.`,
        `If you want the two agents built for your own business, that is the bootcamp: three live sessions, ${onDate(D.day1)}, ${onDate(D.day2)} and ${onDate(D.day3)}, ${BOOTCAMP.sessionTime}. Kickoff is ${onDate(D.kickoff)}, where we do setup together so Day 1 starts at speed.`,
        `General Admission is ${usd(GA.priceCents)}. Every price is a set package. Nothing is added later.`,
        { callout: { label: 'The guarantee', title: 'Day 1 or your money back', body: BOOTCAMP.guarantee } },
        `Enrollment closes ${CLOSE_LINE}.`,
      ],
      cta: { label: 'Take a seat', url: TIERS_URL },
      secondary: roomCta(who, 'Watch the replay', { label: 'Watch the replay', url: MASTERCLASS_URL }),
    },
    f,
  );
}

/** Two days and five days after the masterclass. Step 3 is the close. */
export function masterclassOffer(step: 2 | 3, who: Person, f: DripFooter): BootcampEmail {
  if (step === 2) {
    return render(
      {
        subject: 'What the two agents would do in your business',
        preheader: 'Agent one keeps your presence sharp. Agent two answers and books. Both built on Day 3.',
        eyebrow: 'The two agents',
        greeting: hi(who),
        pieces: [
          `On ${onDate(D.day3)} every ticket holder builds two agents for their own business, live, with the room. Here is what they do.`,
          {
            list: [
              'Agent one, the presence agent: it reads your site, your listings and your reviews every week and files the fixes.',
              'Agent two, the front desk: it answers the missed call or the form, qualifies the lead and books the appointment.',
            ],
          },
          'Both run inside your own SeedSide office, first month included, with the method to add the third. Day 1 shows you the whole studio. Day 2 splits the room by trade and audits real businesses on screen.',
          `${usd(GA.priceCents)} for General Admission. ${BOOTCAMP.guarantee}`,
        ],
        cta: { label: 'See the three days', url: DAYS_URL },
        secondary: { label: 'Take a seat', url: TIERS_URL },
      },
      f,
    );
  }
  return render(
    {
      subject: `Enrollment closes ${onDate(D.close).split(',')[0]} night`,
      preheader: `${CLOSE_LINE}. Day 1 is ${onDate(D.day1)}.`,
      eyebrow: 'Last call',
      greeting: hi(who),
      pieces: [
        `Enrollment for the bootcamp closes ${CLOSE_LINE}, the night of Day 1. After that the room is set for the run and I do not add seats.`,
        `If you watched the masterclass and thought "that is where my business should be going," this is the week to act on it. Kickoff is ${onDate(D.kickoff)}, Day 1 is ${onDate(D.day1)}, and you can attend Day 1 live and still take every dollar back if it was not worth the ticket.`,
        'If the timing is wrong, no hard feelings, and this is the last of these notes. The replay stays up until enrollment closes.',
      ],
      cta: { label: 'Take a seat', url: TIERS_URL },
    },
    f,
  );
}

/* -------------------------------------------------------------------------- */
/* Tickets                                                                      */
/* -------------------------------------------------------------------------- */

/** The receipt and the plan, sent by fulfillment. Transactional. */
export function ticketWelcome(tier: BootcampTierSlug, who: Person): BootcampEmail {
  const t = getBootcampTier(tier) ?? GA;
  const seedside = BOOTCAMP.seedsideIncluded
    ? 'Your SeedSide office, the place your agents work, is included for the first month and opens on Day 3.'
    : '';
  return render({
    subject: `You are in: ${t.name}, kickoff ${shortDate(D.kickoff)}`,
    preheader: `Kickoff ${onDate(D.kickoff)}. Sessions ${shortDate(D.day1)}, ${shortDate(D.day2)} and ${shortDate(D.day3)}, ${BOOTCAMP.sessionTime}.`,
    eyebrow: t.name,
    greeting: who.firstName ? `${who.firstName}, you have a seat.` : 'You have a seat.',
    pieces: [
      `Thank you. Your ${t.name} ticket to ${BOOTCAMP.name} is confirmed, and here is the whole run in one place.`,
      {
        list: [
          `Kickoff: ${whenLine(D.kickoff)}. Setup done together, so Day 1 starts at speed.`,
          `Day 1: ${whenLine(D.day1)}. ${DAY_BY_N(1).title}.`,
          `Day 2: ${whenLine(D.day2)}. ${DAY_BY_N(2).title}.`,
          `Day 3: ${whenLine(D.day3)}. ${DAY_BY_N(3).title}.`,
        ],
      },
      `${roomLine(who)} Replays go up there the same evening and stay for ${t.replayDays} days.`,
      `Pre-work: ${WORKSHEET_NAME}, seven questions that turn one idea into a brief an agent can build. It is waiting in ${yourRoom(who, '#worksheet')} now and takes about ${WORKSHEET_MINUTES} minutes. ${seedside}`.trim(),
      'Put all four on your calendar now:',
      {
        links: [
          { label: 'Kickoff', url: cal('kickoff', who) },
          { label: 'Day 1', url: cal('day1', who) },
          { label: 'Day 2', url: cal('day2', who) },
          { label: 'Day 3', url: cal('day3', who) },
        ],
      },
      `Changes to what we teach are included. If anything looks wrong on this receipt, reply and I will fix it.`,
    ],
    cta: roomCta(who, 'Open my room', { label: 'The three days', url: DAYS_URL }),
  });
}

export function kickoffTomorrow(who: Person, f: DripFooter): BootcampEmail {
  return render(
    {
      subject: `Kickoff tomorrow at ${atTime(D.kickoff)} ${TZ}`,
      preheader: 'Setup together, so Day 1 starts at speed. Bring your laptop and your worksheet.',
      eyebrow: 'Kickoff',
      greeting: hi(who),
      pieces: [
        `Kickoff is tomorrow, ${whenLine(D.kickoff)}. ${roomLine(who)}`,
        'This is the working session before the sessions. We get everyone set up together: your SeedSide office, your accounts, the tools we will use on Day 3, and the one idea from your worksheet that your first agent will be built around.',
        {
          list: ['Your laptop, not a phone', 'The Idea Director worksheet, filled in as far as you got', 'Your website open in a tab'],
        },
        `Then Day 1 on ${onDate(D.day1)} starts at speed, and nobody spends the first twenty minutes finding a login.`,
      ],
      cta: { label: 'Add the kickoff to my calendar', url: cal('kickoff', who) },
    },
    f,
  );
}

/** The day before and the hour before each session. */
export function dayReminder(n: 1 | 2 | 3, lead: '24h' | '1h', who: Person, f: DripFooter): BootcampEmail {
  const day = DAY_BY_N(n);
  const iso = D[day.dateKey];
  if (lead === '24h') {
    return render(
      {
        subject: `Day ${n} is tomorrow: ${day.title}`,
        preheader: `${whenLine(iso)}. ${day.lead}`,
        eyebrow: `Day ${n}`,
        greeting: hi(who),
        pieces: [
          `Day ${n} is tomorrow, ${whenLine(iso)}. ${day.lead} ${roomLine(who)}`,
          'On the board:',
          { list: day.beats.slice(0, 4) },
          `You leave with: ${day.leaveWith}`,
        ],
        cta: { label: 'Add it to my calendar', url: cal(day.dateKey, who) },
      },
      f,
    );
  }
  return render(
    {
      subject: `Day ${n} starts in an hour`,
      preheader: `${atTime(iso)} ${TZ}. The room opens at ten to the hour.`,
      eyebrow: `Day ${n}`,
      greeting: hi(who),
      pieces: [
        `Day ${n} starts at ${atTime(iso)} ${TZ}, one hour from now. ${roomLine(who)} If the link gives you any trouble, reply to this email and I will send it straight back.`,
        n === 3
          ? 'Today you build. Have your laptop, your SeedSide login and your build plan from Day 2 ready. By the end of the session both agents are working.'
          : n === 2
            ? 'Today the room splits by trade. Join the room for your business; the host for each room is named on screen at the start.'
            : 'I open the room at ten to the hour. Come early and bring the question you most want answered about running on a crew.',
      ],
      cta: roomCta(who),
    },
    f,
  );
}

/** Day 3 replay: the three doors and the first word about the cohort. */
export function dayReplay(n: 1 | 2 | 3, who: Person, f: DripFooter): BootcampEmail {
  if (n !== 3) {
    const day = DAY_BY_N(n);
    return render(
      {
        subject: `Day ${n} replay is up`,
        preheader: `${day.title}. The replay is in your room.`,
        eyebrow: `Day ${n} replay`,
        greeting: hi(who),
        pieces: [
          `The Day ${n} replay is up in ${yourRoom(who)}. ${day.leaveWith}`,
          `Next: ${whenLine(D[DAY_BY_N((n + 1) as 2 | 3).dateKey])}.`,
        ],
        cta: roomCta(who, 'Watch the replay'),
      },
      f,
    );
  }
  return render(
    {
      subject: 'Your two agents are working. Three doors out',
      preheader: 'The Day 3 replay, and what comes after the bootcamp.',
      eyebrow: 'After Day 3',
      greeting: hi(who),
      pieces: [
        `You built two agents today and they are working in your own office. That is the product, and most people stop here, which is a good outcome. The replay is up in ${yourRoom(who)}.`,
        'There are three doors out of Day 3, and I would rather you choose with your eyes open:',
        { list: bootcampDoors.map((d) => `[${d.title}](${SITE.url}${d.href}): ${d.body}`) },
        `The middle door is ${OPERATOR.name}: ${OPERATOR.weeks} weeks, live, a cohort of ${OPERATOR.seats}, starting ${OPERATOR.starts}. ${OPERATOR.promise}`,
        `${usd(OPERATOR.priceCents)}, a set package. More on it in a couple of days. Either way, thank you for building with me this week.`,
      ],
      cta: { label: OPERATOR.name, url: OPERATOR_URL },
      secondary: { label: 'Have us build it', url: CLAUDE_URL },
    },
    f,
  );
}

/** The operator case in three letters: Day 3 replay, two days after, five days after. */
export function operatorInvite(step: 1 | 2 | 3, who: Person, f: DripFooter): BootcampEmail {
  if (step === 1) return dayReplay(3, who, f);
  if (step === 2) {
    return render(
      {
        subject: 'Eight weeks from two agents to a whole crew',
        preheader: `${OPERATOR.name} week by week. Starts ${OPERATOR.starts}.`,
        eyebrow: OPERATOR.name,
        greeting: hi(who),
        pieces: [
          'You have two agents. A company runs on a crew: agents with charters, rules they cannot break, memory so you never explain the business twice, and an idea engine that brings you work you did not ask for. That is what the eight weeks build, in order.',
          { list: operatorWeeks.map((w) => `Week ${w.n}, ${w.title}: ${w.outcome.split('.')[0]}.`) },
          `Live with me on Tuesdays, ${BOOTCAMP.sessionTime}, plus a Thursday build lab every week. Your SeedSide office stays open the whole program and everything in it is yours at graduation.`,
          `${usd(OPERATOR.priceCents)}, a set package, ${OPERATOR.seats} seats, starting ${OPERATOR.starts}.`,
        ],
        cta: { label: OPERATOR.cta, url: OPERATOR_URL },
      },
      f,
    );
  }
  return render(
    {
      subject: `The cohort starts ${shortDate(D.operatorStart)}`,
      preheader: `${OPERATOR.seats} seats. ${whenLine(D.operatorStart)}.`,
      eyebrow: OPERATOR.name,
      greeting: hi(who),
      pieces: [
        `The cohort is ${OPERATOR.seats} seats and it starts ${whenLine(D.operatorStart)}. This is the last note I will send about it.`,
        `${OPERATOR.promise} By week four your crew is running real recurring work. In week seven you ship one idea of your own, scoped Monday and live Friday.`,
        'If you would rather have the crew built for you, that door is open too, and I will point you to it without a pitch: reply with "build it" and I will send the details.',
        `${usd(OPERATOR.priceCents)}, a set package. Seats close when the cohort is full or when we start, whichever comes first.`,
      ],
      cta: { label: OPERATOR.cta, url: OPERATOR_URL },
      secondary: { label: 'Have us build it', url: CLAUDE_URL },
    },
    f,
  );
}

/* -------------------------------------------------------------------------- */
/* The Operator Program                                                        */
/* -------------------------------------------------------------------------- */

/** Sent by fulfillment the moment a cohort seat is paid. Transactional. */
export function operatorWelcome(who: Person): BootcampEmail {
  return render({
    subject: `Your seat in the cohort, ${shortDate(D.operatorStart)}`,
    preheader: `${OPERATOR.name} starts ${whenLine(D.operatorStart)}.`,
    eyebrow: OPERATOR.name,
    greeting: who.firstName ? `${who.firstName}, you are in the cohort.` : 'You are in the cohort.',
    pieces: [
      `Thank you. Your seat in ${OPERATOR.name} is confirmed. We start ${whenLine(D.operatorStart)} and run ${OPERATOR.weeks} weeks: Tuesdays ${BOOTCAMP.sessionTime} with me, plus a Thursday build lab every week.`,
      {
        list: [
          `Week 1, ${operatorWeeks[0].title}: ${operatorWeeks[0].outcome}`,
          'Your SeedSide office stays open for the whole program and is built out week by week.',
          'Graduation: your operating manual, every account in your name, and a seat in the alumni room.',
        ],
      },
      `Before we start: nothing but ${WORKSHEET_NAME}, which is waiting in ${yourRoom(who, '#worksheet')}. ${roomLine(who)}`,
      'Changes to what we teach are included. If anything on this receipt looks wrong, reply and I will fix it.',
    ],
    cta: { label: 'Add week 1 to my calendar', url: cal('operator', who) },
    secondary: { label: 'The eight weeks', url: OPERATOR_URL },
  });
}

export function operatorStart24h(who: Person, f: DripFooter): BootcampEmail {
  return render(
    {
      subject: `The cohort starts tomorrow at ${atTime(D.operatorStart)} ${TZ}`,
      preheader: `Week 1: ${operatorWeeks[0].title}.`,
      eyebrow: 'Week 1',
      greeting: hi(who),
      pieces: [
        `We start tomorrow, ${whenLine(D.operatorStart)}. ${roomLine(who)}`,
        `Week 1 is ${operatorWeeks[0].title}: ${operatorWeeks[0].outcome}`,
        { list: ['Your laptop', 'Your Idea Director worksheet', 'One idea you would ship this quarter if someone else did the building'] },
      ],
      cta: { label: 'Add week 1 to my calendar', url: cal('operator', who) },
    },
    f,
  );
}

/* -------------------------------------------------------------------------- */
/* Hosts                                                                       */
/* -------------------------------------------------------------------------- */

export function hostReceived(who: Person & { name?: string | null; brand?: string | null }): BootcampEmail {
  const first = who.firstName ?? (who.name ?? '').split(/\s+/)[0] ?? null;
  return render({
    subject: 'Your host application landed',
    preheader: 'I read every one myself. You will hear back within three business days.',
    eyebrow: HOSTS.name,
    greeting: first ? `Hi ${first},` : 'Hi there,',
    pieces: [
      `Thank you for applying to host a room${who.brand ? ` for ${who.brand}` : ''}. I read every application myself and you will hear back from me within three business days.`,
      `The terms, so they are in writing: you keep ${HOSTS.ticketPct}% of every ticket sold through your link and ${HOSTS.programPct}% of every Operator Program seat your people take. Bring ${HOSTS.roomThreshold} or more and you host your own trade room on Day 2. The first ${HOSTS.foundingHosts} hosts are founding hosts on the same terms for all four 2027 launches.`,
      'When you are approved you get your tracking link, your masterclass link, swipe copy and a live dashboard, the same day.',
    ],
    cta: { label: 'The host terms', url: HOST_URL },
  });
}

export function hostApproved(
  who: Person & { name?: string | null; brand?: string | null },
  links: { share: string; masterclass: string; dashboard: string | null },
): BootcampEmail {
  const first = who.firstName ?? (who.name ?? '').split(/\s+/)[0] ?? null;
  const linkList: Link[] = [
    { label: 'Your tracking link (every ticket through it is yours)', url: links.share },
    { label: 'Your masterclass link (free seats for your audience)', url: links.masterclass },
    ...(links.dashboard ? [{ label: 'Your live dashboard (keep this private)', url: links.dashboard }] : []),
  ];
  return render({
    subject: 'You are approved to host. Your links are inside',
    preheader: `Your tracking link, your masterclass link and your dashboard. Masterclass ${shortDate(D.masterclass)}.`,
    eyebrow: HOSTS.name,
    greeting: first ? `${first}, you are in.` : 'You are in.',
    pieces: [
      `You are approved to host a room for ${BOOTCAMP.name}. Here is everything you need, and it all works right now.`,
      { links: linkList },
      `The simplest play: send your audience to the free masterclass on ${onDate(D.masterclass)}. Everyone who registers through your link is yours, and every ticket they buy afterward pays you ${HOSTS.ticketPct}%. Operator Program seats pay ${HOSTS.programPct}%, ${usd(Math.round((OPERATOR.priceCents * HOSTS.programPct) / 100))} a seat.`,
      `Enrollment closes ${CLOSE_LINE}. Payouts go out within ten days after Day 3, ${onDate(D.day3)}, to the account you name. Reply to this email with where to send yours.`,
      'Swipe copy for email, a post, a DM and a story is on the host page. Use your own words where you can; your audience knows your voice.',
    ],
    cta: { label: 'Swipe copy and terms', url: HOST_URL },
  });
}

export function hostWeekly(
  who: Person & { name?: string | null },
  stats: HostStats,
  links: { share: string; dashboard: string | null },
): BootcampEmail {
  const first = who.firstName ?? (who.name ?? '').split(/\s+/)[0] ?? null;
  const tickets = stats.tickets.ga + stats.tickets.vip + stats.tickets.platinum;
  return render({
    subject: `Your room this week: ${stats.clicks} clicks, ${stats.masterclass} seats`,
    preheader: `${tickets} tickets, ${stats.operatorSeats} cohort seats, ${usd(stats.earningsCents)} earned so far.`,
    eyebrow: HOSTS.name,
    greeting: first ? `Hi ${first},` : 'Hi there,',
    pieces: [
      'Your numbers for the week, straight from the dashboard:',
      {
        list: [
          `${stats.clicks} clicks on your link`,
          `${stats.masterclass} people registered through you`,
          `${tickets} tickets (${stats.tickets.ga} General, ${stats.tickets.vip} VIP, ${stats.tickets.platinum} Platinum), ${usd(stats.ticketRevenueCents)} in ticket sales`,
          `${stats.operatorSeats} Operator Program seats`,
          `${usd(stats.earningsCents)} earned so far`,
        ],
      },
      `The masterclass is ${onDate(D.masterclass)} and enrollment closes ${CLOSE_LINE}. The week before the masterclass is where most seats come from, so if you have one more post in you, that is the week.`,
      ...(stats.masterclass >= HOSTS.roomThreshold
        ? [`You are over ${HOSTS.roomThreshold}: you have your own room on Day 2, with your name on the door. I will be in touch about the trade.`]
        : []),
    ],
    cta: links.dashboard ? { label: 'Open my dashboard', url: links.dashboard } : { label: 'My tracking link', url: links.share },
  });
}

/* -------------------------------------------------------------------------- */
/* The morning of, and the pre-work                                            */
/* -------------------------------------------------------------------------- */

export type LiveKey = 'masterclass' | 'kickoff' | 'day1' | 'day2' | 'day3';

const LIVE_NAME: Record<LiveKey, string> = {
  masterclass: 'The masterclass',
  kickoff: 'Kickoff',
  day1: 'Day 1',
  day2: 'Day 2',
  day3: 'Day 3',
};

const LIVE_BRING: Record<LiveKey, string> = {
  masterclass: 'Have your website open in another tab. I ask the room what the first agent in each business should be, and yours is a better answer if you can see your own front door.',
  kickoff: 'Bring your laptop, not a phone, and your worksheet filled in as far as you got. We do setup together so nobody spends Day 1 finding a login.',
  day1: 'Bring the question you most want answered about running on a crew. I take the first ones at ten to the hour.',
  day2: 'The room splits by trade today. Pick your room when the session opens; the host for each room is named on screen at the start.',
  day3: 'Today you build. Laptop, your SeedSide login and your build plan from Day 2. By the end of the session both agents are working.',
};

/**
 * The morning of every live session: today, the time, the one link. This is
 * the letter the masterclass page and the calendar files promise.
 */
export function liveToday(key: LiveKey, who: Person, f: DripFooter): BootcampEmail {
  const iso = D[key];
  const name = LIVE_NAME[key];
  return render(
    {
      subject: `Today at ${atTime(iso)} ${TZ}: ${key === 'masterclass' ? 'the masterclass' : name}`,
      preheader: `Your room opens at ten to the hour. One link, the same every session.`,
      eyebrow: 'Today',
      greeting: hi(who),
      pieces: [
        `${name} is today at ${atTime(iso)} ${TZ}. ${roomLine(who)}`,
        LIVE_BRING[key],
        'Questions go in the box under the stream; I read them live and answer the ones the room shares first.',
      ],
      cta: roomCta(who, 'Enter my room', { label: 'The masterclass page', url: MASTERCLASS_URL }),
    },
    f,
  );
}

/**
 * The pre-work, a week before kickoff (ticket holders) and a week before the
 * cohort starts (Operator seats). The worksheet lives in their room and
 * saves as they type.
 */
export function worksheetLetter(audience: 'ticket' | 'operator', who: Person, f: DripFooter): BootcampEmail {
  const due = audience === 'operator' ? D.operatorStart : D.kickoff;
  const dueName = audience === 'operator' ? `week 1 on ${onDate(due)}` : `kickoff on ${onDate(due)}`;
  return render(
    {
      subject: `Your pre-work: ${WORKSHEET_NAME}`,
      preheader: `Seven questions, about ${WORKSHEET_MINUTES} minutes, done before ${dueName}.`,
      eyebrow: 'Pre-work',
      greeting: hi(who),
      pieces: [
        `Before ${dueName}, one thing: ${WORKSHEET_NAME}. Seven questions that turn one idea into a brief an agent can build from. About ${WORKSHEET_MINUTES} minutes, and it saves as you type.`,
        { list: worksheetQuestions.map((q) => `${q.title}`) },
        audience === 'operator'
          ? 'If you did it before the bootcamp, open it and sharpen it. Week 1 starts from the brief it writes.'
          : 'I read every one before Day 2, and the front row is picked from them. On Day 3 the brief at the bottom is the first thing your agent reads.',
        `It is in ${yourRoom(who, '#worksheet')}.`,
      ],
      cta: roomCta(who, 'Open my worksheet', { label: 'The three days', url: DAYS_URL }),
    },
    f,
  );
}

/**
 * "Send me my room link": the recovery letter for anyone who lost the email.
 * Transactional, one-to-one, and it goes only to the address on the
 * registration, so asking for someone else's room sends it to them, not you.
 */
export function roomLinkLetter(who: Person): BootcampEmail {
  return render({
    subject: 'Your room link',
    preheader: 'The live sessions, your replays and the questions box, one link.',
    eyebrow: BOOTCAMP.short,
    greeting: hi(who),
    pieces: [
      `Here is your room, as asked. ${roomLine(who)}`,
      'If you did not ask for this, nothing has changed and you can ignore it.',
    ],
    cta: roomCta(who, 'Open my room', { label: 'The bootcamp', url: BOOTCAMP_URL }),
  });
}

/** The Day 3 replay for a cohort seat: the replay, without the cohort pitch they already said yes to. */
export function day3ReplayForCohort(who: Person, f: DripFooter): BootcampEmail {
  return render(
    {
      subject: 'Day 3 replay is up',
      preheader: `Your two agents are working. Week 1 is ${shortDate(D.operatorStart)}.`,
      eyebrow: 'Day 3 replay',
      greeting: hi(who),
      pieces: [
        `The Day 3 replay is up in ${yourRoom(who)}. You leave the bootcamp with two agents working in your own office, and the cohort starts from there.`,
        `Week 1, ${operatorWeeks[0].title}: ${whenLine(D.operatorStart)}. ${operatorWeeks[0].outcome}`,
      ],
      cta: roomCta(who, 'Watch the replay'),
    },
    f,
  );
}

/** The tier deliverables open in the room when Day 3 ends. VIP gets the deck; Platinum and the cohort get all three. */
export function kitReady(tier: string, who: Person, f: DripFooter): BootcampEmail {
  const owned = deliverablesFor(tier);
  const one = owned.length === 1;
  return render(
    {
      subject: one ? "Your Director's Deck is in your room" : 'Your deck, your kit and your playbook are in your room',
      preheader: one ? 'Forty prompts and skill files, ready to download.' : "The Director's Deck, the Studio Kit and the Operator's Playbook, ready to download.",
      eyebrow: 'In your seat',
      greeting: hi(who),
      pieces: [
        `Day 3 is done, and what your seat includes is waiting in ${yourRoom(who, '#kit')}:`,
        { list: owned.map((d) => `${d.name}: ${d.blurb}`) },
        owned.some((d) => d.slug === 'kit')
          ? 'Start with the Studio Kit. Unzip it, open INSTALL.md, and it is running in about twenty minutes on Windows or a Mac. The playbook is the manual for the weeks after.'
          : 'Start with card one. The six skill files take a minute each to install, and every agent uses them from then on.',
        'The downloads work only from your room, so keep the link. The Day 3 replay letter follows as soon as the replay is up.',
      ],
      cta: roomCta(who, 'Open my room'),
    },
    f,
  );
}

/* -------------------------------------------------------------------------- */
/* The drip's map from step name to letter                                     */
/* -------------------------------------------------------------------------- */

export type DripContext = Person & { email: string; tier: string; unsubscribeUrl: string };

export type StepName =
  | 'mc-24h'
  | 'mc-live'
  | 'mc-1h'
  | 'mc-replay'
  | 'mc-offer-2'
  | 'mc-offer-3'
  | 'worksheet'
  | 'kickoff-24h'
  | 'kickoff-live'
  | 'day1-24h'
  | 'day1-live'
  | 'day1-1h'
  | 'day1-replay'
  | 'day2-24h'
  | 'day2-live'
  | 'day2-1h'
  | 'day2-replay'
  | 'day3-24h'
  | 'day3-live'
  | 'day3-1h'
  | 'kit-ready'
  | 'day3-replay'
  | 'day3-replay-op'
  | 'op-2'
  | 'op-3'
  | 'op-worksheet'
  | 'op-start-24h';

const foot = (c: DripContext): DripFooter => ({ unsubscribeUrl: c.unsubscribeUrl, email: c.email });

export const STEP_TEMPLATES: Record<StepName, (c: DripContext) => BootcampEmail> = {
  'mc-24h': (c) => masterclassReminder24h(c, foot(c)),
  'mc-live': (c) => liveToday('masterclass', c, foot(c)),
  'mc-1h': (c) => masterclassReminder1h(c, foot(c)),
  'mc-replay': (c) => masterclassReplay(c, foot(c)),
  'mc-offer-2': (c) => masterclassOffer(2, c, foot(c)),
  'mc-offer-3': (c) => masterclassOffer(3, c, foot(c)),
  worksheet: (c) => worksheetLetter('ticket', c, foot(c)),
  'kickoff-24h': (c) => kickoffTomorrow(c, foot(c)),
  'kickoff-live': (c) => liveToday('kickoff', c, foot(c)),
  'day1-24h': (c) => dayReminder(1, '24h', c, foot(c)),
  'day1-live': (c) => liveToday('day1', c, foot(c)),
  'day1-1h': (c) => dayReminder(1, '1h', c, foot(c)),
  'day1-replay': (c) => dayReplay(1, c, foot(c)),
  'day2-24h': (c) => dayReminder(2, '24h', c, foot(c)),
  'day2-live': (c) => liveToday('day2', c, foot(c)),
  'day2-1h': (c) => dayReminder(2, '1h', c, foot(c)),
  'day2-replay': (c) => dayReplay(2, c, foot(c)),
  'day3-24h': (c) => dayReminder(3, '24h', c, foot(c)),
  'day3-live': (c) => liveToday('day3', c, foot(c)),
  'day3-1h': (c) => dayReminder(3, '1h', c, foot(c)),
  'kit-ready': (c) => kitReady(c.tier, c, foot(c)),
  'day3-replay': (c) => dayReplay(3, c, foot(c)),
  'day3-replay-op': (c) => day3ReplayForCohort(c, foot(c)),
  'op-2': (c) => operatorInvite(2, c, foot(c)),
  'op-3': (c) => operatorInvite(3, c, foot(c)),
  'op-worksheet': (c) => worksheetLetter('operator', c, foot(c)),
  'op-start-24h': (c) => operatorStart24h(c, foot(c)),
};
