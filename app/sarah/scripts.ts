export type PrompterScript = {
  id: string;
  kind: 'episode' | 'short' | 'sales' | 'ad';
  episode: string;
  session: string;
  publish: string;
  pillar: 'BUILD' | 'SYSTEMS' | 'STEWARD' | 'STORY' | 'SALES' | 'ADS';
  title: string;
  hook: string;
  directorNote: string;
  /**
   * Spoken lines, in reading order. CONVENTION: a paragraph that is wholly
   * wrapped in parentheses — e.g. "(Scroll slowly and point at two things.)" —
   * is DIRECTION, not a spoken line. The prompter renders those as an amber
   * "Direction · don't read aloud" block so they can never be read on camera by
   * accident. Mid-sentence parentheticals (spoken asides) are left alone.
   */
  sections: { heading: string; paragraphs: string[] }[];
};

import { GENERATED } from './scripts-data';

/** The ratified 3-minute originals live on as tight cuts in the Shorts bank. */
const TIGHT_CUTS: PrompterScript[] = [
  {
    id: 'age-of-agentic-building',
    kind: 'short',
    episode: 'Tight Cut · Ep 1',
    session: 'Shorts Bank',
    publish: 'Use anytime',
    pillar: 'BUILD',
    title: 'The Age of Agentic Building',
    hook: 'Most people are still using AI like a smarter search bar. That is not where the world is anymore.',
    directorNote:
      'Calm authority. You are the person who already lives in this future, telling people what you see. Slow down on the one-line punches ("Now it is a Tuesday." "It is already here.") and let them land. Eyes to the lens. One clean take per section is plenty.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'Most people are still using AI like a smarter search bar. Ask a question, get an answer, move on.',
          'That is not where the world is anymore. The real shift is quieter, and it is much bigger. Software has started building itself.',
        ],
      },
      {
        heading: 'The Shift, Named',
        paragraphs: [
          'I run an AI studio called Modern Mustard Seed. We build agentic systems. Not chatbots. Agents that do the work.',
          'An agent can read a whole codebase, plan a change, write it, test it, fix its own mistakes, and ship it. It can run your operations overnight. It can take a vague idea in the morning and hand you a working product by dinner.',
          'A year ago that was a demo. Now it is a Tuesday.',
        ],
      },
      {
        heading: 'Why It Matters',
        paragraphs: [
          'Here is what that does to the math of building. The thing that used to take a team of ten and six months can now take one capable person and a week.',
          'That is not a threat. It is the largest leverage shift of our lifetime. The bottleneck stopped being how many engineers you can hire. The bottleneck is now taste, judgment, and knowing what is worth building.',
          'The people who win this era are not the ones with the biggest teams. They are the ones who can direct a swarm of agents with clarity and conviction.',
        ],
      },
      {
        heading: 'What MMS Actually Does',
        paragraphs: [
          'That is the whole point of Modern Mustard Seed. We build the agentic engine that lets a founder move like a company.',
          'Real production systems. Not slideware, not a prompt you paste somewhere. The actual operating software that runs the business: the lead engine, the content machine, the build pipeline, the agents that handle the parts you should not be doing by hand.',
          'We build it the way you would want it built. With craft. With restraint. As something you steward, not something that runs away from you.',
        ],
      },
      {
        heading: 'Close + CTA',
        paragraphs: [
          'The age of agentic building is not coming. It is already here, and the gap between the people who use it and the people who do not is widening every week.',
          'If you are a founder who can feel that, and you want the engine without spending two years learning to build it, that is what we do.',
          'I am Sarah. This is Modern Mustard Seed. Let us build the thing only you can imagine.',
        ],
      },
    ],
  },
  {
    id: 'manifesto',
    kind: 'short',
    episode: 'Tight Cut · Ep 2',
    session: 'Shorts Bank',
    publish: 'Use anytime',
    pillar: 'STORY',
    title: 'Why a Christian Founder Is Betting Everything on AI',
    hook: 'I run four companies by myself. People assume that means I never rest. The truth is almost the opposite.',
    directorNote:
      'The cornerstone video, pinned to the channel. Warm, unhurried, personal. This one is testimony, not a pitch. Smile when you get to the ventures. Breathe between sections and let the verse sit for a beat before you move on.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'I run four companies by myself. People assume that means I never rest. The truth is almost the opposite. And it starts with one verse, and one very small seed.',
        ],
      },
      {
        heading: 'The Thesis',
        paragraphs: [
          'Jesus said the kingdom of God is like a mustard seed. The smallest of seeds, that becomes a tree where the birds come and nest. I have built my whole working life around that picture. Small, faithful inputs. Real leverage. Work that ends up sheltering other people.',
          'For most of history, a small input stayed small. One person could only do so much. That is not true anymore. AI did not make me ambitious. It made the seed grow faster than I could on my own.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'So here is what I actually do. I am a Christian. I build companies with AI. A faith apparel house. An AI studio. Title and escrow work. A small resort up in the mountains. One person, four ventures, because the systems do the running, not me.',
          'This channel is where I show the work. Honestly. The builds, the faith underneath them, the parts that go wrong.',
        ],
      },
      {
        heading: 'The Conviction',
        paragraphs: [
          'I am not here to sell you a hustle. I think a lot of what passes for entrepreneurship online is just anxiety with a logo. What I want to show you is different. You can build real things, with real tools, without making the building your god.',
          'Stewardship, not striving. You were given gifts. AI is just a very large lever for them. The question is never whether the lever is powerful. It is whether you will pick it up faithfully.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'If you are a believer who is capable but stuck, who feels the pull to build something and does not know if it is allowed, this channel is for you. Small faith. Real leverage. Work that shelters.',
          'I am Sarah. New videos every week. Come build with me.',
        ],
      },
    ],
  },
  {
    id: 'is-it-a-sin-to-use-ai',
    kind: 'short',
    episode: 'Tight Cut · Ep 4',
    session: 'Shorts Bank',
    publish: 'Use anytime',
    pillar: 'STEWARD',
    title: 'Is It a Sin to Use AI?',
    hook: 'A believer asked me if using AI to build a business is cheating God. I sat with that question for a week.',
    directorNote:
      'A trust piece, not a sales piece. Quiet, pastoral, zero hype. Take the tension seriously before you resolve it. The caution section is spoken gently, to yourself as much as the viewer. Land the last three sentences slowly.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'A believer messaged me last week and asked, very seriously, if using AI to build a business is cheating God. Like she was getting away with something. I sat with that question for a week before I answered. Here is what I told her.',
        ],
      },
      {
        heading: 'The Tension',
        paragraphs: [
          'The fear underneath the question is real. It goes something like this. If a machine does the work, is the work still mine. If I did not struggle for it, did I earn it. And is leaning on something this powerful a kind of pride.',
          'Those are good questions. They are better than the people who never ask them. So let us actually think instead of reacting.',
        ],
      },
      {
        heading: 'The Principle',
        paragraphs: [
          'Scripture does not condemn tools. It condemns where you put your trust. A plow is a tool. A printing press is a tool. The loom, the calculator, the camera. Every one of them was once accused of cheating, of making people lazy or false. And every one of them, in faithful hands, multiplied good work.',
          'The parable of the talents is not gentle with the servant who buried what he was given to keep it safe. The sin there was not risk. It was fear that masqueraded as reverence. He was so afraid of using the gift wrong that he refused to use it at all.',
          'AI is a lever. A large one. The question God asks is the same question He has always asked. Will you take what you have been given and put it to work, or will you bury it.',
        ],
      },
      {
        heading: 'The Honest Caution',
        paragraphs: [
          'Now, the warning. A lever this big makes it easy to build an idol fast. You can produce so much that you forget to ask whether you should. You can let the tool think for you until you stop thinking. You can make output your identity and call it diligence.',
          'So the line is not whether you use AI. The line is whether you are still the one being faithful. Are you stewarding it, or worshiping what it can produce. Do you still rest. Do you still pray over the work. Does the speed make you more generous, or just more anxious.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'So here is what I told her. It is not a sin to use the lever. It might be a sin to bury it out of fear. Pick it up. Hold it with open hands. Build things that shelter people. And keep your trust in the One who gave you the gift, not in the gift itself.',
          'That is the whole of it. Small faith. Real work. Held loosely.',
        ],
      },
    ],
  },
];

/**
 * The Sales Desk: evergreen face-to-camera videos for pipeline moments.
 * Attached to demo emails, sent before sales calls, used in follow-ups.
 * Rules: NO prices ever spoken (numbers live on the page, so videos never
 * expire), no lead names, no dates. Warm founder, zero pressure.
 */
