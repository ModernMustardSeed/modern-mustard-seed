/**
 * THE WORDS. One copy, two readers.
 *
 * `clientGuide` is what the client reads in their portal: how Daily Posting
 * works, what to send, what we never do. `deskGuide` is what Sarah reads on
 * the desk beside their calendar: the same promise in her words, the
 * talking points for sitting across a table, and the answers to the
 * questions a client asks. Neither is sent anywhere; both are layered into
 * the pages so nobody has to remember them.
 */
import { DEFAULT_PLATFORM_HOURS, PLATFORM_LABEL, hourFor, type Platform, type SettingsRow } from './types';
import { prettyHour } from './time';

export type GuideSection = { title: string; lines: string[] };

export function clientGuide(s: SettingsRow): GuideSection[] {
  const hours = s.platforms.map((p) => `${PLATFORM_LABEL[p]} at ${prettyHour(hourFor(s, p))}`).join(', ');
  return [
    {
      title: 'What this is',
      lines: [
        'You say it. We shape it. It goes out on every platform you use, at the hour each one rewards.',
        'You never have to think about hashtags, character limits, or what LinkedIn wants versus Instagram. You write it the way you would say it to a neighbor, and we do the rest.',
        'Nothing is ever posted that you did not write. We edit; we do not invent.',
      ],
    },
    {
      title: 'What to send',
      lines: [
        'A line or a paragraph about anything real: a job that framed up, a crew that beat the weather, a question a client asked, a thank you, a thing you are proud of.',
        'A photo if you have one. Phone photos are fine; they are sized for the feeds on the way up.',
        'A graphic, if you have one. Or tick the box and tell us what you picture, and we make it before the post goes.',
        'A link, if there is a page you want people to land on. It goes on Facebook, LinkedIn and Google, never on X or Instagram, where links do not work.',
        `One post takes one day. Send five on a Sunday and they take Monday through Friday, in the order you sent them.`,
      ],
    },
    {
      title: 'What we do to it',
      lines: [
        'Facebook gets short paragraphs and a plain invitation if you made one.',
        'Instagram gets line breaks and five to eight real local hashtags.',
        'LinkedIn gets a professional frame and at most two hashtags.',
        'X gets your strongest single thought, under the limit, no hashtags.',
        'Google Business Profile gets one paragraph a searcher can use, with a plain call to action if you made one.',
        'Houzz gets a project note about the work itself.',
        'Under every version you will see a one-line note on what we changed and why. If you would rather it said something else, change any line yourself, right there, up to the hour it posts.',
      ],
    },
    {
      title: 'When it goes',
      lines: [
        `Each platform posts at its own hour: ${hours}. Those are the hours the feeds tend to reward; change any of them below if you know your people better.`,
        s.approve_first ? 'Nothing goes until you tap Approve on the day. You asked for that; it can be switched off any time.' : 'It goes on its own. If you would rather approve each one first, say so and we switch that on.',
        'Skip a day and it is gone; put it back and it returns. A skipped post never goes out.',
      ],
    },
    {
      title: 'After it goes',
      lines: [
        'Each card shows where the post went, with the live link, and the numbers it earned where the platform gives them: reach, likes, comments, shares.',
        'Every Monday you get one short note with last week: what went out, where, and how it did.',
        'Anything you see and want said again, tap Say it again and it takes the next open day.',
      ],
    },
    {
      title: 'What we never do',
      lines: [
        'We never post something you did not write. No filler, no stock quotes, no "content calendar" of our own.',
        'We never add a fact, a price, a timeline, a name or a promise your words did not carry.',
        'We never get your passwords. Facebook and Instagram come through the admin access you gave us; X, LinkedIn and Google through a connect button that you can revoke any time.',
        'We never say your name is on a building, a truck or a sign unless it is.',
      ],
    },
  ];
}

export function deskGuide(s: SettingsRow): GuideSection[] {
  const hours = (Object.keys(DEFAULT_PLATFORM_HOURS) as Platform[]).filter((p) => s.platforms.includes(p)).map((p) => `${PLATFORM_LABEL[p]} ${prettyHour(hourFor(s, p))}`).join(' · ');
  return [
    {
      title: 'The promise, in one breath',
      lines: [
        `"${s.business_name} writes it. We shape it for every platform so each one performs, and it goes out at the right hour on each. Nothing posts that you did not write."`,
        'That sentence is the whole product. Everything else on this desk is how we keep it true.',
      ],
    },
    {
      title: 'What they see (and what they do not)',
      lines: [
        `Their calendar is ${s.visible ? 'ON' : 'OFF'} for them right now. Switch it on with "Show to the client" when it is right. Until then, this desk is the only place it exists.`,
        'They see: a composer (their words, a photo or a graphic request, a platform pick, a link), every day coming up with all six versions and our note on each, the day it posts, where it went, and the numbers. A How it works card carries the same words as this guide.',
        'They do not see: the brief you keep for the editor, the token pastes, the hand-post sheet, or anything about Claude.',
      ],
    },
    {
      title: 'How to explain it across a table',
      lines: [
        'Start with what it is not: "We are not going to write your posts. Nobody wants a builder whose feed sounds like an agency."',
        'Then the mechanic: "You text it to us or type it in your portal, the way you would say it. Ten seconds. We do the rest, and every platform gets its own version."',
        'Then the timing: "Each feed has an hour it rewards. Instagram late morning, LinkedIn early on a workday, Facebook at your hour. We post at each one\'s hour, not one blast."',
        'Then the trust: "You can read every version before it goes and change any line. Under each one we tell you what we changed and why."',
        'Then the ask: "Send us one thing a day. A photo of the site. A line about the weather. That is the whole job on your side."',
      ],
    },
    {
      title: 'What to do on this desk',
      lines: [
        'Graphic requests sit at the top in red. Make it (image-gen, codex backend), drop it on the request, and the day releases on its own.',
        'The hand-post sheet arrives at the first hour for anything without an API: Houzz always, Google until its API is approved, LinkedIn and X until their app keys are in production. Paste, then tick "Posted by hand" with the live link.',
        'A red "failed" chip means an API said no. The error is on the chip. A reconnect (usually a new Page token) fixes it and the hourly retry picks it up.',
        'If they call a post in instead of typing it, put it in "Enter a post for them" in their words. It is theirs, not ours.',
        `Hours right now: ${hours}. Change them in the brief; the client can change them too.`,
      ],
    },
    {
      title: 'Questions they ask',
      lines: [
        '"Can I approve each one first?" Yes. Tick Approve first on the brief; every day holds until they tap Approve in the portal.',
        '"Can I skip a platform for one post?" Yes, in the composer, per post.',
        '"What if I have nothing to say this week?" Then nothing posts. Friday morning they get one nudge if next week has four or more open days. We never fill silence with filler.',
        '"Who sees my Facebook password?" Nobody. We are admin on the Page through Meta Business Suite, which they can remove any day.',
        '"Can you make the graphic?" Yes, at no charge; it is part of the package. They tick the box and describe it.',
        '"What does it cost to change something?" Nothing. Changes to what we built are included.',
      ],
    },
  ];
}
