import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The pop-art link-preview card (the one Sarah loves on the homepage): Mr.
 * Mustard waving over the wordmark, one line saying what the page is, and the
 * address. Pages that want their own preview call this with their line, so every
 * shared link looks like the same studio.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';

export function mustardCard(line: string, path = ''): ImageResponse {
  const logo = readFileSync(join(process.cwd(), 'public/brand/logo-lockup.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  // The homepage hero's ground, pre-rendered: cream, mustard glow, sunburst
  // rays, halftone edges and the ink frame. Satori cannot draw conic rays.
  const plate = readFileSync(join(process.cwd(), 'public/brand/og-plate.jpg'));
  const plateSrc = `data:image/jpeg;base64,${plate.toString('base64')}`;
  const bold = readFileSync(join(process.cwd(), 'public/fonts/DMSans-ExtraBold.ttf'));
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', fontFamily: 'DM Sans', background: CREAM, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={plateSrc} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={322} height={352} alt="" style={{ marginTop: 22, filter: 'drop-shadow(8px 10px 0 rgba(22,22,22,0.13))' }} />
        <div style={{ display: 'flex', marginTop: 18, padding: '0 60px', fontSize: 40, fontWeight: 800, letterSpacing: -1.2, color: INK, textAlign: 'center' }}>{line}</div>
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', background: INK, color: MUSTARD, fontSize: 15, fontWeight: 700, letterSpacing: 2.2, textTransform: 'uppercase' }}>
          {`modernmustardseed.com${path}`}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: 'DM Sans', data: bold, weight: 800, style: 'normal' }] },
  );
}
