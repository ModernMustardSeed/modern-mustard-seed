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
        `Your email runs on Google Workspace at ${p.emailDomain ?? 'your own domain'}, billed by Google to your own card, so the account is yours outright. The email box on this page shows whether the domain is registered and whether mail is flowing to Google yet.`,
      ],
    },
    {
      title: 'Your accounts',
      lines: [
        'The accounts everything runs on, and whether each one is connected: Facebook, Instagram, LinkedIn, Houzz, Google Business Profile, Buildertrend, Google Workspace.',
        'Connecting an account is always your own click on your own login. We hold a revocable key, never a password, and you can disconnect any of them here.',
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
        'Monday 7:35 AM: the leads digest. Monday 8:12 AM: every domain re-read from the registry; anything inside 45 days lands in your inbox.',
        'Daily Posting plans at 7:35 PM and publishes on the hour. Their Hidden Gems articles come in through the Articles card; you write the summary, the site session puts it on /blog.',
      ],
    },
    {
      title: 'Answers for the table',
      lines: [
        '"Can it talk to Buildertrend?" Yes, one way: every website lead becomes a Lead Opportunity in their pipeline. Reading their jobs back out needs Buildertrend\'s partner API, which they do not sell to a single builder, and we do not pretend otherwise.',
        '"Where are my old posts and customers from Web Express?" In the Web Express Marketing App until October 1, 2026, then deleted. Shan exports contacts from accounts.webexpress.com or adds you as a user before then.',
        '"Who owns the domains?" They do. Registered to Built Right in Montana LLC at their email; we hold the account and carry renewals under Domain Stewardship, $497 a year for the whole set.',
        '"What about email?" Google Workspace on brimhomes.com, $7 a person a month, on their card. You do DNS and verification the day the domain lands.',
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
