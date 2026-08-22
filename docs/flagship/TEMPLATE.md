# The flagship standard

The demo sites are the product. This is the bar they are held to, and
`REFERENCE.html` in this directory is a real build that meets it, with the
photography stripped out so it stays readable.

## Why this file is here and not in a home directory

The tier directives used to send the builder to `~/wildmere/TEMPLATE.md` for
"the anatomy, the parameter knobs, THE TEN LAWS" and to
`~/modern-mustard-forge/...` for the award-site skill. Neither exists on this
machine. They were on Sarah's old computer. So the DEFAULT demo tier has been
telling the builder to go read its own design system from paths that resolve to
nothing, and the builder has been improvising the whole standard on every job.
That is the most likely reason quality drifts between builds that use the same
directive.

The reference lives in the repo now. It travels with a checkout, it survives a
new machine, and CI can read it. Nothing about the standard should depend on one
laptop again.

## The build this was written from

Sappari, a 41-year woman-owned clothing boutique on Central Avenue in Whitefish.
Its first two automated builds were both rejected, and the rejections are the
whole reason this document exists:

- the API path shipped **5.8MB with seven byte-identical copies of one
  photograph**, one image pasted into every visual slot
- it set the meta strip in pale grey directly on a busy storefront photo, where
  it was invisible
- the workstation path, on a different lead the same day, stacked three text
  elements in one corner so they printed through each other and ran the hero
  headline under the nav

Every law below exists because one of those shipped.

## The anatomy

A flagship single-page demo runs in this order. Deviate when the business
demands it, not to save effort.

1. **Header.** Fixed, owns its full height, wordmark left, anchors centre, the
   phone as the only button. It never overlaps the hero.
2. **Hero.** One full-bleed photograph, a scrim, an eyebrow, one headline with
   one italic emphasis, one sentence, two buttons.
3. **The meta strip.** The four facts that establish credibility, on **solid
   colour**, directly below the hero and never on top of it.
4. **The story.** Why they are still here. Real specifics, no filler.
5. **The signature moment.** See below. This is the section people remember.
6. **What they carry, or what they do.** Three cards, three real photographs.
7. **Context.** The street, the town, the yard. One wide photograph, one line.
8. **The closing band.** Dark, lit, and the type gets bigger. See `CLOSING_BAND_RULE`.
9. **Footer.** The name at display size, the anchors, the credit.

## The laws

### 1. Every visual slot gets its OWN photograph
Seven copies of one image is not seven images. If you cannot produce a distinct
frame for a slot, remove the slot. A gallery of one repeated photo reads as
broken software, and it is the single fastest way to lose the owner.

### 2. The page fits in the cap, and here is the method
Under 900KB total, inlined. This is now MEASURED and ENFORCED: a build over
1800KB is requeued once with its own numbers handed back, and failed if it blows
the ceiling twice. See `lib/site-weight.mjs`.

Saying "make it smaller" has never once worked. The method has:

**Budget every image before you generate it, not after.** Decide the byte
allowance per slot up front and encode to hit it. What the two reference builds
actually used:

| slot | width | budget |
| --- | --- | --- |
| full-bleed hero | 1600px | 120KB |
| full-bleed band | 1400px | 90KB |
| card or tile | 900px | 60KB |
| portrait tile | 560px | 50KB |

**Encode WebP, and size to the box the image actually occupies.** A 900px card
does not need a 1536px file. Wild Hope: eight photographs, 600KB raw, 807KB
inlined. Sappari: seven photographs, 524KB raw, 830KB inlined.

**Define each photograph ONCE.** Any image appearing in more than one place is a
CSS custom property that both places reference, never a second copy of the
base64. Wild Hope shows eight photographs in twelve slots from eight encodings;
inlining per element put it 195KB over the cap on its own.

```css
:root{ --art-hero:url("data:image/webp;base64,...") }
.art--hero{ background-image:var(--art-hero) }
```

Use `role="img"` with a real `aria-label` on a painted plate, so nothing is lost
against an `<img alt>`.

**Base64 costs 34%.** A 600KB raw budget lands at about 805KB inlined. Work
backwards from the cap, not forwards from the images.

617KB per image is not a decision, it is an omission. Seven copies of one
617KB photograph, which is what Sappari's first build shipped, is 4.3MB of a
5.8MB page and the reason this section exists.

### 3. Nothing overprints, nothing goes faint
See `LEGIBILITY_LAW` in `lib/site-directive.mjs`. Text on photography carries a
scrim, a graded overlay, or a shadow that survives the brightest pixel under it.
Measured on the reference: worst off-photograph contrast **5.13:1** across 44
text nodes.

### 4. One signature moment, drawn from the trade
The six worked-out forms, and the traps in each, are in `MOTION.md`. Read it and
pick one rather than inventing a seventh. THE TURN is the flagship form.

Abruzzo got a slider through their handmade pasta. Sappari got a brass handle
that drags the rail from wool to linen, February to July. It has to be:
- made from **their** material, real photography, never drawn art
- a drag on touch and a drag on desktop
- keyboard operable, arrow keys and Home/End, with `role="slider"` and a live
  `aria-valuetext`
- degraded to a still image with no JS
- **one** moment, not a page of gimmicks

If the trade offers nothing worth this, ship none rather than a carousel.

### 5. The ending is designed
See `CLOSING_BAND_RULE`. The page arrives somewhere. It does not stop.

### 6. Verify by looking
Load it. Read the top 700px at 1440 and at 390. Check every image renders,
every line is legible against what is actually behind it, and no two pieces of
text share pixels. Both defects that produced this document are obvious in a
screenshot and invisible in a diff.

## The finish pass

- real `<title>`, meta description, `theme-color`, inline SVG favicon
- `<meta name="mms-palette">` with the true background and accent
- JSON-LD for the business type, with the real phone and locality
- genuine `alt` on every image, describing content and purpose
- `:focus-visible` styling on every interactive element
- `prefers-reduced-motion` honoured by every animation
- no invented reviews, ratings, years, or certifications, ever
- no fabricated signage: never letter their name onto a building or a truck
- the Modern Mustard Seed credit in the footer, in mustard `#F5B700`

## Reading the references

`REFERENCE-WILD-HOPE.html` is the second reference build, a church concept, and
it is the one to read for MOTION: the scroll-driven night-to-dawn turn, the
drag-through week, the horizontal rail, and the oversized wordmark clamped on
both axes.



`REFERENCE.html` is the Sappari build with `__IMG_*__` tokens where the seven
photographs go. Read it for the scrim construction, the signature-moment
markup and its keyboard handling, the closing band, and the header that keeps
off the hero. The live build is linked from the Client Book.
