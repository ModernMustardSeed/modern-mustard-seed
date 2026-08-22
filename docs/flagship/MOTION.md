# The signature moments

`TEMPLATE.md` law 4 says every build earns one bespoke moment drawn from the
trade. This is the catalogue of forms that moment can take, and the rules that
keep any of them from becoming a gimmick.

Pick ONE per build. Two signature moments is zero signature moments.

## The rule that governs all of them

A moment qualifies only if all five are true:

1. It is made from **their** material. Real harvested or generated photography,
   never drawn art, never a stock loop.
2. It could not be lifted onto a competitor's site without rewriting it. A
   carousel passes nothing. A rail that drags through *their* week passes.
3. It works on touch as a drag and on desktop as a drag or a scroll.
4. It is reachable by keyboard, and it announces itself to a screen reader.
5. It degrades to a still image with no JavaScript, and it stops entirely under
   `prefers-reduced-motion`.

If the trade offers nothing worth this, ship none. No moment beats a bad one.

---

## 1. THE TURN

**Sarah, on the Wild Hope build: "that one feature with the night to day, just
WOW."** This is the flagship pattern.

Two frames of the same scene at two different states, crossfaded by scroll
position inside a sticky viewport, while the words over them light up in step.

The whole effect lives or dies on the two frames matching. Shoot or generate
them as one composition described twice, changing only the state: same subject,
same placement, same horizon, same lens. Wild Hope used one lone tree on a rise,
once under a full starfield and once at full sunrise.

**States worth turning:** night to dawn, winter to summer, storm to clear,
overgrown to cut, gutted to finished, empty room to full house, raw timber to
oiled, dusk service to morning service.

**How it is built.** A tall section, roughly 340svh, holding one `position:
sticky; top: 0; height: 100svh` stage. Both frames are absolutely positioned in
the stage; the second carries `opacity: var(--k, 0)`. One rAF-throttled scroll
handler computes `k` from how far the section has been scrolled through, eases
it so the sun comes up rather than fades in linearly, and writes it once per
frame. Lines of copy toggle a class at staggered thresholds of `k`.

**Traps, all three of them real:**

- Do not add a second scroll listener for anything else on the page. One handler
  reads and writes once per frame, and the header state rides along inside it.
- Under `prefers-reduced-motion` the section must collapse: `height: auto`, the
  stage un-sticks, the second frame sits at `opacity: 1`, and the copy is
  already lit. A reader who cannot take the motion still gets the payoff.
- Scope the caption styles. On Wild Hope the citation inherited the verse's
  4.2rem from `.dawn__words p` and printed straight through the line above it.

---

## 2. THE WIPE

A draggable divider between two frames of the same subject, revealing one over
the other. Used on Sappari: a brass handle that pulls the rail from wool to
linen, February to July.

Cousin to The Turn, but the visitor drives it instead of the scroll, so it suits
a comparison the owner wants examined rather than a transformation they want
felt. Before and after, two seasons, two finishes, two trims.

**The trap:** the clipped layer must be positioned. As a static `div` it has no
box for `inset()` to clip against, and both halves render the same frame.

---

## 3. THE REEL

Panes crossfading in place, driven by a drag, arrow keys, and a row of labelled
tabs underneath. Wild Hope's week: Sunday, the table, Wednesday, Saturday.

Right when the subject has a small fixed set of states that each deserve a
caption. Wrong when there are more than about five, which is a rail instead.

Wire the tabs with `role="tablist"` and real `aria-selected`, because the tabs
are the keyboard path and the screen-reader path at once.

---

## 4. THE RAIL

A horizontal drag through their world, snapping card to card, mixing portrait
and landscape plates with short captions. Life outside the building, the yard
through a season, the room at four different hours.

Cheap to build and the easiest to get lazily wrong: five stock-looking tiles is
not a signature moment. It qualifies only when the frames are theirs and the
captions say something a stranger could not.

**The trap:** `align-items: flex-start` on the scroller. Stretched, every card
grows to the height of the tallest and the captions float on bare background
below their own photograph.

---

## 5. THE BUILD

Scroll steps through an ordered sequence of frames, one at a time, inside a
sticky stage. Foundation, frame, roof, finish. Bare plate, sauce, fire, service.
Trailhead, ridge, summit.

Different from The Turn: that is two states blended continuously, this is four
or five discrete steps that land. Quantise `k` into indices, do not crossfade
everything at once, and number the steps in the markup, because here the
sequence genuinely carries information.

Only for trades whose value IS the sequence. A roofer, a builder, a restorer, a
caterer. Never bolted onto a business whose work is not a process.

---

## 6. THE LONG PULL

A pinned section translated horizontally by vertical scroll: a timeline, a
before-and-after row, forty-one years across the screen.

The most expensive of these to get right and the easiest to make nauseating.
Keep the travel under about 1.5 screen widths, ease it, and never nest it inside
another pinned section. Under reduced motion it becomes an ordinary rail.

---

## The hero, separately

Not a signature moment, but the same discipline. The wordmark is the brand and
it should be **large**: Wild Hope sets it at `clamp(3.6rem, min(15.5vw, 21vh),
13.5rem)`.

Two things that clamp gets right and a width-only clamp does not:

- it is capped on the **shorter** axis too, so a wordmark that fits a tall
  window does not shove the buttons off a short laptop
- the hero section itself never sets `overflow: hidden`. Only the parallax plate
  clips, from its own wrapper. Clipping at the section silently cuts the CTAs and
  the opening hours off the bottom, with no scroll that can reach them.

Parallax the plate at about 0.18 of scroll offset, from the same single scroll
handler as everything else.