const SALES_DESK: PrompterScript[] = [
  {
    id: 'sales-demo-delivery',
    kind: 'sales',
    episode: 'Sales 1',
    session: 'Sales Desk',
    publish: 'Attach to every demo email',
    pillar: 'SALES',
    title: 'What I Just Sent You',
    hook: 'My studio built something for your business this week, and I did not want it to land in your inbox without a face attached.',
    directorNote:
      'This is the standard video on every demo email, so it is the first real impression of you. Warm and unhurried, like leaving a voicemail for a neighbor. Keep it mostly your face, graphics minimal, no screen share. The command center line is the new value, so let it land. The close is permission, never pressure, and the first five seconds carry everything.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Hi, I am Sarah. My studio built something for your business this week, and I did not want it to land in your inbox without a face attached. So here is a quick note on what you are looking at.',
        ],
      },
      {
        heading: 'What I Sent You',
        paragraphs: [
          'Right below this video is a working demo. Not a slideshow, not a pitch deck. A real thing you can click and call. Depending on what fit your business, it might be a new website, an AI receptionist that already knows your services and your hours, or both.',
          '(Optional light graphic as she names them: three clean labels appear, WEBSITE, RECEPTIONIST, COMMAND CENTER. Keep it simple, this stays mostly her face.)',
          'And everything I build comes with one more piece, included free. A command center. One screen where you can see your analytics, read the transcript of every call your receptionist takes, and watch every new lead land, all from your phone.',
        ],
      },
      {
        heading: 'What To Do',
        paragraphs: [
          'All I would ask is two minutes. Open the link, and if there is a receptionist, call the number and try to stump it, the way you would test a new hire on their first day. If there is a website, click around on your phone, because that is where your customers already are.',
          'Nothing happens after that unless you want it to. No contract came attached to this email, and nobody is going to chase you around the internet.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'If you look and think, that is not for us, that is a completely fine answer, and you can just tell me. But if you feel that little jolt of, wait, that is my business in there, hit reply. That is the whole reason I sent it.',
          'Either way, thank you for the two minutes. I am Sarah, and your demo is right below.',
        ],
      },
    ],
  },
  {
    id: 'sales-pre-call',
    kind: 'sales',
    episode: 'Sales 2',
    session: 'Sales Desk',
    publish: 'Send before a sales call',
    pillar: 'SALES',
    title: 'Before Our Call',
    hook: 'We have a call on the calendar, so I wanted to say hi before we have officially met.',
    directorNote:
      'Confident and calm, the tone of someone with nothing to hide. The fit promise is the trust moment; deliver it looking straight down the lens. Keep the energy conversational, this plays the day before a call.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Hi, I am Sarah. We have a call on the calendar, so I wanted to say hi before we have officially met.',
        ],
      },
      {
        heading: 'How the Call Goes',
        paragraphs: [
          'Here is how I like these calls to go. You talk first. I want to hear how the phone gets answered today, where the leads leak, and what a full week actually looks like for you. Then I will show you, live, what the system would do about it. Real screens, your actual demo, nothing canned.',
          'Two things worth doing before we talk. First, if you have not opened your demo yet, give it two minutes. It makes the call twice as useful. Second, jot down the one task you would hand off tomorrow if you trusted someone to do it right. That answer usually turns out to be the whole conversation.',
          'And one promise going in. If I do not think we are a fit, I will say so on the call. I run this studio by keeping only the clients we genuinely help.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: ['Bring your questions and bring your skepticism, both are welcome here. See you soon.'],
      },
    ],
  },
  {
    id: 'sales-post-view',
    kind: 'sales',
    episode: 'Sales 3',
    session: 'Sales Desk',
    publish: 'Follow-up after demo views',
    pillar: 'SALES',
    title: 'You Took a Second Look',
    hook: 'So you opened the demo. Maybe twice. Something in there either felt like your business, or you are looking for the catch.',
    directorNote:
      'Disarming and a little playful at the top, then straight and honest. The "name your hesitation" line is the whole video; slow down for it. No selling voice anywhere, this lands on warm leads who hate being sold to.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'So you opened the demo. Maybe even twice. I am not watching you personally, I promise, but the system does tell me when a demo gets a second look.',
        ],
      },
      {
        heading: 'The Catch Question',
        paragraphs: [
          'A second look usually means one of two things. Either something in there felt like your business, or you are trying to figure out the catch. So let me help with the catch part, because there is not a dramatic one. The demo you saw can go live for your real customers after a short setup, and the plain numbers are always on the page below. I do not do contracts that trap people, and I cap how many setups I take each week, so your install gets real attention.',
          'And the thing most owners want to know at this point: yes, it can be tweaked. The voice, the greeting, what it says about your services, all of it gets trained on you, and you approve it before it ever talks to a real customer.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'If you have one hesitation, reply and name it. I would rather answer the real question than send you five more emails. And if this is not the season, the demo will keep. It is yours either way.',
        ],
      },
    ],
  },
  {
    id: 'sales-last-email',
    kind: 'sales',
    episode: 'Sales 4',
    session: 'Sales Desk',
    publish: 'The gracious last email',
    pillar: 'SALES',
    title: 'It Is Okay to Say No',
    hook: 'This is my last email about your demo, and it is not a guilt trip. Promise.',
    directorNote:
      'The most relaxed video of the series. Zero neediness; you are genuinely fine either way, and it has to be true on your face. A small smile at the ladder line. This one earns replies precisely because it is not asking for one.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: ['This is my last email about your demo, and it is not a guilt trip. Promise.'],
      },
      {
        heading: 'Where I Leave It',
        paragraphs: [
          'You looked, or maybe you did not, and either way life is loud and you run a business. I built the demo because showing beats telling, not to sign you up for a drip campaign until the end of time.',
          'So here is where I will leave it. The demo stays yours. If it is three months from now and your front desk person moves away, or you are up a ladder watching your phone ring for the fourth time in an hour and something in you finally snaps, the link below will still work. And I will still be here in Montana, probably drinking coffee, definitely building.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'If you want to close the loop, a one word reply does it. Later and never are both acceptable answers, and I will respect either one. No hard feelings, and grace to you and your business either way. I am Sarah, and this was the last one.',
        ],
      },
    ],
  },
  {
    id: 'sales-welcome-aboard',
    kind: 'sales',
    episode: 'Sales 5',
    session: 'Sales Desk',
    publish: 'After purchase, before install',
    pillar: 'SALES',
    title: 'Welcome Aboard',
    hook: 'You said yes, and I want you to hear this from my actual face. Thank you, and welcome.',
    directorNote:
      'Genuine gratitude, then crisp clarity. This video kills buyer remorse by making the next steps concrete; deliver the "you have the final say" line like a promise, because it is one.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: ['You said yes, and I want you to hear this from my actual face. Thank you, and welcome.'],
      },
      {
        heading: 'Exactly What Happens Next',
        paragraphs: [
          'Here is exactly what happens next, so nothing feels like a black box. First, we set your install slot. I cap installs each week on purpose, because your setup gets real attention, not a queue number.',
          'Before your slot, you will get a short list from me. The handful of things only you know: how you like your customers greeted, what makes your business yours, and the questions that have to be answered exactly right. Then we train your system on all of it, and you get to hear it and correct it before a single real customer ever does. You have the final say on every word. That review step is not optional. It is the whole point.',
          'And after you are live, you are not alone. There is a real human loop for changes, and small tweaks are quick.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'You just handed a piece of your business to my little studio, and I do not take that lightly. We build it like it is ours, and we treat it like it is yours. Talk soon.',
        ],
      },
    ],
  },
  {
    id: 'sales-face-behind',
    kind: 'sales',
    episode: 'Sales 6',
    session: 'Sales Desk',
    publish: 'Signatures, proposals, anywhere',
    pillar: 'SALES',
    title: 'The Face Behind the Studio',
    hook: 'If we are going to work together, you should know who you are actually dealing with.',
    directorNote:
      'The evergreen trust card. Steady, warm, no pitch at all. The parable is said plainly, not preached. This one goes everywhere (email signature, proposals, the site), so record it fresh and rested.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: ['If we are going to work together, you should know who you are actually dealing with.'],
      },
      {
        heading: 'Who You Are Dealing With',
        paragraphs: [
          'I am Sarah Scarano. I run Modern Mustard Seed from Kalispell, Montana. I am a self-taught builder, I have shipped software for dozens of industries, contractors and restaurants and roofers and retailers, and I run this studio the way you probably run your shop. Personally. When you email, I read it. When something breaks, I fix it.',
          'The name comes from a parable about a mustard seed, the smallest of seeds that grows into a tree with room for others in its branches. That is the whole business plan, honestly. Small faithful work, real leverage, built to shelter the people it serves.',
          'I use AI to do the heavy lifting, so a small studio can deliver like a big one. But the judgment, the taste, and the promise keeping are mine, and I do not delegate those.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'That is who picks up when you call. Whatever we end up building together, that is what stands behind it.',
        ],
      },
    ],
  },
  {
    id: 'sales-demo-walkthrough',
    kind: 'sales',
    episode: 'Sales 7',
    session: 'Screen mode · record per lead',
    publish: 'Send with their demo',
    pillar: 'SALES',
    title: 'The Live Demo Walkthrough',
    hook: 'I am on your actual demo right now, and before we are done I am going to call your new receptionist and you will hear it answer.',
    directorNote:
      'Use SHARE SCREEN and pick the demo TAB (sharing the tab captures the voice agent cleanly when you call it in the browser). Arm the camera too and Claude adds your face bubble in the edit. These are anchor lines, not a word-for-word read: say their business name, react honestly to what is on screen, and let the live call be genuinely live. Flubs and pauses are fine, Claude cuts them. One take per beat.',
    sections: [
      {
        heading: 'Beat 1 · The Open',
        paragraphs: [
          'Hi, it is Sarah. I am looking at your demo right now, so let me walk you through what my studio built for your business. This is not a mockup, everything you are about to see actually works. And at the end I am going to call your new receptionist, live, and you will hear it answer.',
        ],
      },
      {
        heading: 'Beat 2 · The Website',
        paragraphs: [
          'Let us start with the site. This is built from your real business, your services, your area, your reviews. Watch how it reads on a phone, because that is where your customers are.',
          '(Scroll it slowly. Point at two or three things that are specifically THEIRS, by name. If there is a tool or calculator on the page, run it once on camera.)',
          'Everything here can be tweaked. The photos, the words, the colors. This is the starting point, not the final answer.',
        ],
      },
      {
        heading: 'Beat 3 · The Live Call',
        paragraphs: [
          'Now the part I love. This is your receptionist. It already knows your services and your hours, and I am going to call it right now, no edits, no script.',
          '(Call it. Ask what a new customer would ask: are you open Saturday, what do you charge for an estimate, can I book something. Then ask it one curveball. React honestly to the answers.)',
          'Every call like that gets answered in two rings. At lunch, at two in the morning, while you are up a ladder. That is the whole point.',
        ],
      },
      {
        heading: 'Beat 4 · Where It All Lands',
        paragraphs: [
          'And here is where it comes together. Every call, every message, every lead lands in one place, so nothing falls through the cracks and you can see your whole front door working from your phone.',
        ],
      },
      {
        heading: 'Beat 5 · The Close',
        paragraphs: [
          'So that is your demo. It took my systems about a minute to build, and going live takes a short setup where you approve every word before a real customer ever hears it. The plain numbers are on the page below this video.',
          'If you want it, reply to this email or grab a time on my calendar, the link is below. And if it is not for you, that is a fine answer too. Either way, you have seen what is possible for your business, this week, not someday.',
        ],
      },
    ],
  },
  {
    id: 'sales-live-agent-call',
    kind: 'sales',
    episode: 'Sales 8',
    session: 'Screen mode · per lead',
    publish: 'The extra-mile call',
    pillar: 'SALES',
    title: 'I Called Your Receptionist',
    hook: 'Before you even click anything, I wanted to do something. I am on your new website right now, and I am about to call your receptionist, live.',
    directorNote:
      'The extra-mile move: record this fresh for a lead you really want, right before you send their demo. Use SHARE SCREEN and pick the tab with their forged site so the voice agent records cleanly when you call it in the browser. Arm the camera too and Claude tucks your face in the corner. These are anchor lines, not a script: say their business name, actually talk to the agent, let the call be genuinely live. Flubs are good here, they prove it is real. Keep it to about a minute.',
    sections: [
      {
        heading: 'The Open',
        paragraphs: [
          'Hi, it is Sarah. Before you even click anything in that email, I wanted to do something for you.',
          '(Share the tab with their forged website. Say their business name out loud and point at it on the screen.)',
          'I am on the website my studio built for your business, and I am about to call your new receptionist, live, right here, so you can hear it before you do a single thing.',
        ],
      },
      {
        heading: 'The Live Call',
        paragraphs: [
          'This is not a polished recording. It is me, right now, calling the AI receptionist that already knows your services and your hours. Watch what it does.',
          '(Start the web call from their site. Ask what a real customer would ask: are you open Saturday, what do you charge for an estimate, can I book something for next week. Then throw it one curveball. React honestly to whatever it says.)',
          'That just happened, live. No script, no editing, no employee sitting by a phone.',
        ],
      },
      {
        heading: 'The Close',
        paragraphs: [
          'Every call your business gets could be answered exactly like that. In two rings. At lunch, at midnight, while you are on a job with your hands full.',
          'That took me one minute. Turning it on for your real customers is a short setup, and everything you need to know is on the page below.',
          'If hearing your own business answer like that gave you a little jolt, hit reply. I would love to build you the rest. I am Sarah.',
        ],
      },
    ],
  },
];

