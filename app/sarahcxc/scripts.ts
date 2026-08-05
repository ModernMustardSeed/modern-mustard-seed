import type { PrompterScript as BaseScript } from '@/components/studio/types';
import { DAILY_BREAD } from './devotionals';

/**
 * CROSS + COVENANT scripts. This file is the whole content side of the CXC
 * studio at /sarahcxc, and it is deliberately sealed off from Modern Mustard
 * Seed: nothing here is imported by app/sarah, by /admin/youtube, or by the
 * YouTube metadata brain. CXC takes go to the `booth-cxc` bucket and publish to
 * CXC surfaces (IG Reels, X), never to the MMS channel.
 *
 * Voice: ~/.claude/skills/design/brands/cxc-voice.md. Reverent, declarative,
 * fashion-literate, no em dashes, no pitch, no product, no link. If a line
 * could hang in any Christian store, it does not belong here.
 */
export type CxcScript = BaseScript & {
  kind: 'reel' | 'anchor' | 'devotional';
  pillar: 'SCRIPTURE' | 'WITNESS' | 'COMFORT' | 'MERCY';
};

/**
 * The Eternal Creatures batch: the instinct that animals feel eternal, held the
 * way Scripture holds it. Off Isaiah 11, Isaiah 65, Romans 8, the C.S. Lewis
 * longing argument, and a mortality counterweight.
 *
 * DOCTRINE POSTURE, load-bearing for every script in this batch and not to be
 * softened by a later edit: creation is included in redemption, the details are
 * NOT spelled out, the hope is real. Nothing here promises a specific animal is
 * in heaven. CXC 6 and CXC 7 name that gap out loud on purpose, because a
 * comfort that has to be invented does not survive contact with real grief.
 */
