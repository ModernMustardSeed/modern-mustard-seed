/**
 * Gleaner demo-spec assembler.
 *
 * Turns a qualified harvest prospect + a scouted vertical into the BUILD_BRIEF.md
 * that the headless Claude Code builder executes: clone the closest proven
 * voice-concierge repo, rebrand it to the prospect, deploy it, provision a live
 * Vapi assistant + phone number, and report everything back in RESULT.json.
 *
 * Used by scripts/gleaner-worker.mjs. Plain ESM, no TypeScript, no Next imports.
 */
import os from 'node:os';
import path from 'node:path';

const CLONE_SOURCES = {
  restaurant: '~/newks-voice-concierge',
  'home-services': '~/franklin-voice-concierge',
  painting: '~/certapro-voice-concierge',
  medspa: '~/serabella-medspa-concierge',
};

const SIGNATURES = {
  restaurant: 'catering capture: the agent recognizes a catering-size order and walks it to a booked deposit',
  'home-services': 'emergency triage: after-hours call, agent assesses urgency, books the truck, texts the on-call tech',
  painting: 'estimate concierge: agent captures rooms/sqft/photos link and books the walkthrough',
  medspa: 'glow plan: agent builds a treatment plan teaser and books the consult (no medical advice, consult-only lane)',
};

