/**
 * THE FIELD GUIDE. Content spine for /fieldguide and the printable one-pager.
 *
 * Sarah 2026-08-21: *"a sheet I can give any of my friends or on socials, with
 * our wisdom in using claude code... for anyone who wants to build stuff and
 * code but has no clue what they are doing."*
 *
 * Everything on the page and everything on the PDF reads from this file, so the
 * guide and the handout can never drift apart. Add a prompt here and it shows
 * up on the site; change a rule here and the next PDF build carries it.
 *
 * House rules that apply to every string below:
 *   - No em dashes. Sarah's rule, sitewide.
 *   - Plain English. The reader has never opened a terminal.
 *   - Nothing version-specific stated as permanent. Shortcuts drift between
 *     releases, so the page always points at /help as the real source.
 */

export type Step = { n: string; title: string; body: string; code?: string };

/**
 * WHAT YOU NEED, BEFORE STEP ONE.
 *
 * Sarah 2026-08-21: "since you need a claude sub to use claude code, add that
 * to the actual field guide."
 *
 * She is right and the omission was the worst kind: someone follows the install,
 * types `claude`, and hits a login for a plan they did not know they needed.
 * A guide for beginners that hides the price is a guide that wastes their
 * evening.
 *
 * Verified 2026-08-21 against claude.com/pricing and the Claude Code quickstart.
 * Prices move, so the copy names the number AND points at the page, and nothing
 * here is written as if it were permanent.
 */
export const WHAT_YOU_NEED: { label: string; body: string }[] = [
  {
    label: 'A computer and a terminal',
    body: 'Mac, Windows, or Linux. The terminal is already installed on all three. You do not need to know how to use it yet.',
  },
  {
    label: 'A paid Claude account',
    body: 'This is the part nobody mentions. Claude Code is not on the free tier. A Pro plan is $20 a month, or $17 if you pay for the year, and it includes Claude Code. Max plans start at $100 a month for heavier use. You can also sign in with a Claude Console account and pay per use from pre-paid credits instead of subscribing. Check claude.com/pricing before you buy, because these change.',
  },
  {
    label: 'Twenty minutes',
    body: 'That is genuinely the whole setup, and most of it is waiting for one download.',
  },
];

/** One line, for the places that only have room for one line. */
export const COST_LINE =
  'Claude Code needs a paid Claude account. Pro is $20 a month and includes it. The free tier does not.';

export const STARTER_STEPS: Step[] = [
  {
    n: '01',
    title: 'Install it',
    body: 'One line in your terminal. Terminal means Terminal on a Mac, PowerShell on Windows. This route needs Node 18 or newer first (nodejs.org, the green button), and it is the same command on all three systems. If you would rather not install Node at all, Anthropic also ships a native installer, which is one different command per system: see code.claude.com/docs.',
    code: 'npm install -g @anthropic-ai/claude-code',
  },
  {
    n: '02',
    title: 'Go to your project, then start it',
    body: 'Claude works inside the folder you launch it from, and it cannot see anything above that folder. Launch it in the wrong place and it will be confused about everything.',
    code: 'cd my-project\nclaude',
  },
  {
    n: '03',
    title: 'Log in with a paid Claude account',
    body: 'It opens a browser the first time. Sign in, come back to the terminal, done. This is the step that catches people out: Claude Code is not included on the free tier, so you need a Pro, Max, Team or Enterprise plan, or a Claude Console account with pre-paid credits. If sign-in ever gets strange, the /login command starts it over.',
  },
  {
    n: '04',
    title: 'Run /init before anything else',
    body: 'This reads your entire project and writes a file called CLAUDE.md: a briefing it reads automatically at the start of every future session, forever. Twenty seconds now, better answers for the life of the project. Open what it wrote and correct anything wrong.',
    code: '/init',
  },
  {
    n: '05',
    title: 'Ask it something you can check',
    body: 'Not "hello". Ask about your own code so you can judge the answer. This is also the fastest way to learn what your own project actually does.',
    code: 'Read this project and explain in plain English what it does,\nwhat the main files are, and the one thing most likely to break.',
  },
  {
    n: '06',
    title: 'Learn the escape hatch',
    body: 'The Esc key stops it mid-sentence, mid-edit, mid-anything, and keeps everything it did up to that point. You are never trapped watching it do the wrong thing. Hit Esc the second it heads somewhere you did not intend, and say what you actually wanted.',
  },
];