const ETERNAL_CREATURES: CxcScript[] = [
  {
    id: 'cxc-kingdom-full-of-animals',
    kind: 'reel',
    episode: 'CXC 1 · Reel 9:16',
    session: 'Eternal Creatures',
    publish: 'Use anytime',
    pillar: 'SCRIPTURE',
    title: 'When God Paints the Kingdom',
    hook: 'When God paints the kingdom, He fills it with animals.',
    directorNote:
      'Face to camera, window light, no music under the opening line. This one teaches, it does not comfort. Let the list of creatures build and take a real breath before the last line. Vertical, framed slightly off-center with room above your head for the caption bar.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['When God paints the kingdom, He fills it with animals.'],
      },
      {
        heading: 'Isaiah 11',
        paragraphs: [
          'Read Isaiah 11 slowly. The prophet is describing the reign of the Messiah, the thing faithful Israel waited centuries for.',
          'And almost every line of it is creatures. Wolf dwelling with lamb. Leopard lying down with the young goat. Calf and young lion together. A cow and a bear grazing while their young lie down side by side.',
          '(Cut here to the wolf and lamb line set in Playfair on cream, held for two seconds, while the voice keeps going.)',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'He could have described thrones and courts and crowns. He described a field at peace.',
          'That is the picture the Spirit chose. He chose it on purpose.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: ['Whatever heaven is, it is not emptier than earth.'],
      },
    ],
  },
  {
    id: 'cxc-lion-still-eats',
    kind: 'reel',
    episode: 'CXC 2 · Reel 9:16',
    session: 'Eternal Creatures',
    publish: 'Use anytime',
    pillar: 'SCRIPTURE',
    title: 'The Lion Still Eats',
    hook: 'In Isaiah 11 the lion is still a lion. He just eats straw.',
    directorNote:
      'The shortest one in the batch and the most quotable. Flat, certain delivery. No warmth needed here, this is a point being made. Works as voiceover over b-roll if a face-to-camera take feels heavy.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['In Isaiah 11 the lion is still a lion. He just eats straw.'],
      },
      {
        heading: 'The Point',
        paragraphs: [
          'That detail matters far more than it looks. Redemption does not erase what a creature is. It ends what a creature had to do to survive.',
          'The lion is not turned into something else. The bear still grazes. The wolf keeps his teeth. He simply stops needing them.',
          '(Slow push in through this line. No cut.)',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Nothing in that vision is deleted. Everything in it is healed.',
          'That is what God does with a broken world. He does not replace it. He mends it.',
        ],
      },
    ],
  },
  {
    id: 'cxc-creation-groans',
    kind: 'reel',
    episode: 'CXC 3 · Reel 9:16',
    session: 'Eternal Creatures',
    publish: 'Use anytime',
    pillar: 'SCRIPTURE',
    title: 'The Groaning Was Never Only Ours',
    hook: 'Paul says creation groans. Not us groaning about creation. Creation.',
    directorNote:
      'Teaching register, a little more energy than the rest of the batch. The whole reel turns on the word "itself" in the second section, so hit it. Outdoors if the weather cooperates, wide sky behind you.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['Paul says creation groans. Not us groaning about creation. Creation.'],
      },
      {
        heading: 'Romans 8',
        paragraphs: [
          'Romans 8. The whole creation waits with eager longing. It was subjected to futility, and not by its own choice. And it groans together right up to now.',
          'Read it again slowly, because most of us read it as people complaining about a broken world. That is not what it says. The world itself is the one groaning.',
          'Every animal that has ever suffered something it did not deserve sits inside that sentence.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Paul does not hand us the mechanics of how that resolves. He hands us the direction. What broke alongside us is being repaired alongside us.',
          'The rescue was always wider than us.',
        ],
      },
    ],
  },
  {
    id: 'cxc-ache-is-not-a-mistake',
    kind: 'reel',
    episode: 'CXC 4 · Reel 9:16',
    session: 'Eternal Creatures',
    publish: 'Use anytime',
    pillar: 'WITNESS',
    title: 'The Ache Is Not a Mistake',
    hook: 'The ache you feel looking at your dog may not be a mistake.',
    directorNote:
      "Warmest one in the batch. If a dog will sit with you in frame, do it, and let yourself look at the animal on the line about a dog's face. The pause after \"and then we look away\" is the whole reel. Do not rush it.",
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['The ache you feel looking at your dog may not be a mistake.'],
      },
      {
        heading: 'Lewis',
        paragraphs: [
          'C.S. Lewis argued that a longing nothing in this world can satisfy is evidence rather than error.',
          'We are quick to apologize for how we love animals. We call it silly. We call it projection. We say we know better, and then we look away.',
          "But the sense that something permanent is looking back at you through a dog's face might be an accurate read on what love is, rather than a confused read on what a dog is.",
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Scripture never once scolds a person for loving a creature.',
          'The instinct is old. And it is pointed somewhere real.',
        ],
      },
    ],
  },
  {
    id: 'cxc-short-life-whole-heart',
    kind: 'reel',
    episode: 'CXC 5 · Reel 9:16',
    session: 'Eternal Creatures',
    publish: 'Use anytime',
    pillar: 'WITNESS',
    title: 'Short Life, Whole Heart',
    hook: "Part of what makes a dog's love astonishing is that it is not eternal.",
    directorNote:
      'The counterweight to the rest of the batch, and the one that keeps the whole set from tipping into sentiment. Deliver it as an observation, not a consolation. Steady, almost matter of fact, until the last line.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ["Part of what makes a dog's love astonishing is that it is not eternal."],
      },
      {
        heading: 'The Math',
        paragraphs: [
          'Ten years. Maybe fourteen. No promises, no guarantees, no assurance of anything past dinner.',
          'And inside that short window an animal gives you everything it has, every single day, without ever weighing whether you have earned it.',
          'Mortality does not cheapen that. Mortality is what makes it a miracle. Something with almost no time decided to spend all of it on you.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'It runs the same direction as grace, which never asked whether we had earned it either.',
          'A short life spent entirely on love is not a small thing.',
        ],
      },
    ],
  },
  {
    id: 'cxc-if-you-buried-something',
    kind: 'reel',
    episode: 'CXC 6 · Reel 9:16',
    session: 'Eternal Creatures',
    publish: 'Use anytime',
    pillar: 'COMFORT',
    title: 'If You Buried Something Recently',
    hook: 'If you buried something recently, this one is for you.',
    directorNote:
      'The most careful script in the batch. Slower than feels natural. No music for the first fifteen seconds. Do not smile through it and do not soften the line about what Scripture does not say, because that honesty is exactly what makes the rest land. Someone is watching this on the worst week of their year. If a take feels performed, cut it and start over.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['If you buried something recently, this one is for you.'],
      },
      {
        heading: 'Isaiah 65',
        paragraphs: [
          'The new earth in Isaiah 65 has addresses. People build houses and live in them. They plant vineyards and eat the fruit. Children are not born for calamity.',
          'And in the same passage, in the same breath, the wolf and the lamb feed together and the lion eats straw like the ox.',
          'Isaiah does not park the animals in a footnote at the edge of the vision. They are inside the human promise, sharing the paragraph with houses and vineyards and long life.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'I am not going to tell you something Scripture does not say. There is no verse promising you will see your dog again.',
          'But every time the prophets reach for a picture of the world set right, creatures are in the frame. That is not nothing. That is a great deal.',
          '(Hold on your face here for a beat before the close. No cut, no music swell.)',
        ],
      },
      {
        heading: 'Close',
        paragraphs: ['The hope is not sentimental. It is just wider than we were taught.'],
      },
    ],
  },
  {
    id: 'cxc-animals-and-eternity-long',
    kind: 'anchor',
    episode: 'CXC 7 · Anchor',
    session: 'Eternal Creatures',
    publish: 'Anchor piece',
    pillar: 'SCRIPTURE',
    title: 'What Scripture Actually Says About Animals and Eternity',
    hook: 'Almost everyone who has loved an animal has had the same thought standing in a backyard with a shovel.',
    directorNote:
      'The anchor. Everything else in this batch is a doorway into this one. Sit down for it, do not stand. Roughly four minutes, so record it in sections and let the edit stitch them. The credibility of the whole piece rests on the second section, where you say plainly what the Bible does not promise. Say that part without flinching and the rest is trusted.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'Almost everyone who has loved an animal has had the same thought standing in a backyard with a shovel. And almost everyone is embarrassed by it.',
          'I want to take that thought seriously, and I want to hold it carefully. Those are two different jobs, and most answers to this question only manage one of them.',
        ],
      },
      {
        heading: 'What Scripture Does Not Say',
        paragraphs: [
          'So start with the honest part. There is no verse that promises you will see your dog again. None.',
          'Anyone who hands you that certainty is handing you a comfort the Bible did not write, and a comfort that has to be invented will not hold at three in the morning.',
          'I am not going to invent any.',
        ],
      },
      {
        heading: 'What It Does Say',
        paragraphs: [
          'Here is what is actually there. When Isaiah describes the reign of the Messiah in chapter 11, he barely mentions people. Almost the entire vision is animals.',
          'The wolf dwells with the lamb. The leopard lies down with the young goat. The calf and the young lion together, and a little child leading them. The cow and the bear graze while their young lie down side by side. The lion eats straw like the ox.',
          'Now look at those pairs. Every single one is a predator and its prey. Isaiah is not listing pleasant animals. He is naming the oldest violence on earth and calling it off, one pair at a time.',
          "And then a nursing child plays over the cobra's den, and nothing happens. That is how Isaiah measures peace. Not by armies disbanded. Not by treaties signed. By the most defenseless creature alive resting beside the most dangerous one.",
        ],
      },
      {
        heading: 'The Reason Given',
        paragraphs: [
          'Verse 9 gives the reason, and this is the part people skip. They shall not hurt or destroy in all My holy mountain, for the earth shall be full of the knowledge of the Lord as the waters cover the sea.',
          'So the peace is not behavior management. It is not animals trained out of their nature. It is what happens to a world that finally knows God. The creatures are the evidence. He is the cause.',
        ],
      },
      {
        heading: 'Isaiah 65',
        paragraphs: [
          'Isaiah does it again in chapter 65, and this time the setting is unmistakable. New heavens and a new earth. Houses built and lived in. Vineyards planted and eaten from. Children not born for calamity.',
          'And in the same paragraph, the wolf and the lamb feeding together and the lion eating straw.',
          'The animals are not decoration around the human promise. They are inside it.',
        ],
      },
      {
        heading: 'Romans 8',
        paragraphs: [
          'Then Paul. Romans 8 says the whole creation waits with eager longing, that it was subjected to futility not by its own choice, and that it groans together until now.',
          'That is not people groaning about the world. That is the world groaning. And Paul sets it in the same passage as our own adoption, waiting on the same day we are waiting for.',
        ],
      },
      {
        heading: 'The Honest Position',
        paragraphs: [
          'So where does that leave us. Not with certainty, and not with dismissal. Creation is included in redemption. The details are not spelled out. The hope is real.',
          'And notice what is never erased in any of it. The lion still eats. The bear still grazes. Redemption does not turn creatures into something else. It ends what they had to do to survive and lets them stay exactly what they are.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'If you are grieving an animal right now, that is enough to grieve well on. You are not being childish. You are reading the same direction the prophets were already pointing.',
          '(Hold the last frame. Let it sit before the cut.)',
        ],
      },
    ],
  },
];

