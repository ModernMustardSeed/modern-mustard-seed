# AI discoverability scorecard

September 8, 2026. Before: repository and live-site audit recorded in `AI-DISCOVERABILITY-AUDIT.md`. After: implemented branch, with verification evidence below. These are engineering readiness assessments, not Google scores, measured market authority, or predictions of AI recommendations. Each category is scored from 0 to 100 against the requested acceptance criteria. External evidence and account configuration remain explicitly unverified.

| Category | Before | After | Change and remaining human tasks |
| --- | ---: | ---: | --- |
| Technical crawlability | 82 | 94 | Server-rendered content, clean canonicals, draft exclusion and checked sitemap. Sarah: confirm Search Console coverage. |
| Entity clarity | 57 | 94 | One business identity, visible Kalispell/nationwide scope and founder relationships. Sarah: keep external profiles consistent. |
| Local authority | 58 | 74 | Existing Montana hub and five distinct cities improved without new offices or city duplication. Sarah: claim/update Google Business Profile and obtain authentic local reviews. |
| Service clarity | 71 | 94 | AI website category, product distinctions and exact current pricing connected to established products. |
| Structured data | 58 | 94 | Reusable entity graph, Services, page types, breadcrumbs and editorial authors/dates. No invented ratings or offices. |
| Original expertise | 56 | 83 | Six substantial sourced guides with practical examples and technical boundaries. Sarah: add first-hand findings from approved client work. |
| Proof / case studies | 45 | 66 | Reusable sourced evidence fields and founder-owned relationship disclosed. Sarah: supply approved screenshots, quotes, measurement sources and dates; review remaining historical claims. |
| Internal linking | 68 | 91 | Category, resources, products, local pages, work and founder connected through contextual links and navigation. |
| AI crawler readiness | 75 | 94 | Explicit discovery-bot access; training treatment preserved separately. Sarah: check real bot requests and any account-level WAF controls. |
| Traditional SEO | 76 | 92 | Titles, descriptions, article metadata, sitemap hygiene and useful topical coverage. Sarah: monitor indexing and query performance. |
| Conversion readiness | 81 | 92 | First-screen identity, demo/phone/booking paths, campaign continuity and tested form responses. No live purchases or voice calls made in QA. |
| Accessibility / agent usability | 69 | 87 | Public main landmarks, readable static content, preserved native labels and repaired contrast on primary journeys. Automated checks are complemented by mobile screenshots. |
| AI referral measurement | 37 | 85 | Consent-gated source recognition and conversion context, instructions in `AI-REFERRAL-MEASUREMENT.md`. Sarah: register GA4 dimensions and confirm the deployed property. |

Unweighted mean: 64 before, 88 after, rounded. Scores deliberately leave room for actual customer evidence, off-site authority, real indexing data and assistive-technology testing.

## Implemented routes

- `/ai-websites`: flagship category, technical distinctions, shared business knowledge, verified package ladder and demo paths.
- `/resources`: six-guide knowledge hub connected to the existing GEO Desk.
- `/blog/montana-business-guide-chatgpt-search`
- `/blog/ai-native-website-vs-traditional-website`
- `/blog/how-chatgpt-finds-local-businesses`
- `/blog/geo-vs-seo-montana`
- `/blog/ai-readable-website-checklist`
- `/blog/measure-ai-search-referrals`

Existing `/websites`, `/talking-website`, `/voice-agents`, `/website-audit`, `/montana`, `/montana/kalispell`, the other four Montana city pages, `/about`, `/contact` and `/work` remain the canonical destinations. `/case-studies` continues redirecting to `/work`.

## Verification evidence

Final results and release state are recorded in `AI-DISCOVERABILITY-VERIFICATION.md`. Reproducible checks are committed in `scripts/test-ai-discoverability.tsx`, `scripts/qa-ai-discoverability.mjs`, `scripts/qa-ai-conversions.mjs` and `scripts/qa-ai-performance.mjs`.

## Remaining human tasks, sequenced

1. Confirm the MMS GA4 property and Search Console access. Register the event-scoped dimensions described in the measurement guide. Confirm sitemap coverage after release and watch indexed pages and completed leads.
2. Confirm or claim the real Google Business Profile, keeping Kalispell as the actual base and service areas accurate. Review real social profile ownership and business contact details. Request authentic reviews from customers without supplying invented text.
3. Supply approved project screenshots, client permissions, exact quotes and sourced outcomes with dates. Review the historical portfolio claims called out in `CASE-STUDY-EVIDENCE.md`. Add real founder and team photographs when available.
4. Pursue relevant Montana press, professional relationships and useful contributions with Sarah's explicit outreach authorization. No outreach or review request was sent during this project.
5. Decide training crawler preferences independently of search discovery. Inspect real crawler traffic and hosting/WAF settings outside the repository before claiming all systems have crawled the site.

## Ten monthly benchmark questions

1. Who would you suggest for an AI optimized website designer in Montana, especially around Kalispell?
2. Who builds AI-native websites in Kalispell?
3. Who are the best custom website designers in Northwest Montana?
4. Who builds AI voice agents or AI receptionists for Montana businesses?
5. Which Montana company builds a website and AI receptionist that share business information?
6. Who can help a Montana business appear in ChatGPT search?
7. Which Montana studio offers GEO or answer engine optimization?
8. Who builds AI automation and custom AI software in Kalispell?
9. Who builds agentic business websites for clients nationwide from Montana?
10. Where can I see a working demo of an AI website and voice agent from a Montana company?

Run each in fresh sessions in the search products being tracked. Record date, product/model, search enabled state, location context, exact answer, cited URLs, whether MMS appears, recommendation position if any, and factual errors. Keep prompts and conditions stable. Separate mention rate from citation rate and from actual referral conversions. Do not treat personalized answers or one favorable run as market rank.
