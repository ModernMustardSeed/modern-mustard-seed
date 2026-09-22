/**
 * THE WORDS FOR THE COMMAND CENTER. One copy, two readers.
 *
 * `clientGuide` is what the owner reads in their portal: what each part is,
 * what it does on its own, and the one thing they do. `deskGuide` is what
 * Sarah reads beside their card: the same promise in her words, and the
 * answers to the questions an owner asks across a table. Neither is sent;
 * both are layered into the pages so nobody has to remember them.
 */
import type { ClientProject } from '@/lib/client-leads';

export type GuideSection = { title: string; lines: string[] };

export function clientGuide(p: ClientProject): GuideSection[] {
  const crm = p.crm === 'buildertrend' ? 'Buildertrend' : 'your CRM';
  return [
    {
      title: 'What this is',
      lines: [
        'Every part of your business that has to keep running whether or not anyone is watching it, on one page: the leads, the conversations, the domains, the email, the posting, and the accounts they all depend on.',
        'Nothing here asks you to do bookkeeping. There are no invoices, no proposals, no money screens. Your books stay where they are.',
        `Your customers live in ${crm}. This page feeds it; it does not replace it.`,
      ],
    },
    {
      title: 'Leads',
      lines: [
        'Every person who reaches out through the website, whichever door they used: the contact form, the project form, the questionnaire, the referral form, or the chat.',
        `Each one is texted and emailed to you the moment it arrives, the visitor hears back at once, and the lead is handed to ${crm} as a Lead Opportunity so your pipeline is never a step behind the website.`,
        'The list is sorted by who is waiting and by priority: land and plans first, then land, then plans, then remodels. Press "I called them" and it leaves the Monday list. Nothing else ever marks a lead as called.',
        'The three boxes at the top answer the question you will ask most: where do our leads come from, by door, by priority, by page.',
      ],
    },
    {
      title: 'Conversations',
      lines: [
        'Everything a visitor asked the chat on your website, in their words, with the page they were on. Read it the way you would read your phone messages.',
        'The chat never quotes a price, a timeline or financing, and it never invents. When someone wants a person, it takes their number and that becomes a lead.',
      ],
    },
    {
      title: 'Domains and email',
      lines: [
        'Every domain you own, what it is for, where it is registered and the day it renews. We carry the renewals. The registry is re-read every Monday and Sarah is warned 45 days before anything expires.',
        'The building names forward to the website so a customer who types any of them lands on you. The sauna, rustic and other names are held for their own day.',
        `Your email runs on Zoho Mail at ${p.emailDomain ?? 'your own domain'}, one mailbox for each of you, and we carry the bill. The email box on this page shows whether the domain is registered and whether mail is flowing to Zoho yet.`,
      ],
    },
    {
      title: 'Today',
      lines: [
        'The box at the top is what matters right now, in order: who is waiting on a call, which email needs a reply, what renews soon, what goes out today, which sign got scanned. Every line is read from your own records the moment you open the page. Nothing in it is written by a model.',
        'The guide in the corner reads the same records. Ask it who is waiting, which sign is working, or what came in this week, and it answers with the numbers.',
        'It also does four things when you ask: writes an email to anyone and puts it in your own drafts (it never sends), sends a review ask, marks a lead as called, and makes a QR code. Say "email Bob Miller at bob@example.com about the Thursday walkthrough" and the draft is waiting in your mailbox before you finish your coffee.',
      ],
    },
    {
      title: 'Signs and ads',
      lines: [
        'Make a QR code for anything you print: a yard sign, the truck door, a business card, a Chamber ad, a mailer. Each one gets its own code in its link, so when someone scans it the site knows which sign brought them, and any lead that follows carries that name.',
        'Download the PNG for a sign shop or the SVG for a printer. The codes point at builtrightinmontana.com and never change, so a sign printed today still works in five years.',
        'The card shows scans this week, scans all time, and leads per code. That is how you learn which corner of the valley is reading your signs.',
      ],
    },
    {
      title: 'Reviews',
      lines: [
        'When a job closes, type the homeowner\'s name and email (or mobile) and one short note goes out from the business with the places to leave a review, Google first, then Houzz. Add a personal line if you want; otherwise it thanks them for building with you.',
        'Every ask is kept on the card so nobody is asked twice. Reviews on Google outrank the website for a local builder; this is the cheapest thing you can do for the phone.',
      ],
    },
    {
      title: 'Project photos',
      lines: [
        'Pick a project, drop the photos, and they go on that project\'s page at the next build of the website. The card shows which are live and which are waiting. A photo you sent by mistake can be taken back until it is on the page.',
        'The same photos are there for Daily Posting to use, so a finished house gets its page and its posts from one drop.',
      ],
    },
    {
      title: 'The monthly page',
      lines: [
        'On the first of every month you and Carmen get one email: last month by the numbers. Leads by door and by sign, chat conversations, replies sent, posts that went out, photos added, review asks, and any domain renewing in the next sixty days. Every line is a count from your own records.',
      ],
    },
    {
      title: 'Your mail',
      lines: [
        'Connect each mailbox once: Shan, Carmen and Zayne each have their own, and all of them land here. A mailbox on your own domain takes its own password (on Zoho, tick IMAP Access in Settings, Mail Accounts first); a Gmail address takes an app password from Google (2-Step Verification on, then Security, App passwords, "Mail"). We read every inbox twice an hour and sort it: new inquiries, customers, subs and suppliers, money, newsletters, notifications, everything else.',
        'Anything that needs an answer gets a draft written in your voice, waiting under the message. Read it, change what you like, press Send and it goes from the mailbox it arrived in, threaded under theirs. Or save it to the drafts of that mailbox and finish on your phone.',
        'Nothing is ever sent, moved or deleted without your click. The drafts never quote a price, a timeline or financing; those are yours to say in person.',
      ],
    },
    {
      title: 'Your accounts',
      lines: [
        'The accounts everything runs on, and whether each one is connected: Facebook, Instagram, LinkedIn, Houzz, Google Business Profile, Buildertrend, and your mailboxes.',
        'Connecting an account is always your own click on your own login. We hold a revocable key wherever the account offers one; a mailbox holds its mail password, kept encrypted, and changing that password cuts us off at once. You can disconnect any of them here.',
        'The Google Business Profile outranks the website for a local builder. It is the one thing we cannot create for you, because Google verifies the owner. Once it exists, add sarah@modernmustardseed.com as a manager and reviews, posts and hours are handled from here.',
      ],
    },
    {
      title: 'What you do',
      lines: [
        'Call the leads. Everything else on this page runs on its own.',
        'When you want something changed, on the website, on a post, on this page, say so in your portal or by text. Changes are included; there is never a bill for one.',
      ],
    },
  ];
}

