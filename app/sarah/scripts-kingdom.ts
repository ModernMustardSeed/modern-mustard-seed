import type { PrompterScript } from './scripts';

/**
 * KINGDOM LEVERAGE, Season Two.
 *
 * Ten episodes and ten shorts on biblical business principles with AI as the
 * amplifier, never the source. The spine of the whole series is one claim:
 * AI multiplies domain knowledge, so the thing you already know and practice
 * is the asset. Every episode ends up back there.
 *
 * Teaching register is expository, not motivational: name the principle, put
 * Scripture under it with book and chapter, then hand over one move the viewer
 * can make this week. Scripture is load bearing here. If a verse is only
 * decoration in a block, the block is wrong.
 *
 * Sarah reads this verbatim on camera. Do not tune paragraph text without
 * telling her first.
 */
export const KINGDOM_LEVERAGE: PrompterScript[] = [
  {
    id: 'kl1-ai-amplifies-what-you-know',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 1',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 8/25',
    pillar: 'KINGDOM',
    title: 'AI Amplifies What You Already Know',
    hook: 'AI is a multiplier. A multiplier applied to zero is still zero.',
    directorNote:
      'This is the thesis episode for the whole season, so plant your feet and teach it. Say the multiplier line in the Cold Open slowly, then say it again at the end of block one with the same rhythm so it lands as a refrain and not a phrase. Warmth on the septic company story, real affection, he is not the punchline. Drop into a quieter register for Where Faith Sits and speak to one person. The last three sentences of the Close are three separate beats, with air between them.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'A man stopped me after a talk in Kalispell and asked what he should use AI for. I asked him one question back. What do you know how to do that most people cannot? He stood there and thought about it for a long time, and then he said, honestly, nothing.',
          'He owns a septic company. Twenty-two years. He can stand in a driveway, listen to a pump cycle, and tell you whether the float switch is dying or the drain field is done. He can look at a county parcel and know what it will cost to get a system permitted before he opens a laptop. He knew all of that. He just did not think any of it counted.',
          'That is the whole problem, and it is not a technology problem. He came looking for AI to give him something, and he was standing on top of the exact thing AI needs from him. So here is the sentence I want living in your head for the next twenty minutes. AI is a multiplier. A multiplier applied to zero is still zero. Applied to twenty-two years, it is a company.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will have four things. You will understand why AI is arithmetic and not magic, which changes what you should ask of it. You will be able to name your own domain out loud, in a sentence, which most owners cannot do and which is worth more than any tool. You will know the three assets in your business that no model on earth can manufacture. And you will have one specific place to aim the multiplier first, this week, without hiring anyone.',
          'I am not neutral here. I run four ventures out of a small town in Montana, mostly by myself, because AI systems carry the repetitive weight. But every one of those systems is built on something I knew before the systems existed. The tools did not make me useful. They made what I already knew reach further. That order matters, and getting it backward is the most expensive mistake I watch people make.',
        ],
      },
      {
        heading: '1. A Multiplier Needs a Number to Multiply',
        paragraphs: [
          'Start with the arithmetic, because it is genuinely this simple. A multiplier does not create value. It scales value that already exists. Ten times four is forty. Ten times zero is zero. The ten did not change. The other number did all the work.',
          'This is why two business owners can buy the exact same tools, in the same week, and one of them gets a step change while the other gets nothing but a subscription. The tools were identical. The other number was not.',
          'Watch what this does to the panic. People keep asking whether AI is going to replace them, and the honest answer is that AI replaces tasks, never judgment. It writes the proposal. It does not know that this particular customer needs the payment schedule spelled out because his last contractor burned him. It drafts the estimate. It does not know that you never bid that neighborhood in March because of frost depth. Everything I just described is domain knowledge, and domain knowledge is exactly what the multiplier is looking for.',
          'Here is the harder half. If your business is genuinely undifferentiated, if you do the same thing in the same way as everyone else with no accumulated judgment, then AI will not save you, and it will not be the thing that hurt you either. It will just be a very fast competitor who arrived at the same nothing sooner. That is not a reason to avoid the tools. It is a reason to go get a domain.',
          'So say it with me one more time, because this is the spine of the season. AI is a multiplier. A multiplier applied to zero is still zero. Your job is not to find a better multiplier. Your job is to be a bigger number.',
          'Your next step from this block: write down one thing you know that a smart, motivated stranger could not learn from the internet in a weekend. If you cannot fill that line in yet, keep listening, because block two is about finding it.',
        ],
      },
      {
        heading: '2. Your Domain Is the Gift, Not the Hobby',
        paragraphs: [
          'Most people looking for their gift are looking in the wrong category. They are looking for something that feels special. The thing that actually pays is usually something that feels ordinary, because you have done it so many times it stopped feeling like anything at all.',
          'Scripture is unusually direct about this. In Exodus thirty-one, God names a man, Bezalel, and says He has filled him with the Spirit of God, with wisdom, understanding, and knowledge, and with all kinds of skills. Read what those skills are. Metalwork. Stone cutting. Carpentry. God fills a man with His Spirit so he can do fine trades work with his hands. That is the resume of a craftsman, and Scripture calls it a filling of the Spirit. Your capability is not the unspiritual part of your life that funds the spiritual part. In the text, the capability itself is the gift.',
          'Then there is the widow in Second Kings four. Her husband is dead, the creditor is coming for her sons, and Elisha asks her a question that I think is one of the most practical questions in the Bible. What do you have in your house? Her answer is almost dismissive. Nothing, except a jar of oil. That jar is the whole miracle. The multiplication happens to the thing she already had and had already written off.',
          'So let me make this concrete instead of inspirational. Your domain is the set of decisions you make quickly and correctly that other people make slowly and badly. That is the working definition. Not what you enjoy. Not what you post about. What you get right on instinct while other people are still gathering information.',
          'Test it three ways. First, what do people call you about, for free, that you never advertised? Second, what mistake do you watch your competitors make that you find almost physically painful to look at? Third, what part of the job would you refuse to hand a new hire in their first year, and why? The answers to all three live in the same neighborhood, and that neighborhood is your domain.',
          'Your next step: answer those three questions in writing, in your own words, badly. Do not polish it. Polishing is the thing you will hand to a machine later.',
        ],
      },
      {
        heading: '3. Three Assets No Model Can Manufacture',
        paragraphs: [
          'Once you have the domain, you can see what you actually own. There are three assets in a real business that no amount of compute can produce, and every one of them gets more valuable as the tools get better, not less.',
          'The first is proprietary knowledge. Not information, knowledge. Information is public: how a heat pump works, what a lien is, what the code says. Knowledge is what you learned by being wrong in front of a customer. What this specific soil does in a wet spring. Which supplier says yes and then misses. What the third question is that a nervous buyer never asks out loud but is definitely thinking. None of that is on the internet. It is in you, and right now most of it is only in you, which means it is trapped.',
          'The second is your pattern library. After enough repetitions you stop reasoning and start recognizing. You walk onto a job and something is wrong before you can say what. A doctor calls it clinical judgment. A framer calls it a bad feeling about a wall. It is real, it took years, and it cannot be shortcut. AI has read more than you have. It has not seen what you have seen.',
          'The third is standing. Somebody in your town will pick up the phone because it is you. That trust was built one kept promise at a time, and it does not transfer to a tool, an ad, or a competitor with a better website. It is the slowest asset to build and the only one that compounds while you sleep.',
          'Now here is why this matters for the multiplier. Every one of those three assets used to be capped by your calendar. Your knowledge helped exactly as many people as you could personally talk to. Your judgment covered exactly as many jobs as you could personally walk. That cap is what AI removes. Not the knowing. The reaching.',
          'Your next step: pick which of the three is strongest in your business, name it in one sentence, and notice how much of it currently exists only inside your own head.',
        ],
      },
      {
        heading: '4. Where to Aim the Multiplier First',
        paragraphs: [
          'People aim wrong, and it is always the same wrong. They aim AI at the thing they do not understand, hoping it will cover for them. Aim it at the thing you understand best. That is where the multiple is largest, and it is also the only place you can tell whether the output is any good.',
          'Concretely, there are four first doors, and I would take them in this order. Door one, the answer machine. Take the twenty questions you get asked every week and build the thing that answers them in your voice, with your standards, all day, whether or not you are on a ladder. That is your knowledge, unhooked from your calendar.',
          'Door two, the front door itself. The phone that gets missed, the form nobody follows up on, the quote that goes out two days late because you were working. A voice agent that answers, qualifies, and books straight into your calendar is not a novelty. It is the difference between the jobs you won and the jobs you never knew were offered.',
          'Door three, the drafting. Proposals, estimates, follow-ups, the write-up nobody wants to do at nine at night. You still make every judgment call. The machine does the typing between your decisions.',
          'Door four, the memory. Most small businesses forget everything. What that customer wanted last spring. Why that job went sideways. Which supplier was late twice. Give the business a memory it can search and you get compounding instead of repetition.',
          'Notice that all four doors are the same move. Take something that is currently limited by how many hours you have, and unhook it from your hours without unhooking it from your judgment. That is the entire game.',
          'Your next step: pick the single door where you lose the most money today, not the one that sounds the most impressive. It is usually door two, and it is usually the phone.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'The thing you have to put down is the idea that the tool is the advantage. It is not, and it never was. The tool is available to everyone, which by definition means it is not an advantage. Advantage is what happens when a commodity tool meets a rare input.',
          'And put down the other one too, the one that says you are behind. You are not behind on AI. Almost nobody is ahead. What most people have is a subscription and a vague feeling of guilt. What you have is twenty years of knowing things. That is the scarce side of this trade, and it always has been.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'I want to be careful here, because there is a version of this teaching that turns into flattery, and I am not interested in flattering you.',
          'What Scripture actually says is that the gift was given. First Corinthians four asks the question straight: what do you have that you did not receive? So the domain you spent twenty years building was built with a mind, a body, a temperament, and a set of circumstances that were handed to you. That knocks out the pride and the false humility in the same swing. You did not manufacture the gift, so you cannot boast about it. But you were entrusted with it, so you cannot bury it either.',
          'And then there is the part that keeps me honest. The multiplier makes everything bigger, including whatever you already were. It makes a generous business more generous and a careless business careless at scale. It does not fix character. It broadcasts it. So the question underneath this whole season is not whether you can grow. You can. The question is who you will be when it works.',
        ],
      },
      {
        heading: 'Do This This Week',
        paragraphs: [
          'Three moves, in order. First, write your domain sentence. One sentence, plain words: I know how to do this thing, for these people, better than nearly anyone within a hundred miles. Say it out loud until it stops feeling arrogant, because you are not bragging, you are taking inventory.',
          'Second, do a brain dump. Sit with a recorder or a keyboard for forty-five minutes and answer the twenty questions you get asked most. Do not organize it. Do not make it nice. Just get what is in your head into a file that exists outside your head. That file is the number the multiplier has been waiting on. Everything else in this season builds on it.',
          'Third, pick your one door. Answer machine, front door, drafting, or memory. One. Not four. And decide the date you want it running by, because a system without a date is a wish.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The man from Kalispell called me a few weeks later. He had done the brain dump, and he said something I keep thinking about. He said it turns out he knew a lot, he just never wrote any of it down, so it only ever helped whoever was standing next to him.',
          'That is most of you. Not short on knowledge. Short on reach.',
          'So do not go looking for a better tool this week. Go take inventory of the jar of oil in your house. The multiplier is already here, and it is patient, and it is waiting on a number.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kl2-money-is-a-receipt',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 2',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 9/1',
    pillar: 'KINGDOM',
    title: 'Money Is a Receipt for a Problem Solved',
    hook: 'You are not paid for your time. You are paid for the size of the problem you remove.',
    directorNote:
      'Teach this one like arithmetic, because it is. Deliver the four numbers in block two slowly enough that a viewer could write them down, and pause after each one. Do not soften the section on why raising a price is a service, deliver it flat and certain. Warmth returns on the bakery story in block three. Take a full beat before the last line of the Close.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'A woman asked me last month how to make more money in her business, and then, without pausing, told me her plan. She was going to start working Saturdays. She already worked five ten hour days. She was going to add a sixth.',
          'I asked her what a Saturday would earn. About nine hundred dollars, she said. So the plan was to trade the only day she gets with her kids for nine hundred dollars, in a business where one pricing decision she has been avoiding for two years is worth about forty thousand a year. She is not lazy and she is not slow. She is operating on a belief almost everyone in America absorbed without ever examining it. The belief is that money comes from hours.',
          'It does not. Money is a receipt. It is what changes hands when a problem gets removed from somebody who wanted it gone. The hour is just where the removal happened to occur.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will have four things. A working definition of income that actually predicts what happens in the real world. The four numbers that determine every dollar your business will ever make, so you can stop guessing which lever to pull. An honest account of why a bigger problem pays better than a harder effort. And the one specific place AI enters that equation, which is one place, not everywhere.',
          'This matters more now than it did five years ago for a simple reason. AI moves one of those four numbers a very long way, very fast, and it barely touches the other three. If you do not know which is which, you will spend a year automating the wrong thing and wonder why the bank balance did not move.',
        ],
      },
      {
        heading: '1. Work Was Never the Punishment',
        paragraphs: [
          'Before the economics, the foundation, because most Christians carry a quiet belief that work is part of the curse, and that belief puts a ceiling on everything they build.',
          'Genesis two, verse fifteen. God puts the man in the garden to work it and keep it. That is before the fall. Before any sin, before any curse, before the ground gets hard, the assignment is work. Then in Genesis one, twenty-eight, the instruction is to fill the earth and subdue it. Subdue means bring order to something wild. That is what every business on earth is doing. A plumber subdues chaos in a wall. A bookkeeper subdues chaos in a ledger. A software company subdues chaos in a process.',
          'What changed at the fall was not the existence of work. It was the friction. Thorns and thistles, sweat on the face. The curse made the work harder, not evil. Which means an honest tool that removes friction from work is not a dodge around the curse. It is a small push back against it.',
          'Hold that next to the last chapter of the story. In Revelation twenty-one the city comes down and the kings of the earth bring their glory into it. Made things, cultural work, carried in. Whatever you build well is not a distraction from what lasts.',
          'So here is the reframe. Your business is not a necessary evil that funds the real spiritual work. Your business is a place where chaos gets ordered and people get served, and getting paid for it is the ordinary way that exchange gets recorded.',
          'Your next step: notice this week how often you apologize for wanting the business to grow. That flinch is theology, not modesty, and it is worth examining.',
        ],
      },
      {
        heading: '2. The Four Numbers That Set Your Income',
        paragraphs: [
          'Here is the equation, and there are only four numbers in it. Your income equals the size of the problem you solve, times how many people you solve it for, times how often, times how much of the value you capture. Size, volume, frequency, capture. Write those down.',
          'Number one, size. The dollar value of the problem you remove. A slow drain is a two hundred dollar problem. A flooded basement two hours before closing on the house is a very different problem, and it is the same technician with the same skill. The pay scales with what was at stake, not with effort.',
          'Number two, volume. How many people you can serve. This is the number that has always been capped by your body. There are only so many houses you can drive to.',
          'Number three, frequency. How often the same person needs you again. One-time transactions make you re-earn every dollar from a stranger. A relationship that recurs lets the same trust pay repeatedly.',
          'Number four, capture. How much of the value you created ends up on your invoice. Save a client eighty thousand dollars, bill four thousand, and you captured five percent. That is not humility. It is a pricing decision, and most owners make it by accident.',
          'Now the part I want you to actually hear. Working Saturdays touches exactly one of those numbers, volume, by the smallest possible increment, and it costs you your life to do it. Meanwhile most owners have never seriously attacked size or capture, ever, and those two move in multiples rather than increments.',
          'Your next step: write the four numbers down for your own business and put a real figure next to each. The one you cannot answer is usually the one leaking the most.',
        ],
      },
      {
        heading: '3. Bigger Problems Pay Better Than Harder Work',
        paragraphs: [
          'Effort is not the price signal. That is the hardest thing on this list to accept, and refusing it is what keeps good people broke.',
          'There is a bakery I love that makes an exceptional sourdough. Twelve hours of fermentation, a fifty year old starter, real craft in every loaf. It sells for nine dollars, because the problem it solves is one dinner. Down the street there is a woman who sets up bookkeeping systems for construction companies. Her work is not harder than making bread. But the problem she removes is an owner who cannot tell which jobs are profitable, and that ignorance costs him six figures a year. She charges accordingly. Comparable effort. Different altitude of problem.',
          'This is why raising your price is often the most honest thing you can do. Proverbs eleven, twenty-six says the people curse the one who withholds grain, but blessing crowns the one who sells it. Not gives it. Sells it. Selling is what gets the grain to the people who need it, and the price is what keeps grain coming next year. A business priced too low to survive stops serving anybody the day it closes.',
          'This is also exactly where prosperity teaching goes off the rails, so let me put the fence up. The claim is not that God owes you money, and it is not that income measures favor. Plenty of faithful people solve enormous problems for very little pay, and Scripture never treats that as failure. The claim is narrower and it is just true: in an ordinary market, price tracks the value of the problem removed, not the sweat of removing it. Knowing that does not make you greedy. Not knowing it makes you a martyr with a spreadsheet.',
          'The practical version. If you want to be paid more, do not add hours. Move up the problem. Same skill, same customer, higher stakes. The bookkeeper who becomes the person telling the owner which jobs to stop bidding did not learn a new trade. She moved to a bigger problem she was already qualified to solve.',
          'Your next step: name the most expensive problem your customers have that sits right next to what you already do. That is your next offer, and you are probably already solving it for free.',
        ],
      },
      {
        heading: '4. Where AI Actually Enters the Equation',
        paragraphs: [
          'Now put AI against the four numbers, honestly, because the honest answer is more useful than the hype.',
          'Volume. This is where AI hits hardest and it is not close. Everything that used to be capped by your hours comes off the cap. The phone gets answered every time. The follow-up happens on the day it should. The proposal goes out the same afternoon instead of Thursday. You serve more people without becoming more people.',
          'Frequency. Strong second. Most businesses lose repeat work to forgetting, not to competitors. A system that remembers every customer, what they bought, when they will need it again, and reaches out at the right moment turns one-time buyers into recurring ones. That is not clever marketing. It is refusing to forget.',
          'Capture. Real, but indirect. When you can put a proposal in front of someone that shows the value at stake in numbers, on the day of the conversation instead of four days later, you get paid closer to what the work is worth. AI does not raise your price. It removes the friction that was making you afraid to.',
          'Size. Almost none. This is the one I need you to hear. AI does not decide which problem is worth solving. It does not know that the real pain in your industry is the two week permit wait and not the thing everyone talks about at the trade show. That judgment is yours, and it is exactly what episode one called your domain.',
          'So the shape is this. AI multiplies volume and frequency, assists with capture, and is silent on size. Which means the ceiling of your business is still set by the size of the problem you chose. The machine can carry a bigger load. It cannot pick a bigger load for you.',
          'Your next step: for the one door you chose in episode one, name which of the four numbers it moves. If the honest answer is none of them, it is a toy, not a system.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'Put down the hour. Not hard work, the hour as the unit of value. The moment you price by time you have capped yourself at the number of hours a human body contains, and you have quietly told your customer that what they are buying is your presence rather than their outcome.',
          'And put down the idea that charging well is the opposite of serving well. The opposite of serving well is going under in year four with a stack of underpriced invoices and a customer list nobody is left to serve.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'There is a reason I keep saying money is a receipt and not a scoreboard.',
          'Deuteronomy eight is the passage that will not leave me alone on this. Moses tells a people about to get wealthy that when they eat and are full, and their herds multiply, they should watch out that they do not say in their heart, my power and the might of my hand have gotten me this wealth. And then the line lands: remember the Lord your God, for it is He who gives you power to get wealth. Not the wealth. The power to get it. The capacity, the health, the mind, the market, the years. All received.',
          'That is what keeps this from turning into a prosperity pitch. Understanding how value works is stewardship, the same way understanding weather is stewardship for a farmer. It is not a claim on God. And the receipt in your hand was never the point of the transaction. It is evidence that a problem is gone from somebody who could not fix it themselves. That is the product. The money is the paperwork.',
        ],
      },
      {
        heading: 'Do This This Week',
        paragraphs: [
          'First, run the four-number audit. Size, volume, frequency, capture, with real figures. Forty-five minutes with a pen. Most owners discover they have been attacking volume with their body for ten years and have never once touched size.',
          'Second, find your underpriced outcome. Go through the last twenty invoices and write next to each one what the customer actually got, in dollars, not in deliverables. Where the gap between those two columns is widest, that is the pricing conversation you have been avoiding.',
          'Third, kill one hour-based habit. One. The recurring meeting that produces nothing, the Saturday you were about to add, the task you still do personally because you always have. Spend that time on the size question instead.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The woman with the Saturday plan did not add the Saturday. She raised her prices nineteen percent, lost two customers she describes as her two worst, and finished the year up sixty-one thousand dollars on fewer jobs.',
          'Nothing about her skill changed that year. She stopped selling hours and started charging for the problem she was already removing.',
          'You are not paid for your time. You never were. You are paid for what is gone when you leave.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kl3-four-levels-of-value',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 3',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 9/8',
    pillar: 'KINGDOM',
    title: 'The Four Levels of Value, and Which Two AI Just Took',
    hook: 'There are four levels of value in every economy. AI just took the bottom two, and it is coming for the third.',
    directorNote:
      'This is the map episode. Use your hand on camera for the four levels, lowest to highest, and keep the gesture identical every time you name them so the viewer builds the picture with you. Slow way down on the Joseph section, that is the emotional center of the episode. The line about the ladder being a promotion and not a threat should be delivered warmly, straight to the lens.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'A framer I know made eighty-five thousand dollars last year and worked more hours than anyone I know. His old foreman made a hundred and sixty running four crews. The estimator who bids their jobs made two hundred and ten. And the developer who decided the building should exist at all made more than the three of them combined, in a year where he never once picked up a hammer.',
          'Same industry. Same building. Four very different incomes. And here is what makes people angry about that, right up until they understand it: the hardest physical work is at the bottom.',
          'That is not injustice, and it is not a conspiracy. It is a ladder, and the ladder has always been there. What is new is that a machine just climbed onto the bottom two rungs, and it is not getting off. So you need the map.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will be able to name all four levels of value, place your own work on the ladder honestly, see exactly which rungs AI has already taken, and know the specific next rung to climb without abandoning your trade or going back to school.',
          'And I want to say the important part up front, because this teaching gets abused. Climbing the ladder is not about becoming too good for the work. The plumber who moves up a rung is still a plumber. He is just no longer selling only the hours his own hands are in the wall.',
        ],
      },
      {
        heading: 'Level One: Implementation',
        paragraphs: [
          'Level one is implementation. Doing the thing with your own hands. Cutting the board, writing the code, entering the data, driving the truck, making the call. It is the most honest level and it is the lowest paid, and both of those things are true at once.',
          'Do not hear contempt in that. Implementation is where excellence starts and it is where character is formed. Bezalel in Exodus thirty-one was an implementer, and God calls his craftsmanship a filling of the Spirit. Jesus spent something like eighteen years of adult life in a carpentry shop. There is nothing lesser about level one.',
          'But understand the ceiling. Level one pays by the unit of output your body can produce, which means it is capped by a number that does not grow: hours in a day, years in a back. Two hands, one calendar. You can get faster and you can get better and the ceiling stays where it is.',
          'Here is the hard news, delivered plainly. Level one is where AI landed first and hardest. Drafting, formatting, data entry, first-pass code, first-pass copy, transcription, summarizing, scheduling, routine research. Not all of it and not perfectly, but enough of it that selling implementation alone as your whole business is now a shrinking position.',
          'Your next step: list every task you did last week that was pure implementation, and put a star next to the ones a well-instructed machine could have done at ninety percent quality. Do not panic at the number. That number is your raw material for the rest of this episode.',
        ],
      },
      {
        heading: 'Level Two: Unification',
        paragraphs: [
          'Level two is unification. Getting other people and other parts to work together toward one outcome. The foreman. The office manager. The project lead. You are no longer producing the unit, you are making sure the units add up.',
          'This pays more than implementation for a reason that is easy to miss: one unifier multiplies many implementers. If four framers get twenty percent better because of how the foreman sequences the day, the foreman created more value than any one of them did.',
          'Nehemiah is the case study I keep coming back to. He never lays a stone in the whole book. What he does is survey the wall at night, divide it into sections, assign each family the section in front of their own house, arm half the workers while the other half builds, and answer the people trying to pull him off the project with one sentence: I am doing a great work and I cannot come down. The wall went up in fifty-two days. That is unification, and Scripture treats it as serious work.',
          'Now the honest read on AI here. This rung is under real pressure, but partially, not wholly. Coordination, scheduling, status chasing, routing, reminding, keeping the record straight, all of that is exactly what agents are good at. What is not under pressure is the part of unification that is human: knowing which of your people is about to quit, which crew cannot be put on the same job, how to correct someone without losing them. Machines coordinate tasks. They do not lead people.',
          'Your next step: separate your coordination work into two lists, task coordination and people leadership. The first list is a system waiting to be built. The second list is your actual job.',
        ],
      },
      {
        heading: 'Level Three: Communication',
        paragraphs: [
          'Level three is communication. Persuasion. Sales, teaching, writing, speaking, negotiating. Moving someone from where they are to where they need to be using nothing but words.',
          'This is where income takes its first real jump, and the reason is not mysterious. Nothing in a business happens until somebody says yes. The best product in your county produces exactly zero dollars until a person is persuaded to buy it. So the person who can create that yes is attached to every dollar in the building.',
          'Scripture takes this level seriously in a way the modern church often does not. Paul reasoned in the synagogue and persuaded. Proverbs eighteen, twenty-one, says death and life are in the power of the tongue. The apostles were sent with words. Persuasion is not manipulation. Manipulation moves somebody toward what is good for you. Persuasion moves somebody toward what is good for them, and the difference is not tone, it is direction.',
          'Where does AI sit here? It writes fluently and it can produce infinite words. What it cannot do is stand in front of a nervous customer and know that the objection they just said out loud is not the real one. It cannot read a room. It cannot decide that the right move is to tell someone not to buy today. Communication that persuades depends on knowing this human, in this moment, and that is a domain problem.',
          'Which sets up the real opportunity. Most experts are terrible at level three, not because they lack the skill but because they lack the reps and the time. AI removes the drafting friction entirely. If you know what to say and have never had the hours to say it, the constraint that kept you quiet just disappeared.',
          'Your next step: take the twenty questions you dumped in episode one and turn one of them into something public this week. A post, a video, an email to your list. The knowledge already exists. This is distribution, not creation.',
        ],
      },
      {
        heading: 'Level Four: Imagination',
        paragraphs: [
          'Level four is imagination. Seeing what does not exist yet and deciding it should. The offer nobody has made. The product the market has not asked for. The business model that changes what is possible. This is the highest paid level in every economy on earth and it always has been.',
          'Joseph is the whole lesson. He interprets a dream about seven good years and seven lean ones, and then he does something the text does not make a big deal of but should. He does not stop at the interpretation. He designs a system. Appoint overseers, take a fifth of the harvest during the seven good years, store the grain in the cities, hold it against the famine. He invents national grain storage on the spot. He goes from prisoner to second in command of Egypt in a single conversation, and the promotion is not for the dream. It is for the plan attached to the dream.',
          'That is level four. Same information everyone else had, in his case a warning nobody could act on, turned into a structure that made the information useful. He did not work harder than the men in that prison. He saw further.',
          'Here is the thing about level four and AI. This rung is not under pressure at all. Not a little, not eventually. AI generates options, and options are not vision. It will happily give you a hundred business ideas and it has no way to know which one is worth your one life. It has no stake, no conviction, no calling, and no ability to bet.',
          'And there is a second thing, the one that should make you sit up. Level four used to require capital and a team to act on. You would see it, and then you would need six months and four hires to test it. Now the distance between seeing it and having a working version has collapsed to about a week. Imagination just became the only real bottleneck, and it happens to be the rung machines cannot touch.',
          'Your next step: write down the one thing you have thought your industry should have for years and assumed you could never build. That sentence is a level four asset and it has been sitting in a drawer.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'Put down the idea that climbing means leaving. The framer who climbs does not stop caring about framing. He becomes the man who can look at a set of plans and see three days of waste before anyone breaks ground, and that judgment came from the hammer. Levels three and four are worthless without a level one past. This is a ladder, not an exit.',
          'And put down the guilt about wanting the higher rung. Being paid more for seeing further is not exploitation. The developer who saw the building is why the framer had ninety days of work.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'The ladder is a place where ambition goes bad quickly, so I want to name the danger precisely.',
          'The danger is not the climb. It is what happens to how you see people once you are up a rung. If unification turns your crew into resources, if communication turns persuasion into a technique for getting what you want, if imagination convinces you that the people doing implementation are beneath you, you have made the trade Jesus asked about in Mark eight: gaining the world, losing the soul.',
          'The safeguard is in Philippians two, and it is a description of Jesus doing the ladder in reverse. Being in the form of God, He did not count equality with God a thing to be grasped, but emptied Himself, taking the form of a servant. The highest level of value that has ever existed voluntarily went to the bottom rung. So climb, and hold it the way He did. The rung is a place to serve from, not a place to be seen from.',
        ],
      },
      {
        heading: 'Do This This Week',
        paragraphs: [
          'First, place yourself honestly. Take last week’s calendar and assign every hour to a level. One, two, three, or four. Most owners find they are spending eighty percent of their time on level one work while telling themselves they run a company.',
          'Second, automate one level one task all the way. Not partially. Pick the single most repetitive thing on that list and build the system that ends it. That hour has to come back to you before anything else on this list is possible.',
          'Third, spend the reclaimed hour on level three or four. Put it on the calendar with a name. Write the thing. Make the offer. Sketch the product. An hour that comes back and gets absorbed into more level one work was not actually reclaimed.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The framer I opened with is now bidding jobs. Same trade, same knowledge, one rung up. His hands hurt less and his income doubled, and the reason he could climb is that he spent fifteen years on the bottom rung learning things the estimator two rungs up had to guess at.',
          'That is the whole point. You are not behind. You are holding the raw material.',
          'The machine took the rungs that ask what. It cannot touch the rung that asks whether it should exist at all. So climb.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kl4-seedtime-still-applies',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 4',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 9/15',
    pillar: 'KINGDOM',
    title: 'AI Does Not Repeal Seedtime',
    hook: 'Speed changes the harvest date. It does not change the law.',
    directorNote:
      'Gentler episode, more pastoral than the first three. The farming detail in block one should be delivered with real affection, you grew up around this. Slow to almost a stop for the section on the seed growing secretly. Do not rush the four seeds list in block three, each one gets its own beat. The Close is quiet, not triumphant.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'A man emailed me in March, furious. He had spent six weeks building an AI content system. Beautiful setup. It could produce a month of posts in an afternoon. He had been running it for five weeks and had made zero dollars, and he wanted to know what was broken.',
          'Nothing was broken. He had planted five weeks ago and he was standing in the field in March demanding a harvest, and no tool ever built has changed what happens between those two events.',
          'Genesis eight, twenty-two. While the earth remains, seedtime and harvest, cold and heat, summer and winter, day and night shall not cease. That is God speaking after the flood about how the world will run until the end. Seedtime and harvest. Two separate seasons, in that order, with a gap in between. Every tool we have ever invented operates inside that sentence. None of them repeal it.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will know exactly which parts of the harvest cycle AI compresses and which parts it cannot touch, so you stop expecting the wrong thing. You will know the four seeds every business plants and which one you are neglecting. You will have a realistic timeline for the systems you are building, which will save you from quitting six weeks early. And you will understand why the gap between planting and harvest is not an inefficiency in the design.',
          'This is the episode that keeps the rest of the season from lying to you. Everything I teach about leverage is true. It is also slower than it looks in the thumbnail, and I would rather you hear that from me than learn it in month three.',
        ],
      },
      {
        heading: '1. What the Machine Compresses, and What It Cannot',
        paragraphs: [
          'Break the cycle into its actual parts, because they behave very differently. There is preparing ground. There is planting. There is waiting. There is tending. There is harvest. Five stages, and AI only touches three of them.',
          'Preparing ground. Heavily compressed. What used to take a season of research, positioning, and building the thing now takes days. Real change, and it is the change everyone notices.',
          'Planting. Massively compressed, and this is the largest gain by far. You used to be able to plant a few seeds a week: a few calls, one article, three conversations. Now you can plant hundreds. The follow-up that never happened, the answer that never got written, the customer nobody circled back to. Volume of seed goes up by an order of magnitude.',
          'Waiting. Not compressed at all. Zero. A prospect who needs eleven months to be ready still needs eleven months. Trust still forms at the speed of repeated evidence. Search engines and buyers both take time to believe you exist. This is the stage that breaks people, because the two stages before it got so fast that this one feels like a malfunction.',
          'Tending. Partly compressed. Following up, nurturing, staying in front of people, remembering, that is exactly what systems do well.',
          'Harvest. Not compressed. A person still decides. A signature still happens on a human timeline.',
          'So look at the shape of that honestly. AI is astonishing at the front of the cycle and irrelevant at the middle. Which produces the exact experience that man had in March. He got very good at planting and interpreted the ordinary waiting season as failure.',
          'Your next step: name which stage you are actually in right now. Most frustration in business is a stage error, expecting harvest behavior during a waiting season.',
        ],
      },
      {
        heading: '2. The Seed Growing Secretly',
        paragraphs: [
          'There is a parable in Mark four that almost nobody preaches, and it is the one you need most.',
          'Jesus says the kingdom of God is as if a man should scatter seed on the ground, and sleep and rise night and day, and the seed should sprout and grow, he knows not how. The earth produces by itself, first the blade, then the ear, then the full grain in the ear.',
          'Read what the farmer does in that story. He scatters. Then he sleeps and rises, night and day. He does not stand over the row. He does not dig it up to check. And the striking phrase is that he knows not how. He cannot see the mechanism and he is not required to.',
          'Now hold that against how you have been running your business. You post something and check the numbers four hours later. You launch and evaluate in week two. You start a system, see nothing by day thirty, and dig up the seed to see whether it is doing anything, which is the one action guaranteed to kill it.',
          'The order in the parable also matters. First the blade, then the ear, then the full grain. Three stages, and the blade looks like nothing. Every business I have built had a long blade stage where the only honest report was that it was too early to tell. In the Modern Mustard Seed content engine, the first ninety days produced almost nothing I could point to. Month five was the month it turned, and nothing about the system changed in between. What changed is that enough seed had been in the ground long enough.',
          'Your next step: pick the one thing you started and are tempted to kill, and give it a real season with a date on it. Ninety days, minimum. Write the date down so the decision is made by the calendar and not by your mood on a bad Tuesday.',
        ],
      },
      {
        heading: '3. The Four Seeds Every Business Plants',
        paragraphs: [
          'Businesses plant four kinds of seed, and almost everyone over-plants one and neglects another.',
          'Seed one, attention. Content, referrals, presence, being findable. Slowest to sprout, longest to compound, and the most abandoned. Most people quit attention seed at week six, right before the blade.',
          'Seed two, trust. Kept promises, delivered work, a phone call returned when you said it would be. This one only grows in real time and cannot be accelerated by any tool. AI can help you keep a promise you would otherwise forget. It cannot manufacture the history of having kept them.',
          'Seed three, capability. What you learn, what you build, the systems that stay after you stop touching them. This is the one AI genuinely accelerates, and it is where I would put your first reclaimed hour.',
          'Seed four, generosity. Value given with no invoice attached. The free answer. The referral you sent to someone who cannot pay you back. Second Corinthians nine calls it plainly: whoever sows sparingly will also reap sparingly, and whoever sows bountifully will also reap bountifully. In my own businesses the generosity seed has the longest lag and the highest yield, and I cannot draw you a line from any specific gift to any specific dollar. That is exactly the point of the seed growing secretly.',
          'Notice that AI meaningfully accelerates one of the four. Trust and generosity run on relationship time. Attention runs on repetition over months. Capability is the one that scales, which is why a business built only on capability with no attention or trust seed produces a very impressive machine that nobody calls.',
          'Your next step: score yourself one to ten on all four seeds. The lowest score is your next ninety days, and it is almost never the one you were about to work on.',
        ],
      },
      {
        heading: '4. Why the Gap Exists on Purpose',
        paragraphs: [
          'The last question is the one under all of this. If God can do anything, why did He build the world with a lag between planting and harvest?',
          'Because the gap is where the person gets made. James five says it out loud: be patient, therefore, brothers, until the coming of the Lord. See how the farmer waits for the precious fruit of the earth, being patient about it, until it receives the early and the late rains. The farmer is used as the picture of patience because farming makes patient people. You cannot rush a field, so a farmer either becomes patient or becomes miserable.',
          'The gap does three things. It builds character, because waiting well is a skill and there is no other way to acquire it. It filters, because most people quit in the gap, which is precisely why the harvest goes to the ones who did not. And it protects, because a harvest that arrives before you can handle it does not bless you, it buries you. I have watched businesses get an early harvest and get destroyed by it, because the systems were not built, the character was not formed, and the money arrived before the person did.',
          'This is also the honest answer to the AI promise of instant everything. If the gap is where formation happens, then a tool that eliminated the gap entirely would not be a blessing. It would be a way to arrive somewhere as a person who was never prepared to be there.',
          'Your next step: instead of asking how to make the harvest come faster, ask what the waiting season is trying to build in you. That is not a consolation prize. It is the actual assignment during the gap.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'Put down the overnight story. Every business you admire had a blade stage nobody saw, and the reason you did not see it is that nobody films the blade stage.',
          'And put down the idea that fast planting means fast harvest. You now have equipment that lets you plant a hundred acres in the time it used to take to plant one. That is a real advantage and it is worth having. It does not move the harvest one day closer. It means the harvest, when it comes, is a hundred acres wide.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'There is a version of the waiting season nobody puts in a business book, which is that sometimes you plant faithfully and the harvest does not come the way you asked.',
          'Habakkuk three is the passage for that. Though the fig tree should not blossom, nor fruit be on the vines, though the produce of the olive fail and the fields yield no food, yet I will rejoice in the Lord. That is a man looking at a failed harvest and saying his joy was never actually attached to it.',
          'I am not going to promise you a business outcome from a pulpit I do not stand in. What I will tell you is what the law of the seed actually guarantees. It guarantees that nothing sown is wasted, and it never promised you would recognize the harvest when it arrived. Some of what you plant this year comes back as a business. Some of it comes back as a person you helped who you never hear about again. Sow anyway. The record is kept by someone with a longer memory than the market.',
        ],
      },
      {
        heading: 'Do This This Week',
        paragraphs: [
          'First, set your season length before you start anything. Ninety days minimum for attention seed, one week for a system, one year for a new market. Write it down at the start, because a decision made in advance cannot be made by discouragement later.',
          'Second, use the compression where it actually works. Plant more this month than you planted all last year. More answers written, more follow-ups sent, more conversations started. The front of the cycle is where your new equipment earns its keep.',
          'Third, protect one waiting season. Pick the thing you have been about to quit and commit to it out loud, to one person, with a date. Say the date to somebody who will ask you about it.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The man from March did not quit. He sent me a note in July. Same system, nothing changed, and it had turned in month four. He said the hardest part was the six weeks after he emailed me, when the honest report was still nothing.',
          'That is the report during the blade stage. Nothing, and then everything, and no visible line between them.',
          'Plant more than you ever could before. Then sleep and rise, night and day. The earth produces by itself, and it does not need you standing over the row.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kl5-he-was-not-careful-he-was-afraid',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 5',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 9/22',
    pillar: 'KINGDOM',
    title: 'The Third Servant Was Not Careful, He Was Afraid',
    hook: 'Waiting for AI to settle down is not prudence. It is burying the talent and calling it wisdom.',
    directorNote:
      'The most confrontational episode of the season, and it has to be delivered with love or it will just wound people. Say the wicked and slothful line quietly, not with force, and give it a long beat. Block three is where you name your own version of burying, so tell that story straight and do not perform humility about it. Warm all the way up in Where Faith Sits, the point there is that fear is understandable and still not obedience.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'I keep hearing the same sentence, and it is always said in a reasonable tone of voice. I am going to wait until this AI thing settles down.',
          'It sounds wise. It sounds measured. And every time I hear it I think about a man in a parable who used almost exactly that logic and got the harshest words in the story.',
          'Here is what I want to do in this episode. I want to take the parable of the talents seriously enough to let it be as severe as it actually is, because we have sanded it down into a nice lesson about using your gifts. It is not a nice lesson. It is a warning, and the warning is aimed precisely at the most careful person in the room.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will see what the third servant actually did and why the master called it what he called it. You will be able to tell the difference between real prudence and fear wearing prudence as a costume, which is harder than it sounds because they say identical sentences. You will know the four ways business owners bury talents in the age of AI. And you will have a small, specific, low-stakes way to stop burying yours this week.',
          'Fair warning. If you have been telling yourself you are being careful, some of this will land hard. I am not aiming at you. I have buried talents myself and I will tell you about one of them in block three.',
        ],
      },
      {
        heading: '1. What the Third Servant Actually Did',
        paragraphs: [
          'Matthew twenty-five. A man going on a journey calls his servants and entrusts his property to them. To one he gives five talents, to another two, to another one, each according to his ability. Then he leaves.',
          'Two of them go at once and put the money to work, and both double it. The third digs a hole in the ground and hides his master’s money. Notice the text does not say he lost it. He did not gamble it away, he did not spend it, he did not steal it. He preserved it perfectly. By any accounting he was the safest of the three.',
          'When the master returns, listen to the third servant’s defense, because this is the center of the whole parable. He says: Master, I knew you to be a hard man, reaping where you did not sow and gathering where you scattered no seed, so I was afraid, and I went and hid your talent in the ground. Here, you have what is yours.',
          'Look at the structure of that sentence. He starts with theology, a claim about the master’s character. He ends with an action that sounds responsible. And right in the middle, in the hinge of the sentence, he tells the truth by accident: so I was afraid. The theology was not the reason. The theology was the cover story. Fear was the reason, and it dressed itself up as respect for the master’s standards.',
          'And the master does not say, well, at least you were careful. He says: you wicked and slothful servant. Those are the harshest words in the parable, and they fall on the only man who took no risk at all. Not on the one who lost money. On the one who risked nothing.',
          'Your next step: write down the last three business decisions you did not make. Next to each one, write the reason you gave. Then ask which of those reasons would survive that sentence structure, and be honest about where the word afraid actually belongs.',
        ],
      },
      {
        heading: '2. Prudence and Fear Say the Same Words',
        paragraphs: [
          'Here is the difficulty, and I am not going to pretend it away. Scripture also praises counting the cost. Jesus asks which of you, desiring to build a tower, does not first sit down and count the cost. Proverbs says the prudent sees danger and hides himself. Caution is a real virtue, not a fake one.',
          'So how do you tell them apart when they say identical sentences? Three tests, and they work.',
          'Test one: does it have a date? Prudence says, I am not doing this until March, because I need to close out the season first. Fear says, I am waiting until it settles down, which is a condition that will never be met because nobody can define it. A delay with no exit condition is not a delay. It is a decision, made permanently, without admitting it.',
          'Test two: are you learning during the wait? Prudence gathers information. It runs the small test, it makes the calls, it prices the thing. Fear waits and does nothing, and the waiting produces exactly as much knowledge on day two hundred as it did on day one.',
          'Test three: what is the actual downside, in dollars, written out? Prudence can name it. Fear cannot, because fear is not doing math, it is imagining a feeling. When you write the real downside on paper it is almost always smaller than the feeling, and the moment you see the number the fear has to argue on terms it will lose.',
          'Run those three tests on any hesitation you are carrying and you will know within about four minutes which one you are dealing with.',
          'Your next step: take the biggest thing you are currently not doing and run all three tests on it in writing. No date, no learning, no number means you already have your answer.',
        ],
      },
      {
        heading: '3. Four Ways Owners Bury Talents Right Now',
        paragraphs: [
          'These are the four holes I watch people dig, and I have been in one of them myself.',
          'Hole one, waiting for it to settle. It will not settle. There is no year on the calendar where the tools stop improving and a stable version arrives that you can finally learn. The people who are ahead are not the ones who waited for the final version. They are the ones who started with an unfinished one and kept adjusting.',
          'Hole two, waiting to fully understand it. You do not understand how your truck engine works either, and you drive it every day. Understanding is not the price of admission. Competence at the level you actually need it comes from use, not from study before use.',
          'Hole three, waiting for permission. From the industry, from a peer, from a pastor, from somebody who will tell you this is allowed. Nobody is coming. And notice how easily this hole disguises itself as humility.',
          'Hole four, and this is mine. Building instead of shipping. I spent five months once on an internal system that was going to be exactly right before anybody saw it. Five months. When I finally put it in front of real users, two of the things I had polished did not matter at all, and the one thing they needed I had not built. That is burying a talent with extra steps, and it is the version smart people fall into, because it feels like work the whole time you are doing it.',
          'What all four have in common is that they preserve the talent perfectly. Nothing gets lost. Nothing gets risked. And nothing multiplies.',
          'Your next step: name your hole out loud. One of those four is yours right now, and you knew which one before I finished the list.',
        ],
      },
      {
        heading: '4. The Small Bet Is the Obedience',
        paragraphs: [
          'Here is what I am not saying. I am not telling you to bet the company on a tool you have not used. The two faithful servants in the parable were not reckless. They traded, which is deliberate work, and they doubled, which is a reasonable return and not a lottery ticket.',
          'The move is the small bet, repeated. Not one enormous swing. A specific, bounded, cheap test with a real deadline, run over and over.',
          'Concretely, that looks like this. Pick one process. One. The quote follow-up, the intake call, the weekly report. Give yourself two weeks and a budget you would not miss. Build the smallest version that could possibly work and put it in front of a real situation, not a pretend one. Then keep it or kill it on the date, based on what actually happened, not on how you feel about it.',
          'That is trading, in the parable’s sense. The servants did not double the money in one transaction. They went to work, repeatedly, with what they had, and the multiplication was the result of many ordinary decisions rather than one heroic one.',
          'And the cost of the small bet is genuinely small. Two weeks and a few hundred dollars, against a downside you already wrote on paper in block two. Compare that to the cost of the hole, which is not a few hundred dollars. It is the entire difference between where your business is now and where it would have been.',
          'Your next step: define one small bet with a start date, an end date, a budget, and a single question it is designed to answer. Put those four things on one index card.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'Put down the idea that doing nothing is the safe option. Doing nothing is a choice with a cost, and the cost just does not show up on any statement. There is no line item called the customers we never reached because we waited.',
          'And put down the belief that risk is the opposite of faith. In this parable risk is the evidence of faith. The two servants who traded believed the master was good enough to be worth acting for. The one who buried it believed the master was waiting to catch him. What you do with the talent reveals what you actually think about the one who gave it.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'I want to be gentle here, because fear is not stupid and I am not mocking it.',
          'A lot of you are afraid for reasons that make sense. You got burned. You bought the last thing and it did not work and you felt foolish in front of your spouse. You have people depending on the income and it does not feel like your risk to take. Those are not weak reasons. They are the reasons of somebody carrying real weight.',
          'But look at what the master is actually described as in the story, and then look at what the third servant said about him. The master handed out enormous sums to servants and left the country. That is a man of extravagant trust. The servant called him hard and grasping, and that description was never true. He acted out of a picture of his master that was wrong.',
          'Second Timothy one says God gave us a spirit not of fear but of power and love and self-control. Self-control is in there, so this is not a verse against carefulness. It is a verse against the specific paralysis that comes from believing you are on your own and one mistake ends you. You are not. Act like the master is who He says He is.',
        ],
      },
      {
        heading: 'Do This This Week',
        paragraphs: [
          'First, name the hole. Which of the four are you in. Say it to one other person, because a fear said out loud gets about forty percent smaller on the way out of your mouth.',
          'Second, write the real downside in dollars. Actual dollars, on paper. Then look at the number and notice how much smaller it is than what you have been carrying.',
          'Third, make the small bet this week. Not next quarter. One process, two weeks, a budget you would not miss, one question. Put a date on the card and start.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The thing that gets me about that parable is that the third servant did not lose anything. He gave back exactly what he was handed. Perfect preservation. And that was the failure.',
          'It was never about protecting what you were given. It was about what you did with it while the master was gone.',
          'So do not wait for it to settle down. Make one small bet, this week, with a date on it. That is all obedience has ever looked like in this story.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kl6-selling-is-serving',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 6',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 9/29',
    pillar: 'KINGDOM',
    title: 'Selling Is Serving, and Jesus Made Offers',
    hook: 'If your work genuinely helps people, refusing to sell it is not humility. It is withholding.',
    directorNote:
      'Preach this one a little. It is the episode most likely to free money loose for a Christian viewer, and the resistance is emotional, so warmth carries it. The pearl and treasure section should be delivered with delight, not argument. Deliver the four-part offer anatomy in block four crisply, almost like a checklist, then slow back down for the Close.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'A woman who does grief counseling told me she hates the selling part of her business. She said it feels dirty, like she is taking advantage of people at their worst moment.',
          'So I asked her what happens to the people who never book with her. She got quiet, and then she said, most of them just stay stuck.',
          'That is the whole episode. She had built a picture of selling where the buyer loses and she wins, so every attempt to sell felt like taking. But in her actual business the person who does not buy is the person who stays stuck. Her reluctance was not protecting anybody. It was leaving people in a field with treasure in it and saying nothing, because pointing at the treasure felt rude.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will have a definition of selling that a Christian can hold without flinching. You will see how much of the public ministry of Jesus was structured as an offer, which is uncomfortable and worth sitting with. You will have the four parts of an offer that actually converts, in order. And you will know exactly what AI can and cannot do in a sale, so you build the right machine.',
          'This is the episode where the money usually moves, and it is not because of a technique. It is because a belief comes off.',
        ],
      },
      {
        heading: '1. The Definition That Fixes It',
        paragraphs: [
          'Start with the confusion, because two very different activities are wearing the same word.',
          'Manipulation moves a person toward what is good for you, using pressure, urgency, or a partial truth. Persuasion moves a person toward what is good for them, using clarity. Same energy, opposite direction. And the reason so many good people refuse to sell is that they have only ever been sold to by the first kind, so that is the only picture they have.',
          'Now hold that against what a sale actually is when the work is good. A person has a problem. You can remove it. There is a gap between those two facts, and the gap is made entirely of not knowing, not believing, and not deciding. Selling is the work of closing that gap. That is it. If the thing you sell genuinely works, then the sale is the moment the help becomes possible, and everything before the sale is just a person continuing to have their problem.',
          'Which reframes the guilt entirely. The question is never am I allowed to sell. The question is does the thing work. If it does not work, no amount of gentleness makes selling it acceptable. If it does work, then hesitance is not a virtue. It is a tax you are charging the people who needed you.',
          'Proverbs eleven, twenty-six is blunt about this. The people curse the one who withholds grain, but blessing crowns the one who sells it. There is a version of holding back that looks like modesty and functions like hoarding.',
          'Your next step: answer one question in writing. Does what I sell reliably work? If yes, you have no theological grounds left for hiding. If no, that is the real problem and no sales training fixes it.',
        ],
      },
      {
        heading: '2. Jesus Made Offers Constantly',
        paragraphs: [
          'This is the part that reorganized my thinking, and I want to walk through it carefully because it can be misused.',
          'Matthew thirteen. The kingdom of heaven is like treasure hidden in a field, which a man found and covered up. Then in his joy he goes and sells all that he has and buys that field. Immediately after: the kingdom of heaven is like a merchant in search of fine pearls, who, on finding one pearl of great value, went and sold all that he had and bought it.',
          'Look at the shape of those two stories. In both, the buyer discovers something worth more than everything he owns. In both, he liquidates. And in both, the emotional word attached to the transaction is joy. Jesus describes the kingdom using the structure of a purchase where the buyer knows he got the better end, and He tells it as good news.',
          'Then Isaiah fifty-five: Come, everyone who thirsts, come to the waters, and he who has no money, come, buy and eat. That is an offer with a call to action, and it is God speaking. Revelation twenty-two ends the entire Bible with an invitation: let the one who desires take the water of life without price. The last movement of Scripture is an offer being made.',
          'And Jesus qualified. He told the rich young ruler the price. He told the crowds to count the cost before following. He let people walk away, more than once, without chasing them. That is not the behavior of someone ashamed of what He was offering. It is the behavior of someone who knows the value is real and does not need to beg.',
          'Now the fence, because this analogy can go bad. Salvation is not for sale, and the price was not paid by the buyer. I am not saying the gospel is a product. I am saying that the pattern of naming something valuable, describing the exchange plainly, inviting a decision, and letting people choose is a pattern God uses constantly. So the discomfort you feel about making an offer is cultural, not biblical.',
          'Your next step: read Matthew thirteen, forty-four through forty-six, and notice the word joy. Then ask whether your customers feel that after buying from you. If they do, you have been apologizing for good news.',
        ],
      },
      {
        heading: '3. Why the Offer Is the Business',
        paragraphs: [
          'Here is a thing that took me too long to learn. Most struggling businesses do not have a marketing problem or a work-ethic problem. They have an offer problem, and they are trying to fix it with volume.',
          'A weak offer sounds like this: I do bookkeeping for small businesses. Accurate, forgettable, and it competes with everyone in the county on price. A strong offer sounds like this: I set up your books so you know, by the fifth of every month, which jobs made money and which ones cost you, and if I cannot tell you that by the second month you do not pay. Same person, same skill, same forty years of knowledge. Completely different business.',
          'The difference is not marketing polish. It is that the second one names an outcome, a timeframe, and a risk the seller carries instead of the buyer. Nothing about her capability changed. What changed is that she stopped describing her activity and started describing the result.',
          'This is why chasing more leads is usually the wrong move. Doubling the leads on a weak offer doubles the number of people who politely decline. Fix the offer and the same lead flow converts twice as well, at a higher price, with less persuasion required, because a clear offer does the persuading before you ever open your mouth.',
          'And this is where episode two comes back. Your price is set by the size of the problem you name. If your offer describes a task, you get task money. If your offer describes an outcome, you get outcome money. The invoice is downstream of the sentence.',
          'Your next step: write your current offer in one sentence, then rewrite it with an outcome, a timeframe, and something you guarantee. If you cannot guarantee anything, that tells you where your delivery is weak, which is useful information.',
        ],
      },
      {
        heading: '4. What AI Does in a Sale, and What It Never Will',
        paragraphs: [
          'Now the mechanics, because this is where people build the wrong machine.',
          'What AI does extremely well in a sale is everything around the conversation. Speed to first response, and the data on that is brutal: leads contacted within five minutes convert at a multiple of leads contacted an hour later, and most small businesses answer in hours or days. Qualification, so the conversations you take are with people who can actually buy. Follow-up, which is where the majority of sales are actually lost, not to a competitor but to nobody following up a fifth time. Proposals that go out the same day instead of Thursday. Memory, so nothing about this customer gets forgotten between conversations.',
          'What AI does not do is the moment. It cannot tell that the objection somebody just said out loud is not the real one. It cannot hear the pause before somebody says the number. It cannot decide that the right and honest move today is to tell this person not to buy, or to buy less, or to wait until spring. That is discernment, and it is the whole reason a person is talking to you and not a website.',
          'So build the machine in the right shape. AI runs the perimeter: speed, qualification, follow-up, paperwork, memory. You hold the center: the conversation where a human being decides to trust you. Get that shape backward, put the machine in the middle and yourself on the paperwork, and you will have automated the only part that was ever really yours.',
          'One rule I would not break. Anything that touches price, promises, or a commitment gets a human approval before a customer sees it. Not because the tool is bad. Because a wrong number in a customer’s hands is not a bug, it is a broken promise.',
          'Your next step: measure your speed to first response this week. Actual minutes, not what you assume. If it is over an hour, that is the highest-return system in your entire business and it is not close.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'Put down the belief that a good product sells itself. Nothing sells itself. The best builder in your county is usually not the busiest one, and the busiest one is usually not the best. That gap is not injustice, it is communication, and it is a learnable skill rather than a personality type.',
          'And put down the idea that being uncomfortable makes you honest. Your discomfort is not a moral achievement. It is just discomfort, and the person who needed your help cannot tell the difference between a seller who was too shy to make the offer and a seller who did not exist.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'The line I hold, and I hold it hard, is stewardship over extraction.',
          'Extraction asks how much can I get from this person. Stewardship asks what is actually best for this person, including the times when what is best is a no. That is why I will tell a prospect we are not the right fit, in one sentence, without softening it, and I will do it in the meeting where the money was on the table. Not as a technique. Because the alternative is taking money for something that will not work, and there is no revenue number that makes that acceptable.',
          'Luke six says give, and it will be given to you, good measure, pressed down, shaken together, running over. That is not a formula for return. It is a description of a person whose default posture is generous, and it happens to be the most durable business posture I know, because a business that serves people well is the only kind that survives the fifth year on referrals.',
          'And one more thing for the counselor from the cold open. The pearl merchant was not ashamed of the pearl. He knew what he had. If you know what you have, say it plainly. That is not pride, that is accuracy.',
        ],
      },
      {
        heading: 'Do This This Week',
        paragraphs: [
          'First, rewrite your offer with an outcome, a timeframe, and a guarantee. One sentence. Say it out loud to somebody who is not in your industry and see if they understand it.',
          'Second, fix the five minute problem. Whatever it takes, get your first response to a new inquiry under five minutes. That single change usually moves revenue more than an entire year of marketing.',
          'Third, build the follow-up sequence. Five touches, spaced out, that go out whether or not you remember. Most of the money in your pipeline is sitting in people who said not yet and then never heard from you again.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The grief counselor changed one thing. She stopped describing her sessions and started describing what a person’s life looks like nine months later. Her bookings went up sixty percent, and she told me the strangest part was that the conversations got easier, not harder.',
          'Of course they did. She stopped trying to talk people into something and started telling them the truth about what she can do.',
          'If it works, say so. Someone is standing in a field with treasure in it, waiting for a person kind enough to point.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kl7-skilled-hands-stand-before-kings',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 7',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 10/6',
    pillar: 'KINGDOM',
    title: 'Skilled Hands Stand Before Kings',
    hook: 'Diligence is not how many hours you work. It is how little distance there is between deciding and done.',
    directorNote:
      'Fast, energetic episode. This is the one with momentum in it, so pick the pace up about ten percent from episode four and keep it there. Block two is a list of four delays, hit each one crisply. Slow only twice: the Proverbs twenty-two line, and the last two sentences of the Close.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'Two contractors bid the same job in June. Same town, comparable crews, prices within four hundred dollars of each other. One of them got the work, and it was not the cheaper one.',
          'The difference was eleven days. The first guy walked the property Tuesday and had the proposal in the customer’s inbox Tuesday night. The second one walked it Wednesday and sent his bid the following Saturday, eleven days later, after two reminder texts.',
          'By then the customer had already decided, and here is what she decided. Not that the first bid was better. That the first guy was the kind of person who does what he says when he says it, and she was about to hand somebody eighty thousand dollars and access to her house. Speed was not a sales tactic in that story. It was character, showing up as a timestamp.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will have a definition of diligence that is about distance rather than hours, which will change how you evaluate your own week. You will know the four places delay hides in a small business and roughly what each one costs. You will understand why speed reads as trustworthiness to a buyer, which is not obvious and is worth money. And you will know which parts of your response time a machine can close permanently.',
          'And I want to name the thing this episode is not. It is not a case for rushing. Rushing is doing the work badly, faster. What I am after is the gap between the moment you know what to do and the moment it is actually done, which for most businesses is measured in days and should be measured in minutes.',
        ],
      },
      {
        heading: '1. Diligence Is Distance, Not Hours',
        paragraphs: [
          'Proverbs twenty-two, twenty-nine. Do you see a man skillful in his work? He will stand before kings; he will not stand before obscure men. Read the condition on that promise. Skillful. Not busiest, not most exhausted, not longest hours. Skill is what puts a person in front of decision makers.',
          'And Proverbs twelve, twenty-four: the hand of the diligent will rule, while the slothful will be put to forced labor. That second half is worth sitting with, because forced labor is exactly what a business feels like when everything is late. You are working constantly and none of it is chosen. Delay does not save you effort. It converts your effort into emergency.',
          'So here is the definition I want you to use. Diligence is the distance between decision and done. Not the number of hours logged. Two businesses can both work sixty hour weeks and have wildly different distances, because one of them acts on decisions immediately and the other maintains a graveyard of decided things that have not happened yet.',
          'Most owners are not lazy. That is not the diagnosis. Most owners have a decision graveyard: the price change decided in April and implemented in September, the hire approved in her head three months before the job posting, the follow-up she meant to send. Every item in that graveyard was already decided. All of them are waiting on nothing but execution.',
          'Your next step: write down five things you have already decided and have not done. Note the date you decided each one. The total distance in that column is your actual diligence number, and it is more honest than your hours.',
        ],
      },
      {
        heading: '2. The Four Places Delay Hides',
        paragraphs: [
          'Delay is never one big thing. It is four small ones, and they are boring, which is why they survive.',
          'Delay one, response time. Someone reaches out and hears back in hours or days. The data on this is not subtle: contacting a new lead within five minutes converts at a multiple of contacting them an hour later, and after a day you are mostly talking to somebody who already hired someone else. Most small businesses respond in hours, and most of them believe they respond in minutes.',
          'Delay two, decision time. The choice sits because it does not have a deadline attached. Nobody is waiting on it, so it waits forever. Almost every decision an owner agonizes over for three weeks would have been made just as well in twenty minutes, because the missing information was never going to arrive.',
          'Delay three, handoff time. The work is done and it sits on somebody’s desk. The proposal is written but unsent. The invoice is ready but not out. The report is finished but not delivered. This is the cruelest one, because the work is already paid for and the value is being withheld by nothing but a step nobody owns.',
          'Delay four, follow-up time. The customer said not right now, and then nobody ever went back. Most sales in a small business are lost here, in silence, months after the conversation everybody remembers.',
          'Total those honestly and you get a number that will bother you. In most businesses the sum of the four delays is bigger than the actual working time in the job.',
          'Your next step: measure just one of the four this week. Response time is the easiest to measure and the most expensive to ignore. Write down the actual minutes on your next ten inquiries.',
        ],
      },
      {
        heading: '3. Speed Is How Buyers Test Character',
        paragraphs: [
          'Now the part people underestimate, because they think speed is a convenience feature. It is not. It is evidence.',
          'Put yourself in the customer’s chair. They are about to spend real money with somebody they do not know well, and they have almost no information about whether that person keeps commitments. So they use the only sample they have. You said you would send the quote by Friday. It is Tuesday. Now they know something about you, and it is not about the quote.',
          'This is why the fast bid wins even when it costs more. The customer is not buying speed. They are buying the reduced risk that this person disappears in week three of the job. Every fast, kept, small promise in the sales process is a data point saying the big promises will probably be kept too.',
          'Which means the reverse is also true, and it is expensive. Every late follow-up is a preview of your project management. Every unanswered call is evidence about what happens when there is a problem on site. Nobody says that out loud. Everybody feels it.',
          'Matthew five, thirty-seven has the underlying principle: let what you say be simply yes or no. A yes that arrives on the day you said it is a small thing, and it is the smallest available proof of everything larger.',
          'Your next step: pick the one promise you make most often in your sales process, the quote, the call back, the site visit, and make that one promise unbreakable for thirty days. Not all of them. One.',
        ],
      },
      {
        heading: '4. What a Machine Can Close Permanently',
        paragraphs: [
          'Here is where this gets practical, because you cannot fix the four delays with more discipline. You have tried. Discipline runs out at four in the afternoon on a hard day, and the delays come back.',
          'Systems do not run out. Take the four in order.',
          'Response time goes to zero permanently. A voice agent answers every call, at any hour, gets the details, qualifies the person, and books straight into your calendar. Not a message taker. A first conversation that ends with an appointment. This is the single highest-return system in most small businesses, and it is not close.',
          'Decision time is the one that stays human, but it can be shortened. Get the information in front of you automatically, on a schedule, in one place, and most of the three week decisions collapse to twenty minutes because the delay was never deliberation. It was gathering.',
          'Handoff time gets eliminated by removing the step. The proposal that is done sends itself when you approve it. The invoice goes out when the job is marked complete. Anything that sits waiting for somebody to remember it is a system that has not been built yet.',
          'Follow-up time is where the money actually is. Five touches, spaced, automatic, personalized from what you already know about the person, running whether or not this week was hard. I would put this second only to response time, and in some businesses it is first.',
          'Notice none of that speeds up your actual craft. The job still takes the days it takes. What disappears is the dead time between the parts, and in most businesses the dead time is the majority of the calendar.',
          'Your next step: take the delay you measured in block two and build the system that closes it. One delay, one system, two weeks.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'Put down the belief that busy equals diligent. Proverbs did not promise kings to the busiest man. It promised them to the skilled one, and you can be exhausted and unskilled at the same time. Most owners are.',
          'And put down the idea that speed and quality trade against each other. They trade only when speed means rushing the craft. Closing the gap between finished and delivered does not touch the craft at all, and it is where nearly all the available speed is hiding.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'There is an older name for this, and it is not productivity. It is the speed of obedience.',
          'Psalm one nineteen, sixty: I hasten and do not delay to keep your commandments. Hasten and do not delay. That is a man describing the gap between knowing what is right and doing it, and treating the size of that gap as a spiritual matter, not a scheduling one.',
          'That is what has kept this from turning into hustle for me. I am not chasing speed for its own sake, and I am not impressed by anyone who is. What I am after is the shrinking of the distance between what I know I should do and when I actually do it, because that distance is where most of my failures live. Not in the deciding. In the delay after the deciding.',
          'And James four, seventeen, closes it in one line: whoever knows the right thing to do and fails to do it, for him it is sin. That is a heavier verse than a business episode probably deserves. It is also exactly what a decision graveyard is.',
        ],
      },
      {
        heading: 'Do This This Week',
        paragraphs: [
          'First, empty the graveyard. Take the five decided things you wrote down in block one and do three of them this week. Not perfectly. Done beats pending, and three of five is a real dent.',
          'Second, put a five minute response system on your front door. Voice agent, instant text back, whatever fits your business. If somebody reaches out and hears nothing for an hour, that is the most expensive hour in your week.',
          'Third, pick one promise and make it unbreakable for thirty days. Quote in twenty-four hours, or call back same day. One promise, kept every single time, and watch what it does to your close rate.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The contractor who lost that bid is a better builder than the one who won it. I know both of them. His work is genuinely nicer.',
          'It did not matter, because the customer never got to see the work. All she got to see was eleven days.',
          'Skill puts you in front of kings. Delay keeps you in the shop, doing forced labor you chose without meaning to. Close the distance.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kl8-business-that-can-keep-the-sabbath',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 8',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 10/13',
    pillar: 'KINGDOM',
    title: 'Build a Business That Can Keep the Sabbath',
    hook: 'A business that cannot survive one day without you is not a business. It is a job with anxiety attached.',
    directorNote:
      'The most personal episode of the season. Tell the hospital story plainly, no self-pity and no heroism, just what happened. Let the silence sit after the manna line. This one should feel slower than every other episode, all the way through, because the content is about rest and a rushed delivery would contradict it. The Close is almost a benediction.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'Two years ago I sat in a hospital waiting room for eleven hours with a family member, and I answered forty-one work messages while I sat there. Not because any of them were urgent. Because if I did not answer them, nothing would happen, and I had built a business where every single thing waited on me.',
          'I remember thinking, in that room, that I had built myself a very sophisticated cage and then decorated it.',
          'Exodus twenty says six days you shall labor and do all your work, but the seventh day is a Sabbath. Notice the assumption buried in that command. It assumes it is possible to stop. God did not give a command that required a business to collapse in order to obey it. So if your business genuinely cannot survive one day without you, that is not a scheduling problem. That is a design problem, and it is worth naming as one.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will know the difference between a business and a job you own, and how to tell which one you have. You will have the four things that must run without you before rest is even possible. You will understand the manna principle, which is the part that makes rest an act of trust instead of a luxury. And you will have a specific test to run in the next thirty days that tells you the truth about your own design.',
          'I am going to be direct about something first. I do not build systems primarily to make more money. I build them so that a Tuesday in a hospital waiting room does not cost me my business, and so a Sunday can actually be a Sunday. The revenue is real. It was never the reason.',
        ],
      },
      {
        heading: '1. Rest Was the Design, Not the Reward',
        paragraphs: [
          'Look at where the Sabbath sits in the story, because the placement is the argument.',
          'Genesis two. God finishes creation on the sixth day and rests on the seventh, and He blesses that day and makes it holy. God did not need to recover. Rest is not recovery in that passage. It is completion, and it is built into the structure of the week before there is a single human being to be tired.',
          'Then Exodus twenty ties the command back to that pattern. And Mark two, twenty-seven has Jesus saying the Sabbath was made for man, not man for the Sabbath. Made for you. It is a gift, given in your favor, and somehow we have turned it into either a legal burden or a nice idea we will get to when things calm down.',
          'Here is what I actually believe about that. Refusing to rest is not evidence of diligence. It is usually evidence of one of two things. Either you have built something that cannot run without you, which is a design failure and fixable. Or you believe that if you stop, it all falls apart, which is a trust problem and much harder.',
          'Psalm one twenty-seven says it in a way that stings a little: it is in vain that you rise up early and go late to rest, eating the bread of anxious toil, for He gives to His beloved sleep. The bread of anxious toil. That is a description of exactly the kind of work I was doing in that waiting room, and the psalm calls it vain, which is a stronger word than unwise.',
          'Your next step: answer honestly which one you have. A design problem or a trust problem. Most people have some of both, and they need different medicine.',
        ],
      },
      {
        heading: '2. A Business Versus a Job You Own',
        paragraphs: [
          'The test is simple and most owners fail it. If you disappear for thirty days, what happens? If revenue continues, you own a business. If revenue stops, you own a job with more risk and worse benefits than employment.',
          'That is not an insult. It is where nearly everyone starts, and there is no shame in the starting point. The shame would be staying there for twenty years without noticing that the arrangement never actually changed.',
          'Four functions have to run without you before rest is possible, and only four.',
          'One, the front door. New inquiries get answered, qualified, and booked whether or not you are available. If every new customer requires your personal attention to become a customer, your growth ceiling and your rest ceiling are the same number.',
          'Two, delivery. The work gets done to standard by a person or a process that is not exclusively you. This is the hardest one for craftspeople, and it is not always full delegation. Often it is a documented standard plus one trained person plus a system that catches the exceptions.',
          'Three, money. Invoices go out, payments come in, and somebody or something notices when they do not. Most owners are the accounts receivable department and do not know it.',
          'Four, memory. The business remembers customers, commitments, and history without your recall. If the only place your customer history lives is your own head, you cannot ever be gone, because being gone means the business gets amnesia.',
          'Your next step: rate all four from one to ten on how well they run without you. The lowest number is the only one that matters, because rest is capped by the weakest of the four.',
        ],
      },
      {
        heading: '3. The Manna Principle',
        paragraphs: [
          'Exodus sixteen is the passage I did not understand for years, and it is the most practical one in this episode.',
          'Israel is in the desert and God sends manna every morning. The instruction is to gather enough for that day only. Anyone who hoards extra finds it full of worms the next morning. Except on the sixth day, when they gather twice as much, and that portion does not spoil, because the seventh day is a Sabbath.',
          'Two things are happening in that story at once. First, God is training a people out of hoarding, daily, for forty years. Second, and this is the part I missed, He builds provision for the rest day into the day before. The double portion is the mechanism. Rest was not left to willpower. It was resourced in advance.',
          'That reframed automation completely for me. A system that runs while you sleep is a double portion. It is work you did on the sixth day that provides on the seventh. The voice agent answering at nine on a Sunday night is not me working Sunday. It is me having worked Thursday.',
          'But keep the order straight, or this turns into a justification for never stopping. The manna was still the provision of God, not the cleverness of the people. The point of the double portion was not that they got more. It was that they could stop. If your systems make you more available rather than more free, you have built a hoard, not a double portion, and it will have worms in it by morning.',
          'Your next step: name one thing you currently do on your day off. Then ask what would have to exist for that thing to be handled on the sixth day instead.',
        ],
      },
      {
        heading: '4. The Night Shift',
        paragraphs: [
          'Here is what the double portion actually looks like in a business in 2026, concretely.',
          'The phone gets answered at nine on a Saturday night by an agent that knows your pricing, your service area, and your standards, and it books the appointment into Monday. The follow-up sequence for last week’s quotes runs on Sunday morning without you. The invoices for finished jobs go out on schedule. The report that tells you what happened while you were gone is written and waiting on Monday. Nobody was working. The work was still done.',
          'That is what I mean by the night shift, and it is the single most important thing I have built for my own life. Four ventures out of a small town in Montana does not work because I am fast. It works because a large amount of the operation runs at hours when I am asleep, and I designed it that way on purpose after the waiting room.',
          'Two rules I would not break, though. First, the systems have to be trustworthy on their own, or you have not delegated anything, you have just added a thing to supervise. That means real guardrails: it works from your actual numbers, it never quotes what it should not, and it hands off to a human at the moments that matter.',
          'Second, and this one is harder, you have to actually stop. I know owners with beautiful automation who check the dashboard forty times on their day off. The system rested. They did not. The tool cannot make you trust it. That part is yours.',
          'Your next step: pick the one function from block two with the lowest score and build the night shift version of it. Not all four. The lowest one, because that is the one capping your rest.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'Put down the belief that being needed is the same as being valuable. Being needed for everything is a bottleneck, and a bottleneck is not an achievement even when it feels like importance. The most valuable thing you can build is something that is excellent without you standing over it.',
          'And put down the idea that rest is what happens after you catch up. You are not going to catch up. That is not pessimism, it is arithmetic. Work expands. Rest has to be built in on purpose, in advance, on the sixth day, or it never arrives.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'The hardest part of this is not technical. I want to say that plainly because I could give you a build plan and you still would not rest.',
          'Underneath a business that cannot stop is almost always a belief that everything depends on you. And when you say that out loud it is obviously not true, and we all live like it anyway.',
          'Psalm one twenty-seven again: unless the Lord builds the house, those who build it labor in vain. Unless the Lord watches over the city, the watchman stays awake in vain. That is not an argument against building or against watching. It is an argument against the frantic version of both. You are not the one holding it together, and you never were, and the Sabbath is the weekly practice of admitting it.',
          'So keeping a Sabbath is not a productivity hack and I refuse to sell it as one. It is a weekly statement that the business is not God, that you are not indispensable, and that the world keeps turning for twenty-four hours without your attention. Building systems so you can rest is stewardship. Building systems so you can work seven days instead of six is just a nicer cage.',
        ],
      },
      {
        heading: 'Do This This Week',
        paragraphs: [
          'First, run the four function audit. Front door, delivery, money, memory, scored one to ten without you. Be honest, because a generous score here just delays the fix.',
          'Second, build one night shift system, starting with the lowest score. Two weeks, one function. The front door is where most people should start.',
          'Third, take one full day off in the next thirty and do not check anything. Phone in a drawer. Whatever breaks is your real diagnostic, and it is cheaper to find out now, on purpose, than in a hospital waiting room.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'I took a full week off last spring. Actually off. Revenue that week was the same as the week before, and I found out later that thirty-one calls were answered, nine appointments were booked, and two proposals went out while I was not thinking about any of it.',
          'That week is the return on everything I have built. Not the revenue. The fact that the machine kept a promise to a stranger on a Wednesday while I was on a lake.',
          'Six days you shall labor. On the seventh, stop. Build the double portion so that stopping is possible, then have the nerve to actually stop.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kl9-knowledge-is-cheap-wisdom-is-not',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 9',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 10/20',
    pillar: 'KINGDOM',
    title: 'Knowledge Went to Zero. Wisdom Did Not.',
    hook: 'Every fact is free now. What is not free is knowing which fact matters, and what to do about it by Friday.',
    directorNote:
      'Teach this one like the payoff of the season, because it is. The Solomon section should be delivered with real wonder, he could have asked for anything. Land hard and flat on the line about a machine having no skin in the game. The three tiers in block three want a hand gesture, same one every time. Close is quiet and certain.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'A friend of mine got a diagnosis last year and did what everyone does. He read everything. Studies, forums, the AI summaries, all of it, and he came out the other side knowing more about that condition than most people ever will.',
          'Then he sat down with a doctor who has treated it for twenty-two years, and she said, based on your age and your history and this one number in your bloodwork, we are going to do the second option, not the first one, and here is why. He told me later that he had read that exact recommendation four times online and had no way to know it applied to him.',
          'That is the gap that defines this whole era. He had the knowledge. She had the judgment. Knowledge is now free and infinite. Judgment is neither, and the price of the two just went in opposite directions.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will be able to tell knowledge, understanding, and wisdom apart precisely, which sounds academic and is actually the most practical distinction in your business. You will know why the value of information collapsed and what got more valuable in the same motion. You will know the four things a machine structurally cannot do, not because it is early, but because of what it is. And you will know how to price and position the thing you actually sell now.',
          'This is the payoff of everything in this season. Episode one said AI amplifies what you know. This episode is about what kind of knowing is worth amplifying.',
        ],
      },
      {
        heading: '1. Three Different Words We Use Interchangeably',
        paragraphs: [
          'Proverbs treats these as three distinct things, and once you see the distinction you cannot unsee it.',
          'Knowledge is information. The facts. What the code says, what the study found, what the price is. Proverbs one, seven, says the fear of the Lord is the beginning of knowledge, which puts even facts under something larger, but knowledge itself is the raw material.',
          'Understanding is seeing how the facts relate. Why this causes that. What happens if you change this one thing. It is the difference between knowing that a beam is undersized and knowing what that means for the wall in eight years.',
          'Wisdom is knowing what to do. It is applied. Proverbs four, seven, says wisdom is the principal thing, therefore get wisdom, and with all your getting, get understanding. The Hebrew word behind it is not abstract at all. It shows up in Exodus describing skilled craftsmen. Wisdom in Scripture is closer to skill than to philosophy. It is knowing the right move and being able to make it.',
          'Now map that onto the tools. AI has essentially all recorded knowledge and is astonishingly good at it. It has a great deal of understanding, genuinely, and it can explain relationships better than most humans can. It has zero wisdom, and that is not a maturity issue that gets solved in the next release. Wisdom requires knowing this situation, these people, this moment, and carrying the consequences of being wrong. A model has none of those.',
          'Your next step: take the last three real decisions you made in your business and ask which layer they required. Almost none of them were knowledge problems. You knew the facts. You were deciding.',
        ],
      },
      {
        heading: '2. What Happens When Information Goes to Zero',
        paragraphs: [
          'For most of history, expertise and information access were the same product. The lawyer knew what the statute said and you did not. The mechanic knew what the noise meant and you did not. You paid for access to information locked in a person.',
          'That business is over. Not declining. Over. Any customer can now get a competent explanation of almost anything you know, in thirty seconds, for free, at two in the morning, in the tone of their choosing.',
          'If your value was being the person who knows things, that value went to nearly zero and it is not coming back. I would rather say that plainly than let anyone find out slowly.',
          'But watch what got more valuable in the same motion, because this is not a story about decline. Three things went up. Curation, because when there are ten thousand answers, knowing which three matter here is worth more than the ten thousand. Application, because the gap between a correct general answer and the right move for this specific business is exactly where every real problem lives. And accountability, because a machine can tell you what to do and it cannot be responsible for it. Somebody has to stand behind the decision, and that person can charge for standing there.',
          'So the expert did not disappear. The expert changed jobs. You used to be paid for having the answer. Now you are paid for knowing which answer, for this person, this week, and for being the one who is wrong if it does not work.',
          'Your next step: audit your last ten customer conversations and mark which ones were information requests and which ones were judgment requests. The ratio is a forecast of your next five years.',
        ],
      },
      {
        heading: '3. Four Things a Machine Structurally Cannot Do',
        paragraphs: [
          'I want to be careful to say why these are structural rather than temporary, because saying AI cannot do something has aged badly for a lot of people.',
          'One, it cannot know your context. Not because it is not smart. Because the information is not written down anywhere. That this customer is going through a divorce and that is why the timeline moved. That the county inspector retires in March. That your best crew lead is stretched thin right now and cannot take another job. Reality is mostly unrecorded, and a model can only work with what exists in text.',
          'Two, it cannot have skin in the game. It does not carry the loss. If the advice is wrong, nothing happens to it. It has no reputation in your town, no payroll to make, no relationship that gets damaged. And here is why that matters more than it sounds: risk changes what you recommend. A person with something at stake gives different advice than a person with nothing at stake, and the difference is not intelligence, it is consequence.',
          'Three, it cannot value. It can tell you the trade-offs between two options perfectly and it cannot tell you which one is right, because right depends on what matters, and what matters is a human question. Should you take the bigger contract that costs you your Saturdays? No model can answer that, because the answer is about who you are trying to be.',
          'Four, it cannot be trusted, in the specific sense that matters. Trust is a track record between people. When someone hands you their business, they are not evaluating capability, they are evaluating whether you will still be here and still be honest when something goes wrong. That is earned across years and it is not transferable to a tool.',
          'Every one of those four is a wisdom function. And notice that all four get more valuable as the knowledge layer gets cheaper, because when everyone can get the facts, the scarce thing is the person who can decide.',
          'Your next step: write down which of the four you are strongest at. That is what you actually sell now, whatever your invoice currently says.',
        ],
      },
      {
        heading: '4. Selling Judgment Instead of Information',
        paragraphs: [
          'So how does this change the business, concretely? Four moves.',
          'Move one, give the information away. Genuinely. Answer every question publicly, in detail, for free. It used to be that giving away your knowledge cost you the sale. Now the knowledge is free anyway, so hoarding it buys you nothing and only makes you harder to find. Give it away and the giving becomes the proof that you know what you are talking about.',
          'Move two, charge for the decision. Reposition from doing the task to owning the outcome. Not I will build you a website, but I will make sure people who need you can find you and reach you, and here is what that looks like in ninety days. One is an activity. The other is a judgment you are standing behind.',
          'Move three, sell the filter. Your customers are not short on options. They are drowning in them. The most valuable sentence you can say to somebody right now is: of the fourteen things you could do, do these two, and do not do the other twelve. Elimination is worth more than addition when everyone has infinite options.',
          'Move four, use AI to widen the reach of your judgment, not to replace it. Every system I have built runs on rules that came out of my own head. What we quote and what we refuse. What gets escalated to a person. What we will not say to a customer. The machine executes at a scale I could never reach personally, and every decision inside it is one I made. That is amplification. The moment the machine starts making judgment calls I did not define, it stopped amplifying me and started impersonating me.',
          'Your next step: write down five rules that govern how you make decisions in your business. Those five sentences are what any system of yours should be built on, and most people have never written them down.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'Put down the idea that knowing more is the path forward. You are already past the point where more information helps. What compounds now is better judgment about the information you already have, and judgment compounds through reps and consequences, not through reading.',
          'And put down the fear that AI knowing more than you makes you less valuable. A library has always known more than any librarian. It never made the librarian less useful, because the job was never to be the biggest container.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'First Kings three is the passage I keep going back to on this, and the detail that matters is what was on the table.',
          'God appears to Solomon and says, ask what I shall give you. Anything. And Solomon asks for an understanding mind to govern the people, that he may discern between good and evil. In some translations, a listening heart. He is standing in front of unlimited access and he asks for discernment.',
          'Read what he did not ask for. Not information. Not long life, not riches, not the death of his enemies, and the text points that out specifically. He asked for the ability to decide well on behalf of people who were depending on him.',
          'That is the whole thing, and it lands differently in a year when information is free. Solomon could have asked for the ancient equivalent of every answer and he asked for a listening heart instead, because he understood something we are relearning the hard way: the constraint was never access. It was discernment.',
          'James one says if any of you lacks wisdom, let him ask God, who gives generously to all without reproach. Notice the offer is still open, and notice what it is for. Not information. Wisdom. The scarce thing.',
        ],
      },
      {
        heading: 'Do This This Week',
        paragraphs: [
          'First, write your five decision rules. The actual heuristics you use, in plain sentences. This is the highest leverage writing you will do all year, because everything you automate later gets built on them.',
          'Second, give away one piece of knowledge you have been protecting. Post it, record it, send it. Watch what happens to trust, and notice that nobody stole your business with it.',
          'Third, reprice one offer from activity to outcome. Same work, different sentence, different number. What you are selling changed years ago. Your invoice should catch up.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'My friend with the diagnosis is fine, by the way. He took the second option.',
          'What stays with me is what he said about that appointment. He said he walked in with more information than the doctor and walked out understanding that he had never had the one thing that mattered.',
          'Every fact is free now. What to do about it, for you, by Friday, is not. That is what you sell. Price it that way.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kl10-build-for-the-fourth-generation',
    kind: 'episode',
    episode: 'Kingdom Leverage · Ep 10',
    session: 'Kingdom Leverage · Season Two',
    publish: 'Publishes Tue 10/27',
    pillar: 'KINGDOM',
    title: 'Build Something Your Grandchildren Can Run',
    hook: 'Income feeds a family for a year. An asset feeds one for a generation. Only one of those two survives you.',
    directorNote:
      'Season finale. Slower and warmer than everything before it, and it should feel like a summing up. Name the nine principles in the recap section at a steady clip, do not rush them, they are the season. The Deuteronomy six section is the emotional peak. End on the creed with a long pause before it, and hold the frame after.',
    sections: [
      {
        heading: 'Cold Open',
        paragraphs: [
          'There is a bakery in my town that has been in the same family for three generations. The grandmother started it in a kitchen. The son built the storefront. The granddaughter runs it now and she has never had a job interview in her life.',
          'And there is a very successful contractor about forty minutes away who out-earned that whole bakery, personally, for twenty-five years. When he retired, there was nothing to hand anyone. No business, no asset, no name that transferred. He had a job that paid extremely well, and when he stopped, it stopped.',
          'Same decades. Same work ethic. One family got a machine. The other got a paycheck, a large one, that ended. Proverbs thirteen, twenty-two says a good man leaves an inheritance to his children’s children. Not an income. An inheritance. That is a design instruction, and this episode is about how to follow it.',
        ],
      },
      {
        heading: 'The Promise',
        paragraphs: [
          'By the end of this episode you will know the difference between income and an asset in terms concrete enough to audit your own business. You will know the four things that make a business transferable rather than personality dependent. You will understand what actually gets inherited, which is not primarily money. And you will have the first step toward building something that outlives your involvement.',
          'This is the last episode of the season, so I am also going to put the whole thing back together at the end. Nine principles in about two minutes.',
        ],
      },
      {
        heading: '1. Income Versus Asset',
        paragraphs: [
          'Income is what you earn for work you did. It stops when you stop. It can be enormous and it is still fundamentally the same shape as a wage, no matter what the tax return says.',
          'An asset is a thing that produces without your continuous labor. It has value independent of you. It can be sold, handed down, or run by somebody else. That is the whole distinction, and almost every high earner I know has confused the two for at least a decade.',
          'Here is the test that cuts through it. If you stopped working for a year, what would still be worth something? Not what would still pay you. What would still be worth something to somebody else. For most business owners the honest answer is a truck, some tools, and a reputation that fades in about eighteen months.',
          'And the trap here is that income feels safer, which is why smart people stay in it. Income is immediate, predictable, and it does not require you to spend this month building something that pays nothing this month. Assets require exactly that. You do work now that produces nothing now.',
          'Which is the seed principle from episode four, wearing different clothes. Seedtime and harvest. An asset is a very long seedtime with a very long harvest, and it feels like waste right up until the year it does not.',
          'Your next step: write down what your business would sell for tomorrow if you were not part of the deal. That number, honestly assessed, is how much asset you have built. The rest is income.',
        ],
      },
      {
        heading: '2. Four Things That Make a Business Transferable',
        paragraphs: [
          'A transferable business has four things, and most owner-operated businesses have zero to one of them.',
          'One, documented process. The way the work gets done exists outside your head, in writing, in enough detail that a competent stranger could follow it. If your standards live only in your judgment, your business dies with your attention.',
          'Two, systems that run without a specific person. The phone gets answered, follow-up happens, invoices go out, records are kept, and none of it depends on you or on one irreplaceable employee. This is where the last three years of tooling changed what is possible for a small business, dramatically, because you no longer need a staff of twelve to have an operation that runs.',
          'Three, a customer relationship with the business, not just with you. This is the hardest one and I will not pretend otherwise. People buy from people. But there is a real difference between a customer who trusts you personally and a customer who trusts the name on the truck, and the second kind transfers. The bakery has that. The contractor did not.',
          'Four, an owner who is not the bottleneck. If every decision goes through you, nobody can buy it and nobody can inherit it, because what they would be inheriting is a job that requires being you.',
          'Notice that all four of those are exactly what you have been building all season. Documented process is the brain dump from episode one. Systems are episodes three and eight. The whole thing has been pointed here.',
          'Your next step: score the four, one to ten. The lowest score is the reason you do not have an asset yet, and it is almost always number one.',
        ],
      },
      {
        heading: '3. What Actually Gets Inherited',
        paragraphs: [
          'Now I want to complicate the money version of inheritance, because Scripture does.',
          'Deuteronomy six is not about money at all. It says these words that I command you today shall be on your heart, and you shall teach them diligently to your children, and shall talk of them when you sit in your house, and when you walk by the way, and when you lie down, and when you rise. Sitting, walking, lying down, rising. That is a description of ordinary life, and the instruction is that transmission happens inside it.',
          'So here is what actually gets inherited, in order of durability. Character first, and it is caught rather than taught. Your kids learn what a working life looks like by watching yours. If they see a man who was never home and never rested and was anxious about money for thirty years, that is the inheritance, and no bank account offsets it.',
          'Then skill and knowledge. The bakery granddaughter did not inherit a building. She inherited fifty years of knowing how the dough behaves in August. That transferred because somebody was deliberate about transferring it.',
          'Then relationships and reputation. A name that means something in a place is a real asset, and it is one of the few that appreciates after you are gone.',
          'Then the asset itself, and then money, in that order. Money is last on purpose. Money without the first four gets consumed, usually within one generation, and everyone reading this can name a family where that happened.',
          'Your next step: ask what your children are currently learning about work from watching you. That is the inheritance in progress, and it is being written whether or not you meant to write it.',
        ],
      },
      {
        heading: '4. Stewardship Over Extraction',
        paragraphs: [
          'There are two ways to build, and they look identical for the first few years.',
          'Extraction asks how much can I get out of this. Maximum revenue, minimum input, sell at the peak, and if the customers or the town or the people take the cost, that is a rounding error. It works, in the sense that it produces money. It just produces nothing that lasts.',
          'Stewardship asks what am I building and who will hold it after me. It makes decisions on a longer clock. It leaves margin. It builds the thing well when nobody would notice the difference for ten years. It refuses money that would cost the thing being built.',
          'This is the standard I hold Modern Mustard Seed to, and it shows up in an unglamorous place: we build assets our clients own and can operate without us. Hand Off is a tier and not an afterthought. If a client wants to run the whole thing themselves in year three, that is a success, not a lost account. A business model that depends on the client never being able to leave is extraction with a nicer invoice.',
          'And the same standard applies to what you are building. The systems, the documentation, the process, the name. Build it so somebody else can hold it. That is what makes it an asset instead of a very sophisticated way to stay busy.',
          'Your next step: name one decision you are currently making on a one year clock that should be made on a ten year clock. Then make it on the ten year clock.',
        ],
      },
      {
        heading: 'The Unlearning',
        paragraphs: [
          'Put down the idea that a high income is the same as wealth. It is not. Wealth is what continues. Income is what arrives, and the two feel the same right up until the year you stop.',
          'And put down the idea that building for the long term means going slow. It does not. It means the things you do fast are chosen differently. You can move quickly toward something that lasts, and the tools you now have make that faster than it has ever been. Speed is not the enemy of permanence. Aimlessness is.',
        ],
      },
      {
        heading: 'Where Faith Sits',
        paragraphs: [
          'Psalm ninety, twelve: teach us to number our days that we may get a heart of wisdom. Numbering days is not morbid. It is the only honest planning horizon any of us has.',
          'And there is a hard sentence in Ecclesiastes that I think about often. Solomon says he hated all his toil because he must leave it to the man who will come after him, and who knows whether he will be wise or a fool. That is real. You do not control what happens to what you build. The bakery could close in ten years.',
          'So build anyway, and hold it loosely, and understand what the building is for. First Corinthians three says each one should take care how he builds, because the work will be tested. Not the size of it. The quality of it.',
          'That is the whole reason I care about craft in a business. Not because a well-built system impresses anyone, but because the standard is the point. Build things that shelter people. Build them so they can be handed to someone. Then open your hands, because it was never actually yours, and that is good news, not a loss.',
        ],
      },
      {
        heading: 'The Season, In Two Minutes',
        paragraphs: [
          'Nine principles, and then we are done.',
          'One. AI is a multiplier, and a multiplier applied to zero is still zero. What you already know is the number.',
          'Two. Money is a receipt for a problem solved, so raise the size of the problem, not the number of hours.',
          'Three. There are four levels of value, and the machine took the bottom two. Climb toward imagination.',
          'Four. Nothing repeals seedtime. Plant a hundred times more, and then wait like a farmer.',
          'Five. Fear disguises itself as prudence, so make the small bet with a date on it instead of burying the talent.',
          'Six. Selling is serving when the thing works, and Scripture is full of offers made plainly and joyfully.',
          'Seven. Diligence is the distance between decision and done, and speed is how buyers read character.',
          'Eight. Build the double portion so that you can actually stop, because the Sabbath assumes stopping is possible.',
          'Nine. Knowledge went to zero. Wisdom did not. Sell the judgment, give the information away.',
          'And the tenth, which is this one. Build it so someone else can hold it.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The bakery granddaughter told me last year that the hardest part of running it is that she cannot change anything without hearing her grandmother in her head. She said it like a complaint and she was smiling the whole time.',
          'That is what an inheritance actually sounds like. Not a number in an account. A voice in somebody’s head, still shaping the work, forty years after the woman who started it stopped showing up.',
          'You have more leverage available to you this year than any generation of builders has ever had. Point it at something worth handing down.',
          'I am Sarah. This is Modern Mustard Seed. Small faith. Real leverage. Work that shelters.',
        ],
      },
    ],
  },
  {
    id: 'kls1-ai-times-zero',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 1',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 8/27',
    pillar: 'KINGDOM',
    title: 'AI Times Zero Is Still Zero',
    hook: 'Everybody is asking what AI can do for them. Almost nobody can answer the question AI is actually asking them.',
    directorNote:
      'Straight to the lens, no warmup, first sentence carries the whole thing. Say the multiplier line twice with identical rhythm. Warm on the septic guy, he is the hero of this, not the joke. Land the last line flat and confident, then hold.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'A man asked me what he should use AI for. I asked him what he knows how to do that most people cannot. He said, honestly, nothing.',
          'He has run a septic company for twenty-two years. He can hear a pump cycle and tell you what is failing. He just did not think that counted.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'Here is the thing nobody tells you about AI. It is a multiplier. It is not a source.',
          'Ten times four is forty. Ten times zero is zero. The ten did not change. The other number did all the work.',
          'That is why two people can buy the same tools in the same week and one gets a step change and the other gets a subscription. The tools were identical. The other number was not.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'So stop asking what AI can do. Ask what you know that a smart stranger could not learn from the internet in a weekend.',
          'That is your domain. Not what you enjoy. What you get right on instinct while everyone else is still gathering information.',
          'Twenty-two years of hearing pumps fail is not nothing. It is the whole asset. It was just trapped in one man, helping only whoever happened to be standing next to him.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Your job is not to find a better multiplier. Everybody has the same one.',
          'Your job is to be a bigger number.',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
  {
    id: 'kls2-money-is-a-receipt',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 2',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 9/3',
    pillar: 'KINGDOM',
    title: 'Money Is a Receipt, Not a Wage',
    hook: 'She wanted to make more money, so she was going to work Saturdays. It was the most expensive plan available to her.',
    directorNote:
      'Teach it like arithmetic. Pause after nine hundred dollars and let the number sit next to forty thousand. No judgment in your voice on her, she is every viewer watching.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'A woman told me her plan to make more money. She already worked five ten hour days. She was going to add Saturdays.',
          'A Saturday earns her nine hundred dollars. The pricing decision she has been avoiding for two years is worth about forty thousand a year.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'She was not lazy. She was operating on a belief almost everybody absorbed without examining it: that money comes from hours.',
          'It does not. Money is a receipt. It is what changes hands when a problem gets removed from somebody who wanted it gone. The hour is just where the removal happened to occur.',
          'A slow drain is a two hundred dollar problem. A flooded basement two hours before closing on the house is a very different number, and it is the same technician with the same skill.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'So if you want to be paid more, do not add hours. Move up the problem. Same skill, same customer, higher stakes.',
          'Proverbs eleven says the people curse the one who withholds grain, but blessing crowns the one who sells it. Not gives it. Sells it. The price is what keeps the grain coming next year.',
          'She raised her prices nineteen percent, lost her two worst customers, and finished the year up sixty-one thousand dollars on fewer jobs.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'You are not paid for your time. You never were.',
          'You are paid for what is gone when you leave.',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
  {
    id: 'kls3-ox-and-the-clean-manger',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 3',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 9/10',
    pillar: 'KINGDOM',
    title: 'The Ox and the Clean Manger',
    hook: 'There is a verse in Proverbs about leverage, and it is not the one you think.',
    directorNote:
      'Delight in this one. The clean manger line is funny and true at the same time, so smile on it. Deliver the verse slowly enough that a viewer could look it up.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Proverbs fourteen, four. Where there are no oxen, the manger is clean, but abundant crops come by the strength of the ox.',
          'That verse is about leverage, and it is in the Bible, and almost nobody preaches it.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'An ox is borrowed muscle. Strength you do not have in your own body, doing work your hands could never do alone.',
          'And the verse is honest about the cost. Oxen make a mess. They eat, they need tending, the barn is never spotless again.',
          'But look at what the clean manger actually is. It is not holiness. It is just a smaller harvest with better housekeeping.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'AI is an ox for thought work. It drafts, it answers, it sorts, it follows up at nine on a Sunday night when you are asleep.',
          'It is messy. It needs guardrails and supervision and rules about what it is never allowed to say. That is the tending.',
          'And the posture of Scripture toward borrowed capacity is not suspicion. Refusing the ox does not make you more faithful. It makes your manger clean and your field small.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'Some people are protecting a spotless barn and calling it wisdom.',
          'Go get the ox. Then go do the tending, because that part is real too.',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
  {
    id: 'kls4-stop-selling-your-hands',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 4',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 9/17',
    pillar: 'KINGDOM',
    title: 'Stop Selling Your Hands',
    hook: 'Four people, one building, four wildly different incomes. The hardest physical work is at the bottom, and that is not an accident.',
    directorNote:
      'Use your hand for the four levels, lowest to highest, same gesture every time. Move quickly through the ladder, then slow all the way down for the last two lines.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'A framer made eighty-five thousand last year and worked harder than anyone I know. The foreman made a hundred and sixty. The estimator made two hundred and ten. The developer who decided the building should exist made more than all three combined and never picked up a hammer.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'That is not injustice. It is a ladder, and there are four rungs.',
          'Level one, implementation. Doing it with your hands. Honest work, and the pay is capped by hours in a day and years in a back.',
          'Level two, unification. Getting people and parts to work together. One foreman multiplies four framers.',
          'Level three, communication. Persuasion, sales, teaching. Nothing in a business happens until somebody says yes, so the person who creates the yes is attached to every dollar.',
          'Level four, imagination. Seeing what does not exist and deciding it should. Highest paid rung in every economy on earth.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'Here is what changed. AI landed on level one first and hardest, and it is working its way into the task side of level two right now.',
          'It cannot touch level four. It generates options, and options are not vision. It has no stake, no conviction, and no way to know which idea is worth your one life.',
          'And climbing does not mean leaving. The framer who moves up still sees three days of waste in a set of plans before anyone breaks ground. That judgment came from the hammer.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The machine took the rungs that ask what.',
          'It cannot touch the rung that asks whether this should exist at all. So climb.',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
  {
    id: 'kls5-no-skipping-seedtime',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 5',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 9/24',
    pillar: 'KINGDOM',
    title: 'There Is No Skipping Seedtime',
    hook: 'He built the system in six weeks, ran it for five, made zero dollars, and wanted to know what was broken. Nothing was broken.',
    directorNote:
      'Gentle, not corrective. This one is meant to keep somebody from quitting this week. Slow way down on the blade line and hold at the end.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'A man emailed me furious. Six weeks building an AI content system, five weeks running it, zero dollars. What is broken?',
          'Nothing was broken. He planted in March and was standing in the field demanding a harvest.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'Genesis eight, twenty-two. While the earth remains, seedtime and harvest shall not cease. Two seasons, in that order, with a gap in between.',
          'Break the cycle into parts and you can see exactly what these tools do. Preparing ground, compressed. Planting, massively compressed, you can now plant a hundred times more than you could two years ago.',
          'Waiting, not compressed at all. Zero. A buyer who needs eleven months still needs eleven months. Trust still forms at the speed of repeated evidence.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'So the tools made you extraordinary at the front of the cycle and did nothing to the middle. That is why the waiting season now feels like a malfunction. It is not. It is the design.',
          'Mark four has a parable almost nobody preaches. A man scatters seed, and sleeps and rises, night and day, and the seed sprouts and grows, he knows not how. First the blade, then the ear, then the full grain.',
          'The blade looks like nothing. Every business I have built had a long stretch where the only honest report was that it was too early to tell.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'He did not quit. It turned in month four, and nothing about the system had changed.',
          'Plant more than you ever could before. Then sleep and rise, and stop digging it up to check.',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
  {
    id: 'kls6-he-was-afraid',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 6',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 10/1',
    pillar: 'KINGDOM',
    title: 'He Was Not Careful. He Was Afraid.',
    hook: 'Waiting for AI to settle down sounds wise. A man in a parable used that exact logic and got the harshest words in the story.',
    directorNote:
      'The most confrontational short of the set, so keep your voice low and warm the whole way through. Say the wicked and slothful line quietly. The three tests should be crisp, almost clinical.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'I keep hearing the same sentence in a very reasonable tone of voice. I am going to wait until this AI thing settles down.',
          'Matthew twenty-five. A servant is handed a talent, buries it in the ground, and hands it back perfectly preserved.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'Listen to his defense, because it gives him away. He says: I knew you to be a hard man, so I was afraid, and I hid your talent in the ground.',
          'He opens with theology and closes with something that sounds responsible. And right in the hinge of the sentence, the truth slips out. So I was afraid.',
          'The master does not call him prudent. He calls him wicked and slothful, and those are the harshest words in the parable, and they fall on the one man who risked nothing.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'Prudence and fear say identical sentences, so run three tests.',
          'Does your delay have a date? Prudence says March. Fear says when it settles down, which is a condition nobody can define, which means it is not a delay, it is a permanent decision you never admitted making.',
          'Are you learning while you wait? Prudence gathers. Fear waits and knows exactly as much on day two hundred as it did on day one.',
          'Can you write the downside in dollars? Prudence can. Fear cannot, because fear is not doing math, it is imagining a feeling.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'He did not lose anything. He gave back exactly what he was handed. That was the failure.',
          'Make one small bet, this week, with a date on it. That is all obedience ever looked like in this story.',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
  {
    id: 'kls7-selling-is-not-taking',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 7',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 10/8',
    pillar: 'KINGDOM',
    title: 'Selling Is Not Taking',
    hook: 'She said selling felt dirty. Then I asked what happens to the people who never book with her.',
    directorNote:
      'Warmest short of the set. The pause after most of them just stay stuck is the whole video. Delight, not argument, on the pearl line.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'A grief counselor told me she hates selling. It feels like taking advantage of people at their worst moment.',
          'I asked her what happens to the people who never book with her. She got quiet and said, most of them just stay stuck.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'Two different things are wearing the same word. Manipulation moves a person toward what is good for you. Persuasion moves a person toward what is good for them. Same energy, opposite direction.',
          'Most good people have only ever been sold to by the first kind, so that is the only picture they have of selling.',
          'And Jesus made offers constantly. Matthew thirteen: the kingdom is like treasure hidden in a field, and a man finds it and in his joy sells everything he has and buys that field. He describes the kingdom using the structure of a purchase, and the emotional word attached to it is joy.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'So the question is never whether you are allowed to sell. The question is whether the thing works.',
          'If it does not work, no amount of gentleness makes selling it acceptable. If it does work, hesitance is not humility. It is a tax you are charging the people who needed you.',
          'She changed one thing. She stopped describing her sessions and started describing what a life looks like nine months later. Bookings up sixty percent, and she said the conversations got easier, not harder.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'If it works, say so.',
          'Somebody is standing in a field with treasure in it, waiting for a person kind enough to point.',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
  {
    id: 'kls8-eleven-days',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 8',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 10/15',
    pillar: 'KINGDOM',
    title: 'She Did Not Buy the Bid. She Bought the Timestamp.',
    hook: 'Two bids, four hundred dollars apart. The better builder lost, and the reason was eleven days.',
    directorNote:
      'Quick and energetic. Hit the eleven days hard the first time and softly the second. The last line is the whole point, so slow down and let it land.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'Two contractors bid the same job. Prices within four hundred dollars. The one who got it was not the cheaper one.',
          'One walked the property Tuesday and sent the proposal Tuesday night. The other sent his eleven days later, after two reminder texts.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'She did not decide the first bid was better. She decided the first guy was the kind of person who does what he says when he says it.',
          'She was about to hand somebody eighty thousand dollars and a key to her house, and she had almost no information about whether he keeps commitments. So she used the only sample she had.',
          'Speed was not a sales tactic in that story. It was character showing up as a timestamp.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'Proverbs twenty-two, twenty-nine. Do you see a man skillful in his work? He will stand before kings. Not the busiest man. The skilled one.',
          'And diligence is not hours. It is the distance between deciding and done. Most owners are not lazy, they just keep a graveyard of decided things that never happened.',
          'The good news is that four delays cover almost all of it: response time, decision time, handoff time, follow-up. Every one of them can be closed with a system instead of more discipline, because discipline runs out at four in the afternoon and systems do not.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The contractor who lost is the better builder. I know them both.',
          'It did not matter. She never saw the work. All she saw was eleven days.',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
  {
    id: 'kls9-a-business-that-can-rest',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 9',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 10/22',
    pillar: 'KINGDOM',
    title: 'A Business That Cannot Rest Is a Cage',
    hook: 'I answered forty-one work messages from a hospital waiting room. None of them were urgent. That is when I understood what I had built.',
    directorNote:
      'Slowest short of the set. Tell the waiting room plainly, no self-pity, no heroism. Long pause after the cage line. The Close is almost a benediction.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'I sat in a hospital waiting room for eleven hours with family, and I answered forty-one work messages while I sat there.',
          'None of them were urgent. I answered them because if I did not, nothing would happen. I had built a very sophisticated cage and then decorated it.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'Exodus twenty says six days you shall labor, but the seventh is a Sabbath. Notice the assumption buried in the command. It assumes stopping is possible.',
          'So if your business genuinely cannot survive one day without you, that is not a scheduling problem. It is a design problem, and design problems are fixable.',
          'Here is the test. If you disappeared for thirty days, would revenue continue? If yes, you own a business. If no, you own a job with more risk and worse benefits than employment.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'Exodus sixteen is the part I missed for years. Manna came daily, and hoarding it bred worms. Except on the sixth day, when they gathered a double portion, and it kept, because the seventh was a Sabbath.',
          'Rest was not left to willpower. It was resourced in advance.',
          'A system that runs while you sleep is a double portion. The agent answering your phone at nine on a Sunday night is not you working Sunday. It is you having worked Thursday.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'I took a full week off last spring. Thirty-one calls answered, nine appointments booked, two proposals out, and I was on a lake.',
          'Build the double portion. Then have the nerve to actually stop.',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
  {
    id: 'kls10-what-is-in-your-house',
    kind: 'short',
    episode: 'Kingdom Leverage · Short 10',
    session: 'Kingdom Leverage · Shorts',
    publish: 'Publishes Thu 10/29',
    pillar: 'KINGDOM',
    title: 'What Do You Have in Your House?',
    hook: 'Every fact on earth is free now. What is not free is knowing which one matters, for you, by Friday.',
    directorNote:
      'The closer for the whole series, so this one is quiet and certain rather than punchy. Real wonder on Solomon, he could have asked for anything. Long pause before the last line.',
    sections: [
      {
        heading: 'Hook',
        paragraphs: [
          'A friend got a diagnosis and read everything. Studies, forums, every AI summary. He knew more about that condition than most people ever will.',
          'Then a doctor who has treated it for twenty-two years said, based on your age and this one number in your bloodwork, we are doing the second option. He had read that recommendation four times and had no way to know it applied to him.',
        ],
      },
      {
        heading: 'The Idea',
        paragraphs: [
          'He had the knowledge. She had the judgment. Those two just moved in opposite directions in price.',
          'If your value was being the person who knows things, that value went to nearly zero, and it is not coming back.',
          'What went up is knowing which answer, for this person, this week, and being the one who is wrong if it does not work. A machine can tell you what to do. It cannot be responsible for it.',
        ],
      },
      {
        heading: 'The Turn',
        paragraphs: [
          'First Kings three. God tells Solomon to ask for anything. He asks for a listening heart, to discern between good and evil. Not information. Not riches. Discernment.',
          'Standing in front of unlimited access, he asked for judgment, because the constraint was never access.',
          'And in Second Kings four, Elisha asks a widow with nothing the most practical question in the Bible. What do you have in your house? She says nothing, except a jar of oil. That jar is the entire miracle. The multiplication happens to the thing she already had and had written off.',
        ],
      },
      {
        heading: 'Close',
        paragraphs: [
          'The multiplier is here, it is patient, and it is waiting on a number.',
          'So what do you have in your house?',
          '(On screen: Modern Mustard Seed. Small faith. Real leverage. Work that shelters.)',
        ],
      },
    ],
  },
];
