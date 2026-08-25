# Easton Kinetic Event Studio : reusable template and admin contract

This folder is a portable template package. It supports two jobs:

1. Integrate the package into an existing website-template admin.
2. Create a new site from the retained source.

Always read `template.json` and `ADMIN-INTEGRATION.md` before changing an admin repository. Treat `source/` as the canonical implementation. Do not rebuild the design from a blank scaffold when the retained source is available.

## Admin integration mode

Inspect the target repository before editing. Find its existing template schema, registry/seed path, storage model, admin cards, preview/detail view, create-from-template flow, authorization, migrations, and tests. Extend those conventions with the smallest coherent change. Never invent a parallel template system.

Keep server-only source paths and archives off the browser surface. If the admin stores template packages in object storage, a database, Git, or a versioned archive, use that established boundary. A “use template” action must create an isolated copy and a fresh deployment/project identity; it must never modify this package or deploy over Easton Events.

## Site creation mode

Copy `source/` into a fresh working directory. Preserve its page structure, components, optimized image variants, motion choreography, accessibility behavior, package metadata, and logical D1/R2 bindings. Replace Easton-specific copy, contact data, and imagery with the new brand's material. Create a new project instead of reusing any prior deployment identity.

This is a visual and interaction system, not Easton Events' fixed brand content. Replace the content tokens in `template.json`; preserve the design language unless the user explicitly requests a deviation.

## North star

Make the visitor feel as though they walked through a backstage door into a live show. The site is kinetic, confident, slightly strange, and meticulously controlled beneath the noise.

The defining language is a midnight-black canvas, acid-lime and electric-cyan signal colors, ultraviolet and hot-coral accents, giant compressed display type, outline type, scan lines, orbit rings, grid coordinates, sticky project cards, marquees, and image crops that feel like frames from a showreel.

Avoid pastel gradients, glassmorphism, generic agency cards, rounded SaaS chrome, quiet minimalism, and stock-looking corporate photography.

## Palette and type

- Black `#08090d`
- Ink `#0f1117`
- Paper `#f1eee9`
- Muted `#a7adb7`
- Cyan `#48f3f1`
- Lime `#d9ff43`
- Violet `#8065ff`
- Coral `#ff526e`

Use a condensed, heavy display face for hero and section titles and a neutral sans-serif for navigation, labels, body copy, metrics, and controls. Headlines are uppercase, oversized, tightly tracked, and may use `-webkit-text-stroke` for outline treatments.

The v2 readability guardrails are non-negotiable: large headings use approximately `.9` line-height, balanced wrapping, and slightly relaxed tracking; project and method headings keep at least `.92` line-height; supporting copy uses at least `1.6` line-height. Keep deliberate vertical margins so display lines never collide at desktop or mobile widths.

## Page architecture

1. Absolute hero navigation with compact mark, anchors, project CTA, and a real mobile drawer.
2. Full-viewport event hero with a declarative three-line headline, positioning copy, signal rail, coordinates, orbit rings, and a rotated circular sticker.
3. Electric capability ticker.
4. Oversized cream manifesto section with a faint rotating glyph.
5. Sticky four-card capability stack with a distinct accent color per card.
6. Metrics band with large numbers and a moving statement.
7. Sticky method title plus four scroll-revealed steps.
8. Asymmetrical editorial gallery; every image opens in a full-screen lightbox.
9. Behind-the-scenes studio/about section.
10. High-energy coral CTA with real email, phone, inquiry, or booking destination.
11. Footer with contact, navigation, newsletter treatment, and credits.

## Motion contract

- Favor CSS-first motion: sticky narrative cards, `animation-timeline: view()` reveals, orbit rings, scan sweeps, marquees, and signal pulses.
- Keep one real scroll listener for the page progress bar.
- Keep motion readable: hero zoom around 1.5–2 seconds, orbit loops 11–25 seconds, marquees 17–30 seconds.
- Every motion treatment needs a `prefers-reduced-motion` fallback that preserves all content.
- Hover states are surgical: image scale, arrow nudge, or color shift. Do not animate every property.
- Mobile keeps the point of view through stacked cards and horizontal snap galleries instead of removing all motion.

## Copy direction

Write with authority and specificity. Name the scale, room, risk, handoff, sound, or exact transformation. Prefer “turn a room full of people into one undeniable feeling” to “create memorable experiences.”

Never present Easton's demo metrics, establishment date, contact information, project history, or capabilities as facts about a new business. Replace them with supplied or verified data.

## Image direction

Use supplied real assets when available. Otherwise generate original imagery with subject, environment, composition, lighting, materials, and an explicit palette. Never use stock-photo URLs or placeholder services.

Never place text, logos, labels, or readable screens inside generated images. Overlay real copy in HTML/CSS. Optimize every website image to responsive AVIF and WebP with a JPEG fallback before shipping. Give every meaningful image descriptive alt text.

The minimum image set is: wide hero event world, trade-show environment, conference/keynote, concert or festival, tactile backstage crew detail, immersive gala or brand world, and a 1200×630 social crop without embedded text.

## Interaction and accessibility

- Mobile navigation is a real dialog with `aria-modal`, a close button, Escape support, focus handling, and body-scroll lock.
- Gallery items are keyboard-accessible buttons with visible focus.
- The lightbox closes on Escape and backdrop click and has previous/next controls.
- CTAs resolve to real routes, email, phone, inquiry, or booking destinations.
- Preserve heading order, skip navigation, visible focus, and meaningful alt text.
- Mark decorative glyphs and CSS ornaments hidden from assistive technology.
- Respect `prefers-reduced-motion`.

## Completion criteria

- The admin uses its existing template architecture and authorization model.
- The template is discoverable, previewable, and creates an isolated source copy.
- The first viewport communicates category, scale, and a clear CTA.
- No display lines collide at desktop, tablet, or mobile widths.
- Sticky work cards, method steps, gallery, and CTA retain distinct rhythms.
- No placeholder, stock URL, starter skeleton, secret, runtime data, or old deployment ID ships.
- Lint, typecheck, relevant tests, and production build pass.
