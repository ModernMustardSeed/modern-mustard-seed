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
