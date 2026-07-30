# Bing + Copilot Entity Kit

Created 2026-07-28 after Bing answered "modern mustard seed" with the condiment
and Copilot could not describe the company. Google gets it right, Bing does not.

## The actual problem

This is **not** an indexing problem. Verified 2026-07-28:

- IndexNow is live and healthy (125 URLs, key and cron secret configured).
- The `msvalidate.01` Bing Webmaster Tools tag renders on live pages.
- Bing has the domain indexed (confirmed via DuckDuckGo, which runs on Bing's
  index: `/`, `/services`, `/work-with-us` all surfaced).

It is an **entity disambiguation** problem. "Modern Mustard Seed" sits inside one
of the densest namespaces on the web: the condiment, the mustard plant, the
parable in Matthew 13:31, the Miss Mustard Seed decor brand, The Mustard Seed
restaurants in Missoula, and a pile of Mustard Seed charities. Bing's knowledge
graph resolves the query to the dominant entity because nothing tells it we are
a separate, real company.

Google resolves it correctly because Google's knowledge graph has its own
first-party signal. Bing's knowledge graph is fed largely by **Wikidata,
LinkedIn (Microsoft owns it), and Bing Places**. We had none of the three.

Verified absent 2026-07-28:
- `linkedin.com/company/modernmustardseed` -> 404
- `linkedin.com/company/modern-mustard-seed` -> 404
- Wikidata entity search for "Modern Mustard Seed" -> no entity
- No Bing Places listing found

## What was already fixed in code (2026-07-28)

- `disambiguatingDescription` on the Organization node in `lib/jsonld.tsx`. This
  is the schema.org property built for exactly this collision. It states the
  category we are and explicitly negates the ones we get confused with.
- `alternateName` expanded from `'MMS'` to an array including
  "Modern Mustard Seed AI Studio".
- A "Disambiguation" block at the top of `public/llms.txt`.
- Entity type, negation list, founder, location, and phone added to
  `public/.well-known/ai.txt`.
- Fixed a bad find/replace that had shipped "24/7 voice agents and voice agents"
  and "voice agent and voice agents" into the live schema descriptions.

**On-site schema alone will not fix this.** It makes us legible once Bing decides
to look. The unlock is off-site corroboration, below.

---

## Action 1: LinkedIn Company Page (highest leverage, free, ~15 minutes)

Microsoft owns LinkedIn and feeds it directly into Bing and Copilot. This is the
single most direct entity signal available, and right now the Organization schema
`sameAs` points at Sarah's **personal** profile, which tells Bing about a person,
not a company.

Create at: https://www.linkedin.com/company/setup/new/

Paste-ready fields:

- **Name:** Modern Mustard Seed
- **Public URL:** linkedin.com/company/modernmustardseed
- **Website:** https://modernmustardseed.com
- **Industry:** Software Development
- **Company size:** 1 employee
- **Company type:** Privately Held
- **Founded:** 2024
- **Tagline:** Apps, Sites, and Specialty AI Tools
- **Location:** Kalispell, Montana, United States, 59901
- **Phone:** (406) 312-1223

**About (paste as-is):**

> Modern Mustard Seed is an AI product studio in Kalispell, Montana. We build
> custom apps, websites, and 24/7 AI voice agents for small businesses, shipped
> in weeks instead of months.
>
> The studio is run by Sarah Scarano, a self-taught full-stack engineer and AI
> systems architect who has shipped 40+ products across AI, e-commerce, real
> estate, hospitality, and SaaS. Fixed scope, fixed timeline, four builds per
> quarter.
>
> What we build: custom websites with lead capture and SEO, AI voice agents that
> answer every call around the clock and text back missed callers, business
> command centers that put calls, leads, customers, reviews, and revenue on one
> dashboard, and specialty AI tools built for a specific trade or workflow.
>
> Serving Kalispell, Whitefish, Columbia Falls, Bigfork, Polson, and the wider
> Flathead Valley, plus remote clients nationwide.
>
> Call (406) 312-1223. The line is answered by our own voice agent, which is one
> of the products we sell, so you can try it before you buy it.

