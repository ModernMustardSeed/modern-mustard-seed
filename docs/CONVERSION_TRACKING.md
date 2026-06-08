# Conversion Tracking Setup

This site ships with GA4, Google Ads, and Meta Pixel wiring already in the code.
Nothing fires until you add the IDs as environment variables in Vercel. Each
platform no-ops cleanly when its ID is missing, so partial setup is safe.

## What is already wired

- **Script loader:** `components/AnalyticsScripts.tsx` (loaded globally in `app/layout.tsx`).
  Loads gtag.js (GA4 + Google Ads) and the Meta Pixel, and sends page views on every
  SPA route change.
- **Conversion helpers:** `lib/analytics.ts` (`trackLead`, `trackBooking`, `trackPurchase`).
- **Conversion fire points (already firing the right events):**
  | Action | Where | Event |
  |--------|-------|-------|
  | Contact form submit | `components/ContactForm.tsx` | `generate_lead` / Ads lead / Meta `Lead` |
  | AI audit lead capture | `components/AIAuditEngine.tsx` | `generate_lead` / Ads lead / Meta `Lead` |
  | Discovery call booked | `components/BookCall.tsx` | `schedule` / Ads booking / Meta `Schedule` |
  | Store purchase complete | `app/store/[slug]/success/SuccessClient.tsx` | `purchase` (with real $ value) / Ads purchase / Meta `Purchase` |

## Environment variables (set in Vercel: Production + Preview)

```
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_LABEL_LEAD=xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GOOGLE_ADS_LABEL_BOOKING=xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE=xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_META_PIXEL_ID=xxxxxxxxxxxxxxx
```

All are `NEXT_PUBLIC_` (they run in the browser, so they are not secrets).
After adding them, redeploy so the build picks them up.

## Setup steps

### Google Analytics 4
1. analytics.google.com -> Admin -> Create property -> add a Web data stream for
   `https://modernmustardseed.com`.
2. Copy the Measurement ID (`G-...`) into `NEXT_PUBLIC_GA4_ID`.

### Google Ads
1. ads.google.com -> Tools -> Conversions -> New conversion action -> Website.
2. Create three actions: **Lead**, **Booking** (use "Contact" or "Book appointment"),
   **Purchase**. Choose "Use Google tag" (do not install a separate event snippet,
   the code already fires the events).
3. From the tag setup, copy the conversion ID (`AW-...`) into `NEXT_PUBLIC_GOOGLE_ADS_ID`
   and each action's conversion label into the matching `..._LABEL_*` var.
4. Link Google Ads to your GA4 property (Admin -> Product links) and to your Google
   Business Profile (for location/call assets on Search ads).

### Meta Pixel
1. business.facebook.com -> Events Manager -> Connect data source -> Web -> Meta Pixel.
2. Copy the Pixel ID into `NEXT_PUBLIC_META_PIXEL_ID`.
3. Verify the domain `modernmustardseed.com` (Business Settings -> Brand Safety ->
   Domains). Required for iOS attribution and Aggregated Event Measurement.
4. In Events Manager, prioritize the 8 web events (put `Purchase` and `Lead` at the top).

## Verifying it works

- **GA4:** Realtime report should show your visit. Submit a test lead and confirm a
  `generate_lead` event appears.
- **Google Ads:** Use the Google Tag Assistant (Chrome extension) to confirm the tag and
  conversion fire. Conversions can take up to 24h to show in the Ads dashboard.
- **Meta:** Use the Meta Pixel Helper (Chrome extension). It should show PageView on load
  and `Lead` / `Schedule` / `Purchase` when you trigger those.

## Important: do not run Smart Bidding or Performance Max before conversions accumulate.
Start with manual or Maximize Clicks until you have ~15-30 conversions, then switch to
conversion-based bidding. Send paid traffic to `/lp` (the dedicated, noindexed landing
page), not the homepage.
