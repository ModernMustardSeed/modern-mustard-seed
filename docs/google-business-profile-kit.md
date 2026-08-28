# Google Business Profile Kit

Created 2026-07-30 after the GBP insights panel showed 227 profile views and
**29 search impressions from exactly one term: "mustard seed."** Zero discovery
searches. Every paste-ready field is below. Companion to
`bing-copilot-entity-kit.md`, which covers the Bing side of the same entity
problem.

## What the numbers actually say

Google splits profile impressions two ways:

- **Direct / branded:** someone typed the business name.
- **Discovery:** someone typed a category ("web designer near me") and Google
  decided this profile was a relevant answer.

One term, "mustard seed," means the profile is winning **only** name matches,
and even those are landing on the wrong entity (the condiment, the parable, the
decor brand, the charities). Discovery is at or near zero.

Discovery ranking is `relevance x distance x prominence`. Distance is fixed
(Kalispell). Prominence is slow (reviews, links, time). **Relevance is the
lever, and relevance is driven first and hardest by categories.** A profile
whose category does not match a query is not ranked low for that query, it is
not eligible for it at all. That is why nothing but the name shows up.

Note also that Google only lists search terms above a privacy threshold, so
"one term" partly means "everything else was under a handful of impressions."
Both readings point to the same fix.

---

## 1. Categories (do this first, it is 80% of the win)

GBP allows 1 primary and up to 9 additional. The primary carries the most weight
by a wide margin.

**Primary: `Website designer`**

Not `Software company`. "Software company" is accurate but almost nobody searches
it with local intent. "Website designer" is what small businesses in the Flathead
actually type, and it is the front door to the whole ladder (site, then voice
agent, then command center).

**Additional, in priority order:**

1. `Internet marketing service`
2. `Marketing agency`
3. `Software company`
4. `Telephone answering service`
5. `Marketing consultant`
6. `Computer consultant`
7. `E-commerce service`
8. `Advertising agency`
9. `Video production service`

`Telephone answering service` is the sleeper. The Chief, Switchboard, and the
Voice Agent are literally an answering service, and "answering service near me"
is a high-intent local query with almost no AI-native competition in Montana.

Do not add a category for something not actually sold. Category mismatch plus a
service-area business with no street address is a suspension pattern.

---

## 2. Business description (750 character limit)

The description is a weaker ranking signal than categories, but it is a strong
**conversion** signal and it feeds the AI summaries Google now writes above the
profile. Front-load the category words.

Paste as-is:

> Modern Mustard Seed is an AI product studio in Kalispell, Montana. We build
> custom websites, business software, and 24/7 AI phone agents for small
> businesses across the Flathead Valley and beyond.
>
> What we build: website design and rebuilds with lead capture and local SEO, AI
> voice agents that answer every call around the clock and text back missed
> callers, AI receptionist and answering service setup, online stores, custom
> apps and internal tools, and dashboards that put calls, leads, customers, and
> revenue in one place.
>
> Fixed scope, fixed timeline, shipped in weeks instead of months. Run by Sarah
> Scarano.
>
> Call (406) 312-1223. Our own AI agent answers, so try it before you buy it.

---

## 3. Services (free keyword surface, most profiles leave it empty)

Each service takes a name and a description. **The description field is 120
characters, not 300** (measured in the live UI 2026-07-30; docs and third-party
guides still say 300, they are wrong). Every line below is verified at or under
120. Google matches query text against these. Add every one of them.

| Service name | Description (chars) |
|---|---|
| Website Design | Custom small business sites built to convert, with lead capture and local SEO. Shipped in weeks, not months. (108) |
| Website Redesign | A rebuild for a site that looks dated or does not bring in calls. Same domain, new build, real lead capture. (108) |
| Small Business Website | Services, proof, reviews, booking, and a phone number that gets used. Everything a local business needs. (104) |
| Landing Page Design | One high-converting page for one offer, one campaign, or one ad set. (68) |
| AI Voice Agent Setup | A 24/7 AI phone agent trained on your hours, prices, and services. Answers every call in your voice. (100) |
| AI Receptionist | An AI receptionist that picks up on the first ring, day or night, and never puts a caller on hold. (98) |
| 24/7 Answering Service | Round-the-clock call answering. No voicemail, no missed jobs, no per-hour staffing cost. (88) |
| Missed Call Text Back | Every missed call gets an instant text, so the lead does not dial your competitor next. (87) |
| AI Chatbot Setup | A site chat agent trained on your business that answers questions and captures leads while you work. (100) |
| E-Commerce Store Setup | Online stores with product pages, checkout, and inventory a non-technical owner can actually run. (97) |
| Custom Web Application | Internal tools, dashboards, portals, and workflow software built for how your business runs. (92) |
| Business Automation | Connect the tools you already pay for so leads, jobs, and follow-ups stop falling through the cracks. (101) |
| Local SEO | Get found for what you do, not just for your name. Schema, local pages, and content that answers searches. (106) |
| Website Maintenance | Hosting, updates, edits, monitoring, and fixes so the site never goes stale or dark. (84) |
| Video Production | AI-assisted commercials, product videos, and social cuts produced without a film crew. (86) |
| Ad Campaign Management | Paid campaigns run in your own ad accounts, so you keep the data and the assets. (80) |

