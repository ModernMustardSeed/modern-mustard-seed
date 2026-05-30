#!/usr/bin/env node
/**
 * Render every email template to /tmp/email-preview/*.html for visual review.
 * No real Stripe/Supabase/Resend calls. Uses Node 24's --experimental-strip-types.
 *
 *   node --experimental-strip-types scripts/preview-emails.mjs
 *   start /tmp/email-preview/index.html   (Windows)
 *   open  /tmp/email-preview/index.html   (Mac)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import * as E from '../lib/email.ts';

const OUT = '/tmp/email-preview';
mkdirSync(OUT, { recursive: true });

const samples = [
  ['playbook', () => E.playbookEmail({
    firstName: 'Sarah',
    painSummary: 'I am drowning in admin work and cannot afford to hire a team. I want AI to take over the repetitive tasks so I can focus on the work that matters.',
    recommendedSteps: [
      { title: 'Map your weekly hours', detail: 'Spend 30 minutes writing down every recurring task you did this week.' },
      { title: 'Score by automation potential', detail: 'Rate each task 1 to 5 on how repeatable and rule-based it is.' },
      { title: 'Pick one to automate first', detail: 'The highest-scoring weekly task is your first AI build.' },
      { title: 'Stand it up in a day', detail: 'Use a Claude prompt plus Zapier or n8n to wire the simplest possible version.' },
      { title: 'Measure, iterate, expand', detail: 'Track hours saved per week. When the savings exceed 5h, move to the next task.' },
    ],
  })],
  ['booking-confirmation', () => E.bookingConfirmationEmail({
    firstName: 'Sarah', whenDisplay: 'Friday, June 6 at 11:00 AM MT', durationMinutes: 30,
    painSummary: 'I have a small business but no online presence and I am losing customers to it.',
    conferenceLink: '',
  })],
  ['sequence-day-2', () => E.sequenceDay2Email('Sarah')],
  ['sequence-day-5', () => E.sequenceDay5Email('Sarah')],
  ['audit-followup', () => E.auditFollowupEmail({
    firstName: 'Sarah', url: 'https://example.com', score: 64, grade: 'D',
    headline: 'Solid product, weak GEO foundation, missing AI features.',
    topThreeFixes: [
      { title: 'Add llms.txt and ai.txt', why: 'AI search engines have no instructions on how to summarize you.', how: 'Drop a llms.txt at the root with brand summary, top URLs, and FAQs.' },
      { title: 'Compress hero image', why: 'Hero loads in 4.2s on 4G. Half your visitors bail.', how: 'Convert to WebP, serve under 200KB, lazy-load below the fold.' },
      { title: 'Add Product schema', why: 'Google does not know what you sell.', how: 'Add JSON-LD Product schema to every product page.' },
    ],
  })],
  ['store-order', () => E.storeOrderConfirmationEmail({
    firstName: 'Sarah', itemName: 'The GEO and AI Commerce Playbook',
    downloads: [{ name: 'The GEO and AI Commerce Playbook', url: 'https://example.com/download.pdf' }],
    priceUsd: 67,
  })],
  ['lead-notification', () => E.leadNotification({
    type: 'Build Queue', name: 'Jane Builder', email: 'jane@example.com',
    fields: [
      { label: 'Idea', value: 'AI tool for small law firms to draft motions' },
      { label: 'Budget', value: '$15,000 to $25,000' },
      { label: 'Timeline', value: 'Q3 2026' },
    ],
    message: 'I run a 4-person family law firm and we draft 20 motions a week by hand. I want an AI tool that pulls the template, fills in the case facts, and exports a Word doc ready for my review.',
    suggestedAction: 'Reply within 24h with discovery call slots. This is a high-fit Full-Service Build candidate.',
  })],
  ['client-email', () => E.clientEmail({
    eyebrow: 'A quick note',
    greeting: 'Thanks for reaching out, Sarah.',
    body:
      E.p('I got your message and will personally reply within 24 to 48 hours. In the meantime, two links worth your time:') +
      E.callout({
        label: 'Start here',
        title: 'The free AI Website Audit',
        body: 'A 60-second readout on the highest-leverage moves you could make on your site right now.',
        href: 'https://modernmustardseed.com/website-audit',
        cta: 'Run the audit',
      }) +
      E.p('If anything is urgent, the calendar is open below and I will make room.'),
    cta: { label: 'Book a discovery call', url: 'https://modernmustardseed.com/?book=1' },
    secondary: { label: 'See the work', url: 'https://modernmustardseed.com/work' },
  })],
  ['booking-notification', () => E.bookingNotificationEmail({
    name: 'Jane Builder', email: 'jane@example.com', business: 'Builder Law',
    whenDisplay: 'Friday, June 6 at 11:00 AM MT',
    painSummary: 'No online presence and losing customers to competitors who have one.',
    recommendedSteps: [
      { title: 'Stand up a one-page site', detail: 'Name, offer, proof, call to action. Live this week.' },
      { title: 'Wire a booking link', detail: 'Stop playing email tag with new leads.' },
    ],
  })],
  ['store-order-notification', () => E.storeOrderNotificationEmail({
    name: 'Jane Builder', email: 'jane@example.com',
    itemName: 'The GEO and AI Commerce Playbook', priceUsd: 67,
    sessionId: 'cs_test_a1b2c3d4e5f6g7h8',
  })],
];

const linksHtml = samples
  .map(
    ([slug]) =>
      `<li><a href="${slug}.html" style="font-family:'JetBrains Mono',monospace;color:#B07A1F;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${slug.replace(/-/g, ' ')} &rarr;</a></li>`
  )
  .join('');

writeFileSync(
  `${OUT}/index.html`,
  `<!DOCTYPE html><html><head><title>MMS Email Preview</title><style>body{margin:0;padding:40px;font-family:'DM Sans',system-ui,sans-serif;background:#F2F4F8;color:#0B1424}h1{font-size:28px;margin:0 0 24px}ul{list-style:none;padding:0;margin:0}li{padding:12px 0;border-bottom:1px solid #E7EAF1}</style></head><body><h1>MMS Email Preview · ${new Date().toISOString().slice(0, 10)}</h1><p style="color:#6B7387;margin:0 0 24px">Open each template in a new tab to view the new clean light design.</p><ul>${linksHtml}</ul></body></html>`
);

for (const [slug, render] of samples) {
  try {
    writeFileSync(`${OUT}/${slug}.html`, render(), 'utf8');
    console.log(`  ok    ${slug}.html`);
  } catch (e) {
    console.error(`  FAIL  ${slug}: ${e.message}`);
  }
}

console.log(`\nOpen the preview index: ${OUT}/index.html`);
