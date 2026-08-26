# The site templates

Twelve visual systems, every one of them named, and the Build picks exactly one
per site. Five were lifted off real builds Sarah approved, two are packages Sarah handed over (Daisy's
Lakehouse Editorial and Easton Kinetic), and five were
designed in the studio to cover the trades the first six did not fit.

**The registry is code: `lib/site-templates.mjs`.** This file is the reading
copy. If they ever disagree, the registry wins, because the registry is what
the worker, the serverless failsafe, the pickers and the admin gallery all read.
The gallery at `/admin/templates` renders every template in its real fonts with
its real palette and shows how many live sites wear it.

## How a template reaches a build

- The cockpit deck and the Build board carry a **picker**: Random, or one named
  template. Random is the default.
- Random is resolved at **queue time** (`lib/site-template-choice.ts`), weighted
  by how well each template fits the lead's trade, never the template the lead
  already had, never a template a ready site in the same trade and town wears.
- The pick is written to `outbound_demo_sites.site_template`,
  `outbound_leads.site_template` and rides the brief as `SITE TEMPLATE: <key>`,
  so the admin shows what the site will wear before the build starts.
- The worker wraps the tier directive with `siteTemplateDirective(key)`: the full
  law for that template, ahead of everything else the builder reads. The builder
  does not choose a style; it executes the one chosen.
- The design **tier** is unchanged and composes with this: tier 2 (World) or
  tier 3 (Journey) is the bones, the template is the skin.

## What every one of them carries

Profiled across the approved builds, these appear in nearly all of them, and in
none of the ones Sarah rejected. They are measured by `lib/demo-quality.mjs` on
every finished build, not requested:

| element | in the approved builds |
| --- | --- |
| a marquee | 5 of 5 |
| a live counter | 5 of 5 |
| an accordion FAQ | 4 of 5 |
| a drag or slider moment | 4 of 5 |
| a proof section using their REAL rating | 5 of 5 |
| parallax or a sticky stage | 3 of 5 |
| three type families | 4 of 5 |

The rejected builds averaged one font family, one photograph, and no proof
section at all. One shipped with no webfont whatsoever.

## Their real reputation is the proof section

The brief carries `THEIR REAL REPUTATION`: their true star rating and review
count. Use the real number, prominently, and never round it up. Invented review
TEXT stays banned. If the mined evidence carries a genuine quoted review, use it
with attribution. If it does not, show the rating and the count on their own. A
proof section that is missing is worse than one that is only numbers.

---

## The house styles (lifted off approved builds)

### 1. Steel and Ember `steel-and-ember`
*From: Wild Horse Construction & Concrete.* Ground `#F5F3EE`, accent `#DD4A17`.
**Ultra** display, **Archivo** body, **Caveat** handwritten asides.
work > services > estimate > proof > faq. For trades that pour, weld, frame and
finish. The handwriting face is what stops it reading corporate.

### 2. Night Neon `night-neon`
*From: Huck Yeah.* Ground `#101614`, accent `#FF5A1F`. **Anton** display,
**Archivo** body, **Bebas Neue** rates. why > fleet > play > rates > desk > area
> contact. For rentals, tours, powersports, anything sold on fun. The only
template where a canvas effect earns its place.

### 3. Barber Red `barber-red`
*From: Columbia Falls Barbershop.* Ground `#F4EDE1`, accent `#B0272C`.
**Anton** display, **Oswald** subheads, **Source Serif 4** body. top > shop >
menu > word > faq > book. For any trade with a shopfront and a price list. The
menu section is the hero of this layout, not the photograph.

### 4. Highway Amber `highway-amber`
*From: Hungry Horse Motel.* Ground `#0B1018`, accent `#FF9A3D`. **Anton**
display, **Instrument Serif** editorial, **Inter** body. top > stay > road >
rooms > word > faq > book. For motels, lodges, diners, anywhere along a road.
Photography carries this one: eight distinct frames minimum.

### 5. Field Note `field-note`
*From: Sands Surveying.* Ground `#F4F1E8`, accent `#A84718`. **Archivo**
display, **IBM Plex Mono** data, **Source Serif 4** body. line > surveys >
finder > reviews > faq > book. For anyone whose work produces figures. The mono
face is used for anything numeric and nowhere else.

## The packages

### 6. Lakehouse Editorial `lakehouse-editorial`
*From: Daisy's Lakehouse, Sarah's package (2026-08-24).* Cream `#F2EDDF`, paper
`#F8F3E6`, ink `#11110F`, accent `#E7BF38`. **Fraunces** display, **Instrument
Serif** italics and ticker, **Inter** labels. Twelve-section editorial
architecture: over-image nav > full-bleed hero > ticker > editorial intro >
image break with a paper note > menu on an ink field > signature ritual >
contact-sheet gallery with a lightbox > recurring event > two service cards >
accent reservation CTA > footer. For hospitality that should feel editorial,
tactile and art-directed. The full package is filed at
`docs/flagship/templates/lakehouse-editorial.md`.

