import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

const GOLD = 'linear-gradient(135deg, #A68B10 0%, #E6C84A 40%, #C8A415 65%, #FFE082 100%)';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0a0804',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1,
            backgroundImage: GOLD,
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