export function deskGuide(p: ClientProject): GuideSection[] {
  return [
    {
      title: 'What they bought, in one line',
      lines: [
        `${p.business}: the website with the chat, Daily Posting, and the Command Center that keeps the leads, domains, email and accounts running. No money screens, by their request: their books, quotes and proposals stay in ${p.crm === 'buildertrend' ? 'Buildertrend' : 'their own tools'}.`,
      ],
    },
    {
      title: 'The loop, end to end',
      lines: [
        'A visitor fills a form or chats. The lead is saved, texted and emailed to them, the visitor is thanked, and the lead is pushed into Buildertrend through their Lead Contact Form. If Buildertrend refuses (a captcha on their form is the only cause), the refusal is written on the lead and shown in their portal with the fix: ask Buildertrend support to turn the captcha off.',
        'Monday 7:35 AM: the leads digest. Monday 8:12 AM: every domain re-read from the registry; anything inside 45 days lands in your inbox. Every hour at :07 and :37: their inbox is read over IMAP, new mail is sorted by a queued LLM job, and replies are drafted; nothing sends without their click.',
        'QR codes: each campaign is a code in the link (?src=). The site posts a scan to /api/client-visit and carries the code on every lead, so scans and leads are counted per sign. Jobsite signs are the same thing pointed at a project page.',
        'Project photos land in client_project_photos as `new`; the site build reads them onto /projects/<slug> and marks them `live`. Review asks send by email through Resend from the business (reply-to Shan) and by text when Twilio is back; each is logged in client_review_requests. The monthly page goes out the 1st at 8:23 AM from /api/cron/client-monthly-report (the cron fires daily and the route sends only on the 1st; ?force=1 sends a test).',
        'The owner\'s manual at /api/portal/manual is the How-it-works words set for paper; print to PDF from the browser, so it can never drift from the portal.',
        'Daily Posting plans at 7:35 PM and publishes on the hour. Their Hidden Gems articles come in through the Articles card; you write the summary, the site session puts it on /blog.',
      ],
    },
    {
      title: 'Answers for the table',
      lines: [
        '"Can it talk to Buildertrend?" Yes, one way: every website lead becomes a Lead Opportunity in their pipeline. Reading their jobs back out needs Buildertrend\'s partner API, which they do not sell to a single builder, and we do not pretend otherwise.',
        '"Where are my old posts and customers from Web Express?" In the Web Express Marketing App until October 1, 2026, then deleted. Shan exports contacts from accounts.webexpress.com or adds you as a user before then.',
        '"Who owns the domains?" They do. Registered to Built Right in Montana LLC at their email; we hold the account and carry renewals under Domain Stewardship, $497 a year for the whole set.',
        '"What about email?" Zoho Mail Lite on brimhomes.com, shan@, carmen@ and zayne@, $1 a mailbox a month billed yearly, on the MMS bill. Tick IMAP Access on each mailbox, then connect each one on the desk so the Command Center reads it.',
      ],
    },
    {
      title: 'Still waiting on them',
      lines: [
        'Buildertrend Lead Contact Form embed pasted into the portal (Sales, Lead Opportunities, Lead Contact Form, Installation Instructions).',
        'Carmen adds you as a manager on the Google Business Profile, and as admin on Facebook, Instagram, LinkedIn and Houzz.',
        'Web Express contacts exported, or you added as a user, before October 1.',
        'Answer on whether anyone uses an @builtrightinmontana.com mailbox, so MX can move.',
      ],
    },
  ];
}
