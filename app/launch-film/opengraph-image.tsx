import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXAMPLE_FILM } from '@/data/launch-film';

// The Launch Film share card: a frame of the example film in a mustard frame.
export const runtime = 'nodejs';

export const alt = 'The Launch Film by Modern Mustard Seed. A product launch film built from the real product, scored from scratch.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const RED = '#E0301E';

export default async function OpengraphImage() {
  const poster = readFileSync(join(process.cwd(), 'public', EXAMPLE_FILM.wide.poster.replace(/^\//, '')));
  const posterSrc = `data:image/jpeg;base64,${poster.toString('base64')}`;

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
            backgroundImage: `radial-gradient(circle, ${INK} 2px, transparent 2.5px)`,
            backgroundSize: '28px 28px',
            opacity: 0.08,
          }}
        />

        {/* Left: the words */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 48px 56px 64px', width: 600 }}>
          <div
            style={{
              display: 'flex',
              background: RED,
              color: CREAM,
              fontSize: 22,
              fontWeight: 700,
              padding: '8px 16px',
              border: `3px solid ${INK}`,
              alignSelf: 'flex-start',
              letterSpacing: 4,
            }}
          >
            THE LAUNCH FILM
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', color: INK, fontSize: 64, fontWeight: 900, lineHeight: 1.02, marginTop: 28, letterSpacing: -2 }}>
            <span>The film your</span>
            <span>launch deserves.</span>
          </div>
          <div style={{ display: 'flex', color: INK, fontSize: 26, marginTop: 26, lineHeight: 1.3, opacity: 0.8 }}>
            Built from the real product. Scored from scratch. Three formats, ten business days.
          </div>
          <div style={{ display: 'flex', color: INK, fontSize: 20, marginTop: 30, letterSpacing: 3, fontWeight: 700, opacity: 0.7 }}>
            MODERNMUSTARDSEED.COM/LAUNCH-FILM
          </div>
        </div>

        {/* Right: a frame of the film in a sticker frame */}
        <div style={{ display: 'flex', position: 'absolute', right: 56, top: 92, width: 500, height: 446, alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              width: 500,
              height: 281,
              border: `4px solid ${INK}`,
              boxShadow: `12px 12px 0 0 ${MUSTARD}, 12px 12px 0 4px ${INK}`,
              overflow: 'hidden',
              background: INK,
              transform: 'rotate(-2deg)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterSrc} width={500} height={281} style={{ objectFit: 'cover' }} alt="" />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