/**
 * META ADS: face-to-camera paid ads for Facebook + Instagram (Reels 9:16).
 * Sarah's face IS the brand; Claude edits in Mr. Mustard clips + graphics where
 * the (parenthetical) DIRECTION beats mark. Rules: hook lands in the first 3
 * seconds, no spoken prices or dates (evergreen, so a creative never expires),
 * one clear CTA to the link/number below, warm founder voice, faith where it
 * fits, no hype. Distinct angles on purpose so Meta can test hook against hook.
 */
const META_ADS: PrompterScript[] = [
  {
    id: 'ad-missed-call',
    kind: 'ad',
    episode: 'Ad 01',
    session: 'Meta · Reel 9:16',
    publish: 'Cold · service businesses',
    pillar: 'ADS',
    title: 'The Missed-Call Math',
    hook: 'Your phone rang today while you were up a ladder. That was probably a five hundred dollar job.',
    directorNote:
      'The hook is the whole ad. Say the first two lines straight to the lens like you are letting them in on a secret, warm and a touch wry, never salesy. Leave a half-beat of air after the phone line and before the CTA so the Mr. Mustard cuts breathe. Shoot it tight, eyes to the lens.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Your phone rang today while you were up a ladder. That was probably a five hundred dollar job, and it went to a voicemail nobody checks.',
        ],
      },
      {
        heading: 'The Math',
        paragraphs: [
          'More than half the calls to a small business go unanswered. Not because you are lazy. Because you are working. So the work just quietly walks next door.',
          '(Text slams on screen: 60% OF CALLS GO UNANSWERED. Mr. Mustard peeks over the top of the number, worried.)',
        ],
      },
      {
        heading: 'The Fix + CTA',
        paragraphs: [
          'I build a receptionist that runs on AI. It answers every call in your voice, knows your hours, books the job, and texts you the details before you are back down the ladder.',
          '(Mr. Mustard clip: he catches a falling phone, taps it once, gives a thumbs up.)',
          'It never sleeps and it never takes a lunch. There is a number below you can call right now and try to stump. I am Sarah, from a little studio in Montana.',
        ],
      },
    ],
  },
  {
    id: 'ad-free-demo',
    kind: 'ad',
    episode: 'Ad 02',
    session: 'Meta · Reel 9:16',
    publish: 'Cold · curiosity',
    pillar: 'ADS',
    title: 'I Already Built You One',
    hook: 'This is going to sound like a trick, but it is not. My studio already built a working demo for a business like yours.',
    directorNote:
      'Disarming and generous, not a pitch. Smile on "try to break it." The whole ad is permission, so the close has to feel genuinely no-pressure. This one runs cold, so the first five seconds carry everything.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'This is going to sound like a trick, but it is not. My studio already built a working demo for a business like yours. Not a slideshow. A real thing you can click and call.',
        ],
      },
      {
        heading: 'What It Is',
        paragraphs: [
          'Depending on what you do, it might be a new website, or an AI receptionist that already knows your services, or both. It took my systems about a minute to make.',
          '(Split screen: a phone scrolling the demo site, then the receptionist answering a call. Mr. Mustard slaps a big red BUILD button and the demo assembles itself.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'Open the link, give it two minutes, and try to break it. Nothing happens after that unless you want it to. No contract, nobody chasing you around the internet. I just think showing beats telling.',
        ],
      },
    ],
  },
  {
    id: 'ad-four-companies',
    kind: 'ad',
    episode: 'Ad 03',
    session: 'Meta · Reel 9:16',
    publish: 'Broad · founders',
    pillar: 'ADS',
    title: 'Four Companies, One Laptop',
    hook: 'I run four companies. By myself. From a laptop in Montana. People assume that means I never sleep.',
    directorNote:
      'Confident and calm, the tone of someone with nothing to prove. This one is aspiration, so let the "it is the opposite" line land with a small knowing smile. Founders are the audience; talk to them like a peer, not a prospect.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'I run four companies. By myself. From a laptop in Montana. People assume that means I never sleep. It is actually the opposite.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'I do not have a big team. I have AI staff that I built. They answer the phones, run the follow up, build the demos, and handle the parts of the business I should not be touching by hand.',
          '(Mr. Mustard clip: a tiny crew of Mr. Mustards works an assembly line, hats and clipboards, while Sarah sips coffee and watches.)',
        ],
      },
      {
        heading: 'The Point + CTA',
        paragraphs: [
          'That is the whole thing I want you to feel. You do not need more hours, and you do not need more hires. You need systems with a job description. That is what my studio builds.',
          'If you are one capable person doing the work of ten, come see what that could look like. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-is-it-cheating',
    kind: 'ad',
    episode: 'Ad 04',
    session: 'Meta · Reel 9:16',
    publish: 'Cold · faith audience',
    pillar: 'ADS',
    title: 'Is It Cheating God?',
    hook: 'A woman messaged me and asked, very seriously, if using AI to build her business was cheating God.',
    directorNote:
      'Pastoral, quiet, zero hype. This is a trust piece that disarms the AI skeptic, not a sale. Take the tension seriously before you resolve it. Keep the faith beat reverent, and note the direction: NO Mr. Mustard in that section, it would break the tone. Land the last two lines slowly.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'A woman messaged me and asked, very seriously, if using AI to build her business was cheating God. Like she was getting away with something. I sat with that for a week.',
        ],
      },
      {
        heading: 'The Principle',
        paragraphs: [
          'Here is what I told her. Scripture never condemned the tool. It condemned where you put your trust. A plow is a tool. A printing press is a tool. AI is a lever, a large one, and the parable of the talents is not kind to the man who buried what he was given out of fear.',
          '(Quiet graphic only: a single mustard seed, then a simple hand-drawn tree growing from it. Keep it reverent. No mascot here.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'So no. It is not a sin to pick up the lever. It might be one to bury it. If you are a builder who has felt that pull and did not know if it was allowed, this is the studio for you. I am Sarah. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-ten-dollar-work',
    kind: 'ad',
    episode: 'Ad 05',
    session: 'Meta · Reel 9:16',
    publish: 'Broad',
    pillar: 'ADS',
    title: 'Stop Doing $10 Work',
    hook: 'You are paying yourself ten dollars an hour for half of your week, and you are calling it diligence.',
    directorNote:
      'Punchy and direct, then warm on the reframe. Drop the energy half a step on "the thousand dollar work only you can do," that is the heart of it. The tier graphics are rapid-fire, so keep your pace crisp through them.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'You are paying yourself ten dollars an hour for half of your week, and you are calling it diligence.',
        ],
      },
      {
        heading: 'The Reframe',
        paragraphs: [
          'Chasing invoices. Retyping the same email. Answering the same three questions all day. That is ten dollar work, and every hour you spend on it is an hour you are not doing the thousand dollar work only you can do.',
          '(Lower thirds pop as each is named: $10 INBOX, $10 SCHEDULING, $10 FOLLOW-UP. Mr. Mustard sweeps all three into a trash can and dusts off his hands.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'I build the AI systems that take the ten dollar work off your plate, so you can go be the founder. Curious what that would free up in your week? The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-its-just-me',
    kind: 'ad',
    episode: 'Ad 06',
    session: 'Meta · Reel 9:16',
    publish: 'Warm · retarget',
    pillar: 'ADS',
    title: 'You Get Me',
    hook: 'When you hire most agencies, you get a sales rep, then a handoff, then a junior you never asked for.',
    directorNote:
      'This is the trust card, so it has to be true on your face: warm, steady, a little proud of how you run things. It plays to warm leads who are close, so drop the guard and just be the person they would be working with.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'When you hire most agencies, you get a sales rep, then a handoff, then a junior you never asked for. When you work with me, you get me.',
        ],
      },
      {
        heading: 'Who You Get',
        paragraphs: [
          'I am Sarah. I run Modern Mustard Seed out of Kalispell, Montana. When you email, I read it. When something breaks, I fix it. I use AI to do the heavy lifting so a small studio can deliver like a big one, but the judgment and the promises are mine, and I do not delegate those.',
          '(Mr. Mustard clip: he tips a little hat and hands over a wrench. Homemade, warm, no gloss.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'If you want a real person who actually builds the thing, that is what this is. Come say hi. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-not-techy',
    kind: 'ad',
    episode: 'Ad 07',
    session: 'Meta · Reel 9:16',
    publish: 'Cold · objection',
    pillar: 'ADS',
    title: 'You Do Not Have to Be Techy',
    hook: 'The number one reason owners tell me they are scared of AI is, I am not a tech person. Good news.',
    directorNote:
      'Reassuring and plain, like talking a nervous friend off a ledge. Smile on the EASY button beat. The goal is to remove one specific fear, so do not oversell, just relieve it.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'The number one reason business owners tell me they are scared of AI is, I am not a tech person. Good news. You do not have to be.',
        ],
      },
      {
        heading: 'The Truth',
        paragraphs: [
          'You do not need to know how any of it works under the hood. You need to know what you would hand off if you finally trusted someone to do it right. That part is your job. The building is mine.',
          '(Mr. Mustard clip: he hands Sarah a giant EASY button; she presses it and a whole little office lights up behind her.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'You bring the business. I bring the machine that runs it. Let me show you what that looks like. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-sounds-like-you',
    kind: 'ad',
    episode: 'Ad 08',
    session: 'Meta · Reel 9:16',
    publish: 'Cold · service businesses',
    pillar: 'ADS',
    title: 'The Robot That Sounds Like You',
    hook: 'This is your new receptionist. It already knows your hours, your services, and how you like your customers treated.',
    directorNote:
      'Playful and proud, like showing off something you made. The live-call section is the proof, so react honestly on camera when the agent answers. Record a real call if you can and I will cut it in clean.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'This is your new receptionist. It already knows your hours, your services, and how you like your customers treated. And I am about to let you call it.',
        ],
      },
      {
        heading: 'The Demo',
        paragraphs: [
          'Ask it anything a real customer would. Are you open Saturday. What do you charge for an estimate. Can I book something for next week. It answers in two rings, day or night, and it never has a bad morning.',
          '(Screen record of a live call with the agent, captions of the exchange on screen. Mr. Mustard sits in the corner wearing a tiny headset.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'Every answered call is a customer you did not lose. Call the number below and try to stump it. If it feels like your business in there, we should talk.',
        ],
      },
    ],
  },
  {
    id: 'ad-small-seeds',
    kind: 'ad',
    episode: 'Ad 09',
    session: 'Meta · Reel 9:16',
    publish: 'Broad · brand',
    pillar: 'ADS',
    title: 'Small Seeds, Real Shelter',
    hook: 'The name is Modern Mustard Seed. It comes from a parable about the smallest seed that grows into a sheltering tree.',
    directorNote:
      'The brand film of the set. Warm, unhurried, a little tender. This one sells nothing hard; it makes people feel who you are so the other ads convert. Let the growth graphic play under your voice and rest on the last line.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'The name is Modern Mustard Seed. It comes from a parable. The smallest of all the seeds, that grows into a tree big enough for the birds to nest in.',
        ],
      },
      {
        heading: 'The Meaning',
        paragraphs: [
          'That is the whole business, honestly. Small, faithful work. Real leverage. Systems that grow into shelter for the family your business carries. I just happen to build that with AI now.',
          '(Gentle growth graphic: a seed becomes a full tree across the whole ad. Mr. Mustard waters it once, then sits and rests in its shade.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'If you are building something small that you want to grow, come build it with me. Modern Mustard Seed. Kalispell, Montana. The link is below.',
        ],
      },
    ],
  },

  /* ---- Websites + the free, included Command Center (2026-07-22) ---- */
  {
    id: 'ad-cc-one-screen',
    kind: 'ad',
    episode: 'Ad 10',
    session: 'Meta · Command Center 9:16',
    publish: 'Command Center · cold',
    pillar: 'ADS',
    title: 'One Screen, Whole Business',
    hook: 'Most owners run their whole business from seven different places. Texts here, voicemails there, a sticky note on the monitor.',
    directorNote:
      'Warm, relieved on their behalf, like you are handing them a solution to a headache they gave up on. The "free, included" line is the moment; say it plainly, no salesy lift. Let the calm land after the chaos of the first beat.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Most owners run their whole business from seven different places. A text here, a voicemail there, a sticky note on the monitor, a lead they swear they will call back.',
        ],
      },
      {
        heading: 'The Fix',
        paragraphs: [
          'So I built one screen that catches all of it. Every call, every message, every new lead, every booking, in one place you can check from your phone out in the truck.',
          '(Mr. Mustard frantically juggles a phone, a notepad, and a calendar, then sweeps them all into one glowing dashboard that settles and goes calm.)',
        ],
      },
      {
        heading: 'The Offer + CTA',
        paragraphs: [
          'And here is the part I like. It comes free with any website or AI receptionist I build for you. Not a monthly add on. Included.',
          '(Screen record of the command center, real leads pinging in live. Text on screen: FREE WITH YOUR BUILD.)',
          'One screen for your whole front door. Want to see it work? The link is below. I am Sarah, Modern Mustard Seed.',
        ],
      },
    ],
  },
  {
    id: 'ad-cc-free-part',
    kind: 'ad',
    episode: 'Ad 11',
    session: 'Meta · Command Center 9:16',
    publish: 'Command Center · curiosity',
    pillar: 'ADS',
    title: 'The Free Part Nobody Believes',
    hook: 'When I build your website, I include something most agencies quietly charge you for every single month.',
    directorNote:
      'Playful and a little proud, like you are getting away with being generous. Smile on the price-tag flip. The whole ad is a pattern interrupt on "everything has a monthly fee," so let the word FREE breathe.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'When I build your website, I include something most agencies quietly charge you for every single month. And honestly, people do not believe it is free.',
        ],
      },
      {
        heading: 'What It Is',
        paragraphs: [
          'It is a command center. One dashboard where every lead, call, and message your new site brings in lands in a single place, so nothing slips through the cracks.',
          '(Mr. Mustard holds a big price tag; it flips over to read FREE. He shrugs, delighted.)',
        ],
      },
      {
        heading: 'The Why + CTA',
        paragraphs: [
          'I include it because a website that just sits there is a brochure. A website wired into a command center is a business. I would rather build you the second kind.',
          'Free with your build, no catch, no monthly. Come see how it works. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-cc-seven-apps',
    kind: 'ad',
    episode: 'Ad 12',
    session: 'Meta · Command Center 9:16',
    publish: 'Command Center · pain',
    pillar: 'ADS',
    title: 'Seven Apps Down to One',
    hook: 'Quick question. How many different apps does it take to run your business right now? Be honest.',
    directorNote:
      'Conversational, a knowing smile, because everyone is guilty of this. Keep the pace crisp through the app pile-up beat, then exhale on the fix. You are naming a mess they feel every day.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Quick question. How many different apps does it take to run your business right now? Be honest.',
        ],
      },
      {
        heading: 'The Mess',
        paragraphs: [
          'The calendar app, the texting app, the email, the voicemail you never check, the notebook, the other notebook. Every one of them is a place a customer can fall through.',
          '(Rapid cuts of app icons stacking into a chaotic pile. Mr. Mustard gets buried under them, then pops out the top.)',
        ],
      },
      {
        heading: 'The Fix + CTA',
        paragraphs: [
          'So I put all of it on one screen, a command center, and I include it free with any website or receptionist I build. Leads, calls, messages, bookings, one place, on your phone.',
          'Fewer apps, nothing dropped. Let me show you. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-cc-front-door',
    kind: 'ad',
    episode: 'Ad 13',
    session: 'Meta · Command Center 9:16',
    publish: 'Command Center · peace of mind',
    pillar: 'ADS',
    title: 'Your Front Door, On Your Phone',
    hook: 'There is a specific kind of peace that comes from watching your business work while you are doing something else.',
    directorNote:
      'Soft, unhurried, aspirational. This one sells a feeling, not a feature. Deliver the opening line slowly and mean it. The lawn-chair beat should feel earned, not lazy.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'There is a specific kind of peace that comes from watching your business work while you are doing something else.',
        ],
      },
      {
        heading: 'The Center',
        paragraphs: [
          'This is your command center. Every lead your website captures, every call your receptionist answers, every message, showing up live, right here, while you are at your kid’s game.',
          '(Mr. Mustard relaxes in a lawn chair, phone in hand. A gentle notification dings; he smiles as a new lead slides onto the screen.)',
        ],
      },
      {
        heading: 'The Offer + CTA',
        paragraphs: [
          'And it comes free with any website or AI receptionist I build. You just watch the front door fill up.',
          'Your whole business, on one screen, in your pocket. See it below. I am Sarah, Modern Mustard Seed.',
        ],
      },
    ],
  },
  {
    id: 'ad-web-that-works',
    kind: 'ad',
    episode: 'Ad 14',
    session: 'Meta · Websites 9:16',
    publish: 'Websites · cold',
    pillar: 'ADS',
    title: 'A Website That Actually Works',
    hook: 'Your website should be your hardest working employee. Most of them are a business card that forgot to do anything.',
    directorNote:
      'Confident and a little cheeky on the business-card line. This is the core website pitch, so the value-add close (the free command center) should feel like a bonus you are throwing in, not the headline.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Your website should be your hardest working employee. Most of them are just a business card that forgot to do anything.',
        ],
      },
      {
        heading: 'What I Build',
        paragraphs: [
          'I build sites that actually work. They load fast, they look right on a phone, and they are wired to capture the lead, book the job, and answer the customer, not just sit there looking pretty.',
          '(Split screen: a dusty, static brochure site on the left, a live site capturing a lead on the right. Mr. Mustard swaps the old one out like a lightbulb.)',
        ],
      },
      {
        heading: 'The Offer + CTA',
        paragraphs: [
          'And every site I build comes with a command center, free, so every lead it brings in lands in one place you can watch from your phone.',
          'A website that earns its keep. Want to see yours? The link is below. I am Sarah, from a studio in Montana.',
        ],
      },
    ],
  },
  {
    id: 'ad-web-costing-you',
    kind: 'ad',
    episode: 'Ad 15',
    session: 'Meta · Websites 9:16',
    publish: 'Websites · pain',
    pillar: 'ADS',
    title: 'Your Site Is Costing You',
    hook: 'Your website might be quietly costing you customers right now, and you would never even know it.',
    directorNote:
      'Straight and a touch urgent, but never fear-mongering. The three-second bounce is a real thing owners have never pictured, so paint it. Land the fix warm and matter of fact.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Your website might be quietly costing you customers right now, and you would never even know it.',
        ],
      },
      {
        heading: 'The Leak',
        paragraphs: [
          'If it is slow, if it looks broken on a phone, if there is no easy way to call or book, people leave in about three seconds and go to the competitor whose site just worked.',
          '(A customer taps a slow, janky site, waits, sighs, and taps away to a competitor. Mr. Mustard winces and covers his eyes.)',
        ],
      },
      {
        heading: 'The Fix + CTA',
        paragraphs: [
          'I rebuild it into something fast and clean that actually turns visitors into calls, and I wire it into a command center, free, so you can see every lead it brings in.',
          'Stop leaking customers to a bad website. Let me show you better. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-web-by-monday',
    kind: 'ad',
    episode: 'Ad 16',
    session: 'Meta · Websites 9:16',
    publish: 'Websites · speed',
    pillar: 'ADS',
    title: 'Built By Monday',
    hook: 'Here is something that used to take a web firm a month and a check with a comma in it. I can have it done by Monday.',
    directorNote:
      'Brisk and a little amazed at the new math yourself, because it is genuinely wild. The "you approve every word" line is the trust beat; slow down there. Do not state a price; the numbers live on the page.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Here is something that used to take a web firm a month and a check with a comma in it. I can have it done for you by Monday.',
        ],
      },
      {
        heading: 'How',
        paragraphs: [
          'You tell me about your business in a few sentences. My systems do the heavy lifting, I do the taste and the judgment, and you get a real, finished website. You approve every word before it ever goes live.',
          '(Time-lapse of a website building itself overnight. Mr. Mustard hammers a nail, hangs an OPEN sign, and a coffee cup steams beside him at sunrise.)',
        ],
      },
      {
        heading: 'The Offer + CTA',
        paragraphs: [
          'And it comes with a command center, free, so it is not just a pretty site. It is a business you can run from your phone.',
          'A finished website, this week, not someday. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-web-no-agency',
    kind: 'ad',
    episode: 'Ad 17',
    session: 'Meta · Websites 9:16',
    publish: 'Websites · positioning',
    pillar: 'ADS',
    title: 'The Agency Website, Without the Agency',
    hook: 'Agencies will charge you a fortune and take three months to build a website. I think that math is broken now.',
    directorNote:
      'Assured, founder-to-founder, no chip on the shoulder. You are not trashing agencies, you are telling the truth about the new math. The "you get me" line is the whole pitch; deliver it right down the lens.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Agencies will charge you a fortune and take three months to build a website. I think that math is broken now.',
        ],
      },
      {
        heading: 'The New Math',
        paragraphs: [
          'A small studio with the right AI can build you the same quality in a fraction of the time. And I run it personally, so when you email, you get me, not a junior three people removed from your project.',
          '(Mr. Mustard, in a tiny hard hat, out-builds a whole cartoon office of suits single-handed, then tips his hat.)',
        ],
      },
      {
        heading: 'The Offer + CTA',
        paragraphs: [
          'Same quality site, a command center included free, and a real human who answers. The plain numbers are always on the page.',
          'Skip the agency, keep the quality. Come see. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-business-reimagined',
    kind: 'ad',
    episode: 'Ad 18',
    session: 'Meta · Brand film 9:16',
    publish: 'Broad · brand anthem + YT trailer',
    pillar: 'ADS',
    title: 'Your Business, Reimagined',
    hook: 'What if running your business did not have to feel this hard?',
    directorNote:
      'The brand anthem, the most elevated film in the set. Warm, hopeful, almost a benediction, not a pitch. This one doubles as your YouTube channel trailer: cut a 30 second version for Meta and a 60 to 90 second version for YouTube. Slow down and let the dawn and the quiet land. Mr. Mustard stays light here; the feeling carries it.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'What if it did not have to feel this hard. The late nights. The calls you miss. The quiet feeling that you are the only thing holding all of it together.',
        ],
      },
      {
        heading: 'The New Day',
        paragraphs: [
          'A new day is actually dawning for small business. The tools finally changed. The machine can take the parts that were burning you out, the phones, the follow up, the busywork that ate your evenings and your weekends.',
          '(B-roll: first light over a small town, a shop sign flipping to OPEN, a phone answering itself while the owner pours coffee. Warm and unhurried. Title card fades up: A NEW DAY.)',
        ],
      },
      {
        heading: 'What Matters Most',
        paragraphs: [
          'Which means you get to go back to what only you can do. The relationships. The craft you are genuinely great at. The wisdom you earned the hard way. That is the part no machine will ever replace, and honestly, it was always the whole point.',
          '(B-roll: the owner actually present, shaking a hand, teaching an apprentice, at a ball game with the phone in a pocket instead of a hand.)',
        ],
      },
      {
        heading: 'Let Us Handle the Rest',
        paragraphs: [
          'So let us handle the rest. My studio builds the quiet AI systems that run the background of your business, so you get to run the part that matters.',
          '(Mr. Mustard appears softly, tending the background like a lamplighter, then steps out of frame so the owner is centered.)',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Your business, reimagined. Not bigger for the sake of bigger. Lighter. Freer. More yours.',
          'I am Sarah, from Modern Mustard Seed. Come build the new day with me. The link is below.',
        ],
      },
    ],
  },
];

