import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

const BRASS = 'linear-gradient(135deg, #E8C88A 0%, #F0D090 35%, #C8964E 75%, #C86A45 100%)';

export default function Icon() {
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
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: -1.5,
            lineHeight: 1,
            backgroundImage: BRASS,
            backgroundClip: 'text',
            color: 'transparent',
            fontStyle: 'italic',
          }}
        >
          MMS
        </div>
      </div>
    ),
    { ...size }
  );
}
