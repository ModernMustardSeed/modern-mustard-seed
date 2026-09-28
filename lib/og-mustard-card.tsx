import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Riviera link-preview card: the beach under the Tiffany umbrellas
 * (pre-rendered, sand haze on the left, in public/brand/og-plate-riviera.jpg),
 * the name in Bodoni Moda with Seed in the italic, one line saying what the
 * page is, and the address on a deep-sea pill. Pages that want their own
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
  const bodoni = read('public/fonts/BodoniModa-Medium.ttf');
  const bodoniItalic = read('public/fonts/BodoniModa-Italic.ttf');
  const sans = read('public/fonts/InstrumentSans-SemiBold.ttf');
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Bodoni Moda', color: SEA, overflow: 'hidden', background: '#fbf5ea' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={plateSrc} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        <div style={{ position: 'absolute', left: 64, top: 64, display: 'flex', flexDirection: 'column', width: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Instrument Sans', fontSize: 19, letterSpacing: 4, color: LAGOON }}>
            <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 7, background: MUSTARD, marginRight: 14 }} />
            DESIGN &amp; AGENTIC SYSTEMS STUDIO
          </div>
          <div style={{ display: 'flex', marginTop: 20, fontSize: 104, lineHeight: 0.9, letterSpacing: -4 }}>Modern Mustard</div>
          <div style={{ display: 'flex', fontFamily: 'Bodoni Moda Italic', fontSize: 124, lineHeight: 1, letterSpacing: -4, color: LAGOON }}>Seed</div>
          <div style={{ display: 'flex', marginTop: 16, fontFamily: 'Bodoni Moda Italic', fontSize: 40, lineHeight: 1.15, letterSpacing: -1 }}>{line}</div>
          <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 28, padding: '12px 24px', borderRadius: 999, background: SEA, color: '#ffffff', fontFamily: 'Instrument Sans', fontSize: 21, letterSpacing: 1 }}>
            {`modernmustardseed.com${path}`}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Bodoni Moda', data: bodoni, weight: 500, style: 'normal' },
        { name: 'Bodoni Moda Italic', data: bodoniItalic, weight: 400, style: 'normal' },
        { name: 'Instrument Sans', data: sans, weight: 600, style: 'normal' },
      ],
    },
  );
}
