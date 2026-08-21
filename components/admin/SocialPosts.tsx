'use client';

import { useState } from 'react';

/**
 * THE ORGANIC SOCIAL LIBRARY, inside the Ads Playbook.
 *
 * Sarah, 2026-08-18: "lets make some social posts and ads for fb and ig and x,
 * put them in ads playbooks in admin."
 *
 * ⚠️ THIS FILLS A GAP THE PLAYBOOK NAMED AND NEVER CLOSED. Six different
 * campaign checklists in AdsPlaybook.tsx end with "post the cut organically on
 * FB + IG the same day (free reach, warms the page). Ask Claude for the
 * drafts." The drafts never existed, so the free half of every launch never
 * happened. These are those drafts, finished and ready to paste.
 *
 * WHY THE THREE NETWORKS GET DIFFERENT WORDS, rather than one post reflowed:
 *  - FACEBOOK is where a link actually works and where the buyer (a second
 *    business owner, 35 to 60) actually is. Longest copy, link at the end.
 *  - INSTAGRAM kills links in captions, so every CTA is the phone number,
 *    which is the one call to action that works with a thumb and no browser.
 *  - X rewards one idea and punishes setup. Every variant here is under 280
 *    characters so it posts from any account, premium or not.
 *
 * The phone number is the CTA more often than the site is, on purpose. Calling
 * him IS the product demo, inbound calls have no daily cap, and a caller who
 * hears him needs no landing page to explain what he does.
 */

const PHONE = '(406) 312-1223';
const MUSTARD = 'https://modernmustardseed.com/mustard';

type Post = {
  id: string;
  angle: string;
  /** What this post is for, in one line, so a tired Sarah picks the right one. */
  use: string;
  /** The card to post with it: <set>/<file>, resolved to a real PNG below. */
  card: string;
  /** The moving cut, when there is one worth using instead. Card-only sets omit it. */
  video?: string;
  /** Which campaign the post belongs to. Shown as a badge on the tile. */
  topic?: string;
  fb: string;
  ig: string;
  x: string;
};

