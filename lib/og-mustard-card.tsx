import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Riviera link-preview card: the beach under the Tiffany umbrellas
 * (pre-rendered, sand haze on the left, in public/brand/og-plate-riviera.jpg),
 * the name in Unbounded Bold with Seed in a lighter weight, one line saying
 * what the page is in Figtree italic, and the address on a deep-sea pill. Pages that want their own
 * preview call this with their line, so every shared link looks like the
 * same studio.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const SEA = '#0b3b44';
const LAGOON = '#0a7c78';
const MUSTARD = '#f5b700';

export function mustardCard(line: string, path = ''): ImageResponse {
  const read = (p: string) => readFileSync(join(process.cwd(), p));
  const plateSrc = `data:image/jpeg;base64,${read('public/brand/og-plate-riviera.jpg').toString('base64')}`;
  const display = read('public/fonts/Unbounded-Bold.ttf');
  const displayLight = read('public/fonts/Unbounded-Regular.ttf');
  const sans = read('public/fonts/Figtree-SemiBold.ttf');
  const sansItalic = read('public/fonts/Figtree-MediumItalic.ttf');
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Unbounded', color: SEA, overflow: 'hidden', background: '#fbf5ea' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={plateSrc} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        <div style={{ position: 'absolute', left: 64, top: 64, display: 'flex', flexDirection: 'column', width: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Figtree', fontSize: 20, letterSpacing: 4, color: LAGOON }}>
            <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 7, background: MUSTARD, marginRight: 14 }} />
            DESIGN &amp; AGENTIC SYSTEMS STUDIO
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 70, lineHeight: 1, letterSpacing: -3 }}>Modern Mustard</div>
          <div style={{ display: 'flex', fontFamily: 'Unbounded Light', fontSize: 92, lineHeight: 1.05, letterSpacing: -4, color: LAGOON }}>Seed</div>
          <div style={{ display: 'flex', marginTop: 18, fontFamily: 'Figtree Italic', fontSize: 38, lineHeight: 1.2 }}>{line}</div>
          <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 28, padding: '12px 24px', borderRadius: 999, background: SEA, color: '#ffffff', fontFamily: 'Figtree', fontSize: 22, letterSpacing: 1 }}>
            {`modernmustardseed.com${path}`}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Unbounded', data: display, weight: 700, style: 'normal' },
        { name: 'Unbounded Light', data: displayLight, weight: 400, style: 'normal' },
        { name: 'Figtree', data: sans, weight: 600, style: 'normal' },
        { name: 'Figtree Italic', data: sansItalic, weight: 500, style: 'normal' },
      ],
    },
  );
}
