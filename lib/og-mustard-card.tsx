import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Mustard Building link-preview card: the penthouse office at night
 * (pre-rendered, lacquered on the left, in public/brand/og-plate-office.jpg),
 * the name in Limelight with Seed in gold leaf, one line in Playfair italic
 * saying what the page is, and the address on a brass plate, all inside a
 * gold hairline frame. Pages that want their own preview call this with their
 * line, so every shared link looks like the same studio.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const INK = '#14110c';
const IVORY = '#f6efe0';
const GOLD = '#f5b700';
const CHAMPAGNE = '#f3dc9b';

export function mustardCard(line: string, path = ''): ImageResponse {
  const read = (p: string) => readFileSync(join(process.cwd(), p));
  const plateSrc = `data:image/jpeg;base64,${read('public/brand/og-plate-office.jpg').toString('base64')}`;
  const limelight = read('public/fonts/Limelight-Regular.ttf');
  const josefin = read('public/fonts/JosefinSans-SemiBold.ttf');
  const playfair = read('public/fonts/PlayfairDisplay-MediumItalic.ttf');
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Limelight', color: IVORY, overflow: 'hidden', background: INK }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={plateSrc} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, display: 'flex', border: `1px solid ${GOLD}99` }} />
        <div style={{ position: 'absolute', left: 64, top: 58, display: 'flex', flexDirection: 'column', width: 620 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Josefin Sans', fontSize: 19, letterSpacing: 5, color: CHAMPAGNE }}>
            <div style={{ display: 'flex', width: 12, height: 12, background: GOLD, transform: 'rotate(45deg)', marginRight: 16 }} />
            DESIGN &amp; AGENTIC SYSTEMS STUDIO
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 92, lineHeight: 1 }}>Modern Mustard</div>
          <div style={{ display: 'flex', fontSize: 112, lineHeight: 1.02, color: GOLD }}>Seed</div>
          <div style={{ display: 'flex', marginTop: 14, fontFamily: 'Playfair Display', fontStyle: 'italic', fontSize: 38, lineHeight: 1.15, color: GOLD }}>{line}</div>
          <div style={{ display: 'flex', width: 150, height: 6, marginTop: 20, borderTop: `1px solid ${GOLD}`, borderBottom: `1px solid ${GOLD}` }} />
          <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 22, padding: '10px 18px 8px', background: GOLD, color: INK, fontFamily: 'Josefin Sans', fontSize: 20, letterSpacing: 3, textTransform: 'uppercase' }}>
            {`modernmustardseed.com${path}`}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Limelight', data: limelight, weight: 400, style: 'normal' },
        { name: 'Josefin Sans', data: josefin, weight: 600, style: 'normal' },
        { name: 'Playfair Display', data: playfair, weight: 500, style: 'italic' },
      ],
    },
  );
}
