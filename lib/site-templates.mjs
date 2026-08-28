/**
 * THE SITE TEMPLATE REGISTRY: every visual system the Forge is allowed to build.
 *
 * One template = one complete visual system: palette, type pairing, section
 * skeleton, graphic devices, copy register and image direction. The design TIER
 * (2 = brand world, 3 = journey) is the structure a site is built on; the
 * TEMPLATE is the skin and the personality it wears. They compose: any template
 * can be built at either tier.
 *
 * Where a template comes from is recorded on it. Six were lifted off builds
 * Sarah approved (docs/flagship/STYLES.md). Lakehouse Editorial is the Daisy's
 * Lakehouse package she asked to keep (2026-08-24). The rest were designed here
 * to cover the trades the first seven did not fit.
 *
 * How a template reaches a build:
 *   - The cockpit and the Forge board carry a picker: one template, or Random.
 *   - Random is resolved at QUEUE time (pickSiteTemplate), weighted by how well
 *     each template fits the lead's trade, excluding what the lead already had
 *     and what the same trade in the same town already wears. The pick is
 *     written to outbound_demo_sites.site_template and outbound_leads.site_template
 *     and rides the brief as a "SITE TEMPLATE: <key>" line, so both engines and
 *     every admin surface agree on it before the build starts.
 *   - The worker turns the key into siteTemplateDirective(key), a block of law
 *     the builder follows instead of choosing a style itself.
 *
 * Plain .mjs so the .mjs worker and the TS routes can both import it
 * (tsconfig has allowJs). No imports: this file must load anywhere.
 */

export const TEMPLATE_LINE = 'SITE TEMPLATE:';
export const RANDOM_TEMPLATE = 'random';

/**
 * What every template carries, because it appears in every approved build and
 * in none of the rejected ones (profiled 2026-08-22, docs/flagship/STYLES.md).
 */
export const SHARED_DEVICES = [
  'a marquee strip',
  'one live count-up counter',
  'an accordion FAQ',
  'one drag or slider moment',
  'three type families, loaded, all three visibly used',
  'a proof section built on their real rating and review count',
  'a tool cursor companion for the trade',
];

/**
 * @typedef {Object} SiteTemplate
 * @property {string} key            stable id, kebab-case, stored in the database
 * @property {string} name           the name Sarah uses for it
 * @property {string} origin         which build or package it came from
 * @property {'house'|'package'|'studio'} source
 * @property {string} feel           one sentence: what it feels like to land on
 * @property {string[]} fits         data/demo-os-trades keys this template suits
 * @property {string} alsoFits       free text for the gallery
 * @property {string[]} avoidFor     where it reads wrong
 * @property {{ground:string, paper:string, ink:string, accent:string, support:string, dark:boolean}} palette
 * @property {{display:string, body:string, third:string, thirdRole:string, googleFamilies:string[]}} type
 * @property {string[]} skeleton     section order, top to bottom
 * @property {string[]} devices      the graphic devices that make it this template
 * @property {string} copy           the copy register
 * @property {string} imagery        the image direction
 * @property {string} law            the full build law the builder follows
 */

