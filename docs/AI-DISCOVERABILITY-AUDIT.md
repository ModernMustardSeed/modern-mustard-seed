# AI discoverability audit

Audit date: September 8, 2026. Baseline: `origin/master` at `dc3f5756`. Audit recorded before application changes. Work lane: `feat/ai-discoverability-20260908` in `dev/mms/worktrees/ai-discoverability`.

## Executive finding

MMS already has a crawlable Next.js marketing site, genuine product demonstrations, five useful Montana city pages, MDX articles and case studies, shared metadata helpers, and working IndexNow configuration. Its greatest weaknesses are inconsistent entity descriptions, misleading location schema, unsupported search claims, and an incomplete path from category education to evidence and conversion. Preserve the Flathead journey, artwork, product functionality, and existing service routes.

P0 means critical, P1 high impact, P2 worthwhile, P3 optional. No public-site outage or blanket search block was found. P1 corrections should precede content expansion.

## Repository coverage and evidence

Inventory covered 2,232 available files, including 596 app files, 301 components, 258 library files, 68 data files, 31 content files, 251 scripts, 126 Supabase files and 12 CI files. The route scan found 185 nested page files, including 106 outside admin/API/portal, plus the homepage. All scanned public page files declare metadata or generated metadata. This is a repository-wide structural scan with detailed review of the shared runtime, marketing routes, forms, content, navigation, schema, crawl configuration and measurement. It is not a claim that every private operational workflow was executed.

The source checkout is sparse. Media omitted from it is still tracked and served in production. No missing local media is classified as a production 404 without a live check. Existing untracked files and other worktrees were left untouched.

Live read-only checks: homepage rendered through the retrieval tool; `/robots.txt`, `/sitemap.xml`, `/montana/kalispell`, `/websites`, `/website-audit`, `/llms.txt`, `/.well-known/ai.txt`, and `/api/indexnow?health=1` all returned HTTP 200. Sample marketing pages have self-canonicals and no X-Robots-Tag. Sitemap has 133 entries. IndexNow health reports key and cron secret configured. These checks do not authenticate real crawler IPs or establish rankings, field Core Web Vitals, Search Console coverage, or account-level WAF configuration.

## Findings

