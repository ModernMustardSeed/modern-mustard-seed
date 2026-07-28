# Art brief: six plates for "The Storefront Files"

Hand this whole file to Codex (or any image tool). It needs to produce **six PNG
images** and nothing else. No code changes, no edits to any other file.

---

## What to produce

Six images, saved into this exact folder:

```
C:\Users\moder\modern-mustard-seed\social-drafts\websites\art\
```

| Filename (exact)      | What it is                        |
|-----------------------|-----------------------------------|
| `google-first.png`    | The search moment                 |
| `window-and-door.png` | Social is the window, site is the store |
| `blank-facade.png`    | The business with no website      |
| `card-catalog.png`    | AI reading every site in town     |
| `clipboard-grade.png` | The free website audit / report card |
| `awning-shop.png`     | The storefront itself             |

**Filenames must match exactly, lowercase, hyphens, `.png`.** The renderer looks
for these names and silently falls back to a placeholder if it cannot find them.

**Size:** 1536 x 1152 pixels (4:3 landscape). PNG.

**Important:** each image gets cropped to a wide letterbox strip when placed, so
keep the subject centered and leave roughly 10% breathing room at the top and
bottom. Nothing important near the very top or bottom edge.

---

## The style (identical for all six, non-negotiable)

This has to match the existing `../missed-calls/art/` plates exactly. Append this
block to every prompt:

```
Mid-century modern American screenprint poster illustration, 1955 commercial
advertising art. Risograph print texture with visible halftone dot fields and
slight offset misregistration on the edges. Strictly limited four-color palette:
warm cream paper background (#FBF6EA), deep ink black linework (#161616),
mustard yellow (#F5B700), signal red (#E0301E), sparing cobalt blue accents
(#1E50C8). Flat color fills, absolutely no gradients, confident inked outlines,
simplified geometric shapes, bold poster composition with generous negative
space, grainy printed-paper feel. No text, no lettering, no numbers, no signage,
no logos, no watermark, no captions, no UI.
```

**The "no text" instruction is the important one.** All type is composited
afterward in the real brand fonts. Any lettering the model draws is a defect and
the plate gets rejected. If a model insists on adding text, regenerate.

---

## The six subjects

Use the subject line, then the style block above, as one prompt.

**1. `google-first.png`**
> A single hand holding a mid-century handheld device flat like a small window.
> Rising up out of the screen, built of light, stands a tiny complete storefront
> with an awning, a display window and an open door, glowing warm mustard. Two
> other small plain storefronts stand dark to either side of it. The rest of the
> frame is calm empty cream paper.

**2. `window-and-door.png`**
> The exterior of one small American shop seen straight on. On the left a large
> plate-glass display window with a neat arrangement of goods behind it. On the
> right the front door standing wide open with warm mustard light spilling across
> the sidewalk. A single customer walks past the window and turns their body
> toward the open door. Long afternoon shadows, confident poster composition.

**3. `blank-facade.png`**
> A shuttered small storefront seen straight on, its sign board above the door
> completely blank and empty, roll shutter halfway down, no lights inside, a
> scrap of paper blowing past on the empty sidewalk. Cold cobalt blue shadow
> across the whole facade. Desolate, quiet, high-contrast poster framing with
> heavy negative space above.

**4. `card-catalog.png`**
> A wall of vintage library card catalog drawers filling the frame, dense grid of
> small brass-handled drawers. One drawer is pulled open at the center and a
> single index card is being lifted out by a calm simplified mechanical robot
> hand made of clean geometric segments. The open drawer glows warm mustard from
> inside. Warm and human rather than cold or futuristic.

**5. `clipboard-grade.png`**
> A wooden desk seen from above at a slight angle. On it a clipboard holding a
> checklist of simple ruled lines, a hand marking one large confident check mark
> in signal red. Beside the clipboard sits a small architectural model of a
> storefront, the size of a toy, lit warm mustard. A pencil and a coffee ring on
> the desk. Honest workbench energy.

**6. `awning-shop.png`**
> One small American shop seen straight on from the sidewalk, filling the frame.
> A bold striped awning in mustard and signal red runs across the top, a clean
> plate-glass display window on the left, and a warm mustard front door standing
> slightly open on the right. A hand-lettered blank sign hangs above. Confident
> symmetrical poster composition, generous cream sky above the awning.

---

## How to check the work before handing the files back

Reject and regenerate any plate that has:

- Any letters, numbers, or words anywhere in the image
- Gradients, soft airbrush shading, or photographic realism
- Colors outside cream / black / mustard / red / a little cobalt blue
- The subject crammed against the top or bottom edge
- A cluttered composition with no clear negative space

---

## When the files are back

Drop all six into the `art/` folder above, then one command finishes it:

```bash
cd /c/Users/moder/modern-mustard-seed/social-drafts/websites
node render.mjs
```

The renderer picks up the real plates automatically and re-renders all six cards
at 1080x1350. Nothing else needs to change.
