'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

/**
 * Meta Ads launch playbook for the Mr. Mustard commercials.
 * Campaign one: "Call Me" (voice agents, call objective).
 * Campaign two: "The Talking Website" (full system pitch, audit funnel).
 * Campaign three: "MUSTARD MODE" (the coaching product, free-play funnel).
 * Campaign four: "The Fable Mind" (free playbook lead magnet funnel).
 * Everything needed to publish lives on this one page: the cuts per
 * placement, copy-paste ad text, audience, budget, checklists, results.
 */

const PHONE = '(406) 312-1223';
const LANDING = 'https://modernmustardseed.com/voice-agents?utm_source=meta&utm_medium=paid&utm_campaign=callme';

const COPY_A = `Meet Mr. Mustard. He answers our phones 24/7, takes bookings, gives estimates, and makes outbound sales calls. He never sleeps, never misses a call, and never lets a lead go cold.

Don't take our word for it. Call him right now: ${PHONE}. He picks up.

Then imagine him trained on YOUR business.`;

const COPY_B = `Every missed call is a customer who called your competitor next. Mr. Mustard picks up every single time: orders, appointments, estimates, even outbound follow-up. All day. All night.

Hear him live right now: ${PHONE}. Your business could sound like this by next week.`;

const HEADLINE = 'Your 24/7 AI receptionist. Hear it live.';
const DESCRIPTION = 'Built by Modern Mustard Seed.';

const CUTS = [
  { file: '/ads/call-me-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/call-me-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/call-me-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the website hero.' },
];

const TW_LANDING = 'https://modernmustardseed.com/audit?utm_source=meta&utm_medium=paid&utm_campaign=talkingwebsite';

const TW_COPY_A = `Your website looks great. But does it DO anything?

The new websites talk. They greet every visitor, answer every question, and close the sale while you sleep. And behind the pretty face: a full CRM, automated follow-up, marketing funnels, even an ad studio that makes the ads for you.

We build them. Start with a free AI audit of your current site and see exactly what it is leaving on the table.`;

const TW_COPY_B = `Most websites are brochures. Yours could be a salesperson.

A Modern Mustard Seed build comes with everything baked in: an AI website that talks to visitors, a CRM that captures every lead, automated follow-up, funnels that convert, and an ad studio for the marketing. One system. It sells for you.

Get the free AI audit and see what your current site is missing.`;

const TW_HEADLINE = 'Your website should sell for you.';
const TW_DESCRIPTION = 'AI website + CRM + funnels + ad studio. Built by Modern Mustard Seed.';

const TW_CUTS = [
  { file: '/ads/talking-website-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/talking-website-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/talking-website-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the website hero.' },
];

