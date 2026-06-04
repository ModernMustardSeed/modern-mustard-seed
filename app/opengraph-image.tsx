import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt =
  'Modern Mustard Seed. Idea to shipped product. Production apps, AI products, and brand systems that grow businesses.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const YELLOW = '#F5B700';
const RED = '#E0301E';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px',
          position: 'relative',
          fontFamily: 'sans-serif',
          background: CREAM,
          border: `14px solid ${INK}`,
        }}
      >
        {/* Eyebrow / brand name */}
        <div
          style={{
            display: 'flex',
            fontSize: 16,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 11,
            color: RED,
            marginBottom: 30,
            fontFamily: 'monospace',
          }}
        >
          Modern Mustard Seed
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 1.0,
            letterSpacing: -2.5,
            textAlign: 'center',
            textTransform: 'uppercase',
            color: INK,
          }}
        >
          <div style={{ display: 'flex' }}>Idea to Shipped</div>
          <div
            style={{
              display: 'flex',
              marginTop: 14,
              background: YELLOW,
              border: `5px solid ${INK}`,
              borderRadius: 16,
              padding: '6px 28px',
              color: INK,
            }}
          >
            Product
          </div>
        </div>

        {/* Subhead */}
        <div
          style={{
            display: 'flex',
            fontSize: 27,
            fontWeight: 500,
            color: '#3A3733',
            letterSpacing: 0.5,
            lineHeight: 1.35,
            textAlign: 'center',
            maxWidth: 860,
            marginTop: 42,
          }}
        >
          Production apps, AI-powered products, and brand systems that grow
          businesses.
        </div>

        {/* Build pillars */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginTop: 40,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: 5,
            textTransform: 'uppercase',
            color: INK,
          }}
        >
          <div style={{ display: 'flex' }}>Production Apps</div>
          <div style={{ display: 'flex', color: RED }}>&bull;</div>
          <div style={{ display: 'flex' }}>AI Products</div>
          <div style={{ display: 'flex', color: RED }}>&bull;</div>
          <div style={{ display: 'flex' }}>Brand Systems</div>
        </div>

        {/* URL footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 700,
            color: '#8A8378',
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          modernmustardseed.com
        </div>
      </div>
    ),
    { ...size }
  );
}
