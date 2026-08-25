# Daisy's Lakehouse Editorial : Website Build Template

Use this template when building a hospitality, restaurant, lodge, retreat, or destination brand that should feel editorial, tactile, warm, and highly art-directed.

This is a visual system, not a restaurant-specific copy deck. Replace every value in `{{double_braces}}`; keep the layout logic and art direction unless the user explicitly asks for a different direction.

## Creative north star

Build a destination, not a brochure. The first viewport should make the visitor feel the place before they understand the business: weather, light, a signature dish, a local ritual, and a reason to come back.

The reference feeling is an elevated lakeside cafe with the restraint of a small design magazine: warm cream paper, near-black ink, expressive serif headlines, compact uppercase labels, imperfect daisy/flower marks, bold image crops, and copy with a point of view.

Do not copy any reference site's wording, logo, photo, or exact composition. Keep this template's editorial rhythm and make the new brand's place, food, and rituals the subject.

## Non-negotiable visual rules

- Base palette: warm cream `#f2eddf`, paper `#f8f3e6`, ink `#11110f`.
- One vivid accent leads the system: mustard `#e7bf38` by default. Derive a brand-specific accent only when the user asks.
- Use a serif display face for headlines and a clean sans-serif for navigation, labels, prices, and metadata. Never place UI copy inside generated imagery.
- Use thin black rules, punched-out outline type, small rotated stickers, oversized numbers, circular badges, hand-mark-like flowers, and paper-note callouts as graphic devices.
- Favor asymmetry: 60/40 splits, overlapping cards, editorial offsets, tall image crops, horizontal rules, and large quiet margins.
- Cream should feel like paper, not white. Add a restrained grain/dot texture with CSS, never a noisy overlay.
- Black sections should feel like a night room or ink page. Cream sections should feel sunlit and tactile.
- Avoid generic startup layouts, rounded-card dashboards, pastel gradients, glassmorphism, stock photo grids, and corporate photography.

## Page architecture

Keep this order unless the user's content requires a small change:

1. Transparent/sticky over-image nav: wordmark, 3–5 anchor links, pill CTA, compact mobile menu.
2. Full-bleed hero: signature place image, one declarative serif headline, one short paragraph, circular scroll/menu link, one playful badge.
3. Thin marquee/ticker strip with offerings or a short positioning phrase.
4. Editorial introduction: oversized headline + short place/story copy + small mark.
5. Full-width image break with one offset paper note or promise card.
6. Menu/offerings section on an ink-black field. Include real names, details, prices or clear inquiry CTAs. Use tabs only when categories are meaningful.
7. Signature ritual section: a dark image-led story for the most ownable experience (boat breakfast, tasting, class, trail, etc.).
8. Gallery: 5–8 photos in a magazine contact-sheet grid. Make every image keyboard-accessible and openable in a full-screen lightbox with previous/next controls.
9. Event/seasonal feature: name the recurring event, explain the rhythm, show a concrete next edition, and make the RSVP action obvious.
10. Two service cards: e.g. catering + shop, weddings + retreats, or shipping + private dining.
11. Warm accent reservation/contact CTA with playful graphic marks.
12. Footer with location, hours, email/phone, newsletter, and a restrained legal/credits row.

## Copy direction

Write like a thoughtful host with a passport and a local address. Use concrete sensory nouns, short confident sentences, and a little wit. Mention local ingredients, local weather, a recurring ritual, and the reason the experience is worth planning around.

Avoid empty claims such as “best in town,” “world-class,” “unforgettable experience,” “elevated dining,” or “something for everyone.” Replace them with specifics: a dish, a departure time, a sound, a view, a seasonal detail, a recurring guest ritual.

Required content tokens:

```text
{{brand_name}}
{{descriptor}}
{{location}}
{{hero_headline}}
{{hero_supporting_copy}}
{{signature_ritual_name}}
{{signature_ritual_copy}}
{{event_name}}
{{event_schedule}}
{{next_event_theme}}
{{menu_categories_and_items}}
{{catering_or_service_copy}}
{{shipping_or_shop_copy}}
{{hours}}
{{contact_email}}
{{phone}}
{{booking_url_or_email}}
```

## Image direction

Generate original imagery when real images are not supplied. Generate backgrounds and scenes only:never text, logos, menus, labels, or fake signage inside an image. Put all copy in HTML/CSS.

Every requested image prompt should name:

- subject and place
- editorial/photo style
- composition and crop
- lighting and mood
- exact palette
- materials and tactile detail
- negative constraints: no text, no logos, no watermark, no garbled signage

Recommended asset set:

1. `hero`: signature place + signature food + one unmistakable local detail, wide 2:1.
2. `food`: abundant menu spread, vertical-friendly 4:5.
3. `interior`: room-to-landscape or room-to-street view, landscape.
4. `event`: recurring event in action, landscape.
5. `dessert-or-product`: ship/store/service still life, landscape.
6. `gathering`: catering/wedding/group experience, landscape.
7. `social-card`: 1200×630 version of the hero direction, no text.

Optimize every generated source into AVIF/WebP plus a JPEG fallback before binding it to the page. Use real descriptive `alt` text that explains the image's content and purpose.

## Interaction contract

- Menu/category tabs must update content without a full navigation.
- Gallery images must be buttons with visible focus states, a modal/lightbox, close-on-Escape, click-outside close, and previous/next controls.
- Mobile nav must be a real dialog with `aria-modal`, a close button, Escape handling, and body scroll locking.
- Every CTA must resolve to a real anchor, `mailto:`, `tel:`, reservation URL, or a clearly labeled inquiry route.
- Respect `prefers-reduced-motion`.
- Keep keyboard focus visible and preserve heading order.
- Every meaningful `<img>` needs useful alt text; decorative CSS marks use `aria-hidden="true"`.

## Responsive behavior

- Desktop: layered editorial composition, generous margins, 2-column feature splits, 3-column gallery.
- Tablet: collapse nav, preserve big type, switch features to stacked or 55/45 splits.
- Mobile: horizontal gallery scroller with snap points, single-column service cards, compact headline, no tiny text, CTA controls stacked.
- Never let a decorative badge cover the headline or primary food subject at small widths.

## Definition of done

- The first viewport communicates the place, product, and primary action without scrolling.
- The gallery feels like a designed editorial sequence, not six equal cards.
- The signature ritual and recurring event are concrete and bookable.
- Menu/offerings feel real and complete enough to orient a visitor.
- All generated imagery is original, optimized, and has useful alt text.
- The production build passes and no starter/skeleton UI remains.
- Check the live page at desktop and mobile widths before handoff.