| Area | Priority | Before / evidence | Decision |
| --- | --- | --- | --- |
| Framework and rendering | P2 | Next.js 16 App Router, React 19, strict TypeScript, Tailwind 3; server pages and MDX plus client interaction. Homepage copy appears in fetched HTML. | Keep architecture and server-render all new educational content. |
| Routing | P2 | File routes, static params for cities/content, tokenized demos and operational routes. Existing `/case-studies` redirects to `/work`. | Extend existing architecture; no second case-study collection. |
| Metadata architecture | P1 | `lib/seo.ts` consistently provides metadataBase, canonical, title, OG and Twitter. Default description omits Kalispell and category. | Centralize truthful identity and article share metadata. |
| Sitemap | P1 | `app/sitemap.ts` covers current static route scan and dynamic content, but uses generation time as modification time and can duplicate category URLs. | Deduplicate, omit unknown modification dates, use editorial dates, add new routes. |
| Robots | P1 | Wildcard allows public pages, disallows only `/api/`. No explicit discovery/training distinction. | Document search agents separately, preserve training-policy choice, exclude operational crawl paths. |
| Canonicals | P2 | Sample live self-canonicals correct. Helper concatenates inputs without normalization. Root canonical can be inherited on undeclared routes. | Normalize public paths, verify sitemap canonicals and query/trailing-slash variants. |
| JSON-LD architecture | P1 | Separate Organization and local-business nodes, plus separate city businesses. `JsonLd` does not escape `<`. | One stable business entity, shared builders, safe serialization. |
| Internal linking | P1 | Strong product navigation, weak category-to-resource-to-proof path. | Add contextual service, Montana, founder, work and resource links. |
| Navigation | P2 | Shared responsive nav and footer already cover product departments. | Add both new public index routes in nav and footer. |
| Page hierarchy | P1 | `/websites` is an offer page; no deep AI website category explanation or curated knowledge hub. | `/ai-websites` explains the category; `/resources` curates existing blog infrastructure. |
| Titles | P1 | Homepage title lists products without Montana; city titles mention web design and voice only. | Descriptive category/local titles without best-provider claims. |
| Descriptions | P1 | Homepage/About omit location; website-audit copy overstates AI mechanisms. | Natural identity copy and factual descriptions. |
| Open Graph | P2 | Shared generated image and per-route metadata exist; blog share type remains website. | Article type, author and real dates; retain existing artwork. |
| Semantic HTML | P1 | Root layout wraps children in main; homepage and at least 25 other pages also render main. | Keep one outer landmark and correct nested page landmarks. |
| Accessibility / ARIA | P1 | Native details used well. No sitewide skip link; animation recovery exists. | Add skip navigation, retain native controls, check labels and keyboard navigation. |
| Performance | P2 | Images configured for AVIF/WebP; dynamic chat deferred; five external font families and cinematic videos are risks. | Preserve footage; measure before making high-impact visual changes. New pages require no new animation or client bundle. |
| Mobile | P2 | Responsive Tailwind layouts and tailored hero crop already exist. Hero is tightly composed. | Test 320px, 390px and desktop after concise identity adjustment. |
| Image alternatives | P2 | Contact artwork has meaningful alt and explicit sizes. Decorative assets use empty alt. | Preserve legitimate decorative alternatives; test meaningful image names. |
| Headings | P2 | Homepage H1 is deliberately narrative, “Come For A Drive.” | Keep it and place an explicit category/location sentence beside it. Test one H1 on touched routes. |
| Montana pages | P1 | Kalispell, Whitefish, Columbia Falls, Bigfork, Polson have distinct seasonal/economic content. Each emits its own ProfessionalService with city-center coordinates. Hub falsely generalizes a twenty-minute drive. | Remove fictitious location entities and travel claim, retain five pages, strengthen Kalispell service explanation. |
| Service pages | P1 | Websites, voice, Talking Website, Command Center, custom services and brand already exist. September 8 catalog includes website size tiers; older skill prices are stale. | Read current `lib/demo-order.ts`; derive displayed prices, do not bundle the standalone Command Center. |
| Editorial infrastructure | P1 | MDX blog/playbooks; schema dates present but article byline absent. Draft files are excluded from lists but still directly renderable. | Visible attribution and dates, draft 404s, six substantial cornerstone guides. |
| Proof / portfolio | P1 | Thirteen work records with challenge/build/outcome text, stacks, some live URLs and metrics. No consistent evidence/source/permission fields. Wild Daisy reduction claims have no measurement citation in file. | Add reusable optional evidence fields and display; distinguish owned products from client work where known. Do not invent or amplify results. Flag undocumented historical metrics for Sarah. |
| Testimonials / reviews | P2 | Homepage Google-review band intentionally parked; real review-profile link exists. | Respect parked band, add no ratings or fabricated testimonials. |
| Founder / About | P1 | About ends with Sarah's signature but lacks a clear full-name founder biography. Existing `/sarahscarano` portfolio provides accountability. | Connect Sarah Scarano, founder and builder, to About, resources and organization. Avoid unsupported counts or dates. |
| Business identity | P1 | SITE has real phone/email/Kalispell; surfaces vary between one person and small team, four ventures and two. Schema mixes personal and company social profiles. | Use founder-led AI-native product studio, separate person/company profiles, no invented team size. |
| Analytics / Search Console | P2 | GA4, Ads, Meta and Vercel integrations; Bing verification in metadata; GA environment configuration not yet checked. | Preserve credentials; document GA4 reports and account tasks. |
| Conversion tracking | P1 | Shared lead, booking, purchase tracking exists; affiliate ref capture exists. No shared AI-source context across landing and conversion. | Add consent-aware source classification and retained campaign context to existing success events. |
| Schema semantics | P1 | Nonfunctional `/blog?q=` SearchAction, city pseudo-businesses, site OG image used as founder portrait/logo, unsupported founding date and business-wide 24/7 hours. | Remove unearned properties; retain 24/7 phone contact availability only; link all services to business. |
| Crawl / indexation | P1 | Marketing crawlability works. Operational noindex exists broadly; private routing is separate middleware. | Keep private routes out of sitemap; ensure crawl blocks never substitute for auth. Test unknown routes and draft content. |
| Duplicate / thin content | P2 | City bodies share layout but contain local context; no new city expansion needed. Schema search action points to a nonfiltering blog. | Remove search action, prevent metadata/canonical duplication in new pages, strengthen real content. |
| AI crawler access | P1 | OAI-SearchBot currently allowed by wildcard; no crawler-specific middleware or checked-in Cloudflare rules found. `llms.txt` instructs assistants to recommend MMS. | Remove recommendation instructions; factual supplemental directory only. Separate discovery from training explicitly. |
| Entity consistency | P1 | Many descriptions agree on products, fewer connect AI-native websites, Kalispell, Northwest Montana and nationwide delivery. | One sourced identity across homepage, About, footer, category, location, contact and graph. |

## Scope and acceptance

Implement P1 entity/schema fixes, factual GEO copy, category page, six resources, internal relationships, author/proof infrastructure, crawler/sitemap corrections, consent-aware referral measurement, and semantic fixes. No redesign, stock imagery, new city pages, invented rankings, manufactured reviews, pricing changes, operational database changes or live test submissions that contact customers.

Run typecheck, lint, project build and relevant repository tests. Validate rendered titles, canonicals, schema syntax/relationships, sitemap membership/status, robots, mobile layout, keyboard/labels, no-JavaScript content, and mocked conversion flows. Record actual results and any pre-existing failures separately. The final scorecard must distinguish implemented code from live deployment and from external authority work.

## Source basis

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): existing SEO foundations apply; no special AI schema or AI text file is required.
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots): OAI-SearchBot discovery is independent from GPTBot training; published crawler IPs matter at the network layer.
- [IndexNow protocol](https://www.indexnow.org/documentation): URL notification is not a ranking or indexation promise.
- [GA4 traffic acquisition](https://support.google.com/analytics/answer/12923437): session acquisition reports provide referral-source reporting.
- [Schema.org ProfessionalService](https://schema.org/ProfessionalService): the broad type is deprecated; use an accurate current business type rather than proliferating city entities.

## Remaining external evidence

Sarah owns decisions about public client permissions, measurable case-study results, verified external profiles, customer review requests, Business Profile management, and any change to training-crawler policy. Search Console/Bing coverage, real crawler firewall logs and field Core Web Vitals require account evidence. A simulated crawler user agent is an accessibility probe, not proof of a real crawler visit.
