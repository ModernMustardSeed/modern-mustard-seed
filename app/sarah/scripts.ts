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
];

/** Episodes first, then Sales Desk, then Meta Ads, then the Shorts bank. */
export const PROMPTER_SCRIPTS: PrompterScript[] = [...GENERATED, ...SALES_DESK, ...META_ADS, ...TIGHT_CUTS];

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
