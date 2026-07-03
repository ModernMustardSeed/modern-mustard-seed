// MUSTARD MODE curriculum. Mr. Mustard coaches non-developers and ambitious
// builders to 100x their output with a Claude subscription. Four tracks, seven
// missions each, mission seven is always the boss capstone (300 xp).

export type Mission = {
  id: string;
  title: string;
  minutes: number;
  xp: number;
  lesson: string[];
  prompts: { label: string; text: string }[];
  assignment: string;
  proof: string;
  coachCue: string;
};

export type Track = {
  slug: 'code' | 'design' | 'cowork' | 'ideate';
  name: string;
  tagline: string;
  color: string;
  bossMission: string;
  missions: Mission[];
};

export const tracks: Track[] = [
  {
    slug: 'code',
    name: 'CODE',
    tagline: 'Ship real software',
    color: '#1E50C8',
    bossMission:
      'Take one idea of your own from empty folder to a working web app that anyone can open on a live URL.',
    missions: [
      {
        id: 'code-01-first-session',
        title: 'Install Claude Code and open your first session',
        minutes: 20,
        xp: 50,
        lesson: [
          'Claude Code is a command line tool. It lives in your terminal, it can read and write files in a folder on your computer, and it can run commands the way a developer would. That is the whole trick. You are not typing code, you are directing an agent that types code, runs it, reads the errors, and fixes them. Your job is to be the person who knows what good looks like.',
          'Install it once and you have it everywhere. On Mac open the Terminal app, on Windows open PowerShell or Windows Terminal. Then run the install command from claude.ai/code and sign in with the same account as your Claude subscription. Your Pro or Max plan is what powers it, there is no separate meter to watch on the Max plan, which is exactly why this product exists.',
          'The mental model that saves you weeks: a session is a conversation that has hands. When you start Claude Code inside a folder, everything you say happens in the context of that folder. So the first rule is to always make a fresh, empty folder for a new project and start the session from inside it. Never start in your Documents root or your Desktop, or the agent will wade through ten years of files.',
          'One habit to build today: read what it is about to do before you approve it. Claude Code asks permission before it writes files or runs commands. That pause is your steering wheel. Beginners rubber stamp everything and get lost. Pros glance at each action, and when something looks off they say so in plain English instead of letting it run.',
        ],
        prompts: [
          {
            label: 'Orientation prompt for your very first session',
            text: 'I am brand new to Claude Code and to coding in general. Before we build anything, I want to understand what you can and cannot do in this folder. In plain language, explain: what happens when you write a file, what happens when you run a command, and how I stay in control. Then tell me the three habits that will make our work together go well, written for someone who has never used a terminal. Keep it short and concrete.',
          },
        ],
        assignment:
          'Create a brand new empty folder called mustard-lab, open your terminal inside it, launch Claude Code, and paste the orientation prompt. Then ask it to create a single file called hello.txt containing one sentence about why you are here.',
        proof:
          'The file hello.txt exists inside your mustard-lab folder with your sentence in it, and you approved the write yourself.',
        coachCue:
          'Player one has entered the game. Empty folder, fresh terminal, let us make the machine say hello.',
      },
      {
        id: 'code-02-describe-build-run',
        title: 'The describe, build, run, refine loop',
        minutes: 30,
        xp: 75,
        lesson: [
          'Every real thing you will ever build follows one loop. You describe what you want, Claude builds it, you run it and look at the result, then you refine by describing what is wrong or what is next. The people who ship fast are not smarter, they just run this loop many times a day without drama.',
          'The describe step is where beginners lose the most time, and it is the cheapest to fix. Vague requests get generic results. Instead of asking for a to do list app, describe the specific thing: who uses it, what the one main screen looks like, what happens when they click the primary button, and what you want it built with if you care. If you do not care about the tech, say so and let Claude choose a sensible default.',
          'The run step is non negotiable. Do not judge software by reading its code, judge it by using it. Ask Claude to start the app and give you the exact link to open, then open it and click around like a real user. Half of all bugs only show up when a human actually touches the thing. This is also where you catch the gap between what you meant and what you said.',
          'Refining is a conversation, not a rewrite. When something is wrong, describe the symptom precisely. Say the save button does nothing when I click it, or the header text is too small on my phone. You do not need to know the cause. A good bug report from you is worth more than a guess, because Claude can read the error, but only you can see that the button felt dead.',
          'Keep each loop small. One change, run, look, next change. When you batch ten requests into one message you lose the ability to tell which one broke things. Small loops feel slower for the first hour and then they make you dramatically faster for the rest of your life.',
        ],
        prompts: [
          {
            label: 'A strong first build request',
            text: 'Build me a single page web app called [your idea, for example a daily gratitude journal]. The one main screen should let me [the core action, for example type three things I am grateful for and save them]. When I [primary action] it should [expected result, for example show the entry below with today date]. Store the data so it survives a page refresh. Use a clean, modern look with generous spacing and one warm accent color. Pick sensible modern web tech, I do not have a preference. When it is ready, start it and give me the exact URL to open, then wait for my feedback before changing anything.',
          },
          {
            label: 'The refine message that actually helps',
            text: 'I opened it and tested it. Here is exactly what I saw, symptom by symptom: 1) [what you clicked and what happened or did not happen]. 2) [anything that looked wrong visually]. 3) [anything confusing]. Fix these one at a time, and after each fix restart the app so I can re test. Do not add new features yet, just make what exists work correctly.',
          },
        ],
        assignment:
          'In your mustard-lab folder, use the first build prompt to create one small single page app of your choosing, run it, open it in your browser, and then send one precise refine message based on something you actually noticed while using it.',
        proof:
          'You have a running app open in your browser that changed, correctly, in response to a specific piece of feedback you gave after using it yourself.',
        coachCue:
          'This is the loop that pays your rent forever. Describe, build, run, look, again. Let us spin it.',
      },
      {
        id: 'code-03-claude-md',
        title: 'Give your project a memory with CLAUDE.md',
        minutes: 25,
        xp: 100,
        lesson: [
          'By default every session starts fresh. Claude Code does not remember yesterday. That sounds like a flaw until you learn the fix, which is a plain text file named CLAUDE.md sitting in your project folder. Claude Code reads it automatically at the start of every session. It is your project brain that never sleeps.',
          'Put the durable truths in there. What this project is, who it is for, the tech it uses, the commands to run it, and the rules you keep having to repeat. Every time you find yourself explaining the same thing twice, that thing belongs in CLAUDE.md. It turns a helpful assistant into one that already knows your project cold on day one.',
          'Keep it tight and specific, not a novel. Bullet points beat paragraphs. A good CLAUDE.md might say: this is a booking site for a yoga studio, built with Next.js, run it with npm run dev, always use our brand green for buttons, never invent fake testimonials, and the owner name is spelled Alethea not Althea. Small facts like the correct spelling save you real friction.',
          'Treat it as living. When a decision changes, update the file in the same breath, or it will quietly lie to future you. You can even ask Claude to update its own CLAUDE.md after a big change: tell it what you settled on and have it write the note. A stale project brain is worse than none, because you will trust it.',
        ],
        prompts: [
          {
            label: 'Generate a first CLAUDE.md for your project',
            text: 'Look at everything in this project folder and then write me a CLAUDE.md file that will make future sessions start smart. Include: a one line description of what this is and who it is for, the tech stack you can see, the exact commands to install and run it, and a short Conventions section. For now put these rules in Conventions: [your rules, for example use warm minimal design, no fake data ever, keep copy plain and human]. Keep the whole thing under one screen, use short bullets, and only state things that are actually true about this project.',
          },
        ],
        assignment:
          'Have Claude create a CLAUDE.md for your mustard-lab app, read it yourself, and add two rules by hand that reflect how you want this project handled. Then start a fresh session and confirm it picked up the context without you re explaining.',
        proof:
          'A CLAUDE.md exists in your project, and a new session correctly references a fact from it (like your run command or a design rule) without you telling it again.',
        coachCue:
          'Give the project a brain and it stops asking you the same question twice. Write the memory file.',
      },
      {
        id: 'code-04-plan-mode',
        title: 'Use plan mode before you build anything big',
        minutes: 30,
        xp: 125,
        lesson: [
          'For a one line change you just ask. For anything with moving parts, you plan first. Claude Code has a plan mode where it investigates your project and proposes an approach without touching a single file, and you approve the plan before any building starts. This is the single biggest lever a beginner has for avoiding messy, half working features.',
          'Why it matters: the expensive mistakes are not typos, they are wrong directions built confidently for twenty minutes. Plan mode surfaces the direction while it is still just words. You get to read a numbered plan of what it intends to do, spot the part that does not match your intent, and correct it before it becomes code you have to unwind.',
          'Read the plan like an editor, not a rubber stamp. Look for the step where it assumed something you never said, or where it plans to skip the part you care about most. Then reply in plain language: yes but also handle the logged out case, or simpler please, I do not need accounts yet. A thirty second correction here saves an hour of untangling later.',
          'Reach for plan mode whenever a request touches more than one screen, involves saving or loading data, adds a payment or a login, or changes something that already works. If your gut says this feels like a real feature, that is the tell. For tiny cosmetic tweaks, skip it and just ask directly, planning those would only slow you down.',
        ],
        prompts: [
          {
            label: 'Kick off a planned feature',
            text: 'I want to add [the feature, for example a page where visitors can browse past journal entries by date]. Before writing any code, investigate how the current app is built and give me a plan: what files you would change or add, what the user flow will be step by step, and any decisions you need me to make. Call out anything you are assuming. Do not build anything yet, I want to approve the approach first.',
          },
          {
            label: 'Correct a plan without knowing the code',
            text: 'The plan is mostly right, but change these things: [your corrections in plain English, for example I do not want a separate page, put the history right below the entry form, and keep it to the last seven days for now]. Also, keep it as simple as possible, I would rather have something clean and working than clever. Update the plan and show it to me again before you build.',
          },
        ],
        assignment:
          'Pick one genuine new feature for your mustard-lab app, request it in plan mode, read the plan, send at least one correction in plain English, then approve and let it build.',
        proof:
          'Your app gained a real feature that matches a plan you reviewed and adjusted, not one you accepted blindly.',
        coachCue:
          'Measure twice, cut once, except the tape measure is a paragraph and the wood is free. Plan it first.',
      },
      {
        id: 'code-05-self-verify',
        title: 'Make Claude prove its own work',
        minutes: 35,
        xp: 150,
        lesson: [
          'The difference between a demo that breaks in front of a client and one that just works is verification. Claude Code can check its own work if you insist on it, and the magic word is prove. Do not accept it is done, ask it to show you it is done. This one habit lifts your output quality more than any prompt trick.',
          'There are three levels of proof, and you should ask for them by name. First, run the app and confirm it starts with no errors. Second, exercise the actual feature and report what happened, for example click save and confirm the entry appears and survives a refresh. Third, for anything important, ask it to take a screenshot of the working screen so you both look at the same reality instead of trusting a description.',
          'Tests are the durable version of this. For logic that matters, like a price calculation or a form that must reject bad input, ask Claude to write automated tests and run them, then show you the passing results. You do not need to understand the test code. You need to see that it wrote a check for the behavior you care about and that the check passes. When you later change things, those tests catch what you would have missed.',
          'Learn to spot the fake done. If Claude says it should now work, or this will handle that case, those are predictions, not proof. Push back gently: please actually run it and paste what you saw. Nine times out of ten it will run it, find a small issue it predicted away, and fix it. You are not being difficult, you are being the reason it ships correct.',
          'Build the loop into your instructions so you stop having to nag. Add a line to CLAUDE.md that says after any change, run the app and verify the affected feature before telling me it is done. Now verification is the default, not something you remember to ask for on your good days.',
        ],
        prompts: [
          {
            label: 'Demand real proof, not a prediction',
            text: 'You said it is done. Now prove it to me. Actually run the app, then walk through the exact feature we just built as if you were a user: do the steps, and tell me literally what happened at each one. If anything did not behave as expected, fix it and run it again. Finally, take a screenshot of the working screen so I can see it too. Do not tell me it should work, show me that it does.',
          },
          {
            label: 'Add a verification rule to your project brain',
            text: 'Update our CLAUDE.md to add a Verification rule: after any change that affects how the app behaves, you must start the app, exercise the specific feature that changed, and confirm it works before reporting back to me. For important logic, write and run an automated test and show me the passing result. Never describe something as working based on prediction, only based on having run it.',
          },
        ],
        assignment:
          'Take a feature in your app that you were told works, demand real proof using the first prompt, and then add the verification rule to your CLAUDE.md so it becomes automatic.',
        proof:
          'You have a screenshot or a run log showing your feature genuinely working, and a Verification rule now lives in your CLAUDE.md.',
        coachCue:
          'Trust is nice, receipts are better. Make it show you the screen, not sell you the story.',
      },
      {
        id: 'code-06-ship-to-vercel',
        title: 'Ship it live so anyone can open it',
        minutes: 40,
        xp: 175,
        lesson: [
          'An app on your laptop helps no one. Shipping means putting it on the internet at a real URL you can text to a friend. The good news is that Claude Code can do the whole deploy for you, and modern hosting for a simple site is free to start. The scary part is only scary until the first time.',
          'Vercel is the smoothest path for the kind of web apps you are building. The flow is: your project lives in a folder, that folder gets connected to a Vercel account, and every time you deploy, your app goes live at a URL in under a minute. Ask Claude Code to walk you through connecting Vercel and deploying, and to handle the command line parts while you handle the browser clicks like logging in.',
          'You will hit a fork about environment variables, which are just secret settings like a password or an API key that should not be written into your code. If your app uses any, Vercel needs its own copy of them. When a deployed app works locally but breaks live, a missing environment variable is the number one cause. Ask Claude to list exactly which ones your app needs so you can add them in the Vercel dashboard.',
          'Once you are live, test the live version, not the local one, because they can differ. Open the real URL on your phone, on a friend device, in a fresh browser where you are not logged in. The logged out, first time visitor view is the one that catches the embarrassing bugs. Then, and only then, share the link. Shipping is a habit, and the first time is the only genuinely hard one.',
        ],
        prompts: [
          {
            label: 'Deploy this app to a live URL',
            text: 'I want to put this app on the internet at a real URL so anyone can open it. Walk me through deploying it to Vercel step by step. You handle the terminal commands, and tell me clearly whenever I need to do something in my browser, like sign in or click a button, spelling out exactly what to click. Before we deploy, check whether this app needs any environment variables or secrets, and if so list them so I can add them. When it is live, give me the URL and then confirm the live version actually works.',
          },
        ],
        assignment:
          'Deploy your mustard-lab app to a live Vercel URL, add any needed environment variables, then open the live link on your phone and confirm it works as a first time visitor.',
        proof:
          'You can text someone a public URL and they can open and use your app, and you verified it on a device that is not your development machine.',
        coachCue:
          'Local is a rehearsal. Live is the show. Push it to a URL and let the world click it.',
      },
      {
        id: 'code-07-boss-ship-your-app',
        title: 'BOSS: Ship a real app of your own, live',
        minutes: 60,
        xp: 300,
        lesson: [
          'This is the run that turns a student into a builder. You are going to take one idea that is actually yours, something you would use or show off, and carry it through the entire loop you have learned: describe it well, plan the real parts, build in small loops, make Claude prove each piece, and ship it to a live URL. No training wheels app this time. Your idea.',
          'Pick something small enough to finish and real enough to matter. A landing page for your business with a working contact form. A simple tool that does one useful calculation. A personal dashboard. The trap is picking something huge, so deliberately choose the smallest version that would still make you proud to share. You can always grow it later, and you will build faster the second time.',
          'Run the full playbook on purpose. Start the session in a clean folder. Write a real CLAUDE.md before you build so the project starts smart. Use plan mode for anything with moving parts. After every meaningful change, make it run the app and prove the feature works. When the core is solid, deploy to Vercel and test the live version as a stranger would.',
          'Your finish line is not it works on my laptop, it is here is the link. When you can send a working URL to one other human and they can use the thing you imagined, you have crossed over. You now own a repeatable power that most people think requires years of training. It required one weekend and this loop.',
        ],
        prompts: [
          {
            label: 'Boss mission kickoff',
            text: 'I am building a real app of my own and I want to run our full process end to end. Here is my idea: [describe your idea in a few sentences: what it is, who it is for, and the one main thing a user does with it]. Start by writing a CLAUDE.md for this project. Then propose a plan for the smallest version that would be genuinely useful and shippable, and call out any decisions you need from me. Do not build until I approve the plan. Once we build, verify every feature by actually running the app, and when the core works, help me deploy it live to a URL.',
          },
          {
            label: 'Pre ship checklist for your own app',
            text: 'Before I call this done and share it, run a final check as if you were a skeptical first time visitor. Start the live app, and go through every main action a real user would take. For each one, tell me what happened. Check it on a small phone sized screen too. List anything broken, confusing, or unpolished, ordered by how much it matters, then fix the blockers. I want to share a link I am proud of.',
          },
        ],
        assignment:
          'Build and ship one app that is entirely your own idea, running the full process from a fresh folder and CLAUDE.md through plan mode, verification, and a live deploy, then send the URL to at least one real person.',
        proof:
          'A live, public URL to an app you conceived, that a real person opened and used, built by you directing Claude Code through the complete loop.',
        coachCue:
          'Final boss. Your idea, your URL, your name on it. Let us put something real into the world.',
      },
    ],
  },
  {
    slug: 'design',
    name: 'DESIGN',
    tagline: 'Design like a studio',
    color: '#E0301E',
    bossMission:
      'Take one real page that looks generic and rebuild it into something you would proudly put in a portfolio.',
    missions: [
      {
        id: 'design-01-the-brief',
        title: 'Write a brief that kills the generic AI look',
        minutes: 25,
        xp: 50,
        lesson: [
          'There is a reason so much AI made design looks the same: purple gradients, a rounded everything, a hero with a vague headline, three feature cards, the end. It is what you get when the request is make me a nice landing page. Generic in, generic out. The fix is not a magic prompt, it is a real brief, and writing one takes five minutes.',
          'A brief answers four questions before any pixels exist. Who is this for and what do they feel when they arrive. What is the one action we want them to take. What is the personality, named with adjectives and a reference or two, like editorial and calm as a high end magazine, not techy and loud. And what to avoid, because naming the cliches you hate steers away from them hard.',
          'References are your secret weapon and you do not need design words to use them. Point at things: I want it to feel like the Aesop skincare site, quiet and confident with lots of white space, not like a typical software startup. Claude knows those reference points. Two good references communicate more than a paragraph of adjectives, and they anchor the whole thing to a level of taste instead of an average.',
          'Give the brief, then ask for the thinking before the building. Have Claude restate the direction it heard and describe the design decisions it will make, the mood, the type feeling, the color story, the one memorable moment. If its description already sounds generic, you caught it at the cheapest possible moment, before a single screen was built.',
        ],
        prompts: [
          {
            label: 'The anti generic design brief',
            text: 'Before you design anything, here is my brief. Audience: [who they are and how they should feel arriving]. Goal: the one action I want is [primary action]. Personality: it should feel [three or four adjectives], in the spirit of [one or two reference sites or brands you admire], and absolutely not like [the cliche you want to avoid, for example a generic purple gradient AI startup]. Now, do not build yet. Tell me back the direction you heard, and describe the specific choices you will make: the overall mood, the type feeling, the color story, and the one moment that will make this memorable. If any of it sounds generic, push yourself to something with more taste and point of view.',
          },
        ],
        assignment:
          'Choose a page you want to design (real or practice), write the four part brief with at least two references, and get Claude to describe its direction in words before building anything.',
        proof:
          'You have a written design direction from Claude that names a specific mood, type feeling, and color story, and it does not read like generic AI filler.',
        coachCue:
          'Generic in, generic out. Feed it taste and references, and watch the purple gradients die.',
      },
      {
        id: 'design-02-tokens-three-directions',
        title: 'Design tokens and three directions before you commit',
        minutes: 30,
        xp: 75,
        lesson: [
          'Great design starts with a small set of decisions that everything else obeys. Designers call them tokens: the two typefaces, the color palette, the spacing rhythm, the corner style. Lock these first and the whole thing feels intentional. Skip them and you get a page where nothing quite agrees with anything, which is the real reason amateur work feels off even when you cannot say why.',
          'Type is where you win or lose fastest. Pairing a characterful heading font with a clean, readable body font instantly reads as designed rather than default. Ask Claude to propose a few pairings with a reason for each, and to avoid the overused defaults. A palette works the same way: one strong brand color, one deep neutral for text, warm off whites instead of pure white, and one accent used sparingly. Restraint reads as confidence.',
          'Never accept the first look. The most valuable habit in this entire track is asking for three distinct directions before you commit to one. Not three shades of the same idea, three genuinely different personalities: maybe one warm and editorial, one bold and graphic, one quiet and minimal. Seeing them side by side teaches your own eye what you actually want, which you often do not know until you see the alternatives.',
          'Then choose and commit, out loud. Say I want direction two, but steal the type scale from direction three. Now Claude builds one coherent system instead of averaging everything into mush. This explore then commit rhythm is exactly how real studios work, and it is available to you for the cost of one clear sentence.',
        ],
        prompts: [
          {
            label: 'Three directions with real tokens',
            text: 'Give me three distinct design directions for [the page or app], each with a genuinely different personality, not three versions of the same idea. For each direction, specify: a font pairing (a heading font and a body font) with one sentence on why, a color palette (brand color, text color, background, and one accent) written as actual color values, the corner and spacing feel, and the one signature detail that gives it character. Avoid overused default fonts and generic startup palettes. Present them side by side so I can compare, and do not build full pages yet.',
          },
          {
            label: 'Commit and merge the best parts',
            text: 'I choose direction [number] as the base. But bring in [the specific thing you liked from another direction, for example the type pairing from direction three, or the accent color from direction one]. Lock this as our design system: define the two fonts, the exact palette, the spacing scale, and the corner style, and put them somewhere reusable so every screen we build stays consistent. From now on, everything should obey this system unless I say otherwise.',
          },
        ],
        assignment:
          'Ask Claude for three distinct design directions with real tokens, compare them, then commit to one (optionally merging a piece from another) and have it locked as a reusable system.',
        proof:
          'You have a single committed design system (two fonts, a defined palette, spacing, corners) chosen after seeing three real alternatives, not the first thing offered.',
        coachCue:
          'Real studios never ship take one. Get three doors, pick your favorite, steal the best knob from another.',
      },
      {
        id: 'design-03-critique-with-screenshots',
        title: 'Critique and iterate with screenshots',
        minutes: 30,
        xp: 100,
        lesson: [
          'Design lives in the eye, so you have to look at it, not read about it. The pro move is to have Claude actually render the page and take a screenshot, then you both critique the same image. Describing a layout in words and seeing it are different sports. Most design problems are invisible in code and obvious in a screenshot within two seconds.',
          'Train yourself to critique in specifics, because vague feedback like make it pop produces vague changes. Look at the screenshot and name real things: the headline is competing with the image for attention, there is not enough breathing room around the buttons, the accent color shows up in seven places so it stops meaning anything. Precise observations get precise fixes, and you get better at seeing just by naming.',
          'You can also hand Claude a reference screenshot and ask it to close the gap. Screenshot a site whose spacing or type you admire and say make our rhythm feel more like this, notice how much air they leave between sections. Comparing your work to a target you respect is the fastest way to level up, and it is far more useful than critiquing in a vacuum.',
          'Iterate in tight passes: screenshot, name the two biggest problems, fix, screenshot again. Two changes per pass, not twenty, so you can see what each move did. This is the same loop from the code track pointed at aesthetics. The screenshot is your mirror, and looking at the mirror often is the entire discipline.',
        ],
        prompts: [
          {
            label: 'Render, screenshot, and critique together',
            text: 'Render the current page and take a screenshot so we can look at the same thing. Then give me an honest design critique of what you see, the way a senior designer would: name the two or three things hurting it most, whether that is the visual hierarchy, the spacing, the type sizes, the color balance, or the alignment. Be specific about what and where. Then propose the highest impact fixes, and after you make them, screenshot again so we can compare before and after.',
          },
          {
            label: 'Match the feel of a reference',
            text: 'Here is a screenshot of a site whose look I admire: [attach or describe it, for example lots of white space, big confident headline, muted palette, generous spacing between sections]. Compare it honestly to our current page and tell me the specific gaps. Then adjust ours to close the biggest ones, focusing on the spacing rhythm, the type scale, and the overall sense of calm and confidence. Screenshot the result so I can see how much closer we got.',
          },
        ],
        assignment:
          'Have Claude screenshot your page, deliver a specific critique naming the top problems, fix the biggest two, and screenshot again so you can see the before and after with your own eyes.',
        proof:
          'You have a before and after pair of screenshots where a specific, named problem is visibly improved in the after.',
        coachCue:
          'You cannot fix what you refuse to look at. Screenshot it, roast it kindly, fix the top two, look again.',
      },
      {
        id: 'design-04-make-it-convert',
        title: 'Make it convert, not just look pretty',
        minutes: 30,
        xp: 125,
        lesson: [
          'Beautiful that does not convert is expensive decoration. A page has a job: get one specific action to happen. Every design choice either serves that action or distracts from it. Once you start seeing pages this way, you stop asking does this look nice and start asking does this move someone toward the button, which is a much better question.',
          'The hero is the whole game in the first three seconds. A visitor should instantly understand what this is, who it is for, and why they should care, plus see one obvious next step. The most common failure is a clever headline that sounds nice and says nothing. Trade cleverness for clarity: say what you do and the benefit, then put one primary button that names the action, like Start my free trial, not a limp Learn more.',
          'One primary action per screen. When you offer five equal buttons, people choose none, because choosing is work. Make the one action you actually want visually loud and everything else quiet. Repeat that single call to action down the page so it is always within reach when someone finally decides, without them having to scroll back up hunting for it.',
          'Then earn the click with proof and less friction. Social proof, a real testimonial, a recognizable logo, a specific number, calms the nervous part of a stranger brain. And every extra form field, every unclear step, every unanswered doubt is friction that leaks people. Ask Claude to walk the page as a skeptical first time visitor and name where it would lose them, then fix those leaks. That walkthrough is worth more than another coat of polish.',
        ],
        prompts: [
          {
            label: 'Sharpen the hero and the call to action',
            text: 'Look at our page with fresh eyes as a first time visitor who has three seconds. Is it instantly clear what this is, who it is for, and what to do next. Rewrite the hero headline and subheadline to be clear over clever: say what we offer and the benefit in plain human words. Make one primary call to action that names the action specifically, and make it visually dominant. Everything else on the page should be quieter than that button. Then repeat that call to action further down so it is always in reach.',
          },
          {
            label: 'Find the conversion leaks',
            text: 'Walk through this page as a skeptical stranger who is interested but not yet convinced. Narrate your doubts and hesitations at each section: where do you get confused, where do you stop trusting, where is there friction or too many choices, where would you leave. Then list the specific changes that would keep more people moving toward the primary action, ordered by impact, and add any missing trust elements like clear social proof. Fix the top issues.',
          },
        ],
        assignment:
          'Rework your page so it has one clear dominant call to action, a clear over clever hero, a repeated CTA, and at least one trust element, then have Claude do a skeptical walkthrough and fix the top leak it finds.',
        proof:
          'Your page has a single, obvious primary action that repeats, a clear benefit driven hero, visible social proof, and a documented fix to a real conversion leak.',
        coachCue:
          'Pretty is the ticket in. Converting is the reason you built the door. Point the whole page at one button.',
      },
      {
        id: 'design-05-polish-passes',
        title: 'The polish passes that separate pro from amateur',
        minutes: 35,
        xp: 150,
        lesson: [
          'The gap between good enough and portfolio grade is a set of unglamorous passes that almost nobody does, which is exactly why doing them makes you stand out. None of them require talent, just the discipline to run each pass on purpose instead of eyeballing the whole thing at once. Do them one at a time or they blur together.',
          'Spacing is the first and biggest pass. Amateur pages feel cramped and random, pro pages breathe on a consistent rhythm. Ask Claude to enforce one spacing scale everywhere, add generous room around sections, and make sure related things sit closer together than unrelated things. Consistent, generous spacing is the single most powerful upgrade available, and it costs nothing but attention.',
          'Motion is the second, and the rule is restraint. A few small, quick transitions, a gentle fade as sections enter, a soft state change when you hover a button, make a page feel alive and considered. Too much motion feels like a carnival and makes people slightly seasick. Aim for calm and intentional, motion that confirms an action or eases a change, never motion for its own sake.',
          'Responsive is the pass beginners skip and then regret publicly, because most of your visitors are on a phone. A design that sings on a wide laptop can be a broken mess on a narrow screen: text too big, buttons off the edge, images overflowing. Have Claude check and fix the layout at phone width specifically, and confirm with a screenshot at that size. The phone view is not the afterthought, for many pages it is the main event.',
          'Finish with a details pass: consistent button styles, aligned edges, real content instead of lorem ipsum, correct spelling, images that are not stretched. These tiny things are invisible when right and scream amateur when wrong. Ask Claude to hunt for inconsistencies and fix them. This is the pass that makes someone assume a professional made it.',
        ],
        prompts: [
          {
            label: 'Run the spacing and consistency pass',
            text: 'Do a dedicated spacing and consistency pass on this page. Enforce a single consistent spacing scale everywhere, add generous breathing room around and between sections, and make sure related elements are grouped closer together than unrelated ones. Then hunt for inconsistencies: mismatched button styles, misaligned edges, stretched images, leftover placeholder text, and typos. Fix them all. Screenshot before and after so I can see the page tighten up.',
          },
          {
            label: 'Motion and responsive polish',
            text: 'Two passes. First, add tasteful, restrained motion: subtle quick transitions as sections come into view and gentle state changes on interactive elements like buttons on hover. Keep it calm and intentional, nothing flashy or bouncy. Second, check this page at phone screen width and fix anything broken: text that is too large, buttons or images spilling off the edge, cramped layout, awkward stacking. Take a screenshot at phone size to confirm it looks deliberate, not squeezed.',
          },
        ],
        assignment:
          'Run each polish pass in order on your page (spacing and consistency, then motion, then responsive), verifying the phone width layout with a screenshot at that size.',
        proof:
          'Your page has consistent generous spacing, tasteful restrained motion, and a verified clean layout at phone width, confirmed by a phone sized screenshot.',
        coachCue:
          'Talent is optional here. The passes nobody bothers to run are the ones that make people say who designed this.',
      },
      {
        id: 'design-06-signature-moment',
        title: 'Build one signature moment worth remembering',
        minutes: 35,
        xp: 175,
        lesson: [
          'Consistency and polish get you to professional. What gets you to memorable is one signature moment, a single detail that makes a visitor stop and feel something. Award winning sites almost always have exactly one: a striking hero interaction, a surprising scroll effect, a playful touch that rewards attention. One, done beautifully, beats ten done halfway.',
          'The key discipline is picking one and going deep, not sprinkling five gimmicks. A page with five effects feels desperate and busy. A page with one confident, well crafted moment feels designed by someone with a point of view. Decide where the moment lives, usually the hero or the primary action, because that is where attention is highest and the payoff is biggest.',
          'It does not need to be technically fancy, it needs to be felt. A headline that assembles as you arrive. An image that responds subtly to your cursor. A number that counts up when it scrolls into view. A hover that reveals a delightful hidden detail. Describe the feeling you want to Claude, memorable, elegant, a little surprising, not gimmicky, and let it propose a few options that fit your brand rather than fighting it.',
          'Then protect the moment by keeping everything around it calm. A signature moment only shines against restraint. If the whole page is shouting, the special part cannot be heard. Build the quiet, polished page first, then add the one moment that earns the double take, and make sure it works smoothly on a phone too, because a signature moment that breaks on mobile is a liability, not a flex.',
        ],
        prompts: [
          {
            label: 'Design one signature moment',
            text: 'I want one signature moment on this page, a single memorable detail that makes a visitor stop and feel something, in the spirit of an award winning site. Not five effects, one done beautifully. Given our brand personality of [your adjectives], propose three options for what that moment could be and where it should live (likely the hero or the primary action). Each should feel elegant and a little surprising, never gimmicky, and each must still work smoothly on a phone. Describe the feeling of each, then I will pick one to build.',
          },
        ],
        assignment:
          'Choose one signature moment for your page, have Claude build it beautifully while keeping the rest of the page calm, and confirm it works smoothly at phone width too.',
        proof:
          'Your page has exactly one polished, memorable signature moment that earns a double take and works on both desktop and phone, with everything around it kept intentionally calm.',
        coachCue:
          'One unforgettable moment beats a dozen forgettable tricks. Pick the beat that makes them stop, and nail it.',
      },
      {
        id: 'design-07-boss-generic-to-portfolio',
        title: 'BOSS: Rebuild a real page from generic to portfolio grade',
        minutes: 60,
        xp: 300,
        lesson: [
          'Time to prove the whole track on something real. Find an actual page that looks generic, one of your own, a rough draft, or a plain template, and rebuild it into something you would put in a portfolio and text to a friend with pride. This is the run where all the passes stack into a transformation you can see at a glance.',
          'Run the full pipeline in order and do not skip the boring parts. Start with a real brief and references so the direction has taste. Get three token directions and commit to one system. Screenshot and critique as you go, never designing blind. Sharpen the hero and the single call to action so it converts, not just decorates. Then run every polish pass: spacing, motion, responsive, details. Finally add one signature moment against a calm, restrained page.',
          'Prove the leap the only honest way, side by side. Capture a before screenshot of the generic version and an after screenshot of your rebuild, on both desktop and phone. If the transformation is not obvious to someone glancing for one second, you are not done, keep pushing on hierarchy, spacing, and that one memorable moment until the difference is undeniable.',
          'The skill you are cementing is taste applied through a repeatable process, which means you can do this again for any page, any brand, any client, on demand. That is what separates people who occasionally get lucky with a nice design from people who can reliably produce work at a level others pay real money for. You are becoming the second kind.',
        ],
        prompts: [
          {
            label: 'Boss mission full redesign kickoff',
            text: 'I want to rebuild this page from generic to portfolio grade, running our full process. Here is the page and its job: [describe the page, its audience, and the one action it should drive]. Start by capturing a before screenshot of the current version. Then take a brief from me: personality is [adjectives], references are [one or two], avoid [the cliche]. Give me three token directions, I will commit to one. Then we build the real page, sharpen the hero and single call to action, run the spacing, motion, and responsive polish passes, and add one signature moment. Screenshot as we go and never design blind.',
          },
          {
            label: 'Prove the transformation',
            text: 'Put the before and after side by side, on both desktop and phone width, with screenshots. Then critique it as a demanding design director: is the leap obvious at a glance, is the hierarchy clear, is the spacing generous and consistent, does it convert, is there one memorable moment, does it hold up on a phone. Score it honestly out of one hundred and tell me the specific things still holding it back from portfolio grade. Fix the top blockers, then show me the final before and after.',
          },
        ],
        assignment:
          'Rebuild one real generic page into a portfolio grade version using the full pipeline, and produce before and after screenshots on desktop and phone that make the transformation obvious at a glance.',
        proof:
          'A clear before and after (desktop and phone) of a real page you rebuilt to portfolio grade, with an obvious visual leap, a converting hero, full polish, and one signature moment.',
        coachCue:
          'Final boss. Take something plain and make people ask who designed this. Before and after, no mercy.',
      },
    ],
  },
  {
    slug: 'cowork',
    name: 'COWORK',
    tagline: 'Your AI chief of staff',
    color: '#F5B700',
    bossMission:
      'Run one full workday with Claude in the loop on everything you do, and document the hours you got back.',
    missions: [
      {
        id: 'cowork-01-daily-briefing',
        title: 'Build the daily briefing habit',
        minutes: 20,
        xp: 50,
        lesson: [
          'The highest leverage habit in this whole track takes five minutes each morning: a daily briefing. Instead of opening your laptop and drowning in twelve tabs, you start the day by telling Claude what is on your plate and asking it to help you see the shape of the day. It turns a scattered brain into a plan before you have finished your coffee.',
          'The briefing is a two way thing, not a magic status report. You bring the raw material: your calendar, the things nagging at you, the one outcome that would make today a win. Claude brings structure: it sorts, it flags conflicts, it proposes an order, it reminds you of the thing you would have forgotten. The value is in the thinking together, which is why you paste in real context rather than expecting it to guess.',
          'Make it a saved, reusable ritual. In claude.ai you can set up a project for your work life and keep a briefing prompt handy, so every morning is one paste away instead of a blank page. The friction you remove is the reason you will actually stick with it. A habit that requires willpower dies, a habit that takes one click survives.',
          'The compounding payoff is that Claude starts each day already holding your context, so everything else you do together gets faster and sharper. The briefing is not just planning, it is loading the shared brain for the whole day. People who do this consistently report that the first hour, usually the most wasted hour, becomes the most productive one.',
        ],
        prompts: [
          {
            label: 'The morning briefing prompt',
            text: 'Be my chief of staff for the day. Here is my raw material. Calendar: [paste your meetings and times]. On my mind: [the tasks, worries, and loose ends rattling around]. The one outcome that would make today a win: [your single most important result]. Now help me see the day: flag any conflicts or tight transitions, tell me the two or three things that actually matter versus the noise, propose a realistic order that protects time for the win, and name anything I seem to be forgetting. Keep it short and decisive, I want a plan, not a list.',
          },
        ],
        assignment:
          'Run a real morning briefing with Claude using today or tomorrow actual calendar and tasks, and save the prompt somewhere you can reuse it every day.',
        proof:
          'You have a briefing output that reshaped your real day into a clear plan, and the prompt is saved for daily reuse.',
        coachCue:
          'Best five minutes you will spend all day. Load the shared brain, get the plan, then go win.',
      },
      {
        id: 'cowork-02-write-in-your-voice',
        title: 'Write in your own voice, not robot voice',
        minutes: 30,
        xp: 75,
        lesson: [
          'The number one reason people distrust AI writing is that it sounds like AI: hollow, over polished, allergic to a real opinion. The fix is not accepting slop, it is teaching Claude your voice and refusing to send anything that does not sound like you. Done right, it writes your emails and posts faster than you would and in your actual voice, which is the whole dream.',
          'Voice is learned from examples, not adjectives. Instead of telling Claude to sound warm and professional, show it. Paste two or three things you actually wrote, an email, a post, a message you were proud of, and ask it to study your patterns: your sentence length, your level of formality, the words you reach for, whether you use humor. Real samples teach it more in one paste than a paragraph of description ever could.',
          'Then make it draft and you edit, never the reverse. Claude gets you to a solid draft in seconds, and your job is the last ten percent that makes it yours: cut the sentence that sounds too corporate, add the specific detail only you know, restore the phrase you actually say. That last ten percent is where trust lives, and it takes a fraction of the time that staring at a blank page does.',
          'Watch for the tells and kill them on sight. Overuse of certain transition words, a relentlessly even tone, grand empty phrases, hedging where you would be direct. Tell Claude your rules once, like no corporate filler, get to the point, sound like a person, and it will hold them. Over a few weeks it learns your voice well enough that the edits shrink to almost nothing.',
        ],
        prompts: [
          {
            label: 'Teach Claude your writing voice',
            text: 'I want you to learn my writing voice so you can draft in it. Here are three things I actually wrote: [paste an email, a post, and a message]. Study them and tell me back what you notice about how I write: my typical sentence length, how formal or casual I am, the words and phrases I reach for, my sense of humor, how I open and close. Then write me a short reusable voice guide capturing those patterns, plus a list of things to avoid so nothing you draft for me sounds like generic AI. From now on, use this voice unless I say otherwise.',
          },
          {
            label: 'Draft something real in your voice',
            text: 'Using my voice guide, draft [the specific thing, for example a reply to this email, a LinkedIn post about X, a message to a client]. Here is the context and what I need it to accomplish: [paste the situation and your goal]. Get me to a strong draft that sounds like me, not like a robot, direct and human with no corporate filler. Then point out the two or three spots where my personal touch or a specific detail would make it land better, so I know where to edit.',
          },
        ],
        assignment:
          'Create a reusable voice guide from three real writing samples, then draft one real piece (an email, post, or message) in your voice and do the final edit yourself.',
        proof:
          'You have a saved voice guide and one real piece of writing that sounds genuinely like you, drafted with Claude and finished by your own edit.',
        coachCue:
          'Robot voice is a choice, not a fate. Show it how you actually talk, then edit the last ten percent.',
      },
      {
        id: 'cowork-03-research-synthesis',
        title: 'Research and synthesis that gives you decisions',
        minutes: 30,
        xp: 100,
        lesson: [
          'Most people use Claude for research at ten percent of its power: they ask a question and get a wall of text. The upgrade is asking for a specific deliverable in a specific shape aimed at a specific decision. Do not ask what should I know about X, ask for the exact artifact that will let you act, and the difference in usefulness is enormous.',
          'Name the format and the decision up front. A comparison table of these four options across the criteria I care about. A one page brief with a recommendation and the three reasons for it. A pros and cons list ending in what you would do in my position. When you tell Claude the shape of the answer and the decision it serves, you get something you can use immediately instead of something you have to re digest.',
          'For anything that matters, insist on structure and honesty. Ask it to separate what is well established from what is uncertain, to note where reasonable people disagree, and to flag its own assumptions. And when accuracy is critical, use Claude research or web capabilities to pull current sources rather than relying on memory alone, because the confident wrong answer is the dangerous one. Asking what would change your recommendation surfaces the fragile parts of any analysis.',
          'The real unlock is synthesis, turning many messy things into one clear thing. Paste in five articles, a pile of notes, a long thread, and ask for the through line, the disagreements, and the three implications for your specific situation. This is where hours become minutes. You stop being the person who has to read everything and become the person who decides on top of a clean synthesis.',
        ],
        prompts: [
          {
            label: 'Research that ends in a decision',
            text: 'I need to decide [the decision, for example which email platform to use, or whether to enter this market]. Do the research and give me a one page decision brief, not an essay. Include: a short comparison of the real options across the criteria that matter to me, which are [your criteria], a clear recommendation with the three strongest reasons, the main risk or downside of that choice, and one thing that would change your recommendation if it were true. Separate what is well established from what is uncertain, and pull current sources where accuracy matters. Be direct, I want to act on this today.',
          },
          {
            label: 'Synthesize a pile of material',
            text: 'Here is a pile of material I need to make sense of: [paste articles, notes, a long thread, or several documents]. Synthesize it for me. Give me the main through line, the key points of disagreement or tension, anything surprising, and then the three implications specifically for my situation, which is [describe your context and what you are trying to decide or do]. Structure it so I can grasp it in two minutes and know what to do next. Flag anything that looks thin or where I should verify before relying on it.',
          },
        ],
        assignment:
          'Take one real decision or one real pile of material you are facing, and use Claude to produce a structured deliverable (a decision brief or a synthesis) that ends in a clear recommendation or set of implications.',
        proof:
          'You have a structured research deliverable tied to a real decision, with a clear recommendation and an honest note on what is uncertain, that you could act on today.',
        coachCue:
          'Stop collecting walls of text. Ask for the exact artifact that makes the decision, then go decide.',
      },
      {
        id: 'cowork-04-prompt-system',
        title: 'Build your personal prompt system',
        minutes: 30,
        xp: 125,
        lesson: [
          'After a few weeks you will notice you keep writing the same prompts: the briefing, the draft in my voice, the decision brief, the meeting recap. The amateur retypes them every time. The pro builds a personal prompt system, a small library of their best, reusable prompts, so their most valuable thinking is one click away instead of reinvented daily.',
          'Projects in claude.ai are the backbone of this. A project holds shared context and instructions that apply to every chat inside it, so you can set up one for your business, one for your writing, one for a specific client, and each chat starts already knowing the background. You stop re explaining who you are and what you are working on ten times a day, which is a real and repeated tax you can simply stop paying.',
          'Save your winners the moment they work. When a prompt gives you a great result, capture it in a simple document with a name and a note on when to use it. Over a couple of months you accumulate a personal toolkit that is genuinely yours, tuned to your work and your voice. This library becomes an asset that compounds, each good prompt paying you back every time you reuse it.',
          'Design your prompts to be reusable with slots. Write them with clear placeholders for the parts that change, like here is the [situation] and I need [outcome], so the structure stays and only the specifics get swapped. A well built reusable prompt is a small machine: same lever, reliable result, every time. This is how a handful of people quietly out produce whole teams, they are not typing more, they are pulling better levers.',
        ],
        prompts: [
          {
            label: 'Set up a work project with standing context',
            text: 'Help me set up a Claude project for [your business or area of work] so every chat inside it starts smart. Ask me the questions you need to build strong standing instructions: what I do, who I serve, my goals, my voice and preferences, and the rules I want you to always follow. Then draft the project instructions in a clean, reusable form I can paste in. Keep it tight and specific so it genuinely changes how you help me, not generic boilerplate.',
          },
          {
            label: 'Turn a winning prompt into a reusable tool',
            text: 'This prompt worked really well for me: [paste the prompt or describe what you did]. Turn it into a clean, reusable template with clear placeholders for the parts that change each time, a short name, and a one line note on when to use it. Then suggest three or four other recurring tasks in my work that are worth turning into saved prompts like this, so I can start building my personal prompt library.',
          },
        ],
        assignment:
          'Set up at least one Claude project with real standing instructions, and turn two of your best prompts into named reusable templates saved in a simple library.',
        proof:
          'You have one working Claude project with standing context and a starter prompt library of at least two named, reusable templates you can pull on demand.',
        coachCue:
          'Stop retyping your genius. Build the lever once, pull it forever. This is how one person out produces a team.',
      },
      {
        id: 'cowork-05-automate-a-workflow',
        title: 'Automate one recurring workflow end to end',
        minutes: 40,
        xp: 150,
        lesson: [
          'Everyone has a recurring chore that eats an hour and requires zero creativity: the weekly report, the invoice follow ups, the content repurposing, the meeting notes cleanup. This mission is about picking one and building it into a repeatable, mostly hands off workflow with Claude, so it stops stealing your time every single week.',
          'Start by mapping the chore into explicit steps, because you cannot automate what you have not made explicit. Walk Claude through exactly how you do it now, every step and decision, the way you would train a new assistant. Half the magic happens right here: writing it down reveals which parts are truly manual and which are just habit you never questioned. Often the task shrinks the moment you look at it clearly.',
          'Then turn those steps into a reusable workflow prompt, a single well structured instruction that takes your weekly inputs and produces the finished output in the format you need. The goal is that next week the whole chore becomes paste this week numbers, get the finished report, and you spend your time reviewing and sending rather than assembling. That review only posture is the sweet spot for most knowledge work.',
          'For heavier automation you will eventually meet MCP, a way to connect Claude to your actual tools and data instead of copying and pasting between them, so it can pull and push directly. That is powerful and worth growing into, but do not start there. Nail the copy and paste workflow first and prove the time savings are real. Adding connections to a workflow that already works beats automating a mess you never validated.',
        ],
        prompts: [
          {
            label: 'Map a recurring chore into steps',
            text: 'I want to automate a recurring task I do every [week or month]: [name the task, for example turning my raw meeting notes into a clean summary and action list, or compiling my weekly performance report]. First, help me map it. Ask me to walk through exactly how I do it now, step by step and decision by decision, the way you would train a new assistant. Then play it back as a clear numbered process, and point out which steps are genuinely manual judgment and which are mechanical enough to hand off to you.',
          },
          {
            label: 'Turn the process into a reusable workflow prompt',
            text: 'Based on the process we mapped, build me one reusable workflow prompt for this recurring task. It should take my inputs each time, which are [list what you will paste in, for example this week raw numbers and notes], and produce the finished output in exactly this format: [describe the output you need]. Write it so that next time all I do is paste the fresh inputs and get a near final result I only have to review and send. Then run it once with this real example so we can confirm it works: [paste a real instance].',
          },
        ],
        assignment:
          'Pick one real recurring chore, map it into explicit steps with Claude, build a reusable workflow prompt, and run it once on real inputs to produce a near finished output.',
        proof:
          'You have a reusable workflow prompt that turns your weekly inputs into a near final deliverable, proven on one real run, so the chore becomes review and send.',
        coachCue:
          'Every week you do the same chore is a lever you have not pulled yet. Map it once, automate it, get the hour back.',
      },
      {
        id: 'cowork-06-delegate-like-a-boss',
        title: 'Delegate like a boss, not a micromanager',
        minutes: 30,
        xp: 175,
        lesson: [
          'The final skill before the boss run is delegation, the mindset shift from I do the work with a little help to I direct the work and own the outcome. Most people cap their own leverage by treating Claude as a slightly faster typewriter. The people who get the ten times results treat it as capable staff, and the difference is entirely in how they hand off work.',
          'Delegate outcomes and context, not keystrokes. A weak handoff says write three sentences about our new feature. A strong one says here is the feature, here is who we are announcing it to, here is what we want them to feel and do, draft the announcement and tell me the tradeoffs you made. You give the why and the goal and the constraints, then let Claude bring the how. Owning the what while releasing the how is the entire art.',
          'Build the feedback loop that makes staff better over time. When something comes back not quite right, do not just fix it silently and move on, tell Claude what was off and why, so the correction sticks for next time. Ask it to check its own work before handing it back, and to flag what it is unsure about. Good delegation is a relationship that improves, not a vending machine you kick.',
          'And delegate the whole arc, not just the middle. Let Claude help you decide what to work on, not only execute what you already decided. Ask what would you tackle first if you were me, or what am I missing here. When you invite it into the thinking and the prioritizing, not just the typing, you graduate from a person with a helper to a person running an operation. That is the posture the boss mission demands.',
        ],
        prompts: [
          {
            label: 'A strong outcome based handoff',
            text: 'I am delegating this to you like I would to a capable team member, so I am going to give you the outcome and the context, not step by step instructions. The task: [what you need produced]. Who it is for: [audience]. What success looks like: [the result and how it should land]. Constraints and must haves: [anything non negotiable, plus my voice and preferences]. Bring your judgment on the how. When you deliver, tell me the key choices and tradeoffs you made so I can steer, and flag anything you were unsure about.',
          },
          {
            label: 'Invite Claude into the thinking, not just the doing',
            text: 'Step back and be a strategic partner, not just an executor. Here is what is on my plate right now: [dump your current projects, priorities, and pressures]. If you were in my position, what would you tackle first and why, what am I underrating or overrating, and what am I missing entirely. Push back on my assumptions where you see them. I want your honest read on where my time and energy will actually pay off, then help me act on it.',
          },
        ],
        assignment:
          'Hand off one real task using an outcome based delegation (not step by step), then run a strategic partner conversation where you let Claude help you decide priorities, not just execute them.',
        proof:
          'You completed one real outcome based handoff where Claude exercised judgment and reported its tradeoffs, and you have a prioritization you acted on that came from treating Claude as a thinking partner.',
        coachCue:
          'Stop dictating keystrokes. Hand off outcomes, invite it into the strategy, and start running an operation.',
      },
      {
        id: 'cowork-07-boss-full-workday',
        title: 'BOSS: Run one full workday with Claude in the loop',
        minutes: 60,
        xp: 300,
        lesson: [
          'This is the capstone, and it is not a lesson to read, it is a day to run. Pick one real workday and put Claude in the loop on everything: the morning briefing, every email and document, your research and decisions, your recurring chores, even your prioritization. The goal is to feel, in a single day, what a permanent chief of staff actually changes about how you work.',
          'Run the whole system you have built. Start with the briefing to shape the day. Draft your communications in your voice and edit the last ten percent. Turn any research into decision ready deliverables. Fire your automated workflow at the recurring chore instead of grinding it by hand. Delegate outcomes and let Claude into the thinking on what matters most. Every tool from this track, used in anger, on a real day.',
          'Measure it, because a claim without a number is just a vibe. Before each task, jot a rough estimate of how long it would have taken you the old way. After, note what it actually took. At the end of the day, add up the hours you got back and, just as important, note where you produced something better than you would have alone, not just faster. Time saved and quality gained are two different wins and both count.',
          'Then decide what becomes permanent. The point of the day is not one good day, it is designing the new normal. Which habits are you keeping every day, which prompts and projects earned a permanent spot, where did Claude change not just your speed but your ambition about what you can take on. Write that down. You just previewed a way of working that most of the world has not caught up to yet, and now you get to keep it.',
        ],
        prompts: [
          {
            label: 'Boss mission: set up your Claude powered day',
            text: 'Today I am running my entire workday with you in the loop, as my chief of staff, and I want to measure the impact. Here is my day: [paste your calendar, tasks, communications to handle, decisions to make, and recurring chores]. First, give me the briefing and a realistic plan that uses you on as much of this as possible. As we go through each task together, help me note a quick before estimate of how long it would have taken me alone versus what it actually takes with you. Keep me on plan and flag when I am doing something manually that you could handle.',
          },
          {
            label: 'End of day debrief and the new normal',
            text: 'The day is done. Help me debrief. Walk back through everything we did together and total up: the hours I got back versus doing it alone, and the places where the output was actually better, not just faster. Then help me design my new normal: which habits I should keep every single day, which prompts and projects earned a permanent place in my system, and where working with you should raise my ambition about what I take on. Give me a short written summary I can keep.',
          },
        ],
        assignment:
          'Run one genuine full workday with Claude in the loop on everything, tracking time saved and quality gained per task, then produce a written debrief that names the hours recovered and the habits you are keeping permanently.',
        proof:
          'A written end of day debrief documenting the hours you got back and the quality gains across a real workday, plus a short list of the habits, prompts, and projects you are making permanent.',
        coachCue:
          'Final boss. One real day, Claude on everything, a stopwatch running. Come back and tell me the hours you got back.',
      },
    ],
  },
  {
    slug: 'ideate',
    name: 'IDEATE',
    tagline: 'From spark to spec',
    color: '#3B6B8A',
    bossMission:
      'Turn one fuzzy dream project into a validated one page spec that is ready to hand straight to the CODE track.',
    missions: [
      {
        id: 'ideate-01-excavate',
        title: 'Excavate the idea that is stuck in your head',
        minutes: 25,
        xp: 50,
        lesson: [
          'You know that feeling of having an idea you cannot quite articulate, that lives as a vibe more than a sentence. The first thinking skill is excavation, getting the whole messy thing out of your head and onto the page where you can actually look at it. You cannot pressure test, build, or pitch a fog, and most good ideas die as fog because nobody ever forces them into words.',
          'Claude is a phenomenal excavation partner because it can interview you. Instead of demanding you produce a polished pitch, let it ask you questions, one at a time, and just answer honestly and messily. The act of answering pulls the idea out of you. You will say things out loud that you did not know you thought, which is exactly the point. This is talk therapy for your ideas, and it works.',
          'Answer fast and unfiltered in this stage, do not edit yourself. The instinct to sound smart or finished is the enemy of excavation. Half baked, contradictory, rambling answers are perfect, because you are mining raw ore, not polishing a gem yet. Tell Claude explicitly that you want to be interviewed and that it should keep digging with follow ups when your answer is vague or interesting.',
          'End the session by having Claude reflect the idea back in its own words, cleaner than you could yet say it. Reading a clear articulation of your own fuzzy idea is a genuine jolt, the yes, that is it, that is what I meant moment. That reflection becomes the seed everything else grows from. From here you can test it, shape it, and eventually build it, but only because you finally got it out of your head.',
        ],
        prompts: [
          {
            label: 'Interview me to excavate my idea',
            text: 'I have an idea that is still fuzzy and mostly a feeling. I do not want to pitch it, I want you to pull it out of me. Interview me one question at a time, and when my answer is vague or you sense something interesting underneath, keep digging with follow ups before moving on. Start broad, what is the itch or frustration behind this, who feels it, what would the world look like if it existed, and go wherever my answers lead. I will answer fast and unfiltered. After enough digging, play the whole idea back to me in clear words, sharper than I could say it myself.',
          },
        ],
        assignment:
          'Let Claude interview you about one idea you have been carrying, answer messily and honestly, and get a clear written articulation of the idea back that makes you think yes, that is it.',
        proof:
          'You have a clear, written articulation of a formerly fuzzy idea, produced through an interview, that captures what you actually meant better than you could state it before.',
        coachCue:
          'That idea rattling around your skull is worthless until it is on the page. Let me interview it out of you.',
      },
      {
        id: 'ideate-02-pressure-test',
        title: 'Pressure test it with Claude as a skeptic',
        minutes: 30,
        xp: 75,
        lesson: [
          'A fresh idea feels fragile and precious, so the instinct is to protect it from criticism. That instinct will let you waste months building the wrong thing. The braver and faster move is to attack the idea now, on paper, when changing your mind is free. This mission is about deliberately turning Claude into a skeptic and letting it try to break your idea before reality does.',
          'By default Claude is encouraging, which is lovely and useless for this. You have to explicitly assign it the skeptic role and give it permission to be blunt. Tell it to be the toughest investor in the room, to find the fatal flaws, to argue why this will fail. A good adversarial pass surfaces the assumptions you were quietly leaning on, the ones that feel obvious until someone asks why do you believe that.',
          'The most valuable output is the list of things that must be true for this to work. Every idea rests on a few load bearing beliefs: that people have this problem badly enough to pay, that you can reach them affordably, that they will switch from what they use now. Ask Claude to name those beliefs explicitly, then sort them into what you already know versus what you are just hoping. The hopes are what you go test in the next mission.',
          'Steelman before you decide, so you are choosing well and not just flinching. After the teardown, have Claude argue the strongest possible case for the idea too, then give you its honest balanced read. The aim is not to fall in love or to kill it, it is to see it clearly. Ideas that survive an honest pressure test are worth your months. Ideas that crumble just saved you those months, which is a win, not a loss.',
        ],
        prompts: [
          {
            label: 'Be the toughest skeptic in the room',
            text: 'I need you to stop being encouraging and become the toughest, smartest skeptic in the room, the investor who has seen a thousand pitches and passes on most of them. Here is my idea: [paste your articulated idea]. Try to break it. What are the fatal flaws, the biggest risks, the reasons this most likely fails. What am I assuming that might not be true. Be blunt, I would rather feel it now than after months of work. Then list the specific things that must be true for this to succeed, and sort them into what I seem to already know versus what I am only hoping is true.',
          },
          {
            label: 'Steelman it, then give me your honest read',
            text: 'Now flip. Make the strongest possible case for this idea, the version a true believer would argue, including why the risks you raised might be beatable and what would make this genuinely special if it works. Then step back and give me your honest, balanced verdict: is this worth pursuing, what is the single biggest thing to validate before building anything, and if you were me, would you take the next step or walk away. Do not flatter me, help me see it clearly.',
          },
        ],
        assignment:
          'Run a full skeptic pass on your idea, capture the list of things that must be true (split into knowns and hopes), then get a steelman and an honest verdict.',
        proof:
          'You have a written list of load bearing assumptions split into what you know versus what you are hoping, plus an honest balanced verdict on whether and how to proceed.',
        coachCue:
          'Love the idea enough to attack it. Better it dies on the page for free than in the market for months.',
      },
      {
        id: 'ideate-03-talk-to-the-market',
        title: 'Talk to the market and find your position',
        minutes: 30,
        xp: 100,
        lesson: [
          'An idea that only makes sense inside your head is a hobby. To become a real thing it has to meet the market: the people who would use it, the alternatives they use now, and the reason they would choose you. This mission uses Claude to sharpen two things, how you learn what people actually want, and how you say what you are in a way that lands.',
          'First, real signal beats imagined signal, so use Claude to prepare you to talk to actual humans. Have it draft the questions you would ask potential users, and crucially, teach you to ask about their real past behavior, not their polite predictions. People will tell you they would totally buy that to be nice. What they actually did last time they had this problem is the truth. Good questions dig into stories and history, not hypotheticals.',
          'Second, positioning is the sentence that makes someone say I need that, and it is mostly about contrast. You are always being compared to something, even to doing nothing. Ask Claude to map the alternatives your user currently reaches for and then help you articulate what makes you meaningfully different and better for a specific someone. Trying to be for everyone reliably produces a message that grips no one, so let it push you toward a sharp who.',
          'Test your positioning the cheap way before the expensive way. Have Claude react as your target customer hearing your one liner cold: is it instantly clear what this is and who it is for, does it make them lean in or shrug. Iterate the sentence until a stranger would get it and want it in five seconds. Clarity here pays off in every headline, every pitch, and every ad you will ever write for this thing.',
        ],
        prompts: [
          {
            label: 'Prepare me to talk to real users',
            text: 'I want to learn whether people actually want [your idea] before I build it, by talking to real potential users. Help me prepare. Draft me a short set of interview questions that dig into their real past behavior and stories, not polite hypotheticals, so I learn what they actually do about this problem today, what they have tried, what they spend, and where it hurts most. Warn me about the questions that produce misleadingly nice answers, and tell me how to tell genuine signal from someone just being encouraging.',
          },
          {
            label: 'Sharpen my positioning against the alternatives',
            text: 'Help me position this. My idea is [paste it]. First, map the real alternatives my target user reaches for today, including doing nothing or a manual workaround. Then help me articulate what makes this meaningfully different and better, and for exactly which specific person, not everyone. Draft two or three versions of a one sentence positioning statement. Then react to each as if you were that target customer hearing it cold: is it instantly clear, does it make me lean in, and what is confusing or generic. Help me sharpen it until a stranger gets it and wants it in five seconds.',
          },
        ],
        assignment:
          'Produce a set of behavior based user interview questions and a sharp one sentence positioning statement, tested by having Claude react to it cold as your target customer and iterated until it is instantly clear.',
        proof:
          'You have a real user interview guide focused on past behavior and a one sentence positioning statement clear enough that a stranger would understand and want it in five seconds.',
        coachCue:
          'Your idea has to survive contact with real humans and their real alternatives. Let us get it market ready.',
      },
      {
        id: 'ideate-04-one-page-spec',
        title: 'Compress it into a one page spec',
        minutes: 35,
        xp: 125,
        lesson: [
          'Everything so far has been divergent, opening the idea up. Now you converge, compressing all of it into a single page that anyone, including future you and a builder, can read in two minutes and understand exactly what you are making and why. The discipline of one page is the point: if it does not fit, you do not understand it clearly enough yet, and the squeeze forces the clarity.',
          'A strong one page spec has a predictable spine. The problem and who has it. Your solution in a sentence. The specific person it is for. The single most important thing it does, the core action, which we will call the signature. The key features that support that core, kept short. How it makes money or delivers value. And the riskiest assumption you still need to validate. That is the whole page, and no more.',
          'The hardest and most valuable line is the core action, the one thing your product must do brilliantly for it to matter at all. Everything else is support. Beginners list twenty features of equal weight and build a bloated mess. Ask Claude to help you name the single core action and ruthlessly demote everything else to supporting or later. A product that does one thing undeniably well beats one that does ten things adequately, every time.',
          'Use Claude to draft the spec from your material, then interrogate it. Feed in your excavated idea, your pressure test, your positioning, and have it assemble the one pager. Then ask it to challenge the page: where is this vague, where are two features secretly fighting, what is missing, what could be cut. A spec that survives that interrogation is a spec you can hand to a builder, or to the CODE track, without a dozen follow up questions.',
        ],
        prompts: [
          {
            label: 'Draft my one page spec',
            text: 'Using everything we have worked out, draft a one page spec for my project. Here is the material: [paste your articulated idea, the assumptions from the pressure test, and your positioning]. Structure it as: the problem and who has it, the solution in one sentence, the specific target user, the single core action the product must do brilliantly, the short list of key supporting features, how it creates or captures value, and the riskiest assumption still to validate. Keep it to one page, tight and concrete. Push me to name one core action and demote everything else to supporting or later.',
          },
          {
            label: 'Interrogate the spec until it is solid',
            text: 'Now challenge this spec hard before I rely on it. Where is it vague or hand wavy. Are any of the features secretly in conflict or is the scope quietly bloating. What is missing that a builder would immediately ask about. What could be cut without hurting the core. Is the single core action truly the one thing that matters most, or am I fooling myself. Give me a sharper, tightened version that would survive being handed to a developer with no follow up questions needed.',
          },
        ],
        assignment:
          'Draft a genuine one page spec for your project from your earlier work, then have Claude interrogate and tighten it until it names one clear core action and would survive being handed to a builder.',
        proof:
          'You have a one page spec with a single clearly named core action and no vague spots, tight enough to hand to a developer without a round of clarifying questions.',
        coachCue:
          'If it does not fit on one page, you do not get it yet. Squeeze it until the one thing that matters is obvious.',
      },
      {
        id: 'ideate-05-smallest-shippable',
        title: 'Scope the smallest version worth shipping',
        minutes: 30,
        xp: 150,
        lesson: [
          'The graveyard of good ideas is full of versions one that were too big to ever finish. The final craft before the boss run is scoping down, finding the smallest version of your idea that is still real, still useful, and still tests your riskiest assumption. Small is not a compromise here, it is the strategy. The point of version one is to learn, not to impress.',
          'The tool is a brutal cut into three buckets: must have for the core action to work at all, nice to have that can wait, and someday that is a distraction right now. Most of what feels essential is actually nice to have in disguise, and naming that honestly is what makes a project shippable in a weekend instead of a year. Ask Claude to sort your features this way and to defend keeping the must have list truly tiny.',
          'Anchor the cut to your riskiest assumption from the pressure test, because the whole job of version one is to test that belief cheaply. If the risk is people will not pay, the smallest version might be barely more than a way to take a payment for the core action. If the risk is can this even be built, the smallest version proves the hard part and fakes the rest. Let the question you most need answered decide what is in and what is out.',
          'Beware the two traps at the edges. Too big and you never ship, so you never learn, and the idea quietly dies of exhaustion. Too small and it does not actually test anything real, so shipping it teaches you nothing. The sweet spot is the least you can build that would genuinely tell you whether to keep going. Ask Claude to check your scope against both traps and to name the one thing this small version will prove.',
        ],
        prompts: [
          {
            label: 'Cut to the smallest real version',
            text: 'Help me scope the smallest version of this that is still worth shipping. Here is my one page spec: [paste it]. Sort every feature into three buckets, must have for the core action to work at all, nice to have that can wait, and someday that is a distraction right now, and be ruthless, most things people call essential are actually nice to have. Keep the must have list genuinely tiny. Anchor the cut to my riskiest assumption, which is [name it], so this version is the cheapest thing that actually tests that belief. Then describe the resulting smallest shippable version in a few sentences.',
          },
          {
            label: 'Check my scope against both traps',
            text: 'Check this scope against the two failure modes. Too big, meaning I will never actually finish and ship it, and too small, meaning shipping it would not teach me anything real about whether the idea works. Where does my current scope sit, and is it honestly in the sweet spot. If it is too big, tell me exactly what to cut. If it is too small, tell me what to add so it actually tests something. Then state, in one sentence, the single thing this smallest version will prove once it is live.',
          },
        ],
        assignment:
          'Sort your spec features into must have, nice to have, and someday, define the smallest shippable version anchored to your riskiest assumption, and confirm with Claude that it avoids both the too big and too small traps.',
        proof:
          'You have a defined smallest shippable version with a tiny must have list, anchored to your riskiest assumption, and a one sentence statement of the single thing shipping it will prove.',
        coachCue:
          'Version one is a question, not a monument. Cut it to the smallest thing that gives you a real answer.',
      },
      {
        id: 'ideate-06-decide-and-commit',
        title: 'Make the honest go or no go call',
        minutes: 30,
        xp: 175,
        lesson: [
          'Thinking without a decision is just entertainment. Before the boss run you make an honest call: is this idea worth your finite time and energy, yes or no. Both answers are wins. A clear yes gives you conviction to build through the hard middle. A clear no frees you to stop pouring yourself into the wrong thing and put that energy somewhere it pays off. The only losing move is staying forever undecided.',
          'Decide against your own criteria, not vibes or sunk cost. What actually matters to you here, income, impact, learning, joy, fit with your life, and how does this idea score against each. Have Claude help you name your real criteria first, then rate the idea honestly on each one. Writing it down defends you against the two silent killers of good judgment, falling in love because you have already invested, and talking yourself out of something great because it feels scary.',
          'Weigh the cost of being wrong in each direction, because they are rarely equal. Ask what it costs if you build this and it fails versus what it costs if you skip it and it would have worked. Often the smallest shippable version makes a yes cheap to test and a no cheap to confirm, which is exactly why you scoped it small. When the downside of trying is small and the upside is real, bias toward action, and let Claude help you see that asymmetry clearly.',
          'Then commit in writing, either way. If it is a go, write the decision, the reasons, and the very next concrete step, so future you cannot quietly re litigate it every morning. If it is a no, write why, so you learn from it and do not circle back out of guilt. A decision you can point to is a decision that sticks, and being the kind of person who actually decides and moves is worth more than any single idea.',
        ],
        prompts: [
          {
            label: 'Score the idea against my real criteria',
            text: 'Help me make an honest go or no go decision on this idea. First, help me name my real criteria for what makes a project worth my time, things like income potential, impact, how much I would learn, whether I would enjoy it, and how it fits my life right now. Then have me rate this idea honestly against each one. Push back if you think I am rating from love or from fear rather than reality. Here is the full picture: [paste your spec, pressure test verdict, and smallest version]. Give me your read on where this genuinely stands.',
          },
          {
            label: 'Weigh the asymmetry and help me commit',
            text: 'Help me weigh the cost of being wrong in each direction. What does it realistically cost me if I build the smallest version and it fails, versus what does it cost me if I walk away and it actually would have worked. Given how small and cheap my version one is, where does the asymmetry point. Then help me commit in writing: if it is a go, capture the decision, the top reasons, and the single next concrete step, and if it is a no, capture why so I learn from it and do not keep circling back. I want a decision I can point to tomorrow.',
          },
        ],
        assignment:
          'Score your idea against your own named criteria, weigh the cost of being wrong each way, and write down a committed go or no go decision with either your next concrete step or your honest reason for stopping.',
        proof:
          'You have a written, committed go or no go decision scored against real criteria, including either the single next step (if go) or the honest reason for stopping (if no go).',
        coachCue:
          'Yes or no both win. Only maybe forever loses. Score it straight, weigh the downside, and make the call.',
      },
      {
        id: 'ideate-07-boss-validated-spec',
        title: 'BOSS: Produce a validated spec ready to build',
        minutes: 60,
        xp: 300,
        lesson: [
          'This is where thinking becomes a launchpad. Take your dream project, the real one you actually want to exist, and run the entire ideate pipeline on it end to end, producing a single validated one page spec so clear and pressure tested that you could paste it into the CODE track tomorrow and start building with confidence. This is the bridge between the person with ideas and the person who ships them.',
          'Run every step in sequence on the real thing. Excavate it fully so it is out of your head and clear. Pressure test it as a skeptic and capture the assumptions. Sharpen the positioning and prepare to learn from the market. Compress it to a one page spec with one true core action. Scope the smallest shippable version anchored to your riskiest assumption. Then make the honest go or no go call. No skipped steps, because each one removes a specific way projects die.',
          'The word validated is doing real work here and it is the bar you must clear. It means you have not just described the idea, you have stress tested it: you know the load bearing assumptions and which are still just hopes, you know who it is for and why they would choose it over the alternative, you know the one core action, you know the smallest version that tests the biggest risk, and you have honestly decided it is worth building. That is a spec with a spine, not a wish.',
          'Your deliverable is one page a builder could act on with almost no questions, and the pipeline you just ran is repeatable for every idea you will ever have. You now own the full arc: pull a fuzzy spark out of your head, harden it into a real plan, and hand it to yourself in the CODE track to build and ship. Idea people are common and builders are rare. You just became the rarest thing, the person who can do both, on demand.',
        ],
        prompts: [
          {
            label: 'Boss mission: run the full pipeline on my dream project',
            text: 'I want to turn my dream project into a validated one page spec that is ready to build. We are going to run the full pipeline in order, and I want you to guide me through each stage and not let me skip. Stage one, interview me to excavate the idea fully. Stage two, pressure test it as a tough skeptic and capture the load bearing assumptions. Stage three, sharpen the positioning and who it is for. Stage four, compress to a one page spec with one true core action. Stage five, scope the smallest shippable version anchored to the riskiest assumption. Stage six, help me make an honest go or no go call. Here is my starting spark: [describe your dream project]. Take me through it stage by stage.',
          },
          {
            label: 'Final validation check on the spec',
            text: 'Here is my finished one page spec: [paste it]. Do a final validation check as if you were both a demanding investor and the developer who has to build it. Confirm each of these is genuinely nailed and call out anything weak: the problem and who has it, the load bearing assumptions and which are still hopes, the specific target user and why they choose this over the alternative, the single core action, the smallest version that tests the biggest risk, and an honest go decision. Then tell me plainly whether this is ready to hand to the CODE track to build, and if not, exactly what to fix first.',
          },
        ],
        assignment:
          'Run the complete ideate pipeline on your real dream project and produce one validated one page spec (clear core action, tested assumptions, sharp positioning, smallest shippable version, honest go decision) that is ready to hand straight to the CODE track.',
        proof:
          'A single validated one page spec for your dream project, confirmed by Claude as ready to build, that you could paste into the CODE track tomorrow and start shipping with confidence.',
        coachCue:
          'Final boss. Take the dream out of your head and hand yourself a spec you could build tomorrow. Idea plus builder, on demand.',
      },
    ],
  },
];

export const totalXp: number = 3900;
