/**
 * THE ARTIST DIAL (Sarah, 2026-09-25): turn the dial and the site comes alive
 * in another master's hand. Pop art is home; Leonardo is second on the dial. Cathedral was cut (Sarah,
 * 2026-09-26). Credits say "Inspired by", never "After".
 *
 * This is the one registry. The dial reads it, the homepage hero reads it, and
 * app/art-styles.css keys its palettes off the same ids through
 * <html data-art="...">. A style is only offered once its scene exists, so the
 * dial never shows a turn that lands on nothing.
 */

export type ArtStyleId = 'pop' | 'davinci' | 'monet' | 'vangogh' | 'adams' | 'graffiti';

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
  { id: 'davinci', name: 'Leonardo', credit: 'Inspired by Leonardo da Vinci', line: 'Every build begins as a study.', scene: '/art/dial/davinci', dark: false },
  { id: 'monet', name: 'Monet', credit: 'Inspired by Claude Monet', line: 'Websites that feel like light on water.', scene: '/art/dial/monet', dark: false },
  { id: 'vangogh', name: 'Van Gogh', credit: 'Inspired by Vincent van Gogh', line: 'Software with a pulse you can feel.', scene: '/art/dial/vangogh', dark: true },
  { id: 'adams', name: 'Ansel Adams', credit: 'Inspired by Ansel Adams', line: 'Clarity, in every tone between black and white.', scene: '/art/dial/adams', dark: true },
  { id: 'graffiti', name: 'Graffiti Couture', credit: 'Inspired by street art and the runway', line: 'Loud where it counts. Tailored everywhere else.', scene: '/art/dial/graffiti', dark: false },
];

export const DEFAULT_ART: ArtStyleId = 'pop';
export const ART_STORAGE_KEY = 'mms-art';

export function artStyle(id: string | null | undefined): ArtStyle {
  return ART_STYLES.find((s) => s.id === id) ?? ART_STYLES[0];
}
