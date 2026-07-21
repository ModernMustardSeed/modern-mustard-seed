export type PrompterScript = {
  id: string;
  episode: string;
  session: string;
  publish: string;
  pillar: 'BUILD' | 'SYSTEMS' | 'STEWARD' | 'STORY';
  title: string;
  hook: string;
  directorNote: string;
  sections: { heading: string; paragraphs: string[] }[];
};

export const PROMPTER_SCRIPTS: PrompterScript[] = [
  {
    id: 'age-of-agentic-building',
    episode: 'Episode 1',
    session: 'Session A · Sat 8/8',
    publish: 'Publishes Tue 8/18',
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
    episode: 'Episode 2',
    session: 'Session B · Sat 8/15',
    publish: 'Publishes Tue 8/25',
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
    episode: 'Episode 4',
    session: 'Script Bank · record any block',
    publish: 'Publishes Tue 9/8',
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

export function scriptWordCount(s: PrompterScript): number {
  return s.sections
    .flatMap((sec) => sec.paragraphs)
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