export const LOOP: Step[] = [
  {
    n: '1',
    title: 'Explore before anything',
    body: 'Ask it to read the relevant code and explain it back, and end the request with "do not write any code yet". Those six words are load-bearing. You are buying a Claude that understands your codebase instead of one that invents a second one alongside it.',
  },
  {
    n: '2',
    title: 'Make it plan, then read the plan',
    body: 'Press Shift+Tab twice for plan mode: it can read and think, and it cannot change a single file. Ask for the approach and the exact files it will touch. Most bad code is an approved bad plan. Thirty seconds of reading here is the highest-return time in the whole process.',
  },
  {
    n: '3',
    title: 'Build in small pieces',
    body: 'One outcome per request. "Add the API route" and then "wire the form to it" beats "build the whole feature", because when something breaks you can still tell which step broke it.',
  },
  {
    n: '4',
    title: 'Make it prove the work',
    body: 'Never accept "done" as evidence. Ask for the proof: the test output, the page loaded in a browser, the response from the endpoint. When it can run the check itself, it finds and fixes its own mistakes before you ever see them. This one habit is worth more than every other tip here.',
  },
  {
    n: '5',
    title: 'Save every time it works',
    body: 'Say "commit this with a clear message". A save point at every working state turns every future disaster into a one-command undo. It is the cheapest insurance in software and beginners skip it every time.',
  },
];

/* ------------------------------------------------------------------ */
/* The prompt library. The reason someone bookmarks this page.        */
/* ------------------------------------------------------------------ */

export type Prompt = { id: string; title: string; when: string; text: string };
export type PromptGroup = { id: string; label: string; blurb: string; prompts: Prompt[] };

