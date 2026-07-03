export type PromptCard = {
  id: string;        // kebab-case unique
  category: 'build' | 'design' | 'write' | 'think' | 'automate' | 'debug';
  title: string;     // punchy, 2-6 words
  whenToUse: string; // one sentence
  text: string;      // the full prompt, copy-paste ready, long-form and genuinely excellent
  proTip?: string;   // optional one-line power move
};

export const promptCards: PromptCard[] = [
  // ------------------------------------------------------------------
  // BUILD
  // ------------------------------------------------------------------
  {
    id: 'landing-page-one-pass',
    category: 'build',
    title: 'Full Landing Page, One Pass',
    whenToUse: 'You want a complete, deployable marketing page from a blank folder in a single request.',
    text: `You are a senior product designer and front-end engineer who ships award-worthy marketing sites. Build me a complete, single-file landing page for [your product], a [one-line description of what it does] for [who it is for].

Constraints:
- One self-contained HTML file with inline CSS and minimal vanilla JS. No frameworks, no external assets except Google Fonts.
- Mobile-first and fully responsive at 375px, 768px, and 1440px.
- Real, specific copy. No lorem ipsum, no "Lorem", no placeholder brackets in the final output.

Structure, in this order:
1. Sticky nav with logo wordmark and a single primary CTA.
2. Hero: one sharp headline (max 8 words), one subhead that states the outcome, primary CTA, and a supporting visual built in CSS (gradient, mesh, or abstract shape, no stock photos).
3. Social proof strip (logos or a stat line).
4. Three-benefit section, each with an icon drawn in inline SVG, a benefit-led title, and one sentence.
5. How it works, three numbered steps.
6. One signature interactive moment (a live toggle, calculator, or hover reveal) that makes the page feel alive.
7. FAQ, four questions.
8. Final CTA band and a minimal footer.

Design bar: it must not look like a generic AI template. Pick an opinionated type pairing, a restrained palette (one accent max), generous whitespace, and a clear visual rhythm. Add subtle scroll-triggered fade-ins.

Deliver the full file, then give me a 3-line summary of the design choices you made and one thing I could A/B test.`,
    proTip: 'Paste your real brand colors and font names into the constraints and it will match your identity on the first try.',
  },
  {
    id: 'add-feature-plan-mode',
    category: 'build',
    title: 'Add A Feature With Plan Mode',
    whenToUse: 'You are adding a non-trivial feature to an existing codebase and want a plan before any edits.',
    text: `I want to add [feature] to this project. Before you write or change any code, work in plan mode.

Step 1: Explore. Read the relevant files and tell me how the current system works in the area this feature touches. List the exact files and functions involved with file paths.

Step 2: Plan. Propose an implementation as a numbered list of changes. For each change, name the file, what you will add or modify, and why. Call out any new dependencies, database changes, or config. Flag the riskiest step and how you will de-risk it.

Step 3: Edge cases. List the edge cases, error states, and loading states this feature needs, and how you will handle each.

Step 4: Stop and wait. Do not edit anything yet. Show me the plan and ask me to approve or adjust. Once I say go, implement it exactly as approved, then tell me how to test it end to end.

Match the existing code style, naming, and patterns already in this repo. Do not introduce a new library if an existing one already does the job.`,
    proTip: 'In Claude Code, press Shift+Tab to enter plan mode so it physically cannot touch files until you approve.',
  },
  {
    id: 'spec-to-app',
    category: 'build',
    title: 'One-Page Spec To Working App',
    whenToUse: 'You have a clear idea and want a minimal but real working app scaffolded end to end.',
    text: `Build a working MVP of [app idea]. Treat this as a real product, not a demo.

The core job to be done: [the one thing a user must be able to do].
Primary user: [who].
Success looks like: [what the user achieves].

Scope discipline: build only the shortest path to that one core job working end to end. No settings pages, no admin, no nice-to-haves. If you are tempted to add something, put it in a "Later" list at the end instead of building it.

Stack: [Next.js + Tailwind + Supabase, or say "pick a sensible stack and tell me why"].

Deliver:
1. The full file tree you are creating.
2. The code for every file, complete and runnable.
3. The exact terminal commands to install and run it locally.
4. Any environment variables I need to set, with a sample .env.
5. A 5-line "how to test the core flow" checklist.

Build it so I can run it in under 5 minutes. Ask me nothing you can reasonably decide yourself. Note assumptions in a short list at the top.`,
    proTip: 'End with "keep it to one core flow" so it does not balloon the scope on you.',
  },
  {
    id: 'clone-this-vibe',
    category: 'build',
    title: 'Match A Reference Site',
    whenToUse: 'You love how a specific site or screenshot looks and feels and want that energy in your own build.',
    text: `I am pasting a screenshot of [site or app]. I do not want a copy. I want you to reverse-engineer the design principles that make it feel good and apply them to [my project].

Analyze the reference and tell me:
1. The type system (likely font pairing, sizes, weight contrast).
2. The color logic (base, ink, and accent, and how sparingly the accent is used).
3. Spacing and rhythm (density, whitespace, grid).
4. The one move that gives it personality (a signature interaction, texture, or layout choice).

Then build my version for [my product and audience], keeping those principles but with original copy, my own color direction of [colors], and a layout suited to my content. It should feel like a cousin of the reference, not a clone.

Deliver the code plus a short note on which principles you kept and which you deliberately changed for my context.`,
    proTip: 'Give it two references at once and ask it to blend the type system of one with the color mood of the other.',
  },
  {
    id: 'wire-the-backend',
    category: 'build',
    title: 'Wire The Backend',
    whenToUse: 'Your front end works and now you need real data, auth, and persistence behind it.',
    text: `My front end for [feature] is working with mock data. Wire up a real backend using [Supabase / your stack].

Do this in order:
1. Propose the database schema as SQL: tables, columns, types, relationships, and indexes. Explain each table in one line. Wait for me to confirm the schema before proceeding.
2. Once confirmed, generate the migration.
3. Add row-level security policies so a user can only read and write their own rows. Show me the policies and explain what each one blocks.
4. Replace the mock data in the front end with real queries. Handle loading, empty, and error states for each.
5. Add optimistic updates where it improves feel, and tell me where you did.

Never expose service keys to the client. Use environment variables and tell me exactly which ones go where. At the end, give me a manual test script: the clicks to prove create, read, update, and delete all work and that another user cannot see my data.`,
    proTip: 'Ask it to write the RLS policies first and test them before touching the UI. Security bugs are cheapest to catch early.',
  },
  {
    id: 'ship-to-vercel',
    category: 'build',
    title: 'Ship It To Production',
    whenToUse: 'The app runs locally and you want it live on a real URL with the boxes checked.',
    text: `This project runs locally. Get it production-ready and deployed to Vercel. Walk me through it as a checklist and do everything you can yourself.

Pre-flight:
1. Run the production build and fix every error and type error until it passes clean.
2. Scan for secrets or keys hardcoded in the source and move them to environment variables.
3. Confirm every external service (database, auth, APIs) has its keys set for production, and list exactly which env vars I need to add in the Vercel dashboard.
4. Check that the app degrades gracefully if an env var is missing rather than white-screening.

Deploy:
5. Give me the exact commands or steps to deploy.
6. After deploy, give me a 6-point smoke test to run on the live URL: load, core action, auth, mobile view, a refresh, and one error path.

If anything is not safe to ship yet, tell me plainly what and why before we deploy. Do not tell me it is done until the live smoke test would actually pass.`,
    proTip: 'Have it write the smoke test before deploying, then run it against the preview URL first.',
  },
  {
    id: 'component-from-screenshot',
    category: 'build',
    title: 'Component From A Screenshot',
    whenToUse: 'You saw a UI component you want and would rather show it than describe it.',
    text: `Here is a screenshot of a [component: pricing table / testimonial card / nav / dashboard tile]. Rebuild it as a clean, reusable component in [React + Tailwind / plain HTML+CSS].

Requirements:
- Match the layout, spacing, and hierarchy closely, but use my palette of [colors] and my font [font].
- Make it responsive: tell me how it reflows on mobile and build that behavior.
- Make it data-driven: props or variables for the text and values, not hardcoded strings, so I can reuse it.
- Add sensible hover and focus states and make it keyboard accessible.
- No pixel-for-pixel copying of their exact brand. Capture the structure and quality, not their identity.

Deliver the component code, a usage example with sample data, and a one-line note on any accessibility choice you made.`,
    proTip: 'Ask for a second variant (compact and spacious) in the same call so you have options to drop in.',
  },

  // ------------------------------------------------------------------
  // DESIGN
  // ------------------------------------------------------------------
  {
    id: 'non-generic-design-brief',
    category: 'design',
    title: 'Kill The Generic AI Look',
    whenToUse: 'Before any build, when you want a design that looks intentional and human, not templated.',
    text: `Before you write any code, act as an art director and write me a design brief for [project], a [what it is] for [audience].

The enemy is the generic AI look: purple-to-blue gradients, centered everything, Inter for all text, three identical rounded cards, emoji as icons, and no point of view. Avoid all of it.

Give me a brief with:
1. A one-line design concept (the feeling in a sentence).
2. Type system: a specific, opinionated font pairing with the role of each and why it fits the audience.
3. Palette: base, ink, and exactly one accent, with hex values and a rule for how sparingly the accent appears.
4. Layout principle: the grid logic and where you will deliberately break symmetry.
5. Texture and depth: how you create richness without stock photos (grain, shadow logic, borders, motion).
6. The signature moment: the one memorable interaction or visual detail people will remember.
7. Three adjectives this design is, and three it is explicitly not.

Make choices, do not give me menus. I want a point of view I can react to.`,
    proTip: 'Save the brief and paste it at the top of every build prompt for this project so the whole thing stays coherent.',
  },
  {
    id: 'three-directions-then-commit',
    category: 'design',
    title: 'Three Directions, Then Commit',
    whenToUse: 'Starting a new site or screen and you want real options before you pour effort into one.',
    text: `I am starting [project]. Explore three genuinely distinct design directions before we build anything.

For each direction give me:
- A name and a one-line concept.
- The type pairing, palette (hex), and overall mood.
- The layout approach and what makes it different from the other two.
- Who it would appeal to and the risk it carries.

The three must be truly different, not the same idea in three colors. Think along axes like: editorial and restrained versus bold and expressive versus warm and human. One of them should feel a little risky.

Then build a single HTML moodboard page that shows all three side by side: for each, render the hero, a type specimen, the palette swatches, and one component so I can feel the difference visually.

Do not pick for me yet. After I see the moodboard I will choose one, and then you will develop only that direction fully.`,
    proTip: 'Ask it to render the moodboard as one file you can open, so you compare with your eyes, not your imagination.',
  },
  {
    id: 'design-signature-moment',
    category: 'design',
    title: 'Design The Signature Moment',
    whenToUse: 'Your page works but feels flat and you want one memorable, award-tier detail.',
    text: `This [page/app] is functional but forgettable. Design one signature moment that makes it memorable and that fits [the brand feeling].

Give me three candidate ideas first, each described in two lines: what the user does, and what delightful thing happens. Range from subtle to bold. Examples of the genre: a hero element that responds to the cursor, a number that counts up as it enters view, a custom cursor in one zone, a magnetic button, a reveal-on-scroll narrative, a live preview that updates as you type.

Rules:
- It must serve the content, not distract from it.
- It must be tasteful and performant, no janky physics, respects reduced-motion preferences.
- It should reinforce what the product is about, not be decoration for its own sake.

Recommend one, tell me why, then build it as a self-contained snippet I can drop in, with the reduced-motion fallback included.`,
    proTip: 'The best signature moment usually dramatizes the core value prop. Tell it what your product does and let it connect the two.',
  },
  {
    id: 'responsive-audit',
    category: 'design',
    title: 'Responsive Reality Check',
    whenToUse: 'It looks great on your laptop and you need to know it holds up everywhere.',
    text: `Audit this page for responsive quality across real devices. Do not just say "it is responsive," actually pressure-test it.

Check these breakpoints and tell me exactly what breaks at each: 320px (small phone), 375px, 768px (tablet), 1024px, 1440px, and 1920px.

For each breakpoint, look for:
- Text that overflows, truncates badly, or gets too small to read.
- Tap targets under 44px on touch sizes.
- Horizontal scroll that should not exist.
- Images or grids that squish, stretch, or leave awkward gaps.
- A nav that becomes unusable on mobile.
- Whitespace that collapses or balloons.

Give me a prioritized list of issues, worst first, each with the breakpoint, what happens, and the exact CSS fix. Then apply the fixes and tell me what to re-check.`,
    proTip: 'If you have Playwright wired up, ask it to screenshot each breakpoint so it audits from the actual render, not from reading CSS.',
  },
  {
    id: 'color-system-from-scratch',
    category: 'design',
    title: 'Build A Color System',
    whenToUse: 'You have a vibe in mind but need a real, usable palette with tokens.',
    text: `Design a complete color system for [brand/project]. The feeling I am going for is [e.g. warm, trustworthy, premium, faith-rooted, energetic].

Deliver:
1. A core palette: one base (background), one ink (text), and one accent. Give hex values and the reasoning for each.
2. A full neutral ramp from lightest to darkest (at least 6 steps) for surfaces, borders, and muted text.
3. Semantic colors: success, warning, error, info, each chosen to sit in harmony with the palette, not off-the-shelf red and green.
4. Accessible pairings: for every text-on-background combination I will actually use, give the contrast ratio and confirm it passes WCAG AA.
5. A dark mode version of the whole system that keeps the same personality.
6. The whole thing as CSS custom properties (design tokens) I can paste in.

Avoid the default AI palette. Give me something with a point of view, and tell me the one combination you would use for the primary CTA.`,
    proTip: 'Ask it to name each color something memorable. Named tokens are easier to reason about than hex codes.',
  },
  {
    id: 'redesign-elevate',
    category: 'design',
    title: 'Elevate An Existing Design',
    whenToUse: 'You have a working but mediocre design and want it to look considered and premium.',
    text: `Here is my current [page/screen] (screenshot or code attached). It works but it looks amateur. Elevate it to look like it was designed by someone with taste, without changing the core content or structure.

Diagnose first: give me the five specific things dragging the quality down right now (be blunt, this is where growth is). Common culprits: inconsistent spacing, too many font sizes, weak hierarchy, muddy color, cramped or bloated whitespace, default shadows, no rhythm.

Then fix them:
- Establish a consistent spacing scale and apply it.
- Cut the type system down to a clear hierarchy with real contrast.
- Tighten the color to a disciplined palette.
- Add intentional depth (considered shadows or borders, not defaults).
- Improve alignment and rhythm so the eye flows.

Show me the before-and-after reasoning, then deliver the improved code. Keep every piece of content that was there.`,
    proTip: 'The "give me the five things dragging quality down" step is worth running on its own. It teaches you to see.',
  },
  {
    id: 'microinteractions-polish',
    category: 'design',
    title: 'Add The Polish Layer',
    whenToUse: 'The design is right and you want the micro-interactions that make it feel expensive.',
    text: `The design of this [app/page] is solid. Now add the polish layer that separates a good build from a premium one. Go through the interface and add tasteful micro-interactions.

Cover:
- Buttons: hover, active, focus, and disabled states that feel responsive.
- Transitions: smooth state changes, no hard jumps. Right easing and duration (usually 150 to 300ms, ease-out).
- Loading: skeletons or subtle spinners instead of blank flashes.
- Feedback: what happens on success and error (toast, checkmark, gentle shake).
- Scroll: subtle fade or rise as sections enter view, staggered where it helps.
- Empty states: make them feel designed, not broken.

Rules: nothing gaudy, everything fast, always respect prefers-reduced-motion. Motion should confirm actions and guide attention, never show off.

List each interaction you are adding and where, then implement them. Tell me the one that will make the biggest difference to perceived quality.`,
    proTip: 'Perceived speed beats real speed. Optimistic UI and skeletons make an app feel faster than shaving milliseconds.',
  },

  // ------------------------------------------------------------------
  // WRITE
  // ------------------------------------------------------------------
  {
    id: 'hero-copy-converts',
    category: 'write',
    title: 'Hero Copy That Converts',
    whenToUse: 'You need a headline and subhead that make the visitor get it and want it in three seconds.',
    text: `Write hero copy for [product], which helps [audience] achieve [outcome] by [how it works]. The current pain they feel is [pain].

Give me 8 headline options across these angles:
- The outcome (what they get).
- The pain removed (what stops hurting).
- The bold claim (a confident promise).
- The specific number (a concrete result).
- The identity (who they become).

Headlines must be under 9 words, concrete, and free of jargon and hype words like "revolutionary" or "seamless."

For the two strongest headlines, write a matching subhead (one sentence, states the mechanism or the proof) and a CTA button label (2 to 4 words, action and value, not "Submit" or "Learn More").

Then tell me which single combination you would ship first and the one you would test against it, and why.`,
    proTip: 'Feed it a real customer quote or a support ticket. The best headlines are usually the customer words, tightened.',
  },
  {
    id: 'email-in-my-voice',
    category: 'write',
    title: 'Email In My Voice',
    whenToUse: 'You need to send something that sounds like you, not like a template.',
    text: `Write an email from me. First, learn my voice from these samples of things I have actually written: [paste 2 or 3 short emails or messages you wrote].

Now write an email to [recipient] about [purpose]. The outcome I want is [what should happen after they read it].

Voice rules from my samples: match my sentence length, my level of formality, my warmth, and my directness. If I write short, keep it short. Do not add corporate throat-clearing like "I hope this email finds you well" unless I use it.

Structure: a subject line that earns the open, a first line that gets to the point, the ask stated clearly, and a close that makes the next step obvious.

Give me the email, then one alternate subject line and one shorter version in case I want to trim it. No em dashes.`,
    proTip: 'Keep a note with 3 of your best real messages. Paste them any time you want Claude to sound like you.',
  },
  {
    id: 'cold-outreach-that-lands',
    category: 'write',
    title: 'Cold Outreach That Lands',
    whenToUse: 'You are reaching out to someone who does not know you and every word has to earn the reply.',
    text: `Write a cold outreach message to [name, role, company]. I want [the specific outcome, e.g. a 15-minute call]. What I offer them: [value]. Why them specifically: [the genuine reason you picked them].

Rules for something that actually gets a reply:
- Open with them, not me. A specific, true observation about their work or company that proves I did my homework.
- One clear reason this is relevant to them right now.
- One sentence on the value, framed as their outcome, not my features.
- A tiny, low-friction ask. Easy to say yes to.
- Under 90 words total. Short enough to read on a phone.
- No flattery that could apply to anyone, no "I hope you are well," no walls of text.

Give me the message plus a one-line subject or opener for DM versus email. Then give me a single follow-up to send if they do not reply in 4 days.`,
    proTip: 'The opening line is 80% of the result. If it could be sent to 100 people unchanged, rewrite it.',
  },
  {
    id: 'about-page-story',
    category: 'write',
    title: 'About Page With A Pulse',
    whenToUse: 'Your story sounds like a resume and you want it to actually connect.',
    text: `Write an About page for [me/my company]. Right now the raw material is: [who you are, why you started this, what you believe, who you serve, what makes you different].

Do not write a resume or a wall of "we are passionate about" filler. Write something a real person would want to read.

Structure:
1. Open with a moment or a truth, not "Founded in 2024." Earn attention in the first two lines.
2. The why: the real reason this exists, the problem that would not leave you alone.
3. The belief: the point of view that makes us different from everyone in this space.
4. The who: who we serve and what we want for them.
5. A human close that invites the reader in.

Voice: warm, confident, specific. Concrete details over adjectives. Show, do not claim. No hype, no em dashes.

Give me the full page, then a shorter 80-word version for a footer or bio.`,
    proTip: 'Give it the messy true version of your story. Specific and slightly imperfect beats polished and generic every time.',
  },
  {
    id: 'sales-page-long-form',
    category: 'write',
    title: 'Long-Form Sales Page',
    whenToUse: 'You are selling something that needs the full argument, not just a headline.',
    text: `Write a long-form sales page for [offer], priced at [price], for [audience]. Their core problem is [problem], and after buying they [transformation].

Build the full argument in this order:
1. Headline and subhead that name the outcome.
2. The problem, told so the reader feels understood and thinks "that is me."
3. Why the usual solutions fail them (without trashing anyone).
4. The turn: introduce the offer as the bridge from problem to outcome.
5. How it works, in 3 to 5 concrete steps or components.
6. Proof: where to place testimonials, results, or credibility (mark these with brackets for me to fill).
7. What is included, as clear value, with the outcome of each piece.
8. Objection handling: name the top 4 objections and answer each honestly.
9. The offer and price, framed against the cost of staying stuck.
10. A guarantee or risk-reducer.
11. Close and CTA, then a short FAQ.

Voice: direct, confident, specific, zero hype words. Sell the transformation, not the features. No em dashes.`,
    proTip: 'Ask it to write the objection section first. If it cannot answer the objections, the offer is not ready.',
  },
  {
    id: 'social-hook-machine',
    category: 'write',
    title: 'Social Hook Machine',
    whenToUse: 'You have something to say and need first lines that stop the scroll.',
    text: `I want to post about [topic/insight/story]. The core point I am making is [the one takeaway]. My audience is [who] and I want them to [feel/do what].

Give me 12 opening hooks that would stop the scroll, across these types:
- The contrarian take (challenges a common belief).
- The specific result (a number or outcome).
- The confession (something honest and slightly vulnerable).
- The "here is how" (a promise of a method).
- The pattern interrupt (an unexpected first line).
- The stakes ("if you do X, read this").

Each hook is one line, under 15 words, no clickbait that the post cannot pay off. Then take the two strongest hooks and write the full post for each, in my voice ([paste a sample post]), formatted for [X / LinkedIn / Instagram] with line breaks that are easy to read on mobile.

End each with a soft, natural call to engage. No hashtags unless I ask.`,
    proTip: 'Write the post, then delete the first line. The second line is usually the real hook.',
  },
  {
    id: 'rewrite-tighter',
    category: 'write',
    title: 'Cut It In Half',
    whenToUse: 'Your writing is flabby and you want the same meaning in far fewer words.',
    text: `Tighten this writing without losing meaning or voice. Here it is: [paste text].

Do three passes:
1. Cut the fat: remove filler words, redundant phrases, throat-clearing, and anything that does not earn its place. Aim to cut at least 30% of the word count.
2. Strengthen the verbs: replace weak verb-plus-adverb combos and "there is / there are" constructions with strong single verbs. Turn passive voice active.
3. Sharpen the flow: vary sentence length, front-load the important words, and make sure every sentence pulls the reader to the next.

Keep my voice and tone. Do not make it robotic or corporate. Do not add new claims.

Give me the tightened version, the word count before and after, and a short list of the three changes that did the most work, so I learn the pattern. No em dashes.`,
    proTip: 'Run this on your own bio and homepage. Most sites are 40% longer than they need to be.',
  },

  // ------------------------------------------------------------------
  // THINK
  // ------------------------------------------------------------------
  {
    id: 'pressure-test-skeptic',
    category: 'think',
    title: 'Pressure-Test As A Skeptic',
    whenToUse: 'You are excited about an idea and need someone to try to break it before the market does.',
    text: `Be a sharp, fair skeptic. I have an idea and I want you to try to break it, not to encourage me. Here it is: [describe your idea, who it is for, and how it makes money].

Do not soften your feedback. Assume I can handle the truth and would rather hear it now than lose six months.

Attack it on:
1. Demand: is this a real, painful, frequent problem, or a vitamin nobody urgently needs? What is the evidence either way?
2. Willingness to pay: will the people with this problem actually pay, and enough?
3. Alternatives: what do they use today, including "do nothing," and why is that often good enough?
4. Distribution: how would they ever find this? What is the realistic acquisition path?
5. Moat: what stops a competitor or an incumbent from crushing this in a weekend?
6. Founder fit: what would make me specifically the wrong person to build this?

For each, give a blunt verdict and the single biggest risk. Then tell me the one experiment I could run this week for under $100 to learn whether this is real. End with your honest call: pursue, reshape, or drop.`,
    proTip: 'Ask it to argue the strongest case AGAINST your idea first. If it survives that, then explore how to build it.',
  },
  {
    id: 'weekly-review-synthesis',
    category: 'think',
    title: 'Weekly Review Synthesis',
    whenToUse: 'End of the week, you have a pile of notes and want signal, not a to-do dump.',
    text: `Here is everything from my week: [paste notes, wins, problems, half-thoughts, metrics, whatever you have].

Act as my chief of staff and turn this raw material into clarity. Give me:
1. The through-line: the one theme or story of this week, stated in a sentence.
2. Real wins: what actually moved, and why it mattered (not busywork dressed as progress).
3. What is stuck, and the likely reason it is stuck.
4. The 20% that would drive 80%: the two or three things that, if I focused there, would matter most next week.
5. What I should stop, defer, or delegate, and be specific.
6. One blind spot you notice in how I am spending my attention.
7. My three highest-leverage moves for next week, in priority order, each concrete enough to start.

Be direct. Do not flatter me. If the week was scattered, say so and tell me the pattern behind it.`,
    proTip: 'Keep a running notes file all week and paste the whole thing on Friday. The synthesis is only as good as the raw input.',
  },
  {
    id: 'decision-matrix',
    category: 'think',
    title: 'Decision Matrix',
    whenToUse: 'You are stuck between options and want structure instead of circular worry.',
    text: `Help me decide: [the decision]. My options are [option A, option B, and any others]. What I actually care about here is [your real goals and constraints, e.g. time, money, risk, alignment with the mission].

Do this rigorously:
1. Restate the real decision underneath the surface decision, in case I am solving the wrong problem.
2. Name the 4 to 6 criteria that actually matter for this, and weight each by importance.
3. Score each option against each criterion, with a one-line reason per score. Be honest, not diplomatic.
4. Show the weighted result, but do not let the number decide for me.
5. Then step back: what does the math miss? What would the gut say, and is the gut catching something real here?
6. Give me your recommendation, the strongest argument against it, and the one piece of information that would change your answer.

Do not fence-sit. Commit to a recommendation and own it.`,
    proTip: 'Add "assume I have to decide by end of day" to force it past both-sides hedging into a real call.',
  },
  {
    id: 'one-page-spec',
    category: 'think',
    title: 'Turn Fog Into A Spec',
    whenToUse: 'You have a vague idea in your head and need it crisp enough to build or delegate.',
    text: `I have a fuzzy idea and I need you to interrogate it into a clear one-page spec. The idea: [dump everything you know, even if messy].

First, ask me the 5 most important questions whose answers you are missing, the ones where a wrong assumption would send the build the wrong way. Wait for my answers.

Then produce a one-page spec with:
- Problem: the specific pain, and who has it.
- User: the primary person and their context.
- The one core job: the single thing this must do well.
- Must-haves: the shortest list that makes it real.
- Explicitly out of scope: what we are NOT building in v1 (this is where I lose discipline, so hold the line).
- Success metric: how we know it worked.
- Open questions: what is still unknown and needs a decision.

Keep it to one page. Force choices. If I am trying to cram three products into one, tell me and make me pick.`,
    proTip: 'The "out of scope" section is the most valuable one. A spec is defined as much by what it refuses as what it includes.',
  },
  {
    id: 'positioning-statement',
    category: 'think',
    title: 'Nail The Positioning',
    whenToUse: 'You cannot explain in one sentence why someone should choose you, and it shows.',
    text: `Help me nail the positioning for [product/business]. Here is what I know: it helps [audience] with [problem], and what makes it different is [your hunch about the edge].

Work through the positioning properly:
1. Competitive alternatives: what would my customer use if I did not exist (including doing nothing or hiring a person)?
2. Unique attributes: what can I truly claim that those alternatives cannot?
3. Value: what does each attribute actually deliver to the customer, in outcome terms?
4. Best-fit customer: who cares about that value the most and will pay for it?
5. Market frame: what category or context should I place myself in so my strengths look obvious?

Then give me:
- A one-sentence positioning statement I can build everything on.
- The single sharpest way to say what I do, for a homepage hero.
- The one customer segment I should aim at first, and why narrower wins here.

Push me to be specific. "For everyone" is a position for no one.`,
    proTip: 'If your positioning could describe three of your competitors, it is not positioning yet. Make it uncomfortably specific.',
  },
  {
    id: 'pre-mortem',
    category: 'think',
    title: 'Run A Pre-Mortem',
    whenToUse: 'Before you commit real time or money, imagine it already failed and learn why.',
    text: `Run a pre-mortem on [the plan/launch/project]. Here is the plan: [describe it, the goal, timeline, and what you are betting].

Imagine it is [timeframe] from now and this failed badly. Do not be gentle. Tell the story of how it went wrong.

Give me:
1. The 6 most likely failure modes, ranked by probability times damage. For each: what happened, the early warning sign I would have seen, and the root cause.
2. The silent killer: the risk I am probably underweighting because it is uncomfortable to look at.
3. The assumptions this whole plan rests on. Which one, if wrong, sinks everything?
4. For each of the top 3 risks: a specific, cheap thing I can do now to prevent it or catch it early.
5. A single leading indicator I should watch to know if we are drifting toward failure.

End with your honest read: is this plan sound with a few guardrails, or does one of these risks mean I should reshape it before starting?`,
    proTip: 'Do this the day before you start, not the day after it breaks. A pre-mortem costs an hour and can save a quarter.',
  },
  {
    id: 'explain-like-i-build',
    category: 'think',
    title: 'Explain So I Can Decide',
    whenToUse: 'You need to understand a technical or strategic concept well enough to make a real call, not to pass a quiz.',
    text: `Explain [concept/technology/choice] to me. I am a capable builder but not an expert here, and I need to understand it well enough to make a real decision about [the decision you face].

Structure it for decisions, not trivia:
1. The one-sentence version: what it is, in plain language.
2. The mental model: an analogy or picture that makes it click.
3. Why it exists: the problem it solves and what people did before it.
4. When to use it and when NOT to. This is the part I actually need.
5. The tradeoffs: what I give up by choosing it, honestly.
6. The two or three things beginners get wrong or regret.
7. For my specific situation of [your context], your recommendation and why.

Skip the history lecture and the jargon. If you use a technical term, define it in the same breath. Then check my understanding by telling me the one thing I should remember if I forget everything else.`,
    proTip: 'End with "now quiz me with 3 questions to check I actually get it." Understanding you can act on beats understanding you can nod at.',
  },

  // ------------------------------------------------------------------
  // AUTOMATE
  // ------------------------------------------------------------------
  {
    id: 'recurring-report',
    category: 'automate',
    title: 'Automate A Recurring Report',
    whenToUse: 'You rebuild the same report every week or month and want it to build itself.',
    text: `I make [the report, e.g. a weekly sales summary] by hand every [cadence]. Automate it. The inputs live in [source: a spreadsheet, an API, a CSV, a database]. The output should be [format: a formatted summary, an email draft, a dashboard].

Do this:
1. Ask me any question you need about the data shape and where it lives, then wait.
2. Write a script that pulls the data, computes the numbers I care about ([list the metrics]), and compares them to the prior period so I see the change, not just the value.
3. Format the output the way a human wants to read it: the headline number first, what moved and why it might have, then the detail. Not a raw table dump.
4. Flag anything unusual automatically (a metric off its normal range) so I do not have to eyeball it.
5. Make it runnable with one command, and tell me exactly how to schedule it to run automatically on [cadence].

Handle missing or malformed data gracefully instead of crashing. Comment the parts I would need to tweak later.`,
    proTip: 'Once the script works, ask Claude to turn it into a scheduled cloud routine so it runs without your laptop even being on.',
  },
  {
    id: 'claude-md-starter',
    category: 'automate',
    title: 'Write My CLAUDE.md',
    whenToUse: 'You want Claude Code to stop re-learning your project every session and just know it.',
    text: `Explore this project and write me a CLAUDE.md file so that any future session starts already understanding it. Read the package files, the folder structure, the config, and a few key source files first.

The file should be tight and high-signal, not a novel. Include:
1. What this project is, in two lines, and who it is for.
2. The stack and the why behind any non-obvious choice.
3. How to run it: install, dev, build, test, deploy, as exact commands.
4. The architecture: the main folders and what lives where, and the data flow in a sentence or two.
5. Conventions this codebase follows: naming, file organization, patterns to match, and things to never do here.
6. Gotchas: the traps that would waste a new session's time (env quirks, a fragile area, a service that needs setup).
7. Definition of done: what "finished" means here (tests pass, build clean, etc.).

Write it so a smart engineer who has never seen this repo could be productive in five minutes. Keep it current, factual, and free of fluff. Then tell me where to put it.`,
    proTip: 'Re-run this every few months. A stale CLAUDE.md quietly misleads every session until you refresh it.',
  },
  {
    id: 'custom-skill-builder',
    category: 'automate',
    title: 'Package A Repeatable Task',
    whenToUse: 'You keep giving Claude the same kind of task and want a reusable, one-word trigger for it.',
    text: `I do this task repeatedly: [describe the task you keep asking for, e.g. "turn a raw idea into a launch checklist" or "audit a page for accessibility"]. Help me package it into a reusable skill so I can trigger it with one command instead of re-explaining every time.

First, interview me: ask what the ideal input looks like, what the ideal output looks like, and the quality bar it must hit. Wait for my answers.

Then write a skill definition that:
1. Names the skill and describes clearly when it should fire (so it triggers on the right requests and not the wrong ones).
2. Lays out the exact steps the skill runs, in order.
3. Bakes in my quality standards so I do not have to restate them.
4. Specifies the output format every time.
5. Handles the common variations of this task.

Give me the full skill file and tell me exactly where to save it so Claude Code picks it up. Then show me one example run so I can see it work.`,
    proTip: 'Anything you have prompted more than three times should be a skill. Your best prompts become permanent capabilities.',
  },
  {
    id: 'inbox-triage-workflow',
    category: 'automate',
    title: 'Inbox Triage Assistant',
    whenToUse: 'Your inbox eats your mornings and you want it sorted and drafted before you sit down.',
    text: `Design a repeatable workflow that triages my inbox and drafts my replies so I only spend time on the parts that need me. Assume you can read my recent unread email [via my connected email, or from a pasted export].

The workflow should:
1. Sort everything into four buckets: needs a real reply from me, quick yes/no I can approve, informational (no reply needed), and noise (unsubscribe or ignore).
2. For each "needs a reply," summarize the ask in one line and draft a reply in my voice ([paste a sample of how I write]). Never send, only draft. I approve everything.
3. Flag anything time-sensitive or high-stakes at the top so I see it first.
4. Note anything that is actually a task in disguise, so I can add it to my list.
5. Give me a two-minute morning digest: what needs me, what is drafted and waiting, and what I can ignore.

Write this as a workflow I can run every morning with one command, and tell me how to set it up. Confirm the rule: draft everything, send nothing without my explicit go.`,
    proTip: 'The "draft, never send" guardrail is the whole game. Automation earns trust by asking before it acts on your behalf.',
  },
  {
    id: 'data-cleanup-script',
    category: 'automate',
    title: 'Clean This Messy Data',
    whenToUse: 'You have a spreadsheet or export that is a mess and cleaning it by hand would take hours.',
    text: `I have messy data I need cleaned and I do not want to do it by hand. Here is a sample of it: [paste 10 to 20 rows or attach the file]. The end goal is [what you need the clean data for].

First, tell me what is wrong with it: the inconsistencies, duplicates, missing values, mixed formats, and anything that would break downstream. Show me a few example problem rows.

Then write a script that:
1. Standardizes formats (dates, phone numbers, casing, whitespace, etc.).
2. De-duplicates intelligently, and tells me its rule for what counts as a duplicate so I can confirm.
3. Handles missing values sensibly (and flags rows it could not fix rather than guessing wildly).
4. Validates the output against the rules I care about ([e.g. every row must have a valid email]).
5. Outputs clean data plus a short report: how many rows in, how many out, what it changed, and what it flagged for me to review by hand.

Never silently drop data. Anything it cannot confidently fix goes in a "review these" pile. Make it re-runnable on the full file.`,
    proTip: 'Always ask for the "what it changed and what it flagged" report. Trust automation you can audit, not automation you have to hope about.',
  },
  {
    id: 'scrape-to-structured',
    category: 'automate',
    title: 'Web Page To Structured Data',
    whenToUse: 'The information you need is scattered across a page and you want it as clean rows.',
    text: `I need structured data from [URL or a set of similar pages]. The information I want out of each is: [list the fields, e.g. name, price, description, category, link].

Do this:
1. Look at the page and confirm the exact fields you can reliably extract, and warn me about any that are inconsistent or missing on some entries.
2. Define the output schema clearly (field names and types) and show it to me.
3. Extract the data into that structure. Give it to me as [JSON / CSV], clean and ready to use.
4. Note any entries where a field was missing or ambiguous, rather than inventing a value. Empty is honest, made-up is dangerous.
5. If this needs to run across many similar pages, write it so I can point it at a list of URLs and get one combined dataset.

Do not hallucinate values that are not on the page. If something is not there, mark it null and tell me. At the end, give me a count of how many records you pulled and how many had gaps.`,
    proTip: 'For anything you will scrape more than once, ask it to save the extraction logic so next month is a one-liner, not a redo.',
  },
  {
    id: 'batch-content-engine',
    category: 'automate',
    title: 'Batch Content Engine',
    whenToUse: 'You need to produce many variations of one content type (posts, product descriptions, emails) without it going generic.',
    text: `I need to produce [quantity] of [content type, e.g. product descriptions / social posts / listing blurbs] and I want them consistent in quality and voice, not copy-paste generic. Here is the source data: [paste the list, e.g. product names and key facts].

Set this up as a repeatable engine:
1. First, nail the template by writing ONE example to a high bar, using [item 1]. Show it to me and let me refine the voice and structure until it is right.
2. Once I approve the template, generate the rest, each genuinely tailored to its item, not the same sentences with the noun swapped. Vary the openings and structure so a reader scanning several does not feel the pattern.
3. Keep my voice ([paste a sample]) and my constraints ([length, tone, must-include, must-avoid]) consistent across all of them.
4. Output them in a clean, usable format ([a table, or ready-to-paste blocks]) labeled by item.
5. Flag any item where the source data was too thin to write something good, instead of padding it with filler.

Get the first one right with me before batching. Quality of the template sets the ceiling for all of them.`,
    proTip: 'Perfect one example together, then batch. Approving the template once beats fixing fifty outputs later.',
  },

  // ------------------------------------------------------------------
  // DEBUG
  // ------------------------------------------------------------------
  {
    id: 'debug-from-screenshot',
    category: 'debug',
    title: 'Debug From A Screenshot',
    whenToUse: 'Something looks wrong on screen and it is faster to show it than describe it.',
    text: `Here is a screenshot of what is going wrong: [attach it]. What I expected to see instead: [describe]. This is on [page/screen] after [the action you took].

Work it like a diagnosis, not a guess:
1. Describe exactly what you see wrong in the screenshot, precisely.
2. List the 3 to 4 most likely causes, ranked by probability, with your reasoning for each.
3. Tell me what to check first to confirm or rule out the top suspect (a specific file, a console log, an element).
4. Once we know the cause, propose the fix and explain why it addresses the root cause and not just the symptom.
5. Implement it, then tell me the exact steps to verify it is actually fixed, including any edge case this class of bug tends to hide.

Do not shotgun random changes hoping one sticks. Find the cause first, then fix once. If you are unsure, tell me what evidence would make you sure.`,
    proTip: 'Include the browser console screenshot too. The error text there usually points straight at the cause.',
  },
  {
    id: 'performance-pass',
    category: 'debug',
    title: 'Performance Pass',
    whenToUse: 'The app feels slow and you want to find and fix what actually matters, not micro-optimize noise.',
    text: `This [app/page] feels slow. Do a real performance pass. Do not micro-optimize things that do not matter, find the actual bottlenecks.

Step 1: Measure and diagnose. Identify the biggest performance costs here, ranked by impact. Look at the usual heavy hitters: oversized images and assets, render-blocking resources, unnecessary re-renders, waterfalls of sequential requests that could be parallel, large bundles, N+1 database queries, missing caching, and work done on every render that could be memoized or moved.

Step 2: Show me the top 5 issues, each with: what it is, roughly how much it is costing, and how confident you are that it matters.

Step 3: Fix them in order of impact-to-effort. For each fix, explain what you changed and the expected gain. Do not break functionality to shave milliseconds.

Step 4: Tell me how to verify the improvement (what to measure before and after) so this is not vibes. If you would need a profiler or Lighthouse run to be sure, say so and tell me what to run.

Prioritize the changes a user would actually feel over numbers that only look good on a chart.`,
    proTip: 'Ask for the impact-to-effort ranking first. One image fix often beats ten clever code tweaks.',
  },
  {
    id: 'refactor-safely',
    category: 'debug',
    title: 'Refactor Without Breaking It',
    whenToUse: 'A piece of code has grown ugly and you want it clean without changing behavior.',
    text: `This code has gotten messy and I want to refactor it, but it works and I cannot afford to break it. Here it is: [paste code or point to the file].

Refactor safely:
1. First, tell me in plain language what this code does now, so we both agree on the behavior we must preserve.
2. Identify the specific problems: duplication, unclear names, functions doing too much, tangled state, poor separation. Rank them.
3. Propose the refactor as a series of small, safe steps, each one preserving behavior, rather than one big rewrite. Explain the order.
4. Point out any behavior that is subtle or easy to accidentally change, and how you will protect it.
5. If there are no tests around this, tell me the handful of tests worth adding first as a safety net before we touch it.

Then do the refactor. The external behavior must be identical when you are done. Show me a clear before-and-after for the trickiest part and tell me exactly what to test to confirm nothing changed.`,
    proTip: 'Add the safety-net tests before refactoring, not after. Tests written first prove you did not change behavior.',
  },
  {
    id: 'root-cause-not-symptom',
    category: 'debug',
    title: 'Find The Root Cause',
    whenToUse: 'A bug keeps coming back or the obvious fix feels like a band-aid.',
    text: `I have a bug and I suspect the obvious fix is just hiding it. Here is what is happening: [describe the bug, when it appears, and what you have tried]. Here is the relevant code: [paste or point to it].

Do not patch the symptom. Find the root cause using the five-whys:
1. State the surface symptom precisely.
2. Ask "why does that happen" and answer it from the code, not a guess.
3. Keep going, why, why, why, until you reach the actual root cause, the thing that if fixed makes this whole class of bug impossible.
4. Show me the chain so I can follow the reasoning.
5. Distinguish the root cause from the trigger. The trigger is what set it off this time. The root cause is why the system was fragile enough to break.

Then fix the root cause, and tell me whether the symptom fix is still worth keeping as a guard. Finally, tell me if this same root cause is probably causing other bugs elsewhere in the code, so we can catch them now.`,
    proTip: 'If the fix does not make you say "oh, that is why," you probably found the trigger, not the root cause. Keep asking why.',
  },
  {
    id: 'error-message-decode',
    category: 'debug',
    title: 'Decode This Error',
    whenToUse: 'You hit a cryptic error message and want to understand it, not just make it disappear.',
    text: `I got this error and I do not fully understand it: [paste the full error message and stack trace]. It happened when [what you were doing]. Here is the relevant code: [paste it].

Help me actually understand it, do not just hand me a fix to paste blindly:
1. Translate the error into plain English: what is the code trying to do and what went wrong at that exact spot?
2. Read the stack trace and tell me which line is the real origin (often not the top line) and how you know.
3. Give me the 2 or 3 most likely causes in this specific context, ranked.
4. Tell me the fix, and explain why it works so I learn the pattern and can fix the next one myself.
5. Tell me if this error is a symptom of something worth checking more broadly (a missing guard, a bad assumption, a config gap).

If the fix is a one-liner but the cause is a habit, name the habit so I stop hitting this class of error.`,
    proTip: 'Paste the whole stack trace, not just the last line. The origin of the error is usually three or four lines down.',
  },
  {
    id: 'test-coverage-gaps',
    category: 'debug',
    title: 'Find The Test Gaps',
    whenToUse: 'You want to know what is actually untested before it bites you in production.',
    text: `I want to know where this code is fragile because it is untested. Here is the feature/module: [paste code or point to files]. Here are the tests I have now: [paste them, or say "none"].

Do a coverage-of-what-matters review, not a chase-100%-line-coverage exercise:
1. List the critical paths through this code, the flows that would hurt most if they broke.
2. For each, tell me whether it is covered, partially covered, or not covered at all.
3. Find the risky gaps: edge cases, error handling, boundary values, empty and null inputs, and the "what if two things happen at once" cases that tests usually miss.
4. Rank the gaps by risk (likelihood of breaking times damage if it does).
5. Write the highest-value tests first, the handful that would catch the most likely real bugs, and explain what each one protects.

Do not write ten trivial tests for the getters. Write the few tests that would actually save me. Tell me which single test, if it existed, would most have prevented a bad production bug.`,
    proTip: 'Ask "what test would have caught the last bug I shipped?" That question finds the gaps that actually matter.',
  },
  {
    id: 'reproduce-then-fix',
    category: 'debug',
    title: 'Reproduce, Then Fix',
    whenToUse: 'An intermittent or hard-to-pin-down bug that you cannot reliably trigger.',
    text: `I have a bug that does not happen every time, which makes it maddening. Here is what I know: [what happens, how often, any pattern you have noticed, and the relevant code].

Do not attempt a fix until we can reproduce it. Work in this order:
1. Form a hypothesis about the conditions that trigger it (timing, state, order of actions, specific data, a race). Rank the hypotheses.
2. Design the smallest reliable way to reproduce it: the exact steps, state, or test that makes it happen on demand. If we cannot reproduce it, we cannot know we fixed it.
3. Add targeted logging or instrumentation to confirm which hypothesis is right, and tell me what to look for in the output.
4. Once we can trigger it reliably and know the cause, fix the root cause.
5. Prove the fix: show that the reproduction steps no longer trigger it, and add a regression test so it can never silently come back.

Resist the urge to guess-and-ship. An intermittent bug you "fixed" without reproducing is a bug you just stopped seeing. Tell me clearly when we have real proof versus when we are still guessing.`,
    proTip: 'The reproduction is 90% of the fix. Once you can trigger it on command, the cause usually becomes obvious.',
  },
];

export const promptCategories: { key: PromptCard['category']; label: string; blurb: string }[] = [
  {
    key: 'build',
    label: 'Build',
    blurb: 'Go from blank folder to a real, deployed thing. Landing pages, features, backends, and shipping.',
  },
  {
    key: 'design',
    label: 'Design',
    blurb: 'Make it look intentional and premium, never generic. Directions, systems, signature moments, and polish.',
  },
  {
    key: 'write',
    label: 'Write',
    blurb: 'Copy that converts and sounds like you. Heroes, emails, outreach, sales pages, and social.',
  },
  {
    key: 'think',
    label: 'Think',
    blurb: 'Use Claude as a sharp thinking partner. Pressure-tests, decisions, specs, positioning, and pre-mortems.',
  },
  {
    key: 'automate',
    label: 'Automate',
    blurb: 'Stop doing the same task twice. Reports, skills, triage, data cleanup, and content engines.',
  },
  {
    key: 'debug',
    label: 'Debug',
    blurb: 'Find the real cause and fix it once. Screenshots, performance, refactors, and root-cause hunting.',
  },
];
