import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Graffiti Couture link-preview card: Mr. Mustard in his gold puffer on
 * the dripping wall (pre-rendered in public/brand/og-plate-graffiti.jpg), the
 * name in Anton with Seed in marker, one line saying what the page is, and
 * the address on tape. Pages that want their own preview call this with their
 * line, so every shared link looks like the same studio.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const INK = '#0d0d0d';
const YELLOW = '#ffd400';
const RED = '#ff3b2f';

export function mustardCard(line: string, path = ''): ImageResponse {
  const read = (p: string) => readFileSync(join(process.cwd(), p));
  const plateSrc = `data:image/jpeg;base64,${read('public/brand/og-plate-graffiti.jpg').toString('base64')}`;
  const anton = read('public/fonts/Anton-Regular.ttf');
  const marker = read('public/fonts/PermanentMarker-Regular.ttf');
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Anton', color: INK, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={plateSrc} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        <div style={{ position: 'absolute', left: 58, top: 44, display: 'flex', flexDirection: 'column', width: 600 }}>
          <div style={{ display: 'flex', alignSelf: 'flex-start', padding: '6px 16px', background: YELLOW, fontSize: 20, letterSpacing: 1, transform: 'rotate(-2deg)' }}>DESIGN &amp; AGENTIC SYSTEMS STUDIO</div>
          <div style={{ display: 'flex', marginTop: 18, fontSize: 104, lineHeight: 0.94 }}>MODERN</div>
          <div style={{ display: 'flex', fontSize: 104, lineHeight: 0.94 }}>MUSTARD</div>
          <div style={{ display: 'flex', marginTop: -6, fontFamily: 'Permanent Marker', fontSize: 104, lineHeight: 1.1, color: RED, textShadow: `5px 5px 0 ${YELLOW}`, transform: 'rotate(-5deg)' }}>Seed</div>
          <div style={{ display: 'flex', marginTop: 14, fontSize: 32, lineHeight: 1.1, textTransform: 'uppercase' }}>{line}</div>
          <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 18, padding: '6px 16px', background: INK, color: YELLOW, fontSize: 22, letterSpacing: 1, textTransform: 'uppercase', transform: 'rotate(-1.5deg)' }}>
            {`modernmustardseed.com${path}`}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Anton', data: anton, weight: 400, style: 'normal' },
        { name: 'Permanent Marker', data: marker, weight: 400, style: 'normal' },
      ],
    },
  );
}