/**
 * Origin batch ("I built the studio to build the mission"). One themed drop on
 * the founder story: the long-form origin episode, two shorts, and two Meta ads.
 * Hand-written and kept here (not in the generated scripts-data.ts) so a future
 * regeneration can never clobber it. Routed to the right tabs by `kind`.
 */
const ORIGIN: PrompterScript[] = [
  {
    id: 'ep13-studio-for-the-mission',
    kind: 'episode',
    episode: 'Episode 13',
    session: 'Season One Bank',
    publish: 'Season One',
    pillar: 'STORY',
    title: 'I Built the Studio to Build the Mission',
    hook: 'I did not build an AI studio because I love AI. I built it because I had a mission I could not make alone.',
    directorNote:
      'This is the origin manifesto. Warm, unhurried, founder to founder. Sit closer to the lens than usual and let it feel like a story, not a lecture. Let the pauses breathe, especially after the cold open and before the mustard seed parable, where you should drop to an almost conversational register, quieter and slower, like you are telling one friend the truth. If you record it in sections, the natural cut points are the section breaks.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'Here is something that sounds backwards. I did not build an AI studio because I am fascinated by AI. I built it because there was a thing I had to make, and I could not make it alone. The studio was never the goal. It was the way I got to the goal.',
          'I think once you see it in that order, a lot of what feels impossible about building something right now starts to feel possible instead. So let me tell you the whole story, because it is really a story about how one person gets to build like a company.',
        ],
      },
      {
        heading: 'The Thing I Had to Make',
        paragraphs: [
          'Before any of this, there was a brand. A faith apparel line called Cross and Covenant. Clothing that carries something I actually believe, made for people who want to wear their faith without shouting it. That was the thing in my chest. That was the mission I could not shake.',
          'I did not wake up one day wanting to run a technology company. I woke up wanting to bring that brand into the world, and to do it with the kind of quality that would make someone proud to put it on. And here is where most missions quietly die. Not because they are bad ideas. Because the person carrying them is one person.',
        ],
      },
      {
        heading: 'The Wall',
        paragraphs: [
          'Let me describe the wall, because I think you have stood at it too. To build a real brand you need a designer who can make it look like it belongs in the world. You need a writer who can find the words. You need a marketer who shows up every single day, not once a month when you remember. You need a developer to build the store. You need someone to answer the customer at two in the morning who has a question about sizing.',
          'That is a team. That is payroll. That is money most founders do not have and cannot afford to risk. So the dream gets smaller. You tell yourself you will do it someday, when you have raised money, when you have hired people, when the timing is right. And someday has a way of never arriving. I stood at that wall for a while. And then I made a different decision.',
        ],
      },
      {
        heading: 'A Different Decision',
        paragraphs: [
          'I stopped trying to hire a team, and I started building one. Not out of people. Out of AI.',
          'I built a designer that never sleeps. A writer that can draft in my own voice. A marketer that ships something every day without being asked. A developer that can take an idea I have on a Tuesday and hand me back a working online store by the weekend. A receptionist that answers the phone and the messages at any hour, in the tone of my brand, and never takes a day off.',
          'Each of these is not a person. It is a system I built and taught. A worker made of instructions, and models, and a fair amount of care. And when you put enough of them together, and you give them a shared way of working, you do not have a pile of tools sitting on a shelf. You have a studio. A small company that happens to have one human in it.',
        ],
      },
      {
        heading: 'What a Studio Actually Is',
        paragraphs: [
          'I want to be honest about what that actually looks like, because I think the word AI makes people picture something colder and more magical than the truth. It is not magic. It is a lot of careful work up front. You have to decide how each worker should think. What it is allowed to do on its own, and where it has to stop and hand off to you. Where it fails safe, so it never does the thing you would regret.',
          'You have to teach it your standards, the same way you would train a new hire, except you only have to teach it once and it never forgets, and it never has a bad morning. I am self taught. I did not come from a technical background. I learned all of this the way most of you would have to learn it, by building the thing in front of me, breaking it, and building it again until it held. So when I tell you this is possible, I am not saying it from a mountaintop. I am saying it from the same ground you are standing on right now.',
        ],
      },
      {
        heading: 'I Was the First Client',
        paragraphs: [
          'Now here is the part that matters most to me, and it is the reason I can look you in the eye about any of this. I did not build this studio for clients and then go looking for someone to test it on. I built it for my own mission, and I pointed the entire thing at my own company first.',
          'Cross and Covenant was the first client the studio ever had. The store, the words on it, the launch, the daily presence, the growth engine, the little worker that answers customers while I am asleep. All of it built by one person and a staff of AI workers. And it worked. A real product. Real customers. A real brand out in the world with my name behind it.',
          'So when someone asks me to prove that this approach actually works, I do not reach for a testimonial about a stranger. I point at my own company and I say, I built that this way. I am the proof. I did it to myself before I ever offered to do it for anyone else.',
        ],
      },
      {
        heading: 'The Part I Did Not Plan',
        paragraphs: [
          'That next part I did not plan for. Other founders saw what I had built, and they did not say, that is neat. They said, build mine. A woman with a beautiful product and no team behind it. A man running a service business who is drowning in the phone every single day. People with a real thing to offer and no company around them to offer it well.',
          'So the studio I forged to build my own mission became a studio that builds for other people\'s missions too. That is Modern Mustard Seed. It is an AI studio that builds businesses, and it exists in the first place because I needed it to exist for myself. The order matters, and I want to say it plainly. The mission came first. The studio was the answer to the mission. And the studio turned out to be useful to a whole lot of other people who are carrying missions of their own and hitting the same wall I hit.',
        ],
      },
      {
        heading: 'The Mustard Seed',
        paragraphs: [
          'I should tell you where the name comes from, because it is not decoration. There is a parable about a mustard seed. The smallest seed a person plants, and it grows into a tree large enough that the birds come and find shelter in its branches. That is the whole idea. Something small, planted in faith, that grows into something big enough to shelter other people.',
          'I think that is what a business is supposed to be. Not a machine for taking. A tree that shelters. Your family. The people you get to employ one day. The customers you serve. The person who puts on the shirt and feels a little less alone in what they believe.',
          'I am a Christian, and I build like one. That does not mean I put a verse on everything I make. It means I believe I am a steward of what I have been given, not the owner of it. My job is to take the small thing that is in my hands and grow it into something that shelters. AI, to me, is just leverage. It is a way for one faithful person with a small seed to build something the size of a company. Small faith. Real leverage. Work that shelters.',
        ],
      },
      {
        heading: 'One Worker Up Close',
        paragraphs: [
          'Let me get a little more specific, because I do not want to leave this as a nice idea. Take just one of those workers, the one that answers customers when I am asleep. For a normal small business, that is a person you cannot afford, so the phone rings out and the message sits unread until morning, and by morning the customer has already bought from someone else.',
          'I built a worker that picks up every time, in the voice of the brand, and either answers the question or takes down exactly what I need to follow up on. That one worker is the difference between a business that leaks and a business that holds. Now stack a dozen of those, each one covering a job you could never have staffed alone, and you start to see why one person with a studio can go toe to toe with a company that has twenty employees.',
        ],
      },
      {
        heading: 'Is That Cheating',
        paragraphs: [
          'Now, some of you are hearing all of this and a quiet objection is forming. Is that not cheating. Is there not something hollow about a company run by machines. I have sat with that question honestly, because I care about the answer.',
          'Here is where I have landed. The machine never had a heart to begin with. It is not pretending to be a person, and it is not replacing the part of the work that actually needs a person. The vision is mine. The standards are mine. The care about the customer is mine. The reason the thing exists at all is mine. The AI carries the load. I carry the intent.',
          'Every worker in my company is pointed at exactly what I would want, because I am the one who taught it. That is not less human. In a strange way it is more, because nothing in the company ever drifts away from why I started it.',
        ],
      },
      {
        heading: 'What This Means for You',
        paragraphs: [
          'So let me make this useful to you, because I did not come here just to tell you my story. If you have a thing you were made to build, and the only reason you have not built it is that you do not have a team, I want you to hear this clearly. The team is no longer the thing standing between you and the work. That wall came down, and a lot of people have not noticed yet.',
          'You do not need to hire a department before you begin. You need to learn to build and lead a staff that is not made of people. You become the founder. The one with the vision, and the standards, and the final say. And you build workers underneath you to carry the weight. That is not a smaller way to build a company. In some ways it is a truer one, because every worker in it is carrying your exact intent and nothing else.',
        ],
      },
      {
        heading: 'Where to Start',
        paragraphs: [
          'If you want somewhere to start, start here. First, get the mission clear enough to say in one sentence. Not the tools, the mission. The actual thing only you can make. Second, write down every job a company would need to bring that thing to life, the designer, the writer, the person on the phone, all of it. Third, build those jobs one at a time, out of AI, and do not move to the next one until the last one actually works.',
          'That is it. That is how the studio got built. One taught worker at a time, in service of one clear mission. And do not wait for permission. Nobody handed me a company. I built one out of the only material I had, which was a clear picture of what I wanted to make and a willingness to learn how to make it. The picture is the rare part. The building is learnable. I am living proof of that, and I am not special. I just refused to let the wall be the end of the story.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'That is the whole story. I built the studio to build the mission. The mission is still the point. The studio is just how one person gets to build like a hundred.',
          'If you have got a seed, I would love to help you grow the tree. Come build with me. Build the thing only you can imagine.',
        ],
      },
    ],
  },
  {
    id: 'origin-why-the-studio',
    kind: 'short',
    episode: 'Origin · Short 1',
    session: 'Shorts Bank',
    publish: 'Use anytime',
    pillar: 'STORY',
    title: 'Why the Studio Exists',
    hook: 'People think I started an AI studio because I am a tech person. I am not.',
    directorNote:
      'Warm and grounded, like you are answering the question you get asked the most. This is the origin in about ninety seconds, so do not rush the first line, and let "I built the studio to build the mission" land clean near the end. Eyes to the lens the whole way.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'People think I started an AI studio because I am a tech person. I am not. I am self taught, and I started because I had a brand living in my head that I could not get out into the world by myself.',
        ],
      },
      {
        heading: 'The Wall',
        paragraphs: [
          'It is a faith apparel line. Clothing that carries a message I actually believe. And the honest problem was this. One person cannot build a real brand. You need a designer, a marketer, a writer, a developer, and somebody to answer the customer at two in the morning. I could not hire all of them. Almost no founder can.',
        ],
      },
      {
        heading: 'The Decision',
        paragraphs: [
          'So I did the only thing that made sense. I stopped trying to hire a team and I started building one. Out of AI. A designer that never sleeps. A marketer that ships every day. A developer that turns an idea into a working store by the weekend.',
          'That collection of AI workers became a studio. And the studio built the brand.',
        ],
      },
      {
        heading: 'The Turn and Close',
        paragraphs: [
          'Then something I did not expect happened. Other founders saw it and said, build mine too. So now the same studio I made for my own mission builds businesses for people who have a thing to bring into the world and no team to do it with.',
          'That is the whole story. I built the studio to build the mission. The mission is still the point. The studio is just how one person gets to build like a company.',
          'Small seeds become sheltering trees. If you have got the seed, I will show you the rest.',
        ],
      },
    ],
  },
  {
    id: 'origin-first-client',
    kind: 'short',
    episode: 'Origin · Short 2',
    session: 'Shorts Bank',
    publish: 'Use anytime',
    pillar: 'STORY',
    title: 'I Was the First Client',
    hook: 'Before I ever built anything for a client, I built my own company with it.',
    directorNote:
      'Quietly confident, a little wry on "I became the case study." The power here is that it is simply true, so underplay it, do not sell it. Slow down and soften on the final three lines.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'Every agency tells you they can build your business. Here is my difference. Before I ever built anything for a client, I built my own.',
        ],
      },
      {
        heading: 'The Proof',
        paragraphs: [
          'I had a brand I believed in and no team to make it real. So I built the team out of AI, and I pointed all of it at my own company first. The store, the words, the launch, the growth engine, the thing that answers customers when I am asleep. All of it, one person and a studio of AI staff.',
          'It worked. So I did not go write a case study about somebody else. I became the case study.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'That is what I bring to the table now. Not a pitch. A thing I already did to myself, standing here, willing to show you exactly how it was built.',
          'Most people are waiting for permission, or a budget, or a team, before they start the thing they were made to build. You do not need any of it the way you used to. You need the seed, and a studio.',
          'I built mine. I will help you build yours. Build the thing only you can imagine.',
        ],
      },
    ],
  },
  {
    id: 'ad-origin-built-the-team',
    kind: 'ad',
    episode: 'Ad 22',
    session: 'Meta · Origin 9:16',
    publish: 'Broad · founders',
    pillar: 'ADS',
    title: 'I Built the Team Out of AI',
    hook: 'I built an entire AI studio for one reason. I had a brand I had to bring into the world and could not afford a team.',
    directorNote:
      'Fast, warm, straight to the lens. The hook has to win the first two seconds, so lead with it cold, no intro. Leave a half-beat of air before each Mr. Mustard cut so the edit breathes. End on the invitation, never a pitch.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'I built an entire AI studio for one reason. I had a brand I had to bring into the world, and I could not afford a team to do it.',
          '(Quick graphic: a single gold seed drops onto dark ground and a thin line of light draws outward from it.)',
        ],
      },
      {
        heading: 'The Move',
        paragraphs: [
          'So I built the team out of AI instead. A designer, a writer, a marketer, somebody to answer the phone. All of it working while I sleep.',
          '(Mr. Mustard pops in beside her, tips his hat, and gestures at a little team of workers lighting up one by one.)',
          'I used it to build my own company first. Then other founders saw it and asked me to build theirs.',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'That is what my studio does now. You bring the thing only you can make. We bring the staff to make it real.',
          '(End card: the mascot, MODERN MUSTARD SEED, and the line COME BUILD WITH ME.)',
          'If you have been waiting for a team, stop waiting. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'ad-origin-just-you',
    kind: 'ad',
    episode: 'Ad 23',
    session: 'Meta · Origin 9:16',
    publish: 'Broad · solo founders',
    pillar: 'ADS',
    title: 'If It Is Just You',
    hook: 'If it is just you running the whole thing, this one is for you.',
    directorNote:
      'Speak it to one person, the solo founder watching late at night. Warm, direct, no hype. The multiply graphic is the visual payoff, so land "built one out of AI" right on it.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'If it is just you running the whole thing, this one is for you. I know what it is like to have a mission in your chest and nobody on the payroll to help you build it.',
        ],
      },
      {
        heading: 'The Move',
        paragraphs: [
          'So I stopped trying to hire a team, and I built one out of AI. That is my whole studio. And I built my own brand with it before I ever touched a client\'s.',
          '(Graphic: one small figure standing alone, then it multiplies into a little team of mustard-seed workers around her.)',
          'Now I do it for other founders. One person, building like a company.',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'You do not need a big team. You need the right one. Let me build yours.',
          '(Mr. Mustard nods once and tips his hat. End card: MODERN MUSTARD SEED, COME BUILD WITH ME.)',
        ],
      },
    ],
  },
];

