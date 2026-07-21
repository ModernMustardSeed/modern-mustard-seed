import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Celebrate share card: confetti pop-art with the mascot leading the parade.
export const runtime = 'nodejs';

export const alt = 'Celebrate. Real cakes, fresh flowers, and handwritten cards on autopilot, from local shops. A Modern Mustard Seed service.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const RED = '#E0301E';
const BLUE = '#1E50C8';
const CONFETTI = [MUSTARD, '#FFDD55', RED, BLUE, '#FFFFFF'];

export default async function OpengraphImage() {
  const mascot = readFileSync(join(process.cwd(), 'public/brand/mascot.png'));
  const mascotSrc = `data:image/png;base64,${mascot.toString('base64')}`;

  // Deterministic confetti sprinkle.
  let s = 11 * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pieces = Array.from({ length: 42 }, (_, i) => ({
    left: rnd() * 1160,
    top: rnd() * 590,
    w: 8 + Math.round(rnd() * 10),
    h: 6 + Math.round(rnd() * 8),
    rot: Math.round(rnd() * 360),
    color: CONFETTI[i % CONFETTI.length],
  }));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: MUSTARD,
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
            backgroundImage: `radial-gradient(circle, ${INK} 3px, transparent 3.5px)`,
            backgroundSize: '26px 26px',
            opacity: 0.12,
          }}
        />
        {/* Confetti */}
        {pieces.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              width: p.w,
              height: p.h,
              background: p.color,
              transform: `rotate(${p.rot}deg)`,
              borderRadius: 2,
              display: 'flex',
            }}
          />
        ))}

        {/* Left: copy */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px', width: 780 }}>
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
            A MODERN MUSTARD SEED SERVICE
          </div>
          <div style={{ display: 'flex', color: INK, fontSize: 108, fontWeight: 800, letterSpacing: -2, marginTop: 28 }}>
            CELEBRATE
          </div>
          <div style={{ display: 'flex', color: INK, fontSize: 34, fontWeight: 700, marginTop: 12, lineHeight: 1.25 }}>
            Real cakes, fresh flowers, handwritten cards. On autopilot, from local shops.
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 30,
              background: BLUE,
              color: CREAM,
              fontSize: 26,
              fontWeight: 700,
              padding: '14px 26px',
              borderRadius: 999,
              border: `3px solid ${INK}`,
              alignSelf: 'flex-start',
            }}
          >
            Nobody you love goes uncelebrated.
          </div>
        </div>

        {/* Right: the mascot */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', flex: 1, paddingBottom: 30 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mascotSrc} alt="" width={330} height={452} />
        </div>
      </div>
    ),
    size
  );
}
