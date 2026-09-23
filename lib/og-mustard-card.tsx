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
const RED = '#E0301E';

export function mustardCard(line: string, path = ''): ImageResponse {
  const logo = readFileSync(join(process.cwd(), 'public/brand/logo-lockup.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', fontFamily: 'sans-serif', background: CREAM, border: `14px solid ${INK}`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, width: 820, height: 820, display: 'flex', background: 'radial-gradient(circle, rgba(245,183,0,0.45) 0%, rgba(245,183,0,0.16) 40%, rgba(245,183,0,0) 66%)' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={377} height={410} alt="" style={{ filter: 'drop-shadow(8px 8px 0 rgba(22,22,22,0.16))' }} />
        <div style={{ display: 'flex', marginTop: 24, fontSize: 36, fontWeight: 800, letterSpacing: -0.5, color: INK, textAlign: 'center' }}>{line}</div>
        <div style={{ position: 'absolute', bottom: 28, display: 'flex', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: RED, letterSpacing: 6, textTransform: 'uppercase' }}>
          {`modernmustardseed.com${path}`}
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
