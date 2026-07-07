import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Sidekick Forge share card: the nameplate badge with the trainer.
export const runtime = 'nodejs';

export const alt = 'The Sidekick Forge. Hear your own AI receptionist in 60 seconds. Free, from Modern Mustard Seed.';
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
            opacity: 0.45,
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
              border: `3px solid ${INK}`,
              alignSelf: 'flex-start',
              letterSpacing: 3,
            }}
          >
            [ THE SIDEKICK FORGE ]
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34 }}>
            <span style={{ fontSize: 76, fontWeight: 800, fontStyle: 'italic', color: INK, lineHeight: 1.02 }}>
              Hear YOUR AI
            </span>
            <span style={{ fontSize: 76, fontWeight: 800, fontStyle: 'italic', color: INK, lineHeight: 1.12 }}>
              receptionist in
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', fontSize: 76, fontWeight: 800, lineHeight: 1.15 }}>
              <span style={{ color: INK, background: MUSTARD, padding: '0 16px', border: `4px solid ${INK}` }}>60 seconds.</span>
            </span>
          </div>
          <span style={{ fontSize: 27, color: '#4a4a4a', marginTop: 30, lineHeight: 1.4 }}>
            Mr. Mustard trains him on YOUR business, then he talks to you. Live. Free.
          </span>
          <span style={{ fontSize: 22, color: INK, fontWeight: 700, marginTop: 22, letterSpacing: 1 }}>
            modernmustardseed.com/sidekick
          </span>
        </div>

        {/* Right: the trainer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              background: '#fff',
              border: `5px solid ${INK}`,
              borderRadius: 28,
              padding: 22,
              boxShadow: `14px 14px 0 ${INK}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mascotSrc} alt="" width={280} height={280} style={{ borderRadius: 16 }} />
          </div>
          <div
            style={{
              display: 'flex',
              background: INK,
              color: MUSTARD,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 3,
              padding: '10px 20px',
              marginTop: -20,
              border: `4px solid ${MUSTARD}`,
            }}
          >
            THE TRAINER
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
