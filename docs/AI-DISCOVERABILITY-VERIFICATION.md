# AI discoverability verification

September 8, 2026. Worktree: `C:/Users/SMSca/dev/mms/worktrees/ai-discoverability`. Branch: `feat/ai-discoverability-20260908`. Current integration base: `b7d11634`. The original pre-change audit remains tied to `dc3f5756`.

## Results

| Check | Result |
| --- | --- |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit`: passed. |
| Full project lint | `pnpm lint`: zero errors, 330 existing warnings. Focused new-file lint: zero errors. DemoStation retains its existing state-in-effect warning. |
| Copy tests | `pnpm test:copy-lint`: 29 passed. Three pre-existing possessive-copy failures repaired using the existing helper. |
| Discovery regression tests | Eight passed: JSON-LD script safety, entity identity, canonicals, sitemap/drafts, crawler rules, substantial dated resources, strict source detection, campaign links. |
| Production build | `pnpm build`: 451 static pages generated. Includes all existing worker, voice, template, pricing and cron gates. |
| Sitemap / metadata crawl | All 141 canonical sitemap URLs return 200 with a title, correct canonical, no accidental noindex, and parseable JSON-LD. |
| Internal links | 117 distinct public HTML link destinations across the 141 sitemap pages. Zero HTTP errors. Action APIs, signed/private destinations, external sites and files excluded from this link test. |
| Discovery user agents | Five simulated search user agents receive readable public HTML. This tests server response, not verified real crawler traffic or external WAF behavior. |
| Browser matrix | 13 primary routes at 320, 390 and 1440 pixels. 39 checks, with no overflow or JavaScript page errors. New category, resource hub and guide pass automated WCAG A/AA main-content checks. |
| JavaScript disabled | Homepage, AI Websites, Resources, Kalispell and technical guide retain visible headings and substantial main content. |
| Conversion behavior | Local API-intercepted contact success/failure, booking, demo failure/success, attribution continuity, UTM links and consent withdrawal. No live messages, bookings, purchases or voice calls made. |

Raw JSON, build log and screenshots are retained in `C:/Users/SMSca/artifacts/mms-ai-discoverability`. These are local QA artifacts, not production telemetry.

## Performance experiment

The same `/ai-websites` page was tested with Lighthouse mobile simulation before and after replacing the render-blocking Google Fonts stylesheet with Next.js self-hosted loading. The font families and visual design remain intact.

| Metric | External stylesheet | Self-hosted fonts |
| --- | ---: | ---: |
| Performance | 69 | 88 |
| LCP | 5.6 s | 3.5 s |
| CLS | 0.015 | 0.014 |
| Accessibility | 100 | 100 |
| SEO | 100 | 100 |
| Best practices | 96 | 96 |

The best-practices deduction includes the local server's absent Vercel analytics endpoints. This comparison is one controlled local run per version, not field Core Web Vitals or a production performance guarantee. No cinematic homepage imagery or animation was removed.

## Release scope and follow-up

See the scorecard for evidence that requires Sarah and the full changed-file manifest for implementation scope. The reusable schema uses one Organization/LocalBusiness identity, Person, WebSite, WebPage/AboutPage/ContactPage, Service, BreadcrumbList and editorial Article/BlogPosting relationships. Existing visible FAQs retain FAQPage markup. Unsupported city-office and search-action claims were removed.

Robots access keeps search discovery separate from training policy. Existing IndexNow key, endpoint and schedule remain in place. No keys, pricing data, payment integration or voice-agent provisioning were replaced.

## September 9 recovery and integration

Recovered the interrupted session and rebased the three implementation commits onto `ce8da84a`, preserving the AI Native offer, Daily Posting payment page and direct-payment Delivery Board changes merged overnight.

- TypeScript passes. Full lint has zero errors and 328 warnings. The preview test also passes focused lint.
- All eight discovery regression tests and all 29 copy tests pass.
- The production build passes, generating 455 pages with all repository build gates enabled. Evidence: `build-resumed.log` in the artifact directory above.
- Rebased integration QA passes all 142 sitemap pages, 118 internal link destinations and 39 browser checks. Five simulated crawler responses are readable; five JavaScript-disabled pages retain their content. Consent, attribution, contact, booking and demo conversion tests pass against intercepted business APIs. Evidence: `resumed/report.json`, `links.json` and `conversions.json` in the artifact directory.
- The September 8 preview at `modern-mustard-seed-mtxmkczp2-sarah-7990s-projects.vercel.app` contains the new pages. The interrupted test was reading Vercel authentication HTML rather than application HTML. Authenticated verification passes nine HTTP checks and nine browser checks at 320, 390 and 1440 pixels.
- Vercel's preview `X-Robots-Tag: noindex` is expected. The test separately requires production responses to have no noindex header. Application canonicals always point to the production domain.

`scripts/qa-ai-preview.mjs` supports `VERCEL_AUTOMATION_BYPASS_SECRET` supplied in the process environment. It sends that credential only to the specified deployment origin, never to external browser requests, and never writes it into reports. No deployment protection setting was changed. For public production verification, omit the credential:

```powershell
node scripts/qa-ai-preview.mjs https://modernmustardseed.com
```

Use `AI_QA_OUT` to choose a separate evidence directory. Release state is confirmed by the merged PR and the final deployment report, not by the preview build status alone.
