/**
 * Tutorial content for the in-app Help guide. One guide per surface (client
 * portal, partner dashboard, admin). Optional and always available, never forced.
 */
export type HelpSection = { title: string; items: string[] };
export type HelpGuideContent = { title: string; intro: string; sections: HelpSection[] };

export const CLIENT_HELP: HelpGuideContent = {
  title: 'Your portal, explained',
  intro: 'This is your home base with Modern Mustard Seed. Everything here is private to you. Here is what each part does.',
  sections: [
    {
      title: 'Your project',
      items: [
        'The progress ring shows how far along your build is.',
        'Milestones list the steps. The one marked "Now" is what we are working on next.',
        'The summary explains what is being built in plain language.',
      ],
    },
    {
      title: 'Launch date',
      items: [
        'The launch card counts down the days to go-live.',
        'Need a different date? Tap "Request a different date," pick one, and add a reason. It goes to Sarah to confirm, and you get an email when it is set.',
      ],
    },
    {
      title: 'Billing',
      items: [
        'See your project total, the deposit, and the balance.',
        'When the deposit is paid and a balance is due, tap "Pay remaining balance" to pay securely.',
        'Download a PDF of your signed proposal anytime.',
      ],
    },
    {
      title: 'Files, links, and credentials',
      items: [
        'Files and deliverables holds your live site, repo, docs, and downloads.',
        'Credentials & access holds your launch logins, encrypted. Tap Reveal or Copy when you need one. They are never emailed.',
      ],
    },
    {
      title: 'Requests, notes, and Mr. Mustard Seed',
      items: [
        'Use "Requests and notes" to send Sarah a change, an edit, or anything on your mind. You will see each request and its status (Sent, Seen, Done).',
        'Or just tell Mr. Mustard Seed (the chat on the right) what you need. He can answer questions and pass requests straight to Sarah.',
      ],
    },
    {
      title: 'Reviews and calls',
      items: [
        'Happy with the work? Leave a review from your portal. Sarah approves it before it goes public.',
        'Book a call anytime with the "Book a call" link up top.',
      ],
    },
    {
      title: 'Signing in',
      items: [
        'No password. Enter your email at the sign-in page and click the magic link we send you. The link lasts 20 minutes; request a fresh one anytime.',
      ],
    },
  ],
};

export const PARTNER_HELP: HelpGuideContent = {
  title: 'Your partner dashboard, explained',
  intro: 'Everything you need to open doors, book calls, and earn on every build and product you send. Here is how it works.',
  sections: [
    {
      title: 'The Outreach Playbook',
      items: [
        'Tap the big black card up top to open your full field guide.',
        'It shows you where to find buyers, exactly what to say, a full phone script, and a social strategy.',
        'Every script is pre-filled with your booking link, so you copy, reword, and send.',
        'Download it as a PDF to keep on your phone.',
      ],
    },
    {
      title: 'Your links and code',
      items: [
        'Your referral code is at the top. Copy any of your ready-made links and share them.',
        'You can also add ?ref=YOURCODE to any page on the site to track it.',
        'Last touch within 60 days wins the credit.',
      ],
    },
    {
      title: 'Marketing kit',
      items: [
        'Ready-to-post captions for X, LinkedIn, and email, each pre-filled with your link. Copy and post.',
        'One-tap Share buttons, a QR code for your link, and a downloadable share image.',
      ],
    },
    {
      title: 'Earnings and payouts',
      items: [
        'Track clicks, sales, what is payable now, and what you have earned all time.',
        'You earn 10% on every build and service you send (websites, AI assistants, voice agents, custom software) and 50% on every product sale. Founding partners are grandfathered at their original build rate.',
        'A commission becomes payable once the refund window passes, then it goes out on the next payout run.',
        'Please always tell people you earn a commission. It keeps this trustworthy.',
      ],
    },
    {
      title: 'Free access',
      items: [
        'Every product is yours, free, so you can learn it and recommend it honestly. Find the programs and playbook downloads on your dashboard.',
      ],
    },
    {
      title: 'Signing in',
      items: [
        'No password. Enter your email at the sign-in page and click the magic link. It drops you right here.',
      ],
    },
  ],
};

export const ADMIN_HELP: HelpGuideContent = {
  title: 'Command center, explained',
  intro: 'The daily drivers are pinned up top: Outbound (the dial floor), Pipeline (every lead), and Partner Hub (your code, posts, playbooks, and free programs). Everything else lives in the Clients, Marketing, and Desk menus.',
  sections: [
    {
      title: 'Overview',
      items: [
        'Revenue, sales, new leads, and upcoming calls at a glance, with progress toward your monthly targets (tap Set/Edit to change them).',
        'Client messages: change requests and notes from portals. Approve a proposed launch date in one tap, reply, or mark done.',
        'Follow-up radar flags proposals that need a nudge. The daily AI brief tells you what to do today.',
      ],
    },
    {
      title: 'Outbound',
      items: [
        'The one dial floor. Your queue, the words to say, one-tap outcomes, audits, emails, demos, and pilots all live here.',
        'The old Tracker prospects were merged in (audits, emails, and numbers included). The Tracker page remains as a read-only archive.',
      ],
    },
    {
      title: 'Pipeline',
      items: [
        'Every lead. Click one to open the drawer: details, status, your private notes, the launch countdown, and the full activity timeline.',
      ],
    },
    {
      title: 'Partner Hub',
      items: [
        'Your partner code and money link, every teammate’s code, and your own clicks and earnings.',
        'What to Post: ready-made swipe copy for every offer with your link already injected, plus the commercials.',
        'Playbooks, the training courses, and free access to every program (Mustard Mode, Mustard Launch, Idea to Spec, The Terminal, the store).',
      ],
    },
    {
      title: 'Audit',
      items: [
        'Run the website audit on any URL. Email it to a lead as a one-off offer (no drip).',
        '"Save to client" keeps the audit on file against their email. "Build a proposal from this audit" hands it to the proposal builder.',
      ],
    },
    {
      title: 'Proposals',
      items: [
        'Pick a path or add services, set scope and price, and draft the words with AI.',
        'Save, then "Send for signature" to email the client a sign + pay link.',
        'Deposit panel: create/email the deposit link, mark paid, then send the balance invoice. Copy link or resend from the saved list.',
      ],
    },
    {
      title: 'Projects',
      items: [
        'Create a client and start their project in one step (top of the board).',
        'Set status, progress, milestones, and the launch target. Clients see all of this in their portal.',
        'The deliverables strip (Audit, Signed, Deposit, Balance, Launched) shows what is done. Click any gap to jump straight to that action.',
        'In a project, manage Files & links and the encrypted Credentials vault the client sees at launch.',
      ],
    },
    {
      title: 'Reviews, Outreach, Partner Admin',
      items: [
        'Reviews (Clients menu): approve client-submitted reviews to publish them on the site.',
        'Outreach (Marketing menu): prospect list and AI-drafted messages for your approval.',
        'Partner Admin (Desk menu): approve applicants and manage the outside affiliates. Your own partner life lives in Partner Hub.',
      ],
    },
    {
      title: 'The money loop',
      items: [
        'Deposit (to start) and balance (on delivery) both run through Stripe and record to revenue automatically.',
        'Paying in full or marking a project Launched triggers a review request to the client two days later.',
      ],
    },
  ],
};
