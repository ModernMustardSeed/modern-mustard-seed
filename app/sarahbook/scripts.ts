import type { PrompterScript as BaseScript } from '@/components/studio/types';

/**
 * The book studio speaks in the book's own structure: `kind` is the PART (which
 * drives the four tabs) and `pillar` is the one word that chapter is actually
 * about, so a card tells you its subject at a glance.
 */
export type BookScript = BaseScript & {
  kind: 'lens' | 'eternal' | 'practice' | 'beautiful';
  pillar:
    | 'PERSPECTIVE' | 'ATTENTION' | 'CLARITY' | 'PRESENCE'
    | 'FORMATION' | 'SCALE' | 'IDENTITY' | 'HOPE'
    | 'RHYTHM' | 'GRATITUDE' | 'REFRAME' | 'INPUT' | 'JOY'
    | 'BEAUTY' | 'FIRE' | 'LIGHT';
};

/**
 * ETERNAL OPTIMIST: sixteen episodes, one per chapter, pulled from Sarah's book
 * "Eternal Optimist: Walking on Sunshine" (Sarah Schuchts Scarano, 2026).
 *
 * Source: Eternal_Optimist_COMPLETE_MANUSCRIPT.pdf, the May 9 revision. Text was
 * extracted locally with pdftotext; the manuscript was never sent to any outside
 * service.
 *
 * These are adaptations, not readings. Each episode keeps the chapter's thesis,
 * its central illustration, and its scripture, in her own language wherever her
 * language already says it best. Nothing theological has been added that the
 * book does not argue, and nothing biographical appears here that the book does
 * not state.
 *
 * TWO FACTS THIS SERIES RESTS ON, both from the book, both to be handled exactly:
 *   - Her father died when she was nine.
 *   - Her mother, who handed her the piece of paper days after that loss, has
 *     since died. The book's epilogue says she is "dancing in it right now."
 * Do not write either parent as living. Chapter One is the emotional core of the
 * whole series and belongs to them.
 *
 * Grouped by the book's four parts, which the pillar chip shows on every card:
 *   LENS · ETERNAL · PRACTICE · BEAUTIFUL
 */