function expandHome(p) {
  if (!p) return p;
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

function auditHighlights(prospect) {
  const a = prospect.audit_json || {};
  const bits = [];
  if (typeof a.performance === 'number') bits.push(`site performance score ${a.performance}`);
  if (a.has_booking === false || a.booking === false) bits.push('no online booking found');
  if (a.mobile === false || a.mobile_friendly === false) bits.push('weak mobile experience');
  const geo = prospect.ai_discoverability_json || {};
  if (typeof geo.score === 'number') bits.push(`AI discoverability ${geo.score}/100`);
  if (prospect.pain_phrase) bits.push(prospect.pain_phrase);
  return bits.length ? bits.join('; ') : 'see the raw audit JSON below';
}

/**
 * @param {object} prospect  harvest_prospects row
 * @param {object} vertical  gleaner_verticals row
 * @param {object} demo      gleaner_demos row (for ids in RESULT reporting)
 * @returns {string} markdown BUILD_BRIEF
 */
export function assembleDemoSpec(prospect, vertical, demo) {
  const template = vertical?.demo_template || 'custom';
  const cloneSource = expandHome(vertical?.clone_source || CLONE_SOURCES[template] || CLONE_SOURCES['home-services']);
  const signature = SIGNATURES[template] || 'one unforgettable interaction that dramatizes recovered revenue for this exact business';
  const leak = prospect.revenue_leak_estimate ? `$${Number(prospect.revenue_leak_estimate).toLocaleString()}/month` : 'unknown (compute a defensible estimate from category averages and state it on the dashboard)';
  const brand = prospect.name;

  return `# BUILD BRIEF - ${brand} Voice Concierge Demo (Gleaner forge)

You are the Modern Mustard Seed demo factory. Build a branded, deployable, CALLABLE
voice-concierge demo for the prospect below. The demo IS the sales pitch: a real
phone number they can dial, a branded site, an ROI story, and an ops dashboard
showing revenue recovered. This is an INTERNAL sales asset. Do not contact the
prospect. Do not send email to anyone.

## The prospect (real business, real data)
- Name: ${brand}
- Category: ${prospect.category || vertical?.name || template}
- Website: ${prospect.website || 'none found (that is part of the pitch)'}
- Phone: ${prospect.phone || 'unknown'}
- Address: ${prospect.address || 'unknown'}
- Rating: ${prospect.rating ?? 'n/a'} (${prospect.review_count ?? 0} reviews)
- Estimated revenue leaking: ${leak}
- Audit highlights: ${auditHighlights(prospect)}

Raw audit JSON (context, do not dump into the UI):
\`\`\`json
${JSON.stringify({ audit: prospect.audit_json || {}, geo: prospect.ai_discoverability_json || {} }).slice(0, 4000)}
\`\`\`

## The recipe: clone, do not scaffold
Copy the proven repo at \`${cloneSource}\` into this directory (exclude node_modules,
.next, .git, .vercel, .env*), then remap the domain nouns. This is the
voice-concierge skill pattern; the skeleton is battle-tested across four live demos.

Copy unchanged: tsconfig.json, next.config.mjs, postcss.config.mjs, .gitignore,
next-env.d.ts, lib/format.ts, lib/utils.ts, lib/notify.ts, lib/vapi/server.ts,
components/PrintButton.tsx.

Remap (the only real thinking):
1. Price book in data/services.ts: rewrite to ${brand}'s real service menu (infer from their website/category; realistic local prices).
2. Primary money action (book_*) and big-lead capture (capture_*) named for THIS vertical.
3. The urgent path and the signature moment: ${signature}.
4. data/seed.ts MUST export LOCATION, BRANCHES, buildSampleActivity(now). Seed it with ${brand}'s real name, address, phone, plus believable sample activity so the dashboard is alive on first load.
5. lib/dashboard/metrics.ts rollups: RevenueRecovered is the hero stat. Anchor it to the ${leak} leak estimate.
6. Vapi tools are always: get_services, check_availability, get_customer, book_*, capture_*, get_branch_info, escalate_*. One Next.js route per tool, all through handleVapiTool in lib/vapi/server.ts. v1 store is keyless in-memory (lib/db/), no Supabase.

## Brand + design (top 0.01 percent, never generic AI)
Derive a distinct identity from ${brand}'s actual brand: pull their logo colors from
their website if reachable, else design a palette true to the vertical. Distinctive
display + workhorse type pairing (never Inter-only, never the same pairing as the
clone source). Real imagery treatment, one orchestrated load animation, and the
signature moment above executed beautifully. The bar is the four live MMS concierge
demos. Rename every visible trace of the clone source brand. No em dashes in copy.

## Ship it
1. pnpm install (fall back to npm if pnpm missing), typecheck, build until green.
2. git init -b main, commit. Do NOT push to GitHub (internal demo).
3. Deploy: \`vercel --prod --yes\`. Capture the production URL.
4. Provision the live voice agent (reuse Sarah's Vapi key from \`${expandHome('~/modern-mustard-seed-voice-agent/.env')}\`, never print it):
   a. VAPI_API_KEY=<key> VAPI_TOOLS_BASE_URL=<prod-url> pnpm exec tsx scripts/setup-vapi.ts  -> capture assistant id.
   b. Scoped public key: POST https://api.vapi.ai/token {"tag":"public","restrictions":{"allowedAssistantIds":["<id>"]}} -> .value.
   c. Phone number: POST https://api.vapi.ai/phone-number {"provider":"vapi","assistantId":"<id>"${prospect.address ? ',"numberDesiredAreaCode":"<area code from the prospect address if US>"' : ''}} -> capture the number.
   d. Set Vercel prod env: NEXT_PUBLIC_VAPI_PUBLIC_KEY, NEXT_PUBLIC_VAPI_ASSISTANT_ID, NEXT_PUBLIC_APP_URL, VAPI_TOOLS_BASE_URL, NEXT_PUBLIC_DEMO_PHONE. Redeploy.
   e. Verify POST https://api.vapi.ai/call/web with the scoped key returns 201.
   Gotchas: model id must be the dated form (e.g. claude-haiku-4-5-20251001); assistant name max 40 chars; known-good voices Elliot, Clara, Layla, Savannah; secrets go in the project .env.local only.

## Report back (REQUIRED, exact contract)
Write RESULT.json in THIS directory with keys:
- live_url: the production demo URL (string or null)
- repo_url: null (no GitHub push)
- summary: one or two sentences
- phone: the live demo phone number in E.164 or null
- dashboard_url: live_url + the dashboard path (string or null)
- vapi_assistant_id: the assistant id or null
- brand_name: "${brand}"
- gleaner_demo_id: "${demo?.id || ''}"

If Vapi provisioning fails after two attempts, still ship the site, set phone and
vapi_assistant_id to null, and say exactly what failed in summary. Never leave
RESULT.json unwritten.
`;
}
