import { ImageResponse } from 'next/og';

// The BRAND / REBRAND share card: the claim, the three surfaces, the price of entry.
export const runtime = 'nodejs';

export const alt = 'BRAND / REBRAND by Modern Mustard Seed. Logo, website, voice agent, and business plan in three weeks. Set prices.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const RED = '#E0301E';

export default async function OpengraphImage() {
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

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px', width: 780 }}>
          <div
            style={{
              display: 'flex',
              background: RED,
              color: CREAM,
              fontSize: 22,
              fontWeight: 700,
              padding: '10px 18px',
              border: `3px solid ${INK}`,
              alignSelf: 'flex-start',
              letterSpacing: 4,
            }}
          >
            BRAND / REBRAND
          </div>
          <span style={{ fontSize: 78, fontWeight: 800, color: INK, lineHeight: 1.02, marginTop: 30 }}>A logo file is</span>
          <span style={{ display: 'flex', alignItems: 'baseline', fontSize: 78, fontWeight: 800, lineHeight: 1.2 }}>
            <span style={{ color: INK, background: MUSTARD, padding: '0 16px', border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}>
              not a brand.
            </span>
          </span>
          <span style={{ fontSize: 26, color: `${INK}B3`, marginTop: 34, lineHeight: 1.4 }}>
            Mark, site, voice agent, and the plan behind it. Three weeks. Set prices. You own every file.
          </span>
          <span style={{ fontSize: 22, color: RED, fontWeight: 700, marginTop: 22, letterSpacing: 1 }}>modernmustardseed.com/brand</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18, flex: 1, paddingRight: 64 }}>
          {['SEES', 'HEARS', 'READS'].map((w, i) => (
            <div
              key={w}
              style={{
                display: 'flex',
                background: i === 1 ? INK : CREAM,
                color: i === 1 ? MUSTARD : INK,
                border: `4px solid ${INK}`,
                boxShadow: `8px 8px 0 ${i === 1 ? MUSTARD : INK}`,
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: 6,
                padding: '16px 28px',
                justifyContent: 'center',
              }}
            >
              {w}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
