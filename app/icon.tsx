import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

const GOLD = 'linear-gradient(135deg, #C8964E 0%, #D4A053 50%, #C86A45 100%)';

export default function Icon() {
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
