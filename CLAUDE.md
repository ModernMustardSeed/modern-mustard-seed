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

## Conventions
- No em dashes in user-facing prose (Sarah's rule).
- Internal links use `next/link`. Outbound links open in new tab with `rel="noopener noreferrer"`.
- MDX content lives in `content/{blog,work,playbooks}`. Frontmatter is parsed by `lib/content.ts`.
- Any new public route must also be added to the static path list in `app/sitemap.ts` if it is not content-driven.