export const PROMPT_GROUPS: PromptGroup[] = [
  {
    id: 'understand',
    label: 'Understand',
    blurb: 'Run these first, on any project, including one you inherited or one Claude built for you last week.',
    prompts: [
      {
        id: 'orient',
        title: 'Explain my project to me',
        when: 'Your very first real prompt in any codebase.',
        text: 'Read this project and explain it to me like I have never seen it. Cover: what it does, who uses it, the five files that matter most and why, how data moves through it, and the one thing you think is most likely to break. Plain English, no jargon. Do not write any code.',
      },
      {
        id: 'trace',
        title: 'Trace one thing end to end',
        when: 'You need to change something and do not know where it lives.',
        text: 'Trace exactly what happens when a user [DOES THE THING], from the first click to the last thing saved. List every file involved in order, and say what each one is responsible for. Do not write any code yet.',
      },
      {
        id: 'risk',
        title: 'Find what is fragile',
        when: 'Before a launch, or any time you inherit something.',
        text: 'Find the five things most likely to break this in real use, worst first. For each one give me the file, what goes wrong, who notices, and the smallest fix. Do not tell me what is good about the code.',
      },
    ],
  },
  {
    id: 'build',
    label: 'Build',
    blurb: 'Scope, plan, then build. Each of these ends by handing control back to you.',
    prompts: [
      {
        id: 'plan',
        title: 'Plan it before you build it',
        when: 'Every feature bigger than a typo.',
        text: 'I want to add [THE FEATURE]. First read the code that already does something similar, then give me a plan: the approach, every file you would create or change, what could go wrong, and anything you need me to decide. Plan only, no code yet.',
      },
      {
        id: 'match',
        title: 'Match what already exists',
        when: 'So the new thing does not look bolted on.',
        text: 'Build [THE THING], and match the patterns already in this project: the same folder structure, the same naming, the same styling approach, the same way errors are handled. Point at the existing file you are copying the pattern from before you start.',
      },
      {
        id: 'scratch',
        title: 'Start something from nothing',
        when: 'An empty folder and an idea.',
        text: 'I want to build [DESCRIBE IT IN THREE SENTENCES]. I am not an experienced developer, so choose boring, well-documented tools and explain each choice in one line. Give me the smallest version that actually works end to end, set it up, run it, and show me it working in a browser. Then tell me what to try next.',
      },
      {
        id: 'options',
        title: 'Three ways, with tradeoffs',
        when: 'You are stuck on a decision you are not qualified to make yet.',
        text: 'Give me three ways to do [THE THING], from simplest to most robust. For each: how long it takes, what it costs, what it locks me into, and who it is right for. Then tell me which one you would pick for someone in my situation and why. No code.',
      },
    ],
  },
  {
    id: 'fix',
    label: 'Fix',
    blurb: 'Paste the whole error every time. Your summary of an error deletes the part that solves it.',
    prompts: [
      {
        id: 'error',
        title: 'The error prompt',
        when: 'Anything red in your terminal or browser console.',
        text: '[PASTE THE ENTIRE ERROR, EVERY LINE, INCLUDING THE PARTS THAT LOOK LIKE NOISE]\n\nReproduce this first so we both know it is real. Then tell me the cause in one sentence. Then fix it, and show me the run that proves it is fixed.',
      },
      {
        id: 'wrong',
        title: 'It runs but it is wrong',
        when: 'No error, just the wrong result.',
        text: 'When I do [THIS], I expect [THIS] and I get [THIS] instead. Do not guess. Add whatever logging you need to find out where the value actually changes, show me what you found, then fix the real cause and remove the logging.',
      },
      {
        id: 'regress',
        title: 'This used to work',
        when: 'Something broke and you do not know when.',
        text: 'This worked before and does not now. Check the recent history for what changed near this code, tell me the most likely commit, and explain in one paragraph what that change did. Then fix it without undoing whatever that change was actually for.',
      },
      {
        id: 'circle',
        title: 'Break the loop',
        when: 'Two failed attempts. Use it on the third.',
        text: 'Stop. We have tried twice and it is still broken, which means the approach is wrong, not the code. Go back to the beginning, tell me what you assumed that might not be true, and give me two different approaches. Do not touch a file until I pick one.',
      },
    ],
  },
  {
    id: 'review',
    label: 'Review',
    blurb: 'It agrees with you by default. Every one of these removes the agreeable answer from the menu.',
    prompts: [
      {
        id: 'critic',
        title: 'The honest review',
        when: 'Before you show anyone anything.',
        text: 'Review what we just built as if you are the engineer who has to maintain it after I quit. List every problem, worst first, with the file and line. Do not list strengths, do not soften anything, and do not tell me it looks good.',
      },
      {
        id: 'security',
        title: 'Before strangers can reach it',
        when: 'Before you put anything on the public internet.',
        text: 'This is about to be public. Check for: secrets committed to the repo, pages that should require a login and do not, forms that trust whatever a user types, and anything a stranger could break or read that they should not. Show me the file and line for each, worst first.',
      },
      {
        id: 'explain',
        title: 'Teach me what you just did',
        when: 'Every time, until you stop needing it.',
        text: 'Walk me through the change you just made, file by file, in plain English. For each one: what it does, why it was needed, and what would break if I deleted it. Assume I want to understand this well enough to change it myself later.',
      },
    ],
  },
  {
    id: 'ship',
    label: 'Ship',
    blurb: 'The last mile is where beginners lose days. These prompts make the machine do the checklist.',
    prompts: [
      {
        id: 'save',
        title: 'Save my work properly',
        when: 'Every time something works.',
        text: 'Commit everything we just did with a clear message that says what changed and why. Show me the list of files going in before you commit, so I can catch anything that should not be there.',
      },
      {
        id: 'deploy',
        title: 'Put it on the internet',
        when: 'You have something working locally and no idea what happens next.',
        text: 'I want this live on the internet at a real address. Walk me through it one step at a time, waiting for me after each step. Use the simplest hosting that fits this project, tell me anything it will cost before I commit to it, and tell me exactly what to click when it is my turn.',
      },
      {
        id: 'verify',
        title: 'Prove it is actually live',
        when: 'Right after any deploy. Always.',
        text: 'Load the real public URL and confirm the change is actually there. Show me the evidence, not a summary. If it is not there, find out why before you tell me anything else.',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */

export const KEYS: { key: string; what: string }[] = [
  { key: 'Esc', what: 'Stop it immediately and keep everything so far' },
  { key: 'Esc Esc', what: 'Go back and edit an earlier message, then take a different path from there' },
  { key: 'Shift + Tab', what: 'Cycle the permission modes: ask every time, auto-accept edits, plan mode' },
  { key: 'Up arrow', what: 'Scroll back through prompts you already sent' },
  { key: 'Ctrl + C', what: 'Cancel what is running. Twice in a row quits' },
  { key: 'Ctrl + L', what: 'Clear the screen clutter without losing the conversation' },
];

export const CHARACTERS: { key: string; what: string }[] = [
  { key: '/', what: 'Opens the command list for your exact version. The real menu, always current' },
  { key: '@', what: 'Point at a file or folder as you type, so it reads the right one instead of hunting' },
  { key: '#', what: 'Start a line with this to save a rule into memory permanently' },
  { key: '!', what: 'Run a terminal command yourself without leaving the session. The output stays in context' },
];

export const SLASH: { cmd: string; when: string }[] = [
  { cmd: '/clear', when: 'You are starting a different task. Use this far more than feels necessary' },
  { cmd: '/compact', when: 'A long session is filling up but you need to keep the same thread' },
  { cmd: '/context', when: 'You want to see what is eating the working memory' },
  { cmd: '/init', when: 'First time in a project. Writes the CLAUDE.md briefing' },
  { cmd: '/memory', when: 'You want to read or edit the rules it remembers' },
  { cmd: '/rewind', when: 'It broke something and you want the code and the conversation back' },
  { cmd: '/model', when: 'Switching between the deep thinker and the fast worker' },
  { cmd: '/permissions', when: 'You are tired of approving the same safe command forty times' },
  { cmd: '/agents', when: 'You want a specialist with its own instructions and its own fresh memory' },
  { cmd: '/mcp', when: 'Connecting outside tools, databases, and services' },
  { cmd: '/resume', when: 'Reopening a conversation from yesterday' },
  { cmd: '/cost', when: 'Checking what this session has used' },
  { cmd: '/doctor', when: 'Something is wrong with the install itself' },
  { cmd: '/help', when: 'Always. It is the true, current list for your version' },
];

export const CLI: { cmd: string; what: string }[] = [
  { cmd: 'claude', what: 'Start a session in this folder' },
  { cmd: 'claude "fix the login bug"', what: 'Start with the job already stated' },
  { cmd: 'claude -c', what: 'Continue the last conversation exactly where you left it' },
  { cmd: 'claude -r', what: 'Pick an older conversation from a list' },
  { cmd: 'claude -p "list every TODO"', what: 'One answer, printed, then it exits. Good inside scripts' },
  { cmd: 'claude update', what: 'Get the newest version' },
  { cmd: 'claude doctor', what: 'Diagnose a broken install' },
];

export const CLAUDE_MD_TEMPLATE = `# Project: [YOUR PROJECT NAME]

## What this is
One paragraph. What it does and who uses it.

## Stack
The tools this is built with. Name the package manager,
because guessing wrong here breaks things.

## Commands
npm run dev     start it locally
npm run build   must pass before anything ships
npm test        run the tests

## Rules
- Never edit anything inside /generated
- Prices come from lib/pricing.ts only, never hardcoded
- Do not add a new dependency without asking me first
- Ask before deleting any file

## Watch out for
- The build fails silently if .env.local is missing DATABASE_URL
- Everything under app/(public) has no login, assume strangers see it

## How I like to work
- Plan first, show me the plan, then build
- Small commits, one thing at a time
- Prove it works before you tell me it works
`;

export const RULES: { title: string; short: string; body: string }[] = [
  {
    title: 'Done is not evidence.',
    short: 'Load the real URL yourself. A green terminal is a claim.',
    body: 'Shipped means you loaded the real address and saw the thing with your own eyes. A green terminal is a claim, not a fact. Ask for the proof before you believe the summary.',
  },
  {
    title: 'Never let it guess at a command.',
    short: 'Make it run --help. Invented options look exactly like real ones.',
    body: 'If it is not certain an option exists, make it run the tool with --help and read the real output. Invented options look exactly like real ones and fail at the worst possible moment.',
  },
  {
    title: 'Two failed attempts means the plan is wrong.',
    short: 'Stop patching. Back to plan mode, ask for another approach.',
    body: 'Not the code, the plan. Stop patching, go back to plan mode, and ask for a different approach. The third try on a bad plan is how a morning disappears.',
  },
  {
    title: 'Save at every working state.',
    short: '"Commit this." Turns any disaster into a five second undo.',
    body: 'Small commits turn every catastrophe into a five second rollback. It costs one sentence and it is the difference between a bad hour and a bad week.',
  },
  {
    title: 'Give it the error, all of it.',
    short: 'Paste every line. Your paraphrase deletes the part that solves it.',
    body: 'Your paraphrase deletes the line number that solves it. Paste every line, including the parts that look like noise. It reads all of it in under a second.',
  },
  {
    title: 'One session, one job.',
    short: 'Two sessions on the same files overwrite each other quietly.',
    body: 'Two sessions working on the same files at the same time overwrite each other quietly, and you find out later, from a user. If you run more than one, give each its own copy of the project.',
  },
  {
    title: 'Secrets never enter the chat.',
    short: 'No keys in prompts, no keys in CLAUDE.md. Not even to test.',
    body: 'No passwords, no keys, no database addresses in a prompt or in CLAUDE.md, not even to test something. They live in an environment file that never leaves your machine.',
  },
  {
    title: 'Read the plan like it costs money.',
    short: 'Thirty seconds there is the best time you spend all day.',
    body: 'Because it does. Thirty seconds of reading a plan is the highest-return time you will spend all day, and skipping it is the single most common beginner mistake.',
  },
  {
    title: 'It agrees with you by default.',
    short: 'Never ask "is this right". Ask "what breaks first, and why".',
    body: 'So never ask "is this right?". Ask "what breaks first, and why". Frame every review as a hunt and you get a real one.',
  },
  {
    title: 'Fresh memory beats clever wording.',
    short: 'Going dumb? Clear it and restate the goal in five lines.',
    body: 'When it starts making dumb mistakes, do not argue with it. Clear the session, restate the goal in five lines, and watch it get sharp again.',
  },
  {
    title: 'You own the output.',
    short: 'Fastest hands you have ever had. Still your name on it.',
    body: 'It is the fastest set of hands you have ever worked with, and everything that ships is still yours. Read what changed before you accept it.',
  },
  {
    title: 'Build small, ship it, then grow it.',
    short: 'The only wrong move is planning for a month.',
    body: 'Every real system we run started as one page or one function that worked. This tool makes the first version cheap, so the only genuinely wrong move is spending three weeks planning something you could have had running on Tuesday.',
  },
];

export const TRIAGE: { symptom: string; cause: string; fix: string }[] = [
  {
    symptom: 'It changed files I never mentioned',
    cause: 'Your request was a wish, so it filled in the scope for you',
    fix: 'Rewind, then name the file and the single outcome you want',
  },
  {
    symptom: 'It got slow and started making dumb mistakes',
    cause: 'The working memory is full of three tasks ago',
    fix: 'Clear the session and restate the goal in five lines',
  },
  {
    symptom: 'It is confidently wrong about a tool or library',
    cause: 'Its training has a cutoff date. Your installed version does not',
    fix: 'Make it read the actual installed source, or run the tool with --help',
  },
  {
    symptom: 'It says it fixed it and it is not fixed',
    cause: 'It never ran the thing. It reasoned that it should work',
    fix: 'Ask for the real output, every time, before you believe anything',
  },
  {
    symptom: 'It broke something that used to work',
    cause: 'There was no save point between working and broken',
    fix: 'Rewind, or restore from git, then commit far more often',
  },
  {
    symptom: 'It cannot find a file I keep talking about',
    cause: 'The file is outside the folder you launched it from',
    fix: 'Point at the exact path with @, or add the other folder to the session',
  },
  {
    symptom: 'It asks permission for the same safe command forever',
    cause: 'Nothing has been allowed yet',
    fix: 'Open /permissions, allow that one command, never see it again',
  },
  {
    symptom: 'It went in a circle three times',
    cause: 'Wrong approach, applied harder',
    fix: 'Press Esc, switch to plan mode, ask for a genuinely different approach',
  },
];

export const GLOSSARY: { term: string; def: string }[] = [
  { term: 'Terminal', def: 'The text window where you type commands instead of clicking. Terminal on a Mac, PowerShell on Windows. Claude Code lives here.' },
  { term: 'Repo', def: 'Short for repository. Your project folder, with a full history of every change ever made to it.' },
  { term: 'Commit', def: 'A save point in that history, with a note about what changed. You can return to any one of them.' },
  { term: 'Branch', def: 'A parallel copy of your project where you can try something without touching the version that works.' },
  { term: 'Dependency', def: 'Someone else’s code your project uses. Managed for you, but every one you add is one more thing that can break.' },
  { term: 'Environment variable', def: 'A setting that lives outside your code, usually in a file called .env.local. Where passwords and keys belong.' },
  { term: 'API key', def: 'A password for a service your app talks to. Treat it exactly like a password, because it is one.' },
  { term: 'Deploy', def: 'Putting your project onto the internet so other people can reach it at a real address.' },
  { term: 'Localhost', def: 'Your project running on your own machine only. Nobody else can see it. Usually at localhost:3000.' },
  { term: 'Context window', def: 'How much Claude can hold in mind at once in one session. It fills up, and when it does, quality drops.' },
];

export const FIRST_BUILDS: { title: string; who: string; prompt: string }[] = [
  {
    title: 'A one page site for your business',
    who: 'You have a business and no website, or a website you are embarrassed by.',
    prompt: 'Build me a fast one page website for [BUSINESS], which does [WHAT] for [WHO] in [CITY]. It needs a headline, three reasons to call us, a photo section, real contact details, and a form that emails me. Use boring, reliable tools. Run it locally and show me. Then walk me through putting it on the internet, one step at a time.',
  },
  {
    title: 'A tool that kills one repetitive job',
    who: 'You do the same twenty minutes of copying and pasting every week.',
    prompt: 'Every week I [DESCRIBE THE REPETITIVE THING] and it takes about [HOW LONG]. Ask me whatever you need to understand it properly, then plan the smallest tool that does it for me. Plan first, no code, and tell me honestly if this is not worth automating.',
  },
  {
    title: 'Something that reads your own mess',
    who: 'You have a spreadsheet, a folder of receipts, or an inbox you cannot see through.',
    prompt: 'I have [THE FILES] and I want to answer questions like [EXAMPLE QUESTION]. Look at the actual data first and tell me what is in there and what is inconsistent, then plan the simplest thing that gets me answers. Do not build anything yet.',
  },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Claude Code?',
    a: 'Claude Code is Anthropic’s AI coding tool that runs in your terminal instead of a browser tab. The difference matters: it can read your actual files, run your actual commands, install things, run tests, and fix what it finds. A chat window can only give you text to copy. Claude Code does the work in the real project.',
  },
  {
    q: 'What does Claude Code cost, and do I need a subscription?',
    a: 'Yes, you need a paid Claude account. Claude Code is not included on the free tier of claude.ai, which is the thing most guides leave out. A Pro plan is $20 a month, or $17 a month if you pay annually, and it includes Claude Code. Max plans start at $100 a month for people running it hard all day. Team and Enterprise plans include it too. If you would rather not subscribe, you can sign in with a Claude Console account and pay per use from pre-paid credits. Prices and limits change, so check claude.com/pricing before you commit. This guide is free either way.',
  },
  {
    q: 'Do I need to know how to code to use it?',
    a: 'No, and that is who this guide is written for. What you do need is the ability to describe what you want precisely and to check whether you got it. Ask for plans before code, ask for proof before you believe it, and make it explain each change in plain English so you learn the project as it gets built.',
  },
  {
    q: 'How do I install Claude Code?',
    a: 'Install Node 18 or newer from nodejs.org, then run "npm install -g @anthropic-ai/claude-code" in your terminal. Move into your project folder with "cd", type "claude", and sign in when the browser opens. Then run /init so it writes itself a briefing about your project.',
  },
  {
    q: 'What is CLAUDE.md and why does everyone say it matters?',
    a: 'It is a plain text file in your project that Claude reads automatically at the start of every session. It holds your stack, your commands, your rules, and your traps. Every correction you find yourself repeating belongs in it. It is the single highest-leverage file in a project, and it is why one person gets great output while another gets noise from the same tool.',
  },
  {
    q: 'Why does Claude Code get worse the longer I use it?',
    a: 'Its working memory fills up. A session that has run for two hours across four unrelated tasks has pushed out what you said in hour one. Finish a task, save your work, clear the session, and start the next one fresh. Beginners hoard one long session as if it were progress. It is the opposite.',
  },
  {
    q: 'Is it safe to let it change my files?',
    a: 'Yes, with two habits. Keep your project in git so every change is reversible, and start real tasks in plan mode, where it can read and think but cannot touch anything until you approve the approach. There is a flag that turns off every permission check. It exists for disposable containers, not for a machine holding work you would miss.',
  },
  {
    q: 'Can Modern Mustard Seed build this for me instead?',
    a: 'Yes. Plenty of people read a guide like this, get a taste of what is possible, and decide they would rather have the thing than the education. We are a product studio in Kalispell, Montana that builds custom apps, websites, and AI voice agents at set package prices, usually shipped in weeks. Call the ranch line and Mr. Mustard, our own AI agent, will take it from there, or book a call with Sarah directly.',
  },
];

/** The one-pager pulls exactly these, and nothing else, so it stays a sheet. */
export const ONE_PAGER_ESSENTIALS = {
  loop: ['Explore', 'Plan', 'Build', 'Prove', 'Save'],
  rules: RULES.slice(0, 6),
  keys: KEYS.slice(0, 4),
};
