import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The MUSTARD PRESS share card: the pressman's counter.
export const runtime = 'nodejs';

export const alt = 'MUSTARD PRESS. Your menu or price list, beautifully typeset in 60 seconds. Free proof.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const GOLD = '#B8860B';
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
          fontFamily: 'serif',
        }}
      >
        {/* Left: the typeset tease */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px', width: 760, fontFamily: 'sans-serif' }}>
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
            [ MUSTARD PRESS ]
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34 }}>
            <span style={{ fontSize: 72, fontWeight: 800, fontStyle: 'italic', color: INK, lineHeight: 1.05 }}>
              Your prices,
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', fontSize: 72, fontWeight: 800, lineHeight: 1.2 }}>
              <span style={{ color: INK, background: MUSTARD, padding: '0 16px', border: `4px solid ${INK}` }}>typeset like they matter.</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30, gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: 540 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: INK }}>Huckleberry Pancakes</span>
              <span style={{ flex: 1, borderBottom: `3px dashed ${GOLD}`, margin: '0 10px' }} />
              <span style={{ fontSize: 24, fontWeight: 700, color: INK }}>$9.50</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', width: 540 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: INK }}>Water Heater Install</span>
              <span style={{ flex: 1, borderBottom: `3px dashed ${GOLD}`, margin: '0 10px' }} />
              <span style={{ fontSize: 24, fontWeight: 700, color: INK }}>from $1450</span>
            </div>
          </div>
          <span style={{ fontSize: 26, color: '#4a4a4a', marginTop: 28 }}>
            Paste your list. Free typeset proof in 60 seconds. Print-ready file, $97.
          </span>
          <span style={{ fontSize: 22, color: INK, fontWeight: 700, marginTop: 18, letterSpacing: 1 }}>
            modernmustardseed.com/press
          </span>
        </div>

        {/* Right: the pressman */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
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
            <img src={mascotSrc} alt="" width={260} height={260} style={{ borderRadius: 16 }} />
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
              fontFamily: 'sans-serif',
            }}
          >
            THE PRESSMAN
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