### 7. Easton Kinetic Event Studio `easton-kinetic`
*From: Easton Events, Sarah's package v2 (2026-08-25).* Black `#08090D`, paper
`#F1EEE9`, four signal colours led by lime `#D9FF43` with cyan, violet and
coral. **Big Shoulders Display** condensed display, **Inter** body, **JetBrains
Mono** coordinates and indexes. Eleven-section kinetic architecture: hero nav
with a real drawer > full-viewport hero with orbit rings, coordinates and a
rotated sticker > capability ticker > cream manifesto > sticky four-card stack,
one signal colour per card > metrics band > sticky method with scroll-revealed
steps > editorial gallery with a lightbox > studio section > coral CTA >
footer. CSS-first motion with one real scroll listener and a reduced-motion
fallback on everything. For event production, AV, venues, festivals, creative
studios, anything sold on energy. Filed at
`docs/flagship/templates/easton-kinetic.md`; reference at
`/demo/reference/easton-kinetic`.

## The studio designs (2026-08-24)

### 8. Midnight Atelier `midnight-atelier`
Ground `#0E0D0B`, accent `#C9A24A`. **Cormorant Garamond** display, **Manrope**
body, **DM Mono** prices and index. Quiet luxury: hairline gold rules as the
only ornament, numbered chapters, inset images, slow crossfades, dot-leader
prices. For jewelers, fine dining, custom builders, aesthetics, bridal.

### 9. Swiss Grid `swiss-grid`
Ground `#F1F0EB`, accent `#E0201B`. **Inter Tight** display, **Inter** body,
**JetBrains Mono** figures. A visible twelve-column grid, 1px rules and no boxes,
one red word per screen, flush-left everything, tables in mono. For engineers,
architects, accountants, IT, logistics, anyone who sells precision.

### 10. Poster Press `poster-press`
Paper `#F4EFE2`, ink `#1B2A4A`, accent `#F26A3D`. **Bricolage Grotesque**
display, **Public Sans** body, **Courier Prime** stamps. Two-ink risograph
discipline, CSS halftone on photographs, 2px misregistration on the hero
headline, rubber stamps, a perforated ticket strip. For breweries, roasters,
food trucks, venues, makers.

### 11. Greenhouse `greenhouse`
Linen `#ECEBE1`, ink `#1E3A2B` (green is the ink; no black), accent `#D7A21A`.
**Newsreader** display, **Karla** body, **Kalam** plant-tag labels. Arched image
masks, plant-tag service cards, a month-by-month season strip, line-art leaf
marks, a before/after slider. For landscapers, nurseries, florists, tree
services, farms.

### 12. Clinic Calm `clinic-calm`
Ground `#F7F8F6`, ink `#16302B`, accent `#2F7F6F`, highlight `#F2B850`. **DM
Serif Display**, **DM Sans** body, **DM Mono** hours and codes. Pill-shaped
photographs, big friendly numerals, a live appointment strip, marigold on
exactly one element per screen. For dentists, vets, clinics, PT, counseling.

---

## Choosing, when nothing chose

A row queued before the picker existed carries no template. The builder then
reads the roster in `STYLE_ROTATION` (generated from the registry) and picks by
what is true about the business, never invents another, never blends two, and
records the pick in `RESULT.json` as `"template"`, which the worker banks on
the row so the next Random knows what to avoid.

## Adding a template

Add an entry to `SITE_TEMPLATES` in `lib/site-templates.mjs` with a key, name,
origin, palette, three Google families, skeleton, devices, copy register,
imagery and the law block. Merge to master. It appears in the gallery, in every
picker, and in the worker's roster on the next build. Nothing else to wire.

## Retiring a template

Take the entry OUT of `SITE_TEMPLATES` and add its key, name, date and the
reason to `RETIRED_TEMPLATES` in the same file. That is the whole job: the
gallery, the pickers, Random and the worker roster all read the array, so it
disappears from every one of them at once, and rows that already wear the key
fall through to a fresh weighted pick for their trade instead of throwing.
Then write it up under Retired below.

## Retired

### Wild Reverent `wild-reverent`, out 2026-08-26
*Was: the Wild Hope Church concept.* Ground `#0B1016`, ember `#E08A3C`, Fraunces
at optical size 144, THE TURN scroll moment. Sarah called it on the Whitefish
Massage Therapy build: it reads as a concept film about a feeling, not as a
business a person is trying to book. It came from a church concept and it never
stopped being one.

It is out of the registry, out of every picker, and out of Random. The key lives
in `RETIRED_TEMPLATES` so a stale row can still be named, and
`scripts/check-retired-templates.mjs` fails the build if it ever comes back.
