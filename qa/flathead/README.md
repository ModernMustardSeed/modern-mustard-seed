# Flathead editorial verification

The approved Flathead home is integrated into the real Next.js app. Its portfolio contains 13 real destinations and optimized screenshots. Public routes share Instrument Serif, Manrope, cream, ink, cobalt, and mustard. Existing case studies, service copy, contact handlers, bookings, consent, attribution, analytics, and private app scope remain connected.

Verified on October 2, 2026:

- All nine repository build gates pass. The production build renders all 497 static pages on the updated master base.
- TypeScript passes as part of the production build.
- Browser report: 53 passing checks, including 45 public routes, four home viewport sizes, inquiry error and success, booking success with query prefills, private scope, and readable content without JavaScript.
- Gallery swipe and arrow navigation, disabled end controls, all 13 loaded images, keyboard FAQ controls, and film selection pass.
- Edition 10: the 13-project band loops automatically, with pause/play, hover and focus pause, manual control, and reduced-motion support. Build-type labels are removed. The Websites hero plays a real Built Right in Montana walkthrough and links to the live site.
- Both film players share a 50-film catalog. All 50 videos and 50 optimized posters return HTTP 200. Search and IRL/HUCKWILD selection and playback pass on Mustard Pictures.
- Brand/Rebrand is removed from the page, navigation, service map, and sitemap. `/brand` permanently redirects to `/websites` and retains query parameters. The old share-image URL redirects to the site's current share image.
- Real portfolio destinations returned HTTP 200 when captured. Screenshots reflect the destination websites.
- Contact and booking requests are intercepted in browser tests. No messages, bookings, purchases, or worker jobs are created by these tests.
- Intake parsing and acquisition worker helper tests pass. The complete acquisition suite has one pre-existing assertion mismatch: keypad outreach expects `/demos`, while the unchanged campaign links to `/mustard`. The other 173 tests pass.

Run `node qa/flathead-build.mjs`, start the production server on port 4320, then run `node qa/flathead-browser.mjs`. A deployed origin can be supplied as the browser script's first argument. The local build uses webpack because node_modules is a junction in this isolated Windows worktree. It executes every command in the real package build script.

`node qa/flathead-v10.mjs` verifies the new gallery behavior, retired route, client hero playback, film search, film selection, and every catalog video and poster URL. Its report is in `qa/flathead-v10/report.json`. Do not rebuild `.next` while a server under test is running; restart the production server after a completed build.

The workspace skill's `C:/Users/SMSca/.codex/tools/shot.mjs` is missing. The committed Playwright script performs desktop and phone screenshots directly, including services, portfolio, public pages, and submitted forms. PNG review artifacts stay local; report.json records the checks.

Live email delivery, payments, voice calls, and scheduled worker execution are not triggered by this visual change's verification. Those integration implementations retain their existing behavior.