const POSTS: Post[] = [
  {
    id: 'dare',
    angle: 'The dare',
    use: 'The default post. Works cold, works warm, works on every network, and the demo does the selling.',
    card: 'missed-calls/05-break-it',
    video: 'call-me-4x5.mp4 on FB and IG, call-me-9x16.mp4 for Reels and Stories, call-me-16x9.mp4 on X.',
    fb: `I built an AI receptionist and I am not going to describe him to you.

His number is ${PHONE}. Call it right now. He picks up on the first ring, he says he is an AI in his first sentence, and then he answers whatever you throw at him.

Pretend to be your worst customer. Ask him something rude. Try to break him. That is genuinely the best way to judge this, and it is the only demo I trust.

He answers our phone all day and all night. Yours could sound like this next week: ${MUSTARD}`,
    ig: `I built an AI receptionist and I am not going to describe him to you.

Call him: ${PHONE}

He picks up on the first ring. He tells you he is an AI in his first sentence. Then he answers whatever you throw at him.

Pretend to be your worst customer. Try to break him. That is the real test, and it is the same test a front desk fails on a busy Tuesday.

He answers our phone day and night. Yours could sound like this next week.

#smallbusiness #voiceai #montanabusiness #missedcalls`,
    x: `I built an AI receptionist. I am not going to describe him.

${PHONE}. Call it. He picks up on the first ring and tells you he is an AI in his first sentence.

Try to break him. That is the demo.`,
  },
  {
    id: 'beep',
    angle: 'The beep',
    use: 'The objection killer. Use it the moment somebody says people hate talking to robots.',
    card: 'missed-calls/03-after-hours',
    video: 'after-hours-4x5.mp4, if you would rather move.',
    fb: `Every time I bring up AI answering the phone, somebody tells me people hate talking to robots.

I get it. I hated the idea too.

Then I looked at what the alternative actually was. At nine on a Saturday night nobody is choosing between a robot and a person. They are choosing between a robot and a beep.

People do not hate robots. People hate beeps.

Mine is at ${PHONE} if you want to judge for yourself. It says it is an AI in the first sentence. That part is not negotiable for me.`,
    ig: `"People hate talking to robots."

I get it. I hated the idea too.

Then I looked at what the alternative actually was. At nine on a Saturday night nobody is choosing between a robot and a person. They are choosing between a robot and a beep.

People do not hate robots. People hate beeps.

Mine is at ${PHONE}. Judge it yourself. It says it is an AI in the first sentence, and that part is not negotiable for me.

#smallbusiness #aiforbusiness #customerservice #afterhours`,
    x: `"People hate talking to robots."

At 9pm on a Saturday nobody is choosing between a robot and a person. They are choosing between a robot and a beep.

People do not hate robots. People hate beeps.`,
  },
  {
    id: 'ninepm',
    angle: 'The nine at night caller',
    use: 'The arithmetic post. Best for trades and anyone who works a route or a job site.',
    card: 'missed-calls/01-competitor',
    video: 'after-hours-4x5.mp4. 02-unanswered also fits this angle.',
    fb: `The call you lost last night did not go to voicemail and stay there.

It rang four times, hit your recording, and that person hung up and called the next name on the list. They did not leave a message. They are not going to call back in the morning. You will never know it happened.

That is the whole problem with a missed call. It is invisible. It never shows up as a bad review or an angry email, it just quietly is not there.

Ten missed calls a week, five hundred dollars a job, a third of them closing, is about seven and a half thousand dollars a month walking out the door.

Do that math with your own numbers here: ${MUSTARD}`,
    ig: `The call you lost last night did not go to voicemail and stay there.

It rang four times, hit your recording, and that person called the next name on the list. They will not call back in the morning. You will never know it happened.

That is what makes a missed call so expensive. It is invisible. It never shows up as a bad review, it just quietly is not there.

Ten a week, five hundred a job, a third closing, is roughly seven thousand five hundred a month.

Want to hear the fix? ${PHONE}

#missedcalls #contractorlife #smallbusinessowner #trades`,
    x: `A missed call never shows up as a bad review or an angry email.

It rings four times, hits your recording, and that person calls the next name on the list.

That is what makes it expensive. It is invisible.`,
  },
  {
    id: 'talking-website',
    angle: 'A website that answers its own phone',
    use: 'The flagship offer. Use when the audience is further along than "what is a voice agent".',
    card: 'talking-website/01-talks-back',
    video: 'The Talking Website cut, or a screen recording of the site with the gold call button.',
    fb: `Your website and your phone do not know each other.

The site says you are open until six. The voicemail says something you recorded in 2019. A customer reads one, hears the other, and decides you are disorganised before anybody has spoken to them.

We build them as one thing now. Same brain, same words, same prices. The answer somebody reads on the page at noon is the answer they hear on the phone at midnight, because it is one system rather than two.

Four ninety seven to build, four ninety seven a month, month to month, and your phone number does not change. It forwards.

Hear the phone half of it first: ${PHONE}`,
    ig: `Your website and your phone do not know each other.

The site says you are open until six. The voicemail says something you recorded in 2019. A customer reads one, hears the other, and decides you are disorganised before anybody has spoken to them.

We build them as one thing. Same brain, same words, same prices. What they read at noon is what they hear at midnight.

Hear the phone half first: ${PHONE}

#smallbusinesswebsite #aiwebsite #voiceai #websitedesign`,
    x: `Your website says you are open until six. Your voicemail says something you recorded in 2019.

A customer reads one, hears the other, and decides you are disorganised before anyone has spoken to them.

Build them as one thing.`,
  },
  {
    id: 'roof',
    angle: 'While you are on a roof',
    use: 'Trades specific. Roofing, HVAC, plumbing, landscaping. The one that gets shared in contractor groups.',
    card: 'missed-calls/06-what-it-does',
    video: 'call-me-9x16.mp4 as a Reel. The talking-website-plumbers set is the trade specific cut.',
    fb: `You cannot answer the phone from up a ladder. That is not a discipline problem, it is physics.

So the phone rings while your hands are full, and by the time you are back in the truck the person who called has already booked somebody else.

Mine answers it for me. He knows the services, the hours, the service area and the prices. He books the job straight into the calendar, writes down the address and what is actually wrong, and texts me the ones that need a human.

He is at ${PHONE} and he will happily let you pretend to be a customer with a leaking roof at eleven at night.`,
    ig: `You cannot answer the phone from up a ladder. That is not a discipline problem, it is physics.

The phone rings while your hands are full. By the time you are back in the truck, the person who called has already booked somebody else.

Mine answers it. Knows the services, the hours, the area, the prices. Books it straight into the calendar and writes down what is actually wrong.

${PHONE}. Pretend you have a leaking roof at eleven at night. He will take it seriously.

#roofing #hvac #plumbing #contractorlife #trades`,
    x: `You cannot answer the phone from up a ladder. That is not a discipline problem, it is physics.

Mine answers it, books the job, writes down the address, and texts me the ones that need a human.`,
  },
  {
    id: 'own-it',
    angle: 'You own it',
    use: 'The stewardship post. Slower, warmer, for the audience that has been burned by an agency.',
    card: 'missed-calls/07-you-own-it',
    video: 'None. This one is better as a still.',
    fb: `Most people who build you something want you to need them forever.

That is the business model. You do not get the logins, you do not get the code, and every small change costs you a phone call and two weeks of waiting.

We hand it over. The domain, the accounts, the numbers, the whole thing, in your name from the start. If you fired us tomorrow you would keep everything and it would keep working.

Changes are included while we work together, and I do not send change orders for a different headline.

Build the thing. Own the thing. ${MUSTARD}`,
    ig: `Most people who build you something want you to need them forever.

That is the business model. You do not get the logins, you do not get the code, and every small change costs a phone call and two weeks of waiting.

We hand it over. Domain, accounts, numbers, all of it, in your name from the start. Fire us tomorrow and you keep everything, working.

Build the thing. Own the thing.

#smallbusiness #entrepreneur #buildinpublic #ownyourwork`,
    x: `Most people who build you something want you to need them forever. That is the business model.

We hand over the domain, the accounts and the numbers in your name from day one.

Fire us tomorrow and you keep everything, working.`,
  },
];

