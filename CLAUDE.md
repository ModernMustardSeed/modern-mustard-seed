# Modern Mustard Seed Website — CLAUDE.md

## What This Is
Company website for Modern Mustard Seed. Marketing site, blog, case studies, playbooks, AI audit tool, and contact + build-queue intake.

## Tech Stack
- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 3
- MDX (next-mdx-remote) for blog, work, and playbook content
- Supabase (contact/audit/build-queue inbox)
- Resend (transactional email)
- Three.js (visual accents only, not core)
- Vercel (host) + Vercel Analytics
- Anthropic Claude API (AI Audit engine on /audit)

## SEO & GEO
- Per-route metadata via `lib/seo.ts` (`buildMetadata` helper).
- JSON-LD graph in `lib/jsonld.tsx`: Organization, Person (Sarah), WebSite (with SearchAction).
- Per-page schemas: BlogPosting, Article, HowTo, FAQPage, Service, BreadcrumbList, AboutPage. All with `dateModified`, `wordCount`, `speakable`.
- Dynamic sitemap (`app/sitemap.ts`), robots (`app/robots.ts`), llms.txt (`public/llms.txt`), .well-known/ai.txt.
- OG image generated dynamically by `app/opengraph-image.tsx`.
- FAQ schema on the homepage.

## Build & Run
```bash
npm run dev     # Dev server
npm run build   # Production build
```

## Live URL
https://modernmustardseed.com

## Branch
master

## Deploy Hygiene (incident 2026-07-11: domain 404'd DEPLOYMENT_NOT_FOUND for ~1 hour)
- NEVER run `vercel alias set/rm` or `vercel domains add/rm` on this project. The production domain must stay a project domain that Vercel flips atomically when a build goes Ready. Hand-managed aliases point at queued builds and take the site DOWN for the whole build.
- Do not stack production deploys. Before `vercel --prod`, run `vercel ls` and wait if a production build is already Queued/Building. Batch your changes into one deploy instead of deploying per commit.
- If the site 404s with `X-Vercel-Error: DEPLOYMENT_NOT_FOUND`: diagnose with `curl -sI https://modernmustardseed.com` → `vercel ls` → `vercel domains inspect modernmustardseed.com` → `vercel alias ls | grep mustardseed`. Only re-attach (`vercel domains add modernmustardseed.com`) if the inspect table shows NO project AND no build is in flight.

## Conventions
- No em dashes in user-facing prose (Sarah's rule).
- Internal links use `next/link`. Outbound links open in new tab with `rel="noopener noreferrer"`.
- MDX content lives in `content/{blog,work,playbooks}`. Frontmatter is parsed by `lib/content.ts`.
- Any new public route must also be added to the static path list in `app/sitemap.ts` if it is not content-driven.
- **Modals/popups must never clip their top on short screens.** A centered overlay whose child can be taller than the viewport will push its top off-screen with no way to scroll up. Always build modal cards as a height-capped flex column: overlay `fixed inset-0 flex items-center justify-center p-4`, card `max-h-[90vh] flex flex-col`, header `shrink-0` (pinned), body `overflow-y-auto`. (Side drawers: full-height `overflow-y-auto` + sticky header. Bottom-anchored panels: `max-h-[..vh]` + internal scroll.) Verify every new modal at a short viewport (e.g. 1100x620).
