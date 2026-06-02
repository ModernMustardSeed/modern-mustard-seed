import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt =
  'Modern Mustard Seed. Idea to shipped product. Production apps, AI products, and brand systems that grow businesses.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BRASS_GRADIENT =
  'linear-gradient(120deg, #E8C88A 0%, #F0D090 30%, #C8964E 60%, #C86A45 100%)';

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
          padding: '72px',
          position: 'relative',
          fontFamily: 'sans-serif',
          background:
            'radial-gradient(circle at 50% 18%, #14203A 0%, #0C1426 45%, #080C16 100%)',
        }}
      >
        {/* Top brass hairline */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: BRASS_GRADIENT,
            display: 'flex',
          }}
        />

        {/* Warm brass glow, upper right */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 640,
            height: 520,
            background:
              'radial-gradient(circle at 70% 30%, rgba(232,200,138,0.20) 0%, transparent 62%)',
            display: 'flex',
          }}
        />

        {/* Ember glow, lower left */}
        <div
          style={{
            position: 'absolute',
            bottom: -140,
            left: -120,
            width: 600,
            height: 480,
            background:
              'radial-gradient(circle at 35% 70%, rgba(255,107,53,0.16) 0%, transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Eyebrow / brand name */}
        <div
          style={{
            display: 'flex',
            fontSize: 16,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 11,
            color: 'rgba(232,200,138, 0.78)',
            marginBottom: 34,
            fontFamily: 'monospace',
            zIndex: 2,
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
            justifyContent: 'center',
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 0.98,
            letterSpacing: -2.5,
            textAlign: 'center',
            textTransform: 'uppercase',
            backgroundImage: BRASS_GRADIENT,
            backgroundClip: 'text',
            color: 'transparent',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex' }}>Idea to Shipped</div>
          <div style={{ display: 'flex' }}>Product.</div>
        </div>

        {/* Cream divider */}
        <div
          style={{
            width: 200,
            height: 1,
            background:
              'linear-gradient(to right, transparent, rgba(232,200,138,0.55), transparent)',
            marginTop: 36,
            marginBottom: 26,
            display: 'flex',
          }}
        />

        {/* Subhead */}
        <div
          style={{
            display: 'flex',
            fontSize: 27,
            fontWeight: 400,
            color: 'rgba(245,240,232, 0.74)',
            letterSpacing: 0.5,
            lineHeight: 1.35,
            textAlign: 'center',
            maxWidth: 860,
            zIndex: 2,
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
            color: 'rgba(255,107,53, 0.85)',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex' }}>Production Apps</div>
          <div style={{ display: 'flex', color: 'rgba(232,200,138,0.5)' }}>
            &bull;
          </div>
          <div style={{ display: 'flex' }}>AI Products</div>
          <div style={{ display: 'flex', color: 'rgba(232,200,138,0.5)' }}>
            &bull;
          </div>
          <div style={{ display: 'flex' }}>Brand Systems</div>
        </div>

        {/* URL footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 34,
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 700,
            color: 'rgba(245,240,232, 0.5)',
            letterSpacing: 6,
            textTransform: 'uppercase',
            zIndex: 2,
          }}
        >
          modernmustardseed.com
        </div>

        {/* Bottom brass hairline */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: BRASS_GRADIENT,
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