/** @type {SiteTemplate[]} */
export const SITE_TEMPLATES = [
  {
    key: 'steel-and-ember',
    name: 'Steel and Ember',
    origin: 'Wild Horse Construction & Concrete',
    source: 'house',
    feel: 'A warm off-white shop wall with one hot ember of orange, and a handwritten note pinned in the margin.',
    fits: ['construction', 'roofing', 'painting', 'garage_door', 'restoration', 'septic', 'home_services'],
    alsoFits: 'concrete, welding, framing, fencing, excavation, anything that pours, welds, frames and finishes',
    avoidFor: ['medspa', 'wedding', 'attorney', 'restaurant'],
    palette: { ground: '#F5F3EE', paper: '#FFFFFF', ink: '#15130F', accent: '#DD4A17', support: '#8C8478', dark: false },
    type: { display: 'Ultra', body: 'Archivo', third: 'Caveat', thirdRole: 'handwritten asides and margin notes', googleFamilies: ['Ultra', 'Archivo:wght@400;500;700', 'Caveat:wght@500;700'] },
    skeleton: ['nav', 'hero with photo slider', 'the work (photo-led)', 'services', 'estimate', 'proof', 'faq', 'book', 'footer'],
    devices: ['fat slab display face at poster size', 'handwritten annotations in Caveat, rotated 2 to 4 degrees, pointing at real details', 'a before/after or progress slider as the hero centrepiece', 'thick ink rules and hard offset shadows', 'orange used as a single hot object per screen, never as a wash'],
    copy: 'Plain, proud, first person plural. Short declaratives. The crew talks like the crew. One handwritten aside per act carries the personality.',
    imagery: 'Daylight job-site photography: wet concrete, fresh framing, hands on tools, warm afternoon light, wide frames with the work as the subject. No storefronts, no blank signage.',
    law: `STEEL AND EMBER, the visual system, binding for this build:
- Ground #F5F3EE (warm off-white), cards #FFFFFF, ink #15130F, accent #DD4A17 (ember orange), support #8C8478. The accent is ONE hot object per screen: a word, a rule, a button, a number. Never a full-bleed orange section.
- Type: Ultra for display (poster size, tight leading, solid fill, never outlined), Archivo for body, nav and UI, Caveat for handwritten margin notes. Caveat is what stops this reading corporate: use it at least four times, rotated 2 to 4 degrees, always pointing at something real (a detail in a photograph, a number, a step).
- Skeleton: nav > hero with the photo slider as the centrepiece > the work (photo-led) > services > estimate > proof > faq > book > footer.
- Devices: 3px ink rules, hard 5px offset shadows on cards, oversized step numbers, a progress or before/after slider in the hero, a marquee of the services in Ultra.
- Photography: daylight job sites, hands on tools, materials close up, wide frames. Grade warm. Every slot its own frame.
- Copy: plain and proud, first person plural, short declaratives. Section titles are owned ("What a slab runs", "The work"), never abstract.`,
  },
  {
    key: 'night-neon',
    name: 'Night Neon',
    origin: 'Huck Yeah',
    source: 'house',
    feel: 'A black night with one electric stripe of orange, condensed capitals and something moving behind the hero.',
    fits: ['towing', 'auto_repair', 'moving', 'pool_spa'],
    alsoFits: 'rentals, tours, powersports, boat and sled hire, escape rooms, axe throwing, anything sold on fun',
    avoidFor: ['dental', 'attorney', 'medspa', 'vet'],
    palette: { ground: '#101614', paper: '#181F1C', ink: '#F4F1EA', accent: '#FF5A1F', support: '#6C7A73', dark: true },
    type: { display: 'Anton', body: 'Archivo', third: 'Bebas Neue', thirdRole: 'rates, labels and the marquee', googleFamilies: ['Anton', 'Archivo:wght@400;500;700', 'Bebas+Neue'] },
    skeleton: ['nav', 'hero with canvas ambience', 'why', 'fleet or lineup', 'play (photo-led)', 'rates', 'desk (booking)', 'area', 'contact', 'footer'],
    devices: ['canvas particle or light-streak ambience behind the hero, reduced-motion safe', 'condensed all-caps display at enormous size', 'neon-edge glow on the accent only', 'parallax plates', 'a horizontal fleet slider with prices'],
    copy: 'Loud, short, second person. Verbs first. The rate card is honest and easy to scan. Nothing cute; the energy comes from brevity.',
    imagery: 'Dusk and night frames, headlights, wet asphalt, motion blur, hard rim light on machines and people mid-action. Colour graded to the orange.',
    law: `NIGHT NEON, the visual system, binding for this build:
- Ground #101614 (near black), panels #181F1C, type #F4F1EA, accent #FF5A1F (electric orange), support #6C7A73. Dark ground everywhere; cream is for cards only if a rate table needs it.
- Type: Anton display in all caps at enormous size, Archivo body, Bebas Neue for rates, labels and the marquee.
- Skeleton: nav > hero with canvas ambience > why > fleet or lineup > play (photo-led) > rates > desk (booking) > area > contact > footer.
- Devices: this is the ONLY template where a canvas effect earns its place. Build one ambient layer (light streaks, embers, dust) behind the hero in its own try/catch, off under prefers-reduced-motion. Neon-edge glow on the accent only. Parallax plates. A horizontal fleet slider with the price on every card.
- Photography: dusk and night, headlights, motion blur, rim light, machines and people mid-action. Every slot its own frame.
- Copy: loud, short, second person, verbs first. The rate card is honest, scannable, and the most useful section on the page.`,
  },
  {
    key: 'barber-red',
    name: 'Barber Red',
    origin: 'Columbia Falls Barbershop',
    source: 'house',
    feel: 'Cream paper, deep barber red, a menu board you can read from the door. The most main street of them all.',
    fits: ['salon', 'cafe_bakery', 'auto_repair', 'locksmith', 'cleaning'],
    alsoFits: 'barbers, tattoo studios, butchers, cobblers, tailors, bike shops, any shopfront with a price list',
    avoidFor: ['attorney', 'medspa', 'real_estate'],
    palette: { ground: '#F4EDE1', paper: '#FBF7EF', ink: '#1C1714', accent: '#B0272C', support: '#5E5247', dark: false },
    type: { display: 'Anton', body: 'Source Serif 4', third: 'Oswald', thirdRole: 'subheads, the menu and prices', googleFamilies: ['Anton', 'Oswald:wght@400;500;600', 'Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400'] },
    skeleton: ['nav (sticky)', 'top (hero)', 'shop', 'menu (the hero of the layout)', 'word (proof)', 'faq', 'book', 'footer'],
    devices: ['the price menu as the centrepiece, dot leaders, two columns on desktop', 'striped pole or chevron accents in red and ink only', 'condensed display over a workhorse serif', 'a slider of the chairs and the work', 'a sticky nav with the phone always visible'],
    copy: 'Friendly and exact. Prices, times, what to ask for. Written like the owner talking to a regular.',
    imagery: 'Interior shopfront light, tools laid out, the chair, hands at work, warm tungsten. Tight crops.',
    law: `BARBER RED, the visual system, binding for this build:
- Ground #F4EDE1 (cream), paper #FBF7EF, ink #1C1714, accent #B0272C (barber red), support #5E5247.
- Type: Anton display, Oswald subheads and the menu, Source Serif 4 body. Three families, all visible above the fold.
- Skeleton: sticky nav > top (hero) > shop > menu > word (proof) > faq > book > footer. THE MENU SECTION IS THE HERO OF THIS LAYOUT, not the photograph: every service with a real name and a price or a clear "ask" line, dot leaders, two columns on desktop, one on mobile.
- Devices: red and ink stripes or chevrons as accents only, hard offset shadows, a slider of the chairs and the work, a live counter, the phone visible in the sticky nav at every width.
- Photography: interior shopfront light, tungsten warmth, tools laid out, hands at work, tight crops. Every slot its own frame.
- Copy: friendly and exact, the owner talking to a regular. Prices and times over adjectives.`,
  },
  {
    key: 'highway-amber',
    name: 'Highway Amber',
    origin: 'Hungry Horse Motel',
    source: 'house',
    feel: 'A lit amber sign on a blue-black road. Editorial serif against a condensed display, carried by photographs.',
    fits: ['restaurant', 'cafe_bakery', 'towing', 'real_estate'],
    alsoFits: 'motels, lodges, campgrounds, diners, gas and go, roadside attractions, anywhere along a road',
    avoidFor: ['dental', 'medspa', 'attorney'],
    palette: { ground: '#0B1018', paper: '#131A25', ink: '#F3EEE4', accent: '#FF9A3D', support: '#7C8594', dark: true },
    type: { display: 'Anton', body: 'Inter', third: 'Instrument Serif', thirdRole: 'editorial lines, pull quotes and italics', googleFamilies: ['Anton', 'Instrument+Serif:ital@0;1', 'Inter:wght@400;500;700'] },
    skeleton: ['nav', 'top (hero)', 'stay or eat', 'road (the story)', 'rooms or menu', 'word (proof)', 'faq', 'book', 'footer'],
    devices: ['amber glow treated as signage light, never as a flat fill', 'editorial serif italics against condensed capitals', 'parallax photo plates', 'at least eight distinct photographs', 'a map or mile-marker strip'],
    copy: 'Editorial and calm. Distances, hours, what is nearby, what the morning looks like. A traveller is reading this on a phone at 9pm.',
    imagery: 'Blue hour and night exteriors, sign light, interiors with warm lamps, the road, the view at dawn. Photography carries this template, so it needs the most distinct frames of any.',
    law: `HIGHWAY AMBER, the visual system, binding for this build:
- Ground #0B1018 (blue-black), panels #131A25, type #F3EEE4, accent #FF9A3D (amber signage), support #7C8594.
- Type: Anton display, Instrument Serif for editorial lines, pull quotes and italics, Inter body.
- Skeleton: nav > top (hero) > stay or eat > road (the story) > rooms or menu > word (proof) > faq > book > footer.
- Devices: amber treated as LIGHT (glows, sign edges, a warm gradient off the hero), never a flat orange section. Parallax plates. A mile-marker or map strip with real distances. This template is carried by photography: EIGHT distinct frames minimum, every slot its own.
- Photography: blue hour and night exteriors, sign light, warm lamp interiors, the road, the view at dawn. Grade to the amber.
- Copy: editorial and calm. Distances, hours, what is nearby, what the morning looks like. Written for a traveller reading on a phone at 9pm.`,
  },
  {
    key: 'field-note',
    name: 'Field Note',
    origin: 'Sands Surveying',
    source: 'house',
    feel: 'Bone paper, rust accent, a mono face used as a real instrument: coordinates, measurements, plat numbers.',
    fits: ['professional', 'tree_service', 'septic', 'electrical', 'pest_control', 'hvac'],
    alsoFits: 'surveyors, engineers, inspectors, arborists, well drillers, soil testers, anyone whose work produces figures',
    avoidFor: ['salon', 'wedding', 'restaurant'],
    palette: { ground: '#F4F1E8', paper: '#FBF9F3', ink: '#1A1916', accent: '#A84718', support: '#6F6A60', dark: false },
    type: { display: 'Archivo', body: 'Source Serif 4', third: 'IBM Plex Mono', thirdRole: 'every number, coordinate, date and label; nowhere else', googleFamilies: ['Archivo:wght@500;700;900', 'IBM+Plex+Mono:wght@400;500', 'Source+Serif+4:opsz,wght@8..60,400;8..60,600'] },
    skeleton: ['nav', 'line (hero)', 'surveys or services', 'finder (interactive)', 'reviews', 'faq', 'book', 'footer'],
    devices: ['mono face for anything numeric and nothing else', 'thin rules with tick marks, like a scale', 'a coordinate or measurement readout that updates on scroll', 'sticky stage with a diagram', 'a finder: a small interactive that answers "do you serve my parcel / my county / my situation"'],
    copy: 'Precise, unhurried, expert. Numbers where numbers exist. No hype. The reader is deciding whether to trust a figure with their money.',
    imagery: 'Instruments in the field, terrain, drawings and plats, hands with tools, overcast and clear daylight. Documents shown at an angle as objects.',
    law: `FIELD NOTE, the visual system, binding for this build:
- Ground #F4F1E8 (bone), paper #FBF9F3, ink #1A1916, accent #A84718 (rust), support #6F6A60.
- Type: Archivo display (heavy), IBM Plex Mono for EVERY number, coordinate, date and label and for NOTHING else, Source Serif 4 body. The mono face is the whole personality; used for prose it becomes a gimmick.
- Skeleton: nav > line (hero) > surveys or services > finder > reviews > faq > book > footer.
- Devices: thin rules with tick marks like a scale, a readout in the hero that updates on scroll (a measurement, a bearing, a count), a sticky stage with a diagram, a slider, and THE FINDER: a small interactive that answers the visitor's first question (do you cover my county, what does a boundary survey involve, which inspection do I need).
- Photography: instruments in the field, terrain, plats and drawings shot as objects at an angle, hands with tools, honest daylight.
- Copy: precise, unhurried, expert. Numbers where numbers exist. No hype.`,
  },
  {
    key: 'wild-reverent',
    name: 'Wild Reverent',
    origin: 'the Wild Hope Church concept',
    source: 'house',
    feel: 'Deep ink, an ember accent, one enormous variable serif and a scroll-driven turn at the centre.',
    fits: ['wedding', 'professional'],
    alsoFits: 'churches, retreats, galleries, guides, outfitters, nonprofits, anything sold on feeling rather than price',
    avoidFor: ['towing', 'pest_control', 'auto_repair', 'locksmith'],
    palette: { ground: '#0B1016', paper: '#141B24', ink: '#F2ECE1', accent: '#E08A3C', support: '#7E8794', dark: true },
    type: { display: 'Fraunces', body: 'Inter', third: 'DM Mono', thirdRole: 'the week, times, dates and the small labels', googleFamilies: ['Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300', 'Inter:wght@400;500', 'DM+Mono:wght@300;400'] },
    skeleton: ['nav', 'hero', 'the turn (signature scroll moment)', 'story', 'the week or the season', 'life (photo rail)', 'honest (proof and faq)', 'visit', 'footer'],
    devices: ['THE TURN: a scroll-scrubbed moment where the page changes state (see docs/flagship/MOTION.md)', 'a drag reel of frames', 'a horizontal rail', 'an oversized wordmark at optical size 144', 'ember accent as light on the ink, never a fill'],
    copy: 'Quiet, warm, second person, one poetic line per act and no more. Invitations, not claims.',
    imagery: 'Dawn and dusk, wide landscapes, people in real gatherings, candle and window light, film grain. Nothing posed.',
    law: `WILD REVERENT, the visual system, binding for this build:
- Ground #0B1016 (deep ink), panels #141B24, type #F2ECE1, accent #E08A3C (ember), support #7E8794.
- Type: Fraunces variable serif for display and the oversized wordmark (optical size 144, light weight, italic where it earns it), Inter body, DM Mono for the week, times, dates and small labels.
- Skeleton: nav > hero > the turn > story > the week or the season > life (photo rail) > honest (proof and faq) > visit > footer.
- Devices: THE TURN is the centrepiece, a scroll-scrubbed moment where the page changes state (docs/flagship/MOTION.md). A drag reel, a horizontal rail, the ember as light on the ink and never a fill.
- Photography: dawn and dusk, wide landscapes, real gatherings, candle and window light, film grain. Nothing posed.
- Copy: quiet and warm, second person, one poetic line per act and no more. Invitations, not claims.`,
  },
  {
    key: 'lakehouse-editorial',
    name: "Daisy's Lakehouse Editorial",
    origin: "Daisy's Cafe (Sarah's package, 2026-08-24)",
    source: 'package',
    feel: 'Cream paper, near-black ink, expressive serif headlines and a small design magazine\'s restraint. A destination, not a brochure.',
    fits: ['restaurant', 'cafe_bakery', 'wedding'],
    alsoFits: 'lodges, retreats, wineries, farm stands, boutique inns, bakeries, any hospitality brand that should feel editorial, tactile and art-directed',
    avoidFor: ['towing', 'plumbing', 'pest_control', 'locksmith', 'garage_door'],
    palette: { ground: '#F2EDDF', paper: '#F8F3E6', ink: '#11110F', accent: '#E7BF38', support: '#8F9B75', dark: false },
    type: { display: 'Fraunces', body: 'Inter', third: 'Instrument Serif', thirdRole: 'editorial italics, pull quotes and the ticker', googleFamilies: ['Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400', 'Instrument+Serif:ital@0;1', 'Inter:wght@400;500;600'] },
    skeleton: ['transparent sticky nav over the hero', 'full-bleed hero', 'marquee ticker', 'editorial intro', 'full-width image break with a paper note', 'menu or offerings on an ink field', 'signature ritual (dark, image-led)', 'gallery (contact-sheet grid with lightbox)', 'event or seasonal feature', 'two service cards', 'warm accent reservation CTA', 'footer'],
    devices: ['thin black rules and punched-out outline type', 'small rotated stickers and circular badges', 'imperfect hand-drawn flower or daisy marks (inline SVG)', 'oversized numbers', 'paper-note callouts', 'a restrained CSS grain on the cream', '60/40 asymmetric splits, overlapping cards, tall crops'],
    copy: 'A thoughtful host with a passport and a local address. Concrete sensory nouns, short confident sentences, a little wit. Local ingredients, local weather, a recurring ritual, the reason to plan around it.',
    imagery: 'Signature place and signature dish in one wide frame, abundant spreads at 4:5, room-to-landscape interiors, the recurring event in action, a shippable still life, a gathering. Editorial photo style, exact palette, tactile materials, no text anywhere in any image.',
    law: `LAKEHOUSE EDITORIAL, the visual system, binding for this build (from the Daisy's Lakehouse Editorial package):
CREATIVE NORTH STAR. Build a destination, not a brochure. The first viewport makes the visitor feel the place before they understand the business: weather, light, a signature dish or product, a local ritual, a reason to come back. The reference feeling is an elevated lakeside cafe with the restraint of a small design magazine. Do not copy any reference site's wording, logo, photo or composition; keep the editorial rhythm and make THIS brand's place, product and rituals the subject.
PALETTE. Warm cream #F2EDDF, paper #F8F3E6, ink #11110F, one vivid accent #E7BF38 (derive a brand accent only when the brief gives one), supporting sage #8F9B75 and brown #5B3824. Cream must feel like paper, not white: a restrained CSS grain or dot texture, never a noisy overlay. Black sections feel like a night room or an ink page; cream sections feel sunlit and tactile.
TYPE. Fraunces serif display for headlines, Instrument Serif for editorial italics and the ticker, Inter for navigation, labels, prices and metadata. Compact uppercase labels. Never place UI copy inside generated imagery.
DEVICES. Thin black rules, punched-out outline type (as a device on one word, never the wordmark), small rotated stickers, oversized numbers, circular badges, hand-drawn flower marks as inline SVG, paper-note callouts. Favor asymmetry: 60/40 splits, overlapping cards, editorial offsets, tall image crops, horizontal rules, large quiet margins. Avoid generic startup layouts, rounded-card dashboards, pastel gradients, glassmorphism, stock photo grids and corporate photography.
PAGE ARCHITECTURE, in this order unless the content forces a small change:
 1. Transparent sticky over-image nav: wordmark, 3 to 5 anchor links, pill CTA, compact mobile menu that is a real dialog (aria-modal, close button, Escape, body scroll lock).
 2. Full-bleed hero: signature place image, one declarative serif headline, one short paragraph, a circular scroll or menu link, one playful badge.
 3. Thin marquee ticker with offerings or a positioning phrase.
 4. Editorial introduction: oversized headline, short place and story copy, a small mark.
 5. Full-width image break with one offset paper note or promise card.
 6. Menu or offerings on an ink-black field: real names, details, prices or clear inquiry CTAs. Tabs only when categories are meaningful, and tabs update content without navigation.
 7. Signature ritual: a dark image-led story for the most ownable experience (the boat breakfast, the tasting, the class, the trail).
 8. Gallery: 5 to 8 photos in a magazine contact-sheet grid. Every image is a button with a visible focus state, opening a lightbox with previous and next, close on Escape and on click outside.
 9. Event or seasonal feature: name the recurring event, explain its rhythm, show a concrete next edition, make the RSVP action obvious.
 10. Two service cards (catering and shop, weddings and retreats, shipping and private dining).
 11. Warm accent reservation or contact CTA with playful graphic marks.
 12. Footer with location, hours, email and phone, newsletter, a restrained credits row.
COPY. Write like a thoughtful host with a passport and a local address: concrete sensory nouns, short confident sentences, a little wit. Mention local ingredients, local weather, a recurring ritual and the reason it is worth planning around. Banned: "best in town", "world-class", "unforgettable experience", "elevated dining", "something for everyone". Replace each with a dish, a departure time, a sound, a view, a seasonal detail.
IMAGERY. Generate backgrounds and scenes only, never text, logos, menus, labels or signage inside an image; all copy lives in HTML. Every prompt names subject and place, editorial photo style, composition and crop, lighting and mood, the exact palette, tactile materials, and the negatives (no text, no logos, no watermark). The set: hero (place plus signature product plus one local detail, 2:1), food or product spread (4:5), interior room-to-view, the event in action, a shippable still life, a gathering. Real descriptive alt text on every one.
RESPONSIVE. Desktop: layered editorial composition, 2-column feature splits, 3-column gallery. Tablet: collapsed nav, big type kept, 55/45 splits. Mobile: horizontal snap-scrolling gallery, single-column service cards, compact headline, stacked CTAs. No decorative badge may cover the headline or the primary subject at small widths.
DONE MEANS. The first viewport communicates place, product and primary action without scrolling; the gallery reads as a designed sequence, not six equal cards; the ritual and the recurring event are concrete and bookable; the offerings are complete enough to orient a visitor.`,
  },
  {
    key: 'midnight-atelier',
    name: 'Midnight Atelier',
    origin: 'MMS studio design, 2026-08-24',
    source: 'studio',
    feel: 'A dark room, a hairline of aged gold, a light serif set wide. Quiet luxury: the page never raises its voice.',
    fits: ['medspa', 'wedding', 'salon', 'real_estate', 'construction'],
    alsoFits: 'jewelers, fine dining, custom home builders, interior designers, bridal, private chefs, boutique fitness, aesthetics clinics',
    avoidFor: ['towing', 'septic', 'pest_control', 'moving'],
    palette: { ground: '#0E0D0B', paper: '#17150F', ink: '#EFE9DC', accent: '#C9A24A', support: '#6E6657', dark: true },
    type: { display: 'Cormorant Garamond', body: 'Manrope', third: 'DM Mono', thirdRole: 'prices, small caps labels and the index numbers', googleFamilies: ['Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400', 'Manrope:wght@300;400;600', 'DM+Mono:wght@300;400'] },
    skeleton: ['nav (centered wordmark, hairline rule)', 'hero (one image, one line, one gold rule)', 'chapter index (numbered)', 'the work or the menu (numbered chapters, image plus text)', 'process or ritual', 'proof (rating in gold, quotes in italic serif)', 'faq', 'private appointment (booking)', 'footer'],
    devices: ['hairline gold rules (1px, #C9A24A at 60%) as the only ornament', 'centered wordmark with wide tracking', 'numbered chapters in DM Mono (01, 02, 03)', 'images inset with a 1px gold border and generous margin', 'slow crossfade gallery, no hard cuts', 'dot-leader price lists', 'the accent as light on edges, never a fill'],
    copy: 'Few words, set wide. Third person for the house, second person for the guest. No exclamation marks, no superlatives; the specificity is the luxury.',
    imagery: 'Low key, single light source, deep shadows, materials close up (stone, silk, metal, skin, wood grain), 85mm compression, slight warm grade. Never a bright white studio.',
    law: `MIDNIGHT ATELIER, the visual system, binding for this build:
- Ground #0E0D0B, panels #17150F, type #EFE9DC, accent #C9A24A (aged gold), support #6E6657. Dark everywhere; the only light is the gold on edges and rules. No gradient washes, no glass.
- Type: Cormorant Garamond display at light weight set wide (letter-spacing 0.02em on headlines, 0.18em uppercase on labels), Manrope body at 300 and 400, DM Mono for prices, small labels and the chapter index. Three families, all present above the fold.
- Skeleton: nav with a centered wordmark and a hairline rule > hero (one image, one line, one gold rule) > chapter index > the work or the menu as numbered chapters > process or ritual > proof > faq > private appointment > footer.
- Devices: hairline gold rules are the ONLY ornament. Numbered chapters (01, 02, 03) in DM Mono. Every image inset with a 1px gold border and generous margin. Gallery crossfades slowly, never cuts. Dot-leader price list. The marquee is a single slow line of the offerings in italic serif. The counter counts up in DM Mono.
- Photography: low key, one light source, deep shadow, materials close up, 85mm compression, warm grade. Never a bright white studio, never a smiling stock portrait.
- Copy: few words, set wide, third person for the house and second person for the guest. No exclamation marks, no superlatives. The specificity is the luxury: name the stone, the hour, the technique.`,
  },
  {
    key: 'swiss-grid',
    name: 'Swiss Grid',
    origin: 'MMS studio design, 2026-08-24',
    source: 'studio',
    feel: 'International style: a strict twelve-column grid, one grotesk, one signal red, flush-left type and no decoration at all.',
    fits: ['professional', 'attorney', 'electrical', 'hvac', 'real_estate'],
    alsoFits: 'engineers, architects, accountants, IT and managed services, logistics, consultancies, labs, anyone who sells precision',
    avoidFor: ['wedding', 'salon', 'cafe_bakery'],
    palette: { ground: '#F1F0EB', paper: '#FFFFFF', ink: '#0A0A0A', accent: '#E0201B', support: '#8A8A85', dark: false },
    type: { display: 'Inter Tight', body: 'Inter', third: 'JetBrains Mono', thirdRole: 'figures, tables, dates and the grid coordinates', googleFamilies: ['Inter+Tight:wght@500;700;900', 'Inter:wght@400;500', 'JetBrains+Mono:wght@400;500'] },
    skeleton: ['nav (grid-aligned, three columns)', 'hero (headline across 8 columns, one red word)', 'index of services as a numbered table', 'method (steps on the grid)', 'figures (counter band in mono)', 'work or cases', 'proof', 'faq', 'contact (form on the grid)', 'footer'],
    devices: ['a visible 12-column grid: every element snaps to it, the gutters are the design', '1px ink rules between rows, never boxes', 'one word in red per screen, at most', 'flush-left, ragged-right, no centered text anywhere', 'large numerals as section markers', 'tabular data set in mono with aligned columns', 'hover states are an underline, nothing else'],
    copy: 'Declarative and short. Nouns and numbers. Headlines are statements of fact. Nothing is "passionate".',
    imagery: 'Objective, frontal, evenly lit documentary frames of the work: plans, equipment, sites, hands, screens. Black and white for secondary slots, colour only in the hero. Square and 3:2 crops.',
    law: `SWISS GRID, the visual system, binding for this build:
- Ground #F1F0EB (warm grey paper), white #FFFFFF panels, ink #0A0A0A, accent #E0201B (signal red), support #8A8A85.
- Type: Inter Tight for display (900 for the hero, 700 for section heads), Inter body, JetBrains Mono for every figure, table, date and label. Flush left, ragged right, no centered text anywhere on the page, no italics.
- Skeleton: nav > hero (headline across 8 of 12 columns, one word in red) > index of services as a numbered table > method (steps on the grid) > figures (the counter band, in mono) > work or cases > proof > faq > contact > footer.
- Devices: a real 12-column grid that every element snaps to; the gutters and the alignment ARE the design. 1px ink rules between rows, never boxes or cards with shadows. One red word per screen at most. Large numerals as section markers. Tables in mono with aligned columns. The marquee is a single line of the services in Inter Tight, ink on paper. The slider is a comparison table that reveals on drag. Hover is an underline and nothing else.
- Photography: objective, frontal, evenly lit documentary frames of the work. Black and white in secondary slots, colour only in the hero. Square and 3:2 crops on the grid.
- Copy: declarative and short, nouns and numbers, headlines as statements of fact. Nothing is "passionate" and nothing is "bespoke".`,
  },
  {
    key: 'poster-press',
    name: 'Poster Press',
    origin: 'MMS studio design, 2026-08-24',
    source: 'studio',
    feel: 'A two-ink risograph poster: halftone texture, a hair of misregistration, stacked headlines and a stamp in the corner.',
    fits: ['cafe_bakery', 'restaurant', 'moving', 'cleaning'],
    alsoFits: 'breweries, taprooms, coffee roasters, food trucks, music venues, festivals, makers, print shops, record stores, bike shops',
    avoidFor: ['attorney', 'dental', 'medspa', 'real_estate'],
    palette: { ground: '#F4EFE2', paper: '#FFFFFF', ink: '#1B2A4A', accent: '#F26A3D', support: '#8C7B6A', dark: false },
    type: { display: 'Bricolage Grotesque', body: 'Public Sans', third: 'Courier Prime', thirdRole: 'stamps, dates, the ticket strip and small print', googleFamilies: ['Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800', 'Public+Sans:wght@400;500;700', 'Courier+Prime:wght@400;700'] },
    skeleton: ['nav (poster masthead)', 'hero (stacked headline, the two inks, one stamp)', 'ticker strip in Courier', 'the lineup or the menu as poster blocks', 'the story (halftone photo, big pull quote)', 'events or hours as a ticket strip', 'gallery (contact sheet)', 'proof', 'faq', 'come by (map, hours, book)', 'footer'],
    devices: ['two-ink discipline: the blue ink and the orange ink, and the paper; no third colour', 'CSS halftone dot texture on photos (radial-gradient pattern with mix-blend multiply)', 'misregistration: headline duplicated in the second ink and offset 2px, 3px on the hero only', 'rotated rubber-stamp badges in Courier', 'numbered poster blocks with thick rules', 'a perforated ticket strip for events or hours'],
    copy: 'Punchy, warm, present tense. Sounds like the chalkboard. Real names for everything on the lineup.',
    imagery: 'High contrast, grain, close and lively: the pour, the crowd, the oven, the roaster, hands and steam. Photos are treated as duotone in the two inks except the hero, which is full colour.',
    law: `POSTER PRESS, the visual system, binding for this build:
- Paper #F4EFE2, white #FFFFFF, ink #1B2A4A (deep press blue), accent #F26A3D (fluorescent orange), support #8C7B6A. TWO-INK DISCIPLINE: every screen is the blue ink, the orange ink and the paper. No third colour, ever.
- Type: Bricolage Grotesque display (800 at poster size, tight), Public Sans body, Courier Prime for stamps, dates, the ticket strip and small print.
- Skeleton: masthead nav > hero (stacked headline in the two inks with one rubber stamp) > ticker strip in Courier > the lineup or the menu as numbered poster blocks > the story (halftone photo, big pull quote) > events or hours as a perforated ticket strip > gallery > proof > faq > come by (map, hours, book) > footer.
- Devices: a CSS halftone dot texture over photographs (radial-gradient pattern, mix-blend-mode multiply, never over text). Misregistration on the hero headline only: duplicate it in the second ink offset 2px right and 3px down. Rotated rubber-stamp badges in Courier with a real fact in them (est. year from the brief, the rating, the town). Thick rules on the poster blocks. The slider is the lineup on drag. The counter counts something real.
- Photography: high contrast, grain, close and lively: the pour, the crowd, the oven, hands and steam. Secondary slots treated as duotone in the two inks; the hero stays full colour.
- Copy: punchy, warm, present tense, sounds like the chalkboard. Real names for everything on the lineup, real prices where the brief has them.`,
  },
  {
    key: 'greenhouse',
    name: 'Greenhouse',
    origin: 'MMS studio design, 2026-08-24',
    source: 'studio',
    feel: 'Linen and deep green, arched photographs, a plant-tag label system and a seasonal strip. Grown, not built.',
    fits: ['landscaping', 'tree_service', 'landscape_lighting', 'pool_spa', 'home_services'],
    alsoFits: 'nurseries, florists, garden centers, lawn care, farms and markets, greenhouses, irrigation, outdoor living',
    avoidFor: ['towing', 'attorney', 'auto_repair'],
    palette: { ground: '#ECEBE1', paper: '#F7F6EF', ink: '#1E3A2B', accent: '#D7A21A', support: '#7C8F6E', dark: false },
    type: { display: 'Newsreader', body: 'Karla', third: 'Kalam', thirdRole: 'plant-tag labels and handwritten season notes', googleFamilies: ['Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400', 'Karla:wght@400;500;700', 'Kalam:wght@400;700'] },
    skeleton: ['nav', 'hero (arched photo, serif headline, a season note)', 'marquee of what is in season or on offer', 'services as plant tags', 'before and after slider', 'the season strip (a calendar of the year)', 'gallery (arched masks)', 'proof', 'faq', 'book a walk-through', 'footer'],
    devices: ['arched image masks (border-radius 999px 999px 0 0) on hero and gallery', 'plant-tag labels: a small cream card with a hole punched, Kalam handwriting, one per service', 'a seasonal strip laying the year out with what happens when', 'line-art leaf and seed marks as inline SVG, never emoji', 'a before/after slider as the proof of work', 'soft paper grain on the linen ground'],
    copy: 'Warm and practical. Seasons, timing, what to plant, what to cut, what a yard looks like in a year. Speaks to a homeowner walking their lot.',
    imagery: 'Golden hour and overcast green, dew, soil, hands with plants, finished yards from a low angle, wide establishing shots. Green and gold grade.',
    law: `GREENHOUSE, the visual system, binding for this build:
- Ground #ECEBE1 (linen), paper #F7F6EF, ink #1E3A2B (deep green, used as the text colour and the dark sections), accent #D7A21A (marigold), support #7C8F6E (sage). The green is the ink; there is no black on this page.
- Type: Newsreader serif display (italic for the season notes), Karla body, Kalam for plant-tag labels and handwritten notes. Three families, all present above the fold.
- Skeleton: nav > hero (arched photo, serif headline, one handwritten season note) > marquee of what is in season or on offer > services as plant tags > before and after slider > the season strip > gallery in arched masks > proof > faq > book a walk-through > footer.
- Devices: arched image masks (border-radius 999px 999px 0 0) on the hero and the gallery. Plant-tag labels: small cream cards with a punched hole and a Kalam label, one per service. THE SEASON STRIP lays the year out month by month with what happens when (from the brief and the trade, never invented specifics). Line-art leaf and seed marks as inline SVG, never emoji. A before/after slider is the proof of work. Soft paper grain on the linen.
- Photography: golden hour and overcast green, dew, soil, hands with plants, finished yards from a low angle, wide establishing shots. Green and gold grade. Every slot its own frame.
- Copy: warm and practical. Seasons, timing, what to plant, what to cut, what a yard looks like a year from now. Written to a homeowner walking their lot.`,
  },
  {
    key: 'clinic-calm',
    name: 'Clinic Calm',
    origin: 'MMS studio design, 2026-08-24',
    source: 'studio',
    feel: 'Soft white, deep teal, pill-shaped photographs and big friendly numerals. The page lowers the visitor\'s heart rate.',
    fits: ['dental', 'vet', 'medspa', 'professional'],
    alsoFits: 'chiropractors, physical therapy, optometrists, counseling, pediatrics, urgent care, pharmacies, hearing clinics',
    avoidFor: ['towing', 'construction', 'moving'],
    palette: { ground: '#F7F8F6', paper: '#FFFFFF', ink: '#16302B', accent: '#2F7F6F', support: '#F2B850', dark: false },
    type: { display: 'DM Serif Display', body: 'DM Sans', third: 'DM Mono', thirdRole: 'hours, phone, insurance codes and the appointment strip', googleFamilies: ['DM+Serif+Display:ital@0;1', 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700', 'DM+Mono:wght@400;500'] },
    skeleton: ['nav (phone and book always visible)', 'hero (pill photo, one calm headline, the appointment strip)', 'what to expect (three steps)', 'services', 'new patients (what to bring, insurance, hours)', 'the team (real names only, or the practice as a whole)', 'proof', 'faq', 'book', 'footer'],
    devices: ['pill-shaped image masks (border-radius 999px) on the hero and team slots', 'big friendly numerals for steps and figures', 'the appointment strip: today, tomorrow, next open slot, computed live', 'a warm marigold highlight for the one thing to do next', 'generous line height, wide margins, no hard shadows', 'insurance and hours as clean mono tables'],
    copy: 'Reassuring, plain, second person. Explains what happens next and how long it takes. Never clinical jargon without the plain word beside it.',
    imagery: 'Bright natural light, soft focus backgrounds, real rooms, hands and tools at rest, a window. Warm and calm, no blue-white surgical light.',
    law: `CLINIC CALM, the visual system, binding for this build:
- Ground #F7F8F6 (soft white), white #FFFFFF cards, ink #16302B (deep teal-black), accent #2F7F6F (teal), highlight #F2B850 (marigold) reserved for the ONE next action on each screen.
- Type: DM Serif Display for headlines (italic sparingly), DM Sans body, DM Mono for hours, phone, insurance codes and the appointment strip.
- Skeleton: nav with the phone and Book always visible > hero (pill photo, one calm headline, the appointment strip) > what to expect (three steps) > services > new patients (what to bring, insurance, hours) > the team (real names only, else the practice as a whole) > proof > faq > book > footer.
- Devices: pill-shaped image masks on the hero and team slots. Big friendly numerals for steps and figures. THE APPOINTMENT STRIP computes today, tomorrow and the next open window live in JS. Marigold highlight on exactly one element per screen. Generous line height, wide margins, soft 1px borders, no hard offset shadows. Insurance and hours as clean mono tables. The marquee is a calm line of the services. The slider is the three-step "what to expect".
- Photography: bright natural light, soft focus, real rooms, hands and tools at rest, a window. Warm and calm; never blue-white surgical light, never a stock smile.
- Copy: reassuring, plain, second person. Says what happens next and how long it takes. Never a clinical term without the plain word beside it. Never invent a provider name, a credential or an insurance accepted.`,
  },
  {
    key: 'easton-kinetic',
    name: 'Easton Kinetic Event Studio',
    origin: "Easton Events (Sarah's package v2, 2026-08-25)",
    source: 'package',
    feel: 'A backstage door into a live show: midnight canvas, acid-lime and cyan signal colours, giant compressed type, orbit rings, scan lines and sticky showreel cards.',
    fits: ['wedding', 'professional', 'moving'],
    alsoFits: 'event production, AV and staging, DJs and live music, festivals, venues, experiential agencies, photographers and videographers, creative studios, gyms and fight clubs, anything sold on energy',
    avoidFor: ['dental', 'vet', 'attorney', 'medspa', 'septic'],
    palette: { ground: '#08090D', paper: '#F1EEE9', ink: '#F1EEE9', accent: '#D9FF43', support: '#48F3F1', dark: true },
    type: { display: 'Big Shoulders Display', body: 'Inter', third: 'JetBrains Mono', thirdRole: 'coordinates, section indexes, metrics and the signal rail', googleFamilies: ['Big+Shoulders+Display:wght@700;900', 'Inter:wght@400;500;600', 'JetBrains+Mono:wght@400;500'] },
    skeleton: ['absolute hero nav with a real mobile drawer', 'full-viewport hero (three-line headline, signal rail, coordinates, orbit rings, rotated sticker)', 'electric capability ticker', 'oversized cream manifesto with a rotating glyph', 'sticky four-card capability stack, one accent per card', 'metrics band with a moving statement', 'sticky method title plus four scroll-revealed steps', 'asymmetrical editorial gallery with a lightbox', 'behind-the-scenes studio section', 'high-energy coral CTA', 'footer'],
    devices: ['scroll progress bar (the one real scroll listener)', 'sticky project stack with a distinct signal colour per card (lime, violet, coral, cyan)', 'animation-timeline: view() reveals, orbit rings on 11 to 25 second loops, scan-line sweeps', 'giant compressed uppercase headlines with outline treatments (-webkit-text-stroke)', 'grid coordinates and section indexes in mono', 'ticker marquee on 17 to 30 second loops', 'image crops that read as showreel frames', 'every motion with a prefers-reduced-motion fallback that keeps all content'],
    copy: 'Authority and specificity. Name the scale, the room, the risk, the handoff, the sound, the exact transformation. "Turn a room full of people into one undeniable feeling," never "create memorable experiences."',
    imagery: 'Wide hero event world, trade-show environment, conference keynote, concert or festival, tactile backstage crew detail, immersive gala or brand world, and a 1200x630 social crop. Electric stage light, confetti, blue hour, deep blacks; never stock corporate photography, never text inside an image.',
    law: `EASTON KINETIC EVENT STUDIO, the visual system, binding for this build (from Sarah's Easton Kinetic package v2):
NORTH STAR. Make the visitor feel as though they walked through a backstage door into a live show. Kinetic, confident, slightly strange, and meticulously controlled beneath the noise. Avoid pastel gradients, glassmorphism, generic agency cards, rounded SaaS chrome, quiet minimalism and stock corporate photography.
PALETTE ROLES. Black #08090D (ground), ink #0F1117 (panels), paper #F1EEE9 (type and the manifesto section), muted #A7ADB7, and four SIGNAL colours: lime #D9FF43 (the lead accent), cyan #48F3F1, violet #8065FF, coral #FF526E. One signal colour per sticky card; coral owns the closing CTA. Their brand colours fill these roles per the colour law below; the four-signal discipline (one per card, one for the close) stays.
TYPE. Big Shoulders Display, condensed and heavy, for hero and section titles: uppercase, oversized, tightly tracked, outline treatments allowed with -webkit-text-stroke on a tinted fill. Inter for navigation, labels, body, metrics and controls. JetBrains Mono for coordinates, indexes and the signal rail. READABILITY GUARDRAILS, non-negotiable: large headings at about .9 line-height with balanced wrapping and slightly relaxed tracking; project and method headings at .92 or more; supporting copy at 1.6 or more; deliberate vertical margins so display lines never collide at desktop or mobile widths.
PAGE ARCHITECTURE, in this order:
 1. Absolute hero navigation: compact mark, anchors, project CTA, a real mobile drawer (aria-modal, close button, Escape, focus handling, body-scroll lock).
 2. Full-viewport hero: a declarative three-line headline, positioning copy, a signal rail, grid coordinates, orbit rings, a rotated circular sticker.
 3. Electric capability ticker.
 4. Oversized cream manifesto with a faint rotating glyph.
 5. Sticky four-card capability stack, a distinct signal colour per card.
 6. Metrics band with large numbers and a moving statement (real numbers from the brief only; never Easton's).
 7. Sticky method title plus four scroll-revealed steps.
 8. Asymmetrical editorial gallery; every image is a keyboard-accessible button opening a full-screen lightbox with previous and next, Escape and backdrop close.
 9. Behind-the-scenes studio or about section.
 10. High-energy coral CTA with a real email, phone, inquiry or booking destination.
 11. Footer with contact, navigation, newsletter treatment and credits.
MOTION CONTRACT. CSS-first: sticky narrative cards, animation-timeline: view() reveals, orbit rings, scan sweeps, marquees, signal pulses. Exactly one real scroll listener, for the page progress bar. Hero zoom 1.5 to 2 seconds, orbit loops 11 to 25 seconds, marquees 17 to 30 seconds. Every motion has a prefers-reduced-motion fallback that preserves all content. Hover states are surgical: image scale, arrow nudge or colour shift, never every property. Mobile keeps the point of view with stacked cards and horizontal snap galleries instead of removing motion. The marquee and the count-up metrics satisfy the shared devices; the sticky stack is the drag or slider moment.
COPY. Authority and specificity: name the scale, the room, the risk, the handoff, the sound, the exact transformation. Never present Easton's metrics, establishment date, contacts, history or capabilities as facts about the new business; every number comes from the brief or is left out.
IMAGERY. Use supplied real assets when available; otherwise generate original frames with subject, environment, composition, lighting, materials and the explicit palette. Minimum set: wide hero event world, trade-show environment, conference keynote, concert or festival, tactile backstage crew detail, immersive gala or brand world, and a 1200x630 social crop. Never text, logos, labels or readable screens inside an image; never stock URLs or placeholder services. Descriptive alt text on every meaningful image; decorative glyphs aria-hidden.
DONE MEANS. The first viewport communicates category, scale and a clear CTA; no display lines collide at any width; the sticky cards, method steps, gallery and CTA keep distinct rhythms; nothing of Easton's demo content survives on the new business.`,
  },
];

export const TEMPLATE_KEYS = SITE_TEMPLATES.map((t) => t.key);

/** @returns {SiteTemplate | null} */
export function siteTemplate(key) {
  if (!key) return null;
  const k = String(key).trim().toLowerCase();
  return SITE_TEMPLATES.find((t) => t.key === k) ?? null;
}

export function isTemplateKey(key) {
  return siteTemplate(key) !== null;
}

/** The "SITE TEMPLATE: key" line the brief carries, or null. */
export function templateFromBrief(brief) {
  const m = new RegExp(`^${TEMPLATE_LINE}\\s*([a-z0-9-]+)\\b`, 'mi').exec(brief || '');
  return m ? siteTemplate(m[1])?.key ?? null : null;
}

/**
 * How well a template fits a trade, 0 to 3. Used as a weight for Random.
 * A listed fit is 3, a neutral template is 1, an avoided one is 0.
 */
export function templateFit(t, trade) {
  if (!trade) return 1;
  if (t.avoidFor.includes(trade)) return 0;
  if (t.fits.includes(trade)) return 3;
  return 1;
}

/**
 * Resolve Random into one template key. Weighted by trade fit; never the
 * lead's previous template; never a template a ready site in the same trade
 * and town already wears (when the caller can tell us). Falls back through
 * those exclusions rather than returning nothing.
 *
 * `rand` is injectable for tests; defaults to Math.random.
 *
 * @param {{ trade?: string | null, exclude?: (string | null | undefined)[], rand?: () => number }} [opts]
 * @returns {string}
 */
export function pickSiteTemplate({ trade = null, exclude = [], rand = Math.random } = {}) {
  const ex = new Set((exclude || []).filter(Boolean).map((k) => String(k).toLowerCase()));
  const weigh = (pool) => pool.map((t) => ({ t, w: templateFit(t, trade) })).filter((x) => x.w > 0);
  let pool = weigh(SITE_TEMPLATES.filter((t) => !ex.has(t.key)));
  if (!pool.length) pool = weigh(SITE_TEMPLATES);
  if (!pool.length) pool = SITE_TEMPLATES.map((t) => ({ t, w: 1 }));
  const total = pool.reduce((s, x) => s + x.w, 0);
  let r = rand() * total;
  for (const x of pool) {
    r -= x.w;
    if (r <= 0) return x.t.key;
  }
  return pool[pool.length - 1].t.key;
}

/** Google Fonts href for a template's three families, for previews and builds. */
export function templateFontsHref(t) {
  return `https://fonts.googleapis.com/css2?${t.type.googleFamilies.map((f) => `family=${f}`).join('&')}&display=swap`;
}

/**
 * The block of law the builder receives when a template has been chosen. It
 * replaces the builder's own style choice: the template is decided, the tier
 * decides the bones, and the builder's job is to execute it for THIS business.
 */
export function siteTemplateDirective(key) {
  const t = siteTemplate(key);
  if (!t) return '';
  return `THE TEMPLATE IS CHOSEN: ${t.name.toUpperCase()} (key ${t.key}). Sarah's picker or the studio's rotation selected it before this build started, so DO NOT choose a style yourself, do not blend it with another house style, and do not swap its palette or type for one you prefer. Your job is to execute this system so well for THIS business that it looks made for them alone. The design tier (the bones of the page: world or journey) still applies; this template is the skin, the type, the devices and the register those bones wear. Where the tier's skeleton and the template's skeleton name different sections, keep the tier's structural organs (the wordmark hero, the chapters, the counter band, the proof, the FAQ, the booking) and dress them in the template's sections and devices.

${t.law}

THEIR COLOURS, NOT OURS (Sarah, 2026-08-24: "we need to brand websites to their colors, not our own random ones, and they shouldn't be set"). The hexes above are DEFAULTS for the template's colour ROLES: ground, paper, ink, accent, support. The brief's THEIR BRAND section carries the logo and colour captured off their own website, and the mined evidence may show more (trucks, signage, uniforms, a current site). When the business has established colours, they FILL the roles: their primary is the accent, the ground and the ink take its temperature, and a template default survives only for a role their brand does not cover. A business with no established colour gets the template palette as written. Either way keep this template's contrast relationships (a dark-ground template stays dark, a paper template stays paper), keep the accent to one hot object per screen where the law says so, and pass WCAG AA on every text pair. Declare the final hexes and their roles in the top-of-file comment and in the mms-palette meta.

FONTS. Load exactly these three families from Google Fonts and use all three visibly: ${t.type.display} (display), ${t.type.body} (body), ${t.type.third} (${t.type.thirdRole}).
<link href="${templateFontsHref(t)}" rel="stylesheet">

EVERY TEMPLATE STILL CARRIES: ${SHARED_DEVICES.join('; ')}. These are measured by the judge, not requested.

Record the template in the top-of-file HTML comment ("template: ${t.key}") and in RESULT.json as "template": "${t.key}".`;
}

/**
 * The rotation law the builder reads when NOTHING chose a template (older rows,
 * a brief written before the picker existed). Lists every template so the
 * builder picks from the real roster instead of a stale list of six.
 */
export function templateRosterLaw() {
  const lines = SITE_TEMPLATES.map(
    (t, i) => `  ${i + 1}. ${t.name.toUpperCase()} (${t.key}) ground ${t.palette.ground}, accent ${t.palette.accent}, ${t.type.display} + ${t.type.body} + ${t.type.third}. For ${t.alsoFits}.`,
  );
  return `THE TEMPLATES, AND ROTATING BETWEEN THEM. ${SITE_TEMPLATES.length} visual systems are worked out in lib/site-templates.mjs, each with its palette, type pairing, skeleton and devices. When BRIEF.md carries a "${TEMPLATE_LINE} <key>" line, that template is already chosen and its law is at the top of this directive. When it does not, PICK ONE from this roster by what is true about the business, and never invent another or blend two:
${lines.join('\n')}
Never put the same template on two businesses in the same trade in the same town. Record your pick in RESULT.json as "template": "<key>".`;
}