/**
 * BEHIND THE BUILD: practical, "show the real sauce" content. How the actual
 * MMS systems get made, the demo funnel, the app factory, this studio itself,
 * Fiat Lux, Cross + Covenant, the command center. Hand-written, grounded in the
 * real builds. Mixed kinds so each slots into its tab (episode / short / ad).
 * No spoken prices/dates (evergreen); Mr. Mustard/graphics beats in (parens).
 */
const BEHIND_THE_BUILD: PrompterScript[] = [
  {
    id: 'build-demo-funnel',
    kind: 'episode',
    episode: 'Episode 9',
    session: 'How We Build',
    publish: 'Use anytime',
    pillar: 'BUILD',
    title: 'How I Build a Business a Front Door Overnight',
    hook: 'A roofing company woke up to a working website, an AI receptionist that already knew their trade, and a dashboard, all built while they slept. They never asked. Here is exactly how.',
    directorNote:
      'This is the flagship how-it-works episode, so teach it like you are proud of the machine but not showing off. Slow down on the receipts. The (parens) beats are where I cut in a screen recording of the actual forge, so leave a breath after each one.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'A few weeks ago a roofing company in a state I have never been to woke up to a working website for their business, an AI receptionist that already knew their services, and a simple dashboard showing them what their missed calls were costing. All of it built overnight. They never asked me for it. They never paid a dime.',
          'I want to walk you through exactly how that gets made, because for me the how is not a secret. The how is the whole business. And if you own a company, there is a lesson in here you can use tomorrow.',
        ],
      },
      {
        heading: 'Why I Build It for Free',
        paragraphs: [
          'Start with the strange part. Why would anyone build a stranger a website and a phone system for free. Because showing beats telling. I could send that roofer a pitch about answering more calls, and it would land in the same graveyard as every other cold email. Or I could hand them their own business, already working, and let it make the argument for me.',
          'A demo you can click and call is not a sales tactic. It is the most honest thing I can do. It says, here is what is possible for you, this week, not someday. So the entire machine is built around one goal: turn a cold name into a working demo before they have finished their coffee.',
        ],
      },
      {
        heading: 'Step One, Mine What Is Already Public',
        paragraphs: [
          'The system does not start with a blank page. It starts with them. It reads what is already public: their trade, their town, their reviews, and whether they even have a website worth keeping.',
          'This is the part most people miss. A generic demo is worthless. So the system pulls a real complaint out of their actual reviews, the specific pain a real customer wrote down, and it builds the whole demo to answer that exact thing. When the owner sees it, it does not feel like a template. It feels like someone finally paid attention.',
          '(Screen record: the cockpit reading a lead, their reviews and trade populating, the demo brief writing itself.)',
        ],
      },
      {
        heading: 'Step Two, Forge the Three Pieces',
        paragraphs: [
          'Then three things get built at once. First, the receptionist. An AI agent gets trained on their services, their hours, and the language of their trade, and it can answer the phone as their business in about a minute. It books the job, it speaks like a person who works there, and it is told to never quote a price it should not.',
          'Second, the website. While I am asleep, an agent reads the brief, researches what a business like theirs actually needs, writes the copy, designs the layout, builds the whole thing, tests it on a phone, finds its own broken pieces, fixes them, and publishes it to a live address. It runs on a flat monthly plan, not a meter, so building a hundred of these costs me the same as building one.',
          'Third, the command center. A simple dashboard, included free, where every call, every lead, and every message lands in one place. A website that just sits there is a brochure. A website wired into a command center is a business.',
          '(Split screen: the receptionist answering a live call, the website assembling itself, the dashboard lighting up. Mr. Mustard runs between all three like a stagehand.)',
        ],
      },
      {
        heading: 'Step Three, Put It in One Adorable Room',
        paragraphs: [
          'All three pieces open from one page. A single suite, built for their business by name, with a calculator right on it that turns their missed calls into a monthly dollar number they can feel. One link does the whole pitch.',
          'Then a real person, me, sends it with a short video attached. If they look and feel that jolt of, wait, that is my business in there, they reply. And the demo they saw does not get rebuilt. It becomes their real system, and they get a portal to run it.',
        ],
      },
      {
        heading: 'The Lesson',
        paragraphs: [
          'Here is the part for you, whether or not you ever call me. You do not win by working more hours. You win by building the thing that shows instead of tells, and by letting systems do the front of the house so you can do the part only you can do.',
          'The tools to build all of this are sitting in front of you right now. The only question is whether you will pick them up. I am Sarah, this is Modern Mustard Seed, and this is the machine. Come see it work, the link is below.',
        ],
      },
    ],
  },
  {
    id: 'build-the-factory',
    kind: 'episode',
    episode: 'Episode 10',
    session: 'How We Build',
    publish: 'Use anytime',
    pillar: 'SYSTEMS',
    title: 'How One Person Runs Four Companies',
    hook: 'People think running four companies means I never sleep. It is the opposite. I do not run four companies. I run one factory that runs four companies.',
    directorNote:
      'Confident, founder-to-founder, a peer letting you behind the curtain. The Fiat Lux and Cross and Covenant receipts are the proof, say them plainly. Land the "systems with a job description" line, that is the whole episode in one sentence.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'People assume that running four companies by myself means I never sleep. The truth is the opposite. I do not actually run four companies. I run one factory, and the factory runs the companies. Today I am going to show you the factory, because once you see it, you cannot unsee it, and you will start running your own business the same way.',
        ],
      },
      {
        heading: 'From Doing to Directing',
        paragraphs: [
          'The whole shift is this. I stopped being the person who does the work, and I became the person who directs the agents that do the work. That sounds like a small change. It is the entire game.',
          'An agent is not a chatbot. It does not just answer a question. You give it a goal, and it makes a plan, does the steps, checks its own work, fixes its own mistakes, and hands you the finished thing. So my job stopped being labor and became judgment. Taste. Deciding what is worth building. The machines handle the rest.',
        ],
      },
      {
        heading: 'The Assembly Line',
        paragraphs: [
          'The factory has five stations, and every idea walks through them. You pressure-test the idea until it is either dead or worth building. You design it. You build it. You launch it. And then you install the parts that make it grow on its own.',
          'The trick is that none of those stations require a big team anymore. They require a clear description. Which brings me to the one sentence I want you to write down.',
          '(Graphic: a clean five-station line, an idea moving down it and coming out the far end as a finished product. Mr. Mustard stamps each station as it passes.)',
        ],
      },
      {
        heading: 'Two Real Ones',
        paragraphs: [
          'Let me make it real. One of the companies is an AI interior staging studio. You give it a photo of an empty room and it stages it beautifully for a listing, while keeping the actual windows and doors pixel for pixel real. That went from an idea to a live product with its own engine and its own billing in a matter of days, not months.',
          'Another is a faith apparel house. It has a storefront, an operations system, and a little engine that writes and posts a daily piece of art and encouragement on its own. The brand gets to stay about the meaning, because the machine handles the running. Same factory, completely different businesses.',
        ],
      },
      {
        heading: 'The One Sentence',
        paragraphs: [
          'Here is the sentence. Your bottleneck is not your capacity to work. It is your capacity to specify. Anything you can describe precisely, what it is, what done looks like, and what must never happen, you can now hand to a system. And anything you cannot describe precisely was going to be done badly anyway.',
          'So the founders who win the next decade are not the ones who grind the hardest. They are the ones who write the clearest job descriptions, for people and for machines. What would you build if building were cheap. It is cheap now. The link is below.',
        ],
      },
    ],
  },
  {
    id: 'build-the-studio',
    kind: 'episode',
    episode: 'Episode 11',
    session: 'How We Build',
    publish: 'Use anytime',
    pillar: 'BUILD',
    title: 'I Built the Studio I Am Filming This On',
    hook: 'This video is a lesson and the proof of the lesson at the same time. The teleprompter I am reading, the camera rolling, the way this take will edit itself. I built all of it as a web app, in an afternoon.',
    directorNote:
      'The most fun, meta episode. Play with the fact that the studio is the subject. Gesture at the setup on "everything you are looking at." Keep the energy of someone who cannot believe they get to build their own tools. Light on jargon, heavy on delight.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'This one is a little strange, because it is a lesson and the proof of the lesson at the same time. Everything you are looking at right now, the teleprompter I am reading these words off of, the camera that is rolling, and the way this exact take is about to record and upload itself, I built. As a web app. In an afternoon. Let me show you, because it is the cleanest example I have of the most useful habit you can build.',
        ],
      },
      {
        heading: 'Build the Tool You Keep Wishing Existed',
        paragraphs: [
          'Here is the habit. When you catch yourself wishing a tool existed, that is not a complaint anymore. It is a to-do item. For most of history, wishing a piece of software existed and having it were separated by a team, a budget, and six months. That gap is basically gone.',
          'I wanted to start filming a channel. I could have bought five different apps that each did one piece badly. Instead I described the studio I actually wanted, and I built exactly that.',
        ],
      },
      {
        heading: 'What This Thing Actually Does',
        paragraphs: [
          'So here is what I made. The teleprompter scrolls at exactly my reading pace, so I never race it or wait on it. When I hit play, the camera records the take and sends it off on its own, no files to wrangle. I can watch any take back instantly. The notes that are meant for me, and not for you, show up in a color I can never accidentally read out loud. And it can even attach a personal video I record to one specific customer.',
          'None of that existed as one thing I could buy. So it became one thing I built.',
          '(Screen record of the actual booth: a script loading, a take recording and uploading, a take replaying, a direction note glowing in a different color.)',
        ],
      },
      {
        heading: 'Your Version of This',
        paragraphs: [
          'Now here is the part that matters for you, because you are probably not building a video studio. You have your own version of this. There is a tool you keep wishing existed for your business. The little app that would take the annoying part off your plate. The thing no software company will ever build, because it is too specific to you.',
          'That specificity used to be the reason you could not have it. Now it is the reason you can. The most valuable software in your business is the software that is shaped exactly like your business. Go build the thing you keep wishing existed. I am Sarah, and the link is below.',
        ],
      },
    ],
  },
  {
    id: 'short-geometry-lock',
    kind: 'short',
    episode: 'Short',
    session: 'Shorts Bank · Real Sauce',
    publish: 'Use anytime',
    pillar: 'BUILD',
    title: 'The Trick That Makes AI Staging Real',
    hook: 'Most AI home staging looks fake for one reason. It melts the windows.',
    directorNote:
      'Nerdy in the best way, the kind of specific that builds trust. Show a real before and after where the window stays perfect. This is a proof-of-craft short, not a sales pitch.',
    sections: [
      {
        heading: 'The Problem',
        paragraphs: [
          'Most AI home staging looks fake for one very specific reason. It melts the windows. You ask it to furnish an empty room, and it happily invents new furniture, but it also quietly repaints the view outside, warps the door frame, and bends the trim. Your eye catches it in half a second, and the whole thing reads as a fake.',
        ],
      },
      {
        heading: 'The Fix',
        paragraphs: [
          'So here is what we actually do. Before the AI touches the room, a second model traces the exact windows, doors, and glass in the original photo. The AI restages everything else, the furniture, the light, the styling. Then we composite the real windows and doors back on top, pixel for pixel.',
          '(Before and after: an empty room becomes beautifully staged, and a callout circles the window staying perfectly, identically real.)',
        ],
      },
      {
        heading: 'The Point',
        paragraphs: [
          'The room gets gorgeous. The view stays honest. That one trick, protecting the parts that must not change, is the whole difference between a toy and a tool. And it is the same principle in every good AI system we build. Let the machine do the heavy lifting, but lock down the parts that have to stay true.',
        ],
      },
    ],
  },
  {
    id: 'short-fashion-house',
    kind: 'short',
    episode: 'Short',
    session: 'Shorts Bank · Real Sauce',
    publish: 'Use anytime',
    pillar: 'STORY',
    title: 'We Dressed a Fashion House in AI',
    hook: 'We ran a whole faith apparel house on AI, and it still feels completely handmade. That tension is the entire point.',
    directorNote:
      'Warm, a little reverent about the brand. This is proof that AI and soul are not opposites when you hold the tools right. Show the storefront and a piece of the daily art.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'We run a whole faith apparel house on AI, and it still feels completely handmade. People think those two things fight each other. Held right, they do not.',
        ],
      },
      {
        heading: 'What the Machine Does',
        paragraphs: [
          'The storefront, the product pages, the operations that keep it all moving, a lot of that is run by systems. There is even a little engine that writes and makes a daily piece of art and encouragement, and posts it, on its own, every morning.',
          '(Show the live storefront, then a piece of the daily devotional art appearing.)',
        ],
      },
      {
        heading: 'The Point',
        paragraphs: [
          'Here is why that matters. Every hour the machine takes off the founder is an hour she gets to spend on the meaning, the message, the actual craft of the thing. The AI does not replace the soul of the brand. It clears the busywork so there is room for the soul. That is the whole trick, in every business. Let the tools carry what does not need you, so you can carry what does.',
        ],
      },
    ],
  },
  {
    id: 'short-command-center',
    kind: 'short',
    episode: 'Short',
    session: 'Shorts Bank · Real Sauce',
    publish: 'Use anytime',
    pillar: 'SYSTEMS',
    title: 'The Free Thing Worth the Most',
    hook: 'The single most valuable thing I hand a client is the one I do not charge for.',
    directorNote:
      'Plain and a little proud. Show the command center screen with real-feeling activity landing on it. The generosity is the hook, so do not undersell it.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'The single most valuable thing I hand a business is the one thing I do not charge for. It is a command center.',
        ],
      },
      {
        heading: 'What It Is',
        paragraphs: [
          'One screen. Every call your receptionist answers, transcribed. Every lead your website brings in. Every message, your reviews, your traffic, your money, all in one place you can check from your phone in the truck.',
          '(Screen record: a live dashboard, a new lead sliding in, a call transcript opening, all on a phone.)',
        ],
      },
      {
        heading: 'Why Free',
        paragraphs: [
          'I include it free with any website or receptionist I build, and people do not believe me. Here is why I do it. A website that just sits there is a brochure. A website wired into a command center is a business you can actually run. I would rather build you the second kind. Fewer apps, nothing falls through the cracks, and your whole front door fits in your pocket.',
        ],
      },
    ],
  },
  {
    id: 'ad-watch-how-fast',
    kind: 'ad',
    episode: 'Ad 19',
    session: 'Meta · Reel 9:16',
    publish: 'Build-in-public · authority',
    pillar: 'ADS',
    title: 'Watch How Fast We Build',
    hook: 'Give me one sentence about your business, and I will have a working demo of it built by morning.',
    directorNote:
      'Confident, a little bit of a flex, but earned. This is a build-in-public proof ad. The speed is the whole message, so keep the pace quick and let the finished demo be the mic drop.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Give me one sentence about your business, and I will have a working demo of it built by morning. Not a mockup. A real website and an AI receptionist you can actually call.',
        ],
      },
      {
        heading: 'The Proof',
        paragraphs: [
          'My studio builds these overnight, forged from your own trade and your own reviews, so it already sounds like you. It took my systems about a minute to make the last one.',
          '(Fast build montage: a sentence typed, a website assembling itself, a phone calling the receptionist and it answering. Mr. Mustard slaps a big BUILT stamp on it.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'Then you open it, you try to break it, and you decide. No contract, nobody chasing you. Want to see yours. The link is below. I am Sarah, Modern Mustard Seed.',
        ],
      },
    ],
  },
  {
    id: 'ad-studio-behind-studio',
    kind: 'ad',
    episode: 'Ad 20',
    session: 'Meta · Reel 9:16',
    publish: 'Build-in-public · authority',
    pillar: 'ADS',
    title: 'The Studio Behind the Studio',
    hook: 'Everything you are about to see, we built ourselves. The receptionist, the website, the dashboard, even the studio this was filmed in.',
    directorNote:
      'Meta and proud. The reveal that the studio itself is one of the builds is the punch. Gesture at your own setup on the last beat so it lands that this is all homemade.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Everything you are about to see, we built ourselves. The AI receptionist. The website. The command center. Even the studio this video was filmed in.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'We are a small studio in Montana that builds the systems that run a business, and we build them for our own companies first. So when I hand you one, it is not a theory. It is the exact thing keeping my own lights on.',
          '(Quick cuts of each build, ending on Sarah gesturing at the actual recording setup around her. Mr. Mustard peeks out from behind the camera.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'If you want the machine without spending two years learning to build it, that is the whole job. Come see what we would build for you. The link is below.',
        ],
      },
    ],
  },
];

