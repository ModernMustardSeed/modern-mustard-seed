import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Modern Mustard Seed. Idea to Shipped Product in 30 Days.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SUNRISE_GRADIENT = 'linear-gradient(135deg, #E8C88A 0%, #F0D090 30%, #C8964E 60%, #C86A45 100%)';
const SUNRISE_WARM = 'linear-gradient(135deg, #F0D090 0%, #C8964E 100%)';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#080c16',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top gold bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: SUNRISE_WARM,
            display: 'flex',
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 8,
            color: 'rgba(255,107,53, 0.7)',
            marginBottom: 28,
          }}
        >
          Modern Mustard Seed
        </div>

        {/* Headline with gradient */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 96,
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: -2,
            textAlign: 'center',
            backgroundImage: SUNRISE_GRADIENT,
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex' }}>Idea to Shipped Product</div>
          <div style={{ display: 'flex' }}>in 30 Days.</div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 220,
            height: 1,
            background:
              'linear-gradient(to right, transparent, rgba(255,107,53,0.5), transparent)',
            marginBottom: 28,
            display: 'flex',
          }}
        />

        {/* Subhead */}
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.65)',
            letterSpacing: 1,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Four builds per quarter. Waitlist only.
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            fontWeight: 300,
            color: 'rgba(255, 255, 255, 0.4)',
            letterSpacing: 2,
            textAlign: 'center',
          }}
        >
          AI Products. Voice Agents. Production Builds.
        </div>

        {/* URL footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 700,
            color: 'rgba(255,107,53, 0.55)',
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          modernmustardseed.com
        </div>

        {/* Bottom gold bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: SUNRISE_WARM,
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