export const ETERNAL_OPTIMIST: BookScript[] = [
  /* ─────────────────────────── PART ONE: THE LENS ─────────────────────────── */
  {
    id: 'eo-ch01-ten-ninety',
    kind: 'lens',
    episode: 'Chapter One',
    session: 'Part One: The Lens',
    publish: 'Book series',
    pillar: 'PERSPECTIVE',
    title: 'The 10/90 Principle',
    hook: 'My mother handed me a piece of paper when I was nine years old, and it set the direction of my whole life.',
    directorNote:
      'The origin episode and the emotional core of the entire series. Sit down for it. Do not perform the grief and do not rush past it; say it plainly and let the room be quiet. Your father died when you were nine and your mother is gone now too, so this one is a gift to both of them. If a take feels like a lesson instead of a memory, cut it and start again. Record the Joseph section separately if you need to reset.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'My mother handed me a piece of paper when I was nine years old, and it set the direction of my whole life.',
        ],
      },
      {
        heading: 'The Piece of Paper',
        paragraphs: [
          'I was nine when my father died. The world went quiet in a way I did not have words for. Not peaceful quiet. Empty quiet. The kind that has a shape to it, the outline of a person who was just there and is suddenly, incomprehensibly, not.',
          'And my mother, carrying her own unimaginable weight, navigating her own loss and the sudden reality of raising a daughter alone, did something I did not understand until I was grown.',
          'She handed me a piece of paper. A graphic and a short paragraph. A principle that said only ten percent of your life is what happens to you, and the other ninety percent is determined entirely by how you respond.',
          'I did not have the vocabulary for what she was giving me. But something in me received it the way a seed receives soil. Quietly. With no visible evidence that anything had taken root.',
          '(Beat. Let it sit before you say the next line.)',
          'It had taken root.',
        ],
      },
      {
        heading: 'What the Principle Actually Does',
        paragraphs: [
          'Here it is, plain. About ten percent of your life is made up of what actually happens to you. The other ninety percent is how you respond.',
          'It sounds almost insultingly simple. It is one of the most radical ideas in the history of human flourishing, because it relocates your power. It stops placing your wellbeing in the hands of traffic and weather and other people and the diagnosis, and it puts your power back where it actually lives.',
          'You have very little control over the ten percent. You cannot always prevent the diagnosis. You cannot make someone choose to stay. You cannot stop every storm from arriving at your door.',
          'But you have enormous power in the ninety.',
        ],
      },
      {
        heading: 'Joseph',
        paragraphs: [
          'If anyone had justification for living in the ten percent, it was Joseph. Betrayed by his own family. Thrown into a pit. Sold to strangers. Enslaved. Falsely accused. Imprisoned. Forgotten by the man who promised to remember him.',
          'And when the brothers who sold him finally stood trembling in front of him, what came out of his mouth was this. You intended to harm me, but God intended it for good.',
          'Read that slowly, because of what it does not say. It does not say God made the bad thing happen. It does not say it was not really that bad. He said you intended harm, and that part was real, and God was working a purpose so large that even the worst thing you did to me became a thread in something beautiful.',
          'That is not a man who minimized what happened to him. That is a man who mastered his response to it.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Perspective is not a personality type. It is a practice. Something you build, choose, and sometimes fiercely fight for.',
          'My mother did not give me a comfortable life. She gave me something better. She gave me a framework on the worst day of my young life, and it has held me through every fire since.',
          'That is what she handed me. It is what I am handing you.',
          '(Hold. Do not cut early.)',
        ],
      },
    ],
  },
  {
    id: 'eo-ch02-find-what-you-look-for',
    kind: 'lens',
    episode: 'Chapter Two',
    session: 'Part One: The Lens',
    publish: 'Book series',
    pillar: 'ATTENTION',
    title: 'You Find What You Look For',
    hook: 'The coin did not move. What changed was the light in the room and the attention of the woman holding the broom.',
    directorNote:
      'The most teachable episode in Part One and the best one to post as a standalone. The science section should sound delighted, not lecturing. Land hard on "who programmed the scanner."',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'The coin did not move. What changed was the light in the room and the attention of the woman holding the broom.',
        ],
      },
      {
        heading: 'The Woman With the Lamp',
        paragraphs: [
          'There is a woman in a story Jesus told who loses a coin. And when she realizes it is gone she does not sit down in the middle of the floor and conclude that the universe is against her. She lights a lamp. She picks up a broom. And she sweeps every corner of that house until she finds what she is looking for.',
          'The coin was there the whole time, somewhere in the dust and the shadow, waiting. She found it because she looked for it. And she looked for it because she believed it was there to be found.',
        ],
      },
      {
        heading: 'The Searching Eye',
        paragraphs: [
          'There is a system in your brain called the Reticular Activating System. It stands between the ten million bits of information your senses absorb every second and the roughly forty bits your conscious mind can actually process, and it decides what is worth your attention.',
          'It bases that decision almost entirely on what you have told it matters. You decide to buy a red car and suddenly red cars are everywhere. The red cars did not multiply. You taught your brain what to notice.',
          'So your brain is already scanning for something. The only question is who programmed the scanner.',
          'If you have been rehearsing lack, it will find evidence of lack everywhere. If you train your attention on goodness, it will begin to find goodness in places it was invisible before.',
        ],
      },
      {
        heading: 'The Honest Part',
        paragraphs: [
          'I want to say something carefully here, because there is a version of this teaching that becomes spiritual gaslighting.',
          'Sometimes you are not finding the good because the good is genuinely obscured. Grief narrows the visual field, and that is not a failure of faith, that is the mercy of a human system protecting itself. Trauma does it. Bitterness does it.',
          'So do not read this as a verdict on your past. You were not failing to find goodness because you were weak. You may have been looking through a lens that needed cleaning.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'She did not find the coin on the first sweep. Jesus says she swept the whole house, which means she looked in the easy places and came up empty and kept going anyway.',
          'The promise is not that finding will be immediate. The promise is that if you keep seeking, you will find.',
          'Light the lamp. Pick up the broom. Move through this one day with your eyes looking for something worth finding.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch03-dirty-window',
    kind: 'lens',
    episode: 'Chapter Three',
    session: 'Part One: The Lens',
    publish: 'Book series',
    pillar: 'CLARITY',
    title: 'The Dirty Window',
    hook: 'She had been squinting at a garden she could barely see, and somewhere along the way she just accepted that this was what the garden looked like now.',
    directorNote:
      'Your grandmother is in this one, so let the affection show. The four kinds of grime are a list, so vary the pacing or it flattens. "Oh. There it is." should be almost whispered, both times.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'She had been squinting at a garden she could barely see, and somewhere along the way she just accepted that this was what the garden looked like now.',
        ],
      },
      {
        heading: 'The Window',
        paragraphs: [
          'My grandmother had a window in her kitchen that faced the backyard garden. She loved that window. In the mornings she would stand at the sink with her coffee and just look.',
          'One spring I came to visit and found her in her usual spot, but she was squinting. Leaning slightly forward. The garden was the same garden and the light was the same light.',
          'I looked at the window. Months of winter grime. Rain streaks dried into long gray lines. The glass was so filmed over that the garden behind it had gone soft and dull.',
          'We cleaned it. Ten minutes, a bottle of vinegar, an old newspaper. And when we were done she stood there with both hands around her mug and said, very quietly, oh. There it is.',
        ],
      },
      {
        heading: 'What Gets on the Glass',
        paragraphs: [
          'You can have the most intentional heart in the world and still see a distorted version of reality if your lens is dirty. That is not a character flaw. It is what happens when life leaves residue on the glass.',
          'Unforgiveness is first, because it is the most common. When you are carrying a wound against someone, every interaction comes to you pre-tinted, and over time the specific wound becomes a general filter.',
          'Unprocessed grief settles. Not grief that is moving through you, which is holy and necessary. Grief that stopped moving, that got frozen or avoided, and calcified in the lens.',
          'Fear files an old danger as a threat profile and then goes looking for it everywhere, in rooms that are actually safe.',
          'And bitterness is the most stubborn, because it has a logic to it. It is the conviction that something essential was taken and will never be returned.',
        ],
      },
      {
        heading: 'The Reframe on Forgiveness',
        paragraphs: [
          'Jesus was not being impractical when He made forgiveness central. He was being optometrical. He was saying that thing you are holding onto is costing you your sight.',
          'Forgiveness is not for the person who hurt you. It is for your window. It does not mean what they did was acceptable, and it does not mean there are no boundaries. It means you stop letting their offense determine what you see.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'A dirty window is not a permanent condition. It is a present one. And God is not standing at a distance waiting for you to get your lens clean before He engages with your life. He is right there at the sink with you, vinegar in hand, unhurried.',
          'My grandmother cleaned that window again in the fall, and again in January. Not because it was always dirty. Because she had finally learned that the view was not going to clean itself.',
          'Neither is yours. But you can.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch04-borrowed-grief',
    kind: 'lens',
    episode: 'Chapter Four',
    session: 'Part One: The Lens',
    publish: 'Book series',
    pillar: 'PRESENCE',
    title: 'Borrowed Grief and Present Grace',
    hook: 'There is a kind of suffering that is entirely self-manufactured, and I have spent large portions of my life doing exactly this.',
    directorNote:
      'Confessional in the opening, then clinical in the math section, then warm at the close. Include yourself the whole way through; this one fails if it sounds like a diagnosis of the viewer.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'There is a kind of suffering that is entirely self-manufactured, and I have spent large portions of my life doing exactly this.',
        ],
      },
      {
        heading: 'What We Are Actually Doing',
        paragraphs: [
          'Constructing elaborate, detailed, emotionally convincing experiences of pain about things that are not actually happening to me in the present moment.',
          'Things that happened years ago. Things that might happen someday. Things that could go wrong, that probably would go wrong if I am honest, that I should really be preparing myself for.',
          'We call it anxiety when it faces the future. We call it rumination when it faces the past. In either direction it is the same thing. Suffering imported from somewhere other than here.',
        ],
      },
      {
        heading: 'The Math',
        paragraphs: [
          'When I am in genuine present-tense pain, the pain is usually proportionate to what I am actually facing. Not pleasant. Sometimes devastating. But it has edges.',
          'Then I add the weight of everything this might mean for the future, plus everything similar that has happened in the past, plus what it says about me, plus how long it might last. And the suffering becomes a thing without edges. Vast and shapeless and crushing in a way the original event never was.',
          'No wonder it is unbearable. But only one of those things is actually occurring right now. The rest is borrowed from time zones I do not currently inhabit and cannot do anything about from where I am standing.',
        ],
      },
      {
        heading: 'What Jesus Said',
        paragraphs: [
          'Each day has enough trouble of its own. Notice He did not say each day has no trouble. He was not a man given to spiritual bypassing and He did not practice it here. He acknowledged plainly that trouble comes.',
          'And then He said stay here. Stay in today. Because today contains something tomorrow and yesterday do not.',
          'Grace. Dispensed in the moment of need, not in advance. Which is exactly why trying to survive a future suffering right now feels impossible. You are attempting it without the grace that will come with it.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'God gave His name as I AM. Present tense. Not I was, not I will be. He exists and operates in the now, which is the one place most of us are refusing to live.',
          'Come back here. This is where He is.',
        ],
      },
    ],
  },

  /* ──────────────────── PART TWO: THE ETERNAL FRAME ──────────────────── */
  {
    id: 'eo-ch05-boot-camp',
    kind: 'eternal',
    episode: 'Chapter Five',
    session: 'Part Two: The Eternal Frame',
    publish: 'Book series',
    pillar: 'FORMATION',
    title: 'Boot Camp',
    hook: 'The suffering is the curriculum.',
    directorNote:
      'Strong and steady. This is the reframe that carries all of Part Two, so do not soften it. Be honest in the paragraph admitting the fire still burns; without that line the whole episode reads as glib.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['The suffering is the curriculum.'],
      },
      {
        heading: 'BUD/S',
        paragraphs: [
          'Nobody signs up for boot camp because it sounds comfortable. You sign up because you want what is on the other side of it, and because you understand at some level that the person capable of those things does not currently exist. She has to be built.',
          'Every Navy SEAL who has made it through BUD/S will tell you the program is not designed to break you. It is designed to find out who you actually are when everything that is not essential has been stripped away. The cold water, the sleep deprivation, the endless demand. None of it is punishment. It is revelation.',
        ],
      },
      {
        heading: 'What Earth Is',
        paragraphs: [
          'I want to propose that this is precisely and intentionally what earth is. Not a punishment. Not a waiting room. Not a test set by a distant God who wants to see if you will pass.',
          'Earth is the training ground. And every hard thing, every stripped-away comfort, every season that demands more than you think you have, is doing in you what BUD/S does in a candidate. Revealing what is actually there, and building what was not there yet.',
        ],
      },
      {
        heading: 'The Framework Problem',
        paragraphs: [
          'We have developed a theology of earth that makes everything harder than it needs to be. It says life is supposed to be generally pleasant, interrupted occasionally by hard things God allows for mysterious reasons.',
          'In that framework suffering is the anomaly. So when it comes, and it always comes, we are destabilized not just by the suffering but by what we have decided it means. That something is wrong. With us, with our faith, with God.',
          'But what if suffering is not the interruption. What if it is the curriculum. What if the hard things are not where the story breaks down but where it is most actively being written.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'This reframe does not make the suffering hurt less in the moment, and I want to be honest about that. The fire still burns. The loss still lands. The exhaustion of hard seasons is still genuinely exhausting.',
          'But it changes what the suffering means. And meaning changes everything.',
          'He is not watching the training from the shore. He is in the water with you.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch06-eternity-is-long',
    kind: 'eternal',
    episode: 'Chapter Six',
    session: 'Part Two: The Eternal Frame',
    publish: 'Book series',
    pillar: 'SCALE',
    title: 'Eternity Is Long',
    hook: 'We have made eternity very small.',
    directorNote:
      'The most expansive episode in the book, so let your energy come up. The long sentence about a single pixel is meant to run away with itself; read it in one breath if you can and do not punctuate it into pieces.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['We have made eternity very small.'],
      },
      {
        heading: 'The Picture We Inherited',
        paragraphs: [
          'Somewhere in the development of Western Christian imagination, the glory that awaits us got compressed into something that, if we are honest, does not sound all that compelling. Clouds. Harps. White robes. An endless church service in the sky.',
          'And if that is what eternity is, then no wonder we are so devastated by the losses of this life. No wonder we grip our earthly experiences so tightly. If what is coming is less vivid and less alive than what we have right now, then of course this life feels like everything. It is the most we will ever get.',
        ],
      },
      {
        heading: 'What If It Is Wrong',
        paragraphs: [
          'What if eternity is not a static suspended version of now, but something so extravagantly alive that every best moment you have ever had on earth, every peak experience, every breathtaking vista, every profound love, every moment where beauty came so close it almost broke you, every single one of those is one pixel in an image of such infinite resolution that you could spend ten thousand years looking at it and still be discovering new depths.',
          'What if eternity is not smaller than earth. What if it is so much larger that earth, in comparison, is the small thing.',
        ],
      },
      {
        heading: 'What Paul Saw',
        paragraphs: [
          'Paul mentions almost in passing, in Second Corinthians 12, that he was caught up to paradise and heard things he was not permitted to tell. Not could not tell. Was not permitted.',
          'Consider what that restraint implies. There are realities so far beyond our framework that premature knowledge of them would be incomprehensible in a way that would do more harm than good. The way you do not explain calculus to a child who has not learned to count. Not because the child is incapable. Because the sequence matters.',
          'We are being prepared for something we cannot yet be told the full extent of.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'No eye has seen, no ear has heard, and no mind has imagined what God has prepared for those who love Him.',
          'You are going to eternity as yourself. What is being built in you now matters for forever.',
          'Let eternity be as big as it actually is, and then look again at the thing you are most afraid of losing.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch07-daughters-vantage-point',
    kind: 'eternal',
    episode: 'Chapter Seven',
    session: 'Part Two: The Eternal Frame',
    publish: 'Book series',
    pillar: 'IDENTITY',
    title: "The Daughter's Vantage Point",
    hook: 'I know whose I am. Four words that contain an entire architecture of identity and freedom.',
    directorNote:
      'Speaks most directly to the women watching. The section on the old calculation should be gentle, because a lot of people will recognize themselves in it and feel exposed. End on the father running.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['I know whose I am. Four words that contain an entire architecture of identity and freedom.'],
      },
      {
        heading: 'The Woman You Watch Like a Fire',
        paragraphs: [
          'There is a particular kind of woman I have met a handful of times, and every time I do I find myself watching her the way you watch a fire. Not because she is performing. Because she is not.',
          'She is not the loudest person in the room. But there is something settled in her that most people are still searching for. She holds things loosely. She loves without the frantic edge of someone afraid of losing. She speaks the truth without the trembling of someone whose value depends on your approval of it.',
          'And if you get close enough to ask where that comes from, she tells you the same thing every time. I know whose I am.',
        ],
      },
      {
        heading: 'Knowing and Inhabiting',
        paragraphs: [
          'Most of us already know, theologically, that we are daughters of God. We have heard it preached and underlined it in devotionals. We know it the way we know the Grand Canyon is beautiful, which is to say we have the information and we have not yet stood at the edge of it.',
          'Inhabiting it is different. It changes the way you walk into a room. It changes what you reach for when you are afraid.',
          'Most of us are living from a different calculation entirely, one installed long before we heard the gospel, built from what we learned about whether we were wanted and whether we were enough.',
          'Those calculations run below the level of theology. Which is why you can know you are a beloved daughter and still panic when someone disapproves of you. The head knows. The body is still running the old math.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The work of a lifetime is letting that truth migrate from the head into the bones.',
          'And here is where it starts. The father in the story sees his son a long way off and runs to him, before the apology, before the cleanup, before the speech the son had rehearsed the whole way home.',
          'See what great love the Father has lavished on us, that we should be called children of God. And that is what we are.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch08-temporal-evil',
    kind: 'eternal',
    episode: 'Chapter Eight',
    session: 'Part Two: The Eternal Frame',
    publish: 'Book series',
    pillar: 'HOPE',
    title: 'Evil Has an Expiration Date',
    hook: 'I want to begin with something I will not walk back. Evil is real.',
    directorNote:
      'The heaviest episode in the book. Open unflinching and stay there; the comfort only works because you refuse to soften the first minute. Do not smile until the very end, and maybe not even then.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['I want to begin with something I will not walk back. Evil is real.'],
      },
      {
        heading: 'Not Minimized',
        paragraphs: [
          'Not a metaphor. Not the abstract theological category we use when we want to sound serious without getting specific. Real in the way a wound is real, in the way a grave is real, in the way the things you cannot unsee are real.',
          'I am not going to offer you a sunny reframe that floats above the actual weight of darkness in this world. I am not going to insult your grief by pretending the hard theology of evil resolves in a paragraph.',
          'What I am going to offer you is something more stabilizing than a tidy answer. I am going to offer you an expiration date.',
        ],
      },
      {
        heading: 'Temporary',
        paragraphs: [
          'Evil is temporary. Not weakened. Not eventually balanced out by enough good days. Temporary. Finite. Moving, whether it knows it or not, toward a fixed and certain end that was written before the first dark thing ever happened.',
          'And the God who is allowing it to run its course is not absent and not scrambling. He wrote the end of the story before the story began.',
        ],
      },
      {
        heading: 'Saturday',
        paragraphs: [
          'The disciples did not know about Sunday on Saturday. That is the part I keep returning to. On Saturday it was simply over. The teacher was dead, the stone was in place, and every hope they had was buried with Him.',
          'They were not being unfaithful. They were living inside a darkness that had not yet resolved into morning, with no information about what was coming.',
          'Some of you are in a Saturday. It is not a lack of faith to find it dark. It is Saturday.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Jesus wept at the tomb of Lazarus knowing He was about to raise him. He held the expiration date in one hand and the grief in the other, and He did not use the first to dismiss the second.',
          'The light shines in the darkness, and the darkness has not overcome it.',
          'Whatever you are holding right now, this darkness does not have access to the last page of your story.',
        ],
      },
    ],
  },

  /* ────────────────────── PART THREE: THE PRACTICE ────────────────────── */
  {
    id: 'eo-ch09-morning-architecture',
    kind: 'practice',
    episode: 'Chapter Nine',
    session: 'Part Three: The Practice',
    publish: 'Book series',
    pillar: 'RHYTHM',
    title: 'Morning Architecture',
    hook: 'Before the world gets to you, you get to choose.',
    directorNote:
      'The most immediately actionable episode in the book, and the best candidate for a paid ad or a pinned post. Brisk. The phone paragraph should feel uncomfortably familiar, so do not soften it.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['Before the world gets to you, you get to choose.'],
      },
      {
        heading: 'The Frame',
        paragraphs: [
          'The window between waking and fully engaging with the day is one of the most underestimated pieces of real estate in a human life. Thirty minutes, maybe. An hour if you protect it.',
          'This is not productivity advice. There is an entire industry built around optimizing mornings for output, and that is not what this is.',
          'Every photograph has a frame. The same scene shot from a different angle, in different light, produces an entirely different image. Not because the scene changed. Because the frame changed.',
          'The first thirty minutes of your day are the frame through which you will photograph everything that happens after them.',
        ],
      },
      {
        heading: 'What Happens When You Do Not Choose',
        paragraphs: [
          'The alarm goes off, or the child calls out, or the anxiety that was waiting just below the surface of sleep announces itself before you have opened your eyes. And you reach for your phone. Not intentionally. Reflexively. The phone is just there. It is always just there.',
          'In about ninety seconds, before you are out of bed, you have been downloaded with the news, which is alarming, and a feed that is a curated highlight reel of other people making your own life feel smaller, and the emails that arrived overnight, several of which want something from you.',
          'You have not brushed your teeth yet. And the frame of your day is already set. Not by you.',
        ],
      },
      {
        heading: 'The Four Elements',
        paragraphs: [
          'Silence first, before any voice gets in. Then an upward orientation, which is simply turning your face toward Him before you turn it toward the day. Then naming something good out loud, out of the actual specifics of your life. And then a reminder of who you are, before anything happens that might make you forget.',
          'None of that requires an hour. It requires that you get there first.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'In the morning, Lord, You hear my voice. In the morning I lay my requests before You and wait expectantly.',
          'Your morning practice is not only spiritually significant. It is biologically consequential. You are setting the filter that everything else in the day will pass through.',
          'Get there before the world does.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch10-gratitude-weapon',
    kind: 'practice',
    episode: 'Chapter Ten',
    session: 'Part Three: The Practice',
    publish: 'Book series',
    pillar: 'GRATITUDE',
    title: 'The Gratitude Weapon',
    hook: 'Paul wrote rejoice always from inside actual chains.',
    directorNote:
      'Fierce. This is the most militant chapter in the book and the delivery should match. The distinction between "in" and "for" is the whole teaching, so slow down and hit both prepositions.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['Paul wrote rejoice always from inside actual chains.'],
      },
      {
        heading: 'The Context Is the Point',
        paragraphs: [
          'We have domesticated that verse. Stitched it onto throw pillows, printed it on mugs, tucked it into the category of nice things Christians say when they want to sound positive. We have made it soft.',
          'It is not soft. It was written by a man who had been imprisoned, beaten, shipwrecked, stoned, left for dead, betrayed by people he loved, and who was sitting in chains awaiting a verdict that could end in his execution.',
          'From that position, with full knowledge of exactly how hard the hard things are, he wrote rejoice always, pray continually, give thanks in all circumstances.',
        ],
      },
      {
        heading: 'In, Not For',
        paragraphs: [
          'And notice the preposition, because it carries the whole thing. He did not say give thanks for the imprisonment, for the beatings, for the chains.',
          'He said give thanks in them. Inside them. While they are happening. In the middle of the thing that is not okay and has not resolved and may not resolve on any timeline you would choose.',
          'That is not positive thinking. That is a weapon, and Paul knew exactly what it was aimed at.',
        ],
      },
      {
        heading: 'What It Is Fighting',
        paragraphs: [
          'There is a narrative that gets rehearsed daily whether you agree to it or not. What you have is not enough. What you are is not enough. Look at what has been withheld. Look at the gap between what is and what should be.',
          'That narrative produces a particular kind of person. Anxious. Contracted. Holding tightly because there is never quite enough. Grateful for nothing, because gratitude requires acknowledging that what you have is good, and the narrative insists that it is not.',
          'Gratitude is a direct assault on that. It is the refusal to let the story of lack stand unchallenged.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Some days the gratitude is easy and near the surface. Some days it is a sacrifice, and it costs you something to say it out loud.',
          'On those days, get to breath. Get to consciousness. Get to the record of what He has already done. There is always a floor under you, and naming it is how you find it.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch11-reframing',
    kind: 'practice',
    episode: 'Chapter Eleven',
    session: 'Part Three: The Practice',
    publish: 'Book series',
    pillar: 'REFRAME',
    title: 'What Would I See If God Wastes Nothing',
    hook: 'It is made of broken things, and people have been crossing oceans to stand in front of it for nine hundred years.',
    directorNote:
      'The Chartres image is the most beautiful thing in the book, so give it room and do not hurry to the application. The section on what reframing is not protects the whole episode from sounding cheap. Do not cut it.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'It is made of broken things, and people have been crossing oceans to stand in front of it for nine hundred years.',
        ],
      },
      {
        heading: 'The Rose Window',
        paragraphs: [
          'There is a window in the Chartres Cathedral in France made of lead and glass, cut and fractured and fitted together in a thousand pieces, none of them remarkable on their own. Hold a single piece up to the light outside the cathedral and it is just colored glass. A shard. Something you would not stop to pick up off the ground.',
          'Set it in the window, in its precise position, surrounded by all the other broken pieces in theirs, and let the light come through from outside, and what you have is not a collection of fragments.',
          'The pieces did not change. The light changed. The frame changed. The position changed.',
        ],
      },
      {
        heading: 'What Reframing Is Not',
        paragraphs: [
          'Before we go further I want to clear the ground, because there is a counterfeit that has done real damage.',
          'Reframing is not pretending. It is not insisting that bad things are actually good, that harmful people are actually kind, that what hurt you actually did not. That is not a spiritual discipline. It is a dissociation strategy, and buried wounds do not stay buried. They migrate, and they show up later with compounded interest.',
          'Reframing is also not rushing. One of the most damaging things well-meaning people do is offer the reframe too soon, before someone has been allowed to say out loud that what happened was wrong and it hurt.',
        ],
      },
      {
        heading: 'The Question',
        paragraphs: [
          'So the practice is not a verdict. It is a question, and you can ask it of anything you are holding.',
          'What would I see here if I truly believed God wastes nothing.',
          'Not what should I feel. Not what is the lesson. Just what would I see, if the light were coming from outside the cathedral rather than from inside my own head.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Most big reframes take time. There are things I could not reframe at year one that I can see clearly now, and the seeing did not come from trying harder. It came from distance and from God being patient with me while I got there.',
          'And we know that in all things God works for the good of those who love Him.',
          'The breaks were real. The window is real too.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch12-who-you-let-speak',
    kind: 'practice',
    episode: 'Chapter Twelve',
    session: 'Part Three: The Practice',
    publish: 'Book series',
    pillar: 'INPUT',
    title: 'Who You Let Speak',
    hook: 'You are being formed right now. Not in the dramatic moments. Right now.',
    directorNote:
      'Direct and a little confrontational, but never superior. Establish the primary voice early and firmly. The voice audit at the end should sound like an invitation, not an accusation.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['You are being formed right now. Not in the dramatic moments. Right now.'],
      },
      {
        heading: 'The Ordinary Tuesday',
        paragraphs: [
          'Not in the sermons and the retreats and the crisis seasons that you know are shaping you. In the ordinary Tuesday of your life.',
          'You are being formed by the voices you are listening to, the content you are consuming, the relationships you are marinating in, the feeds you are scrolling, and the conversations you are replaying at eleven at night when you should be sleeping.',
        ],
      },
      {
        heading: 'The Primary Voice',
        paragraphs: [
          'And underneath all of those, either present or absent depending on choices you have made, there is one Voice unlike every other. Not louder than the rest. Not competing for position in the feed. Quieter than all of it. Steadier. And more formative than every other input in your life combined.',
          'Let this be established before anything else. The primary voice is Jesus. The primary practice is prayer. The primary text is Scripture. Everything else is secondary. Some of it is good and worth cultivating. None of it replaces this.',
        ],
      },
      {
        heading: 'Curation Is Not Isolation',
        paragraphs: [
          'What I am describing is not building a bunker. It is stewardship. You would not let just anyone raise your child. Your formation deserves the same care.',
          'There are voices that speak from relationship, and they have an access to you that content never achieves. There are voices that speak from culture, quieter and more pervasive, that do not announce themselves as formative and simply build a world inside you day after day.',
          'Both are forming you whether you audit them or not.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Walk with the wise and become wise, for a companion of fools suffers harm.',
          'Name the three loudest voices currently forming your perspective. Just three. Then ask the only question that matters about each one. Is this building me toward Christ, or quietly pulling me away.',
          'You already know the answer. The knowing was never the hard part.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch13-celebration-as-theology',
    kind: 'practice',
    episode: 'Chapter Thirteen',
    session: 'Part Three: The Practice',
    publish: 'Book series',
    pillar: 'JOY',
    title: 'Celebration as Theology',
    hook: 'We had to celebrate. Had to. Not chose to.',
    directorNote:
      'The most joyful episode in the book, so let yourself actually enjoy filming it. Smile. This is the one that should make someone want to set a table tonight.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['We had to celebrate. Had to. Not chose to.'],
      },
      {
        heading: 'Three Parties',
        paragraphs: [
          'There is a table in the fifteenth chapter of Luke I have been thinking about for years. It shows up three times, in three parables told in rapid succession, all in response to the same provocation. The Pharisees are grumbling because Jesus is eating with the wrong people.',
          'A lost sheep found. A lost coin found. A lost son found.',
          'And every single time something lost is found, the response is the same. Not quiet relief. Not a dignified nod of satisfaction. Every single time, the response is a party.',
          'The shepherd calls his neighbors. The woman calls her neighbors. The father kills the fatted calf and brings out the robe and the ring.',
        ],
      },
      {
        heading: 'Had To',
        paragraphs: [
          'And when the elder brother stands outside with his arms crossed, offended by the extravagance of it, the father says something I have never been able to get out of my mind. We had to celebrate.',
          'Had to. As if celebration in the face of what has been restored is not optional. As if joy is not a mood you experience when circumstances permit, but a theological necessity. A response demanded by reality.',
        ],
      },
      {
        heading: 'Against the Solemn Version',
        paragraphs: [
          'Most of us have been subtly formed by a version of faith that is suspicious of celebration. That treats solemnity as more spiritual than joy, earnestness as more faithful than delight, the minor key as more honest than the major.',
          'That formation is not from Scripture. Scripture is full of feasts and dancing and the instruction, repeated so often it cannot be accidental, to rejoice. Not as a reward for a difficult season survived. As a discipline.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Joy is not the absence of sorrow. It is the presence of God in the midst of it. Which means joy is available on the days you would not have chosen, and choosing it on those days is an act of defiance.',
          'You make known to me the path of life. You will fill me with joy in Your presence.',
          'Find the ordinary Tuesday thing you have been walking past. Then set the table anyway.',
        ],
      },
    ],
  },

  /* ────────────────── PART FOUR: THE BEAUTIFUL LIFE ────────────────── */
  {
    id: 'eo-ch14-beautiful-life',
    kind: 'beautiful',
    episode: 'Chapter Fourteen',
    session: 'Part Four: The Beautiful Life',
    publish: 'Book series',
    pillar: 'BEAUTY',
    title: 'Seen, Not Perfect',
    hook: 'The life in the photographs does not exist. It has never existed.',
    directorNote:
      'Shoot this one somewhere real and slightly imperfect rather than staged, and let the setting make the argument with you. Warm throughout. The close should feel like permission.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['The life in the photographs does not exist. It has never existed.'],
      },
      {
        heading: 'What It Is Not',
        paragraphs: [
          'Not the carefully lit, expertly angled, filter-applied version of a life that arrives in your feed looking effortless and somehow always golden-houred. Not the life where the kitchen is always clean and the children are always laughing and the faith is always strong and never, not even at three in the morning, doubles back on itself with questions that do not have clean answers.',
          'That is a construction, assembled from the best moments of real lives and presented as the whole. And it is one of the most quietly devastating lies of this era, because it teaches us to be dissatisfied with the only kind of life actually available. The real one.',
        ],
      },
      {
        heading: 'Beauty Is Not Perfection',
        paragraphs: [
          'We have confused beauty with perfection, and the confusion is costing us the thing we most want.',
          'Perfection is a standard. It exists in the comparison, in the gap between what is and what should be. It requires a verdict. It asks whether this measures up.',
          'Beauty is not a standard at all. It is a quality of attention. It does not ask whether something measures up, it asks whether it is true and real and reveals something worth seeing. And in the hands of trained eyes, the answer is almost always yes.',
          'A cracked and weathered old door is beautiful in a way a new one is not, because the cracks tell a story. An aging face is beautiful in a way a smooth one is not, because the lines are the map of a life actually lived.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'So a beautiful life is not a perfect life. It is a seen life. Noticed by the person it is actually happening to.',
          'Which means the question is not whether your life qualifies. It is whether you are present to it.',
          'Read Psalm 139 sometime this week and sit with what it says. He has been noticing your life, every specific unremarkable moment of it, since before you were born.',
          'You do not have to earn the noticing. You only have to join Him in it.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch15-suffering-well',
    kind: 'beautiful',
    episode: 'Chapter Fifteen',
    session: 'Part Four: The Beautiful Life',
    publish: 'Book series',
    pillar: 'FIRE',
    title: 'Suffering Well',
    hook: 'They have been through something. And they are not bitter. That is the thing that undoes you.',
    directorNote:
      'Quiet authority. You have earned this one, so do not rush it and do not reach for a bigger voice. The two counterfeits need to be named plainly; a lot of people are living in the first one and have never had it named.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['They have been through something. And they are not bitter. That is the thing that undoes you.'],
      },
      {
        heading: 'The Person You Have Met',
        paragraphs: [
          'You know them when you encounter them, because of the quality of presence they carry. Something in the room changes when they walk into it. A weight. A warmth. A settledness you feel before you can explain it.',
          'And if you earn the kind of trust that lets you ask the real questions, you almost always find the same thing underneath the luminosity. Something that by every external measure should have broken them. The loss that came without warning. The betrayal by someone they trusted completely. The season that lasted so long they came out the other side someone they do not entirely recognize.',
        ],
      },
      {
        heading: 'Two Counterfeits',
        paragraphs: [
          'The first is performed endurance. Suffering that is never named and never actually felt, because somewhere along the way the person decided that showing the wound was weakness, that faith required no visible cracks, that the right response was to smile and say God is good and keep moving and never let anyone see the three in the morning version of their faith.',
          'That is not suffering well. That is suffering suppressed. And it does not go away, it goes underground, and from there it does its quiet work of hardening a heart that was never given permission to break properly.',
          'The second is premature resolution. Rushing to the meaning before the grief has been allowed to happen, so the lesson arrives before the loss has even been admitted.',
          'Suffering well begins with suffering honestly.',
        ],
      },
      {
        heading: 'The Refiner',
        paragraphs: [
          'The refiner knows the metal is ready when he can see his face in it.',
          'That is what the fire is actually doing. It burns away pretense, and shallow theology, and the illusion of control. Not because God enjoys the burning, but because those things were never gold and they were never going to hold.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Shadrach, Meshach, and Abednego walked out of the furnace without even the smell of smoke on them. And there was a fourth figure in the fire with them the whole time.',
          'That is the promise. Not that you will be spared the furnace. That you will not be in there alone.',
          'Though He slay me, yet will I hope in Him.',
        ],
      },
    ],
  },
  {
    id: 'eo-ch16-contagious',
    kind: 'beautiful',
    episode: 'Chapter Sixteen',
    session: 'Part Four: The Beautiful Life',
    publish: 'Book series',
    pillar: 'LIGHT',
    title: 'Contagious',
    hook: 'You have not been doing this work only for yourself.',
    directorNote:
      'The finale of the series, so it needs lift without becoming a performance. Your mother closes the book and she should close this too. Say her line the way she said it. Then stop talking and let the frame hold.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: ['You have not been doing this work only for yourself.'],
      },
      {
        heading: 'Formation Is Never Private',
        paragraphs: [
          'I know it has felt that way. The morning practices, the gratitude lists, the reframes worked through in private, the hard seasons sat with honestly. Most of it has happened in the interior, mostly unseen.',
          'But formation is never only for the one being formed.',
          'Every time you chose perspective over despair you were building something that will outlast the choosing. Every time you picked up the broom and looked for the coin, you were developing an eye that will eventually teach someone else to look. Every time you stayed in the fire and came out without the smell of smoke, you were carrying a testimony that someone in a future fire is going to need.',
        ],
      },
      {
        heading: 'Joy Announces Itself',
        paragraphs: [
          'The woman who found her coin did not sit quietly in her satisfaction. She called her neighbors and said come celebrate with me. The father did not receive his son privately and carry on with the day. He threw a party loud enough that the elder brother could hear the music from the field.',
          'Joy changes rooms. It makes people lean in and ask questions they did not know they had.',
          'And here is the part that matters. You give permission for a thing you actually have. Not a thing you perform. People can tell the difference instantly, which is why the years of quiet formation were not wasted time.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'You are the light of the world. A town built on a hill cannot be hidden.',
          'Someone is one season behind you in a fire you have already walked through. They do not need you to have it all figured out. They need to see that the ground held.',
          'My mother kept her face to the sun through the loss and the rebuilding and the ordinary Tuesdays. She is dancing in that light now. And what she wrote down for a grieving nine year old is the last thing I want to give you.',
          '(Say her line exactly as she said it, then stop.)',
          "Keep your face to the sun, and you won't see the shadows.",
        ],
      },
    ],
  },
];
