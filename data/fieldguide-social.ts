/**
 * THE FIELD GUIDE SOCIAL SET, single source.
 *
 * Sarah, 2026-08-21: "i cant find the social cards and posts. they are not in
 * admin."
 *
 * They existed, in the Ads Playbook's Organic Social tab, which is not where
 * anybody looks for a card set. The library at /admin/social-cards is. So the
 * copy now lives here, once, and BOTH surfaces read it:
 *
 *   /admin/social-cards   the card library, with the artwork and the downloads
 *   /admin/ads (Organic)  the per-network copy blocks with copy buttons
 *
 * Two admin pages, one set of words. Editing this file changes both.
 *
 * WHY EACH NETWORK GETS DIFFERENT WORDS rather than one post reflowed:
 *  - FACEBOOK is where a link works and where the reader actually is. Longest
 *    copy, link at the end.
 *  - INSTAGRAM kills links in captions, so the URL is typed out in full and the
 *    bio does the tapping.
 *  - X rewards one idea and punishes setup. Every variant is under 280
 *    characters so it posts from any account, premium or not.
 *
 * These posts have a different job from the Mr. Mustard set. Those sell a
 * product to a business owner and the demo is a phone call. These give
 * something away to a person who wants to build and does not know how, so every
 * caption teaches one complete, true thing on its own. Someone who never clicks
 * still leaves with something, which is the only reason a stranger shares a
 * post from a company they have never heard of.
 */

const GUIDE = 'https://modernmustardseed.com/fieldguide';
const FB_LINK = `${GUIDE}?utm_source=facebook&utm_medium=organic&utm_campaign=fieldguide`;
const PHONE = '(406) 312-1223';

export type FieldGuidePost = {
  id: string;
  /** The angle, for the tile. */
  angle: string;
  /** What this post is for, in one line, so a tired Sarah picks the right one. */
  use: string;
  /** Basename in public/social/field-guide/. <file>.png and <file>-square.png. */
  file: string;
  /** The line burned into the card, so the tile can show it without the image. */
  headline: string;
  alt: string;
  fb: string;
  ig: string;
  x: string;
};

