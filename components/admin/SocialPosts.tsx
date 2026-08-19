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
  creative: string;
  fb: string;
  ig: string;
  x: string;
};

const POSTS: Post[] = [
  {
    id: 'dare',
    angle: 'The dare',
    use: 'The default post. Works cold, works warm, works on every network, and the demo does the selling.',
    creative: 'GRAPHIC: /social/missed-calls/05-break-it.png (feed) and 05-break-it-square.png (X). VIDEO if you would rather: call-me-4x5.mp4 on FB and IG, call-me-9x16.mp4 for Reels and Stories, call-me-16x9.mp4 on X.',
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
    creative: 'NO GRAPHIC YET. 03-after-hours.png is retired: its artwork still reads the 52% figure that was pulled. Post this one text-only, or re-render that card with the beeps headline from social-drafts/missed-calls.',
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
    creative: 'GRAPHIC: /social/missed-calls/01-competitor.png (feed) and -square (X). VIDEO: after-hours-4x5.mp4. Avoid 02-unanswered, it is retired for carrying an unsourced 62% figure.',
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
    creative: 'GRAPHIC: /social/talking-website/01-talks-back.png (feed) and -square (X). VIDEO: the Talking Website cut, or a screen recording of the site with the gold call button.',
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
    creative: 'GRAPHIC: /social/talking-website-plumbers/ for the trade cut, or /social/missed-calls/06-what-it-does.png. VIDEO: call-me-9x16.mp4 as a Reel.',
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
    creative: 'GRAPHIC: /social/missed-calls/04-call-it.png (feed) and -square (X), or a photo of the Flathead. Download any of these from /admin/social-cards.',
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
  const [open, setOpen] = useState<string>(POSTS[0].id);

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
            Six angles, written for each network rather than reflowed across all three. Facebook keeps the link,
            Instagram cannot have one so the phone number carries it, and every X variant is under 280 characters. Post
            the organic version the same day the paid cut goes live: it costs nothing and it warms the page the ad
            lands on.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p.id)}
            className={`text-left border-2 border-[#161616] p-4 shadow-[3px_3px_0_0_#161616] transition-transform hover:-translate-y-0.5 ${
              open === p.id ? 'bg-[#F5B700]' : 'bg-white'
            }`}
          >
            <span className="font-display text-[17px] font-extrabold leading-tight block">{p.angle}</span>
            <span className="text-[12.5px] text-[#161616]/70 font-sans leading-snug block mt-1">{p.use}</span>
          </button>
        ))}
      </section>

      {POSTS.filter((p) => p.id === open).map((p) => (
        <section key={p.id} className="space-y-5">
          <div className="bg-[#FBF6EA] border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Creative</span>
            <p className="text-sm text-[#161616]/85 font-sans mt-2">{p.creative}</p>
          </div>
          <Copyable label="Facebook" text={p.fb} />
          <Copyable label="Instagram (no links, phone is the CTA)" text={p.ig} />
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
