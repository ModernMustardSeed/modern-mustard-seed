# AI referral measurement

Implemented September 8, 2026. This document describes identifiable referral traffic, not all AI recommendations or no-click exposure.

## Where Sarah sees it

1. Open the MMS Google Analytics 4 property. Go to **Reports > Acquisition > Traffic acquisition**. Select **Session source / medium** as the primary dimension. Filter sources containing `chatgpt`, `perplexity`, `gemini.google.com`, `copilot.microsoft.com`, `claude.ai`, `grok.com` or `you.com`. Inspect sessions, engaged sessions and the existing conversion events. GA4 navigation can vary with the property's report collection; use the report search if Acquisition is not pinned. [Google's traffic acquisition reference](https://support.google.com/analytics/answer/12923437).
2. For the source retained across MMS pages, open **Admin > Data display > Custom definitions > Create custom dimension**. Create the following event-scoped dimensions. The display name is flexible; the event parameter must match exactly.

| Display name | Event parameter | Values / meaning |
| --- | --- | --- |
| AI source | `ai_source` | chatgpt, perplexity, gemini, copilot, claude, grok, you |
| AI source evidence | `ai_source_evidence` | `referrer` or `utm` |
| AI landing page | `ai_landing_page` | Original public page path, without query or fragment |
| Landing campaign | `landing_utm_campaign` | Accepted campaign identifier |
| Landing source | `landing_utm_source` | Accepted source identifier |
| Landing medium | `landing_utm_medium` | Accepted medium identifier |

3. In **Explore > Free form**, use AI source and AI landing page as rows, Event name as columns, and Event count / Total users as values. Filter AI source to the values above. Inspect `page_view`, `generate_lead`, `schedule` and `purchase` separately. Mark the business's chosen successful events as key events in GA4. A CTA click is not a completed booking.
4. Register definitions before starting the monthly comparison. Definitions do not backfill past custom-dimension reports. Allow processing time before expecting the exploration to populate. Check Realtime or DebugView during a controlled test first. [GA4 custom dimensions](https://support.google.com/analytics/answer/14240153).

The code uses the existing `NEXT_PUBLIC_GA4_ID`. It contains no analytics credentials. The local production build does not confirm that the deployed Vercel environment has this variable configured or that the owner has selected the correct GA4 property. The verification files and Vercel analytics integration already in the repository are preserved.

## What the implementation does

`lib/ai-attribution.ts` classifies exact hostnames and their subdomains. It rejects lookalikes such as `chatgpt.com.attacker.example`. Referrer evidence takes precedence over a UTM claim when both exist. Arbitrary tagged links can be created by anyone, so UTM-attributed sessions should not be described as verified citations.

`AcquisitionCapture` retains the initial URL and referrer in memory until consent is granted. Only after analytics consent does it persist sanitized campaign identifiers and AI context in `sessionStorage`. It keeps the first context in the current tab session, with a 30-minute inactivity cutoff. It clears that context on consent withdrawal. Private operational landing paths are excluded. It does not store the full referring URL, arbitrary query parameters, email addresses or signed tokens. Storage failures fall back to memory.

`lib/analytics.ts` adds this context to existing successful lead, booking and purchase events and other events using the shared helper. It now guards both Google and Meta event dispatch against denied or withdrawn consent. Existing Vercel analytics is unchanged. A Vercel-only event does not automatically receive the new GA4 dimensions.

`AnalyticsScripts` adds context to page views and waits for tag initialization before sending its first page view. This avoids dispatching that event before the platform configuration has run.

`AttributionLink` retains allowed UTM values on internal links to `/demos`, `/book`, `/contact` and `/website-audit`. It preserves parameters already set by the destination and preserves fragments. It does not decorate external, payment, signed, portal or arbitrary links. Server-rendered HTML remains an ordinary crawlable link, with canonical URLs free of campaign parameters. Without consent, no new analytics storage or campaign decoration is added.

The existing affiliate `ref` cookie and partner-click flow are separate and unchanged. The new context does not replace the business source field used for operational routing. This release does not add database columns or alter checkout APIs.

## Reproduce the local measurement test

Start the production build on port 3108, then run:

```powershell
node scripts/qa-ai-conversions.mjs
```

The test arrives from a simulated ChatGPT referrer with a campaign, checks no pre-consent storage, grants consent, checks the demo link, submits a contact form and a booking against intercepted local API responses, verifies the preserved source, verifies that a failed contact request does not emit a lead, then withdraws consent and verifies storage removal. It sends no live enquiries, emails, calls or calendar bookings. Evidence is written to `C:/Users/SMSca/artifacts/mms-ai-discoverability/conversions.json`.

Run the pure classifier and canonical tests with:

```powershell
node node_modules/tsx/dist/cli.mjs --test scripts/test-ai-discoverability.tsx
```

## Monthly owner report

Record sessions and completed actions by identifiable AI source and landing page. Compare them with the previous month and with all site traffic. Keep a separate log of the ten benchmark questions in the scorecard, exact answers, citations, dates and whether live search was enabled.

Use CRM and payment records to establish the eventual business outcome. This implementation does not claim a revenue join that has not been built. Unknown/direct visits remain unknown. Native apps, privacy settings, copied links and no-click answers leave gaps. GA4 consent coverage also affects observed totals.

## Crawl and training decisions

OAI-SearchBot controls OpenAI search discovery. GPTBot is a separate training control. The implementation explicitly describes discovery bots and preserves the former wildcard behavior for training agents. It does not introduce a new training opt-in or silently opt the business out of an existing policy. Sarah can make a separate decision by adding an explicit GPTBot rule to `app/robots.ts`; Google-Extended and Applebot-Extended likewise need separate consideration. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots), [Apple crawler documentation](https://support.apple.com/en-us/119829).

An allowed robots rule is not proof of a successful real crawler visit. Verify real requests against published IP information and inspect hosting firewall logs. No checked-in Cloudflare configuration was found in this audit.
