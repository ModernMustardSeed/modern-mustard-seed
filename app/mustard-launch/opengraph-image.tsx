import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The MUSTARD LAUNCH share card: the launch console, mission-control themed.
export const runtime = 'nodejs';

export const alt = 'Mustard Launch. Your AI launch coach, from idea to open. Type your idea and get a personalized launch plan free.';
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

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px', width: 740 }}>
          <div
            style={{
              display: 'flex',
              background: MIDNIGHT,
              color: '#FFDD55',
              fontSize: 24,
              fontWeight: 700,
              padding: '10px 18px',
              border: `3px solid ${INK}`,
              alignSelf: 'flex-start',
              letterSpacing: 2,
            }}
          >
            [ CLEARED FOR IGNITION ]
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30 }}>
            <span style={{ fontSize: 78, fontWeight: 800, color: INK, lineHeight: 1 }}>Your launch,</span>
            <span style={{ display: 'flex', fontSize: 78, fontWeight: 800, fontStyle: 'italic', color: MUSTARD, lineHeight: 1.1, textShadow: `4px 4px 0 ${INK}` }}>
              on the pad.
            </span>
          </div>
          <span style={{ fontSize: 27, color: '#3a3733', marginTop: 28, lineHeight: 1.4 }}>
            Type your idea. Mr. Mustard builds your whole launch and counts you down to open. The Blueprint is free.
          </span>
          <span style={{ fontSize: 21, color: '#E0301E', fontWeight: 700, marginTop: 24, letterSpacing: 3 }}>
            MODERNMUSTARDSEED.COM/MUSTARD-LAUNCH
          </span>
        </div>

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
