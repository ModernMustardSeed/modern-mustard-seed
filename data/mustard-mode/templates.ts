export type Blueprint = {
  id: string;
  name: string;
  kind: 'prompt-pack' | 'claude-md' | 'spec' | 'workflow' | 'checklist';
  description: string; // one sentence, benefit-led
  body: string;        // COMPLETE usable markdown content, not an outline
};

export const blueprints: Blueprint[] = [
  // 1 -----------------------------------------------------------------
  {
    id: 'claude-md-starter',
    name: 'The CLAUDE.md Starter',
    kind: 'claude-md',
    description: 'The project memory file that makes every future Claude session start already knowing your codebase.',
    body: `# CLAUDE.md Starter

Drop this file at the root of any project. Claude Code reads it automatically at the start of every session, so you stop re-explaining your project and start getting work done. Fill in the brackets, delete what does not apply, and keep it current. A stale CLAUDE.md quietly misleads every session, so treat it like a living document.

The rule of thumb: high signal, low word count. If a line would not change how Claude works, cut it.

---

## Copy this template

\`\`\`markdown
# [Project Name]

## What this is
[Two sentences. What the project does and who it is for. No marketing language, just the truth.]

## Stack
- Framework: [e.g. Next.js 16, App Router]
- Language: [e.g. TypeScript, strict mode]
- Styling: [e.g. Tailwind v4]
- Data: [e.g. Supabase (Postgres + Auth + Storage)]
- Payments: [e.g. Stripe]
- Hosting: [e.g. Vercel]
- Notable choice: [any non-obvious decision and the one-line reason, e.g. "Zustand over Redux because the app state is small and we value simplicity"]

## Commands
- Install: [e.g. npm install]
- Dev: [e.g. npm run dev]
- Build: [e.g. npm run build]
- Test: [e.g. npm test]
- Deploy: [e.g. push to main, Vercel auto-deploys]

## Architecture
- \`src/app\`: [what lives here]
- \`src/components\`: [what lives here]
- \`src/lib\`: [what lives here]
- \`data/\`: [what lives here]
- Data flow: [one or two sentences, e.g. "Server components fetch from Supabase, client components use tRPC for mutations"]

## Conventions
- [Naming, e.g. components are PascalCase files, utilities are camelCase]
- [Patterns to match, e.g. new API routes follow the shape in src/app/api/audit/route.ts]
- [What to never do, e.g. never import server-only code into a client component; never expose the service key to the browser]

## Gotchas
- [The traps that waste a session's time, e.g. "The dev server needs .env.local; copy .env.example first"]
- [e.g. "Printify re-publishes wipe Shopify tags, so restore tags after any mutation"]
- [The fragile area, e.g. "The checkout flow is load-bearing; test it end to end after any change near it"]

## Definition of done
- [e.g. Build passes clean, no type errors]
- [e.g. Tested the core flow manually]
- [e.g. Committed and pushed]
\`\`\`

---

## Example lines that actually help

Good lines are specific and save real time:

- "Auth is magic-link only via Resend SMTP. There is no password flow, do not add one."
- "The pricing lives in one file: data/products.ts. Never hardcode a price anywhere else."
- "Migrations go in supabase/migrations and must be applied in the dashboard SQL editor; the service key cannot run DDL."
- "This repo deploys via the Vercel CLI (vercel --prod), not git push. Do not assume auto-deploy."

Weak lines to avoid, because they add words without changing behavior:

- "This is a modern web application built with best practices."
- "We care about clean code and good user experience."

## Maintenance ritual

Once a month, or after any big change, run this prompt in the project:

> "Re-read this project and check the CLAUDE.md against reality. Tell me every line that is now stale or wrong, and propose the corrected version."

Keeping this file honest is the highest-leverage five minutes in your whole setup.`,
  },

  // 2 -----------------------------------------------------------------
  {
    id: 'landing-page-build-script',
    name: 'The Landing Page Build Script',
    kind: 'workflow',
    description: 'The exact prompt sequence that takes you from an empty folder to a deployed landing page.',
    body: `# The Landing Page Build Script

A copy-paste sequence of prompts. Run them in order in Claude Code. Do not skip the design step, that is what stops the result from looking like every other AI page. Fill the brackets before you start.

Your inputs:
- Product: [what it is]
- Audience: [who it is for]
- Outcome: [what they get]
- Brand feel: [three adjectives, e.g. warm, credible, premium]
- Colors and fonts: [if you have them; if not, let Claude propose]

---

## Step 0: Set up the folder

> "Create a new project folder for a landing page called [name]. Use a single self-contained approach: one HTML file with inline CSS and minimal vanilla JS, plus a Google Fonts link. No build step. Set up the folder and a git repo, and give me the starting file structure."

## Step 1: Get the design direction first

> "Before writing the page, act as an art director. Write me a short design brief for [product], a [what] for [audience], with the feeling [three adjectives]. Give me: a one-line concept, an opinionated font pairing, a palette of base + ink + one accent (hex), the layout principle, how we create depth without stock photos, and the one signature moment. Make choices, no menus. The enemy is the generic AI look, avoid purple gradients, centered everything, and Inter for all text."

Read the brief. If it is not the vibe, push back in one line ("make it warmer" / "more editorial") and have it revise. Approve before building.

## Step 2: Build the full page in one pass

> "Now build the complete landing page using that brief. Structure: sticky nav with one CTA, hero (headline under 8 words + outcome subhead + CTA + a CSS-built visual), social proof strip, three benefits with inline-SVG icons, how-it-works in three steps, the signature interactive moment from the brief, a four-question FAQ, final CTA band, minimal footer. Real specific copy, no lorem ipsum. Mobile-first, responsive at 375, 768, and 1440. Subtle scroll fade-ins. Deliver the full file."

## Step 3: Sharpen the copy

> "The layout is right. Now upgrade the copy. Give me three headline options for the hero across the outcome, the pain-removed, and the bold-claim angles, each under 9 words. Rewrite the three benefit lines to lead with the outcome, not the feature. Make the CTA labels action-plus-value, never 'Submit' or 'Learn More'. Apply the best ones."

## Step 4: Responsive reality check

> "Audit the page at 320, 375, 768, 1024, and 1440px. Find text overflow, tap targets under 44px, unwanted horizontal scroll, and squished grids. List issues worst-first with the exact CSS fix, then apply them."

## Step 5: Add the growth layer

> "Add the growth essentials: a working email capture (wired to [your tool, or a simple mailto/Formspree for now]), a clear single conversion goal, SEO meta tags and Open Graph tags with real values, and a lightweight analytics snippet placeholder. Tell me exactly what to fill in."

## Step 6: Polish pass

> "Add the polish layer: button hover/active/focus states, smooth 150 to 300ms transitions, a skeleton or subtle loader for the form, success and error feedback, and staggered scroll reveals. Respect prefers-reduced-motion throughout. Tell me the one change that most improves perceived quality."

## Step 7: Ship it

> "Get this production-ready and deployed to Vercel. Run the build, fix any errors, move any keys to env vars and tell me which to set in the dashboard, then give me the deploy steps. After deploy, give me a 6-point smoke test to run on the live URL: load, the CTA, mobile view, the form submit, a refresh, and one error path. Do not call it done until that smoke test would pass."

---

## The one rule

Do not let it skip Step 1. Every forgettable AI page skips straight to building. The design brief is thirty seconds that changes everything downstream.`,
  },

  // 3 -----------------------------------------------------------------
  {
    id: 'saas-spec-template',
    name: 'The SaaS Spec Template',
    kind: 'spec',
    description: 'A fill-in one-page spec that forces clarity before you write a single line of code.',
    body: `# The One-Page SaaS Spec

Fill this in before building anything. If you cannot fill a section, that is the section to think about, not skip. The discipline of one page is the point. When you are done, paste the whole thing into Claude Code and say "build the shortest path to the core job in this spec."

---

## 1. The problem
[The specific, painful, frequent problem. Who has it and in what moment. If it is a vitamin (nice to have) rather than a painkiller (need it now), say so honestly.]

## 2. The user
- Primary user: [role, context, what their day looks like]
- What triggers them to look for a solution: [the moment of pain]
- Their alternative today: [what they use now, including "do nothing" or "a spreadsheet"]

## 3. The one core job
[The single thing this product must do well. One sentence. If you have three, pick the one that, if it worked, would make the other two matter. The rest are v2.]

> A user can [action] so that [outcome].

## 4. Must-haves for v1
The shortest list that makes the core job real:
- [ ] [feature 1]
- [ ] [feature 2]
- [ ] [feature 3]

If the list is longer than five, you are building v2. Cut it.

## 5. Explicitly out of scope
The features you are NOT building yet (this section protects you from yourself):
- [e.g. user settings and profiles]
- [e.g. team accounts]
- [e.g. an admin dashboard]
- [e.g. integrations]

## 6. The signature moment
[The one thing that makes this feel special instead of generic. The detail people remember or screenshot. What is it?]

## 7. Data model (rough)
The main things the app stores:
- [Entity 1]: [the fields that matter]
- [Entity 2]: [the fields that matter]
- Relationships: [how they connect]

## 8. The money
- Model: [free / freemium / subscription / one-time]
- Price: [$X per month, or the plan tiers]
- The value that justifies it: [the outcome they pay for, in their terms]

## 9. Success metric
[How you will know v1 worked. A specific number or event, e.g. "10 people complete the core flow and 3 come back the next day."]

## 10. Open questions
[What is still unknown and needs a decision or a test before or during the build.]
- [ ] [question 1]
- [ ] [question 2]

---

## How to use this with Claude

1. Fill it in, roughly is fine.
2. Paste it and say: "Interrogate this spec. Ask me the 5 questions where a wrong assumption would waste the most build time, then wait."
3. Answer, let it tighten the spec.
4. Then: "Build only the shortest path to the core job. Put anything tempting into a Later list instead of building it."

The spec that refuses the most is the spec that ships.`,
  },

  // 4 -----------------------------------------------------------------
  {
    id: 'daily-cowork-os',
    name: 'The Daily Cowork Operating System',
    kind: 'workflow',
    description: 'A repeatable daily rhythm with the exact prompts that turns Claude into a real cowork partner.',
    body: `# The Daily Cowork Operating System

Working with Claude is not "ask a question, get an answer." It is a rhythm. This is a full day, with the exact prompts, that turns Claude from a tool you reach for into a partner you build the day around. Adapt the times to your life. The structure is what matters.

---

## Morning: Set the frame (10 minutes)

**1. The digest.** Start the day knowing what matters, not by drowning in inputs.

> "Here is my situation this morning: [paste your calendar, key emails, and anything on your mind]. Act as my chief of staff. Give me: the one thing that matters most today, what needs a real decision from me, what I can ignore, and my three highest-leverage moves in priority order. Be direct."

**2. Pick the one thing.** Decide the single most important outcome for the day before the day decides for you.

> "Of everything above, if I could only finish one thing today, which one moves the needle most, and why? Give me the first concrete step to start it in the next ten minutes."

---

## Deep work block 1: Build (90 minutes)

**3. Plan before you build.** Never let it touch code before you have seen the plan.

> "I want to [today's build task]. Work in plan mode. Explore the relevant files, then give me a numbered implementation plan with the files and changes. Flag the riskiest step. Stop and wait for my go."

**4. Execute, then verify.** Approve, let it build, then make it prove the work.

> "Approved, build it exactly as planned. When done, tell me the exact steps to test it end to end, and do not tell me it works until that test would actually pass."

---

## Midday: Reset and triage (15 minutes)

**5. Clear the inbox without living in it.**

> "Triage my unread email [paste or via connected mail]. Sort into needs-me, quick-approve, informational, and noise. Draft replies in my voice for the needs-me ones ([sample of how I write]). Draft everything, send nothing. Give me a two-minute digest."

---

## Deep work block 2: Create or think (90 minutes)

**6. Whatever the day needs.** Pull the right prompt for the job: write copy, design a screen, pressure-test an idea, or research a decision. Give it role, the deliverable shape, and your quality bar every time.

> "Act as [the role this task needs]. I need [the exact deliverable]. Here is the context: [context]. The quality bar is [what good looks like]. Here is my voice/brand if it matters: [sample]. Give me [the format], then tell me the one thing you would improve on a second pass."

---

## End of day: Close the loop (10 minutes)

**7. Capture what you learned.** Turn today's work into tomorrow's speed.

> "Summarize what we accomplished today in five lines. Then: what did we learn about this project that belongs in the CLAUDE.md or in my notes so future sessions are faster? Draft those lines."

**8. Set up tomorrow.** Leave a breadcrumb so tomorrow starts with momentum, not a cold start.

> "Based on where we ended, what is the single most important thing to start tomorrow, and what is the first step? Write it as a one-line note to my future self."

---

## The three habits that make this work

1. **Plan mode for anything non-trivial.** Seeing the plan before the edits prevents 90% of wasted work.
2. **Always ask it to verify.** "Prove it works" is the difference between "done" and "done for real."
3. **Feed the memory.** Every day you teach the CLAUDE.md something is a day next week gets faster.`,
  },

  // 5 -----------------------------------------------------------------
  {
    id: 'debug-protocol',
    name: 'The Debug Protocol',
    kind: 'workflow',
    description: 'A systematic way to debug with Claude that finds the real cause instead of shotgunning fixes.',
    body: `# The Debug Protocol

Most debugging goes wrong the same way: you describe the symptom, the AI guesses a fix, it does not work, you try another, and an hour later you have changed ten things and understand nothing. This protocol replaces guessing with diagnosis. Run the steps in order. Do not let Claude skip ahead to a fix.

---

## Step 1: Describe the symptom precisely

Vague in, vague out. Give Claude the real evidence.

> "I have a bug. Here is exactly what happens: [the wrong behavior]. Here is what I expected instead: [expected]. It happens when: [the trigger, steps, or data]. Here is the error message and full stack trace: [paste it]. Here is the relevant code: [paste or point to files]. Do not propose a fix yet."

The full stack trace matters. The real origin is often three or four lines below the top.

## Step 2: Form ranked hypotheses

Force it to think before it acts.

> "Based on this, list the 3 to 4 most likely causes, ranked by probability, each with your reasoning. For the top one, tell me exactly what to check to confirm or rule it out: which file, which log line, which value."

## Step 3: Confirm the cause with evidence

Do not fix a suspected cause. Prove it first.

> "Add targeted logging or a small check to confirm which hypothesis is right. Tell me what output to look for. I will run it and paste what I see."

Then paste what you saw. Now you know, instead of guess.

## Step 4: Find the root cause, not the trigger

The trigger is what set it off this time. The root cause is why the system was fragile enough to break.

> "Now that we know the cause, run the five-whys. Keep asking why until we reach the root cause, the thing that if fixed makes this whole class of bug impossible. Show me the chain. Distinguish the root cause from the trigger."

## Step 5: Fix once, at the root

> "Fix the root cause. Explain why this addresses the cause and not just the symptom. If a symptom-level guard is still worth keeping as defense, tell me."

## Step 6: Prove the fix and prevent regression

A fix you cannot verify is a hope.

> "Give me the exact steps to prove this is fixed, including the edge cases this class of bug likes to hide in. Then add a regression test so it can never silently come back. Finally, tell me if this same root cause is probably causing other bugs elsewhere in the code."

---

## For the maddening intermittent bug

If it does not happen every time, add this before Step 5:

> "This bug is intermittent. Do not attempt a fix until we can reproduce it on demand. Give me the smallest reliable reproduction: the exact state, timing, or sequence that triggers it. If we cannot reproduce it, we cannot know we fixed it."

Reproduction is 90% of the fix. Once you can trigger it on command, the cause usually becomes obvious.

---

## The one discipline

When Claude jumps to a fix in Step 1, stop it: "Not yet. Cause first, then fix." A bug you patched without understanding is a bug you just stopped seeing.`,
  },

  // 6 -----------------------------------------------------------------
  {
    id: 'design-direction-brief',
    name: 'The Design Direction Brief',
    kind: 'spec',
    description: 'A fill-in brief that produces intentional, premium design instead of the generic AI look.',
    body: `# The Design Direction Brief

The difference between a page that looks templated and one that looks designed is a point of view, decided before the first line of code. This brief forces that decision. Fill it in (or have Claude propose and you react), then paste it at the top of every build prompt for the project so the whole thing stays coherent.

---

## The project
- What it is: [one line]
- Who it is for: [the specific audience, not "everyone"]
- What they should feel in the first three seconds: [the emotion]
- The action we want: [the one conversion goal]

## The concept
[One sentence that captures the feeling. Not "clean and modern" (everyone says that). Something with a point of view, e.g. "a quiet luxury boutique that happens to live in a browser" or "a founder's workshop, warm and a little raw."]

## Type system
- Display / headline font: [name]: [why it fits, e.g. "editorial serif for authority"]
- Body font: [name]: [why]
- The contrast between them: [what makes the pairing sing]
- Not Inter for everything. Not a single font doing all the work.

## Color
- Base (background): [hex]: [the mood it sets]
- Ink (text): [hex]
- Accent (exactly one): [hex]: [used sparingly, only for the most important actions]
- The rule: [where the accent is allowed to appear and where it is banned]
- No purple-to-blue gradient. No rainbow. One accent, held with discipline.

## Layout
- The grid logic: [e.g. generous asymmetry, a strong left column, a magazine spread]
- Where we break symmetry on purpose: [the one intentional off-balance moment]
- Whitespace stance: [generous and confident, or dense and utilitarian, and why]

## Depth and texture (no stock photos)
[How we create richness: grain, considered shadows, hairline borders, a subtle gradient mesh, motion. What gives this surface life without a single stock image.]

## The signature moment
[The one memorable interaction or visual detail. What the user does, and the delightful thing that happens. It should dramatize what the product is about, not just decorate.]

## The guardrails
- Three adjectives this design IS: [___, ___, ___]
- Three it is explicitly NOT: [___, ___, ___]
- The generic-AI tells we are banning: purple gradients, everything centered, Inter everywhere, three identical rounded cards, emoji as icons, no point of view.

---

## How to run it with Claude

**To generate the brief:**
> "Act as an art director. Fill in this design brief for [project], a [what] for [audience], feeling [adjectives]. Make real choices, no menus. The enemy is the generic AI look. Give me an opinionated point of view I can react to."

**To explore before committing:**
> "Give me three genuinely distinct directions filling this brief, truly different (editorial-restrained vs bold-expressive vs warm-human), one a little risky. Build a single HTML moodboard showing each one's hero, type specimen, palette, and one component so I can feel the difference. Do not pick for me."

**To keep it coherent:**
Paste the approved brief at the top of every build prompt. Consistency is a design feature.`,
  },

  // 7 -----------------------------------------------------------------
  {
    id: 'launch-checklist',
    name: 'The Launch Checklist',
    kind: 'checklist',
    description: 'The pre-ship gate that catches what breaks first launches before your first user does.',
    body: `# The Launch Checklist

The gate between "it works on my machine" and "I told people about it." Run every box before you announce. Most first launches die on the boring items, not the exciting ones. Have Claude help you work through each section, and do not skip the ones that feel tedious. Those are the ones that bite.

---

## Works for real
- [ ] The core flow works end to end on a fresh browser (not your logged-in, cached one)
- [ ] Test it in an incognito window as a brand-new user with zero prior state
- [ ] Every button and link goes where it should; no dead ends
- [ ] Forms validate, submit, and show a real success state
- [ ] The empty state (no data yet) looks designed, not broken
- [ ] The error state (something failed) is handled gracefully, no white screen

> Prompt: "Walk through my app as a brand-new user in an incognito session. List every step of the core flow and tell me where it breaks, dead-ends, or confuses. Then fix each."

## Mobile
- [ ] Loads and works on an actual phone, not just a resized browser
- [ ] No horizontal scroll anywhere
- [ ] Tap targets are big enough (44px minimum)
- [ ] Text is readable without zooming
- [ ] The primary CTA is reachable and obvious on mobile

## Speed and stability
- [ ] The production build runs clean, no errors, no type errors
- [ ] Images are sized and compressed, not 4MB hero files
- [ ] The page loads in a couple of seconds on a normal connection
- [ ] It does not crash if an API is slow or an env var is missing; it degrades gracefully

> Prompt: "Run the production build and fix every error. Then find the top 3 things slowing this page down, ranked by impact, and fix them."

## Trust and security
- [ ] No secrets, API keys, or tokens hardcoded in the source (moved to env vars)
- [ ] Service keys never reach the browser
- [ ] If there is user data, each user can only see their own (row-level security or equivalent, tested with two accounts)
- [ ] HTTPS is on; no mixed-content warnings

> Prompt: "Scan this codebase for hardcoded secrets or keys and any place a private key could reach the client. List each with the file and line, then fix them."

## Found and understood
- [ ] Page title and meta description are real and specific
- [ ] Open Graph tags set so the link preview looks good when shared
- [ ] A favicon exists
- [ ] The homepage explains what this is and who it is for in the first screen
- [ ] There is one clear thing you want the visitor to do

## Money (if you charge)
- [ ] The payment flow works with a real test transaction
- [ ] The success and failure paths both work
- [ ] The customer gets a receipt or confirmation
- [ ] You (or the system) get notified of a new sale
- [ ] Pricing is stated clearly and lives in exactly one place in the code

## Measure
- [ ] Analytics is installed and firing (you can see a test visit)
- [ ] You know the ONE number that tells you if the launch worked
- [ ] Email capture works and you can see where the addresses land

## The human check
- [ ] One other person used it cold and you watched without helping
- [ ] You wrote the announcement and it is clear about what this is and why to care
- [ ] You have a plan for the first support question or bug report

---

## The final gate

> Prompt: "Act as a skeptical launch reviewer. Assume this is going live to real users in an hour. Give me the top 5 things most likely to embarrass me or lose a customer in the first day, ranked, each with a fix. Be blunt."

If it passes that, ship it. Perfect is the enemy of launched, but broken is the enemy of trusted. This list is the line between the two.`,
  },

  // 8 -----------------------------------------------------------------
  {
    id: 'prompt-writing-template',
    name: 'The Prompt-Writing Template',
    kind: 'prompt-pack',
    description: 'The anatomy of a prompt that works, so you can write your own great ones instead of collecting them.',
    body: `# The Prompt-Writing Template

Collecting prompts is fine. Writing your own is freedom. Every great prompt has the same skeleton. Learn the anatomy once and you will never be stuck staring at a blank chat box again. The gap between a weak result and a great one is almost never the model. It is what you asked for.

---

## The anatomy: five parts

A strong prompt has these, in roughly this order. Not every prompt needs all five, but the great ones usually have four.

### 1. Role
Tell it who to be. This sets the vocabulary, the standards, and the instincts it brings.
- Weak: "Help me with my landing page."
- Strong: "You are a senior product designer who ships award-worthy marketing sites."

### 2. Task and context
State exactly what you want and give it what it needs to know. Vague context is the number one cause of bad output.
- Weak: "Write some copy."
- Strong: "Write hero copy for [product], which helps [audience] achieve [outcome]. Their current pain is [pain]."

### 3. The deliverable shape
Describe the exact form of the output. This is where most people leave value on the table.
- Weak: "Give me ideas."
- Strong: "Give me 8 headline options across five angles (outcome, pain-removed, bold-claim, specific-number, identity), each under 9 words, then pick the best and say why."

### 4. The quality bar and constraints
Tell it what good looks like and what to avoid. Name the failure mode you fear.
- "No jargon, no hype words like 'seamless' or 'revolutionary'."
- "Must not look like a generic AI template."
- "Match my voice from this sample: [sample]."
- "No em dashes."

### 5. The iteration hook
End by asking it to improve on itself or hand you the next move. This turns one output into a loop.
- "Then tell me the one thing you would change on a second pass."
- "Give me the version you would ship and the one you would test against it."

---

## The template

\`\`\`
You are [role with a standard baked in].

I need [the exact task]. Context: [everything relevant, the more specific the better].

Deliver it as [the precise shape: how many, what format, what structure].

Quality bar: [what good looks like]. Avoid [the specific failure mode you fear]. [Any voice or brand sample.]

Then [the iteration hook: what to improve, or the next move].
\`\`\`

---

## Five upgrades that instantly improve any prompt

1. **Add a number.** "Give me ideas" becomes "give me 8 ideas." Quantity forces range.
2. **Name the enemy.** "Avoid the generic AI look" or "no corporate throat-clearing." Telling it what to avoid is as powerful as what to want.
3. **Show, do not tell, your voice.** Paste two real samples instead of describing your tone. It matches better than any adjective.
4. **Ask it to choose.** "Then recommend one and say why" beats a menu you have to evaluate yourself.
5. **Make it stop and think first.** For anything non-trivial: "Before you start, ask me the 3 questions where a wrong assumption would waste the most work. Then wait." This one line prevents most redos.

---

## The practice

Next time you get a mediocre result, do not blame the model. Find which of the five parts you left out. Nine times out of ten it is the deliverable shape or the context. Add it, run again, and watch the quality jump. Do that for a week and you will write better prompts than any pack you could buy, including this one.`,
  },

  // 9 -----------------------------------------------------------------
  {
    id: 'validation-sprint-14-day',
    name: 'The 14-Day Validation Sprint',
    kind: 'workflow',
    description: 'A day-by-day plan to prove an idea is real before you spend a month building it.',
    body: `# The 14-Day Validation Sprint

The most expensive mistake is building something nobody wants. This is two weeks to find out cheaply, before you pour real time into code. Each day has one job and the exact prompt to run. Two weeks of evidence beats two months of assumption. If the idea dies here, celebrate. You just saved a month.

The goal of the sprint is not to build. It is to learn whether the problem is real, whether people will pay, and whether you can reach them.

---

## Week 1: Is the problem real?

**Day 1: Sharpen the idea.**
> "Here is my idea: [dump it all]. Interrogate it into a one-page brief: the specific problem, who has it, the one core job, and the riskiest assumption. Ask me the 5 questions where a wrong answer would waste the most time, then wait."

**Day 2: Pressure-test it.**
> "Be a sharp, fair skeptic. Try to break this idea on demand, willingness to pay, alternatives, distribution, and moat. For each, the biggest risk. Then the single cheapest experiment to learn if it is real. End with your honest call: pursue, reshape, or drop."

**Day 3: Map the alternatives.**
> "What do people with this problem use today, including doing nothing and using a spreadsheet? For each, why it is often good enough, and the specific gap my idea fills that they cannot. If the gap is thin, tell me."

**Day 4: Find where they gather.**
> "Where do [my target customers] actually spend time online and off: specific communities, subreddits, forums, groups, events, newsletters. Give me a ranked list of the 5 best places to find and talk to them this week."

**Day 5: Write the outreach.**
> "Write a short, genuine message to recruit 5 to 8 of these people for a 15-minute conversation about [the problem], not a pitch. It should get replies: specific, low-friction, about them. Give me the message and a follow-up."

**Days 6 to 7: Talk to humans.**
Have the conversations. Ask about the problem and what they do now, never pitch your solution. Then:
> "Here are my notes from 5 problem interviews: [paste]. What patterns show up? Is the pain real, frequent, and urgent, or a nice-to-have? Quote the lines that are the strongest signal and the strongest warning."

---

## Week 2: Will they pay, and can you reach them?

**Day 8: Shape the offer.**
> "Based on what I heard, shape the smallest offer that solves the core job: what it does, what is explicitly out, and a price. Frame the value in their words from the interviews, not my features."

**Day 9: Build a smoke test.**
> "Build a single landing page that describes this offer as if it exists: the outcome, how it works, the price, and a clear call to action (join the waitlist / pre-order / book a call). Real specific copy. Include email capture and a way to measure interest. Do not build the product, only the promise."

**Day 10: Design the signal.**
> "Define exactly what counts as validation for this test: how many visitors, what conversion to signup or pre-order, and what would count as a clear no. Give me the one number to watch and an honest threshold I cannot fudge afterward."

**Day 11: Drive real traffic.**
> "Give me a plan to get 100 to 300 of the right people to this page this week using the communities from Day 4, one or two posts in my voice, and any direct outreach. What do I post where, and how do I do it without being spammy?"

**Days 12 to 13: Run it and watch.**
Ship the page, drive the traffic, watch the number.
> "Here are the results: [visits, signups, any replies or pre-orders]. What is the honest read against the threshold we set? Strong signal, weak signal, or no? Do not soften it."

**Day 14: Decide.**
> "Given everything from these two weeks, the interviews and the smoke test, give me a clear recommendation: build it, reshape it (and how), or drop it (and why that is a win). If build, what is the single riskiest thing still unproven that the MVP must test first?"

---

## The one rule of the sprint

You are hunting for the truth, not for a yes. A clean no on Day 14 is a great outcome. It cost you two weeks and it just bought back a month of your life. Fall in love with the problem and the evidence, never with the idea.`,
  },
];
