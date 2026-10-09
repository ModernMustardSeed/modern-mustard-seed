// THE DIRECTOR'S DECK. Forty prompts and skill files lifted from the studio,
// generalized for any small business. The build script renders this file into
// the deck PDF and the folder of copy-paste files, so the wording lives here
// once. Words in {braces} are the reader's to fill in.

export const DECK = {
  title: "The Director's Deck",
  subtitle: 'Forty prompts and skill files from a company run by one person and a crew',
  edition: 'Launch 1 · February 2027',
  intro: [
    'Every card in this deck is a prompt or a skill file we use to run Modern Mustard Seed, rewritten so the nouns fit your business instead of ours. They are in the words we actually type. None of them is clever. Each one exists because the plain version of the request kept producing work we had to redo.',
    'Words in {braces} are yours to fill. Everything else is meant to be pasted as written. Six cards are skill files: save them once as SKILL.md in a folder under ~/.claude/skills and every agent does that job the same way from then on.',
    'Use them in order the first time through. The suits follow the life of an idea: you direct it, the crew remembers it, builds it, ships it, guards it, sells it, serves the customer who bought it, and brings you the next one.',
  ],
};

export const SUITS = [
  { key: 'direct', name: 'Direct', line: 'Turn an idea into something an agent can build.' },
  { key: 'remember', name: 'Remember', line: 'So you never explain the business twice.' },
  { key: 'crew', name: 'Crew', line: 'One job each, a charter, and a schedule.' },
  { key: 'build', name: 'Build', line: 'Complete on the first pass, attacked before it is shown.' },
  { key: 'ship', name: 'Ship and Guard', line: 'Real, reproducible, and on the live address.' },
  { key: 'sell', name: 'Sell', line: 'One person, one observation, one ask.' },
  { key: 'serve', name: 'Serve', line: 'Keep every customer, and give them proof.' },
  { key: 'ideas', name: 'Ideas', line: 'A crew that brings you the next thing.' },
];

/**
 * kind: 'prompt' is pasted into a session; 'skill' is saved as a SKILL.md.
 * For skills, `prompt` is the whole file body below the front matter, and
 * `skill` holds the folder name and the description line.
 */