---

## 4. Products (price + link, they render as cards)

Prices pulled from `data/demo-agent.ts` on 2026-07-30. **Re-check against the live
site before pasting.** Price lives in code, never in a doc.

| Product | Price | Link |
|---|---|---|
| The Talking Website | $497 setup, then $497/mo | https://modernmustardseed.com/talking-website |
| Voice Agent | $397 setup, then $397/mo | https://modernmustardseed.com/demo agent |
| Voice Agent Pro | $597 setup, then $597/mo | https://modernmustardseed.com/demo agent |
| Free Website Audit | Free | https://modernmustardseed.com/website-audit |

The free audit is the one that earns clicks from cold discovery traffic. Keep it
first in the list if the ordering is editable.

---

## 5. Reviews (the strongest term-level signal after categories)

Google matches review **text** against queries and bolds the matched phrase in
the local pack. Ten reviews that say "website" and "Kalispell" move discovery
rankings more than any on-profile edit.

Ask real clients only. Never write or incentivize a review. The ask that works,
sent by text after a launch:

> Would you mind leaving a quick Google review? One line about what we built and
> how it is working is plenty. Here is the direct link: [GBP review short link]

Prompt the memory, do not script the words: "if it helps, most people mention
what we built and what changed." Clients who say "Sarah built our new website
and set up the AI phone answering" are handing Google two category matches for
free.

Reply to every review within a day. Owner replies are a ranking signal and the
reply is another place the service words appear.

---

## 6. Q&A (seed it, the owner is allowed to)

Google explicitly permits the business to post questions and answer them. These
rank inside the profile and get surfaced in search snippets.

1. **Q:** Do you build websites for small businesses in Kalispell?
   **A:** Yes. Modern Mustard Seed builds custom websites for service businesses
   across Kalispell, Whitefish, Columbia Falls, Bigfork, and Polson, plus remote
   clients nationwide. Most sites ship in weeks.
2. **Q:** What is an AI voice agent and what does it do?
   **A:** It is a phone agent trained on your hours, services, prices, and
   policies. It answers every call 24/7, books appointments, answers questions,
   and texts you the details. Call (406) 312-1223 to hear ours answer.
3. **Q:** Can it answer calls after hours and on weekends?
   **A:** Yes, that is the point. It works nights, weekends, and holidays, and it
   never puts a caller on hold.
4. **Q:** How much does a website cost?
   **A:** Fixed scope, fixed price, quoted up front before any work starts. Start
   with the free website audit at modernmustardseed.com/website-audit.
5. **Q:** Do you work with businesses outside the Flathead Valley?
   **A:** Yes. The studio is based in Kalispell and works with clients across
   Montana and remotely nationwide.

---

## 7. The rest of the profile

- **Service area:** Kalispell, Whitefish, Columbia Falls, Bigfork, Polson,
  Flathead County, Montana. No street address on purpose (service-area business).
- **Hours:** Open 24 hours. Honest, because the voice agent genuinely answers.
- **Website link:** homepage. Add `?utm_source=gbp&utm_medium=organic` so the
  traffic is attributable in analytics.
- **Phone:** (406) 312-1223, exactly as it appears in `SITE` in `lib/seo.ts`.
  Never retype it in a different format anywhere.
- **Photos:** upload weekly. Real screens of shipped work, the workspace, Sarah.
  Profiles with regular photo activity get more engagement, and engagement feeds
  prominence.
- **Posts:** one per week minimum. Each post is a small indexable surface. Reuse
  the daily social drop content rather than writing new copy.
- **Attributes:** set every applicable one (woman-owned, online appointments,
  online estimates, identifies as veteran-owned only if true).

---

## 8. Honest ceiling

Kalispell is roughly 26,000 people and Flathead County about 110,000. "Web design
Kalispell" is a low-volume query. Doing everything above well probably takes
discovery impressions from near zero to a few hundred a month, and a handful of
those become calls. That is worth the two hours, and those calls are the highest
intent traffic in the whole funnel, but the local pack is not where volume lives.

Volume lives in the non-local surfaces already built: the `/montana/[city]` fleet,
the `/voice-agents/[trade]` fleet, the buying guides, and answer-engine citations.
GBP's real job is to be the trust and proximity anchor that makes those pages
convert, and to be the thing Bing Places imports from.

---

## 9. Do this in this order

1. Categories (10 minutes, biggest single lever).
2. Services and description (30 minutes).
3. Bing Places import from GBP, per `bing-copilot-entity-kit.md` Action 2. Do it
   the same day, while the profile is fresh and correct.
4. Products, Q&A, first photo batch (30 minutes).
5. Review requests to shipped clients (ongoing).
6. Re-read the insights panel in 30 days. Success looks like category terms
   appearing in the search-terms list at all, not like big numbers.

## Do not

- Do not put keywords in the business name field. It works and it is also the
  single most common cause of GBP suspension. The name is "Modern Mustard Seed."
- Do not create a second profile or add a fake or residential street address.
- Do not buy, trade, or write reviews.
- Do not let the NAP drift. Name, phone, city here must match `SITE` in
  `lib/seo.ts`, the LinkedIn Company Page, and Bing Places character for
  character.
