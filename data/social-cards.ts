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
};

// A paragraph, or an array of strings rendered as a numbered list.
export type PostBlock = string | string[];

export type SocialPost = {
  n: number;
  title: string;
  graphic: string;
  body: PostBlock[];
  followUp?: { label: string; lines: string[] };
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

export const SOCIAL_SETS: SocialSet[] = [
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
        headline: '62% of calls to small businesses go unanswered.',
        use: 'The empathy beat. Middle of the Post 2 carousel.',
        alt: 'A tradesperson working under a kitchen sink. Headline: 62 percent of calls to small businesses go unanswered.',
      },
      {
        file: '03-after-hours',
        headline: '52% say an AI after hours is better service.',
        use: 'The objection killer. Post 3, the strongest stat in the set.',
        alt: 'A lit shop counter at night. Headline: 52 percent say an AI answering after hours is better service.',
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
          'I get it. I hated the idea too. But 52% of consumers now say a business having AI answer after hours is a sign of BETTER service, not worse (CallRail, 2025).',
          'Here is why I think that flipped. The alternative was never a human. At 9pm on a Saturday the alternative was a beep. People do not hate robots. People hate beeps.',
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
        warn: 'Price check before you post. That came from data/sidekick.ts on 2026-07-28. Never type a price from memory, re-read the file if the tiers have moved.',
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
      'Never type a price from memory. Sidekick tiers come from data/sidekick.ts.',
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
        warn: 'Price from data/sidekick.ts on 2026-07-28. Re-read the file if the tiers have moved. Never type a price from memory.',
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
    ],
    replies: [
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
    name: 'The Marquee',
    eyebrow: 'Set ten · See Yours',
    blurb:
      'The mirror set, built for other people’s groups: a small-town marquee with a blank YOUR NAME HERE where their business goes. It sells nothing in the post. The link in the first comment forges a free talking-website demo of their actual business at /demos.',
    cta: 'Free demo · modernmustardseed.com/demos',
    accent: '#D64533',
    rules: [
      'The demo link goes in the FIRST COMMENT, never the post body. The URL on the card art keeps lifted screenshots working.',
      'Say "the demo is free." Never say "free trial." The demo is the free thing; going live is paid from day one.',
      'No prices on cards, in posts, or in comments. The money question gets the canned reply, not a number.',
      'The forge has a daily cap. If a thread runs hot, the canned line is "tomorrow morning works too, it will still be free."',
      'Do not run this in the same group in the same week as the Say Hello set. Same product, and back to back it reads as a campaign.',
      'Serve in a group before you post. An invitation lands better from a neighbor than a vendor.',
    ],
    cards: [
      {
        file: '01-your-name',
        headline: 'Ever seen your business with its name in lights?',
        use: 'The hook, and the lead image for the main group post.',
        alt: 'A warm bulb-ringed marquee sign reading YOUR NAME HERE on a dark ground. Headline: Ever seen your business with its name in lights?',
      },
      {
        file: '02-it-talks',
        headline: 'A designer website that answers out loud.',
        use: 'The one-line explainer. Own page, or a comment reply image.',
        alt: 'Marquee sign reading IT TALKS. Headline: A designer website that answers out loud. First of its kind.',
      },
      {
        file: '03-free-to-see',
        headline: 'We build a real demo for YOUR business. Free.',
        use: 'The fact card. Kills the what-is-the-catch objection early.',
        alt: 'Marquee sign reading FREE TO SEE with the red bar ADMISSION FREE, NO CARD. Headline: We build a real demo for your business, free.',
      },
      {
        file: '04-one-of-one',
        headline: 'Built from your actual business. Not a template.',
        use: 'The craft card. Post 3, for the template-skeptics.',
        alt: 'Marquee sign reading ONE OF ONE. Headline: Built from your actual business, not a template.',
      },
      {
        file: '05-go-see-yours',
        headline: 'Go look at yours.',
        use: 'The invite. Runs with the link sitting in the first comment.',
        alt: 'Marquee sign reading GO SEE YOURS with a red arrow pointing down. Red bar: link in the comments. Headline: Go look at yours.',
      },
      {
        file: '06-make-it-shine',
        headline: 'Best way to make your business thrive? Make it shine.',
        use: 'The anthem. Warmest card in the set, good any evening.',
        alt: 'Marquee sign reading MAKE IT SHINE with sparkles. Headline: Best way to make your business thrive? Make it shine.',
      },
    ],
    posts: [
      {
        n: 1,
        title: 'The invitation',
        graphic: '01-your-name',
        body: [
          'Odd little offer for the business owners in here, and it costs nothing.',
          'My studio builds talking websites: designer sites that answer questions out loud, the way a good front-desk person would. To show what they look like, we build free demos. You type in your business, and the forge builds a real working demo of YOUR business. Your services, your town, your voice.',
          'No card, no sales call, nobody phones you. Most owners just stare at it for a while, and honestly, that is the fun part.',
          'The link is in the first comment. If you run it, come back and tell me your favorite detail. And if you are feeling brave, post your demo link below so the rest of us can admire it.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'modernmustardseed.com/demos',
            'Sixty seconds of questions, then it builds. Free, no card. If the day’s forge queue happens to be full, tomorrow morning works too, it will still be free.',
          ],
        },
      },
      {
        n: 2,
        title: 'Go see yours',
        graphic: '05-go-see-yours',
        body: [
          'Best way to make your business thrive? Make it shine.',
          'We build free demos of designer talking websites, built from your actual business. Tell it what you do and where, hand it your current website if you have one, and it dresses your business the way it deserves. Then it answers questions about you, out loud.',
          'Two minutes, no card, and worst case you spend those two minutes admiring what could be.',
          'Link in the first comment. Post what yours looks like, I read every one.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: [
            'modernmustardseed.com/demos',
            'No card, no call. The demo stays yours to look at either way.',
          ],
        },
      },
      {
        n: 3,
        title: 'One of one',
        graphic: '04-one-of-one',
        body: [
          'The thing nobody believes until they see it: these demos are not templates.',
          'The forge reads what you give it. Your trade, your services, your hours, your town, even your current website if you point it there. Then it builds a one-of-one, and no two ever come out alike, because no two businesses are alike.',
          'A landscaper and a med spa do not get the same site with the colors swapped. They get different rooms, different words, different answers on the phone.',
          'If you want to see what a one-of-one of YOUR business looks like, the link is in the first comment. Free, and it stays free.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: ['modernmustardseed.com/demos'],
        },
      },
      {
        n: 4,
        title: 'The anthem',
        graphic: '06-make-it-shine',
        body: [
          'People pick the business that looks alive. The lights are how they know.',
          'That is the whole theory of everything we build. Not tricks, not rankings, not hacks. A business that looks awake, answers when spoken to, and wears its own name like it is proud of it.',
          'If you have been running on a tired website, or none, and you want to see your name lit up for two free minutes, the link is in the first comment.',
          'Make it shine. Tonight and every night.',
        ],
        followUp: {
          label: 'First comment, post it yourself right away',
          lines: ['modernmustardseed.com/demos'],
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
        q: 'What is the catch?',
        a: 'The demo is the marketing. Some owners buy it, most just look, and both are fine with me. It costs us a little compute to show off. That is the whole catch.',
      },
      {
        q: 'Is this just AI-generated junk?',
        a: 'Fair worry, the internet is full of it. This is a designed system fed with your real business details, and the demo you get is the actual product, not a mockup. So judge the thing itself instead of my word for it.',
      },
      {
        q: 'I already have a website.',
        a: 'Even better. Give the forge your current site when it asks, then put the two side by side. If yours wins, tell me so, I will take the note on the chin.',
      },
      {
        q: 'I tried the link and it did not build.',
        a: 'The forge builds a limited number each day so every demo gets full attention. Come back tomorrow morning, it will still be free. If it still misbehaves, message me and I will run yours personally.',
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
