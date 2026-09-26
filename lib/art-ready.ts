import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ART_STYLES, type ArtStyleId } from './art-styles';

/**
 * The styles whose painted scene is actually in public/, checked at build.
 * The dial, the head script and the hero all take this list, so a style
 * with no art can never be chosen, restored, or rendered.
 */
export function readyArtStyles(): ArtStyleId[] {
  return ART_STYLES.filter((s) => {
    if (!s.scene) return false;
    const base = join(process.cwd(), 'public', s.scene.replace(/^\//, ''));
    return ['-960.avif', '-1600.avif', '-960.webp', '-1600.webp'].every((ext) => existsSync(base + ext));
  }).map((s) => s.id);
}