export const CARDS = [
  // ── Direct ────────────────────────────────────────────────────────────────
  {
    suit: 'direct',
    title: 'The one-page brief',
    when: 'Any idea, before any building starts.',
    kind: 'prompt',
    prompt: `I want to build {the idea, in one sentence}. Before you write any code or copy, interview me. Ask one question at a time, no more than eight in total, and stop when you could explain it to a stranger. Then write a one-page brief with exactly these sections: who it is for, the problem in their words, what they do with it on the first day, what it must never do, the three things that make it excellent, what is out of scope, and how we will know it worked. Show me the brief and wait for my yes.`,
    why: 'Agents build what you said, not what you meant. The interview closes the gap before it costs a rebuild.',
  },
  {
    suit: 'direct',
    title: 'The acceptance test',
    when: 'Right after the brief is approved.',
    kind: 'prompt',
    prompt: `Using the brief we just approved, write the acceptance test: a numbered list of things I can check myself, in plain words, that prove this is done. Each line must be something I can see, click, read or count. No line may say "works correctly" or "is user friendly". Include the unhappy paths: an empty state, a wrong input, a slow connection, a customer who changes their mind.`,
    why: 'If you cannot check it, you cannot direct it. The test becomes the definition of done for every agent after this.',
  },
  {
    suit: 'direct',
    title: 'The order of work',
    when: 'When the job is bigger than one sitting.',
    kind: 'prompt',
    prompt: `Break this brief into the smallest steps that each produce something I can look at. Order them so the riskiest unknown is answered first and every step leaves the project working. For each step: what gets built, what I will see when it is done, and what could block it. Nothing in step one may depend on a decision I have not made yet. List those decisions separately at the top.`,
    why: 'A sequence that ends in a working thing at every step means a bad day costs one step, not the project.',
  },
  {
    suit: 'direct',
    title: 'The skeptic',
    when: 'Before you commit money or a week to an idea.',
    kind: 'prompt',
    prompt: `Play the most skeptical customer this idea could have. You run {their kind of business}, you have been burned by a vendor before, and you have ten seconds. Tell me the three reasons you would say no, in your own words, as bluntly as you would say them out loud. Then switch back and tell me which of the three would actually stop a sale, and what single change answers it.`,
    why: 'Objections found in a prompt are free. Objections found after launch cost the launch.',
  },
  {
    suit: 'direct',
    title: 'The cut',
    when: 'When the list of features keeps growing.',
    kind: 'prompt',
    prompt: `Here is everything I want this to do: {the list}. Cut it to the version a customer would pay for on day one. For every item you cut, one line on why it can wait. For every item you keep, one line on what breaks for the customer without it. The kept list should fit in a week of building. If it does not, cut again.`,
    why: 'The first version ships when someone is willing to remove things from it. Let the agent be that someone.',
  },

  // ── Remember ──────────────────────────────────────────────────────────────
  {
    suit: 'remember',
    title: 'Write my rules file',
    when: 'The first afternoon with a crew.',
    kind: 'prompt',
    prompt: `Help me write my CLAUDE.md, the rules every agent reads before every session. Interview me one question at a time about: who I am, what the business sells and at what prices, who buys, how I write, the words I never use, the tools we use, and the mistakes that have cost me money or a customer. Then write the file. Rules are one sentence each, stated as laws, not preferences. Every law that came from a mistake names the mistake in one line underneath.`,
    why: 'Everything an agent does well starts here. A rule that is not written down gets broken again.',
  },
  {
    suit: 'remember',
    title: 'Save it as a memory',
    when: 'The moment you explain something for the second time.',
    kind: 'prompt',
    prompt: `Save what I just told you as a memory note. One fact per note. Give it a short name, a one-line description that would help a future session decide whether it matters, today's date, and two lines underneath: why it matters, and how to apply it. Before saving, check whether a note already covers it; update that note instead of making a second one. Link it to any related note by name.`,
    why: 'The test of a crew is whether you ever have to say the same thing twice. Memory is how you pass.',
  },
  {
    suit: 'remember',
    title: 'The correction',
    when: 'When a memory or a rule turns out to be wrong.',
    kind: 'prompt',
    prompt: `The note about {the subject} is wrong. The truth is {the correct fact}, as of {date}. Find every memory note, skill and rules line that repeats the wrong version, fix each one, and delete any note that is now entirely false. Do not leave the old version underneath with a correction; remove it. Then list every file you changed.`,
    why: 'A wrong memory is worse than none, because the crew acts on it with confidence. Fix it everywhere at once.',
  },
  {
    suit: 'remember',
    title: 'Is this a law?',
    when: 'When you are tempted to add a rule.',
    kind: 'prompt',
    prompt: `I want to add this rule: {the rule}. Test it against three questions before it goes in the rules file. One: if it is broken, does a customer, a lead or a search engine see the result? Two: could an agent work it out from the files in front of it? Three: has it already been broken once, or am I stating it as a firm rule? If all three pass, write it as one sentence with the incident underneath. If not, save it as a memory note instead and tell me why.`,
    why: 'Twenty laws get read. Two hundred get skimmed. The test keeps the rules file short enough to matter.',
  },
  {
    suit: 'remember',
    title: 'The handoff note',
    when: 'At the end of any session that will be continued.',
    kind: 'prompt',
    prompt: `Write the handoff for the next session. What we set out to do, what is finished and checked, what is finished and not yet checked, what is not started, the exact file paths and branch involved, any decision waiting on me, and the first command the next session should run. Save it as a memory note named for the project. Plain facts, no summary of the conversation.`,
    why: 'The next session starts cold. A good handoff makes it start where this one stopped instead of an hour earlier.',
  },

  // ── Crew ──────────────────────────────────────────────────────────────────
  {
    suit: 'crew',
    title: 'Write an agent charter',
    when: 'When a job repeats often enough to deserve its own agent.',
    kind: 'prompt',
    prompt: `Write a charter for an agent whose one job is {the job}. Include: its name, the one job in one sentence, the trigger phrases that should send work to it, what it reads first, what it produces and where it saves it, what it must never do, when it must stop and ask me, and how it reports. Keep it under one page. Save it as a subagent definition in ~/.claude/agents.`,
    why: 'An agent with one job and written limits is predictable. An agent with a vague job does a bit of everything, badly.',
  },
  {
    suit: 'crew',
    title: 'The morning briefing',
    when: 'Save once. Run every morning.',
    kind: 'skill',
    skill: { name: 'morning-briefing', description: 'The owner\'s daily briefing: what ran overnight, what shipped, what failed, what waits on a decision, and the three things worth doing today. Use for "brief me", "what is going on", "what should I do today".' },
    prompt: `# The Morning Briefing

Read, do not guess. Every line has a source.

## Gather
1. Overnight: every scheduled job, whether it ran, whether it finished. A job that did not report is a failure until proven otherwise.
2. Shipped: merged changes since yesterday, each checked on the live address.
3. Inbox: customer emails, form fills, missed calls and voicemails that need a person.
4. Money: payments received, payments failed, refunds, anything unusual.
5. Decisions waiting: anything an agent stopped to ask about, and for how long.

## Write, one screen, in this order
1. Three decisions for today, each with options and a recommendation.
2. What broke, and what was done or is needed.
3. What shipped, one line each, with the live link.
4. The numbers, against the same day last week.
5. Three things worth doing today, in order.

If nothing broke, say "Nothing broke" in one line and move on.`,
    why: 'Fifteen minutes a day is the whole management job when a crew runs the work. This is what makes fifteen minutes enough.',
  },
  {
    suit: 'crew',
    title: 'Put it on a schedule',
    when: 'When a job should run without you asking.',
    kind: 'prompt',
    prompt: `Make {the job} run on its own every {schedule}. Before choosing the time, list every scheduled job that already exists and pick a minute nothing else uses. The job must write a heartbeat when it starts and when it finishes, so the morning briefing can tell a job that ran from a job that silently stopped. If it fails, it must leave a clear note saying what failed and what it needs. Show me the schedule and the heartbeat check before switching it on.`,
    why: 'Jobs that start on the same minute fight, and jobs without a heartbeat fail in silence. Both rules came from a week of silence.',
  },
  {
    suit: 'crew',
    title: 'Parallel lanes',
    when: 'When more than one session is working at once.',
    kind: 'prompt',
    prompt: `Before you touch this repository, check who else is working in it. List the worktrees and branches, and anything committed in the last hour. Work only in your own worktree on your own branch, created fresh from the latest main. Before every commit and every push, check again. If someone else has touched a file you are about to change, stop and tell me instead of merging over it.`,
    why: 'Two sessions on one file is how a day of work disappears without a single error message.',
  },
  {
    suit: 'crew',
    title: 'Delegate it',
    when: 'When a task has independent parts.',
    kind: 'prompt',
    prompt: `This task has parts that do not depend on each other: {the parts}. Send each part to its own agent with a complete brief: the goal, the files involved, what done looks like, and what it must not touch. Run them at the same time. When they report back, check each result yourself against its brief before telling me anything is finished. Give me one combined report, not their reports pasted together.`,
    why: 'The director checks the work. Passing an agent\'s report straight to the owner is how unchecked work gets called done.',
  },

  // ── Build ─────────────────────────────────────────────────────────────────
  {
    suit: 'build',
    title: 'Build from the brief',
    when: 'Once the brief, the test and the order are approved.',
    kind: 'prompt',
    prompt: `Build step {n} from the order of work. Use real words, real images and real data, never placeholders. Design every state: loading, empty, error and success. When you finish, check it against the acceptance test line by line and show me which lines pass, with the evidence for each: a screenshot, a test result or the output. Do not tell me it works; show me.`,
    why: 'A beautiful shell with filler text is not a draft. It is the same work done twice.',
  },
  {
    suit: 'build',
    title: 'The attack pass',
    when: 'Before anything is shown to anyone.',
    kind: 'skill',
    skill: { name: 'attack-pass', description: 'The pass that turns competent into excellent. Use before any deliverable is shown to the owner or a customer, and for "is this good enough", "polish this", "this feels average".' },
    prompt: `# The Attack Pass

Switch roles. You are the most skeptical buyer this work could meet, holding it next to the best example of its kind you can name.

1. Name that best example and the three qualities that make it the best.
2. Find the five weakest things in this deliverable. Be specific: the flat headline, the error message written by a compiler, the word alone on its own line, the chart with no units, the button that does not look pressable.
3. Fix all five. Do not report them as caveats. Fixing them is the job.
4. Check the fixes the way the recipient will meet the work: open it, render it, click it, read it aloud.
5. Report the five, what changed, and the evidence.

Skipping this pass because the first version seems strong is the most common way average work ships.`,
    why: 'The first version is always the agent\'s best guess. The attack pass is where it becomes your standard.',
  },
  {
    suit: 'build',
    title: 'Look at it',
    when: 'Any page or screen, after any visual change.',
    kind: 'prompt',
    prompt: `Take screenshots of this page at 390 pixels wide and 1440 pixels wide, and look at them before you say anything about the code. Grade them: can a stranger tell what this is and what to do within five seconds; is there one obvious next action; does anything overflow, overlap or scroll sideways on the phone; is all the text readable; is every image real and specific to us. Fix what fails, shoot again, and show me the final screenshots.`,
    why: 'Agents read code. Customers look at pages. This makes the agent look.',
  },
  {
    suit: 'build',
    title: 'Every state',
    when: 'Forms, checkouts, sign-ups, anything a customer fills in.',
    kind: 'prompt',
    prompt: `List every state this {form, page, flow} can be in: first visit, partly filled, wrong input in each field, submitted, failed to submit, slow connection, already submitted, came back the next day. For each state, show me what the customer sees and the exact words on screen. Every error message must say what happened and what to do next, in our voice. Then build the ones that are missing.`,
    why: 'The happy path is the entry fee. Customers judge you on the error message.',
  },
  {
    suit: 'build',
    title: 'The finish pass',
    when: 'The last thing before it is called done.',
    kind: 'prompt',
    prompt: `Do the finish pass on {the deliverable}. The details nobody asked for: the browser tab icon, the image that shows when the link is shared, the page title, the empty-state sentence, the 404 page, the print margins, the alt text on every image, the spelling of every proper name, and every number checked against its source. List each one and whether it was already right or you fixed it.`,
    why: 'Nobody notices the finish when it is there. Everybody notices when it is not.',
  },

  // ── Ship and Guard ───────────────────────────────────────────────────────
  {
    suit: 'ship',
    title: 'The preflight',
    when: 'Before every push.',
    kind: 'skill',
    skill: { name: 'preflight', description: 'The checks that run before any change leaves this machine. Use before every commit, push, merge or deploy, and for "ship it", "push this", "is this ready".' },
    prompt: `# The Preflight

In order. Stop at the first failure, fix the cause, and start again from that step. Never switch a check off to get past it.

1. Fetch the latest main and rebase onto it. A stale base makes every other check meaningless.
2. Type check.
3. Lint.
4. Build. A local build that passes is the only real predictor of the host's build passing.
5. Secrets: no .env file appears in the list of changed files.
6. Commit with a message that says what changed and why.
7. Push and open the pull request. Merge when the checks are green.
8. Open the live address and find something that exists only in the new version. Until then, the word is "merged", not "live".`,
    why: 'Every step on this list is there because skipping it once put a broken page in front of customers.',
  },
  {
    suit: 'ship',
    title: 'Is it live?',
    when: 'Whenever anyone, including an agent, says "shipped".',
    kind: 'prompt',
    prompt: `Prove it is live. Fetch {the live URL} and find a phrase or element that exists only in the change we just made. Tell me the commit the live site is running and whether it matches ours. If the phrase is missing, do not explain it with caching; find out which version is deployed and why ours is not.`,
    why: 'A green check and a deploy ID are not a ship. Shipped is a claim about the live address.',
  },
  {
    suit: 'ship',
    title: 'Roll it back',
    when: 'When production is broken and customers can see it.',
    kind: 'prompt',
    prompt: `Production is broken: {what customers see}. Do not debug in production. Find the last deployment that worked, tell me which one and when, and give me the exact step to promote it. Once I confirm it is restored, revert the bad change on main so the next build does not put it back, then reproduce the problem on a branch and fix it there.`,
    why: 'Restoring first and debugging second turns an outage into a blip.',
  },
  {
    suit: 'ship',
    title: 'The incident note',
    when: 'After anything broke that a customer saw.',
    kind: 'prompt',
    prompt: `Write the incident note. What customers saw, from when to when. What caused it, in one paragraph a non-technical owner understands. How it was fixed. What now makes it impossible, not just less likely: a test, a check or a guard. If the answer is "be more careful", it is not finished; propose the guard. Then save the lesson as a memory note, and if it passes the law test, as a rule.`,
    why: 'Every law in our rules file is an incident that got a note like this. That is how the crew gets better on its own.',
  },
  {
    suit: 'ship',
    title: 'Write me a guard',
    when: 'When a mistake must never happen again.',
    kind: 'prompt',
    prompt: `Write a Claude Code hook that makes {the mistake} impossible. It runs before the matching tool call, reads the call as JSON, and either allows it, asks me, or blocks it with a reason Claude can act on. It must never block anything else: list five ordinary commands it must allow and five it must stop, and include a test that runs all ten. If the guard throws an error, it must allow, so a broken guard never jams the session.`,
    why: 'A rule asks an agent to remember. A guard does not need it to. The dangerous things belong in guards.',
  },

  // ── Sell ──────────────────────────────────────────────────────────────────
  {
    suit: 'sell',
    title: 'The proposal',
    when: 'After a discovery call.',
    kind: 'prompt',
    prompt: `Turn these notes into a proposal: {the notes}. First read their website and listings and note one thing that is working and one that is costing them customers. Map the work to one of our packages, and never invent or round a price. Structure: their situation in their words, what we deliver as things they could point at, what is not included, dated milestones, the price stated once, how adjustments work, and one next step. Deliver it as a designed PDF, not a printed web page.`,
    why: 'A proposal that quotes the customer back to themselves reads like we already understand the business. Because we do.',
  },
  {
    suit: 'sell',
    title: 'One person, one message',
    when: 'Reaching someone who has never heard of you.',
    kind: 'skill',
    skill: { name: 'one-to-one', description: 'Writes one-to-one outreach to a named person. Use for any cold or warm email, LinkedIn note or message to a prospect. Never writes a template meant for a list.' },
    prompt: `# One Person, One Message

If it could be sent to anyone else unchanged, it does not go.

## Research first
- The person's name and role, from their own site or profile.
- One specific, checkable fact about their business, read on the live source today.
- Whether they have heard from us before.

Never tell someone their site lacks something unless you read the live page and it truly is not there. Never print a guessed number about their business.

## The message, under 120 words
1. The observation: one sentence about them, specific enough that they know a person looked.
2. The outcome: one sentence on what changes for them.
3. The proof: one line, a real result or a real link.
4. The ask: one small step that costs them nothing.

## Follow-ups
Two at most, at four and nine days, each adding something new. Any reply ends the sequence. The owner approves every first message.`,
    why: 'The reply rate of a message written to one person beats a template by an order of magnitude, and it never gets the domain flagged.',
  },
  {
    suit: 'sell',
    title: 'After silence',
    when: 'A prospect went quiet after a proposal or a call.',
    kind: 'prompt',
    prompt: `{Name} went quiet {how long} ago after {what happened last}. Read everything we have sent them. Write one short follow-up that adds something new: a fresh observation about their business, an answer to the question they are probably asking, or a small piece of the work done for free. No "just checking in", no "bumping this", no guilt. One ask. If this would be the third message with no reply, tell me to stop instead.`,
    why: 'Silence is usually a busy week, not a no. A follow-up that brings something new respects that.',
  },
  {
    suit: 'sell',
    title: 'Call prep',
    when: 'An hour before any sales call.',
    kind: 'prompt',
    prompt: `I am talking to {name} at {business} in an hour. Give me one page: what the business does and how long it has been doing it, what their website and reviews say right now, what they probably want from this call, the two objections most likely to come up and a one-sentence answer to each, which of our packages fits, and the three questions that would move this to a yes. Facts only, each with where you found it.`,
    why: 'Ten minutes of reading turns a discovery call into a second meeting.',
  },
  {
    suit: 'sell',
    title: 'Answer the objection',
    when: 'When a prospect pushes back.',
    kind: 'prompt',
    prompt: `A prospect said: "{the objection, in their words}". Tell me what they are actually worried about underneath it. Then write my answer in two or three sentences: acknowledge it plainly, give one specific fact or result that addresses it, and end with a question that moves forward. No pressure, no discount, no defensiveness.`,
    why: 'Most objections are a question in disguise. Answering the question wins more than arguing with the objection.',
  },

  // ── Serve ─────────────────────────────────────────────────────────────────
  {
    suit: 'serve',
    title: 'The onboarding packet',
    when: 'The day a customer says yes.',
    kind: 'prompt',
    prompt: `{Customer} just bought {package}. Write the onboarding packet: a welcome email under 150 words with the kickoff date and exactly what we need by when; no more than ten intake questions tailored to their business, none of which their website already answers; an access checklist of every login we need with how to grant it without sending a password; the scope confirmation word for word from the proposal; and the dated milestones. They get their own accounts in their own name.`,
    why: 'The week after yes decides whether they trust you for the next year.',
  },
  {
    suit: 'serve',
    title: 'The monthly review',
    when: 'The first of every month.',
    kind: 'skill',
    skill: { name: 'monthly-review', description: 'The monthly sweep of every live customer: real numbers, a one-page report and an email each, held for the owner\'s review. Use for "monthly reports", "month-end sweep".' },
    prompt: `# The Monthly Review

Read only during the sweep. Change nothing.

## For each live customer
1. What we shipped this month, in plain words.
2. What it changed: the numbers that matter to their business, each with its source and date range. Never estimate a number that was not measured.
3. What broke and what we fixed, only what they noticed or would want to know.
4. The one thing we recommend for next month, and why.

## The report
One page: their name, the month, the four sections. A chart only when a trend matters.

## The email
Under 150 words. The headline result first, the report attached, one next step.

## The gate
Every report and email waits for the owner. Only approved ones are sent.`,
    why: 'Customers who get proof every month do not shop around. Customers who hear nothing do.',
  },
  {
    suit: 'serve',
    title: 'Reply to a review',
    when: 'Every new review, good or bad.',
    kind: 'prompt',
    prompt: `Draft a reply to this review: "{the review}". Speak as the business: we, us, our. For a good review: thank them by name, mention one specific thing they said, two sentences at most. For a bad one: thank them once, own what is ours without explaining our internal process, say what we did or will do, and offer a direct line. Never argue, never reveal private details. Show me the draft; do not post it.`,
    why: 'Future customers read the replies more closely than the reviews.',
  },
  {
    suit: 'serve',
    title: 'The unhappy customer',
    when: 'A complaint arrives.',
    kind: 'prompt',
    prompt: `A customer wrote: "{the complaint}". Read their history with us first. Draft a reply that apologizes once, in the body, never the subject line; states what we will do and by when, specifically; and does not explain our internal mistakes. Under 120 words. Then list what actually needs fixing on our side and whether it could happen to another customer.`,
    why: 'One apology and a dated fix beats three paragraphs of explanation every time.',
  },
  {
    suit: 'serve',
    title: 'The handoff package',
    when: 'When a customer should be able to run it without you.',
    kind: 'prompt',
    prompt: `Prepare the handoff for {customer}. List every account, service and key involved, who owns each today, and the steps to move each into their name. Write a one-page runbook in plain words: what runs, when, what to do if it stops, and who to call. List every secret that must be rotated after the transfer. Then write the walkthrough script for a thirty-minute call where they do each step themselves while we watch.`,
    why: 'We build things customers own and can run without us. The handoff is where that stops being a slogan.',
  },

  // ── Ideas ─────────────────────────────────────────────────────────────────
  {
    suit: 'ideas',
    title: 'The idea engine',
    when: 'Save once. Run every Monday.',
    kind: 'skill',
    skill: { name: 'idea-engine', description: 'Brings the owner three ideas a week and argues for them. Use every Monday, and for "what should we build next", "give me ideas", "what are we missing".' },
    prompt: `# The Idea Engine

Every Monday, read before you think:
- Last week's customer emails, calls and form fills: the questions people asked and the words they used.
- Our reviews and our competitors' reviews: what people praise and what they complain about.
- Our own notes and memory: ideas parked, problems that keep recurring.
- What changed in our market this month.

Then bring three ideas. For each:
1. The idea in one sentence.
2. The evidence: the specific emails, reviews or notes that point at it, quoted.
3. Who pays, and roughly what it is worth to them.
4. The smallest version we could ship in a week.
5. The strongest reason not to do it.

Rank them. Recommend one. Never bring an idea without evidence.`,
    why: 'An owner who only reacts never gets ahead. This makes the crew bring the next thing to you.',
  },
  {
    suit: 'ideas',
    title: 'Kill or double down',
    when: 'When a product, offer or channel has been running a while.',
    kind: 'prompt',
    prompt: `Look at {the product, offer or channel} honestly. What did we expect when we started, and what actually happened, in numbers with sources? What does it cost us each month in money and in attention? Make the case to kill it, then the case to double down, each as strongly as you can. Then recommend one, and name the number that would change your mind by a date you choose.`,
    why: 'Most small businesses carry three things that should have been stopped a year ago. Ask the question on a schedule.',
  },
  {
    suit: 'ideas',
    title: 'Read the market',
    when: 'Before a new offer or a price change.',
    kind: 'prompt',
    prompt: `Research the market for {offer} in {place or audience}. Find the five businesses customers most often compare us to. For each: what they sell, at what price where it is public, what their customers praise, what they complain about, and their strongest claim. Then tell me where there is a gap we could own, and the one sentence that would make it obvious to a customer. Cite every fact.`,
    why: 'You cannot be different from competitors you have not read.',
  },
  {
    suit: 'ideas',
    title: 'What would ten times look like?',
    when: 'Once a quarter.',
    kind: 'prompt',
    prompt: `Our business today does {current size: customers, revenue, jobs a week}. Describe what the same business looks like at ten times that, with the same headcount and a crew of agents. Which jobs become agents first, in what order? What breaks at three times, and what has to be true before then? What would I stop doing personally? End with the three moves for this quarter.`,
    why: 'The question is not whether to grow. It is which work stops needing you, in which order.',
  },
  {
    suit: 'ideas',
    title: 'Sentence to shipped',
    when: 'Build Week: one idea, Monday to Friday.',
    kind: 'prompt',
    prompt: `This week we ship {the idea} from a sentence to something a real customer can use by Friday. Monday: the brief, the acceptance test and the cut, all approved by noon. Tuesday and Wednesday: build in steps that each leave it working, attack pass at the end of each day. Thursday: every state, the finish pass, a real person tries it. Friday: preflight, ship, prove it is live, and put it in front of five customers. Tell me each morning where we are against this plan.`,
    why: 'A week with a fixed end is the fastest way we know to learn whether an idea is worth more weeks.',
  },
];
