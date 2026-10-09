---
name: design-loop
description: How visual work gets iterated and checked. Shoot the page at phone and desktop widths, read the screenshots, grade them against the excellence bar, fix in place, and shoot again. Load whenever a page, a layout or any visual change is being built or judged, and for "look at it", "does it look right", "check mobile", "it looks off" or "screenshot it".
---

# The Design Loop

A page is judged by looking at it, not by reading its code. The loop below is
how an agent sees what a customer will see.

## The loop

1. **Shoot.** Take two screenshots of the real page: 390 pixels wide (a phone)
   and 1440 wide (a laptop). Use the browser tool or a Playwright script. Shoot
   the viewport the customer lands on first, then scroll and shoot each
   section.
2. **Read.** Open every image. Look before forming an opinion about the code.
3. **Grade.** Against these, in order:
   - Can a stranger say what this business does and what to do next within
     five seconds of the first screen?
   - Is there one obvious primary action, and does it look pressable?
   - Does anything overflow, overlap, clip or scroll sideways at 390?
   - Is all text readable: size at least 16 pixels for body, contrast strong
     enough to read in sunlight?
   - Is spacing consistent, or do sections feel stapled together?
   - Is every image real and specific to this business?
4. **Fix in place.** Change the code, not the report.
5. **Shoot again.** Compare with the first shot. Repeat until every grade
   passes.

## Traps that make a screenshot lie

- **Full-page captures stretch tall layouts** and hide sticky headers. Shoot
  the viewport and scroll instead.
- **A pop-up or cookie banner** covers the hero. Dismiss it or shoot with it,
  but know which you are grading.
- **A stale browser tab** shows yesterday's build. Hard reload, or open a new
  tab.
- **Local development servers** can serve pages differently from production.
  Grade the deployed preview before calling it done.

## Done means

Both widths shot after the last change, every grade passing, and the final
screenshots named in the report.
