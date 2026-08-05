import type { CxcScript } from './scripts';

/**
 * DAILY BREAD: three weeks of on-camera devotionals for the CXC audience.
 *
 * Shape is the locked CXC devotional rule from the voice bible, and it never
 * varies: scripture first, one honest paragraph, one charge. Never a five-point
 * sermon. Every script is The Word / The Honest Part / The Charge, which is
 * what makes them fast to shoot and recognizable as a series.
 *
 * Each runs 45 to 70 seconds, so a single sitting yields a week or more. Every
 * scripture reference is unique across the batch, and none of them repeats a
 * passage used in Eternal Creatures or Mercy and the Need, so a viewer who
 * watches everything never gets the same verse twice.
 *
 * NOTE: the CXC site already serves a written 366-day devotional at /devotional
 * (~/cross-covenant, src/lib/devotionals/2026/*.json) with its own scripture for
 * each calendar day. These are a separate video series on purpose. If the video
 * should ever track the written one day by day, that is a cross-repo wiring job,
 * not a copy and paste.
 */
export const DAILY_BREAD: CxcScript[] = [
  {
    id: 'cxc-dev-made-to-lie-down',
    kind: 'devotional',
    episode: 'Devotional 01',
    session: 'Daily Bread · Week One',
    publish: 'Day 1',
    pillar: 'COMFORT',
    title: 'He Makes Me Lie Down',
    hook: 'Read the verb. He makes me lie down.',
    directorNote: 'Open the series calm and unhurried. Whatever pace feels right, go one notch slower.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Psalm 23. The Lord is my shepherd. I shall not want. He makes me lie down in green pastures. He leads me beside still waters.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Read the verb. He makes me lie down. Not He suggests it. Not He offers it once my schedule clears.',
          'Some of us will not stop until we are made to, and God knows that about us. Rest is not the reward for finishing. It is part of being led.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Let yourself be made to lie down today. The work will still be there. So will He.'],
      },
    ],
  },
  {
    id: 'cxc-dev-gentle-and-lowly',
    kind: 'devotional',
    episode: 'Devotional 02',
    session: 'Daily Bread · Week One',
    publish: 'Day 2',
    pillar: 'COMFORT',
    title: 'Gentle and Lowly',
    hook: 'A yoke is still work. He does not offer you an empty life.',
    directorNote: 'Warm. Slow down on "gentle and lowly in heart" and let it land as a description of a person, not a phrase.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Matthew 11. Come to me, all who labor and are heavy laden, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and lowly in heart.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'A yoke is still work. He does not offer you an empty life. He offers you His pace and His company instead of yours.',
          'And notice how He describes Himself. Not impressive. Not demanding. Gentle and lowly. That is the character of the one asking for your day.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Hand Him the heaviest thing you are carrying before you touch anything else today.'],
      },
    ],
  },
  {
    id: 'cxc-dev-near-the-brokenhearted',
    kind: 'devotional',
    episode: 'Devotional 03',
    session: 'Daily Bread · Week One',
    publish: 'Day 3',
    pillar: 'COMFORT',
    title: 'Near to the Brokenhearted',
    hook: 'We assume God is nearest when we are doing well. The verse says the opposite.',
    directorNote: 'Someone is watching this one flattened. No brightness in the delivery, just steadiness.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: ['Psalm 34. The Lord is near to the brokenhearted and saves the crushed in spirit.'],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'We assume God is nearest when we are doing well. The verse says the opposite. Nearness is not a prize for holding it together.',
          'If today is one of the flattened ones, you are not further from Him than you were last week. By this verse you are closer.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Do not clean yourself up before you pray. Come as you actually are.'],
      },
    ],
  },
  {
    id: 'cxc-dev-peace-that-guards',
    kind: 'devotional',
    episode: 'Devotional 04',
    session: 'Daily Bread · Week One',
    publish: 'Day 4',
    pillar: 'SCRIPTURE',
    title: 'Peace That Guards',
    hook: 'That word guard is a military word. A garrison posted at a gate.',
    directorNote: 'Teaching register. The reveal is that peace here is a sentry, not a mood, so hit that turn.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Philippians 4. Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'That word guard is a military word. A garrison posted at a gate. Peace here is not a mood, it is a sentry.',
          'And notice what you are asked to do with the anxiety. Not suppress it. Not explain it away. Hand it over, item by item.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: [
          'Name one specific thing you are afraid of and say it out loud to Him today. Not the general worry. The specific one.',
        ],
      },
    ],
  },
  {
    id: 'cxc-dev-lean-not',
    kind: 'devotional',
    episode: 'Devotional 05',
    session: 'Daily Bread · Week One',
    publish: 'Day 5',
    pillar: 'SCRIPTURE',
    title: 'What You Lean On',
    hook: 'Leaning is what you do without thinking about it.',
    directorNote: 'Plain and practical. This one is advice more than comfort, so keep it brisk.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Proverbs 3. Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge Him, and He will make straight your paths.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Leaning is what you do without thinking about it. It is the thing you put your weight on when you are tired.',
          'Most of us lean on our own read of the situation, and our read is assembled from a very small window.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Take the decision you feel most confident about this week and pray over it anyway.'],
      },
    ],
  },
  {
    id: 'cxc-dev-be-strong',
    kind: 'devotional',
    episode: 'Devotional 06',
    session: 'Daily Bread · Week One',
    publish: 'Day 6',
    pillar: 'WITNESS',
    title: 'Courage Is Commanded',
    hook: 'Courage is commanded here, which is strange until you see the reason attached to it.',
    directorNote: 'More energy than the rest of week one. This is the one somebody plays before a hard meeting.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Joshua 1. Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Courage is commanded here, which is strange until you see the reason attached to it. The command is not be brave because you are capable. It is be brave because of who goes with you.',
          'Joshua was about to walk into something enormous with no promise about how it would feel.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Do the brave thing before you feel brave. The feeling was never the prerequisite.'],
      },
    ],
  },
  {
    id: 'cxc-dev-be-still',
    kind: 'devotional',
    episode: 'Devotional 07',
    session: 'Daily Bread · Week One',
    publish: 'Day 7',
    pillar: 'SCRIPTURE',
    title: 'Be Still',
    hook: 'We quote this like a spa line. In context it is spoken over a war.',
    directorNote: 'Correcting a misreading, so start almost wry and end genuinely still. Close week one quiet.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: ['Psalm 46. Be still, and know that I am God.'],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'We quote this like a spa line. In context it is spoken over a war, nations raging, the earth giving way.',
          'Stillness is not what you do when life is calm. It is what you do when it is not, because the alternative is to keep grabbing at controls that were never yours.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Sit for two minutes today with nothing in your hands. That is the whole assignment.'],
      },
    ],
  },
  {
    id: 'cxc-dev-power-in-weakness',
    kind: 'devotional',
    episode: 'Devotional 08',
    session: 'Daily Bread · Week Two',
    publish: 'Day 8',
    pillar: 'MERCY',
    title: 'Made Perfect in Weakness',
    hook: 'Paul asked three times and God said no, then told him why.',
    directorNote: 'Personal without being confessional. The reframe in the last honest line is the whole point.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Second Corinthians 12. My grace is sufficient for you, for my power is made perfect in weakness.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Paul asked three times for the thorn to be removed and God said no, and then told him why. The weakness was not in the way of the power. It was the place the power showed up.',
          'That reframes the very thing you have been asking Him to take away.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Stop hiding the weak place. It may be the exact door He is coming through.'],
      },
    ],
  },
  {
    id: 'cxc-dev-walk-and-not-faint',
    kind: 'devotional',
    episode: 'Devotional 09',
    session: 'Daily Bread · Week Two',
    publish: 'Day 9',
    pillar: 'COMFORT',
    title: 'Walk and Not Faint',
    hook: 'Notice where the list ends. Not every season is soaring.',
    directorNote: 'For the person in a long slog. Do not oversell the eagle line; the reel belongs to the walking one.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Isaiah 40. They who wait for the Lord shall renew their strength. They shall mount up with wings like eagles. They shall run and not be weary. They shall walk and not faint.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Waiting is the most hated verb in the Christian life, and it is the one the strength is attached to.',
          'Notice where the list ends. It ends at walking. Not every season is soaring. Some days the promise is only that you will not faint, and that is still a promise.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['If today is a walking day, walk. Do not despise it for not being a flying one.'],
      },
    ],
  },
  {
    id: 'cxc-dev-walk-humbly',
    kind: 'devotional',
    episode: 'Devotional 10',
    session: 'Daily Bread · Week Two',
    publish: 'Day 10',
    pillar: 'WITNESS',
    title: 'The Third Verb',
    hook: 'Three verbs, and the third one governs the other two.',
    directorNote: 'Slightly pointed. Say the line about doing justice loudly without smiling through it.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Micah 6. He has told you, O man, what is good, and what does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Three verbs, and the third one governs the other two. Plenty of people do justice loudly and walk humbly with nobody.',
          'The requirement is not complicated. It is just impossible to fake for very long.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Do one just thing today that nobody will ever find out about.'],
      },
    ],
  },
  {
    id: 'cxc-dev-so-no-one-may-boast',
    kind: 'devotional',
    episode: 'Devotional 11',
    session: 'Daily Bread · Week Two',
    publish: 'Day 11',
    pillar: 'MERCY',
    title: 'So That No One May Boast',
    hook: 'The reason for the whole design is in the last clause.',
    directorNote: 'Include yourself in the indictment. The wry line about Christians should sound self-aware, never superior.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Ephesians 2. For by grace you have been saved through faith. And this is not your own doing. It is the gift of God, not a result of works, so that no one may boast.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'The reason for the whole design is in the last clause. So that no one may boast.',
          'If any of it were earned there would be a ranking, and we would be unbearable about it. Some of us manage to be unbearable anyway, but the architecture is against us.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Take an honest look at where you are still trying to earn what you were already given.'],
      },
    ],
  },
  {
    id: 'cxc-dev-abide',
    kind: 'devotional',
    episode: 'Devotional 12',
    session: 'Daily Bread · Week Two',
    publish: 'Day 12',
    pillar: 'SCRIPTURE',
    title: 'The Work Under the Work',
    hook: 'A branch does not strain to produce. It stays attached.',
    directorNote: 'The most personally applicable one for a founder. Say the middle line like you have lived it, because you have.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'John 15. I am the vine. You are the branches. Whoever abides in me and I in him, he it is that bears much fruit, for apart from me you can do nothing.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'A branch does not strain to produce. It stays attached, and the fruit is a consequence.',
          'Most of my exhausted seasons have been branch seasons, where I forgot I was attached to anything and tried to manufacture the fruit directly.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Before you produce anything today, stay attached. That is the work under the work.'],
      },
    ],
  },
  {
    id: 'cxc-dev-searched-and-known',
    kind: 'devotional',
    episode: 'Devotional 13',
    session: 'Daily Bread · Week Two',
    publish: 'Day 13',
    pillar: 'COMFORT',
    title: 'Searched and Known',
    hook: 'Being fully known is the thing we want most and hide from hardest.',
    directorNote: 'Tender. Long look at the lens on the last honest line before the charge.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Psalm 139. O Lord, You have searched me and known me. You know when I sit down and when I rise up. Even before a word is on my tongue, behold, O Lord, You know it altogether.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Being fully known is the thing we want most and hide from hardest. Usually because we assume that if someone saw all of it, they would leave.',
          'This verse says He saw all of it first, and stayed.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Tell Him the thing you have not said out loud. He already knows. The saying is for you.'],
      },
    ],
  },
  {
    id: 'cxc-dev-throne-of-grace',
    kind: 'devotional',
    episode: 'Devotional 14',
    session: 'Daily Bread · Week Two',
    publish: 'Day 14',
    pillar: 'MERCY',
    title: 'With Confidence',
    hook: 'With confidence. Not with an apology and not with a hedge.',
    directorNote: 'Strong and clear. This one should sound like permission being handed over.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Hebrews 4. Let us then with confidence draw near to the throne of grace, that we may receive mercy and find grace to help in time of need.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'With confidence. Not with an apology, not with a hedge, not once we feel worthy of the room.',
          'And notice the timing. Grace to help in time of need, which is exactly the moment we feel least entitled to ask for anything.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Ask boldly today for the thing you have been asking for timidly.'],
      },
    ],
  },
  {
    id: 'cxc-dev-count-it',
    kind: 'devotional',
    episode: 'Devotional 15',
    session: 'Daily Bread · Week Three',
    publish: 'Day 15',
    pillar: 'SCRIPTURE',
    title: 'Count Is an Accounting Word',
    hook: 'Count is an accounting word. Nobody is asking you to enjoy this.',
    directorNote: 'The one that refuses to paper over a hard season. Make sure the relief in "nobody is asking you to enjoy this" comes through.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'James 1. Count it all joy, my brothers, when you meet trials of various kinds, for you know that the testing of your faith produces steadfastness.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Count is an accounting word. It is not a feeling, it is a ledger entry. Nobody is asking you to enjoy this.',
          'You are asked to write it down in the column where it actually belongs, which is the one marked useful.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Name what this hard thing is building in you, even if you have to guess at it.'],
      },
    ],
  },
  {
    id: 'cxc-dev-quiet-you-by-his-love',
    kind: 'devotional',
    episode: 'Devotional 16',
    session: 'Daily Bread · Week Three',
    publish: 'Day 16',
    pillar: 'COMFORT',
    title: 'He Will Quiet You',
    hook: 'Most of us can accept that God tolerates us.',
    directorNote: 'The gentlest one in the batch. Do not perform delight, just report it.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Zephaniah 3. The Lord your God is in your midst, a mighty one who will save. He will rejoice over you with gladness. He will quiet you by His love. He will exult over you with loud singing.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Most of us can accept that God tolerates us. On a good day we can believe He loves us. This verse says He is glad about you, out loud.',
          'And tucked in the middle is the quieter promise. He will quiet you by His love. Not by fixing everything first. By loving you until the noise settles.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Let yourself be delighted in today without arguing back.'],
      },
    ],
  },
  {
    id: 'cxc-dev-seek-first',
    kind: 'devotional',
    episode: 'Devotional 17',
    session: 'Daily Bread · Week Three',
    publish: 'Day 17',
    pillar: 'SCRIPTURE',
    title: 'An Order of Operations',
    hook: 'First is not a ranking of importance. It is an order of operations.',
    directorNote: "Practical and quick. This is a working person's devotional, so keep it moving.",
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Matthew 6. But seek first the kingdom of God and His righteousness, and all these things will be added to you.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'First is not a ranking of importance. It is an order of operations. Everything else in that verse is still on the list.',
          'He is not asking you to stop caring about the rest of your life. He is telling you which end to pick it up from.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Give Him the first ten minutes today, not the leftover ones.'],
      },
    ],
  },
  {
    id: 'cxc-dev-cast-it',
    kind: 'devotional',
    episode: 'Devotional 18',
    session: 'Daily Bread · Week Three',
    publish: 'Day 18',
    pillar: 'COMFORT',
    title: 'Cast Is a Violent Little Verb',
    hook: 'Cast is a violent little verb. You throw it.',
    directorNote: 'A bit of humor in the first honest line, then straight. The charge is the memorable part.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: ['First Peter 5. Casting all your anxieties on Him, because He cares for you.'],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Cast is a violent little verb. You throw it. You do not set it down gently nearby and keep an eye on it.',
          'And the reason given is not that He is powerful enough to handle it, though He is. The reason given is that He cares.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Throw it. Then do not go back and pick it up again this afternoon.'],
      },
    ],
  },
  {
    id: 'cxc-dev-create-in-me',
    kind: 'devotional',
    episode: 'Devotional 19',
    session: 'Daily Bread · Week Three',
    publish: 'Day 19',
    pillar: 'MERCY',
    title: 'Create, Not Repair',
    hook: 'David wrote this after the worst thing he ever did. Notice the verb he chose.',
    directorNote: 'Serious, not heavy. Somebody watching this has done something they think is disqualifying.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: ['Psalm 51. Create in me a clean heart, O God, and renew a right spirit within me.'],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'David wrote this after the worst thing he ever did. Notice the verb he chose. Create. Not repair, not tidy up.',
          'He knew he was not asking for maintenance. He was asking for something that had to be made out of nothing, which is the only kind of thing God has ever specialized in.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Stop trying to renovate what needs to be made new. Ask Him for the new thing.'],
      },
    ],
  },
  {
    id: 'cxc-dev-do-not-be-conformed',
    kind: 'devotional',
    episode: 'Devotional 20',
    session: 'Daily Bread · Week Three',
    publish: 'Day 20',
    pillar: 'WITNESS',
    title: 'Conforming Is Passive',
    hook: 'Conforming is passive. It is what happens when you stop paying attention.',
    directorNote: 'Direct and a little challenging. The charge is genuinely actionable, so say it like an assignment.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'Romans 12. Do not be conformed to this world, but be transformed by the renewal of your mind, that by testing you may discern what is the will of God, what is good and acceptable and perfect.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Conforming is passive. It is what happens by default when you stop paying attention, the way water takes the shape of whatever is holding it.',
          'Transformation is the only part that requires a decision, and it starts with what you let into your mind all day long.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Audit one input today. One feed, one voice, one habit of thought.'],
      },
    ],
  },
  {
    id: 'cxc-dev-moved-into-the-neighborhood',
    kind: 'devotional',
    episode: 'Devotional 21',
    session: 'Daily Bread · Week Three',
    publish: 'Day 21',
    pillar: 'WITNESS',
    title: 'He Pitched a Tent Among Us',
    hook: 'Dwelt is a camping word. He pitched a tent among us.',
    directorNote: 'Close the three weeks here. Full and warm. This one can end the series or restart it, so leave it feeling like both.',
    sections: [
      {
        heading: 'The Word',
        paragraphs: [
          'John 1. And the Word became flesh and dwelt among us, and we have seen His glory, glory as of the only Son from the Father, full of grace and truth.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'Dwelt is a camping word. He pitched a tent among us. God did not send instructions from a safe distance, He moved into the neighborhood.',
          'And the last phrase is the whole thing. Full of grace and truth. Most of us can only manage one of those at a time.',
        ],
      },
      {
        heading: 'The Charge',
        paragraphs: ['Be full of both today with one person who needs both.'],
      },
    ],
  },
];