/**
 * X is not in the Meta playbook anywhere, so the paid side of it is spelled out
 * here rather than assumed. Kept deliberately small: X is a cheap place to test
 * a line, not a place to spend real money before a line has proved itself.
 */
/**
 * SET TWO: THE FIELD GUIDE (/fieldguide).
 *
 * Sarah, 2026-08-21: "write social posts for me that help people find this."
 *
 * A different job from the Mr. Mustard posts above. Those sell a product to a
 * business owner. These give something away to a person who wants to build and
 * does not know how, and the sale is only the last line. So each caption
 * teaches one complete, true thing on its own: someone who never clicks still
 * leaves with something, which is the only reason a stranger shares a post from
 * a company they have never heard of.
 *
 * The CTA is the URL rather than the phone, because the thing on offer is a
 * page. Instagram still cannot carry a link, so there the URL is typed out in
 * full and the bio does the tapping.
 */
const GUIDE_POSTS: Post[] = [
  {
    id: 'fg-no-code',
    angle: 'You do not need to code',
    use: 'The lead post. Widest audience, works cold, and the one most likely to get sent to a friend.',
    card: 'field-guide/01-no-code',
    topic: 'Field Guide',
    fb: `Almost everyone I talk to has something they want built and thinks the wall is code.

It is not, and it stopped being that about a year ago.

Claude Code runs in a terminal window on your own computer. You tell it what you want in plain English. It reads your project, writes the code, runs it, and fixes what it broke. I have shipped 40+ products with it.

Here is the part nobody tells beginners. The skill is not typing. The skill is describing an outcome precisely and then checking the work, and if you have ever hired anyone, you already have that skill.

So I wrote all of it down. The install, the loop that actually works, seventeen prompts you can copy and paste, and the twelve rules that cost us real days to learn.

Free. No signup, no email, nothing to buy: https://modernmustardseed.com/fieldguide?utm_source=facebook&utm_medium=organic&utm_campaign=fieldguide`,
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
    card: 'field-guide/02-four-lines',
    topic: 'Field Guide',
    fb: `People assume the setup is the hard part. Here is the entire setup.

npm install -g @anthropic-ai/claude-code
cd my-project
claude
/init

Four lines. You run the first one once, ever. The second moves you into your project folder, and it matters, because Claude only sees the folder you start it in. The third starts it. The fourth is the one everybody skips and should not: it reads your whole project and writes itself a briefing that it reads at the start of every session from then on.

There is no step five. You are now typing plain English at something that can build.

The rest of what we know, in one place and free: https://modernmustardseed.com/fieldguide?utm_source=facebook&utm_medium=organic&utm_campaign=fieldguide`,
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
    card: 'field-guide/03-six-words',
    topic: 'Field Guide',
    fb: `The six most useful words you can type at an AI that writes code:

"do not write any code yet"

Add them to the end of any request and it stops, reads what you already have, and hands you a plan instead of a pile of files. You read the plan. You say what is wrong with it. Then it builds.

Most bad AI code is not a bad model. It is an approved bad plan, approved by someone who never read the plan.

Thirty seconds of reading there is the highest-return time in the whole process, and it is the one habit that separates people who like these tools from people who fight them.

Sixteen more prompts like this, free: https://modernmustardseed.com/fieldguide?utm_source=facebook&utm_medium=organic&utm_campaign=fieldguide`,
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
    card: 'field-guide/04-done',
    topic: 'Field Guide',
    fb: `A rule that has saved us more time than any other, and it cost a real day to learn:

Done is not evidence.

An AI will tell you the feature works because it reasoned that it should work, not because it ran it. A green terminal is a claim. So is a confident summary. Neither one is a fact.

The fix is one sentence, every time: "run it and show me the real output."

Say that and something good happens. It runs the thing, finds its own mistake, and fixes it before you ever see it. Ask for the test, the loaded page, the actual response. Never take the summary.

We keep twelve rules like this one. All twelve, free: https://modernmustardseed.com/fieldguide?utm_source=facebook&utm_medium=organic&utm_campaign=fieldguide`,
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
    card: 'field-guide/05-the-loop',
    topic: 'Field Guide',
    fb: `If you tried an AI coding tool and it made a mess, you were probably missing the loop. Five steps, in this order:

1. Explore. Have it read the relevant code and explain it back to you first.
2. Plan. It can think without touching a single file. Read the plan before you approve it.
3. Build. One outcome per request. Small pieces, so when something breaks you can tell which piece broke it.
4. Prove. Never accept "done". Ask for the real output.
5. Save. Say "commit this" every time it works. That is your undo button.

Almost every bad result comes from jumping straight to three. The loop is not overhead. It is the difference between a tool that ships features and a tool that generates confident wreckage.

The whole thing written out, free: https://modernmustardseed.com/fieldguide?utm_source=facebook&utm_medium=organic&utm_campaign=fieldguide`,
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
    card: 'field-guide/06-free',
    topic: 'Field Guide',
    fb: `We wrote the guide we wish we had, and it is free.

The Claude Code Field Guide, for anyone who wants to build software and has never written any:

Seventeen prompts you can copy with one tap
The loop that actually works
The CLAUDE.md template that fixes most bad output
Twelve rules we learned the expensive way
A triage table for every symptom, and what actually causes it
A plain English glossary, so no word in it can stop you

No signup. No email. There is a one-page PDF too, made to be printed and pinned above a desk.

https://modernmustardseed.com/fieldguide?utm_source=facebook&utm_medium=organic&utm_campaign=fieldguide

And if you read it and decide you would rather someone just built the thing, that is what we do. Call the ranch line at (406) 312-1223 and Mr. Mustard, our own AI agent, picks up at any hour. Or book thirty minutes and bring nothing but the idea.`,
    ig: `We wrote the guide we wish we had. It is free.

The Claude Code Field Guide, for anyone who wants to build software and has never written any:

17 prompts you can copy
The loop that actually works
The CLAUDE.md template that fixes most bad output
12 rules we learned the expensive way
A triage table for every symptom
A plain English glossary, so no word in it can stop you

No signup, no email. There is a one-page PDF made to be printed and pinned above a desk.

modernmustardseed.com/fieldguide
(link in bio)

Would rather someone just built it? Call (406) 312-1223. Mr. Mustard picks up at any hour.

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

/** Both sets, one library. Mr. Mustard first, the guide behind him. */
const ALL_POSTS: Post[] = [...POSTS, ...GUIDE_POSTS];

const X_ADS = [
  { id: 'x-objective', label: 'Objective: Website traffic. X does not have a call objective, so the phone number lives in the post text and the link goes to /mustard.' },
  { id: 'x-budget', label: 'Budget $5 a day, one campaign, and leave it a week. Below $5 X barely delivers; above it you are paying to learn something Meta teaches cheaper.' },
  { id: 'x-audience', label: 'Targeting: follower look-alikes of trade and small business accounts, plus keyword targeting on "missed call", "answering service", "receptionist". United States, no age limit.' },
  { id: 'x-creative', label: 'Use call-me-16x9.mp4. X autoplays muted, so the first three seconds must read without sound. Add the caption file if the cut does not have burned-in captions.' },
  { id: 'x-organic', label: 'Post the organic version first and promote the one that gets replies. On X the reply count predicts ad performance better than likes.' },
  { id: 'x-measure', label: 'Judge on calls to (406) 312-1223 during the flight, visible in Callers, not on impressions. X impressions are the cheapest and least meaningful number in advertising.' },
];

function Copyable({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked, the text is on screen anyway */
    }
  };
  return (
    <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#161616]/40 tabular-nums">{text.length} ch</span>
          <button
            onClick={copy}
            className="text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
          >
            {done ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <p className="text-sm text-[#161616]/85 whitespace-pre-line leading-relaxed font-sans">{text}</p>
    </div>
  );
}

export default function SocialPosts() {
  const [open, setOpen] = useState<string>(ALL_POSTS[0].id);

  return (
    <>
      <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }}
          aria-hidden
        />
        <div className="relative">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold">
            Organic · Facebook, Instagram, X
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">The free half of every launch</h2>
          <p className="text-sm text-white/70 font-sans mt-3 max-w-2xl leading-relaxed">
            Twelve angles across two sets, written for each network rather than reflowed across all three. Facebook
            keeps the link, Instagram cannot have one so the phone number or a typed URL carries it, and every X
            variant is under 280 characters. Post the organic version the same day the paid cut goes live: it costs
            nothing and it warms the page the ad lands on.
          </p>
          <p className="text-sm text-white/70 font-sans mt-3 max-w-2xl leading-relaxed">
            <b className="text-[#F5B700]">Mr. Mustard</b> sells the product to a business owner, and the demo is a
            phone call. <b className="text-[#F5B700]">Field Guide</b> gives something away to someone who wants to
            build and does not know how, so every caption teaches one complete thing on its own and the sale is only
            the last line. Run the Field Guide set in order, the giveaway last.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_POSTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p.id)}
            className={`text-left border-2 border-[#161616] p-4 shadow-[3px_3px_0_0_#161616] transition-transform hover:-translate-y-0.5 ${
              open === p.id ? 'bg-[#F5B700]' : 'bg-white'
            }`}
          >
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold text-[#E0301E] block mb-1.5">
              {p.topic ?? 'Mr. Mustard'}
            </span>
            <span className="font-display text-[17px] font-extrabold leading-tight block">{p.angle}</span>
            <span className="text-[12.5px] text-[#161616]/70 font-sans leading-snug block mt-1">{p.use}</span>
          </button>
        ))}
      </section>

      {ALL_POSTS.filter((p) => p.id === open).map((p) => (
        <section key={p.id} className="space-y-5">
          {/*
            SHOW THE GRAPHIC, DO NOT DESCRIBE IT.

            This block used to be a sentence naming a filename, which is how a
            library of finished artwork ends up looking like a to-do list.
            Sarah's words on seeing it: "there are no graphics, there is only a
            prompt." The cards existed the whole time. Now they are on screen,
            both cuts, with the download that actually saves the file.
          */}
          <div className="bg-[#FBF6EA] border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">
              Post it with this
            </span>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1.1fr_1fr]">
              {(['', '-square'] as const).map((suffix) => (
                <figure key={suffix} className="flex flex-col gap-2">
                  <a
                    href={`/social/${p.card}${suffix}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#F5B700]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/social/${p.card}${suffix}.png`} alt="" className="block h-auto w-full" loading="lazy" />
                  </a>
                  <a
                    href={`/social/${p.card}${suffix}.png`}
                    download
                    className="text-center text-[11px] uppercase tracking-[0.14em] font-sans font-bold px-3 py-2 border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
                  >
                    {suffix ? 'Download square (X)' : 'Download feed (FB + IG)'}
                  </a>
                </figure>
              ))}
            </div>
            {p.video ? (
              <p className="text-[13px] text-[#161616]/70 font-sans mt-4 leading-relaxed">
                <b>Video instead:</b> {p.video}
              </p>
            ) : (
              <p className="text-[13px] text-[#161616]/70 font-sans mt-4 leading-relaxed">
                <b>Card only.</b> Drawn in code, so it is regenerated by{' '}
                <code className="font-mono text-[12px]">node social-drafts/field-guide/render.mjs</code> and again with{' '}
                <code className="font-mono text-[12px]">--square</code>. Pair it with the printable one-pager at{' '}
                <a
                  href="/downloads/modern-mustard-seed-claude-code-field-guide.pdf"
                  className="underline decoration-[#F5B700] font-bold"
                >
                  the PDF
                </a>{' '}
                when someone asks for something they can keep.
              </p>
            )}
          </div>
          <Copyable label="Facebook" text={p.fb} />
          <Copyable
            label={p.topic ? 'Instagram (no links, the typed URL is the CTA)' : 'Instagram (no links, phone is the CTA)'}
            text={p.ig}
          />
          <Copyable label="X (under 280)" text={p.x} />
        </section>
      ))}

      <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">
          Paid on X, which the rest of this playbook does not cover
        </span>
        <h3 className="font-display text-2xl font-extrabold mt-2">Six lines and a five dollar budget</h3>
        <ul className="mt-4 space-y-3">
          {X_ADS.map((x) => (
            <li key={x.id} className="flex gap-3 text-sm font-sans text-[#161616]/85 leading-relaxed">
              <span className="mt-1.5 h-2 w-2 shrink-0 border-2 border-[#161616] bg-[#F5B700]" aria-hidden />
              {x.label}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
