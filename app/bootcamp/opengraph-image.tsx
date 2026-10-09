import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOOTCAMP } from '@/data/bootcamp';

/**
 * The bootcamp share card, studio edition (2026-10-09): the same system as the
 * homepage card, with Sarah at her desk among the seed crew from the bootcamp
 * film. Rendered once to public/brand/bootcamp-share-studio.jpg; this route
 * serves it, so the card never depends on a font fetch. No price on the card,
 * so a price change never leaves a stale share image behind.
 */
export const runtime = 'nodejs';

export const alt = `${BOOTCAMP.name}: run your business on a crew of agents. Three live sessions, February 2, 4 and 9, 2027, with Sarah Scarano of Modern Mustard Seed.`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const card = readFileSync(join(process.cwd(), 'public', 'brand', 'bootcamp-share-studio.jpg'));
  const src = `data:image/jpeg;base64,${card.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={1200} height={630} alt="" />
      </div>
    ),
    { ...size }
  );
}