export const FIELD_GUIDE_POSTS: FieldGuidePost[] = [
  {
    id: 'fg-no-code',
    angle: 'You do not need to code',
    use: 'The lead post. Widest audience, works cold, and the one most likely to get sent to a friend.',
    file: '01-no-code',
    headline: 'You do not need to know how to code.',
    alt: 'Mr. and Mrs. Mustard driving a red convertible along Flathead Lake at sunset. Headline: you do not need to know how to code.',
    fb: `Almost everyone I talk to has something they want built and thinks the wall is code.

It is not, and it stopped being that about a year ago.

Claude Code runs in a terminal window on your own computer. You tell it what you want in plain English. It reads your project, writes the code, runs it, and fixes what it broke. I have shipped 40+ products with it.

Here is the part nobody tells beginners. The skill is not typing. The skill is describing an outcome precisely and then checking the work, and if you have ever hired anyone, you already have that skill.

So I wrote all of it down. The install, the loop that actually works, seventeen prompts you can copy and paste, and the twelve rules that cost us real days to learn.

Free. No signup, no email, nothing to buy: ${FB_LINK}`,
    ig: `Almost everyone I talk to has something they want built and thinks the wall is code.

It is not. Not anymore.

Claude Code runs on your own computer and builds real software from plain English. You describe what you want. It reads your project, writes it, runs it, and fixes what it broke.

The skill is not typing. It is describing an outcome precisely and then checking the work. If you have ever hired anyone, you already have that skill.

I wrote down everything we learned shipping 40+ products with it. The install, the loop, 17 prompts you can steal, and 12 rules that cost us real days.

Free, no signup: modernmustardseed.com/fieldguide
(link in bio)

#claudecode #learntocode #buildinpublic #smallbusiness #ai #nocode`,
    x: `Almost everyone who wants something built thinks the wall is code.

It is not. Claude Code builds real software from plain English, on your own machine.

The skill is describing the outcome, then checking the work.

Wrote it all down, free:
modernmustardseed.com/fieldguide`,
  },
  {
    id: 'fg-four-lines',
    angle: 'Four lines',
    use: 'The zero-friction post. Kills the "setup is probably complicated" objection in one screenshot.',
    file: '02-four-lines',
    headline: 'Four lines and you are building.',
    alt: 'The Mustard Seed Ranch gate at sunrise, with the mascot waving beside it. Headline: four lines and you are building.',
    fb: `People assume the setup is the hard part. Here is the entire setup.

npm install -g @anthropic-ai/claude-code
cd my-project
claude
/init

Four lines. You run the first one once, ever. The second moves you into your project folder, and it matters, because Claude only sees the folder you start it in. The third starts it. The fourth is the one everybody skips and should not: it reads your whole project and writes itself a briefing that it reads at the start of every session from then on.

There is no step five. You are now typing plain English at something that can build.

The rest of what we know, in one place and free: ${FB_LINK}`,
    ig: `People assume the setup is the hard part. This is the entire setup.

npm install -g @anthropic-ai/claude-code
cd my-project
claude
/init

Four lines. Run the first once, ever. The second moves you into your project, and it matters, because it only sees the folder you start it in. The third starts it. The fourth is the one everyone skips: it reads your project and writes itself a briefing for every session after.

There is no step five.

The rest, free: modernmustardseed.com/fieldguide
(link in bio)

#claudecode #developer #ai #buildinpublic #learntocode`,
    x: `People assume the setup is hard. This is all of it:

npm install -g @anthropic-ai/claude-code
cd my-project
claude
/init

There is no step five. The last one is the one everybody skips and should not.

Full guide, free: modernmustardseed.com/fieldguide`,
  },
  {
    id: 'fg-six-words',
    angle: 'Six words',
    use: 'The one real tip. Best save-and-share rate of the set, because it works the same day someone reads it.',
    file: '03-six-words',
    headline: 'The six most useful words you can type.',
    alt: 'Mr. and Mrs. Mustard planting a glowing seed above the lake. Headline: the six most useful words you can type.',
    fb: `The six most useful words you can type at an AI that writes code:

"do not write any code yet"

Add them to the end of any request and it stops, reads what you already have, and hands you a plan instead of a pile of files. You read the plan. You say what is wrong with it. Then it builds.

Most bad AI code is not a bad model. It is an approved bad plan, approved by someone who never read the plan.

Thirty seconds of reading there is the highest-return time in the whole process, and it is the one habit that separates people who like these tools from people who fight them.

Sixteen more prompts like this, free: ${FB_LINK}`,
    ig: `The six most useful words you can type at an AI that writes code:

"do not write any code yet"

Put them at the end of any request. It stops, reads what you already have, and hands you a plan instead of a pile of files. You read the plan, you say what is wrong, then it builds.

Most bad AI code is not a bad model. It is an approved bad plan, approved by someone who never read the plan.

16 more prompts like this, free: modernmustardseed.com/fieldguide
(link in bio)

#claudecode #aitools #promptengineering #buildinpublic #developer`,
    x: `The six most useful words you can type at an AI that writes code:

"do not write any code yet"

It stops, reads what exists, and hands you a plan instead of a pile of files.

Most bad AI code is an approved bad plan, approved by someone who never read it.`,
  },
  {
    id: 'fg-done',
    angle: 'Done is not evidence',
    use: 'The credibility post. Says the quiet part out loud, so it reads as honest rather than as marketing.',
    file: '04-done',
    headline: 'Never accept done as evidence.',
    alt: 'Mr. and Mrs. Mustard picking cherries from the convertible in an east shore orchard. Headline: never accept done as evidence.',
    fb: `A rule that has saved us more time than any other, and it cost a real day to learn:

Done is not evidence.

An AI will tell you the feature works because it reasoned that it should work, not because it ran it. A green terminal is a claim. So is a confident summary. Neither one is a fact.

The fix is one sentence, every time: "run it and show me the real output."

Say that and something good happens. It runs the thing, finds its own mistake, and fixes it before you ever see it. Ask for the test, the loaded page, the actual response. Never take the summary.

We keep twelve rules like this one. All twelve, free: ${FB_LINK}`,
    ig: `The rule that has saved us more time than any other, and it cost a real day to learn:

Done is not evidence.

An AI will tell you it works because it reasoned that it should work, not because it ran it. A green terminal is a claim. A confident summary is a claim. Neither is a fact.

The fix is one sentence: "run it and show me the real output."

Then something good happens. It runs the thing, finds its own mistake, and fixes it before you ever see it.

All twelve rules, free: modernmustardseed.com/fieldguide
(link in bio)

#claudecode #ai #softwaredevelopment #buildinpublic #lessonslearned`,
    x: `Rule that has saved us more time than any other:

Done is not evidence.

An AI says it works because it reasoned it should, not because it ran it. A green terminal is a claim, not a fact.

The fix is one sentence: "run it and show me the real output."`,
  },
  {
    id: 'fg-loop',
    angle: 'The loop',
    use: 'The method post. Use this one when somebody says they tried an AI coding tool and it made a mess.',
    file: '05-the-loop',
    headline: 'The loop that actually works.',
    alt: 'Flathead Lake from the air with the shore road curving around it. Headline: the loop that actually works.',
    fb: `If you tried an AI coding tool and it made a mess, you were probably missing the loop. Five steps, in this order:

1. Explore. Have it read the relevant code and explain it back to you first.
2. Plan. It can think without touching a single file. Read the plan before you approve it.
3. Build. One outcome per request. Small pieces, so when something breaks you can tell which piece broke it.
4. Prove. Never accept "done". Ask for the real output.
5. Save. Say "commit this" every time it works. That is your undo button.

Almost every bad result comes from jumping straight to three. The loop is not overhead. It is the difference between a tool that ships features and a tool that generates confident wreckage.

The whole thing written out, free: ${FB_LINK}`,
    ig: `Tried an AI coding tool and it made a mess? You were probably missing the loop.

1. Explore. Have it read the code and explain it back first.
2. Plan. It can think without touching a file. Read the plan before approving it.
3. Build. One outcome per request. Small pieces, so you can tell which one broke.
4. Prove. Never accept "done". Ask for the real output.
5. Save. Say "commit this" every time it works. That is your undo button.

Almost every bad result comes from jumping straight to three.

Written out in full, free: modernmustardseed.com/fieldguide
(link in bio)

#claudecode #ai #buildinpublic #developer #softwaredevelopment`,
    x: `If an AI coding tool made a mess, you were missing the loop:

1 Explore. It reads and explains first
2 Plan. It thinks, touches nothing
3 Build. One outcome per request
4 Prove. Never accept "done"
5 Save. Commit every time it works

Every bad result comes from jumping to 3.`,
  },
  {
    id: 'fg-free',
    angle: 'The giveaway',
    use: 'The direct ask. Post it last, once the teaching posts have warmed the page. Carries both doors.',
    file: '06-free',
    headline: 'We wrote the guide we wish we had.',
    alt: 'The mustard tree at sunset with the birds coming home. Headline: we wrote the guide we wish we had.',
    fb: `We wrote the guide we wish we had, and it is free.

The Claude Code Field Guide, for anyone who wants to build software and has never written any:

Seventeen prompts you can copy with one tap
The loop that actually works
The CLAUDE.md template that fixes most bad output
Twelve rules we learned the expensive way
A triage table for every symptom, and what actually causes it
A plain English glossary, so no word in it can stop you

No signup. No email. There is a printable card too, made to be pinned above a desk.

${FB_LINK}

And if you read it and decide you would rather someone just built the thing, that is what we do. Call the ranch line at ${PHONE} and Mr. Mustard, our own AI agent, picks up at any hour. Or book thirty minutes and bring nothing but the idea.`,
    ig: `We wrote the guide we wish we had. It is free.

The Claude Code Field Guide, for anyone who wants to build software and has never written any:

17 prompts you can copy
The loop that actually works
The CLAUDE.md template that fixes most bad output
12 rules we learned the expensive way
A triage table for every symptom
A plain English glossary, so no word in it can stop you

No signup, no email. There is a printable card made to be pinned above a desk.

modernmustardseed.com/fieldguide
(link in bio)

Would rather someone just built it? Call ${PHONE}. Mr. Mustard picks up at any hour.

#claudecode #ai #smallbusiness #buildinpublic #montanabusiness`,
    x: `We wrote the guide we wish we had. Free, no signup.

17 copyable prompts
The loop that actually works
The CLAUDE.md template
12 rules we learned the expensive way
A plain English glossary

For anyone who wants to build and never has.

modernmustardseed.com/fieldguide`,
  },
];

/** Posting order. The giveaway lands last, once the teaching posts have run. */
export const FIELD_GUIDE_RULES = [
  'Run them in order: Six Words first, it earns the follow. Then Done Is Not Evidence, The Loop, Four Lines, You Do Not Need To Code, and The Giveaway last.',
  'Every caption teaches one complete thing. Do not trim them down to a link and a hashtag, that is the whole reason these get shared.',
  'Facebook keeps the link. Instagram cannot have one, so the URL is typed out and the bio does the tapping. X stays under 280 so it posts from any account.',
  'These belong in maker, small business, and "learning to code" groups, not in trades groups. The Mr. Mustard set is the one for trades.',
  'Never claim it writes perfect code. The honesty is the sales pitch here, and rule 01 on the card is the proof.',
];
