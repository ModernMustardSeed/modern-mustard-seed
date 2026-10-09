import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '@/lib/seo';

// Node runtime so we can embed the share card from /public.
export const runtime = 'nodejs';

export const alt =
  'Modern Mustard Seed: We build websites, AI voice agents and custom software. Sarah and Anthony in the studio with the mustard seed crew.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The homepage share card: the studio edition card rendered once as a JPG
 * (public/brand/mms-share-studio.jpg, the same file SITE.ogImage points at),
 * so every share of the root shows the same card.
 */
export default async function OpengraphImage() {
  const card = readFileSync(join(process.cwd(), 'public', SITE.ogImage.replace(/^\//, '')));
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