**After it exists**, add the URL to `sameAs` in `lib/jsonld.tsx` (the
`orgJsonLd` block). Do not add it before the page is live: a 404 in `sameAs` is
a negative signal.

---

## Action 2: Bing Places for Business (free, ~20 minutes)

Bing's local entity graph. This is what makes Bing treat us as a business with a
location rather than a phrase.

Create at: https://www.bingplaces.com

**Fastest path: import from Google Business Profile.** Bing Places has a
Google Business Profile import flow. Connect the Google account that owns the
GBP and Bing pulls name, address, phone, hours, categories, photos, and
description in one shot. If the Google profile is already verified, Bing may
auto-verify the listing as part of the import.

- If a Google Business Profile exists, use the import. Confirm the category
  lands on a software or marketing category, not a food one.
- If it does not exist, **create the Google Business Profile first**. It is
  worth more than the Bing listing on its own and it makes the Bing one nearly
  automatic.

Set it up as a **service-area business**, not a storefront. There is no walk-in
office and we deliberately publish no street address. Bing Places supports
service-area businesses.

- **Category (primary):** Website Designer. Secondary: Internet Marketing
  Service, Marketing Agency, Software Company, Telephone Answering Service.
  (Corrected 2026-07-30: this used to say Software Company primary. "Software
  company" carries almost no local query intent. Categories must match the
  Google Business Profile exactly, see `google-business-profile-kit.md`.)
- **Service area:** Kalispell, Whitefish, Columbia Falls, Bigfork, Polson,
  Flathead County, Montana.
- **Phone / site / hours:** (406) 312-1223, https://modernmustardseed.com,
  open 24 hours (the voice agent genuinely answers around the clock).

---

## Action 3: Third-party corroboration (ongoing)

Bing wants to see the same name, phone, and city stated somewhere it did not get
from us. Consistent NAP across a few real directories is what converts "a website
that claims to be a company" into "a company."

Highest value first:
1. **Kalispell Chamber of Commerce** membership listing (local authority, and
   Bing trusts chamber domains).
2. **Crunchbase** company profile (free tier, widely scraped by answer engines).
3. **Clutch** or **DesignRush** agency profile (category-relevant, high domain
   authority, and they rank for "AI agency Montana" style queries).

Use the exact NAP from `SITE` in `lib/seo.ts`. Never retype the phone.

---

## Action 4: Wikidata (do this last, and know the risk)

Bing's knowledge graph leans on Wikidata harder than Google's does, so an entity
there is a direct feed. But be honest about the odds: Wikidata's notability rule
wants an entity described by "serious, publicly available references." A
one-person studio with no press coverage can get the item deleted as
promotional, and a deletion is a worse outcome than no entry.

**Do Actions 1 through 3 first.** They create the references that make a Wikidata
item defensible. Revisit once there is a chamber listing, a Crunchbase profile,
and ideally one piece of independent local press.

---

## How to verify it worked

Bing is slow on entity changes. Expect 2 to 6 weeks after the LinkedIn and Bing
Places listings go live, not days.

1. **Bing Webmaster Tools** (https://www.bing.com/webmasters) is already
   verified via the meta tag. Log in and check Site Explorer for real index
   coverage, and use URL Inspection on `/` and `/about`.
2. Re-run the index check:

       curl -s "https://modernmustardseed.com/api/indexnow?health=1"

3. Query Bing and Copilot directly for "Modern Mustard Seed Kalispell" first
   (the qualified query resolves before the bare brand name does), then the bare
   "Modern Mustard Seed" as the real success test.
4. Validate the schema at https://validator.schema.org against
   https://modernmustardseed.com.

## Do not

- Do not add a LinkedIn `sameAs` URL before the page exists.
- Do not invent a legal entity name, a street address, or a founding date that
  differs from 2024. NAP inconsistency is the fastest way to lose an entity
  match.
- Do not add aggregateRating or Review markup for MMS itself. See
  the note in memory `mms-seo-indexing.md`; it risks a sitewide manual action.