/** MORE real sauce (round two): interactive tools, the Switchboard, the callable
 *  voice line, the Gleaner, the World game, the self-drawing comic. Same lingo. */
const MORE_SAUCE: PrompterScript[] = [
  {
    id: 'build-tools-that-sell',
    kind: 'episode',
    episode: 'Episode 12',
    session: 'How We Build',
    publish: 'Use anytime',
    pillar: 'SYSTEMS',
    title: 'The Best Marketing Is a Tool People Want to Use',
    hook: 'The best ad we ever made was not an ad. It was a little calculator that showed a roofer what his missed calls were costing him. He could not stop playing with it, and by the time he was done, he had sold himself.',
    directorNote:
      'Teach this like a secret you are happy to give away. The calculator story is the hook, so let it breathe. The (parens) beats are where I drop in a screen recording of one of our real interactive tools running. Land the "what one number would your customer love to know" question, that is the takeaway.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'The single best piece of marketing my studio has ever made was not an ad. It was a little calculator. It asked a roofing owner three questions and then showed him, in real dollars, what his missed calls were quietly costing him every month. He could not stop moving the sliders. And by the time he was done playing, he had sold himself, and I had not said a word.',
          'I want to show you why that works, because it is the cheapest and most honest marketing there is, and you can build it for your own business this week.',
        ],
      },
      {
        heading: 'Ads Interrupt, Tools Invite',
        paragraphs: [
          'Here is the whole idea. An ad interrupts someone to talk about you. A tool invites someone to learn about themselves. One of those feels like being sold to. The other one feels like a gift. Guess which one people actually use, and share, and remember.',
          'When you give someone a tool that tells them something true about their own business, you are not pitching. You are being useful. And useful is the most persuasive thing on earth.',
        ],
      },
      {
        heading: 'The Machine Behind the Machine',
        paragraphs: [
          'So we build these into everything. On a demo site, there is a little estimator, we call it the ballpark machine, that gives a visitor a real ballpark number for their job in about ten seconds. On our website there is an audit that grades your site and hands you the fix list. There is even a calculator that turns your missed calls into a yearly dollar leak you can feel.',
          'Every one of them does the same job. It gives a stranger a reason to touch your business, and it turns curiosity into a real lead, without ever feeling like a sales pitch.',
          '(Screen record: a visitor sliding the missed-call calculator, the ballpark estimator spitting out a number, an audit grading a site. Mr. Mustard cranks a little lever labeled INTEREST.)',
        ],
      },
      {
        heading: 'How We Build Them Fast',
        paragraphs: [
          'And this is the part that changed everything. Building a custom interactive tool used to be a real software project, weeks of work. Now I describe the tool I want, an agent builds it, and it goes live on the page. The cost of making a useful little thing collapsed, which means you can afford to make one for every kind of customer you have.',
          'The tool does not replace your sales. The tool is your best salesperson, working every hour, never pushy, always helpful.',
        ],
      },
      {
        heading: 'Your Homework',
        paragraphs: [
          'So here is the question I want you to sit with. What is the one number your customer would secretly love to know about themselves, that you could show them. What their old website is costing them. How much they are leaving on the table. What their project would ballpark at.',
          'Find that number, and build the little tool that hands it to them. That tool will outsell every ad you could ever run. I am Sarah, this is Modern Mustard Seed, and the link is below.',
        ],
      },
    ],
  },
  {
    id: 'short-switchboard',
    kind: 'short',
    episode: 'Short',
    session: 'Shorts Bank · Real Sauce',
    publish: 'Use anytime',
    pillar: 'SYSTEMS',
    title: 'How One AI Answers for Fifty Locations',
    hook: 'A franchise with fifty locations has one nightmare. Fifty phones, and fifty different ways to drop the ball.',
    directorNote:
      'Show the command board lighting up with locations. This is a scale story, so let the "built once, runs everywhere" line land with a little awe.',
    sections: [
      {
        heading: 'The Nightmare',
        paragraphs: [
          'A business with fifty locations has one quiet nightmare. Fifty phones, fifty front desks, and fifty different ways to drop a customer. Every location is a place where a call gets missed and a sale walks out the door.',
        ],
      },
      {
        heading: 'The Switchboard',
        paragraphs: [
          'So we built one AI concierge that answers for all of them. It knows each location hours and services, it books the job at the right one, and it routes the call like a front desk that never sleeps and never calls in sick.',
          '(Show a command board of the whole chain, each location lighting up as calls land and get handled.)',
        ],
      },
      {
        heading: 'The Point',
        paragraphs: [
          'And the owner watches the whole chain work from one screen. Built once, running everywhere. That is the thing about good systems. You solve the problem a single time, and then it holds for one location or a hundred. The work does not multiply. The leverage does.',
        ],
      },
    ],
  },
  {
    id: 'short-call-the-demo',
    kind: 'short',
    episode: 'Short',
    session: 'Shorts Bank · Real Sauce',
    publish: 'Use anytime',
    pillar: 'BUILD',
    title: 'This Demo Has a Phone Number',
    hook: 'Most demos you look at. This one you call.',
    directorNote:
      'Playful and confident. If you can, actually put a real number on screen and let the call be live. The proof is that it is a real phone call, not a video.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Most demos, you look at. This one, you call. We forge a real AI receptionist for a business, give it a real phone number, and let them dial it right then and there.',
        ],
      },
      {
        heading: 'The Proof',
        paragraphs: [
          'It already knows their services and their hours and speaks like someone who works there. So the pitch is not a slideshow and it is not a promise. It is their future front desk, answering the phone, live, while they are still deciding whether to believe me.',
          '(Put a real number on screen. Call it on camera and let the agent answer, unedited.)',
        ],
      },
      {
        heading: 'The Point',
        paragraphs: [
          'Nothing beats a thing you can actually touch. A demo you can hold in your hand does the convincing that a thousand words cannot. So whatever you sell, find the version of it that a stranger can try in one minute, and put that in front of them first.',
        ],
      },
    ],
  },
  {
    id: 'short-gleaner',
    kind: 'short',
    episode: 'Short',
    session: 'Shorts Bank · Real Sauce',
    publish: 'Use anytime',
    pillar: 'SYSTEMS',
    title: 'The Money Already Sitting in Your Business',
    hook: 'Before I sell a business anything new, I find the money they already have.',
    directorNote:
      'Practical and a little bit like a treasure hunt. This one is pure value, no pitch. The reveal that most businesses leak money out the back is the hook.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Before I ever sell a business something new, I go find the money they already have. Because most businesses are leaking cash out the back door long before they need anything at the front.',
        ],
      },
      {
        heading: 'What It Finds',
        paragraphs: [
          'We built a system for this. It combs through the old leads that never got a second call, the quotes that got sent and never followed up, the customers who quietly drifted away. And it surfaces the revenue that is just sitting there, already earned, waiting for someone to notice.',
          '(Screen record: a list of dormant leads and unfollowed quotes surfacing, with a running dollar total climbing.)',
        ],
      },
      {
        heading: 'The Point',
        paragraphs: [
          'Almost every owner is sitting on a pile of money they forgot about. The follow-up they never sent. The regular who has not been back in a year. You do not always need more leads. Sometimes you just need to stop letting the ones you already earned slip away.',
        ],
      },
    ],
  },
  {
    id: 'short-world-game',
    kind: 'short',
    episode: 'Short',
    session: 'Shorts Bank · Real Sauce',
    publish: 'Use anytime',
    pillar: 'STORY',
    title: 'We Built a Video Game to Explain What We Do',
    hook: 'We built a little video game where you fly a seaplane over a lake, chasing mustard seeds. On purpose.',
    directorNote:
      'Delighted and unashamed about the whimsy. This is a short about joy as strategy. Show a clip of the actual game. Smile the whole way through.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'We built a little video game where you fly a seaplane over a lake, chasing mustard seeds. On purpose. For the company.',
        ],
      },
      {
        heading: 'Why',
        paragraphs: [
          'Because sometimes the best way to explain what you believe is to let someone play it instead of read it. You fly around, you gather the seeds, and at the end it says, plant your seed. Nobody forgets that. Nobody scrolls past that.',
          '(Show a clip of the actual game, the little clay plane banking over the water, seeds glinting.)',
        ],
      },
      {
        heading: 'The Point',
        paragraphs: [
          'Delight is a strategy. People remember what they got to touch, and they share what made them smile. Everyone else is making another boring ad. You can make the thing people actually want to send to a friend. That is not a waste of time. That is the whole game.',
        ],
      },
    ],
  },
  {
    id: 'short-comic',
    kind: 'short',
    episode: 'Short',
    session: 'Shorts Bank · Real Sauce',
    publish: 'Use anytime',
    pillar: 'STORY',
    title: 'Our Brand Draws Its Own Comic',
    hook: 'Our little mascot has a comic strip. And most weeks, we do not draw it.',
    directorNote:
      'Charming and a bit tickled by it. Show a real strip. The lesson, that your business already generates stories, is the useful part.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Our little mascot has his own comic strip. And here is the funny part. Most weeks, we do not actually draw it.',
        ],
      },
      {
        heading: 'How',
        paragraphs: [
          'We built a system that takes the real work we did that week, the thing we shipped, the client we helped, and turns it into a comic strip on its own. Content that makes itself, out of the work we were already doing anyway.',
          '(Show a real strip appearing panel by panel, drawn from a real build that week.)',
        ],
      },
      {
        heading: 'The Point',
        paragraphs: [
          'Here is the thing most owners miss. Your business generates stories every single day. The save, the fix, the win, the funny mess. You are not short on content. You are short on a system that turns what already happened into something people want to watch. Build that, and you never stare at a blank page again.',
        ],
      },
    ],
  },
  {
    id: 'ad-tool-that-sells',
    kind: 'ad',
    episode: 'Ad 21',
    session: 'Meta · Reel 9:16',
    publish: 'Build-in-public · authority',
    pillar: 'ADS',
    title: 'The Tool That Sells for You',
    hook: 'The best salesperson in my business is a calculator. It never sleeps, it never pushes, and people thank me for it.',
    directorNote:
      'A little playful flex on the calculator being the best closer. Show a visitor using a real interactive tool and turning into a lead. Keep it quick.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'The best salesperson in my whole business is a calculator. It never sleeps, it never pushes, and people actually thank me for it.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'We build the little interactive tool that turns a curious visitor on your website into a real lead. A quick estimate, an instant answer, a number they wanted to know. They get something useful, and you get someone who just raised their hand.',
          '(A visitor pokes at a slick on-site calculator, gets a number, and their contact drops into the owner dashboard. Mr. Mustard rings a tiny sold bell.)',
        ],
      },
      {
        heading: 'CTA',
        paragraphs: [
          'It works every hour, on your site, without you. Want one built for your business. The link is below. I am Sarah, Modern Mustard Seed.',
        ],
      },
    ],
  },
];

