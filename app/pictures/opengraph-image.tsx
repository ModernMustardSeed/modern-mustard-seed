import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The MUSTARD PICTURES share card: the marquee with the director.
export const runtime = 'nodejs';

export const alt = 'MUSTARD PICTURES. A commercial for your business, directed by Mr. Mustard. Free screen test.';
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
        {/* Marquee dots */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: `radial-gradient(circle, ${MUSTARD} 2.5px, transparent 3px)`,
            backgroundSize: '30px 30px',
            opacity: 0.18,
          }}
        />

        {/* Left: copy */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px', width: 760 }}>
          <div
            style={{
              display: 'flex',
              background: RED,
              color: CREAM,
              fontSize: 24,
              fontWeight: 700,
              padding: '10px 18px',
              border: `3px solid ${CREAM}`,
              alignSelf: 'flex-start',
              letterSpacing: 3,
            }}
          >
            [ A MUSTARD PICTURES PRODUCTION ]
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34 }}>
            <span style={{ fontSize: 74, fontWeight: 800, fontStyle: 'italic', color: CREAM, lineHeight: 1.05 }}>
              A commercial for
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', fontSize: 74, fontWeight: 800, lineHeight: 1.2 }}>
              <span style={{ color: INK, background: MUSTARD, padding: '0 16px', border: `4px solid ${CREAM}` }}>YOUR business.</span>
            </span>
          </div>
          <span style={{ fontSize: 28, color: `${CREAM}CC`, marginTop: 30, lineHeight: 1.4 }}>
            Free screen test: storyboard, taglines, and your hero frame in 60 seconds.
          </span>
          <span style={{ fontSize: 22, color: MUSTARD, fontWeight: 700, marginTop: 22, letterSpacing: 1 }}>
            modernmustardseed.com/pictures
          </span>
        </div>

        {/* Right: the director */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              background: CREAM,
              border: `5px solid ${MUSTARD}`,
              borderRadius: 28,
              padding: 22,
              boxShadow: `14px 14px 0 ${MUSTARD}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mascotSrc} alt="" width={280} height={280} style={{ borderRadius: 16 }} />
          </div>
          <div
            style={{
              display: 'flex',
              background: MUSTARD,
              color: INK,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 3,
              padding: '10px 20px',
              marginTop: -20,
              border: `4px solid ${INK}`,
            }}
          >
            THE DIRECTOR
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
