import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const BRASS = 'linear-gradient(135deg, #E8C88A 0%, #F0D090 35%, #C8964E 75%, #C86A45 100%)';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #1F4280 0%, #3B6B8A 100%)',
          position: 'relative',
          fontFamily: 'serif',
        }}
      >
        {/* Brass inner border */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            borderRadius: 28,
            border: '1px solid rgba(232,200,138, 0.45)',
            display: 'flex',
          }}
        />
        {/* Soft cloud light upper-left */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: 80,
            height: 80,
            borderRadius: 40,
            background:
              'radial-gradient(circle, rgba(245,240,232,0.4) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            display: 'flex',
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -4,
            lineHeight: 1,
            backgroundImage: BRASS,
            backgroundClip: 'text',
            color: 'transparent',
            fontStyle: 'italic',
            zIndex: 2,
          }}
        >
          MMS
        </div>
      </div>
    ),
    { ...size }
  );
}
