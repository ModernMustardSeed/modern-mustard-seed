import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const SUNRISE = 'linear-gradient(135deg, #C8964E 0%, #D4A053 50%, #C86A45 100%)';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#080c16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            borderRadius: 28,
            border: '1px solid rgba(255,107,53, 0.35)',
            display: 'flex',
          }}
        />
        <div
          style={{
            display: 'flex',
            fontSize: 84,
            fontWeight: 900,
            letterSpacing: -5,
            lineHeight: 1,
            backgroundImage: SUNRISE,
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          MMS
        </div>
      </div>
    ),
    { ...size }
  );
}