/**
 * Mercy and the Need: Sarah's own view of Jesus, His mercy, and why we need Him
 * so desperately. The heaviest batch in the booth and the most personal.
 *
 * Written from her established convictions (grace-forward, encounter-centered,
 * honest about need, stewardship not striving) and from the gold-standard site
 * copy that is already hers. Where a lived example would land harder than
 * anything written for her, there is a marked direction beat inviting her own
 * story instead of a fabricated one. NOTHING here invents biography.
 *
 * Held deliberately on common ground: mercy, need, the cost, the character of
 * God. No positions taken on contested doctrine, because that is hers to take
 * and not mine to guess.
 */
const MERCY_AND_NEED: CxcScript[] = [
  {
    id: 'cxc-the-father-runs',
    kind: 'reel',
    episode: 'Mercy 1 · Reel 9:16',
    session: 'Mercy and the Need',
    publish: 'Use anytime',
    pillar: 'MERCY',
    title: 'The Father Runs',
    hook: 'In the whole story, the father is the one who runs.',
    directorNote:
      'Warm and certain. The beat after "Mercy interrupted him" is the reel, so hold it longer than feels comfortable. This is the friendliest door into the whole batch, so it is the one to post first.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['In the whole story, the father is the one who runs.'],
      },
      {
        heading: 'Luke 15',
        paragraphs: [
          'The son has taken the money, spent it on nothing, and come back with a rehearsed speech about being unworthy. He is still a long way off when the father sees him.',
          'And the father does not wait on the porch with his arms folded. He runs. A grown man in that culture, gathering up his robe, running down a road in front of his whole village, because he cannot get to his son fast enough.',
        ],
      },
      {
        heading: 'The Point',
        paragraphs: [
          'The son never finishes the speech. Mercy interrupted him.',
          '(Hold here. Do not rush into the close.)',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'That is the God I actually believe in. Not the one waiting for your apology to be good enough. The one already running.',
        ],
      },
    ],
  },
  {
    id: 'cxc-cost-tells-the-diagnosis',
    kind: 'reel',
    episode: 'Mercy 2 · Reel 9:16',
    session: 'Mercy and the Need',
    publish: 'Use anytime',
    pillar: 'MERCY',
    title: 'What the Cost Tells You',
    hook: 'If a nudge would have fixed us, He would have sent a nudge.',
    directorNote:
      'The most argued one in the batch. Steady and unhurried, like a person laying out evidence rather than winning a point. The three "if" lines build, so do not flatten them.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['If a nudge would have fixed us, He would have sent a nudge.'],
      },
      {
        heading: 'The Question',
        paragraphs: [
          'People ask why the cross. Why something that violent, that final, for a species that mostly just needs to be a little kinder to each other.',
          'Here is how I read it. Look at what it cost to fix, and you learn what was actually wrong.',
        ],
      },
      {
        heading: 'The Evidence',
        paragraphs: [
          'If a good example would have done it, God had prophets, and He sent them for centuries. If better rules would have done it, He had already given the law. If we mostly needed encouragement, He would have sent encouragement.',
          'He came Himself. That is the measure of the problem.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: ['We did not need a coach. We needed a rescue.'],
      },
    ],
  },
  {
    id: 'cxc-came-for-the-sick',
    kind: 'reel',
    episode: 'Mercy 3 · Reel 9:16',
    session: 'Mercy and the Need',
    publish: 'Use anytime',
    pillar: 'MERCY',
    title: 'He Came for the Sick',
    hook: 'Jesus said it plainly. Healthy people do not need a doctor.',
    directorNote:
      'Freeing, not scolding. The last line should sound like relief, not like a warning. If your face is hard on the final take, run it again softer.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['Jesus said it plainly. Healthy people do not need a doctor.'],
      },
      {
        heading: 'Mark 2',
        paragraphs: [
          'The religious crowd was scandalized that He kept eating with the wrong people. His answer is one of the most freeing sentences in the Bible.',
          'Those who are well have no need of a physician, but those who are sick. I came not to call the righteous, but sinners.',
        ],
      },
      {
        heading: 'What That Does',
        paragraphs: [
          'Read what that actually does to the door. It makes the entry requirement admitting you are not fine.',
          'Which means the only people who miss this are the ones who insist that they are.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: ['You do not clean yourself up to come to Him. Coming to Him is where the cleaning starts.'],
      },
    ],
  },
  {
    id: 'cxc-new-every-morning',
    kind: 'reel',
    episode: 'Mercy 4 · Reel 9:16',
    session: 'Mercy and the Need',
    publish: 'Use anytime',
    pillar: 'MERCY',
    title: 'New Every Morning',
    hook: 'Mercy resets every morning because we need it every morning.',
    directorNote:
      'Shoot this one in actual morning light if you can, and let that do half the work. Gentle. This is the reel someone watches on a bad Tuesday.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['Mercy resets every morning because we need it every morning.'],
      },
      {
        heading: 'Lamentations 3',
        paragraphs: [
          'His mercies never come to an end. They are new every morning. Great is Your faithfulness.',
          'Notice the delivery schedule. Not new every year once you finally get it together. Not new after a probation period. New every morning, which tells you something honest about us.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'A person who needed mercy once would have been given it once. We are given it daily, because daily is the rate at which we run out.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: ['You did not use up your share yesterday. There is more of it this morning.'],
      },
    ],
  },
  {
    id: 'cxc-grace-is-not-permission',
    kind: 'reel',
    episode: 'Mercy 5 · Reel 9:16',
    session: 'Mercy and the Need',
    publish: 'Use anytime',
    pillar: 'MERCY',
    title: 'Grace Is Not Permission',
    hook: 'The most common objection to mercy is that it makes people lazy.',
    directorNote:
      'Answer the objection like it is a fair one, because it is. No defensiveness. Land hard on the word "training" and on the final line.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['The most common objection to mercy is that it makes people lazy.'],
      },
      {
        heading: 'The Objection',
        paragraphs: [
          'If forgiveness is free, what stops anyone from doing whatever they want. That is a fair question, and Scripture answers it head on.',
        ],
      },
      {
        heading: 'Titus 2',
        paragraphs: [
          'The grace of God has appeared, bringing salvation, training us to renounce ungodliness and worldly passions and to live self-controlled, upright, godly lives in the present age.',
          'Read that verb. Training. Grace is not a pardon that leaves you exactly where it found you. It is the power to become something.',
          'I have never met anyone genuinely caught by mercy who wanted to go back.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: ['Grace is not permission. It is power.'],
      },
    ],
  },
  {
    id: 'cxc-while-we-were-still',
    kind: 'reel',
    episode: 'Mercy 6 · Reel 9:16',
    session: 'Mercy and the Need',
    publish: 'Use anytime',
    pillar: 'MERCY',
    title: 'Check the Timing',
    hook: 'Check the timing. He did not wait for the apology.',
    directorNote:
      'The whole reel hangs on one word, "still," so say it like it is underlined. Quiet ending, no lift in the voice on the last line. Let it be a statement, not a flourish.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['Check the timing. He did not wait for the apology.'],
      },
      {
        heading: 'Romans 5',
        paragraphs: [
          'God shows His love for us in that while we were still sinners, Christ died for us.',
          'The whole weight of that verse sits in one word. Still.',
        ],
      },
      {
        heading: 'What Still Means',
        paragraphs: [
          'Not once we came around. Not after we cleaned up the obvious things and got sorry enough to mean it. While we were still in the middle of it, with no intention of stopping, He moved first.',
          'Every other kind of love I have known waits to see what you do. This one did not wait at all.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: ['You were not loved because you turned around. You turned around because you were loved.'],
      },
    ],
  },
  {
    id: 'cxc-why-we-need-him',
    kind: 'anchor',
    episode: 'Mercy 7 · Anchor',
    session: 'Mercy and the Need',
    publish: 'Anchor piece',
    pillar: 'MERCY',
    title: 'Why We Need Him So Desperately',
    hook: 'I want to talk about the part of the faith that people find embarrassing.',
    directorNote:
      'The cornerstone of the whole batch and the most personal thing in the booth. Sit down, no notes in frame. There is a marked slot in section two for YOUR example. Do not skip it and do not reach for something dramatic; the true small one is stronger. Record in sections. If a take feels like preaching rather than telling, cut it and start again.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'I want to talk about the part of the faith that people find embarrassing. Not the kindness, not the community, not the good it does in the world. The part where we say you need saving.',
          'Because if that is not true, none of the rest of it matters much. And if it is true, nothing else matters more.',
        ],
      },
      {
        heading: 'The Claim Nobody Likes',
        paragraphs: [
          'Our whole culture is built on the opposite claim. You are basically fine. Try harder, sleep better, unlearn what was done to you, and the good in you will win.',
          'I want that to be true. I have tried it. I have tried being a better version of myself by force, and I can tell you exactly how far that got, which was right up to the moment it became expensive.',
          '(Your own example here. The one you actually lived. It does not have to be dramatic, it has to be true. Thirty to forty seconds.)',
          'Scripture does not call that a discipline problem. It calls it a heart problem. And you cannot fix a heart using the heart that needs the fixing.',
        ],
      },
      {
        heading: 'What the Cost Tells Us',
        paragraphs: [
          'Here is how I know how serious it is. Look at what it cost to fix.',
          'If a good example would have done it, God had prophets, and He sent them for centuries. If better rules would have done it, He had already given the law. If we mostly needed encouragement, He would have sent encouragement.',
          'He came Himself. He took on skin and a body that could be hurt, and He went to a Roman cross on purpose.',
          'You do not pay that for a species that just needs a little polish. The size of the rescue tells you the size of the trouble.',
        ],
      },
      {
        heading: 'The Kind of Mercy This Is',
        paragraphs: [
          'And this is the part that changed everything for me. Mercy is not the same thing as being let off.',
          'Being let off costs the judge nothing. Mercy costs the one who gives it, every single time. Somebody always absorbs it.',
          'Romans 5 says that while we were still sinners, Christ died for us. Still. Not after we came around. Not once we were sorry enough to be worth it. In the middle of it, with our backs turned, He moved first.',
          'And in Luke 15, when the son finally comes home with his rehearsed apology, he never gets to finish it. The father sees him a long way off and runs.',
        ],
      },
      {
        heading: 'The Objection',
        paragraphs: [
          'People hear this and say it sounds like a loophole. If it is free, what stops anyone from doing whatever they want.',
          'Titus 2 answers it. The grace of God has appeared, training us to renounce ungodliness and to live upright lives in the present age. Training. Grace does not leave you where it found you. It is not a pardon, it is a power.',
        ],
      },
      {
        heading: 'What He Actually Asks',
        paragraphs: [
          'So what does He ask of you. Not that you fix yourself first. That is the one thing you cannot do, and He knows it.',
          'Mark 2. Those who are well have no need of a physician, but those who are sick. The entry requirement is admitting you are not fine.',
          'Which means the only people who miss this are the ones who insist they do not need it.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'That is my view of Jesus, and it is not complicated. I do not think He is a life coach with better branding. I think He is the only one who ever looked straight at the worst of me, did not flinch, and did not leave.',
          'You are loved. You are seen. There is a God who knows your name. And He is not waiting on the porch.',
          '(Hold the frame. Do not cut early.)',
        ],
      },
    ],
  },
];

/** Every Cross + Covenant script, in booth order. */
export const CXC_SCRIPTS: CxcScript[] = [...ETERNAL_CREATURES, ...MERCY_AND_NEED, ...DAILY_BREAD];