/** Episodes, how-we-build batches, Sales Desk, Meta Ads, Shorts bank, Origin batch. */
export const PROMPTER_SCRIPTS: PrompterScript[] = [...GENERATED, ...BEHIND_THE_BUILD, ...MORE_SAUCE, ...SALES_DESK, ...META_ADS, ...TIGHT_CUTS, ...ORIGIN];

/**
 * A whole paragraph wrapped in parentheses is DIRECTION, not a spoken line.
 * Mid-sentence parentheticals (spoken asides) do not match. Single source of
 * truth for both the prompter render and the spoken-word math.
 */
export function isDirectionLine(p: string): boolean {
  const t = p.trim();
  return t.length > 2 && t.startsWith('(') && t.endsWith(')');
}

export function scriptWordCount(s: PrompterScript): number {
  return s.sections
    .flatMap((sec) => sec.paragraphs)
    .filter((p) => !isDirectionLine(p)) // direction is not spoken
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Spoken-delivery estimate at ~140 wpm, returned in seconds. */
export function scriptEstSeconds(s: PrompterScript): number {
  return Math.round((scriptWordCount(s) / 140) * 60);
}

export function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const sec = Math.max(0, Math.round(totalSeconds % 60));
  return `${m}:${String(sec).padStart(2, '0')}`;
}
