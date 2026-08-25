// The social card library: finished graphic sets with their group-post copy,
// rendered by components/admin/SocialCards.tsx at /admin/social-cards.
//
// The PNGs live in public/social/<set>/ and are served as real static files, so
// the download buttons are ordinary links that always work. (They were briefly
// published as a Claude artifact instead, where a sandboxed iframe silently
// blocks every file write. Hence this page.)
//
// Sources for the graphics: social-drafts/{missed-calls,websites}/ in this repo.
// Re-render with `node render.mjs` (feed) and `node render.mjs --square` (X),
// then copy the output into public/social/<set>/ with -square.png suffixes.

export type SocialCard = {
  file: string; // basename, no extension. <file>.png and <file>-square.png must both exist.
  headline: string;
  use: string;
  alt: string;
  /**
   * Set when the PNG must not be posted any more, with the reason. The file
   * stays in the repo, because deleting it would break the historical record of
   * what we published, but the admin page stops offering it for download and
   * says why.
   *
   * ⚠️ A retired card is a card whose ARTWORK is wrong, not one that is merely
   * old. Both current cases carry a statistic burned into the image, which is
   * the one kind of error that cannot be fixed by editing this file.
   */
  retired?: string;
};

// A paragraph, or an array of strings rendered as a numbered list.
export type PostBlock = string | string[];

export type SocialPost = {
  n: number;
  title: string;
  graphic: string;
  body: PostBlock[];
  followUp?: { label: string; lines: string[] };
  /**
   * The same post said for another network, when reflowing the Facebook copy
   * would be wrong rather than merely lazy: Instagram cannot carry a link, and
   * X punishes any setup at all. Each one gets its own copy button.
   */
  variants?: { label: string; text: string }[];
};

export type SocialReply = { q: string; a: string; warn?: string };

export type SocialSet = {
  id: string;
  name: string;
  eyebrow: string;
  blurb: string;
  cta: string;
  accent: string;
  rules: string[];
  cards: SocialCard[];
  posts: SocialPost[];
  replies: SocialReply[];
};

import { FIELD_GUIDE_POSTS, FIELD_GUIDE_RULES } from './fieldguide-social';

/**
 * Set fifteen is assembled rather than typed out, because the same words also
 * render in the Ads Playbook's Organic Social tab. One source, two surfaces.
 */
const FIELD_GUIDE_SET: SocialSet = {
  id: 'field-guide',
  name: 'The Field Guide',
  eyebrow: 'Set fifteen · Claude Code',
  blurb:
    'Six cards for the free Claude Code guide at /fieldguide. This set gives something away instead of selling something, so every caption teaches one complete, true thing on its own. Somebody who never clicks still leaves with a tip that works, which is the only reason a stranger shares a post from a company they have never heard of.',
  cta: 'modernmustardseed.com/fieldguide',
  accent: '#F5B700',
  rules: FIELD_GUIDE_RULES,
  cards: FIELD_GUIDE_POSTS.map((p) => ({
    file: p.file,
    headline: p.headline,
    use: p.use,
    alt: p.alt,
  })),
  posts: FIELD_GUIDE_POSTS.map((p, i) => ({
    n: i + 1,
    title: p.angle,
    graphic: `${p.file}.png`,
    body: p.fb.split('\n\n'),
    variants: [
      { label: 'Instagram (no links, the typed URL is the CTA)', text: p.ig },
      { label: 'X (under 280)', text: p.x },
    ],
  })),
  replies: [
    {
      q: 'Do I need to know how to code to use this?',
      a: 'No. You need to know what you want and how to check that you got it. The guide is written for someone who has never opened a terminal, and it starts with the install.',
    },
    {
      q: 'Is it actually free, or is there a catch?',
      a: 'Actually free. No signup, no email, nothing gated. There is a printable card at the bottom if you want it on paper.',
    },
    {
      q: 'What does Claude Code cost?',
      a: 'Claude Code needs a paid Claude account, which is the part most write-ups skip. Pro is $20 a month and includes it, Max starts at $100 a month, and you can also pay per use with Console credits instead of subscribing. It is not on the free tier. Tiers change, so check claude.com/pricing. The guide itself costs nothing either way.',
    },
    {
      q: 'I tried something like this and it wrote garbage.',
      a: 'That is usually the loop, not the model. Explore, plan, build, prove, save, in that order. Most bad AI code is an approved bad plan, approved by someone who never read the plan. The loop card is the short version.',
    },
    {
      q: 'Can you just build it for me instead?',
      a: 'Yes, that is the day job. Call (406) 312-1223 and Mr. Mustard picks up at any hour, or book thirty minutes at modernmustardseed.com/book and bring nothing but the idea.',
      warn: 'Only say this once the person has actually asked. The set works because it gives something away first.',
    },
  ],
};

