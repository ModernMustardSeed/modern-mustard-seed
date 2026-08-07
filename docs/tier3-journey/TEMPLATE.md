# TIER 3 — THE JOURNEY SITE (scroll-cinema drive template)

Born 2026-08-07 from the Modern Mustard Seed homepage rebuild (the Flathead Journey,
Sarah: "im obsessed"). Reference implementation: https://modernmustardseed.com (the
live homepage). Tier 2 is a brand WORLD you stand inside; Tier 3 is a brand JOURNEY
you travel through. The visitor rides a continuous narrative from an opening
invitation to an arrival, and the business's offers are stops along the way.

## 1. Emotion first, then the journey metaphor

Name the business's core emotion in ONE word (AWE, RELIEF, CERTAINTY, JOY, CALM...).
Then pick ONE journey metaphor native to the trade and commit everything to it:

- **The Route** (default): a drive through the business's real geography to their door.
- **The Work Day**: first light to the truck pulling home at dusk (trades, crews).
- **The Build**: bare ground to finished work (construction, remodel, landscape).
- **The Season**: planting to harvest (farm, food, growers) or first frost to spring.
- **The Visit**: the customer's own arc from problem to walking out better (clinics,
  salons, restaurants).

State the emotion word, the metaphor, and the palette hexes with roles in an HTML
comment at the top of the file. The metaphor drives EVERYTHING: chapter names, the
rail labels, the dividers, the narration, the close.

## 2. The anatomy (in order, every chapter carries an id)

1. **THE PICKUP** — full-bleed cinematic hero, letterboxed. Giant display headline
   as an INVITATION in the metaphor's voice ("Come for a drive", "Ride along",
   "Watch it grow"), sub-line naming the business and what it does, two CTAs
   (begin the journey = scroll; skip ahead = the voice pill / phone).
2. **THE FIRST STOP** — what they actually sell, as 2-4 linked cards inside the
   fiction (crops in the orchard, tools on the truck, courses of the meal).
3. **THE ROADSIDE** — offers and proof points as signs along the way, pop-card
   sticker styling, every card a real link or anchor.
4. **THE GATE** — the arrival threshold: their name carved/painted on the world
   (a gate, a door, a sign) plus honest proof (reviews per the demo laws, real
   numbers only).
5. **THE PLANTING** — the business's WHY, one paragraph of owner voice in the
   metaphor. This is the emotional payoff beat; give it the best image.
6. **THE ARRIVAL / FOUR DOORS** — the close: talk to the voice agent (the host
   shell's pill), see the work, book/request a visit, and the real phone as a
   tel: link. Four doors, all open, no dead ends.
7. FAQ + footer per the standard demo laws.

## 3. The cinema (stills only, and it must still feel like film)

⛔ **NO VIDEO GENERATION IN A DEMO BUILD. EVER.** Video costs wallet per build and
demos are free (the never-leak-revenue law). The Tier 3 feel comes from stills
treated as footage:

- Every chapter background is a generated or harvested photograph, full-bleed,
  with a SLOW Ken Burns drift (CSS transform scale/translate, 18-30s alternate,
  transform+opacity only). Two or three drift recipes, alternated.
- **Letterbox bars**: fixed top/bottom cinema bars that ease in over full-bleed
  chapters and out over paper sections. ~5.5vh each, 700ms cubic-bezier ease.
- **The rail**: the journey as a thin vertical track pinned left (desktop only),
  one stop per chapter with mono labels in the metaphor's units (MI 0, DAY 1,
  COURSE 2...), a scroll-riding marker in the accent color, click scrolls.
- **ENTER reveals**: staggered rise+fade per chapter (one-time, IntersectionObserver,
  data attribute + CSS). Giant display type may be outlined ONLY as a solid-filled
  fallback check: if the face has overlapping strokes (Anton M/E/R), use SOLID fill
  (the tier 2 stroke lesson stands).
- **Film grain**: a 4-5% SVG noise overlay on footage chapters.
- **Ambient flock** (optional, default NONE): only when the world earns it
  (birds for a ranch, leaves for a landscaper, snow for a plow service), tiny
  canvas silhouettes, max 10, pointer-events none, killed by reduced motion.

## 4. The talking layer

The host shell overlays the live voice pill (bottom-right) and the hostess tour is
built by the pipeline AFTER the build (bottom-left, Ava's voice, extracted from the
page's own words). The page's job:

- Write chapter openers as SPOKEN lines: short declaratives that survive being read
  aloud verbatim by the hostess. Every chapter's first <p> should sound like a
  narrator, because it will become one.
- Never put owner-facing scaffolding in visible copy (it gets read aloud).
- The close hands to the voice agent explicitly: the first door IS the pill.
- If BRIEF.md contains "TALKING WEBSITE: yes", the talking layer is the STAR: the
  hero sub-line names it ("this site reads itself to you, and answers when you
  call"), and one roadside sign pitches the Talking Website by name.

## 5. Hard constraints (inherited, non-negotiable)

Single-file index.html under 900KB, all assets inlined per the inline-assets rule,
reduced-motion collapses to a complete readable page with static imagery, mobile
375px overflow-free, the [hidden] guard, ambient blocks in try/catch, honest proof
only, the phone is the close, iframe-safe (bottom-right 120px clear), nav anchors
same-document with scroll-margin-top. All demo laws from the tier 2 directive apply
verbatim.

## 6. Verification

Playwright desktop + mobile screenshots per chapter; letterbox engages over footage
and releases over paper; the rail marker moves; Ken Burns is drifting (sample a
transform twice 2s apart); reduced-motion screenshot is complete and still; CTA
findable in one second; contrast computed AA for body pairs.
