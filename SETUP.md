# Modern Mustard Seed: Operator Setup Guide

The site is live. The funnel needs env vars and external dashboard config to fully work. This guide is the one-time checklist.

## 1. Vercel environment variables

Set these in Vercel Project Settings → Environment Variables (Production scope):

| Key | Required | What it does |
|---|---|---|
| `RESEND_API_KEY` | Yes | All transactional email (contact, build queue, audit drip, newsletter) |
| `RESEND_AUDIENCE_ID` | For newsletter | Resend audience used by the weekly cron broadcast |
| `ANTHROPIC_API_KEY` | For audit | Powers the free AI Audit |
| `CRON_SECRET` | For cron | Shared secret. Vercel auto-passes this as `Authorization: Bearer <value>` on cron hits |
| `INDEXNOW_KEY` | For indexing | Hex string. Also drop a file at `/public/<KEY>.txt` containing only the key |

## 2. Resend setup

1. Verify `modernmustardseed.com` as a sending domain in Resend.
2. Create an Audience called "Newsletter" or similar. Copy its ID into `RESEND_AUDIENCE_ID`.
3. Both newsletter signup and the build-queue auto-reply use the verified sender.
4. (Optional) Set up Resend's unsubscribe handling. The newsletter template uses `{{{RESEND_UNSUBSCRIBE_URL}}}` which Resend auto-populates.

## 3. Newsletter cron

The weekly cron is configured in `vercel.json`:

```json
"crons": [{ "path": "/api/cron/newsletter", "schedule": "0 17 * * 2" }]
```

That fires every Tuesday at 17:00 UTC (12:00 PM ET, 9:00 AM PT). Vercel auto-authenticates with the `CRON_SECRET` env. The route picks a playbook on weekly rotation and broadcasts to the Resend audience.

To test the cron without waiting:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://modernmustardseed.com/api/cron/newsletter
```

## 4. Google Search Console

One-time submission:

1. Go to [Google Search Console](https://search.google.com/search-console).
2. Add property → URL prefix → `https://modernmustardseed.com`.
3. Verify ownership via DNS (TXT record) or HTML file upload. DNS is easier if the domain is on Vercel DNS.
4. Once verified, **Sitemaps → Add new sitemap → `sitemap.xml`** → Submit.
5. Wait 24-72 hours for first crawl. Check **Coverage** to confirm URLs are being indexed.

The sitemap is auto-generated and includes every static page, work case study, blog post, and playbook. It updates on every deploy.

## 5. Bing Webmaster Tools

1. Sign in at [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Add Site → `https://modernmustardseed.com` → Import from Google Search Console (saves time).
3. Submit Sitemap → `https://modernmustardseed.com/sitemap.xml`.

## 6. IndexNow

IndexNow accelerates indexing on Bing, Yandex, Seznam, and Naver. Google does not officially participate but Bing-driven indexing still helps.

1. Generate a random key (32+ hex chars): `openssl rand -hex 32`
2. Set as `INDEXNOW_KEY` env in Vercel.
3. Create `public/<INDEXNOW_KEY>.txt` containing only the key. Commit it.
4. Submit every page once:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://modernmustardseed.com/api/indexnow
   ```
5. After future content changes, ping specific URLs:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" "https://modernmustardseed.com/api/indexnow?path=/playbooks/new-playbook"
   ```

## 7. Social previews

After the deploy is live, force-refresh OG cards on already-shared URLs:

- LinkedIn: [Post Inspector](https://www.linkedin.com/post-inspector/)
- X: [Card Validator](https://cards-dev.twitter.com/validator)
- Facebook: [Sharing Debugger](https://developers.facebook.com/tools/debug/)

The OG image is generated dynamically by `app/opengraph-image.tsx` so every deploy refreshes it.

## 8. Analytics

Vercel Analytics is wired by default. For deeper funnel work, consider adding Plausible or PostHog. Both have first-class Next.js support and minimal performance impact.

## 9. Optional: Supabase lead storage

The Build Queue route has a TODO to also persist leads in Supabase. When ready:

1. Create a Supabase project (or reuse an existing MMS one).
2. Create a table:
   ```sql
   create table build_queue_leads (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     email text not null,
     business_name text not null,
     idea_description text not null,
     revenue_range text not null,
     timeline text not null,
     created_at timestamptz default now(),
     status text default 'new'
   );
   ```
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars in Vercel.
4. Add the insert in `app/api/build-queue/route.ts` (search for the TODO comment).

## 10. Maintenance cadence

- **Weekly**: write one new playbook OR one new blog post OR one new case study. Each becomes 4 distribution surfaces (LinkedIn, X, YouTube short, sales DM).
- **Monthly**: review Resend audience size. If it crosses 500, consider segmenting by interest (apps, AI tools, brand) instead of one global list.
- **Quarterly**: re-curate the homepage `FEATURED_SLUGS` in `components/WhatGetsBuilt.tsx`. Rotate in the freshest, most impressive 6 builds.