export const SOCIAL_SETS: SocialSet[] = [
  FIELD_GUIDE_SET,
  {
    id: 'missed-calls',
    name: 'The Missed Call Files',
    eyebrow: 'Set one · Voice',
    blurb:
      'Six cards pointing at one live phone number. The call to action is a number, not a link, so the post keeps full reach in Facebook groups where a URL gets suppressed.',
    cta: 'Mr. Mustard · (406) 312-1223',
    accent: '#E0301E',
    rules: [
      'Lead with 05-break-it in other people’s groups. The dare survives moderation, the demo does not.',
      'Save 04-call-it for your own Page, your own group, and groups with an explicit promo day.',
      'Serve for a week in a group before you post one of these.',
      'Dial the number yourself before any campaign. The brain and the binding are verified, a real inbound PSTN call is not.',
    ],
    cards: [
      {
        file: '01-competitor',
        headline: '82% will just call the next name on the list.',
        use: 'The teardown opener. Post 2, or head of the 01 + 02 + 03 carousel.',
        alt: 'A man on a phone outside a closed storefront. Headline: 82 percent will just call the next name on the list.',
      },
      {
        file: '02-unanswered',
        headline: 'You cannot be in two places. The phone does not know that.',
        use: 'The empathy beat. Middle of the Post 2 carousel.',
        alt: 'A tradesperson working under a kitchen sink. Headline: you cannot be in two places, the phone does not know that.',
      },
      {
        file: '03-after-hours',
        headline: 'People do not hate robots. People hate beeps.',
        use: 'The objection killer. Post 3.',
        alt: 'A lit shop counter at night. Headline: people do not hate robots, people hate beeps.',
      },
      {
        file: '04-call-it',
        headline: 'Call my AI. It picks up on the first ring.',
        use: 'Straight invitation. Your own Page and group only.',
        alt: 'A telephone receiver in a burst of sound rings. Headline: Call my AI.',
      },
      {
        file: '05-break-it',
        headline: 'Try to break it. Then tell me where it cracked.',
        use: 'The dare. This is the one that survives other people’s groups.',
        alt: 'A ringing rotary phone on a shop counter. Headline: Try to break it.',
      },
      {
        file: '06-what-it-does',
        headline: 'It answers. It thinks. It books.',
        use: 'The explainer. Post 4, for people already asking what it does.',
        alt: 'Hands patching a cable into a vintage switchboard. Headline: It answers. It thinks. It books.',
      },
      {
        file: '07-you-own-it',
        headline: 'You own it. Domain, accounts, numbers, all of it.',
        use: 'The stewardship card. Post it to the audience that has been burned by an agency, and any time somebody asks what happens if they leave.',
        alt: 'One hand passing a ring of keys to another across a shop counter. Headline: you own it, domain, accounts, numbers, all of it.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The dare',
        graphic: '05-break-it',
        body: [
          'I built an AI that answers the phone for small businesses, and I want you to try to break it.',
          '(406) 312-1223',
          'Call it. Interrupt it. Talk over it. Give it a fake business and a strange question. Ask it something a real customer would ask you on a Saturday night.',
          'It will tell you straight away that it is an AI, because that is the rule I build with. What I want to know is where it falls apart, because that is the part I go fix next.',
          'Tell me in the comments what you threw at it and what it did. I read all of them.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'Fair warning, it does try to book you a call at the end. Just say no thanks, it takes the hint. Costs you nothing either way.',
          ],
        },
      },
      {
        n: 2,
        title: 'The stat teardown',
        graphic: '01-competitor',
        body: [
          '82% of people who call you and get no answer will just call the next name on the list. They do not leave a message. They do not try again.',
          "That number is from CallRail's 2025 consumer survey, and it lines up with what most of us already know in our gut. The phone rings when you are under a sink, up a ladder, or standing in front of a paying customer. You cannot be in two places. The phone does not care.",
          'Three things that fix most of it, in the order I would do them:',
          [
            'Turn on a real ring group so it hits a second phone before it hits voicemail.',
            'Put a text-back on every missed call. Even a plain "sorry we missed you, what do you need?" recovers a surprising number.',
            'Give the after-hours calls somewhere to land that is not a beep.',
          ],
          'If you want to hear what number three sounds like, I have one answering right now at (406) 312-1223. It is mine, it is free, and it will happily be your guinea pig.',
        ],
      },
      {
        n: 3,
        title: 'The objection killer',
        graphic: '03-after-hours',
        body: [
          'Every time I bring up AI answering the phone, somebody says "people hate talking to robots."',
          'I get it. I hated the idea too.',
          'Then I noticed what the alternative actually was. At 9pm on a Saturday nobody was choosing between a robot and a person. They were choosing between a robot and a beep. People do not hate robots. People hate beeps.',
          'Mine is at (406) 312-1223 if you want to judge for yourself. It says it is an AI in the first sentence. That part is non-negotiable for me.',
        ],
      },
      {
        n: 4,
        title: 'What it actually does',
        graphic: '06-what-it-does',
        body: [
          'People keep asking what the thing on the other end of (406) 312-1223 actually does, so here it is.',
          'It picks up on ring one, at any hour, in your business voice.',
          'It asks one sharp question, then gives you ideas built for what you actually do.',
          'It books the appointment, emails you the transcript, and remembers the caller next time they ring.',
          'That last one is the part people do not expect. Call it twice a week apart and it will know who you are.',
          'Ninety seconds is all it takes to hear all three.',
        ],
      },
    ],
    replies: [
      {
        q: 'How much?',
        a: 'The call is free, always. If you want one of your own it is $397 to build and $397 a month, and I scope it on a 15 minute call. Not trying to sell you in the comments though, go break the demo first.',
        warn: 'Price check before you post. That came from data/demo-agent.ts on 2026-07-28. Never type a price from memory, re-read the file if the tiers have moved.',
      },
      {
        q: 'Does it sound fake?',
        a: 'Judge it yourself, that is the whole point of putting the number out there. It will tell you it is an AI in the first sentence either way.',
      },
      {
        q: 'What if it says something wrong to my customer?',
        a: 'Fair. It is scoped to what you give it and it is built to say "I do not know, let me get you to a human" instead of guessing. Test it on the tricky stuff, that is exactly what I want to see.',
      },
    ],
  },

  {
    id: 'websites',
    name: 'The Storefront Files',
    eyebrow: 'Set two · Websites',
    blurb:
      'Six cards on why a small business needs a website, built around one idea: search is where people go to solve a problem, and your website is the store they walk into once they find you.',
    cta: 'Free audit · modernmustardseed.com/website-audit',
    accent: '#1E50C8',
    rules: [
      'Never type a website price. Both engagements are scoped and quoted after a free discovery call.',
      'No ranking promises. The audit scores what is on the page. That is the claim.',
      'The URL is printed on the card art, never in the post body. An image is not a link, so reach stays intact.',
      'Disclose that DreamHost sells hosting when you cite their numbers. Saying it first beats getting caught.',
      'Never say "45% start with AI." BrightLocal found 45% use AI somewhere in the journey. DreamHost found 3% start there.',
    ],
    cards: [
      {
        file: '01-google-first',
        headline: '67% start at Google when they need someone local.',
        use: 'The opener. Post 2, or head of the 01 + 02 + 03 carousel.',
        alt: 'A magnifying glass over a row of storefronts. Headline: 67 percent start at Google when they need someone local.',
      },
      {
        file: '02-verify-site',
        headline: '58% check your website to see whether you are real.',
        use: 'Social is the window, the site is the store. Carousel middle.',
        alt: 'A shop window beside an open door with light spilling out. Headline: 58 percent go to your website to check whether you are real.',
      },
      {
        file: '03-no-site',
        headline: '39% have walked away from a business with no website.',
        use: 'The objection killer. Post 3, the one that gets shared.',
        alt: 'A shuttered storefront with a completely blank sign board. Headline: 39 percent have walked away from a business that had no website.',
      },
      {
        file: '04-ai-front-door',
        headline: '45% now use AI to find local businesses. Last year 6%.',
        use: 'The shift almost nobody has adjusted to. Post 4.',
        alt: 'A card catalog with one drawer opened by a mechanical hand. Headline: 45 percent now use AI to find local businesses.',
      },
      {
        file: '05-grade-it',
        headline: 'Grade my website. Then argue with the score.',
        use: 'The dare. This is the opener for other people’s groups.',
        alt: 'A clipboard with a red check mark beside a model storefront. Headline: Grade my website.',
      },
      {
        file: '06-storefront',
        headline: 'Found. Believed. Easy to buy from.',
        use: 'The explainer. What a site has to do, in three lines.',
        alt: 'A storefront with a striped awning. Headline: Found. Believed. Easy to buy from.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The dare',
        graphic: '05-grade-it',
        body: [
          'I built a thing that grades your website, and I would like you to tell me it is wrong.',
          'You drop in your URL. An AI reads the actual page and scores it out of 100 on brand, trust, SEO, whether AI search engines can read you, conversion, and design. You get a letter grade, an honest one-line verdict, and a ranked list of what to fix. Under a minute, no credit card, no email needed to see it.',
          'The link is in the first comment.',
          'Here is what I actually want. Run it, then come back and tell me where it was unfair to you. I have watched it be too harsh on small local sites that are converting fine, and that is the kind of thing I want to catch.',
          'Post your score if you are brave. Mine is not a perfect 100 either.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'modernmustardseed.com/website-audit',
            'Fair warning, it will offer to email you the report. You can skip that and still read the whole thing on the page.',
          ],
        },
      },
      {
        n: 2,
        title: 'The stat teardown',
        graphic: '01-google-first',
        body: [
          '67% of people start at Google when they need someone local. Not a referral. Not the phone book. Google.',
          'Then 58% go look at your website to check whether you are actually real.',
          "Both numbers are from DreamHost's 2026 Trust Index, 1,201 US consumers. Worth knowing they sell hosting, so read them with that in mind. But the shape matches what every owner I talk to already sees happening.",
          'Here is the part that gets missed. Your Facebook page is the window display. People look through it, and then they go somewhere else to decide. If there is nowhere to go, 39% of them just leave. Another 45% say a business with no website does not feel real to them.',
          'Three fixes, in the order I would do them:',
          [
            'Claim and fill out your Google Business Profile. It is free and it is the single highest-leverage hour you will spend.',
            'Get one honest page up with what you do, where you work, and how to reach you. One page beats no page by a mile.',
            'Put the phone number in the top right where a thumb can hit it.',
          ],
          'None of that requires hiring anybody.',
        ],
      },
      {
        n: 3,
        title: 'The objection killer',
        graphic: '03-no-site',
        body: [
          '"I get all my work from word of mouth, I do not need a website."',
          'I believe you. Word of mouth is the best lead source there is and I would never tell you otherwise.',
          'But watch what actually happens. Your happy customer tells their neighbor about you. The neighbor does not call. The neighbor searches your name first. That is the moment. If nothing comes up, the referral you earned quietly dies on the sidewalk.',
          '39% of consumers say they have walked away from a business that had no website (DreamHost, 2026). Not argued. Walked.',
          'The website is not there to get you new customers. It is there to stop you from losing the ones you already earned.',
        ],
      },
      {
        n: 4,
        title: 'The shift nobody has adjusted to',
        graphic: '04-ai-front-door',
        body: [
          "Last year, 6% of people used AI to find a local business. This year it is 45%. That is BrightLocal's 2026 survey, 1,002 US consumers.",
          'One caveat so nobody quotes this at me wrong: most of them are not starting there. They still start at Google and use AI somewhere in the middle. But 45% of people are now, at some point, asking a machine which local business to use.',
          'Here is what that changes. Something is reading every website in your town and deciding which three names to say out loud. It cannot recommend a business it cannot read. No site, no mention. Thin site, no mention.',
          'The businesses that sort this out in the next year are going to look very lucky in three years.',
        ],
      },
    ],
    replies: [
      {
        q: 'How much for a website?',
        a: 'Depends entirely on what you need, so I scope it on a free call rather than throwing a number at you in the comments. Two shapes: a straightforward site in about a week, or the full build with booking, CRM and AI agents wired in, one to two weeks. Go run the free audit first though, you may not need me at all.',
        warn: 'Do NOT type a price here. Both website engagements are quoted after a discovery call. There is no list price.',
      },
      {
        q: 'Is this just a way to tell me my site is bad so I hire you?',
        a: 'Honestly, fair question. It grades mine too and I did not get a 100. Run it, take the to-do list, and go fix it yourself. Most of the top items are things you can do in an afternoon without paying anybody.',
      },
      {
        q: 'Will this get me to the top of Google?',
        a: 'No, and I would not trust anybody who promises that. What it does is score what is actually on your page and tell you what is missing. Fixing those things helps. Nobody can promise you a ranking.',
      },
      {
        q: 'I have a Facebook page, is that not enough?',
        a: 'It is a great window display and I would keep it. The gap is that people trust it less for anything expensive. Same survey found people are comfortable spending about $177 through a business website and about $36 through a social shop. For a $400 job, that gap is the whole sale.',
      },
    ],
  },
  {
    id: 'ai-shift',
    name: 'The AI Shift',
    eyebrow: 'Set three · The Signal',
    blurb:
      'A deliberate break from the screenprint of the first two sets: near-black broadcast cards, high-voltage lime, and an oscilloscope trace generated per card so no two are alike. A feed is a wall of white. These are the only black thing on the screen.',
    cta: 'Ten second dare · ask ChatGPT who is best in your town',
    accent: '#05070A',
    rules: [
      'Never say "45% start with AI." BrightLocal found 45% use AI somewhere in the journey. DreamHost found 3% start there. Card 03 exists to say this before someone else does.',
      'No ranking promises, for Google or for ChatGPT. There is no placement to buy and no lever to pull.',
      'Disclose that DreamHost sells hosting when you cite their numbers.',
      'The audit link goes in the FIRST COMMENT, never the post body.',
      'Never type a website price. Both engagements are quoted after a free call.',
    ],
    cards: [
      {
        file: '01-the-shift',
        headline: '45% now use AI to find a local business.',
        use: 'The opener. Post 2, or run 01 + 02 as a two-image carousel.',
        alt: 'Near-black card, a lime oscilloscope trace rising behind a giant numeral. Headline: 45 percent now use AI to find a local business. Last year it was six.',
      },
      {
        file: '02-trusted',
        headline: '42% trust AI as much as a real review.',
        use: 'The weight card. Pairs with 01 in the carousel.',
        alt: 'Near-black card with a steady lime signal trace. Headline: 42 percent trust what AI says as much as a real review.',
      },
      {
        file: '03-the-catch',
        headline: '3% actually start there. Know the difference.',
        use: 'The trust builder. Post 3, the one most likely to get you invited back.',
        alt: 'Near-black card, a lime trace decaying to a flat line. Headline: 3 percent actually start there. Know the difference.',
      },
      {
        file: '04-still-your-site',
        headline: '34% go straight to your site when AI names you.',
        use: 'The follow-through. Getting recommended is only half of it.',
        alt: 'Near-black card with a pulsing lime heartbeat trace. Headline: 34 percent go straight to your website the moment AI names you.',
      },
      {
        file: '05-ask-it',
        headline: 'Ask it about your business.',
        use: 'The dare. This is the opener for other people’s groups.',
        alt: 'Near-black card, strong lime pulse, a lime-bordered sign showing the free website audit URL. Headline: Ask it about your business.',
      },
      {
        file: '06-readable',
        headline: 'Say it plainly. Say it once. Say it where it can be found.',
        use: 'The explainer. What to actually do, in three boring steps.',
        alt: 'Near-black card with a lime trace behind a numbered list. Headline: Say it plainly. Say it once. Say it where it can be found.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The dare',
        graphic: '05-ask-it',
        body: [
          'Here is a ten second test and I would genuinely like to know how it goes for you.',
          'Open ChatGPT. Type: "who is the best [your trade] in [your town]?"',
          'Read what comes back. Are you in it? Is a competitor in it? Is the answer three businesses from a town forty minutes away?',
          'I have been running this for people all week and the results are all over the place. Some folks with terrible websites show up first. Some of the best operators I know are completely invisible. It is not fair and it is not mysterious, it is just what the machine could read.',
          'Post what you got. If you are missing, I will tell you why for free, and no you do not have to hire anybody to fix most of it.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'If you want the long version, the free audit reads your actual page and scores it: modernmustardseed.com/website-audit',
            'No card, no email needed to see the result.',
          ],
        },
      },
      {
        n: 2,
        title: 'The stat teardown',
        graphic: '01-the-shift',
        body: [
          "Last year, 6% of people used AI to help find a local business. This year it is 45%. That is BrightLocal's 2026 survey of 1,002 US consumers.",
          'Before anybody panics: most of them are not starting there. Only about 3% open AI first (DreamHost, 2026). They still start on Google. But somewhere in the middle of deciding, nearly half of them are now asking a machine what it thinks.',
          'Here is the part that actually matters. That machine is reading websites. Not your Facebook page, not your reputation around town, not how good your work is. It reads what is written down and it recommends what it can understand.',
          'If your site does not say plainly what you do and where you do it, you are not being rejected. You are just not in the room.',
        ],
      },
      {
        n: 3,
        title: 'The number everyone is about to get wrong',
        graphic: '03-the-catch',
        body: [
          'There is a stat going around right now that 45% of people use AI to find local businesses, and it is about to get quoted at you by somebody selling something.',
          'The number is real. BrightLocal, 2026, 1,002 US consumers. But it means "use it somewhere in the process," not "start there." A separate survey the same year put the people who actually open AI first at 3%.',
          'Both things are true and the difference is the whole story. This is not a fire drill. It is a slow change in how people check you out, and slow changes are the ones you can actually get ahead of.',
          'I am telling you this because the fastest way to lose a room of business owners is to get caught inflating a number. If I ever quote you something that smells off, ask me for the source. I will have it or I will drop the claim.',
        ],
      },
      {
        n: 4,
        title: 'What to actually do about it',
        graphic: '06-readable',
        body: [
          'Every week somebody asks me what they have to do to "show up in AI." Most of the answers being sold are nonsense. Here is the honest version, and it is boring on purpose.',
          [
            'Say plainly on your website what you do and which towns you drive to. In words. Not in a logo, not in a slideshow, not in a photo of a truck.',
            'Make your hours, phone and address match your Google profile exactly. Mismatches make you look closed or fake to anything reading you.',
            'Write down the questions customers actually ask you. Do you do emergencies. Are you licensed. How fast can you get here. Put the answers in text.',
          ],
          'That is most of it. Nobody can promise you a spot in an AI answer, and be careful with anybody who does. What you can do is be readable, and a startling number of local businesses currently are not.',
        ],
      },
    ],
    replies: [
      {
        q: 'Is this not just fear-mongering to sell websites?',
        a: 'Reasonable suspicion. That is exactly why card three in this set exists to say only 3% of people actually start with AI. If I wanted you scared I would have left that out. The change is real, it is just slower than the headlines.',
      },
      {
        q: 'Do I need something special for AI, like schema or llms.txt?',
        a: 'Those help and I do use them. But if the page does not plainly say what you do and where, the technical stuff does not save it. Write it in English first.',
      },
      {
        q: 'Will this get me to the top of ChatGPT?',
        a: 'No, and nobody can promise that. There is no ranking to buy and no lever to pull. You make yourself readable and accurate, and you turn up more often. That is the entire honest claim.',
      },
      {
        q: 'How much do you charge for this?',
        a: 'The audit is free and gives you the whole to-do list. If you want me to do the work, I scope it on a free call rather than throwing a number in the comments. Plenty of people run the list themselves and never need me.',
        warn: 'Do NOT type a website price here. Both engagements are quoted after a discovery call.',
      },
    ],
  },
  {
    id: 'speed-to-lead',
    name: 'Speed to Lead',
    eyebrow: 'Set four · The Grid',
    blurb:
      'Speed to lead staged as a motorsport race: chequered flag, generated speed streaks, and a timing tower that classifies the reader against the field. Not the missed-call set. That one is about never answering, this one is about answering too late, which is harder to hear because the owner thinks they did respond.',
    cta: 'Race it · (406) 312-1223',
    accent: '#E10600',
    rules: [
      'Always print the year on the Harvard numbers. The audit is real and rigorous (2,241 US companies, real enquiries, timed replies) but it is from 2011.',
      '⚠️ The Optifai 2026 study (47 hour average) is B2B SaaS, NOT home services. Fine as corroboration in a comment that nothing has moved in 15 years. Never put it on a card aimed at trades.',
      'Jobber 2026 is the audience-appropriate one, actual home service customers, so lead with it when the room is sceptical of old data.',
      'Do not run this in the same group in the same week as the Missed Call Files. They are close cousins and it reads as one pitch.',
      'Never type a price from memory. Demo agent tiers come from data/demo-agent.ts.',
    ],
    cards: [
      {
        file: '01-seven-times',
        headline: '7× more likely to win the job if you answer inside the hour.',
        use: 'The opener. Post 2, or run 01 + 02 as a carousel.',
        alt: 'Racing card, chequered flag strips and red livery stripe. Giant italic 7 times. Headline: more likely to win the job if you answer inside the hour.',
      },
      {
        file: '02-forty-two-hours',
        headline: '42 hours is how long the average reply actually takes.',
        use: 'The gap card. Pairs with 01.',
        alt: 'Racing card with a timing tower comparing what the customer expects against what the field delivers. Headline: 42 hours is how long the average reply actually takes.',
      },
      {
        file: '03-dnf',
        headline: '23% never reply at all.',
        use: 'The one that gets shared. DNF is a concept people repeat.',
        alt: 'Racing card with a timing tower showing a DNF row in red. Headline: 23 percent never reply at all. A quarter of the grid never leaves the line.',
      },
      {
        file: '04-the-flag',
        headline: '56% expect to hear back within the hour.',
        use: 'The fresh, audience-appropriate number. Lead with this when the room doubts old data.',
        alt: 'Racing card, timing tower showing on the lead lap against lapped. Headline: 56 percent expect to hear back within the hour.',
      },
      {
        file: '05-race-it',
        headline: 'Race it. It answers on ring one.',
        use: 'The dare. Opener for other people’s groups.',
        alt: 'Racing card with a skewed black number plate showing the phone number. Headline: Race it.',
      },
      {
        file: '06-pit-stop',
        headline: 'You do not need to be fast all day. You need to be fast first.',
        use: 'The fix, in three steps, two of them free.',
        alt: 'Racing card with a numbered three step list. Headline: You do not need to be fast all day. You need to be fast first.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The dare',
        graphic: '05-race-it',
        body: [
          'Quick race, and you will lose to a robot. Sorry in advance.',
          '(406) 312-1223',
          'Call it and count the rings. It picks up before the first one finishes, tells you straight away that it is an AI, and will happily book a job if you push it that far.',
          'Then here is the actual exercise. Ring your own business number from a phone nobody recognises. Count those rings. Then send yourself a message through your own website contact form and see how long the reply takes.',
          'Most owners have genuinely never done that. The results are usually a bit uncomfortable and always useful. Tell me what you found, I will tell you whether it is normal.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'To be fair to everyone: mine is an AI with nothing else to do. You are on a roof. The point is not that you should be faster than a machine, it is knowing what your customer is currently experiencing.',
          ],
        },
      },
      {
        n: 2,
        title: 'The stat teardown',
        graphic: '01-seven-times',
        body: [
          'Harvard sent fake enquiries to 2,241 real companies and timed how long each one took to reply. Not a survey. An actual stopwatch on actual businesses.',
          'Firms that answered inside the hour were about 7 times more likely to qualify the lead. Against the ones who waited a day, 60 times.',
          'The average reply time among everyone who did answer? 42 hours.',
          'That study is from 2011, so before anybody says it is out of date: a 2026 study of B2B companies clocked the average at 47 hours. Fifteen years, and the number went the wrong way.',
          'None of this is about working harder. The winner was not the best tradesperson in the sample. It was whoever picked up first.',
        ],
      },
      {
        n: 3,
        title: 'The DNF',
        graphic: '03-dnf',
        body: [
          'In that same Harvard audit, 23% of companies never replied at all.',
          'Not slow. Never. Nearly one business in four received a real enquiry from a real person and it simply died somewhere between the form and the phone.',
          'I have started calling this a DNF, because it is the same thing as a car that never leaves the grid. All the cost of showing up, none of the result. You paid for the van, the insurance, the sign, maybe the ads. And then the job walked in the door and stood there until it left.',
          'If you want to know whether this is you, do not guess. Send yourself an enquiry through your own website today and see what happens. Genuinely, today.',
        ],
      },
      {
        n: 4,
        title: 'The pit stop',
        graphic: '06-pit-stop',
        body: [
          'You do not need to be fast all day. You need to be fast first. Three things, and two of them are free.',
          [
            'Auto text-back on every missed call, inside sixty seconds. Even a plain "sorry we missed you, what do you need?" recovers more than you would think. Most phone systems and CRMs already do this and it is switched off.',
            'Name who owns the phone between eight and six. An actual person, on a rota. "Whoever gets to it" is how enquiries die.',
            'Give after-hours somewhere to land that answers instead of beeping.',
          ],
          'That is it. No new marketing, no bigger ad budget, no rebrand. Just closing the gap between someone deciding to call you and someone hearing back.',
        ],
      },
    ],
    replies: [
      {
        q: 'We are a small team, we cannot answer instantly.',
        a: 'Nobody can, and I would not trust anyone who says they do. The bar is not instant, it is inside the hour, and the study says most of your competition is nowhere near it. You do not have to be fast. You have to be first.',
      },
      {
        q: 'I am on a roof, I cannot take calls.',
        a: 'Exactly right, and that is the whole point of the text-back. You are not answering the call, you are stopping the person from dialling the next name while they wait. Sixty seconds of automation buys you three hours of grace.',
      },
      {
        q: 'Does an AI answering annoy customers?',
        a: 'Some people hate it, and I will not pretend otherwise. What the data says is that people prefer it to a voicemail beep at nine at night. Mine announces it is an AI in the first sentence, because anything else is a trick.',
      },
      {
        q: 'How much?',
        a: 'The call is free and always will be. If you want one of your own it is $397 to build and $397 a month, scoped on a 15 minute call. Go time your own phone first though, you might just need the text-back switched on.',
        warn: 'Price from data/demo-agent.ts on 2026-07-28. Re-read the file if the tiers have moved. Never type a price from memory.',
      },
    ],
  },
  {
    id: 'race-day',
    name: 'Race Day',
    eyebrow: 'Set five · Mr. Mustard',
    blurb:
      'The odd one out on purpose: no statistics, no sources, no offer. Mr. Mustard, comic sunbursts, Ben-Day dots and hand-drawn racing props. Sets one to four exist to be argued with. This one exists to be liked and shared, so the stat posts land on a warm audience instead of a cold one.',
    cta: 'Weekly rhythm · Monday, midweek, Friday',
    accent: '#1E50C8',
    rules: [
      'Nothing in this set sells anything. If one of these posts ends in a pitch it stops doing its job. The job is reach and warmth.',
      'It is a rhythm, not a campaign. 01 Monday, 03 midweek, 04 Friday, on repeat. Nobody minds a recurring bit, that is what makes it a bit.',
      'Post from the Page, not into other people’s groups. Groups want value or a dare. Personality belongs on your own turf.',
      'If the tag post gets traction, reply to every single comment. A tag post with an absent author is worse than no tag post.',
      'Run one a week alongside the data sets, not instead of them.',
    ],
    cards: [
      {
        file: '01-green-flag',
        headline: 'Green flag. New week, fresh tank.',
        use: 'Monday. The recurring week-opener.',
        alt: 'Mr. Mustard waving on a mustard sunburst with a start-light gantry and speed lines. Headline: Green flag.',
      },
      {
        file: '02-pit-crew',
        headline: 'You drive. We wrench.',
        use: 'What MMS actually does, explained without the word AI.',
        alt: 'Mr. Mustard on a blue sunburst with a racing tyre and a spanner. Headline: You drive. We wrench.',
      },
      {
        file: '03-send-it',
        headline: 'Send it.',
        use: 'Midweek push. The shortest and loudest card in the set.',
        alt: 'Mr. Mustard leaning into speed lines on a red sunburst. Headline: Send it.',
      },
      {
        file: '04-chequered',
        headline: 'You finished the week.',
        use: 'Friday. The warmest one, and the most reshared.',
        alt: 'Mr. Mustard holding a chequered flag on a cream and mustard sunburst. Headline: You finished the week.',
      },
      {
        file: '05-tag-your-crew',
        headline: 'Tag your pit crew.',
        use: 'The engagement card. Easy, kind question, so it actually gets answers.',
        alt: 'Mr. Mustard with a speech bubble reading Who is yours, on a blue sunburst. Headline: Tag your pit crew.',
      },
      {
        file: '06-fuel',
        headline: 'Runs on coffee and stubbornness.',
        use: 'The relatable one. Good any day it is quiet.',
        alt: 'Mr. Mustard beside a red fuel can on a mustard sunburst. Headline: Runs on coffee and stubbornness.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'Monday',
        graphic: '01-green-flag',
        body: [
          'Lights out.',
          'Whatever last week did to you, it does not get a vote today. Fresh tank, clean screen, nobody has missed a call yet.',
          'Go get it.',
        ],
      },
      {
        n: 2,
        title: 'What we actually do',
        graphic: '02-pit-crew',
        body: [
          'Somebody asked me this week to explain what we do without using the word AI, so here it is.',
          'You are the driver. You know the roads, you know the customers, you have been doing this since before anybody had an app for it. That part is not our business and never will be.',
          'We are the crew in the pit lane. We handle the tyres, the fuel, the boring telemetry nobody wants to look at, and the phone that rings while you are up a ladder.',
          'You drive. We wrench.',
        ],
      },
      {
        n: 3,
        title: 'Midweek',
        graphic: '03-send-it',
        body: [
          'Reminder for the Wednesday of it all:',
          'The website was never going to feel finished. The post was never going to feel clever enough. The price was never going to feel comfortable to say out loud.',
          'Send it anyway. You can fix it in the pits.',
        ],
      },
      {
        n: 4,
        title: 'Friday',
        graphic: '04-chequered',
        body: [
          'You finished the week.',
          'Not perfectly. Probably not in the order you planned. Somebody moved a job, somebody did not pay yet, and something broke on Thursday that was not supposed to be your problem.',
          'Doesn’t matter. Chequered flag is a chequered flag.',
          'Go and have your Friday.',
        ],
      },
      {
        n: 5,
        title: 'The roll call',
        graphic: '05-tag-your-crew',
        body: [
          'Tag your pit crew.',
          'The person who answers the phone when you cannot. The one who does the invoices you keep avoiding. The spouse who has heard about the same job three nights running and still asks how it went.',
          'Nobody finishes a season alone. Name yours, I will go and follow them.',
        ],
        followUp: {
          label: 'Working the comments',
          lines: [
            'Reply to every single comment on this one. A tag post with an absent author is worse than no tag post.',
          ],
        },
      },
      {
        n: 6,
        title: 'The fuel one',
        graphic: '06-fuel',
        body: [
          'Every small business in this town runs on the same two things and neither of them is a marketing strategy.',
          'Coffee and pure stubbornness.',
          'Premium unleaded is for people with a marketing department. The rest of us are out here running on a flat white and the refusal to quit.',
        ],
      },
    ],
    replies: [
      {
        q: 'Somebody asks what you actually sell on one of these.',
        a: 'Answer it plainly in one line and leave it there. "We build websites and phone systems for small businesses, but this post is not that, this post is just Friday." Then move on. Turning a warmth post into a pitch is how a Page trains people to scroll past it.',
      },
      {
        q: 'The tag post takes off and there are fifty comments.',
        a: 'Reply to all of them, even if it is three words. Then go follow the people who got tagged. That is the entire return on this set, and it does not happen unless you show up in the comments the same day.',
      },
      {
        q: 'Can I reuse these week after week?',
        a: 'Yes, and you should. Monday green flag and Friday chequered flag work better as a recurring bit than as a one-off. People start expecting them, which is the point.',
      },
    ],
  },

  {
    id: 'reviews',
    name: 'Now Showing',
    eyebrow: 'Set six · Reviews',
    blurb:
      'Your business treated as the film the whole town is reviewing: engraved plates, a star row, antique gold on bone paper. Runs on the BrightLocal 2026 review cluster, four verified numbers that have never been on a card before.',
    cta: 'The dare · reply to your oldest unanswered review',
    accent: '#7A2E2B',
    rules: [
      'Every stat card cites BrightLocal 2026 on the art. If someone asks for the source, link the survey itself, never paraphrase a number from memory.',
      'Never suggest gating reviews (steering only happy customers to Google) or buying them. Both violate platform rules, and one fake review costs more trust than ten honest bad ones.',
      '05-say-something is the opener for other people’s groups. The stat cards follow once the room is warm.',
      'Do not run this in the same group in the same week as The Storefront Files. Both lean on the same survey family and back to back it reads like a campaign.',
      'When you demo a reply to a bad review, write it for the next reader, not the reviewer. Calm, factual, signed with a name.',
    ],
    cards: [
      {
        file: '01-everyone',
        headline: '97% read the reviews before they ever walk in.',
        use: 'The opener. Post 2, or head of the 01 + 02 + 03 carousel.',
        alt: 'Engraved cinema audience facing a glowing screen on bone paper. Headline: 97 percent read the reviews before they ever walk in.',
      },
      {
        file: '02-four-stars',
        headline: '68% will not even consider you under four stars.',
        use: 'The cut line. Middle of the carousel.',
        alt: 'Engraved star trophy on a marble pedestal under a spotlight. Headline: 68 percent will not even consider you under four stars.',
      },
      {
        file: '03-fresh-ink',
        headline: '74% only trust reviews from the last three months.',
        use: 'The recency card, the most surprising number in the set.',
        alt: 'Engraved bill poster pasting a fresh blank sheet over torn old posters. Headline: 74 percent only trust reviews from the last three months.',
      },
      {
        file: '04-box-office',
        headline: '71% check Google before they buy the ticket.',
        use: 'Where the reading happens. Post 2 alternate.',
        alt: 'Engraved 1930s cinema box office glowing at night. Headline: 71 percent check Google before they buy the ticket.',
      },
      {
        file: '05-say-something',
        headline: 'Reply to your oldest unanswered review today.',
        use: 'The dare. This is the one for other people’s groups.',
        alt: 'Engraved standing microphone in a spotlight on an empty stage. Headline: Reply to your oldest unanswered review today.',
      },
      {
        file: '06-take-two',
        headline: 'A bad review is not the ending. It is take two.',
        use: 'The objection killer, for everyone scared of the one angry customer.',
        alt: 'Engraved blank clapperboard held mid-clap by two hands. Headline: A bad review is not the ending. It is take two.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The dare',
        graphic: '05-say-something',
        body: [
          'Small challenge for every business owner reading this, and it costs nothing.',
          'Go find your oldest unanswered review. The one sitting there from two years ago, good or bad, that nobody ever replied to. Answer it today. Two sentences, signed with your name.',
          'Here is why it is worth ten minutes. 97% of people read reviews before they walk in, and an answered review tells all of them that somebody is home. You are not writing to the person who left it. You are writing to the next hundred people who read it.',
          'Post below when you have done it, and tell me which one you picked. Bonus points if it was a rough one and you kept it kind.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'If you cannot find your reviews at all, that is a different problem and also fixable. Say so below and I will point you at where they live.',
          ],
        },
      },
      {
        n: 2,
        title: 'The stat teardown',
        graphic: '01-everyone',
        body: [
          '97% of people read online reviews for local businesses. Ninety-seven. At that point it is not a marketing channel, it is the front door.',
          "That number is from BrightLocal's 2026 Local Consumer Review Survey, 1,002 US consumers. Worth saying: BrightLocal sells local-marketing tools, so they benefit from you caring about this. The number still matches what every owner sees in person.",
          'Two more from the same survey that should change how you spend ten minutes a week:',
          [
            '68% will not consider a business under four stars. The filter happens before they read a word.',
            '74% only trust reviews from the last three months. A wall of old praise reads like an empty room.',
          ],
          'The move is boring and it works: one happy customer, one honest ask, every week. Same day as the job, while it is still warm.',
        ],
      },
      {
        n: 3,
        title: 'The recency problem',
        graphic: '03-fresh-ink',
        body: [
          'Hard truth about the 47 five-star reviews you earned three years ago: to most readers they are wallpaper.',
          '74% of consumers say they prioritize reviews from the last three months (BrightLocal, 2026). Reviews age like posters in the rain. The town does not ask what you were. It asks what you are.',
          'The fix is a habit, not a campaign:',
          [
            'Ask in person, same day, while the job is still warm. "Would you mind putting that in a Google review?" works.',
            'Send the direct review link by text. Every step you remove doubles the odds it happens.',
            'One a week. Fifty-two fresh reviews a year beats any blitz, and it never looks fake because it is not.',
          ],
          'Never pay for reviews and never steer only the happy customers to Google. Both get caught, and both cost more than they give.',
        ],
      },
      {
        n: 4,
        title: 'Take two',
        graphic: '06-take-two',
        body: [
          'Every owner I know is scared of the same thing: the one unfair review from the one customer nothing could satisfy.',
          'Here is what the data and a lot of scar tissue say: the bad review is not what sinks you. The silence after it is.',
          'A page of perfect five-star reviews reads suspicious. A wall of good ones with one honest scar and a calm, signed reply underneath reads like a real business run by an adult. That reply is take two, and you are directing it.',
          'The script: thank them for the specifics, fix what was true, correct what was not, sign your name. No lawyer voice, no counterattack. You are talking to the next hundred readers over that reviewer’s shoulder.',
        ],
      },
    ],
    replies: [
      {
        q: 'How do I get more reviews without begging?',
        a: 'Ask once, in person, the day of the job, and text the direct link so it is one tap. That is not begging, that is making it easy to say the thing they already told you at the door. One a week is plenty.',
      },
      {
        q: 'Can I just buy a few to get started?',
        a: 'No, and not just because platforms delete them. Fake reviews read fake, the FTC fines for them now, and one caught fake costs more trust than ten honest bad ones. Earn them weekly instead, it compounds.',
      },
      {
        q: 'A competitor left me a fake one-star. Now what?',
        a: 'Flag it with the platform, then reply once, calm and factual: no record of a job under that name, happy to make it right if this is a real customer, signed. Readers can smell a hit job when the owner stays composed.',
      },
      {
        q: 'Does this really matter for my trade?',
        a: '97% of consumers read reviews, and trades often have fewer reviews than restaurants, which means each one you have weighs more, not less. Ten fresh ones can own a small market.',
      },
    ],
  },

  {
    id: 'get-found',
    name: 'The Metro',
    eyebrow: 'Set seven · Get Found',
    blurb:
      'Being findable, drawn literally: a transit map with a YOU ARE HERE roundel, four route lines, and one stop per card. The whole set is about the Google Business Profile, and everything it recommends is free.',
    cta: 'Free audit · modernmustardseed.com/website-audit',
    accent: '#1D4ED8',
    rules: [
      'Disclose that DreamHost sells hosting when you cite the 67%. Saying it first beats getting caught.',
      'No ranking promises, for search or for the map. The honest claim is readable and consistent, never "number one."',
      'The audit URL rides the card art only, never the post body, so reach stays intact.',
      '05-search-yourself opens other people’s groups. The stat card is for your own page.',
      'Everything this set recommends is free. Do not let a comment thread turn it into a pitch. The free-ness is the pitch.',
    ],
    cards: [
      {
        file: '01-start-here',
        headline: '67% start at Google when they need someone local.',
        use: 'The anchor stat. Post 2, or your own page.',
        alt: 'Transit map card with a you-are-here roundel. Headline: 67 percent start at Google when they need someone local.',
      },
      {
        file: '02-the-pin',
        headline: 'Your pin says closed. The town reads gone.',
        use: 'The mismatch card. Post 3.',
        alt: 'Transit map card. Headline: Your pin says closed, the town reads gone. Hours, address, phone, the same everywhere or invisible.',
      },
      {
        file: '03-the-photos',
        headline: 'Real photos are proof of life on the map.',
        use: 'The easiest win. Midweek filler that still teaches.',
        alt: 'Transit map card. Headline: Real photos are proof of life on the map.',
      },
      {
        file: '04-the-schedule',
        headline: 'Your reviews ride this line too.',
        use: 'Bridges into the Now Showing set without repeating it.',
        alt: 'Transit map card. Headline: Your reviews ride this line too. Ask one happy customer a week.',
      },
      {
        file: '05-search-yourself',
        headline: 'Search your trade and your town. Incognito.',
        use: 'The dare. This is the opener for other people’s groups.',
        alt: 'Transit map card with a you-are-here roundel. Headline: Search your trade and your town, incognito. Are you on the map or under it?',
      },
      {
        file: '06-three-stops',
        headline: 'Three stops to findable.',
        use: 'The explainer. Post 4, the save-and-share card.',
        alt: 'Transit map card with a numbered three step list. Headline: Three stops to findable. All three are free.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The dare',
        graphic: '05-search-yourself',
        body: [
          'Ten second homework, and some of you are not going to like the result.',
          'Open an incognito window (so Google stops flattering you), and search your trade plus your town. "Plumber Kalispell." "Roofer Whitefish." Whatever you are, wherever you are.',
          'Now look. Are you in the map results? Is your pin in the right place? Are your hours right? Is that phone number even yours anymore?',
          'I ran this for a dozen local businesses this month and about half found something wrong, and every single wrong thing was free to fix.',
          'Post what you found below, good or bad. If you are missing entirely, say so and I will tell you the likely reason, no charge, no pitch.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'If you want the deeper version, the free audit reads your actual website and grades what the machines see: modernmustardseed.com/website-audit. No card, no email needed to see the result.',
          ],
        },
      },
      {
        n: 2,
        title: 'The stat teardown',
        graphic: '01-start-here',
        body: [
          '67% of people start at Google when they need someone local. Not the phone book, not a referral, not your Facebook page. The map and the list under it.',
          "Number is from DreamHost's 2026 Local Business Trust Index, 1,201 US consumers. They sell hosting, so read it knowing that, but the shape matches what every owner already sees.",
          'Here is what most people miss: the map does not read your reputation. It reads your data. A great business with a wrong pin, dead hours, and an old phone number looks, to the machine, exactly like a closed one.',
          'The whole fix is free and takes one honest afternoon. Claim the profile, fill every field, make hours and phone match everywhere they appear. No agency required.',
        ],
      },
      {
        n: 3,
        title: 'The mismatch',
        graphic: '02-the-pin',
        body: [
          'A quiet way local businesses lose work: the internet disagrees with itself about them.',
          'Website says open until six. Google says five. Facebook has the old number. The map pin is on the wrong building. Any one of those seems small, but to every system that decides whether to show you, mismatched facts read as abandoned.',
          'And to a customer standing in the parking lot at 5:15 because your profile said you were open, it reads worse than abandoned. It reads careless.',
          'Fifteen minute fix: pick the one true version of your hours, address, and phone. Then make Google, your website, and Facebook all say exactly that. Set a reminder to re-check when the seasons change.',
        ],
      },
      {
        n: 4,
        title: 'Three stops',
        graphic: '06-three-stops',
        body: [
          'Everything I know about getting found on the map, compressed to three stops. All free.',
          [
            'Claim your Google Business Profile and fill in every single field it offers. Categories, services, service area, all of it. Blank fields are wasted track.',
            'Match your hours, address, and phone everywhere they appear online. Mismatches make the machines trust you less and the customers trust you never.',
            'Add new photos and answer your reviews, weekly. Both are proof of life, and the map quietly rewards businesses that look alive.',
          ],
          'No agency, no monthly fee, no secret. Whoever does the boring stuff most consistently wins the neighborhood.',
        ],
      },
    ],
    replies: [
      {
        q: 'Can you get me to number one on the map?',
        a: 'No, and nobody honest can promise that. There is no placement to buy. What you can control is being complete, consistent, and visibly alive, and that alone puts you ahead of most of the street.',
      },
      {
        q: 'I claimed my profile years ago and lost the login.',
        a: 'Recoverable. Search your business on Google, hit "Own this business?", and follow the verification back. If an old employee or agency owns it, Google has a request-access flow that takes about a week. Worth every minute.',
      },
      {
        q: 'Is this the SEO stuff agencies charge monthly for?',
        a: 'This layer is the part you can do yourself free, and it is the foundation everything paid sits on. If someone charges you monthly and has not fixed your pin, hours, and photos first, ask them why.',
      },
      {
        q: 'Do I still need a website if the profile is free?',
        a: 'Yes, for one structural reason: the profile is rented ground on Google’s land, and it links somewhere. When they click through and find nothing, or something from 2014, the trip ends there. The site is the ground you own.',
      },
    ],
  },

  {
    id: 'ask-mustard',
    name: 'The Column',
    eyebrow: 'Set eight · Ask Mustard',
    blurb:
      'A newspaper advice column: masthead, drop cap, woodcut spot, one highlighter swipe, and a NEXT WEEK teaser chaining the cards into a serial. No statistics, nothing to defend. The set exists to farm real questions, and every question it farms becomes a future column.',
    cta: 'Ask yours in the comments',
    accent: '#C4160B',
    rules: [
      'Never type a price in a column or a comment. Column No. 03 is the model for how to answer the money question.',
      'Reply to every comment the day it lands. An advice column with a silent author is dead on arrival.',
      'Real questions from the comments become future columns. Get a yes from the asker first, then change the name and the town.',
      'Keep the columns pitch-free. If someone asks what MMS sells, answer in one plain line and get back to the advice.',
      'Run one column a week, same day every week, in order. The NEXT WEEK teasers chain them, that is the serial.',
    ],
    cards: [
      {
        file: '01-every-day',
        headline: 'Do I have to post every single day?',
        use: 'Column No. 01. The launch card, run it with the invitation post.',
        alt: 'Newspaper column card with a woodcut rooster crowing on a fence post. Question: do I have to post every single day? Answer: no, consistency beats frequency.',
      },
      {
        file: '02-tiktok',
        headline: 'Do I really need to be on TikTok?',
        use: 'Column No. 02. Permission-to-stop content, widely shared.',
        alt: 'Newspaper column card with a woodcut television set. Question: does my furnace business need TikTok? Answer: probably not, fish where your customers already are.',
      },
      {
        file: '03-what-it-costs',
        headline: 'How much should a website cost?',
        use: 'Column No. 03. The money question, answered without a number.',
        alt: 'Newspaper column card with a woodcut balance scale. Question: quotes ranged from four hundred to eight grand, what should a website cost? Answer: it depends what the site has to do.',
      },
      {
        file: '04-the-robot',
        headline: 'Is AI going to replace me?',
        use: 'Column No. 04. The reassurance card, and quietly the most on-brand.',
        alt: 'Newspaper column card with a woodcut tin robot tipping a bowler hat. Question: is AI coming for my business? Answer: not the part that matters, it replaces being unreachable.',
      },
      {
        file: '05-the-gloves',
        headline: 'Talk me down from fighting a nasty review.',
        use: 'Column No. 05. Pairs with the Now Showing set without repeating it.',
        alt: 'Newspaper column card with woodcut boxing gloves hanging from a nail. Question: someone torched me in a review, talk me down. Answer: hang the gloves up, your reply is for the next hundred readers.',
      },
      {
        file: '06-slow-season',
        headline: 'Winter kills my trade. What do I do until spring?',
        use: 'Column No. 06. The season closer, ends by asking for their questions.',
        alt: 'Newspaper column card with a woodcut trowel in a mound of soil beside a seedling. Question: what do I do in the dead season? Answer: plant, spring rewards whoever planted in January.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The launch',
        graphic: '01-every-day',
        body: [
          'Starting something new and slightly ridiculous: an advice column for small business owners. Ask Mustard. You write in, I answer straight, no charge, no pitch.',
          'Column No. 01 is a question I have heard four times this month: "Do I really have to post every single day?" The full answer is on the card, but the short version is no, and the person who told you otherwise is tired too.',
          'Here is the deal. Drop your question in the comments. Marketing, websites, reviews, the phone, whatever is bugging you about running the business. I will answer every single one in the comments, and the best ones become future columns with your name changed and your secret safe.',
          'What have you been wondering that everybody else seems to already know?',
        ],
        followUp: {
          label: 'Working the comments',
          lines: [
            'Answer every question the same day, fully, in the comments. The column earns trust by being genuinely free. If a question needs a longer answer, say "this one is becoming next week’s column" and mean it.',
          ],
        },
      },
      {
        n: 2,
        title: 'The money question',
        graphic: '03-what-it-costs',
        body: [
          'Column No. 03, and it is the question everyone asks with their guard up: "One guy quoted me four hundred dollars for a website and another quoted eight grand. What should it actually cost?"',
          'The honest answer fits in one line: it depends what the site has to do, and anyone who quotes you before asking questions is selling a template, not a website.',
          'Ask both bidders the same three things. What happens when a customer calls? What happens when they want to book? What happens when they want to pay? The right price follows those answers. The wrong one follows silence.',
          'Got a quote sitting in your inbox right now that smells off? Describe it below (no names) and I will tell you what questions to send back.',
        ],
      },
      {
        n: 3,
        title: 'The robot column',
        graphic: '04-the-robot',
        body: [
          'Column No. 04: "Straight up. Is AI coming for my business?"',
          'I build AI systems for a living, so believe me when I say this is the one question I refuse to answer with hype.',
          'Not the part of your business that matters. AI cannot crimp a fitting, calm a flooded kitchen at midnight, or earn the handshake that gets you the next three referrals on that street.',
          'What it replaces is being unreachable. The call that rings out while you are under a sink. The website form nobody answers until Thursday. The after-hours question that becomes somebody else’s customer by morning. The machine holds the door. You still do the work.',
          'Skeptics especially welcome below. Tell me why it will not work for your trade and I will give you a straight answer, even when the straight answer is "you are right, it will not."',
        ],
      },
      {
        n: 4,
        title: 'The season closer',
        graphic: '06-slow-season',
        body: [
          'Column No. 06 lands close to home for half of Montana: "Winter kills my trade for four months. What do I do until spring?"',
          'Plant. The slow season is when the seed goes in.',
          [
            'Rewrite the tired words on your website while nothing is on fire.',
            'Shoot the photos you never have time to shoot in July.',
            'Ask for the reviews you never asked for while the good jobs are still fresh in people’s minds.',
            'Fix the pin, the hours, the old phone number, the whole boring trellis the busy season grows on.',
          ],
          'Spring rewards whoever planted in January. Ask anyone who farms.',
          'That closes the first run of the column. The next run is built from your questions, so leave one below. The strange ones make the best columns.',
        ],
      },
    ],
    replies: [
      {
        q: 'Can you answer mine?',
        a: 'Yes, that is the whole point. Ask it right here and you will have an answer today. If it is juicy enough to become a column, I will check with you first and change the details.',
      },
      {
        q: 'Is this just a funnel for your services?',
        a: 'The answers are free and complete whether or not you ever hire anyone, me included. I do build websites and phone systems, and if a question touches that I will say so in one line and keep answering. Fair?',
      },
      {
        q: 'My nephew is right though, daily posting does work.',
        a: 'For people whose business IS the posting, absolutely. For a furnace repair shop, two honest posts a week sustained for a year beats a daily sprint that dies in March, and the graveyard of abandoned business pages agrees with me.',
      },
    ],
  },
  {
    id: 'talking-website',
    name: 'The Talking Website',
    eyebrow: 'Set nine · Flagship',
    blurb:
      'Six cards introducing a thing most people have never heard of: a website that speaks, answers the phone, and runs the back office behind it. Mr. Mustard carries every card, the white speech bubble is the signature, and the live number sits on the bottom bar of all six so a screenshot of any single card is still a working ad.',
    cta: 'Call it: (406) 312-1223',
    accent: '#F5B700',
    rules: [
      'No statistics anywhere in this set. It explains a new thing and hands over a number. Nothing here needs defending.',
      'Never type a price in a post or a comment. Prices live in one place in the code and they move. Say "it depends what it has to do" and take it to a call.',
      'The call to action is the number, not a link. On the Page, put the link in the first comment. In other people’s groups, use the number only.',
      'Dial (406) 312-1223 yourself the morning of any campaign. This whole set is a promise that a stranger can talk to it right now.',
      'Order matters: 01 explains it, 02 to 05 make it real, 06 is the dare. Run 06 last or it lands as an ad before anyone knows what they are calling.',
      'Card 07 is a separate door, not part of the 01-06 order. It needs the Blotato comment-to-DM automation turned on before it posts, or the comment sits there with nothing behind it.',
    ],
    cards: [
      {
        file: '01-talks-back',
        headline: 'Your website talks back now.',
        use: 'The explainer. Post 1, and the head of any carousel.',
        alt: 'Mr. Mustard holding a telephone handset under a giant speech bubble reading: your website talks back now.',
      },
      {
        file: '02-after-hours',
        headline: 'It was awake. You were asleep.',
        use: 'The after hours beat. Post 2, the one people tag their spouse in.',
        alt: 'Mr. Mustard lit up inside a dark window at night. Speech bubble reads: it was awake, you were asleep.',
      },
      {
        file: '03-back-office',
        headline: 'It runs the back office too.',
        use: 'The second half of the promise. Post 3, best on the Page rather than in groups.',
        alt: 'Six lit office windows labelled bookings, orders, follow ups, invoices, reviews and the inbox, with Mr. Mustard standing in front.',
      },
      {
        file: '04-all-at-once',
        headline: 'You take one call at a time. It does not.',
        use: 'The scaling card. Post 4, the strongest argument in the set.',
        alt: 'Five speech bubbles asking are you open, how much, Tuesday work, do you deliver, where are you, with Mr. Mustard answering all of them.',
      },
      {
        file: '05-while-you-worked',
        headline: 'Booked it. Invoiced it. Wrote it down.',
        use: 'The proof card. Post 5, pairs with a real story from your week.',
        alt: 'A day sheet headed while you worked, three jobs ticked off with times, beside Mr. Mustard.',
      },
      {
        file: '06-call-it',
        headline: 'Call it and see.',
        use: 'The dare, and the closer. Post 6. Run it last.',
        alt: 'Mr. Mustard on a handset beside a mustard plate reading talk to it now, (406) 312-1223.',
      },
      {
        file: '07-comment-talk',
        headline: "Comment TALK. I'll send you the number.",
        use: 'The DM-automation opener, built on the Blotato comment-to-DM feature. Run it as its own post, not part of the 01-06 carousel.',
        alt: 'Mr. Mustard waving beside a speech bubble reading comment TALK, I will send you the number.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'Have you heard about these yet',
        graphic: '01-talks-back',
        body: [
          'Have you heard about the talking websites yet? Because they are here and most people have no idea.',
          'Not a chat bubble in the corner. An actual voice. Somebody lands on your site at nine at night, asks their question out loud, and gets a real answer. Then it books them in while they are still standing there.',
          'The same brain answers your phone. So the answer a visitor reads on the page is the exact answer a caller hears at midnight, because it is one system instead of two things that disagree with each other.',
          'We built ours first so you can hear it before you decide anything about your own. Call (406) 312-1223 and ask it whatever you want. It is not a recording, it books real appointments, and it does not mind being tested.',
          'Tell me what you would ask it. I will go see how it did.',
        ],
        followUp: {
          label: 'Posting it',
          lines: [
            'Put the link in the FIRST COMMENT, never the post body. Facebook throttles reach on posts that leave the app.',
            'Reply to every comment inside the hour. This post lives or dies on people actually dialling the number, and a reply is what nudges them.',
          ],
        },
      },
      {
        n: 2,
        title: 'The 11:42 call',
        graphic: '02-after-hours',
        body: [
          'Here is the part that got me about building this thing.',
          'A call came in at 11:42 at night. Nobody was awake. It did not go to voicemail, it got answered, the question got a real answer, and the appointment was sitting on the calendar by morning like somebody had worked a night shift.',
          'Think about what that hour actually is. It is somebody lying in bed deciding tomorrow is the day they finally deal with the leak, or the roof, or the thing they have been putting off since March. They pick whoever picks up. If nobody does, they pick the next name.',
          'You cannot answer at 11:42. You should not have to. Something else can, in your voice, with your prices and your calendar, and hand you the morning already sorted.',
          'Try it on ours: (406) 312-1223. Call it late if you want. That is rather the point.',
        ],
      },
      {
        n: 3,
        title: 'The part nobody talks about',
        graphic: '03-back-office',
        body: [
          'Everybody asks about the talking part. The part that actually gives you your week back is behind it.',
          'While it is answering, it is also writing everything down. Bookings on the calendar. Orders taken. Follow ups sent to the people who went quiet. Invoices out. Review requests to the customers who were happy. The inbox handled.',
          'That is the whole back office, and for most small businesses that back office is one exhausted person doing it at the kitchen table after supper. Usually you.',
          'A website that talks is a neat trick. A website that talks and then does the paperwork is a different business entirely.',
          'What is the one job you keep pushing to Sunday night? Say it below. I will tell you honestly whether this handles it or not.',
        ],
      },
      {
        n: 4,
        title: 'One at a time',
        graphic: '04-all-at-once',
        body: [
          'You can take one call at a time. That is not a flaw, it is arithmetic. You have one mouth and two hands and both of them are usually holding something.',
          'Five people can ask this thing five different questions in the same second and all five get a real answer. Nobody waits on hold. Nobody gets the voicemail beep. Nobody goes to the next name on the list.',
          'That is what growing normally costs you: another person, another wage, another set of Mondays spent training somebody who might leave in June. This is the first version of growing I have seen that does not come with that bill attached.',
          'You still do the work. It just stops the work from getting away from you before you can get to it.',
          'Curious what it sounds like when you push it? (406) 312-1223. Try to trip it up, honestly.',
        ],
      },
      {
        n: 5,
        title: 'What it did today',
        graphic: '05-while-you-worked',
        body: [
          'This was a real day. Not a demo.',
          'Booked a Tuesday install at 7:12 in the morning while the crew was still loading the van. Took a reorder and sent the invoice at 11:48. Answered a call at 9:03 at night that would otherwise have been a voicemail somebody listened to two days later.',
          'Nobody touched a phone for any of it. The day showed up already sorted.',
          'That is the thing I could not explain properly until I had lived with it for a month. It is not that it does the work faster than you. It is that the work stops piling up in the first place, so you are not opening the laptop at ten at night to catch up on being reachable.',
          'What would your day look like if the phone stopped being your problem?',
        ],
      },
      {
        n: 6,
        title: 'The dare',
        graphic: '06-call-it',
        body: [
          'I am not going to keep describing it. Just call it.',
          '(406) 312-1223.',
          'Ask it anything you would ask a receptionist. Ask what we do. Ask if we are open. Ask it something rude. Ask it to book you in and watch it actually do it.',
          'It is the same thing we build for other businesses, just wearing our name instead of theirs. Yours would know your prices, your calendar, your service area, and the six questions your customers ask over and over.',
          'Then come back and tell me what it got right and what it fumbled. I mean that. Both answers are useful to me.',
        ],
        followUp: {
          label: 'Run it last',
          lines: [
            'This is the closer. It only works on people who already saw 01 to 05 and know what they are dialling.',
            'Watch the comments for the person who says "it worked" and reply to them first. Their comment is worth more than the post.',
          ],
        },
      },
      {
        n: 7,
        title: 'The one that does not make you dial',
        graphic: '07-comment-talk',
        body: [
          'Not everyone wants to call a number a stranger posted online. Fair. So here is the easier way in.',
          'Comment TALK below and it lands straight in your DMs, the same number, in about ten seconds. No form, no landing page, no email.',
          'Once you have it, do whatever you want. Call it, ignore it, forward it to the person you know who is somehow worse at answering their phone than you are.',
          'Comment TALK. I will see you in your DMs.',
        ],
        followUp: {
          label: 'Before you post this',
          lines: [
            'Set up the Blotato DM automation on this post first: trigger word TALK, on Instagram and Facebook, reply "(406) 312-1223, the same one from the post. Call it whenever you are ready."',
            'Turn on the Comments and Messaging inbox in Blotato so replies land in one place instead of scattered notifications.',
            'This post can run any time, independent of 01 to 06. It is a second door into the same number, not part of that carousel order.',
          ],
        },
      },
    ],
    replies: [
      {
        q: 'Why not just put the number in the post like the other cards?',
        a: 'It is, on every other card in this set. This one is for people who would rather not call a stranger’s number cold. Commenting gets it to them privately, same number, no pressure to dial on the spot.',
      },
      {
        q: 'Is it a robot? I hate those phone trees.',
        a: 'So do I, and it is not one. There is no press one for sales. You talk normally and it talks back normally, and if it cannot help it hands you to a human instead of looping you. Fastest way to settle it is to call it: (406) 312-1223.',
      },
      {
        q: 'My customers would hate talking to AI.',
        a: 'Some will, and it tells them straight away what it is so nobody feels tricked. The comparison that matters is not AI versus you, it is AI versus the voicemail they get at 8pm right now. Most people would rather get an answer.',
      },
      {
        q: 'What does it cost?',
        a: 'Depends what it has to do, and I would rather not guess at you in a comment thread. Message me or call the number and we can work out in ten minutes whether it is even worth it for your setup.',
        warn: 'Never type a price here. Prices live in one place in the code and they move.',
      },
      {
        q: 'Can it actually book appointments or does it just take a message?',
        a: 'It books. It reads the real calendar, offers real openings, and puts the appointment in with a confirmation to both of you. Message taking is the fallback, not the feature.',
      },
      {
        q: 'Does this replace my website?',
        a: 'It is your website, plus a voice, plus the paperwork underneath it. If you already have a site you like we can wire the voice onto it. If your site is eight years old, that is a different and longer conversation.',
      },
    ],
  },
  {
    id: 'talking-website-plumbers',
    name: 'The Talking Website · Plumbers',
    eyebrow: 'Set ten · Vertical cut',
    blurb:
      'The flagship rewritten so every line names a plumber’s actual day: hands under a sink, a ceiling dripping at eleven at night, four calls on the first hard freeze, the paperwork pile at nine PM. Same Say Hello world with water blue as the accent. Postable in groups AND attachable by a rep to an outbound email, one card at a time.',
    cta: 'Call it: (406) 312-1223',
    accent: '#1E50C8',
    rules: [
      'No statistics, and never a price. Same as the flagship set.',
      'Reps attach these to EMAIL or show them on a live call. NEVER a cold text. The A2P registration is opt-in conversational and a cold SMS violates it even once approved.',
      'Never assert anything about their business you have not checked. The copy is about the trade in general, never "your site is broken." A rep line that guesses wrong kills the call in one sentence.',
      'One card per email, never a wall of six.',
      'Run 06 last, and dial (406) 312-1223 yourself before any campaign or send.',
    ],
    cards: [
      {
        file: '01-hands-full',
        headline: 'It answers while your hands are full.',
        use: 'The opener, and the single best card to attach to a first outbound email.',
        alt: 'Mr. Mustard holding a telephone handset under a speech bubble reading: it answers while your hands are full.',
      },
      {
        file: '02-water-does-not-wait',
        headline: 'Water does not wait for office hours.',
        use: 'The after hours beat, and the most plumber-specific card in the set. Best second touch.',
        alt: 'Mr. Mustard lit inside a dark window at night with blue water drips falling into a puddle. Bubble reads: water does not wait for office hours.',
      },
      {
        file: '03-nine-pm-paperwork',
        headline: 'It does the office work too.',
        use: 'The answer to "I already have an answering service."',
        alt: 'Six boards labelled dispatch, estimates, invoices, parts, reviews and follow ups, each with a blue water drop, Mr. Mustard standing in front.',
      },
      {
        file: '04-first-freeze',
        headline: 'Four calls at once. One of you.',
        use: 'The seasonal card. Run it the week of the first hard freeze, and use it on anyone who says they are too busy.',
        alt: 'Five speech bubbles asking water heater is gone, how soon, do you do drains, is there a night fee, do you take cards, with Mr. Mustard answering all of them.',
      },
      {
        file: '05-already-dispatched',
        headline: 'Booked it. Quoted it. Wrote it down.',
        use: 'The proof card. Pair it with a real day from a real customer.',
        alt: 'A day sheet headed while you worked showing a water heater swap booked, a repipe quoted and a burst pipe call taken, beside Mr. Mustard on a handset.',
      },
      {
        file: '06-call-it',
        headline: 'Call it and see.',
        use: 'The dare, and the closer. Run last, and only on people who already know what they are dialling.',
        alt: 'Mr. Mustard on a handset beside a mustard plate reading talk to it now, (406) 312-1223.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'Hands full',
        graphic: '01-hands-full',
        body: [
          'Plumbers, this one is for you.',
          'You are on your back under a sink with a wrench in one hand and a torch in the other, and the phone starts going in your pocket. You cannot answer. Nobody could.',
          'So here is what is new. Your website can answer it for you now. Out loud, in your company name, with your rates and your service area and your actual calendar. It picks up, works out what they need, and books them in while you finish the job you are already being paid for.',
          'Not voicemail. Not a form somebody fills in and you see Thursday. A voice that handles it.',
          'Ours is on the end of (406) 312-1223 if you want to hear one. Ask it whatever a customer would ask you. It does not mind being tested.',
        ],
        followUp: {
          label: 'Using it in outbound',
          lines: [
            'This is the card to attach to a first email. Line that works: "You cannot answer the phone with both hands under a sink. This is the thing we build so you do not have to. There is a live one on (406) 312-1223 if you want to hear it before we talk."',
            'Email or a live call only. Never a cold text.',
          ],
        },
      },
      {
        n: 2,
        title: 'Water does not wait',
        graphic: '02-water-does-not-wait',
        body: [
          'Nothing in plumbing happens at a convenient hour.',
          'Somebody’s ceiling starts dripping at eleven at night. They are standing in the hallway with a bucket, phone in hand, working down the search results. They are not leaving a voicemail. They are calling until somebody picks up.',
          'Whether that somebody was you comes down to one thing, and it is not how good you are at the job.',
          'The thing we build answers at 11:42 the same way it answers at 10 in the morning. Gets the address, works out whether it is an emergency or a Tuesday, quotes the after hours rate if you charge one, and puts it on your calendar. You find out about it over coffee.',
          'You should not have to be awake to be reachable. (406) 312-1223 if you want to hear it work.',
        ],
      },
      {
        n: 3,
        title: 'The nine PM pile',
        graphic: '03-nine-pm-paperwork',
        body: [
          'Everybody asks about the talking part. The part that gives you your evening back is behind it.',
          'While it is answering, it is also doing the office work. Dispatch. Estimates out. Invoices sent. Parts noted. Review requests to the customers who were happy. Follow ups to the ones who went quiet after a quote.',
          'That is the stack most plumbers work through at nine at night at the kitchen table, after a ten hour day, badly, because by then nobody is sharp.',
          'Handled by the time you park the van.',
          'What is the one job you keep pushing to Sunday? Say it below and I will tell you straight whether this handles it or not.',
        ],
      },
      {
        n: 4,
        title: 'First hard freeze',
        graphic: '04-first-freeze',
        body: [
          'You already know the week I mean. First real freeze, and the phone does not stop.',
          'Four people call inside the same ten minutes. Water heater gone. Pipe split in a crawlspace. Somebody asking if you do drains. Somebody asking if there is a night fee. You are one person with one phone, already elbow deep in the first one.',
          'Three of those four go to whoever answers next. Not because you are worse. Because you were busy.',
          'This thing takes all four at the same second. Real answers, real time slots, no hold music. You get a dispatched list instead of a voicemail box and a bad feeling.',
          'That week is coming. It comes every year.',
        ],
      },
      {
        n: 5,
        title: 'Already dispatched',
        graphic: '05-already-dispatched',
        body: [
          'A real day, not a demo.',
          '6:58 in the morning, booked a water heater swap while the van was still being loaded. 12:20, quoted a repipe and sent it before the customer had finished lunch. 10:41 at night, took a burst pipe call that would otherwise have been a voicemail somebody heard on Monday.',
          'Nobody touched a phone for any of it.',
          'That is the part I could not explain properly until I lived with it. It is not that it works faster than you. It is that the work stops piling up, so you are not doing admin at ten at night to catch up on being reachable.',
          'What would your week look like if the phone stopped being your problem?',
        ],
      },
      {
        n: 6,
        title: 'The dare',
        graphic: '06-call-it',
        body: [
          'Enough describing it. Call it.',
          '(406) 312-1223.',
          'Ask it what your customers ask you. Ask if it does drains. Ask what it charges after hours. Ask it to book you in and watch it actually do it.',
          'Yours would answer in your company name, with your rates, your service area, and your calendar. This one just wears ours.',
          'Then tell me what it got right and what it fumbled. Both are useful to me.',
        ],
      },
    ],
    replies: [
      {
        q: 'I already have an answering service.',
        a: 'Fair, and a good one is worth having. The question is what happens after they take the message. Does yours quote, invoice, and chase the review? That is the half that usually lands back on you at nine at night.',
      },
      {
        q: 'My customers are older, they will hate it.',
        a: 'Some will, and it says what it is up front so nobody feels tricked. The comparison that matters is not this versus you, it is this versus the voicemail they get at 8pm right now. Most people would rather get an answer than a beep.',
      },
      {
        q: 'Can it tell an emergency from a normal job?',
        a: 'That is most of the setup work. You tell it what counts as an emergency for you, what you charge after hours, and how far you will drive. It sorts on your rules, not on its own opinion.',
      },
      {
        q: 'What does it cost?',
        a: 'Depends what it has to do, and I would rather not guess at you in a comment. Call the number or message me and we can work out in ten minutes whether it is even worth it for your setup.',
        warn: 'Never type a price here. Prices live in one place in the code and they move.',
      },
      {
        q: 'What happens if it gets something wrong?',
        a: 'You get the transcript of every call, so you can see exactly what it said and correct it. It is closer to training a new dispatcher than buying a machine, except it only needs telling once.',
      },
    ],
  },

  {
    id: 'make-it-shine',
    name: 'The Lit Window',
    eyebrow: 'Set eleven · Our Sites, Lit',
    blurb:
      'The showcase set for other people’s groups: cinematic dusk paintings, each carrying a REAL site we built glowing in an ivory frame. The post sells nothing and shows everything; the link in the first comment forges a free talking-website demo of their business at /demos.',
    cta: 'Free demo · modernmustardseed.com/demos',
    accent: '#F5A623',
    rules: [
      'The demo link goes in the FIRST COMMENT, never the post body. The URL on the card art keeps lifted screenshots working.',
      'Say "the demo is free." Never say "free trial." The demo is the free thing; going live is paid from day one.',
      'No prices on cards, in posts, or in comments. The money question gets the canned reply, not a number.',
      'The six cards mix client builds, our own brands, and forge showcases. Never claim a specific card is a paying client; if someone asks, answer honestly and move on.',
      'When someone loves one card, reply with that build’s live link. They are all in the /websites reel.',
      'Do not run this in the same group in the same week as the Say Hello set. Same product, and back to back it reads as a campaign.',
    ],
    cards: [
      {
        file: '01-wildmere',
        headline: 'A honey company’s site that pours like golden hour.',
        use: 'The opener. Lead image of the showcase carousel.',
        alt: 'A dusk painting of a glowing roadside honey stand, with the real Wildmere Honey Co. website framed in the light. Headline: a honey company’s site that pours like golden hour.',
      },
      {
        file: '02-cross-covenant',
        headline: 'A faith apparel house with a real storefront.',
        use: 'The storefront card. Strong with boutique and maker crowds.',
        alt: 'A dusk painting of a boutique under a striped awning, with the real Cross + Covenant shop page framed in the light. Headline: a faith apparel house with a real storefront.',
      },
      {
        file: '03-hall-roofing',
        headline: 'A roofing site that answers the phone at midnight.',
        use: 'The trades card. Lead with this in contractor groups.',
        alt: 'A dusk painting of a house with a fresh shingle roof and a ladder, with the real Hall Roofing website framed in the light. Headline: a roofing site that answers the phone at midnight.',
      },
      {
        file: '04-chinatown',
        headline: 'A restaurant site that takes calls through dinner rush.',
        use: 'The best palette match in the set, and the most shareable.',
        alt: 'A dusk painting of a small restaurant under glowing red lanterns, with a real restaurant website framed in the light. Headline: a restaurant site that takes calls through dinner rush.',
      },
      {
        file: '05-wild-hope',
        headline: 'A mountain stay you can smell the pines through.',
        use: 'The hospitality card.',
        alt: 'A dusk painting of a timber lodge in the mountains, with the real Wild Hope retreat website framed in the light. Headline: a mountain stay you can smell the pines through.',
      },
      {
        file: '06-dd-landscaping',
        headline: 'A landscaping site as sharp as the Saturday lawns.',
        use: 'The closer. Pairs with the invite in the first comment.',
        alt: 'A dusk painting of a glowing greenhouse strung with lights, with the real D&D Landscaping website framed in the light. Headline: a landscaping site as sharp as the Saturday lawns.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The showcase drop',
        graphic: '01-wildmere',
        body: [
          'Six businesses. Six websites we built. No two remotely alike, because no two businesses are.',
          'A honey company that pours like golden hour. A faith apparel storefront. A roofer. A restaurant. A mountain retreat. A landscaper. Scroll them and notice that none of them could wear another one’s site, and that is exactly the point.',
          'One more thing about these: they talk. Ask one a question and it answers out loud, takes the call, books the job, even at midnight. We call it a talking website.',
          'If you are wondering what YOUR business would look like with the lights on, we build free demos. The link is in the first comment. No card, no sales call. Most owners just stare at theirs for a while, and honestly, that is the fun part.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'modernmustardseed.com/demos',
            'Sixty seconds of questions, then it builds a real working demo of your business. Free, no card. If the day’s forge queue is full, tomorrow morning works too, it will still be free.',
          ],
        },
      },
      {
        n: 2,
        title: 'The trades post',
        graphic: '03-hall-roofing',
        body: [
          'This is a roofing company’s website. It answers the phone at midnight.',
          'Not a chat bubble. The site and the phone run on one brain, so the answer a homeowner reads on the page is the same answer they hear when they call during a hailstorm at 11 PM, while every other roofer in town is asleep.',
          'The site itself was built from scratch for this company. Their words, their towns, their photos. No template involved, which is why it does not look like the last roofing site you saw.',
          'We build free demos of these for any trade. Link in the first comment, and it costs nothing to look at yours.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: ['modernmustardseed.com/demos'],
        },
      },
      {
        n: 3,
        title: 'One of one',
        graphic: '04-chinatown',
        body: [
          'The thing nobody believes until they scroll these: none of them are templates.',
          'The restaurant site glows like its lanterns. The honey site pours like August. The roofer’s site feels like a handshake. Same studio, same week even, and you would never guess they came from the same place, because each one was built FROM the business, not fitted onto it.',
          'A landscaper and a med spa do not get the same site with the colors swapped. They get different rooms, different words, different answers on the phone.',
          'If you want to see what a one-of-one of YOUR business looks like, the link is in the first comment. The demo is free, and it stays free.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: ['modernmustardseed.com/demos'],
        },
      },
      {
        n: 4,
        title: 'The invite',
        graphic: '06-dd-landscaping',
        body: [
          'People pick the business that looks alive. The lights are how they know.',
          'Every site in this series was built on that one idea. A business that looks awake, answers when spoken to, and wears its own name like it is proud of it.',
          'If yours has been running on a tired website, or none at all, we will build you a free demo of what it could be. Your trade, your town, your voice, answering out loud.',
          'Link in the first comment. Two minutes, no card. Worst case, you spend those two minutes admiring what could be.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'modernmustardseed.com/demos',
            'No card, no call. The demo stays yours to look at either way.',
          ],
        },
      },
    ],
    replies: [
      {
        q: 'How much does it cost?',
        a: 'The demo is free, no card, and it stays yours to look at either way. If you love it and want it live, the real numbers are on our site and we walk through everything on a short call. I do not quote in comment threads, it never comes out fair to anybody.',
        warn: 'NEVER type a price here. Demo-order pricing derives from lib/demo-order.ts and lives on the site. A number in a comment thread goes stale and gets screenshotted.',
      },
      {
        q: 'Are those real businesses?',
        a: 'The honest answer: it is a mix. Some are client builds, some are our own brands, and some are showcase builds straight off our forge. Every pixel is ours either way, so judge the work itself, and if you want to poke around any of them live, say which one and I will drop the link.',
      },
      {
        q: 'Can you do my trade?',
        a: 'The demo answers that better than I can. It reads your actual business, your services, your town, even your current website if you have one, and shows you instead of telling you. Free, so the risk of finding out is zero.',
      },
      {
        q: 'I want mine to look like the honey one.',
        a: 'That is the one thing I will not do. The honey site looks like that because honey looks like that. Yours will be built from YOUR business, and that is why it will beat a borrowed design every time.',
      },
      {
        q: 'I tried the link and it did not build.',
        a: 'The forge builds a limited number each day so every demo gets full attention. Come back tomorrow morning, it will still be free. If it still misbehaves, message me and I will run yours personally.',
      },
    ],
  },
  {
    id: 'main-street-twenty',
    name: 'The Main Street Twenty',
    eyebrow: 'Set twelve · The Trade Posters',
    blurb:
      'Twenty trade posters in the old WPA national park register, one for every trade that keeps Main Street running. No stats, no pitch: the poster is the whole post, and the giveaway is the funnel. Whoever runs the trade comments, gets the full resolution file free, and the delivery message opens a one to one conversation with exactly the people we build for.',
    cta: 'Free poster · comment your trade',
    accent: '#9C4A2B',
    rules: [
      'No stats and no pitch in the post body, ever. The honor line is the whole message; the giveaway does the selling.',
      'The giveaway is the engine. Anyone who runs the trade comments and gets the full resolution file free, by DM or email. Deliver the poster FIRST, then one soft line. Never open with a link.',
      'In other people’s groups, post only that group’s trade: the plumber poster in the plumber group, the rancher in the ag group. The full series runs on our own Page, one per weekday.',
      'Outbound reps may attach a lead’s own trade poster to a first touch EMAIL or offer it on a live call. Never a cold text, and never assert anything about their business we have not checked.',
      'Asked if it is AI art, the answer is yes, art directed here at the studio. Never claim hand painted, never dodge.',
      'A trade that is not in the twenty is a custom poster made on request, same day. That comment is the warmest lead in the thread.',
      'A shop name set into the poster is a five minute re-render and free. Offer it when someone loves theirs.',
      'The money question gets the canned reply, never a number. Poster talk stays free talk.',
    ],
    cards: [
      {
        file: '01-plumber',
        headline: 'The Plumber. Shows up when the ceiling is already raining.',
        use: 'Series opener on our own Page, and the drop for plumbing groups.',
        alt: 'A WPA style screenprint poster of a plumber working under a farmhouse sink. Headline: The Plumber. Shows up when the ceiling is already raining.',
      },
      {
        file: '02-electrician',
        headline: 'The Electrician. Keeps the lights on for everyone else’s big night.',
        use: 'Electrician and contractor groups.',
        alt: 'A WPA style poster of a line electrician on a utility pole at sunrise. Headline: The Electrician. Keeps the lights on for everyone else’s big night.',
      },
      {
        file: '03-roofer',
        headline: 'The Roofer. Stands between your family and the sky.',
        use: 'Roofing and storm season threads. Strong after weather events, never during one.',
        alt: 'A WPA style poster of a roofer astride a ridge line under a giant sun. Headline: The Roofer. Stands between your family and the sky.',
      },
      {
        file: '04-hvac',
        headline: 'The HVAC Tech. First call on the coldest morning of the year.',
        use: 'HVAC groups. Best in the first cold snap week.',
        alt: 'A WPA style poster of an HVAC technician carrying a condenser unit up stairs in the snow. Headline: The HVAC Tech. First call on the coldest morning of the year.',
      },
      {
        file: '05-landscaper',
        headline: 'The Landscaper. Plants things strangers slow down to look at.',
        use: 'Landscaping and lawn care groups. Spring gold.',
        alt: 'A WPA style poster of a landscaper planting a young tree on a terraced lawn. Headline: The Landscaper. Plants things strangers slow down to look at.',
      },
      {
        file: '06-painter',
        headline: 'The Painter. Cuts a line straight enough to trust by eye.',
        use: 'Painting contractor groups.',
        alt: 'A WPA style poster of a house painter on a ladder cutting a crisp band of color on a Victorian house. Headline: The Painter. Cuts a line straight enough to trust by eye.',
      },
      {
        file: '07-carpenter',
        headline: 'The Carpenter. Measures twice so it stands for fifty years.',
        use: 'Woodworking and builder groups.',
        alt: 'A WPA style poster of a carpenter planing a beam before a rising timber frame. Headline: The Carpenter. Measures twice so it stands for fifty years.',
      },
      {
        file: '08-mechanic',
        headline: 'The Mechanic. Hears what your car has been trying to say.',
        use: 'Auto shop groups, and the waiting room wall angle.',
        alt: 'A WPA style poster of a mechanic under a pickup raised on a lift in lamplight. Headline: The Mechanic. Hears what your car has been trying to say.',
      },
      {
        file: '09-barber',
        headline: 'The Barber. Sends everyone out taller than they came in.',
        use: 'The tag post. Barbers get tagged by their whole chair list.',
        alt: 'A WPA style poster of a barber mid snip behind a classic chair. Headline: The Barber. Sends everyone out taller than they came in.',
      },
      {
        file: '10-baker',
        headline: 'The Baker. Up at four so the town smells like morning.',
        use: 'The warmest card in the set. Community groups love this one.',
        alt: 'A WPA style poster of a baker pulling loaves from a glowing brick oven before dawn. Headline: The Baker. Up at four so the town smells like morning.',
      },
      {
        file: '11-florist',
        headline: 'The Florist. On call for the best day and the worst day.',
        use: 'Community groups. Strongest single honor line in the series.',
        alt: 'A WPA style poster of a florist gathering an armful of blooms at a workbench. Headline: The Florist. On call for the best day and the worst day.',
      },
      {
        file: '12-cafe',
        headline: 'The Coffee House. Knows the order before the door swings shut.',
        use: 'Local community groups, morning posting slot.',
        alt: 'A WPA style poster of a barista at a lever espresso machine in morning light. Headline: The Coffee House. Knows the order before the door swings shut.',
      },
      {
        file: '13-welder',
        headline: 'The Welder. Joins what the world calls broken for good.',
        use: 'Fabrication and farm groups. The most striking plate in the set.',
        alt: 'A WPA style poster of a welder kneeling in a fan of golden sparks. Headline: The Welder. Joins what the world calls broken for good.',
      },
      {
        file: '14-cleaner',
        headline: 'The Cleaner. The reason walking in feels like a deep breath.',
        use: 'Cleaning business groups. A trade that almost never gets honored, so this one lands hard.',
        alt: 'A WPA style poster of a house cleaner opening tall curtains onto a shaft of sunlight. Headline: The Cleaner. The reason walking in feels like a deep breath.',
      },
      {
        file: '15-mover',
        headline: 'The Mover. Carries a whole life like it belongs to them.',
        use: 'Moving company groups, and new to town threads.',
        alt: 'A WPA style poster of two movers carrying a sofa up a brownstone stoop. Headline: The Mover. Carries a whole life like it belongs to them.',
      },
      {
        file: '16-excavator',
        headline: 'The Excavator. Reads the ground before anything can rise.',
        use: 'Excavation and construction groups. Strong in Montana.',
        alt: 'A WPA style poster of an excavator carving a bench of earth below mountains. Headline: The Excavator. Reads the ground before anything can rise.',
      },
      {
        file: '17-plow',
        headline: 'The Plow Driver. Out at three so the town opens at eight.',
        use: 'The Montana card. Local groups in the first big snow week.',
        alt: 'A WPA style poster of a snow plow throwing a wave of snow down a main street before dawn. Headline: The Plow Driver. Out at three so the town opens at eight.',
      },
      {
        file: '18-rancher',
        headline: 'The Rancher. Feeds first and eats last, every morning.',
        use: 'Ag and ranch groups. The other Montana card.',
        alt: 'A WPA style poster of a rancher on horseback pushing cattle through a frosted meadow at first light. Headline: The Rancher. Feeds first and eats last, every morning.',
      },
      {
        file: '19-cook',
        headline: 'The Line Cook. Feeds the rush without leaving the fire.',
        use: 'Restaurant and service industry groups, posted after the lunch rush.',
        alt: 'A WPA style poster of a short order cook at a glowing flat top seen through a diner pass window. Headline: The Line Cook. Feeds the rush without leaving the fire.',
      },
      {
        file: '20-handyman',
        headline: 'The Handyman. The number half the town keeps on the fridge.',
        use: 'The series closer on our own Page.',
        alt: 'A WPA style poster of a handyman on a step ladder fixing a porch light at dusk. Headline: The Handyman. The number half the town keeps on the fridge.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The series launch',
        graphic: '01-plumber',
        body: [
          'We spend our days building for the people who keep this town running. This month we are saying thank you the loudest way we know how.',
          'The Main Street Twenty: twenty posters, one for every trade we could fit, drawn in the register of the old national park posters, because that is the register these jobs deserve.',
          'One goes up every weekday for the next month. If you run the trade on the day’s poster, comment below and the full resolution file is yours, free. Print it, frame it, hang it where the customers wait.',
          'No. 01 is the plumber. Shows up when the ceiling is already raining.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'Nothing for sale in this thread. And if you want your shop’s name set into your poster, say so. Also free.',
          ],
        },
      },
      {
        n: 2,
        title: 'The giveaway',
        graphic: '10-baker',
        body: [
          'Comment the trade you run and your poster is yours. Full resolution, free, print it as big as you like.',
          'We made twenty of these for the people who keep Main Street running. Plumbers, bakers, barbers, ranchers, plow drivers, the whole crew that has the town’s number on the fridge.',
          'Your trade not in the twenty? Tell me what you do and we will draw yours. That is a promise, not a maybe.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'To be clear: free means free. No list to join, nothing to buy. We build things for small businesses all day and this month we felt like giving something back.',
          ],
        },
      },
      {
        n: 3,
        title: 'The single trade drop',
        graphic: '03-roofer',
        body: [
          'This one is for the roofers.',
          'No. 03 in a series of twenty we are making for the trades. The honor line reads: stands between your family and the sky. Because that is the actual job description, even if the invoice says shingles.',
          'If you roof for a living, comment and the full resolution file is yours, free. It prints clean at poster size.',
        ],
        followUp: {
          label: 'Swap the trade to match the group',
          lines: [
            'Post the plumber card in plumbing groups, the welder in fab groups, and so on. One trade per group, always their own.',
          ],
        },
      },
      {
        n: 4,
        title: 'The tag post',
        graphic: '09-barber',
        body: [
          'Tag a barber who deserves a spot on the wall.',
          'No. 09 of the Main Street Twenty: sends everyone out taller than they came in. Every town has one chair that is really a counseling office with clippers, and that person deserves a poster.',
          'Tag them or drop the shop name below and we will send the full resolution file over, free.',
        ],
        followUp: {
          label: 'Reply rule',
          lines: [
            'Reply to every single tag with the poster offer. The tagged barber reading a thread full of their own customers is the whole play.',
          ],
        },
      },
      {
        n: 5,
        title: 'The Montana card',
        graphic: '17-plow',
        body: [
          'Out at three so the town opens at eight.',
          'No. 17 of the Main Street Twenty is for the plow drivers, and if you have lived one Flathead winter you know why they got their own poster.',
          'If you or your crew run a plow, comment below. The full resolution file is free and it prints big enough for the shop door.',
        ],
        followUp: {
          label: 'Seasonal note',
          lines: [
            'Hold this one for the first real snow week, then post it in the local groups while everyone is grateful. Pair with 18-rancher for ag groups any time of year.',
          ],
        },
      },
      {
        n: 6,
        title: 'The shop wall',
        graphic: '08-mechanic',
        body: [
          'Waiting rooms deserve better walls.',
          'No. 08 of the Main Street Twenty, for the mechanics: hears what your car has been trying to say. It was drawn to be printed, framed, and hung right where your customers sit.',
          'Run a shop? Comment and the file is yours, free, full resolution. Send a photo of it on the wall and we will feature your shop when we wrap the series.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'The wall photo invite is real. Collect every one that comes back, they become the series wrap post and each shop gets named in it.',
          ],
        },
      },
      {
        n: 7,
        title: 'The why',
        graphic: '20-handyman',
        body: [
          'A few people asked why a website studio spent a month drawing trade posters and giving them away.',
          'Because this is who we build for. The plumber with the flooded ceiling schedule, the baker who was up at four, the handyman whose number is on half the fridges in town. We think their work is beautiful, and we wanted it on record.',
          'No. 20 closes the series. If you missed your trade, every poster is still free, comment or message and we will send yours.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'All twenty, still free, still full resolution. And thank you. This series brought more good conversations than anything we have ever posted.',
          ],
        },
      },
    ],
    replies: [
      {
        q: 'Can I really have the file for free?',
        a: 'Yes, truly free. Full resolution, no list to join, nothing to buy. Tell me your trade and where to send it, or I will DM it right here. Print it as big as you like.',
      },
      {
        q: 'Can you put my business name on it?',
        a: 'Yes, and it looks great. Give me the exact name as you want it to read and I will set it into the poster and send the file back, free. Allow a day.',
        warn: 'This is a five minute re-render, deliver same day when possible. The personalized poster is the single warmest touch in the campaign.',
      },
      {
        q: 'My trade is not one of the twenty.',
        a: 'Then we owe you a poster. Tell me what you do and how you would describe the job to a kid, and we will draw yours and send it over, free.',
        warn: 'Make the poster. Custom requests are the warmest leads this set produces, and a kept promise here is worth ten posts.',
      },
      {
        q: 'Is this AI art?',
        a: 'It is, art directed line by line here at the studio: the style, the palette, the scenes, the words. We use the same care on this we use on everything we build. Happy to talk shop about the process any time.',
        warn: 'Never claim hand painted, never dodge the question. Honesty is the brand.',
      },
      {
        q: 'What does your company actually do?',
        a: 'We build websites that answer the phone. A site that talks, takes the call, and books the job, even at midnight. The posters are just our thank you to the people we build for. If you are curious what one looks like for a business like yours, ask and I will send a link to a free demo.',
        warn: 'Only send the /demos link when they ask what we do. Never post it into a poster thread unprompted.',
      },
      {
        q: 'How much is a website?',
        a: 'Depends what it has to do, honestly, and I do not quote in comment threads because it never comes out fair to anybody. The demo is free and shows you exactly what yours would be. The poster stays free either way.',
        warn: 'NEVER type a price. Pricing derives from lib/demo-order.ts and lives on the site.',
      },
    ],
  },
  {
    id: 'mustard-seed-twenty',
    name: 'The Mustard Seed Twenty',
    eyebrow: 'Set thirteen · The Kingdom Trades',
    blurb:
      'The faith sister set to The Main Street Twenty, and the reason the company has its name. Twenty WPA style posters of the trades the Kingdom was told through: the sower, the shepherd, the baker with her leaven, Lydia the dyer, the watchman of Psalm 130. Each card carries an honor line in our own words plus the scripture reference it comes from, and No. 20 is the mustard seed itself (Matthew 13:31). Same giveaway engine, plus a church escalator: a pastor who comments gets the whole set for the fellowship hall, free.',
    cta: 'Free poster · comment and it is yours',
    accent: '#3B6B8A',
    rules: [
      'This set wears the faith openly and the company name is the punchline: No. 20 is Matthew 13:31. Post it where faith content is welcome (church groups, faith and business groups, community groups that allow it). NEVER into a secular trade group; that is what set twelve is for.',
      'No stats and no pitch. The honor line plus the scripture reference is the whole message.',
      'The honor lines are OUR words, never quotations. The reference points to the passage the picture comes from. Asked for the verse, quote the passage accurately or link it. Never pass our line off as scripture.',
      'Same giveaway engine as set twelve: whoever runs the trade or the ministry comments and gets the full resolution file free. Poster FIRST, then one soft line. Never open with a link.',
      'The church escalator: a pastor or ministry leader who comments gets the WHOLE set free for the fellowship hall, church name set into the posters, also free. Deliver all twenty, not just the one.',
      'Outbound: never attach a faith poster to cold outreach. Only when their faith is public (their site or page says it) or they brought it up first. Email or live call only, never a cold text.',
      'No depiction of Jesus in any plate, ever. If a regeneration draws one, regenerate again rather than ship it.',
      'Never argue doctrine in a thread. The poster is a gift, not a debate. Disagreement gets grace and no further replies.',
      'Asked if it is AI art, the answer is yes, art directed here at the studio. This audience deserves the straightest answer of all.',
      'The money question gets the canned reply, never a number. Poster talk stays free talk.',
    ],
    cards: [
      {
        file: '01-sower',
        headline: 'The Sower. Scatters like the seed will never run out.',
        use: 'Series opener on our own Page, carries the name story. Matthew 13:3.',
        alt: 'A WPA style screenprint poster of a farmer broadcasting seed across a plowed hillside at sunrise. Headline: The Sower. Scatters like the seed will never run out. Reference Matthew 13:3.',
      },
      {
        file: '02-shepherd',
        headline: 'The Shepherd. Counts to ninety-nine and heads back out.',
        use: 'The church hall post, and pastor appreciation month in October. Luke 15:4.',
        alt: 'A WPA style poster of a shepherd with a lantern climbing a snowy hillside at night toward one lost sheep. Headline: The Shepherd. Counts to ninety-nine and heads back out. Reference Luke 15:4.',
      },
      {
        file: '03-fisherman',
        headline: 'The Fisherman. The first ones called were mid-shift at this job.',
        use: 'Faith and business groups, men’s ministry threads. Matthew 4:19.',
        alt: 'A WPA style poster of a fisherman casting a circular net from a wooden boat against a giant rising sun. Headline: The Fisherman. The first ones called were mid-shift at this job. Reference Matthew 4:19.',
      },
      {
        file: '04-vinedresser',
        headline: 'The Vinedresser. Prunes what he loves so it bears more.',
        use: 'The card for a hard season. Small groups and discipleship threads. John 15:2.',
        alt: 'A WPA style poster of a vinedresser pruning a heavy grapevine row on terraced hills. Headline: The Vinedresser. Prunes what he loves so it bears more. Reference John 15:2.',
      },
      {
        file: '05-builder',
        headline: 'The Builder. Digs past the sand until the footing is rock.',
        use: 'The single trade drop for builder and contractor believers. Luke 6:48.',
        alt: 'A WPA style poster of a builder laying a cornerstone onto bedrock in a deep foundation trench. Headline: The Builder. Digs past the sand until the footing is rock. Reference Luke 6:48.',
      },
      {
        file: '06-baker',
        headline: 'The Baker. Works the leaven through all three measures.',
        use: 'The giveaway post graphic. Her story in the text, Matthew 13:33.',
        alt: 'A WPA style poster of a woman baker kneading dough before dawn with three flour sacks beside her. Headline: The Baker. Works the leaven through all three measures. Reference Matthew 13:33.',
      },
      {
        file: '07-carpenter',
        headline: 'The Carpenter. The trade heaven chose for thirty quiet years.',
        use: 'The strongest single line in the set. Own Page, and woodworker believers. Mark 6:3.',
        alt: 'A WPA style poster of a carpenter planing a beam in a workshop with a dove on the windowsill. Headline: The Carpenter. The trade heaven chose for thirty quiet years. Reference Mark 6:3.',
      },
      {
        file: '08-potter',
        headline: 'The Potter. Makes it again instead of throwing it away.',
        use: 'Recovery ministries and fresh start threads. Jeremiah 18:4.',
        alt: 'A WPA style poster of a potter re-centering a slumped vessel at a kick wheel. Headline: The Potter. Makes it again instead of throwing it away. Reference Jeremiah 18:4.',
      },
      {
        file: '09-gardener',
        headline: 'The Gardener. On the third morning, the Lord was taken for one.',
        use: 'THE Easter card. Hold for Holy Week when the calendar is close. John 20:15.',
        alt: 'A WPA style poster of a woman gardener kneeling in dew-heavy rows as sunrise breaks over a stone wall. Headline: The Gardener. On the third morning, the Lord was taken for one. Reference John 20:15.',
      },
      {
        file: '10-harvester',
        headline: 'The Harvester. Says the harvest is plenty. Prays for hands.',
        use: 'Harvest season and missions emphasis weeks. Matthew 9:37.',
        alt: 'A WPA style poster of a woman harvester binding wheat sheaves in a vast golden field. Headline: The Harvester. Says the harvest is plenty. Prays for hands. Reference Matthew 9:37.',
      },
      {
        file: '11-lamplighter',
        headline: 'The Lamplighter. Sets the lamp on the stand, never under it.',
        use: 'Encouragement threads, graduation season. Matthew 5:15.',
        alt: 'A WPA style poster of a lamplighter on a ladder lighting a street lamp at dusk on a small town street. Headline: The Lamplighter. Sets the lamp on the stand, never under it. Reference Matthew 5:15.',
      },
      {
        file: '12-pearl-merchant',
        headline: 'The Pearl Merchant. Sold the whole inventory for the one.',
        use: 'Faith and business groups. The all-in card. Matthew 13:46.',
        alt: 'A WPA style poster of a merchant holding one enormous pearl up to the lamplight over emptied cases. Headline: The Pearl Merchant. Sold the whole inventory for the one. Reference Matthew 13:46.',
      },
      {
        file: '13-treasure-finder',
        headline: 'The Treasure Finder. Sells everything for one field and calls it joy.',
        use: 'The joy card. Own Page weekends. Matthew 13:44.',
        alt: 'A WPA style poster of a joyful man opening a buried strongbox glowing with golden light in a plowed field. Headline: The Treasure Finder. Sells everything for one field and calls it joy. Reference Matthew 13:44.',
      },
      {
        file: '14-net-mender',
        headline: 'The Net Mender. Was mending nets when the call came.',
        use: 'The ordinary faithfulness card. Fishermen and quiet servers. Mark 1:19.',
        alt: 'A WPA style poster of two fishermen mending an enormous draped net on a dock at morning. Headline: The Net Mender. Was mending nets when the call came. Reference Mark 1:19.',
      },
      {
        file: '15-tentmaker',
        headline: 'The Tentmaker. Paid for the letters with needle and canvas.',
        use: 'Bi-vocational pastors and side business believers. They will feel seen. Acts 18:3.',
        alt: 'A WPA style poster of a tentmaker stitching heavy canvas by lamplight with bolts of cloth stacked around. Headline: The Tentmaker. Paid for the letters with needle and canvas. Reference Acts 18:3.',
      },
      {
        file: '16-dyer',
        headline: 'The Dyer. Sold purple. Then hosted the first church in Europe.',
        use: 'The women of the trades post. Lydia, Acts 16:14. The one card allowed to break the palette with purple.',
        alt: 'A WPA style poster of a woman dyer lifting deep purple cloth from a stone vat with purple lengths drying overhead. Headline: The Dyer. Sold purple. Then hosted the first church in Europe. Reference Acts 16:14.',
      },
      {
        file: '17-seamstress',
        headline: 'The Seamstress. Every widow in town kept what she made them.',
        use: 'Dorcas, Acts 9:39. Quilting circles, sewing ministries, craft groups.',
        alt: 'A WPA style poster of a woman seamstress at a treadle machine surrounded by finished coats on hooks. Headline: The Seamstress. Every widow in town kept what she made them. Reference Acts 9:39.',
      },
      {
        file: '18-watchman',
        headline: 'The Watchman. The Psalms measure waiting by this shift.',
        use: 'The night shift post, and the Advent card. Psalm 130:6.',
        alt: 'A WPA style poster of a watchman with a lantern on a city wall as the first band of dawn breaks the horizon. Headline: The Watchman. The Psalms measure waiting by this shift. Reference Psalm 130:6.',
      },
      {
        file: '19-physician',
        headline: 'The Physician. Comes when called. The letters say beloved.',
        use: 'Nurses week, healthcare believers. Colossians 4:14.',
        alt: 'A WPA style poster of a woman physician with a leather satchel climbing farmhouse porch steps in night rain toward a lit doorway. Headline: The Physician. Comes when called. The letters say beloved. Reference Colossians 4:14.',
      },
      {
        file: '20-mustard-seed',
        headline: 'The Mustard Seed. Smallest seed in the drawer. Ask the birds.',
        use: 'The series closer and the company name card. The why post. Matthew 13:32.',
        alt: 'A WPA style poster of an enormous mustard tree filled with nesting birds, a tiny sower at its roots, a giant sun behind the crown. Headline: The Mustard Seed. Smallest seed in the drawer. Ask the birds. Reference Matthew 13:32.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The name post',
        graphic: '01-sower',
        body: [
          'Our studio is named after the smallest seed in the market. Matthew 13:31, look it up, it is a great story to be named after.',
          'So this month we drew the twenty trades the Kingdom was told through. The sower, the shepherd, the baker with her leaven, the potter, the watchman on the wall. Jesus explained the biggest thing there is using the jobs people were already doing, and we think that says something beautiful about work.',
          'One goes up every weekday for the next month. If one of these trades is yours, comment and the full resolution file is free. Print it, frame it, hang it in the shop, the office, the fellowship hall.',
          'No. 01 is the sower. Scatters like the seed will never run out.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'Nothing for sale in this thread. The honor lines are our own words, the reference on each poster points to the passage the picture comes from. And if you want your name or your church set into one, say so. Free.',
          ],
        },
      },
      {
        n: 2,
        title: 'The giveaway',
        graphic: '06-baker',
        body: [
          'Comment your trade or your ministry and the poster is yours. Full resolution, free, print it as big as you like.',
          'Twenty posters for the trades the Kingdom was told through. And a detail we love: scripture put women in these trades from the start. The baker working leaven through three measures is her story, so are the dyer, the seamstress, and more. Six of the twenty are women because the text got there first.',
          'Your trade not in the twenty? Tell me what you do and we will draw yours. That is a promise, not a maybe.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'Free means free. No list to join, nothing to buy. We are named after Matthew 13:31 and this series is us saying the name out loud.',
          ],
        },
      },
      {
        n: 3,
        title: 'The church hall',
        graphic: '02-shepherd',
        body: [
          'Pastors, this one is for your hallway.',
          'No. 02 of the Mustard Seed Twenty is the shepherd. Counts to ninety-nine and heads back out. If any wall in your building deserves that reminder, comment and the ENTIRE set of twenty is yours, free, full resolution, your church name set into the posters if you want it.',
          'Fellowship halls, kids wings, church offices, coffee stations. They were drawn to be printed and hung.',
        ],
        followUp: {
          label: 'Reply rule',
          lines: [
            'Every pastor or ministry leader who comments gets the whole set delivered, not just the one. That delivery message may carry exactly one line about what we do, after the files, never before.',
          ],
        },
      },
      {
        n: 4,
        title: 'The women of the trades',
        graphic: '16-dyer',
        body: [
          'Lydia sold purple cloth. Then the first church in Europe met in her house.',
          'No. 16 of the Mustard Seed Twenty is the dyer, and she is one of six women in the series because scripture put women in business long before anyone made a poster about it. The seamstress whose widows kept every coat. The baker with her three measures of flour.',
          'Tag a woman who runs her trade in faith, or comment yours. The full resolution file is free, and we will set her name into it if she wants.',
        ],
        followUp: {
          label: 'Reply rule',
          lines: [
            'Reply to every tag with the poster offer, and deliver with her name set in when she says yes. The thread of women naming women is the whole post.',
          ],
        },
      },
      {
        n: 5,
        title: 'The single trade drop',
        graphic: '05-builder',
        body: [
          'This one is for the builders.',
          'No. 05 of the Mustard Seed Twenty. The honor line reads: digs past the sand until the footing is rock. Luke 6:48 is the reference, and if you have ever poured a footing you already know the sermon.',
          'If building is your trade, comment and the full resolution file is yours, free. It prints clean at frame size.',
        ],
        followUp: {
          label: 'Swap the trade to match the group',
          lines: [
            'The fisherman for coastal and lake town groups, the potter for makers, the physician for healthcare believers. One trade per group, always theirs, and only in groups where faith content is welcome.',
          ],
        },
      },
      {
        n: 6,
        title: 'The night shift',
        graphic: '18-watchman',
        body: [
          'For everyone awake at four in the morning so the rest of us are not.',
          'No. 18 of the Mustard Seed Twenty is the watchman. The Psalms measure waiting by this shift (Psalm 130:6, look at it). Nurses, dispatchers, plow drivers, dairy farmers, security, new parents, this card is yours too.',
          'Comment and the file is free, full resolution.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'If you know someone on nights this week, tag them. The 4am crowd sees these posts at 4am, and that is exactly who it is for.',
          ],
        },
      },
      {
        n: 7,
        title: 'The why',
        graphic: '20-mustard-seed',
        body: [
          'No. 20 closes the series, and it is the reason the company has its name.',
          'The mustard seed. Smallest seed in the drawer, and the Kingdom gets compared to it anyway: plant it and it outgrows the whole garden, until the birds nest in its branches. We started this studio small on purpose and named it after the promise that small, planted faithfully, does not stay small.',
          'Every poster in the series is still free, forever. Comment or message with your trade, your church, your ministry, and we will send yours.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'Thank you for the best month of conversations this page has ever had. All twenty stay free. Matthew 13:31 and 32 if you want the story we are named after.',
          ],
        },
      },
    ],
    replies: [
      {
        q: 'Can I really have this free?',
        a: 'Yes, truly free. Full resolution, no list to join, nothing to buy. Tell me your trade or your ministry and where to send it, or I will DM it right here.',
      },
      {
        q: 'Can our church print these?',
        a: 'Yes, all twenty if you like, and we will set your church name into them, also free. Fellowship halls are exactly what they were drawn for. Tell me the name as you want it to read.',
        warn: 'Deliver the whole set to churches, not just one card. The church hallway is twenty impressions a Sunday for years.',
      },
      {
        q: 'Is that a real verse?',
        a: 'The reference is real and worth reading in full. The line on the poster is our own wording, not a quotation, so the poster never puts words in scripture’s mouth.',
        warn: 'If they want the text, quote the passage accurately or link it. Never pass our line off as scripture.',
      },
      {
        q: 'My trade is not one of the twenty.',
        a: 'Then we owe you a poster. Tell me what you do and we will draw yours and send it over, free.',
        warn: 'Make the poster, same day when possible. Custom requests are the warmest leads this set produces.',
      },
      {
        q: 'Is this AI art?',
        a: 'It is, art directed line by line here at the studio: the style, the palette, the scenes, the words. We use the same care on this we use on everything we build, and happy to talk about the process any time.',
        warn: 'This audience deserves the straightest answer of all. Never claim hand painted, never dodge.',
      },
      {
        q: 'What does your company actually do?',
        a: 'We build websites that answer the phone, even at midnight. The posters are us saying our name out loud. If you are curious what one looks like for a business or a church like yours, ask and I will send a link to a free demo.',
        warn: 'Only send the /demos link when they ask what we do. Never post it into a poster thread unprompted.',
      },
      {
        q: 'Do you build church websites?',
        a: 'We do, churches and ministries included, and we would love to hear what yours needs. Message me and we will talk it through.',
        warn: 'No prices in the thread, ever. The church conversation happens off-thread by DM or email.',
      },
      {
        q: 'How much is a website?',
        a: 'Depends what it has to do, honestly, and I do not quote in comment threads because it never comes out fair to anybody. The demo is free and shows you exactly what yours would be. The poster stays free either way.',
        warn: 'NEVER type a price. Pricing derives from lib/demo-order.ts and lives on the site.',
      },
    ],
  },
  {
    id: 'twelve-windows',
    name: 'The Twelve Windows',
    eyebrow: 'Set fourteen · Scripture in Glass',
    blurb:
      'Actual scripture this time: twelve verses people live by, quoted exactly from the King James Version, set in type over luminous stained glass window plates on nave dark. Sarah picked Cathedral Glass off a three-direction study (over The Broadside and Gold Illumination). The engine is the custom window: comment the verse you live by and it gets set in glass free, and a pastor who comments gets all twelve for the building. No. 12 sets Matthew 13:31-32 in a rose window, the passage the company is named for.',
    cta: 'Free window · comment your verse',
    accent: '#C9A227',
    rules: [
      'The verse text is QUOTED EXACTLY, King James Version, marked KJV on every card. Never alter a word beyond conventional partial quotation (04 and 11 quote the spoken clause). If someone wants the fuller passage, point them to it warmly.',
      'KJV because it is public domain: the giveaway stays truly unencumbered at any print size. A CUSTOM window may carry the requester’s preferred translation wording with its attribution, since that copy is personal.',
      'The custom window is the engine. Comment a verse, get it set in glass, free, same day when possible. That comment is the warmest lead this set produces and the promise gets kept.',
      'The church escalator: a pastor or ministry leader who comments gets all twelve for the building, church name set in gold under the reference, free. Deliver the full set, never a sampler.',
      'Cadence is the church rhythm: one window every Sunday and Wednesday for six weeks on our own Page. Groups only where faith content is welcome; never into secular trade groups.',
      'Symbolic glass only: no depiction of Jesus in any window, ever. Regenerate rather than ship one.',
      'Never argue doctrine or translation preference in a thread. The window is a gift, not a debate.',
      'Asked if it is AI art: yes, art directed at the studio, and the verse text is scripture quoted exactly and checked, which is not generated. The straightest answer, always.',
      'Outbound: same rule as set thirteen. Never attach scripture to cold outreach; only when their faith is public or they raised it first, email or live call only, never a cold text.',
      'The money question gets the canned reply, never a number.',
    ],
    cards: [
      {
        file: '01-lamp',
        headline: 'Psalm 119:105. Thy word is a lamp unto my feet, and a light unto my path.',
        use: 'The series opener, and the plate that won the direction study.',
        alt: 'A stained glass window of a golden lamp above a winding glass path through cobalt night hills. The full verse Psalm 119:105 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '02-shepherd',
        headline: 'Psalm 23:1. The LORD is my shepherd; I shall not want.',
        use: 'The most beloved verse in the set. Grief threads get this one gently, never with a pitch.',
        alt: 'A stained glass window of a shepherd’s crook and a white lamb resting in an emerald glass meadow. Psalm 23:1 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '03-eagle',
        headline: 'Isaiah 40:31. They shall mount up with wings as eagles.',
        use: 'Graduation season, new ventures, anyone starting over.',
        alt: 'A stained glass window of a great eagle rising into an amber glass sun. The full verse Isaiah 40:31 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '04-be-still',
        headline: 'Psalm 46:10. Be still, and know that I am God',
        use: 'The quiet card. Anxious weeks, Sunday evenings.',
        alt: 'A stained glass window of a perfectly still mountain lake under a single bright star in cobalt night glass. Psalm 46:10 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '05-rest',
        headline: 'Matthew 11:28. Come unto me, and I will give you rest.',
        use: 'The comfort drop, midweek. Tag someone carrying too much.',
        alt: 'A stained glass window of a wooden yoke laid down beneath an olive tree as a dove descends in amber light. The full verse Matthew 11:28 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '06-paths',
        headline: 'Proverbs 3:5-6. Trust in the LORD with all thine heart.',
        use: 'Decision seasons: careers, moves, engagements.',
        alt: 'A stained glass window of a golden path forking through emerald hills under a guiding star. Proverbs 3:5-6 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '07-strength',
        headline: 'Philippians 4:13. I can do all things through Christ which strengtheneth me.',
        use: 'The giveaway post graphic. The most claimed verse in America.',
        alt: 'A stained glass window of an oak bending in a storm with glowing amber roots gripping the rock. Philippians 4:13 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '08-shine',
        headline: 'Matthew 5:16. Let your light so shine before men.',
        use: 'The church post graphic, and every believer who runs a business.',
        alt: 'A stained glass window of a blazing lantern on a stand above a small city on a hill at dusk. The full verse Matthew 5:16 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '09-hills',
        headline: 'Psalm 121:1-2. I will lift up mine eyes unto the hills.',
        use: 'The Montana card. Local groups, mountain town believers.',
        alt: 'A stained glass window of violet glass mountains with golden light breaking over the highest peak. Psalm 121:1-2 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '10-courage',
        headline: 'Joshua 1:9. Be strong and of a good courage.',
        use: 'Deployments, diagnoses, first days. The courage card.',
        alt: 'A stained glass window of a torch held high before a wide river crossing with the far bank glowing. The full verse Joshua 1:9 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '11-light',
        headline: 'John 8:12. I am the light of the world.',
        use: 'Advent and Christmas Eve. The year-end card.',
        alt: 'A stained glass window of an enormous amber sun rising over a dark sleeping world, rays driving back violet night glass. John 8:12 is set beneath in italic serif with a gold KJV reference.',
      },
      {
        file: '12-mustard-tree',
        headline: 'Matthew 13:31-32. The kingdom of heaven is like to a grain of mustard seed.',
        use: 'The series closer and the company name passage, set in a rose window.',
        alt: 'A stained glass rose window of an immense mustard tree filled with nesting birds, a tiny seed glowing at its roots. The full passage Matthew 13:31-32 is set beneath in italic serif with a gold KJV reference.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The launch',
        graphic: '01-lamp',
        body: [
          'The last two series carried our words. This one carries the Word.',
          'The Twelve Windows: twelve verses people actually live by, set in glass, the full text exactly as written, King James Version, reference on every window. One goes up every Sunday and Wednesday for the next six weeks.',
          'Every window is free, full resolution, print it as big as a window. Comment or message and it is yours.',
          'No. 01 is Psalm 119:105. Thy word is a lamp unto my feet.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'Nothing for sale in this thread, same as always. And if the verse you live by is not one of the twelve, tell me what it is. Keep reading this series and you will see why that matters.',
          ],
        },
      },
      {
        n: 2,
        title: 'The verse you live by',
        graphic: '07-strength',
        body: [
          'Everybody has one verse that has carried them through something.',
          'Comment yours and we will set it in glass. Free, full resolution, exact text, your translation if you have a strong feeling about that. This is not a drawing or a maybe, every verse commented gets its window.',
          'No. 07 is for everyone whose verse is Philippians 4:13.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'Why free? Our studio is named after Matthew 13:31 and this series is the name doing what it says. Small things, planted, grow.',
          ],
        },
      },
      {
        n: 3,
        title: 'The church post',
        graphic: '08-shine',
        body: [
          'Pastors: all twelve, for the building, free.',
          'The Twelve Windows are stained glass studies of the verses your people already carry: Psalm 23, Isaiah 40:31, Matthew 11:28, Joshua 1:9. Comment and the full set is yours in full resolution, with your church name set in gold under the reference if you want it.',
          'Hallways, kids wings, the coffee wall, the counseling room. They were made to be printed large and lit warm.',
        ],
        followUp: {
          label: 'Reply rule',
          lines: [
            'Every pastor gets the full set delivered, not a sampler. One line about what we do is allowed after delivery, never before.',
          ],
        },
      },
      {
        n: 4,
        title: 'The comfort drop',
        graphic: '05-rest',
        body: [
          'No. 05 is for whoever is carrying too much this week.',
          'Come unto me, all ye that labour and are heavy laden, and I will give you rest. Matthew 11:28, the whole verse, nothing added, because nothing needs adding.',
          'If someone comes to mind while you read that, tag them or send them this. The full resolution file is free, like all twelve.',
        ],
        followUp: {
          label: 'Posting note',
          lines: [
            'This one never carries a pitch, a link, or a follow up. It is the Race Day rule: this post exists to be a gift, and that is what makes the rest of the series welcome.',
          ],
        },
      },
      {
        n: 5,
        title: 'The Montana card',
        graphic: '09-hills',
        body: [
          'I will lift up mine eyes unto the hills, from whence cometh my help.',
          'If you live in the Flathead you did not need the reference, you have prayed this one at a windshield. No. 09 of the Twelve Windows is Psalm 121, in glass, and it is free in full resolution for anyone who wants it on a wall.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'Full set is twelve windows, all free. Comment a verse you love and we will set that one in glass too.',
          ],
        },
      },
      {
        n: 6,
        title: 'The closer',
        graphic: '12-mustard-tree',
        body: [
          'No. 12 closes the series where our name began.',
          'The kingdom of heaven is like to a grain of mustard seed. The least of all seeds, and the birds of the air come and lodge in the branches thereof. We set the whole passage in a rose window because that promise is the reason this studio exists.',
          'All twelve windows stay free, forever. Comment your verse, your church, or just where to send them.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'Thank you. Between the trade posters and these windows, this has been the best season this page has ever had. The Word is a lamp. Go build something with it.',
          ],
        },
      },
    ],
    replies: [
      {
        q: 'Can I really have this free?',
        a: 'Yes, truly free. Full resolution, no list, nothing to buy. Tell me which window and where to send it.',
      },
      {
        q: 'Why King James?',
        a: 'Because it is public domain, which means we can give these away printed as large as you like with no strings, and because four hundred years have not improved on how it sounds read aloud. For your custom window we can set your preferred translation’s wording with its attribution, since that copy is yours.',
        warn: 'Never argue translations in a thread. Offer the custom window in their translation and move on.',
      },
      {
        q: 'Can you do MY verse?',
        a: 'Yes, that is the whole point. Give me the verse and we will set it in glass and send it over, free.',
        warn: 'Same day when possible. The custom window request is the warmest lead this set produces, keep the promise.',
      },
      {
        q: 'Can our church use these?',
        a: 'All twelve, printed as big as you like, your church name set in gold under the reference if you want it. Fellowship halls and kids wings are exactly what they are for. Tell me the name as you want it to read.',
        warn: 'Deliver the full set to churches, never a sampler.',
      },
      {
        q: 'Is this AI art?',
        a: 'The glass is, art directed line by line at the studio: the glass language, the palette, the scenes. The verse text is scripture quoted exactly and checked, and that part is not generated. Happy to talk about the process any time.',
        warn: 'This audience deserves the straightest answer of all. Never claim hand made glass, never dodge.',
      },
      {
        q: 'What does your company actually do?',
        a: 'We build websites that answer the phone, even at midnight. The windows are our name telling its own story. If you are curious what one looks like for a business or a church like yours, ask and I will send a link to a free demo.',
        warn: 'Only send the /demos link when they ask what we do. Never post it into a window thread unprompted.',
      },
      {
        q: 'How much is a website?',
        a: 'Depends what it has to do, honestly, and I do not quote in comment threads because it never comes out fair to anybody. The demo is free and shows you exactly what yours would be. The window stays free either way.',
        warn: 'NEVER type a price. Pricing derives from lib/demo-order.ts and lives on the site.',
      },
    ],
  },
];

/** Flatten a post body into the plain text that goes in the composer. */
export function postToText(post: SocialPost): string {
  let n = 0;
  return post.body
    .map((block) =>
      Array.isArray(block)
        ? block.map((item) => `${++n}. ${item}`).join('\n')
        : block,
    )
    .join('\n\n');
}
