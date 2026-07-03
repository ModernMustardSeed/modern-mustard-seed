import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The MUSTARD MODE share card: the 100x terminal frame with the mascot.
export const runtime = 'nodejs';

export const alt = 'MUSTARD MODE. One seed, 100x the output. Learn Claude with your own AI coach.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const MIDNIGHT = '#080C16';

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
          background: CREAM,
          border: `14px solid ${INK}`,
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Halftone field */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: `radial-gradient(circle, ${MUSTARD} 3px, transparent 3.5px)`,
            backgroundSize: '26px 26px',
            opacity: 0.5,
          }}
        />

        {/* Left: copy */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px', width: 740 }}>
          <div
            style={{
              display: 'flex',
              background: MIDNIGHT,
              color: '#FFDD55',
              fontSize: 26,
              fontWeight: 700,
              padding: '10px 18px',
              border: `3px solid ${INK}`,
              alignSelf: 'flex-start',
              letterSpacing: 2,
            }}
          >
            [ MUSTARD MODE: ON ]
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34 }}>
            <span style={{ fontSize: 84, fontWeight: 800, fontStyle: 'italic', color: INK, lineHeight: 1 }}>One seed.</span>
            <span style={{ display: 'flex', alignItems: 'baseline', fontSize: 84, fontWeight: 800, fontStyle: 'italic', color: INK, lineHeight: 1.1 }}>
              <span
                style={{
                  color: MUSTARD,
                  fontStyle: 'normal',
                  fontWeight: 800,
                  marginRight: 20,
                  textShadow: `4px 4px 0 ${INK}`,
                }}
              >
                100x
              </span>
              <span>the output.</span>
            </span>
          </div>
          <span style={{ fontSize: 28, color: '#3a3733', marginTop: 30, lineHeight: 1.4 }}>
            Your own AI coach. Four tracks. 28 missions. Nothing but your Claude subscription.
          </span>
          <span style={{ fontSize: 22, color: '#E0301E', fontWeight: 700, marginTop: 26, letterSpacing: 3 }}>
            MODERNMUSTARDSEED.COM/MUSTARD-MODE
          </span>
        </div>

        {/* Right: mascot on midnight terminal card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            right: -30,
            top: 90,
            width: 440,
            height: 450,
            background: MIDNIGHT,
            border: `4px solid ${INK}`,
            boxShadow: `12px 12px 0 ${INK}`,
            transform: 'rotate(-3deg)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mascotSrc} width={330} height={330} alt="" style={{ objectFit: 'contain' }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