const TW_CHECKLIST = [
  { id: 'cell', label: 'Cell C: Campaign objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the audit UTM link above. Paste Copy Variant 1.' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize placements: 9:16 for Reels/Stories, 16:9 for in-stream.' },
  { id: 'audience', label: 'Audience: same Advantage+ setup as Call Me (small business owner interests, age 25-60, United States nationwide).' },
  { id: 'captions', label: 'Decline Meta auto-captions (the video has styled captions burned in).' },
  { id: 'organic', label: 'Post the 4:5 cut organically on FB + IG the same day (free reach, warms the page). Ask Claude for the drafts.' },
  { id: 'retarget', label: 'Day 3-4: add a retargeting ad set of 50% video viewers from BOTH commercials, pointed at the audit link. Works without the pixel.' },
  { id: 'review', label: 'Day 5-7: judge on cost per audit lead. Audit submissions land in the admin inbox tagged utm_campaign=talkingwebsite.' },
];

const CHECKLIST = [
  { id: 'pixel', label: 'Pixel (one-time): in Meta Events Manager copy the Pixel ID + create a Conversions API token, then paste both to Claude (or add NEXT_PUBLIC_META_PIXEL_ID + META_CONVERSIONS_API_TOKEN in Vercel and redeploy). Unlocks conversion tracking + retargeting. You can launch Cell A without it.' },
  { id: 'page', label: 'In Ads Manager, run ads from the Modern Mustard Seed Facebook Page with @modernmustardseed selected for Instagram.' },
  { id: 'cellA', label: 'Cell A (main): Campaign objective Leads → Calls. Budget $15/day. Upload the 4:5 cut, customize placements (9:16 for Reels/Stories). Call Now button → (406) 312-1223. Paste Copy Variant 1.' },
  { id: 'cellB', label: 'Cell B: Campaign objective Traffic (switch to Conversions once pixel is live). Budget $10/day. Same creative per placement. Learn More button → the UTM landing link below. Paste Copy Variant 2.' },
  { id: 'audience', label: 'Audience (both cells): Advantage+ audience. Suggestions only: Small business owners, Business owner, Restaurant owner, Home improvement. Age 25-60, United States. Do NOT restrict to Montana.' },
  { id: 'captions', label: 'Decline Meta auto-captions (the video has styled captions burned in).' },
  { id: 'organic', label: 'Post the 4:5 cut organically on FB + IG the same day (free reach, warms the page). Ask Claude for the drafts.' },
  { id: 'retarget', label: 'Day 3-4: create a Custom Audience of 50% video viewers and point a third ad set at them with the landing link. Works without the pixel.' },
  { id: 'review', label: 'Day 5-7: judge with the scale rules below. Check Callers for booked calls from the ad line.' },
];

// ============ Campaign three: MUSTARD MODE ============

const MM_LANDING = 'https://modernmustardseed.com/mustard-mode?utm_source=meta&utm_medium=paid&utm_campaign=mustardmode';

const MM_COPY_A = `Your software dreams have a coach now.

MUSTARD MODE is a personal AI coach that trains you to build real things with Claude: apps, websites, designs, whole businesses. Four tracks. 28 missions. The exact prompts a working studio runs every day.

No computer science degree. Just the Claude subscription you may already have.

Your first coaching session is free, right on the page. Type what you want to build and watch what happens.`;

const MM_COPY_B = `Everyone tells you AI will change everything. Nobody shows you the reps.

MUSTARD MODE does. A live AI coach (his name is Mr. Mustard), four tracks (Code, Design, Cowork, Ideate), 28 hands-on missions that each end with something real shipped, and the prompt library to run it all.

Play your first coaching session free on the page. If five minutes with the coach does not convince you, keep your money.`;

const MM_HEADLINE = 'One seed. 100x the output.';
const MM_DESCRIPTION = 'Your own AI coach for Claude. First session free, on the page.';

const MM_CUTS = [
  { file: '/ads/mustard-mode-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/mustard-mode-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/mustard-mode-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the landing hero.' },
];

const MM_CHECKLIST = [
  { id: 'cell', label: 'One cell to start: Campaign objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the MUSTARD MODE UTM link above. Paste Copy Variant 1.' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize placements: 9:16 for Reels/Stories, 16:9 for in-stream.' },
  { id: 'audience', label: 'Audience: Advantage+, but consumer-tilted vs the service campaigns. Suggestions: Entrepreneurship, Side project, Web development, ChatGPT/AI tools, Online courses. Age 22-55, United States.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled captions are burned in).' },
  { id: 'organic', label: 'Post the 9:16 cut as an organic Reel + the 4:5 to FB the same day (the launch post drafts are already written, ask Claude).' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 and let them fight. Kill the loser at day 6.' },
  { id: 'retarget', label: 'Day 3-4: retargeting ad set of 50% video viewers across ALL THREE commercials pointed at the MUSTARD MODE link. Builders who watched the service ads are this product’s warmest audience.' },
  { id: 'review', label: 'Day 5-7: judge on cost per free-play email (leads tagged source mustard-mode-free-play in the admin). The true metric: Stripe checkouts on Player/Builder, which land in Orders and email you on every sale.' },
];

// ============ Campaign four: The Fable Mind ============

const FM_LANDING = 'https://modernmustardseed.com/playbooks/fable-mind?utm_source=meta&utm_medium=paid&utm_campaign=fablemind';

const FM_COPY_A = `A frontier AI passed through our studio. It could not stay. So we wrote down its mind.

The Fable Mind Playbook is the exact system that makes an everyday AI think like the expensive one: the operating doctrine, the guard hook, the skeptic agent, and the multi-agent audit workflow. The same files running our studio right now.

It is free. Install it in ten minutes and watch your AI stop guessing and start verifying.`;

const FM_COPY_B = `You do not need the expensive AI for everything. You need its discipline.

We had a frontier model encode how it thinks into skills, hooks, and workflows that any model can run. The result: an everyday AI that verifies before it claims, finishes what it starts, and audits like a senior engineer.

The whole playbook is free. Copy, paste, done in ten minutes. And when the big models go to metered pricing, this is how you keep the bill small.`;

const FM_HEADLINE = 'Make any AI think like the big one.';
const FM_DESCRIPTION = 'The Fable Mind Playbook. Free from Modern Mustard Seed.';

const FM_CUTS = [
  { file: '/ads/fable-mind-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/fable-mind-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/fable-mind-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the blog/playbook hero.' },
];

const FM_CHECKLIST = [
  { id: 'cell', label: 'One cell to start: Campaign objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the playbook UTM link above. Paste Copy Variant 1.' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize placements: 9:16 for Reels/Stories, 16:9 for in-stream.' },
  { id: 'audience', label: 'Audience: Advantage+, builder-tilted. Suggestions: Entrepreneurship, Artificial intelligence, Software development, ChatGPT/AI tools, Small business owners. Age 22-60, United States.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled captions are burned in).' },
  { id: 'organic', label: 'Post the 9:16 cut as an organic Reel + the 4:5 to FB the same day. The blog post (/blog/when-the-frontier-model-visits) is the LinkedIn/X companion. Ask Claude for the drafts.' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the economics angle) and let them fight. Kill the loser at day 6.' },
  { id: 'retarget', label: 'Day 3-4: retargeting ad set of 50% video viewers across ALL FOUR commercials pointed at the playbook link. People who watched the service ads are exactly who steals playbooks.' },
  { id: 'review', label: 'Day 5-7: judge on cost per playbook email (the "Email this to me" captures land in Leads). The truth metric: booked calls and audit requests from playbook readers.' },
];

// ============ Campaign five: The Sidekick Forge ============

const SK_LANDING = 'https://modernmustardseed.com/sidekick?utm_source=meta&utm_medium=paid&utm_campaign=sidekick';

const SK_COPY_A = `Right now, someone is calling your business. Nobody's answering.

So we built the Sidekick Forge. Tell Mr. Mustard about your business (what you do, what you charge, what customers ask) and sixty seconds later your own AI receptionist graduates and talks to you. Live. In your browser. He can even call your cell.

The demo is free, no card. If you love him, he's answering your real phone 24/7 this week: hard-capped minutes, month to month, never a surprise bill.`;

const SK_COPY_B = `The average small business misses 4 in 10 calls. Every missed call dials your competitor next.

Your Sidekick answers every one: books appointments, takes clean messages, flags emergencies to your cell, and sends you a summary of every call. Trained on YOUR business in sixty seconds, live on your real line within a week.

Hear yours before you pay a cent. The forge is free and it is honestly just fun.`;

const SK_HEADLINE = 'Hear YOUR AI receptionist in 60 seconds.';
const SK_DESCRIPTION = 'Free demo. He talks. You decide. From Modern Mustard Seed.';

const SK_CUTS = [
  { file: '/ads/sidekick-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/sidekick-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/sidekick-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the landing hero.' },
];

const SK_CHECKLIST = [
  { id: 'cell', label: 'One cell to start: Campaign objective Traffic (switch to Conversions once the pixel is live). Budget $15/day. Learn More button → the forge UTM link above. Paste Copy Variant 1.' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize placements: 9:16 for Reels/Stories, 16:9 for in-stream.' },
  { id: 'audience', label: 'Audience: Advantage+, local-owner tilted. Suggestions: Small business owners, Restaurant owners, Home services, Salon owners, Missed call/answering service interest. Age 25-65, United States.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled captions are burned in).' },
  { id: 'organic', label: 'Post the 9:16 cut as an organic Reel + the 4:5 to FB the same day. Launch drafts are in social-drafts/sidekick-launch.md (ask Claude to fetch them).' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the missed-calls math) and let them fight. Kill the loser at day 6.' },
  { id: 'retarget', label: 'Day 3-4: retargeting ad set of 50% video viewers across all five commercials pointed at the forge. Call Me viewers are the hottest overlap.' },
  { id: 'capwatch', label: 'The free forge is capped at 20 demos/day globally. If ads fill the cap (email alert fires), raise GLOBAL_DAILY_CAP in app/api/sidekick/forge/route.ts before scaling spend.' },
  { id: 'review', label: 'Day 5-7: judge on cost per forged demo (leads tagged source sidekick-forge in the admin). The truth metric: Keep Him subscriptions, which email you on every sale, and booked calls from demo transcripts.' },
];

// ============ Campaigns six-eight: Pictures, Press, GEO (image creative) ============

const PX_LANDING = 'https://modernmustardseed.com/pictures?utm_source=meta&utm_medium=paid&utm_campaign=pictures';
const PX_COPY_A = `Most small businesses have never seen their story through a director's eyes.\n\nTake the free Screen Test: tell Mr. Mustard what you do and what you are proud of, and sixty seconds later you have a director's treatment for YOUR commercial: the logline, six shots, three taglines. Keep it either way.\n\nLove it? The finished cinematic spot is $197 and lands in about two days.`;
const PX_COPY_B = `A commercial used to cost $5,000 and a film crew.\n\nOurs start with a free Screen Test (your storyboard, directed on the spot) and finish at $197: three cuts, captions, score, full rights, delivered in about two business days. The same pipeline that makes our own spots.`;
const PX_HEADLINE = 'Your commercial, storyboarded free in 60 seconds.';
const PX_DESCRIPTION = 'The free Screen Test at MUSTARD PICTURES.';
const PX_IMAGES = [
  { file: '/ads/pictures-45.png', label: '4:5 — Feed', note: 'The workhorse feed placement.' },
  { file: '/ads/pictures-sq.png', label: '1:1 — Square', note: 'Right column, marketplace, catalog.' },
  { file: '/ads/sidekick-9x16.mp4', label: '9:16 video — borrow The Graduate', note: 'Until Pictures has its own spot, the studio-brand video warms the same audience.' },
];
const PX_CHECKLIST = [
  { id: 'cell', label: 'One Traffic cell at $10/day → the Screen Test UTM link. Paste Copy Variant 1, Learn More button.' },
  { id: 'placements', label: 'Upload the 4:5 image, customize 1:1 for right-column placements.' },
  { id: 'audience', label: 'Advantage+, owner-tilted: Small business owners, Video marketing, Advertising, Restaurant/salon/home-services interests. Age 25-65, US.' },
  { id: 'organic', label: 'Post the 4:5 card organically to FB/IG same day (drafts in social-drafts/studio-departments-launch.md).' },
  { id: 'abtest', label: 'Day 3: duplicate with Copy Variant 2 (the price-anchor angle). Kill the loser day 6.' },
  { id: 'review', label: 'Judge on cost per Screen Test (leads tagged pictures-screen-test). Truth metric: SPOT/PREMIERE orders.' },
];

const PR_LANDING = 'https://modernmustardseed.com/press?utm_source=meta&utm_medium=paid&utm_campaign=press';
const PR_COPY_A = `That menu taped to your counter? Ouch.\n\nPaste your price list at MUSTARD PRESS, exactly as it is, typos and all, and watch it become a print-ready page in about a minute. Free proof, every price preserved exactly. The clean file is $97, instant.`;
const PR_COPY_B = `The most-handled marketing a local business owns is the price list, and it is usually the ugliest.\n\nOur press typesets yours while you watch: real type, dot leaders, your prices exactly as written, reviewed by you before anything is final. Free proof. $97 for the clean print-ready file.`;
const PR_HEADLINE = 'Your price list, typeset like it matters. Free proof.';
const PR_DESCRIPTION = 'Paste it messy. Print it beautiful. MUSTARD PRESS.';
const PR_IMAGES = [
  { file: '/ads/press-45.png', label: '4:5 — Feed', note: 'Before/after energy: the paste becomes the page.' },
  { file: '/ads/press-sq.png', label: '1:1 — Square', note: 'The Ouch card. Strong stop-scroll.' },
  { file: '/press/sample-salon.png', label: 'Extra proof sample', note: 'Salon proof for carousel slot 2 (pair with the diner).' },
];
const PR_CHECKLIST = [
  { id: 'cell', label: 'One Traffic cell at $10/day → the press UTM link. Copy Variant 1, Learn More button.' },
  { id: 'carousel', label: 'Best format: carousel (Ouch card → diner proof → salon proof → CTA card).' },
  { id: 'audience', label: 'Advantage+, local-owner tilted: Restaurant owners, Salon owners, Menu, Small business. Age 25-65, US.' },
  { id: 'organic', label: 'Post the 4:5 card + a sample proof organically same day.' },
  { id: 'outreach', label: 'The 2-cent play: run a warm contact\'s REAL menu through /press and email them their own proof.' },
  { id: 'review', label: 'Judge on cost per proof run (leads tagged press-proof; each carries their full price catalog). Truth metric: $97 PIECE orders, which fulfill themselves.' },
];

const GEO_LANDING = 'https://modernmustardseed.com/website-audit?utm_source=meta&utm_medium=paid&utm_campaign=geodesk';
const GEO_COPY_A = `Ask ChatGPT about businesses like yours. Are you in the answer?\n\nAI engines answer your customers' questions by reading structured signals most local sites never installed. Our free audit grades yours in 60 seconds, seven categories, brutal honesty included.\n\nIf you score low: the $297 Fix Pack writes every missing signal for your site, ready to paste, with re-scans to prove the climb.`;
const GEO_COPY_B = `We graded five local businesses this week: one D, three F's, and one site that had been silently hijacked by spam without the owner knowing.\n\nYour website gets found (or not) by AI now. The free 60-second audit tells you where you stand. The fixes are a copy-paste away.`;
const GEO_HEADLINE = 'Is your business invisible to ChatGPT?';
const GEO_DESCRIPTION = 'Free AI-findability grade in 60 seconds.';
const GEO_IMAGES = [
  { file: '/ads/geo-45.png', label: '4:5 — Feed', note: 'The F stamp. Fear + fix in one card.' },
  { file: '/ads/geo-sq.png', label: '1:1 — Square', note: 'Right column and marketplace.' },
];
const GEO_CHECKLIST = [
  { id: 'cell', label: 'One Traffic cell at $10/day → the audit UTM link. Copy Variant 1, Learn More button.' },
  { id: 'audience', label: 'Advantage+, broad small-business: Small business owners, Marketing, SEO, ChatGPT interest. Age 25-65, US.' },
  { id: 'honest', label: 'COPY LAW: never promise rankings or "get recommended by ChatGPT." Sell the grade, the installed signals, the monitoring. This is a ship-gate rule, keep it in ad edits too.' },
  { id: 'organic', label: 'Organic angle that always works: post a (permission-granted or anonymized) real report card screenshot.' },
  { id: 'abtest', label: 'Day 3: Copy Variant 2 (the local-graded-five story). Kill the loser day 6.' },
  { id: 'review', label: 'Judge on cost per audit run. Truth metric: Fix Pack orders (instant fulfillment) and Watch subscriptions.' },
];

// ============ Campaign nine: The Good News (brand film, the Mustard family) ============

const GN_LANDING = 'https://modernmustardseed.com/demos?utm_source=meta&utm_medium=paid&utm_campaign=goodnews';

const GN_COPY_A = `You want the good news, or the bad news?

Bad news first: every call your business misses, every lead that slips through the cracks, is revenue walking out the door. And chasing all of it yourself costs you the nights, the weekends, the dinners you meant to be home for.

Here's the good news. We build the systems that catch it all: a website that sells, an AI voice agent that answers every call day and night, and custom software that does the busywork for you. The revenue you were leaking comes back. And you get your life back.

Start with a free AI audit and see exactly what your business is leaving on the table.`;

const GN_COPY_B = `Your business should grow while you're at the dinner table, not because you skipped it again.

Modern Mustard Seed builds the systems that run it for you: a website that sells around the clock, an AI voice agent that answers every call day and night, and custom software that automates the work you keep doing by hand. You recover the revenue you were leaking, and you finally get your evenings back.

See what yours is missing. The AI audit is free, and it takes about a minute.`;

const GN_HEADLINE = 'Grow your business. Get your life back.';
const GN_DESCRIPTION = 'AI websites, voice agents, and custom software. Built by Modern Mustard Seed.';

const GN_CUTS = [
  { file: '/ads/good-news-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/good-news-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical. Doubles as an IG Reel + YouTube Short.' },
  { file: '/ads/good-news-16x9.mp4', label: '16:9 — In-stream + Google', note: 'Video feeds, YouTube / Google video, and the website hero.' },
  { file: '/ads/good-news-short-9x16.mp4', label: '9:16 — Short cut (~:20)', note: 'Punchy hook + payoff + CTA. For Reels / Stories / Shorts A-B tests.' },
];

const GN_CHECKLIST = [
  { id: 'cell', label: 'Cell A (Meta): Campaign objective Traffic (switch to Conversions once the pixel is live). Budget $15/day. Learn More button → the audit UTM link above. Paste Copy Variant 1 (the good-news / bad-news story).' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize per placement: 9:16 for Reels/Stories, 16:9 for in-stream. The video has spoken dialogue AND burned-in captions, so it lands sound-on and muted.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled caption pills are already burned in).' },
  { id: 'audience', label: 'Audience: Advantage+, broad. This is the brand film, keep it wide. Suggestions: Small business owners, Business owner, Restaurant owner, Home services, Entrepreneurship. Age 25-60, United States.' },
  { id: 'google', label: 'Google (optional, the reason for the 16:9 cut): run it as a YouTube / Demand Gen video ad. Same audit landing, swap the link to utm_source=google. Objective: Leads or Traffic.' },
  { id: 'organic', label: 'Post the 4:5 to FB, the 9:16 as an IG Reel + a YouTube Short the same day (free reach, and this one is made to be shared). Ask Claude for the launch drafts.' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the time-back angle) and let them fight. Kill the loser at day 6.' },
  { id: 'retarget', label: 'Day 3-4: retargeting ad set of 50% video viewers pointed at the audit link. This brand film is the top of the funnel that warms every other campaign (Call Me, Sidekick, the audit).' },
  { id: 'review', label: 'Day 5-7: judge on cost per audit lead (utm_campaign=goodnews, lands in Leads + the admin Inbox). Truth metric: booked discovery calls from those leads.' },
];

// ============ Campaign ten: Find Your Horizon (partner recruiting, the yacht) ============

const PY_LANDING = 'https://modernmustardseed.com/partners?utm_source=meta&utm_medium=paid&utm_campaign=partneryacht';

const PY_COPY_A = `How does a little seed end up on a yacht in the Mediterranean?

He sells the one thing every business on earth suddenly needs: an AI website, a voice agent that answers the phone, and custom software that runs the busywork. Modern Mustard Seed builds all of it. You just open the door.

Refer a client, we build it, you earn: up to 50% on our products, and recurring income every month on the ones that renew. You make the introductions from anywhere. We do the work.

Become a partner and come find your own horizon.`;

const PY_COPY_B = `Everyone knows AI is the wave. Almost nobody is positioned to sell it.

You could be. Modern Mustard Seed builds the AI websites, voice agents, and custom software every local business now needs, and we pay our partners generously to open the doors: up to 50% on products, recurring monthly income on subscriptions, and commission on every build.

No coding. No inventory. No overhead. You make the introduction, we deliver, you get paid, again and again.

Become a partner. This is the part where you get your time and your money back.`;

const PY_HEADLINE = 'Sell what every business now needs.';
const PY_DESCRIPTION = 'Become a Modern Mustard Seed partner. Up to 50% + recurring income.';

const PY_CUTS = [
  { file: '/ads/partner-yacht-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/partner-yacht-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical. Doubles as an IG Reel + YouTube Short.' },
  { file: '/ads/partner-yacht-16x9.mp4', label: '16:9 — In-stream + Google', note: 'Video feeds, YouTube / Google video, and the partners page hero.' },
  { file: '/ads/partner-yacht-short-9x16.mp4', label: '9:16 — Short cut (~:20)', note: 'Punchy hook + payoff + CTA. For Reels / Stories / Shorts A-B tests.' },
];

const PY_CHECKLIST = [
  { id: 'cell', label: 'Cell A (Meta): objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the partners UTM link above. Paste Copy Variant 1 (the yacht dream).' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize per placement: 9:16 for Reels/Stories, 16:9 for in-stream. The spot talks AND has burned-in captions.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled caption pills are already burned in).' },
  { id: 'audience', label: 'AUDIENCE IS DIFFERENT: this recruits future partners, not customers. Advantage+, tilted to Affiliate marketing, Entrepreneurship, Side hustle, Freelance, Digital marketing, Sales, and relationship sellers (real estate, insurance). Age 22-55, United States.' },
  { id: 'google', label: 'Google (optional, the reason for the 16:9 cut): run it as a YouTube / Demand Gen video ad. Same /partners landing, swap the link to utm_source=google.' },
  { id: 'organic', label: 'Post the 9:16 as an IG Reel + YouTube Short and the 4:5 to FB. Then DM it to the warm partner-target board (docs/partner-targets.md, 75+ verified). Ask Claude for the outreach drafts (Sarah approves every send).' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the why-now / positioning angle) and let them fight. Kill the loser at day 6.' },
  { id: 'review', label: 'Day 5-7: judge on cost per partner application (applicants land in /admin/partners). Truth metric: approved partners who then drive booked calls via their /book?ref=CODE link. The whole program goal is appointments on Sarah\'s calendar.' },
];

// ============ Campaign eleven: The Dinner Rush (restaurant vertical, bilingual voice agent) ============

const RS_LANDING = 'https://modernmustardseed.com/demos?utm_source=meta&utm_medium=paid&utm_campaign=dinnerrush';

const RS_COPY_A = `Friday night. Every table is full. And the phone will not stop ringing.

Every missed call is a table you did not book, or a regular who gave up and called somewhere else. You cannot cook the pasta and answer the phone. Nobody can.

So let our AI answer every call and book every table for you, day and night, in English AND in Italian, or whatever language your guests speak. You cook. It books.

Hear it live and see what your restaurant is missing.`;

const RS_COPY_B = `Your best table is the one you never booked, because nobody could get to the phone during the rush.

Modern Mustard Seed builds AI voice agents for restaurants that answer every call, take reservations and to-go orders, and handle the dinner rush without missing a ring. Bilingual out of the box, so the call that comes in Italian gets answered in Italian.

You run the kitchen. It runs the phone. Buonissimo.

Hear a live demo in 60 seconds.`;

const RS_HEADLINE = 'You cook. He books. In any language.';
const RS_DESCRIPTION = 'AI voice agents for restaurants. Answer every call, book every table.';

const RS_CUTS = [
  { file: '/ads/restaurant-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/restaurant-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical. Doubles as an IG Reel + YouTube Short.' },
  { file: '/ads/restaurant-16x9.mp4', label: '16:9 — In-stream + Google', note: 'Video feeds, YouTube / Google video, and the restaurants page hero.' },
  { file: '/ads/restaurant-short-9x16.mp4', label: '9:16 — Short cut (~:20)', note: 'Punchy hook + payoff + CTA. For Reels / Stories / Shorts A-B tests.' },
];

const RS_CHECKLIST = [
  { id: 'cell', label: 'Cell A (Meta): objective Traffic (switch to Leads/Calls once the pixel is live). Budget $10/day. Learn More button → the restaurants UTM link above. Paste Copy Variant 1 (the dinner-rush story).' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize per placement: 9:16 for Reels/Stories, 16:9 for in-stream. The spot talks (English + Italian in beat 3) AND has burned-in captions.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled caption pills are already burned in).' },
  { id: 'audience', label: 'Audience: Advantage+, restaurant-owner tilted. Suggestions: Restaurant owners, Restaurant, Food service, Hospitality, Small business owners. Age 25-65, United States. Worth a test layer for Italian / ethnic-restaurant interests given the bilingual angle.' },
  { id: 'demo', label: 'Strong alt CTA for a voice ad: point a second cell at /voice-agents where they can HEAR the live agent (the ad is the demo). Same creative, utm_campaign=dinnerrush-demo.' },
  { id: 'google', label: 'Google (optional, the reason for the 16:9 cut): run it as a YouTube / Demand Gen video ad. Same landing, swap the link to utm_source=google.' },
  { id: 'organic', label: 'Post the 9:16 as an IG Reel + YouTube Short and the 4:5 to FB. The 2-cent play: run a real local restaurant\'s number through a demo agent and send the owner a clip. Ask Claude for the outreach drafts.' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the versatility / bilingual angle) and let them fight. Kill the loser at day 6.' },
  { id: 'review', label: 'Day 5-7: judge on cost per lead (utm_campaign=dinnerrush, lands in Leads + the admin Inbox). Truth metric: booked demos and restaurant voice-agent subscriptions.' },
];

// ============ Campaign twelve: The Unveiling (demo funnel, the gallery) ============

const UNV_LANDING = 'https://modernmustardseed.com/demos?utm_source=meta&utm_medium=paid&utm_campaign=unveiling';

const UNV_COPY_A = `Most companies ask you to pay first and imagine the rest. We do the opposite.

Tell us about your business (it takes about 60 seconds) and we build your demos first: a real working website, an AI receptionist that answers actual calls, and a command center with your business inside it. Built for you, with your name on them, free.

Then you walk your own gallery. If you love what we built, we make it real. If not, it cost you a minute.

Your unveiling is waiting.`;

const UNV_COPY_B = `You would never buy a car without driving it. So why would you buy a website, an AI receptionist, or business software without seeing YOURS working first?

Modern Mustard Seed builds your demos before you pay anything: your website, your AI receptionist answering a real call, your command center running the numbers. Sixty seconds to tell us about your business. The demos are on us.

See them working. Then make it real.`;

const UNV_HEADLINE = 'We build yours first. Free.';
const UNV_DESCRIPTION = 'A real website, AI receptionist, and command center, built for your business before you pay.';

const UNV_CUTS = [
  { file: '/ads/unveiling-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/unveiling-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical. Doubles as an IG Reel + YouTube Short.' },
  { file: '/ads/unveiling-16x9.mp4', label: '16:9 — In-stream + Google', note: 'Video feeds, YouTube / Google video, and the demos page hero.' },
  { file: '/ads/unveiling-short-9x16.mp4', label: '9:16 — Short cut (~:20)', note: 'Punchy hook + offer + CTA. For Reels / Stories / Shorts A-B tests.' },
];

const UNV_FB_POST = `Tonight, an unveiling. 🥂

Most companies ask you to pay first and imagine the rest. We flipped it.

Tell us about your business (60 seconds, that is the whole form) and we build your demos first: a real working website, an AI receptionist that answers actual calls, and a command center with your business inside it. Your name on all three. Free to see working.

If you love them, we make them real. If not, it cost you a minute.

Mr. and Mrs. Mustard will show you around the gallery. 🌱

Your unveiling is waiting: modernmustardseed.com/demos?utm_source=facebook&utm_medium=organic&utm_campaign=unveiling`;

const UNV_IG_CAPTION = `Tonight, an unveiling 🥂

We build your demos FIRST. A real website. An AI receptionist that answers actual calls. A command center with your business inside it.

Free to see working. You only pay to make them real.

60 seconds at modernmustardseed.com/demos (link in bio) and Mr. & Mrs. Mustard will meet you at the gallery doors. 🌱

#smallbusiness #aireceptionist #websitedesign #entrepreneur #automation`;

const UNV_IG_STORY = `We built something for you. No, really. For you. 🥂 Sixty seconds → your website, your AI receptionist, your command center. Working demos, free. Sticker link → modernmustardseed.com/demos`;

const UNV_CHECKLIST = [
  { id: 'cell', label: 'Cell A (Meta): objective Traffic (switch to Conversions once the pixel is live). Budget $15/day. Learn More button → the demos UTM link above. Paste Copy Variant 1 (the unveiling story).' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize per placement: 9:16 for Reels/Stories, 16:9 for in-stream. The spot has spoken dialogue AND burned-in captions, so it lands sound-on and muted.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled caption pills are already burned in).' },
  { id: 'honest', label: 'COPY LAW: the DEMOS are free, going live is setup + monthly from day one. Never write "free trial" or "free website" in any edit. The demo was the trial.' },
  { id: 'audience', label: 'Audience: Advantage+, broad small-business. Suggestions: Small business owners, Business owner, Home services, Restaurant owner, Contractors, Entrepreneurship. Age 25-65, United States.' },
  { id: 'google', label: 'Google (optional, the reason for the 16:9 cut): run it as a YouTube / Demand Gen video ad. Same /demos landing, swap the link to utm_source=google.' },
  { id: 'organic', label: 'Post the 4:5 to FB and the 9:16 as an IG Reel + a YouTube Short the same day (free reach). The FB post, IG caption, and IG Story line are ready to paste in the "Organic launch posts" section below.' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the test-drive angle) and let them fight. Kill the loser at day 6.' },
  { id: 'retarget', label: 'Day 3-4: retargeting ad set of 50% video viewers pointed at the same /demos link. Anyone who watched the unveiling but did not forge gets the second knock.' },
  { id: 'review', label: 'Day 5-7: judge on cost per forged demo (station_submit / station_forged in Vercel Analytics, leads land in the cockpit under source=demo-station). Truth metric: paid demo orders on the hub order card.' },
];

// ============ Campaign thirteen: The Unveiling: Restaurants (demo funnel vertical) ============

const UR_LANDING = 'https://modernmustardseed.com/demos?utm_source=meta&utm_medium=paid&utm_campaign=unveilingrest';

const UR_COPY_A = `Tonight's tasting menu was made for one table. Yours.

Tell us about your restaurant (60 seconds, that is the whole form) and we build your demos first: a website that makes people hungry, an AI host that answers every call and books every table even during the dinner rush, and a command center that runs the house. Your restaurant's name on all three. Free to see working.

If you love them, we make them real. If not, dinner was on us.

Your table is already set.`;

const UR_COPY_B = `Friday night. Every table full. The phone ringing into nothing.

Every missed call is a four-top eating somewhere else right now. So before you pay us anything, we build your fix and let you taste it: your website, your AI host answering a real call for YOUR restaurant, your command center with the whole house in it.

Sixty seconds to tell us about your place. The demos are on the house.

See them working. Then make them real.`;

const UR_HEADLINE = 'We build yours first. On the house.';
const UR_DESCRIPTION = 'A website, an AI host, and a command center, built for your restaurant before you pay.';

const UR_CUTS = [
  { file: '/ads/unveiling-rest-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/unveiling-rest-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical. Doubles as an IG Reel + YouTube Short.' },
  { file: '/ads/unveiling-rest-16x9.mp4', label: '16:9 — In-stream + Google', note: 'Video feeds, YouTube / Google video, and the demos page hero.' },
  { file: '/ads/unveiling-rest-short-9x16.mp4', label: '9:16 — Short cut (~:20)', note: 'Punchy hook + offer + CTA. For Reels / Stories / Shorts A-B tests.' },
];

const UR_CHECKLIST = [
  { id: 'cell', label: 'Cell A (Meta): objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the demos UTM link above. Paste Copy Variant 1 (the tasting story).' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize per placement: 9:16 for Reels/Stories, 16:9 for in-stream. The spot has spoken dialogue AND burned-in captions.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled caption pills are already burned in).' },
  { id: 'honest', label: 'COPY LAW: the DEMOS are free, going live is setup + monthly from day one. Never write "free trial" or "free website" in any edit.' },
  { id: 'audience', label: 'Audience: Advantage+, restaurant-owner tilted. Suggestions: Restaurant owners, Restaurant, Food service, Hospitality, Small business owners. Age 25-65, United States.' },
  { id: 'sibling', label: 'Mind Campaign 11 (The Dinner Rush): same audience, different offer. Do not run both cold cells at once. Either alternate weeks, or run Dinner Rush as the voice-only angle and this as the full-suite angle and let cost per lead pick the winner.' },
  { id: 'organic', label: 'Organic: post the 9:16 as a Reel and share the 4:5 into local restaurant-owner FB groups where you are a member. Add the trattoria clip to the /for/restaurants page hero rotation.' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the Friday-night phone) and let them fight. Kill the loser at day 6.' },
  { id: 'review', label: 'Day 5-7: judge on cost per forged demo (leads land in the cockpit under source=demo-station, utm_campaign=unveilingrest). Truth metric: paid demo orders on the hub order card.' },
];

// ============ Campaign fourteen: The Unveiling: Roofers (demo funnel vertical) ============

const UF_LANDING = 'https://modernmustardseed.com/demos?utm_source=meta&utm_medium=paid&utm_campaign=unveilingroof';

const UF_COPY_A = `We climbed onto the roof for this one.

Tell us about your roofing company (60 seconds, that is the whole form) and we build your demos first: a website that wins the click before your competitor's does, a receptionist that catches every call while your hands are full of shingles, and a command center that runs the crew: estimates, jobs, the money. Your company's name on all three. Free to see working.

Love them? We make them real. If not, it cost you a coffee break.

We left the ladder out for you.`;

const UF_COPY_B = `You cannot answer the phone forty feet up a ladder. But somebody is calling a roofer right now.

Whoever picks up first usually wins the job. So we built the fix, and we will build YOURS free before you pay a cent: your website, your AI receptionist answering a real call, your command center tracking every estimate and every dollar.

Sixty seconds to tell us about your company. See your demos working, then make them real.`;

const UF_HEADLINE = 'Every call caught. Even on the roof.';
const UF_DESCRIPTION = 'A website, an AI receptionist, and a command center, built for your roofing company before you pay.';

const UF_CUTS = [
  { file: '/ads/unveiling-roof-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/unveiling-roof-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical. Doubles as an IG Reel + YouTube Short.' },
  { file: '/ads/unveiling-roof-16x9.mp4', label: '16:9 — In-stream + Google', note: 'Video feeds, YouTube / Google video, and the demos page hero.' },
  { file: '/ads/unveiling-roof-short-9x16.mp4', label: '9:16 — Short cut (~:20)', note: 'Punchy hook + offer + CTA. For Reels / Stories / Shorts A-B tests.' },
];

const UF_CHECKLIST = [
  { id: 'cell', label: 'Cell A (Meta): objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the demos UTM link above. Paste Copy Variant 1 (the rooftop reveal).' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize per placement: 9:16 for Reels/Stories, 16:9 for in-stream. The spot has spoken dialogue AND burned-in captions.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled caption pills are already burned in).' },
  { id: 'honest', label: 'COPY LAW: the DEMOS are free, going live is setup + monthly from day one. Never write "free trial" or "free website" in any edit.' },
  { id: 'audience', label: 'Audience: Advantage+, contractor tilted. Suggestions: Roofing, Roofer, Construction, General contractor, Home improvement, Small business owners. Age 25-60, United States.' },
  { id: 'seasonal', label: 'Seasonality: roofing demand spikes after storms and in re-roof season. Keep a saved duplicate of this cell you can 3x for a week when a hail event hits a metro you can serve remotely.' },
  { id: 'organic', label: 'Organic: post the 9:16 as a Reel and share the 4:5 into roofing and contractor FB groups where you are a member. This one is also a natural DM opener for cockpit roofing leads.' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (forty feet up) and let them fight. Kill the loser at day 6.' },
  { id: 'review', label: 'Day 5-7: judge on cost per forged demo (leads land in the cockpit under source=demo-station, utm_campaign=unveilingroof). Truth metric: paid demo orders on the hub order card.' },
];

// ============ Campaign fifteen: Take the Bridge (demo funnel, retro starship) ============

const BR_LANDING = 'https://modernmustardseed.com/demos?utm_source=meta&utm_medium=paid&utm_campaign=takethebridge';

const BR_COPY_A = `Captain's log: the owner is still answering his own phone, patching his own website at midnight, and running the books from memory.

There is a better way to fly. Tell us about your business (sixty seconds, that is the whole form) and we build your demos first: a website worth putting on the big screen, an AI receptionist that answers every hail (day, night, or warp speed), and a command center that runs the whole business from one chair.

All three. Free. Working. Before you pay a cent.

Set a course. Your bridge is waiting.`;

const BR_COPY_B = `Every great captain has a crew. You have been flying solo.

Modern Mustard Seed builds yours: a website that sells while you sleep, an AI receptionist that never leaves its post, and a command center that puts jobs, orders, and money on one screen. We build all three for your business first, free, and you see them working before any money changes hands.

Take the bridge. It takes sixty seconds.`;

const BR_HEADLINE = 'Take the bridge of your business.';
const BR_DESCRIPTION = 'A website, an AI receptionist, and a command center. Built free first, for any business.';

const BR_CUTS = [
  { file: '/ads/bridge-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/bridge-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical. Doubles as an IG Reel + YouTube Short.' },
  { file: '/ads/bridge-16x9.mp4', label: '16:9 — In-stream + Google', note: 'Video feeds, YouTube / Google video, and the demos page hero.' },
  { file: '/ads/bridge-short-9x16.mp4', label: '9:16 — Short cut (~:20)', note: 'Punchy hook + offer + CTA. For Reels / Stories / Shorts A-B tests.' },
];

const BR_CHECKLIST = [
  { id: 'cell', label: 'Cell A (Meta): objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the demos UTM link above. Paste Copy Variant 1 (the captain\'s log).' },
  { id: 'challenger', label: 'This is a CHALLENGER to Campaign 12 (same broad audience, same /demos landing, different creative). Do not run both cold cells at once: A/B them for a week and keep the cheaper cost per forged demo.' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize per placement: 9:16 for Reels/Stories, 16:9 for in-stream. The spot has spoken dialogue AND burned-in captions.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled caption pills are already burned in).' },
  { id: 'honest', label: 'COPY LAW: the DEMOS are free, going live is setup + monthly from day one. Never write "free trial" in any edit.' },
  { id: 'audience', label: 'Audience: Advantage+, broad small-business. The creative self-selects the nostalgia crowd (skews men 30-60). Worth one test ad set layered with Science fiction, Space exploration, Classic television, Retro gaming interests.' },
  { id: 'google', label: 'Google (optional, the reason for the 16:9 cut): run it as a YouTube / Demand Gen video ad. Same /demos landing, swap the link to utm_source=google.' },
  { id: 'organic', label: 'Organic: this one is built to be shared. Post the 9:16 as a Reel + YouTube Short and the 4:5 to FB the same day. Ask Claude for launch drafts (Sarah approves every post).' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the crew angle) and let them fight. Kill the loser at day 6.' },
  { id: 'review', label: 'Day 5-7: judge on cost per forged demo (leads land in the cockpit under source=demo-station, utm_campaign=takethebridge). Truth metric: paid demo orders on the hub order card.' },
];

function CopyBlock({ title, text }: { title: string; text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch { /* clipboard blocked */ }
  };
  return (
    <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">{title}</span>
        <button
          onClick={copy}
          className="text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
        >
          {done ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-[#161616]/85 whitespace-pre-line leading-relaxed font-sans">{text}</p>
    </div>
  );
}

type AdsTab = 'callme' | 'tw' | 'mm' | 'fm' | 'sk' | 'px' | 'pr' | 'geo' | 'gn' | 'py' | 'rest' | 'unv' | 'unvr' | 'unvf' | 'brg' | 'results';

const TABS: { key: AdsTab; num: string; label: string; blurb: string }[] = [
  { key: 'callme', num: '01', label: 'Call Me', blurb: 'Voice agents · call objective · $25/day' },
  { key: 'tw', num: '02', label: 'Talking Website', blurb: 'Full system · audit funnel · $10/day' },
  { key: 'mm', num: '03', label: 'MUSTARD MODE', blurb: 'The product · free-play funnel · $10/day' },
  { key: 'fm', num: '04', label: 'The Fable Mind', blurb: 'Free playbook · lead magnet · $10/day' },
  { key: 'sk', num: '05', label: 'Sidekick Forge', blurb: 'Instant demo · forge funnel · $15/day' },
  { key: 'px', num: '06', label: 'Pictures', blurb: 'Screen Test funnel · image ads · $10/day' },
  { key: 'pr', num: '07', label: 'Press', blurb: 'Proof funnel · image ads · $10/day' },
  { key: 'geo', num: '08', label: 'GEO Desk', blurb: 'Audit funnel · image ads · $10/day' },
  { key: 'gn', num: '09', label: 'The Good News', blurb: 'Brand film · the family · all 3 offerings · $15/day' },
  { key: 'py', num: '10', label: 'Find Your Horizon', blurb: 'Partner recruiting · the yacht · $10/day' },
  { key: 'rest', num: '11', label: 'The Dinner Rush', blurb: 'Restaurants · bilingual voice agent · $10/day' },
  { key: 'unv', num: '12', label: 'The Unveiling', blurb: 'Demo funnel · the gallery · $15/day' },
  { key: 'unvr', num: '13', label: 'Unveiling: Restaurants', blurb: 'Demo funnel · the chef\'s table · $10/day' },
  { key: 'unvf', num: '14', label: 'Unveiling: Roofers', blurb: 'Demo funnel · the rooftop reveal · $10/day' },
  { key: 'brg', num: '15', label: 'Take the Bridge', blurb: 'Demo funnel · retro starship · $10/day' },
  { key: 'results', num: '📊', label: 'Results', blurb: 'How to read them all together' },
];

/** Image-creative campaign tab (Pictures / Press / GEO share this shape). */
function ImageCampaign({
  num, title, tagline, blurb, landingLabel, landingHref, images, copyA, copyALabel, copyB, copyBLabel, headline, description, landing, checklist, checked, onToggle, done,
}: {
  num: string; title: string; tagline: string; blurb: string;
  landingLabel: string; landingHref: string;
  images: { file: string; label: string; note: string }[];
  copyA: string; copyALabel: string; copyB: string; copyBLabel: string;
  headline: string; description: string; landing: string;
  checklist: { id: string; label: string }[];
  checked: Record<string, boolean>; onToggle: (id: string) => void; done: number;
}) {
  return (<>
    <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
      <div className="relative">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign {num}</span>
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
          &ldquo;{title}&rdquo; <span className="italic text-[#F5B700]">{tagline}</span>
        </h2>
        <p className="text-white/75 mt-3 max-w-3xl font-sans">{blurb}</p>
        <div className="flex flex-wrap gap-3 mt-5">
          <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
          <a href={landingHref} className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">{landingLabel}</a>
          <a href="/admin/leads" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Leads</a>
        </div>
      </div>
    </section>

    <section>
      <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative</h3>
      <p className="text-sm text-[#161616]/65 mb-5 font-sans">Image ads (no video needed for this funnel). Right-click to save.</p>
      <div className="grid md:grid-cols-3 gap-5">
        {images.map((c) => (
          <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
            {c.file.endsWith('.mp4') ? (
              <video controls preload="metadata" className="w-full border border-[#161616] bg-black" src={c.file} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.file} alt={c.label} className="w-full border border-[#161616]" />
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
              </div>
              <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
      <div className="grid md:grid-cols-2 gap-5">
        <CopyBlock title={copyALabel} text={copyA} />
        <CopyBlock title={copyBLabel} text={copyB} />
        <CopyBlock title="Headline" text={headline} />
        <CopyBlock title="Description" text={description} />
        <CopyBlock title="Landing link with UTM" text={landing} />
      </div>
    </section>

    <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
        <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{done}/{checklist.length}</span>
      </div>
      <ol className="space-y-3">
        {checklist.map((item, i) => (
          <li key={item.id}>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={!!checked[item.id]} onChange={() => onToggle(item.id)} className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0" />
              <span className={`text-sm font-sans leading-relaxed ${checked[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                {item.label}
              </span>
            </label>
          </li>
        ))}
      </ol>
    </section>
  </>);
}

export default function AdsPlaybook() {
  const [tab, setTab] = useState<AdsTab>('callme');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [checkedTw, setCheckedTw] = useState<Record<string, boolean>>({});
  const [checkedMm, setCheckedMm] = useState<Record<string, boolean>>({});
  const [checkedFm, setCheckedFm] = useState<Record<string, boolean>>({});
  const [checkedSk, setCheckedSk] = useState<Record<string, boolean>>({});
  const [checkedPx, setCheckedPx] = useState<Record<string, boolean>>({});
  const [checkedPr, setCheckedPr] = useState<Record<string, boolean>>({});
  const [checkedGeo, setCheckedGeo] = useState<Record<string, boolean>>({});
  const [checkedGn, setCheckedGn] = useState<Record<string, boolean>>({});
  const [checkedPy, setCheckedPy] = useState<Record<string, boolean>>({});
  const [checkedRs, setCheckedRs] = useState<Record<string, boolean>>({});
  const [checkedUnv, setCheckedUnv] = useState<Record<string, boolean>>({});
  const [checkedUnvr, setCheckedUnvr] = useState<Record<string, boolean>>({});
  const [checkedUnvf, setCheckedUnvf] = useState<Record<string, boolean>>({});
  const [checkedBrg, setCheckedBrg] = useState<Record<string, boolean>>({});

  // Remember the campaign you were working in.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mms-ads-tab') as AdsTab | null;
      if (saved && TABS.some((t) => t.key === saved)) setTab(saved);
    } catch { /* first visit */ }
  }, []);
  const switchTab = (t: AdsTab) => {
    setTab(t);
    try { localStorage.setItem('mms-ads-tab', t); } catch { /* private mode */ }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mms-ads-checklist');
      if (raw) setChecked(JSON.parse(raw));
      const rawTw = localStorage.getItem('mms-ads-checklist-tw');
      if (rawTw) setCheckedTw(JSON.parse(rawTw));
      const rawMm = localStorage.getItem('mms-ads-checklist-mm');
      if (rawMm) setCheckedMm(JSON.parse(rawMm));
      const rawFm = localStorage.getItem('mms-ads-checklist-fm');
      if (rawFm) setCheckedFm(JSON.parse(rawFm));
      const rawSk = localStorage.getItem('mms-ads-checklist-sk');
      if (rawSk) setCheckedSk(JSON.parse(rawSk));
      const rawPx = localStorage.getItem('mms-ads-checklist-px');
      if (rawPx) setCheckedPx(JSON.parse(rawPx));
      const rawPr = localStorage.getItem('mms-ads-checklist-pr');
      if (rawPr) setCheckedPr(JSON.parse(rawPr));
      const rawGeo = localStorage.getItem('mms-ads-checklist-geo');
      if (rawGeo) setCheckedGeo(JSON.parse(rawGeo));
      const rawGn = localStorage.getItem('mms-ads-checklist-gn');
      if (rawGn) setCheckedGn(JSON.parse(rawGn));
      const rawPy = localStorage.getItem('mms-ads-checklist-py');
      if (rawPy) setCheckedPy(JSON.parse(rawPy));
      const rawRs = localStorage.getItem('mms-ads-checklist-rest');
      if (rawRs) setCheckedRs(JSON.parse(rawRs));
      const rawUnv = localStorage.getItem('mms-ads-checklist-unv');
      if (rawUnv) setCheckedUnv(JSON.parse(rawUnv));
      const rawUnvr = localStorage.getItem('mms-ads-checklist-unvr');
      if (rawUnvr) setCheckedUnvr(JSON.parse(rawUnvr));
      const rawUnvf = localStorage.getItem('mms-ads-checklist-unvf');
      if (rawUnvf) setCheckedUnvf(JSON.parse(rawUnvf));
      const rawBrg = localStorage.getItem('mms-ads-checklist-brg');
      if (rawBrg) setCheckedBrg(JSON.parse(rawBrg));
    } catch { /* first visit */ }
  }, []);

  const mkToggle = (key: string, set: React.Dispatch<React.SetStateAction<Record<string, boolean>>>) => (id: string) => {
    set((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };
  const togglePx = mkToggle('mms-ads-checklist-px', setCheckedPx);
  const togglePr = mkToggle('mms-ads-checklist-pr', setCheckedPr);
  const toggleGeo = mkToggle('mms-ads-checklist-geo', setCheckedGeo);
  const toggleGn = mkToggle('mms-ads-checklist-gn', setCheckedGn);
  const togglePy = mkToggle('mms-ads-checklist-py', setCheckedPy);
  const toggleRs = mkToggle('mms-ads-checklist-rest', setCheckedRs);
  const toggleUnv = mkToggle('mms-ads-checklist-unv', setCheckedUnv);
  const toggleUnvr = mkToggle('mms-ads-checklist-unvr', setCheckedUnvr);
  const toggleUnvf = mkToggle('mms-ads-checklist-unvf', setCheckedUnvf);
  const toggleBrg = mkToggle('mms-ads-checklist-brg', setCheckedBrg);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const toggleTw = (id: string) => {
    setCheckedTw((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist-tw', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const toggleMm = (id: string) => {
    setCheckedMm((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist-mm', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const toggleFm = (id: string) => {
    setCheckedFm((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist-fm', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const toggleSk = (id: string) => {
    setCheckedSk((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist-sk', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const doneCount = CHECKLIST.filter((c) => checked[c.id]).length;
  const doneCountTw = TW_CHECKLIST.filter((c) => checkedTw[c.id]).length;
  const doneCountMm = MM_CHECKLIST.filter((c) => checkedMm[c.id]).length;
  const doneCountFm = FM_CHECKLIST.filter((c) => checkedFm[c.id]).length;
  const doneCountSk = SK_CHECKLIST.filter((c) => checkedSk[c.id]).length;
  const doneCountPx = PX_CHECKLIST.filter((c) => checkedPx[c.id]).length;
  const doneCountPr = PR_CHECKLIST.filter((c) => checkedPr[c.id]).length;
  const doneCountGeo = GEO_CHECKLIST.filter((c) => checkedGeo[c.id]).length;
  const doneCountGn = GN_CHECKLIST.filter((c) => checkedGn[c.id]).length;
  const doneCountPy = PY_CHECKLIST.filter((c) => checkedPy[c.id]).length;
  const doneCountRs = RS_CHECKLIST.filter((c) => checkedRs[c.id]).length;
  const doneCountUnv = UNV_CHECKLIST.filter((c) => checkedUnv[c.id]).length;
  const doneCountUnvr = UR_CHECKLIST.filter((c) => checkedUnvr[c.id]).length;
  const doneCountUnvf = UF_CHECKLIST.filter((c) => checkedUnvf[c.id]).length;
  const doneCountBrg = BR_CHECKLIST.filter((c) => checkedBrg[c.id]).length;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="ads" title="Meta Ads" />

      {/* Campaign switcher */}
      <div className="sticky top-0 z-30 bg-[#FBF6EA]/95 backdrop-blur border-b-2 border-[#161616]">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`text-left border-2 border-[#161616] px-3.5 py-2.5 transition-all ${
                tab === t.key
                  ? 'bg-[#161616] text-white shadow-[3px_3px_0_0_#F5B700]'
                  : 'bg-white text-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5'
              }`}
            >
              <span className={`font-mono font-bold text-[10px] tracking-[0.2em] block ${tab === t.key ? 'text-[#FFDD55]' : 'text-[#E0301E]'}`}>
                {t.num === '📊' ? 'RESULTS' : `CAMPAIGN ${t.num}`}
              </span>
              <span className="font-sans font-extrabold text-sm block mt-0.5">{t.label}</span>
              <span className={`font-sans text-[11px] hidden md:block ${tab === t.key ? 'text-white/60' : 'text-[#161616]/55'}`}>{t.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8 space-y-10">
        {tab === 'callme' && (<>
        {/* Hero strip */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Campaign one</span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-[#161616] mt-2">
            &ldquo;Call Me&rdquo; <span className="italic text-[#E0301E]">Mr. Mustard</span> on Meta
          </h2>
          <p className="text-[#161616]/75 mt-3 max-w-3xl font-sans">
            The ad IS the demo: every viewer who dials {PHONE} gets Mr. Mustard live, and he captures the lead
            and books the discovery call himself. Two cells, $25/day total, judge on cost per booked call.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Ads Manager</a>
            <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Events Manager (Pixel)</a>
            <a href="/admin/callers" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Callers (results)</a>
          </div>
        </section>

        {/* The three cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Upload one ad, then use &ldquo;customize per placement&rdquo; to assign each cut. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/call-me-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Copy blocks */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (Cell A)" text={COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (Cell B)" text={COPY_B} />
            <CopyBlock title="Headline" text={HEADLINE} />
            <CopyBlock title="Description" text={DESCRIPTION} />
            <CopyBlock title="Call Now number (Cell A)" text={PHONE} />
            <CopyBlock title="Landing link with UTM (Cell B)" text={LANDING} />
          </div>
        </section>

        {/* Settings cards */}
        <section className="grid md:grid-cols-3 gap-5">
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Audience</span>
            <ul className="mt-3 space-y-2 text-sm text-[#161616]/85 font-sans list-disc list-inside">
              <li>Advantage+ audience (let Meta&rsquo;s delivery AI work)</li>
              <li>Suggestions: Small business owners, Business owner, Restaurant owner, Home improvement</li>
              <li>Age 25-60, United States nationwide</li>
              <li>No Montana-only restriction (the service is remote)</li>
            </ul>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Budget</span>
            <ul className="mt-3 space-y-2 text-sm text-[#161616]/85 font-sans list-disc list-inside">
              <li><b>$25/day total:</b> $15 Cell A (calls) + $10 Cell B (traffic)</li>
              <li>Touch nothing for 4-5 days (learning phase)</li>
              <li>~$750/month cap; one client covers a year of it</li>
            </ul>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Kill / scale rules</span>
            <ul className="mt-3 space-y-2 text-sm text-[#161616]/85 font-sans list-disc list-inside">
              <li>Cost per call &gt; ~$25 or zero calls by day 5: swap copy variant</li>
              <li>Cost per call &lt; ~$10: raise budget 20% every 3 days (never double overnight)</li>
              <li>The real metric: <b>cost per booked discovery call</b> (check Callers + booking emails)</li>
            </ul>
          </div>
        </section>

        {/* Launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCount}/{CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={() => toggle(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checked[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'tw' && (<>
        {/* ============ Campaign two: The Talking Website ============ */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Campaign two</span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-[#161616] mt-2">
            &ldquo;The Talking Website&rdquo; <span className="italic text-[#E0301E]">has arrived</span>
          </h2>
          <p className="text-[#161616]/75 mt-3 max-w-3xl font-sans">
            The full-system pitch: AI website, CRM, funnels, and ad studio, all baked in, it sells for you.
            One traffic cell at $10/day feeding the free AI audit funnel. Judge on cost per audit lead.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Ads Manager</a>
            <a href="/audit" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">The audit funnel (landing)</a>
          </div>
        </section>

        {/* Talking Website cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Same drill: upload one ad, customize per placement. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {TW_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/talking-website-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Talking Website copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1" text={TW_COPY_A} />
            <CopyBlock title="Primary text — Variant 2" text={TW_COPY_B} />
            <CopyBlock title="Headline" text={TW_HEADLINE} />
            <CopyBlock title="Description" text={TW_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (audit funnel)" text={TW_LANDING} />
          </div>
        </section>

        {/* Talking Website launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountTw}/{TW_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {TW_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedTw[item.id]}
                    onChange={() => toggleTw(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedTw[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'mm' && (<>
        {/* ============ Campaign three: MUSTARD MODE ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign three</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;MUSTARD MODE&rdquo; <span className="italic text-[#F5B700]">[ ON ]</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The product campaign. The angle: the ad IS the demo, again. The commercial sells the coach,
              the landing page delivers a real free coaching session in the first five minutes, and the
              email that saves the run is the lead. One traffic cell at $10/day into the free-play funnel,
              judged on cost per free-play email, with Player and Builder checkouts as the truth.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/mustard-mode" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The landing (free play)</a>
              <a href="/admin/leads" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Leads (free plays)</a>
            </div>
          </div>
        </section>

        {/* MUSTARD MODE cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Same drill: upload one ad, customize per placement. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {MM_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/mustard-mode-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MUSTARD MODE copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the coach)" text={MM_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the reps)" text={MM_COPY_B} />
            <CopyBlock title="Headline" text={MM_HEADLINE} />
            <CopyBlock title="Description" text={MM_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (free-play funnel)" text={MM_LANDING} />
          </div>
        </section>

        {/* MUSTARD MODE launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountMm}/{MM_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {MM_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedMm[item.id]}
                    onChange={() => toggleMm(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedMm[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'fm' && (<>
        {/* ============ Campaign four: The Fable Mind ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign four</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;The Fable Mind&rdquo; <span className="italic text-[#F5B700]">Steal the mind.</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The lead magnet campaign. A frontier AI hands its mind to the everyday robot, and the viewer
              gets to steal the same playbook free. Every email capture is a builder-profile lead who now
              associates MMS with the deepest agentic work in the space. One traffic cell at $10/day,
              judged on cost per playbook email.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/playbooks/fable-mind" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The playbook (landing)</a>
              <a href="/admin/leads" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Leads (email captures)</a>
            </div>
          </div>
        </section>

        {/* Fable Mind cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Same drill: upload one ad, customize per placement. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {FM_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/fable-mind-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fable Mind copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the story)" text={FM_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the economics)" text={FM_COPY_B} />
            <CopyBlock title="Headline" text={FM_HEADLINE} />
            <CopyBlock title="Description" text={FM_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (playbook funnel)" text={FM_LANDING} />
          </div>
        </section>

        {/* Fable Mind launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountFm}/{FM_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {FM_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedFm[item.id]}
                    onChange={() => toggleFm(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedFm[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'sk' && (<>
        {/* ============ Campaign five: The Sidekick Forge ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign five</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;The Graduate&rdquo; <span className="italic text-[#F5B700]">The demo IS the product.</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The forge funnel. Mr. Mustard trains a Sidekick in the spot; the viewer forges their own
              for free and HEARS it answer as their business. Every demo is a transcript-attached lead
              at roughly 45 cents of voice cost, and Keep Him subscriptions convert at the moment of
              peak delight. One traffic cell at $15/day, judged on cost per forged demo.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/sidekick" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The forge (landing)</a>
              <a href="/admin/leads" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Leads (forged demos)</a>
            </div>
          </div>
        </section>

        {/* Sidekick cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Same drill: upload one ad, customize per placement. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {SK_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/sidekick-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sidekick copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the story)" text={SK_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the missed-calls math)" text={SK_COPY_B} />
            <CopyBlock title="Headline" text={SK_HEADLINE} />
            <CopyBlock title="Description" text={SK_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (forge funnel)" text={SK_LANDING} />
          </div>
        </section>

        {/* Sidekick launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountSk}/{SK_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {SK_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedSk[item.id]}
                    onChange={() => toggleSk(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedSk[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'px' && (
          <ImageCampaign
            num="six" title="The Screen Test" tagline="Direct their commercial free."
            blurb="The Pictures funnel: a free Screen Test writes the visitor's storyboard and taglines on the spot; SPOT $197 / PREMIERE $497 convert at the reveal. Every test is a transcript-grade lead. One traffic cell at $10/day, judged on cost per Screen Test."
            landingLabel="The Screen Test (landing)" landingHref="/pictures"
            images={PX_IMAGES} copyA={PX_COPY_A} copyALabel="Primary text — Variant 1 (the story)" copyB={PX_COPY_B} copyBLabel="Primary text — Variant 2 (the price anchor)"
            headline={PX_HEADLINE} description={PX_DESCRIPTION} landing={PX_LANDING}
            checklist={PX_CHECKLIST} checked={checkedPx} onToggle={togglePx} done={doneCountPx}
          />
        )}

        {tab === 'pr' && (
          <ImageCampaign
            num="seven" title="Hot Off The Press" tagline="Their menu, typeset free."
            blurb="The Press funnel: paste a price list, get a print-ready proof free; the $97 PIECE fulfills itself instantly. Every proof captures the visitor's entire price catalog as a lead. One traffic cell at $10/day, judged on cost per proof run."
            landingLabel="The Press (landing)" landingHref="/press"
            images={PR_IMAGES} copyA={PR_COPY_A} copyALabel="Primary text — Variant 1 (the Ouch)" copyB={PR_COPY_B} copyBLabel="Primary text — Variant 2 (the most-handled marketing)"
            headline={PR_HEADLINE} description={PR_DESCRIPTION} landing={PR_LANDING}
            checklist={PR_CHECKLIST} checked={checkedPr} onToggle={togglePr} done={doneCountPr}
          />
        )}

        {tab === 'geo' && (
          <ImageCampaign
            num="eight" title="Invisible to ChatGPT" tagline="Grade them, then fix them."
            blurb="The GEO Desk funnel: the free audit grades AI-findability (most local sites score D or F); the $297 Fix Pack fulfills itself instantly and THE WATCH renews monthly. Copy law: sell the grade and installed signals, never ranking promises. One traffic cell at $10/day, judged on cost per audit run."
            landingLabel="The audit (landing)" landingHref="/website-audit"
            images={GEO_IMAGES} copyA={GEO_COPY_A} copyALabel="Primary text — Variant 1 (are you in the answer)" copyB={GEO_COPY_B} copyBLabel="Primary text — Variant 2 (we graded five locals)"
            headline={GEO_HEADLINE} description={GEO_DESCRIPTION} landing={GEO_LANDING}
            checklist={GEO_CHECKLIST} checked={checkedGeo} onToggle={toggleGeo} done={doneCountGeo}
          />
        )}

        {tab === 'gn' && (<>
        {/* ============ Campaign nine: The Good News ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign nine · the brand film</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;The Good News&rdquo; <span className="italic text-[#F5B700]">Mr. Mustard &amp; family</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The heart of the funnel. A talking, animated commercial: Mr. Mustard tells you the good news and the
              bad news from his own kitchen, surrounded by his family, and the whole pitch lands on one promise,
              recover the revenue you are leaking and get your evenings back. It sells all three offerings at once
              (websites, voice agents, custom software) and warms every other campaign on this page. One traffic
              cell at $15/day into the free AI audit, judged on cost per audit lead. Runs on Meta and, via the 16:9
              cut, on Google / YouTube too.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/audit" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The audit funnel (landing)</a>
              <a href="/admin/leads" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Leads (audit requests)</a>
            </div>
          </div>
        </section>

        {/* The Good News cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The film, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Upload one ad, then customize per placement. The spot has spoken dialogue and burned-in captions. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {GN_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/good-news-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The Good News copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the story)" text={GN_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the time back)" text={GN_COPY_B} />
            <CopyBlock title="Headline" text={GN_HEADLINE} />
            <CopyBlock title="Description" text={GN_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (audit funnel)" text={GN_LANDING} />
          </div>
        </section>

        {/* The Good News launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountGn}/{GN_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {GN_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedGn[item.id]}
                    onChange={() => toggleGn(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedGn[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'py' && (<>
        {/* ============ Campaign ten: Find Your Horizon (partner recruiting) ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign ten · partner recruiting</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;Find Your Horizon&rdquo; <span className="italic text-[#F5B700]">the yacht</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The recruiting film. Mr. Mustard and family on a Mediterranean yacht, because partnering with MMS
              buys back your time and your money. It sells the partner program itself: refer the AI websites,
              voice agents, and software every business now needs, earn up to 50% on products plus recurring
              income on subscriptions, and let the studio do the work. This one targets FUTURE PARTNERS, not
              customers. One traffic cell at $10/day into the /partners apply page, judged on cost per partner
              application. Runs on Meta and, via the 16:9 cut, on Google / YouTube.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/partners" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The partners page (landing)</a>
              <a href="/admin/partners" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Applicants (results)</a>
            </div>
          </div>
        </section>

        {/* Find Your Horizon cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The film, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Upload one ad, then customize per placement. The spot has spoken dialogue and burned-in captions. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {PY_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/partner-yacht-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Find Your Horizon copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the yacht dream)" text={PY_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (why now)" text={PY_COPY_B} />
            <CopyBlock title="Headline" text={PY_HEADLINE} />
            <CopyBlock title="Description" text={PY_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (partners page)" text={PY_LANDING} />
          </div>
        </section>

        {/* Find Your Horizon launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountPy}/{PY_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {PY_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedPy[item.id]}
                    onChange={() => togglePy(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedPy[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'rest' && (<>
        {/* ============ Campaign eleven: The Dinner Rush ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign eleven · restaurants</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;The Dinner Rush&rdquo; <span className="italic text-[#F5B700]">you cook, he books</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The restaurant vertical. The Mustards run an Italian trattoria in chef coats, the phone will not stop,
              and the AI voice agent books every table for them, in English AND Italian (the bilingual demo is the
              signature beat). It shows the voice agent AND its versatility for any language. Targets restaurant
              owners. One traffic cell at $10/day into /for/restaurants, judged on cost per lead. Runs on Meta and,
              via the 16:9 cut, on Google / YouTube.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/for/restaurants" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Restaurants page (landing)</a>
              <a href="/voice-agents" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Live demo (hear it)</a>
            </div>
          </div>
        </section>

        {/* The Dinner Rush cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The film, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Upload one ad, then customize per placement. The spot has spoken dialogue (English + Italian) and burned-in captions. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {RS_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/restaurant-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The Dinner Rush copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the rush)" text={RS_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the versatility)" text={RS_COPY_B} />
            <CopyBlock title="Headline" text={RS_HEADLINE} />
            <CopyBlock title="Description" text={RS_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (restaurants page)" text={RS_LANDING} />
          </div>
        </section>

        {/* The Dinner Rush launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountRs}/{RS_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {RS_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedRs[item.id]}
                    onChange={() => toggleRs(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedRs[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'unv' && (<>
        {/* ============ Campaign twelve: The Unveiling (demo funnel) ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign twelve · the demo funnel</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;The Unveiling&rdquo; <span className="italic text-[#F5B700]">Mr. &amp; Mrs. Mustard host the gallery</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The front door of the demo machine. Mr. and Mrs. Mustard, in black tie, unveil three exhibits in an
              exquisite private gallery: your website, your AI receptionist, and your command center. The pitch is
              the funnel&rsquo;s actual promise, we build all three for you first, real and working and free, and you
              only pay to make them real. Sixty seconds on /demos forges the whole suite. One traffic cell at
              $15/day, judged on cost per forged demo. Runs on Meta and, via the 16:9 cut, on Google / YouTube.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/demos" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The Demo Station (landing)</a>
              <a href="/admin/outbound/leads?source=demo-station" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Forged leads (results)</a>
            </div>
          </div>
        </section>

        {/* The Unveiling cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The film, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Upload one ad, then customize per placement. The spot has spoken dialogue and burned-in captions. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {UNV_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/unveiling-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The Unveiling copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the unveiling story)" text={UNV_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the test drive)" text={UNV_COPY_B} />
            <CopyBlock title="Headline" text={UNV_HEADLINE} />
            <CopyBlock title="Description" text={UNV_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (the Demo Station)" text={UNV_LANDING} />
          </div>
        </section>

        {/* The Unveiling organic launch posts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">Organic launch posts</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Free reach on launch day: the 4:5 cut goes to Facebook with the first block, the 9:16 goes up as an IG Reel with the second. The Story line rides a frame of the film with a link sticker. IG links are not clickable in captions, so keep /demos in the bio.</p>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Facebook post (pairs with the 4:5 cut)" text={UNV_FB_POST} />
            <CopyBlock title="Instagram Reel caption (pairs with the 9:16 cut)" text={UNV_IG_CAPTION} />
            <CopyBlock title="Instagram Story overlay + sticker (frame of the film)" text={UNV_IG_STORY} />
          </div>
        </section>

        {/* The Unveiling launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountUnv}/{UNV_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {UNV_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedUnv[item.id]}
                    onChange={() => toggleUnv(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedUnv[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'unvr' && (<>
        {/* ============ Campaign thirteen: The Unveiling: Restaurants ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign thirteen · demo funnel, restaurant vertical</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;The Unveiling: Restaurants&rdquo; <span className="italic text-[#F5B700]">the chef&rsquo;s table</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The gallery walks into the dining room. Mr. Mustard in chef whites and Mrs. Mustard in her hostess
              apron lift silver cloches off three courses in a candlelit dining room after close: the restaurant&rsquo;s
              website, an AI host that answers and books through the dinner rush, and the command center that runs
              the house. Same funnel promise, built free first, and the closing line writes itself: your table is
              already set. One traffic cell at $10/day into /demos, judged on cost per forged demo.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/demos" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The Demo Station (landing)</a>
              <a href="/admin/outbound/leads?source=demo-station" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Forged leads (results)</a>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The film, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Upload one ad, then customize per placement. The spot has spoken dialogue and burned-in captions. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {UR_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/unveiling-rest-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the tasting story)" text={UR_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the Friday-night phone)" text={UR_COPY_B} />
            <CopyBlock title="Headline" text={UR_HEADLINE} />
            <CopyBlock title="Description" text={UR_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (the Demo Station)" text={UR_LANDING} />
          </div>
        </section>

        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountUnvr}/{UR_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {UR_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedUnvr[item.id]}
                    onChange={() => toggleUnvr(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedUnvr[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'unvf' && (<>
        {/* ============ Campaign fourteen: The Unveiling: Roofers ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign fourteen · demo funnel, roofing vertical</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;The Unveiling: Roofers&rdquo; <span className="italic text-[#F5B700]">the rooftop reveal</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The unveiling climbs onto the roof. Hard hats, tool belts, a shingle ridge at sunrise, and three
              reveals under canvas tarps: the company&rsquo;s website, a receptionist that catches every call while
              they are forty feet up a ladder, and the command center that runs the crew (estimates, jobs, the
              money). Ends on a thermos toast and &ldquo;we left the ladder out for you.&rdquo; One traffic cell at $10/day
              into /demos, judged on cost per forged demo.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/demos" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The Demo Station (landing)</a>
              <a href="/admin/outbound/leads?source=demo-station" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Forged leads (results)</a>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The film, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Upload one ad, then customize per placement. The spot has spoken dialogue and burned-in captions. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {UF_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/unveiling-roof-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the rooftop reveal)" text={UF_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (forty feet up)" text={UF_COPY_B} />
            <CopyBlock title="Headline" text={UF_HEADLINE} />
            <CopyBlock title="Description" text={UF_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (the Demo Station)" text={UF_LANDING} />
          </div>
        </section>

        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountUnvf}/{UF_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {UF_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedUnvf[item.id]}
                    onChange={() => toggleUnvf(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedUnvf[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'brg' && (<>
        {/* ============ Campaign fifteen: Take the Bridge (retro starship) ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign fifteen · demo funnel, the nostalgia play</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;Take the Bridge&rdquo; <span className="italic text-[#F5B700]">the retro starship</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The nostalgia spot. Captain Mr. Mustard and Mrs. Mustard on the bridge of an original retro
              starship (1960s jewel-button consoles, a captain&rsquo;s chair, a warp-streak finale, and zero
              franchise IP): the website goes up on the big screen, the receptionist answers every hail, and
              the command center IS the bridge. Built to catch the eye of the guy who grew up on space
              adventures and now owns a business. Same demo-funnel promise, all built free first. One traffic
              cell at $10/day into /demos as a CHALLENGER to Campaign 12, judged on cost per forged demo.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/demos" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The Demo Station (landing)</a>
              <a href="/admin/outbound/leads?source=demo-station" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Forged leads (results)</a>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The film, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Upload one ad, then customize per placement. The spot has spoken dialogue and burned-in captions. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {BR_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/bridge-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the captain's log)" text={BR_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the crew)" text={BR_COPY_B} />
            <CopyBlock title="Headline" text={BR_HEADLINE} />
            <CopyBlock title="Description" text={BR_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (the Demo Station)" text={BR_LANDING} />
          </div>
        </section>

        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountBrg}/{BR_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {BR_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedBrg[item.id]}
                    onChange={() => toggleBrg(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedBrg[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'results' && (<>
        {/* Measurement */}
        <section className="bg-[#161616] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 text-[#FBF6EA]">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold">How to read results</span>
          <div className="grid md:grid-cols-3 gap-6 mt-4 text-sm font-sans">
            <p><b className="text-[#F5B700]">Calls:</b> every ad-driven call hits the Mustard line and lands in <a href="/admin/callers" className="underline decoration-[#F5B700]">Callers</a> with a transcript. Bookings email you automatically.</p>
            <p><b className="text-[#F5B700]">Site:</b> paid traffic shows in GA4 + the first-party beacon under utm_campaign=callme, talkingwebsite, mustardmode, fablemind, sidekick, and goodnews. MUSTARD MODE free-plays, Fable Mind playbook emails, and forged Sidekick demos land in <a href="/admin/leads" className="underline decoration-[#F5B700]">Leads</a>, and purchases hit Orders with an email on every sale. Conversions get exact once the pixel vars are set.</p>
            <p><b className="text-[#F5B700]">Weekly:</b> ask Claude to read Callers against spend and report the true cost per booked discovery call.</p>
          </div>
        </section>

        {/* Per-campaign scoreboard shortcuts */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">01 · Call Me</span>
            <p className="text-sm text-[#161616]/80 font-sans mt-2">Metric: cost per booked discovery call.</p>
            <a href="/admin/callers" className="inline-block mt-3 text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Callers →</a>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">02 · Talking Website</span>
            <p className="text-sm text-[#161616]/80 font-sans mt-2">Metric: cost per audit lead (utm_campaign=talkingwebsite).</p>
            <a href="/admin/inbox" className="inline-block mt-3 text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Inbox →</a>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">03 · MUSTARD MODE</span>
            <p className="text-sm text-[#161616]/80 font-sans mt-2">Metric: cost per free-play email, truth = Player/Builder orders.</p>
            <a href="/admin/leads" className="inline-block mt-3 text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Leads →</a>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">04 · The Fable Mind</span>
            <p className="text-sm text-[#161616]/80 font-sans mt-2">Metric: cost per playbook email (utm_campaign=fablemind), truth = calls booked by readers.</p>
            <a href="/admin/leads" className="inline-block mt-3 text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Leads →</a>
          </div>
        </section>
        </>)}
      </main>
    </div>
  );
}
