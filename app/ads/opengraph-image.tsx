import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The MUSTARD BROADCAST share card: the promise, on air.
export const runtime = 'nodejs';

export const alt = 'MUSTARD BROADCAST. We make the commercial. We run the ads. You answer the phone.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const RED = '#E0301E';

export default async function OpengraphImage() {
  const mascot = readFileSync(join(process.cwd(), 'public/brand/mascot.png'));
  const mascotSrc = `data:image/png;base64,${mascot.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: INK,
          border: `14px solid ${MUSTARD}`,
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 70px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', width: 16, height: 16, borderRadius: 999, background: RED }} />
            <div style={{ display: 'flex', color: MUSTARD, fontSize: 26, letterSpacing: 10, fontWeight: 700 }}>MUSTARD BROADCAST · ON AIR</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', color: CREAM, fontSize: 74, fontWeight: 800, lineHeight: 1.08, marginTop: 28 }}>
            <div style={{ display: 'flex' }}>We make the commercial.</div>
            <div style={{ display: 'flex' }}>We run the ads.</div>
            <div style={{ display: 'flex', color: MUSTARD }}>You answer the phone.</div>
          </div>
          <div style={{ display: 'flex', color: `${CREAM}B3`, fontSize: 28, marginTop: 26 }}>
            Managed Facebook, Instagram, and Google ads · from $297/mo
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mascotSrc}
          alt=""
          width={230}
          height={230}
          style={{ position: 'absolute', right: 34, bottom: 20, transform: 'rotate(-6deg)' }}
        />
      </div>
    ),
    { ...size }
  );
}
