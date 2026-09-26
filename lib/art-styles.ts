/**
 * THE ARTIST DIAL (Sarah, 2026-09-25): turn the dial and the site comes alive
 * in another master's hand. Pop art is home; Leonardo is second on the dial.
 *
 * This is the one registry. The dial reads it, the homepage hero reads it, and
 * app/art-styles.css keys its palettes off the same ids through
 * <html data-art="...">. A style is only offered once its scene exists, so the
 * dial never shows a turn that lands on nothing.
 */

export type ArtStyleId = 'pop' | 'davinci' | 'monet' | 'vangogh' | 'adams' | 'cathedral' | 'graffiti';

export type ArtStyle = {
  id: ArtStyleId;
  /** On the dial. */
  name: string;
  /** Under the name: whose hand this is, stated as homage. */
  credit: string;
  /** The line the hero speaks in this style. */
  line: string;
  /** The hero scene, without extension; served as .avif and .webp at 960 and 1600 wide. */
  scene?: string;
  /** Dark ground: the hero sets cream type over it. */
  dark: boolean;
};

export const ART_STYLES: ArtStyle[] = [
  { id: 'pop', name: 'Pop Art', credit: 'The house style', line: 'Websites, custom software, and agentic systems.', dark: false },
  { id: 'davinci', name: 'Leonardo', credit: 'After Leonardo da Vinci', line: 'Every build begins as a study.', scene: '/art/dial/davinci', dark: false },
  { id: 'monet', name: 'Monet', credit: 'After Claude Monet', line: 'Websites that feel like light on water.', scene: '/art/dial/monet', dark: false },
  { id: 'vangogh', name: 'Van Gogh', credit: 'After Vincent van Gogh', line: 'Software with a pulse you can feel.', scene: '/art/dial/vangogh', dark: true },
  { id: 'adams', name: 'Ansel Adams', credit: 'After Ansel Adams', line: 'Clarity, in every tone between black and white.', scene: '/art/dial/adams', dark: true },
  { id: 'cathedral', name: 'Cathedral', credit: 'After the stained-glass masters', line: 'Built to let the light through.', scene: '/art/dial/cathedral', dark: false },
  { id: 'graffiti', name: 'Graffiti Couture', credit: 'After the street, dressed for the runway', line: 'Loud where it counts. Tailored everywhere else.', scene: '/art/dial/graffiti', dark: false },
];

export const DEFAULT_ART: ArtStyleId = 'pop';
export const ART_STORAGE_KEY = 'mms-art';

export function artStyle(id: string | null | undefined): ArtStyle {
  return ART_STYLES.find((s) => s.id === id) ?? ART_STYLES[0];
}
