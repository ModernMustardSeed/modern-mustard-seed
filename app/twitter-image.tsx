import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Modern Mustard Seed. If you have faith as small as a mustard seed, nothing will be impossible for you.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BRASS_GRADIENT = 'linear-gradient(120deg, #E8C88A 0%, #F0D090 30%, #C8964E 60%, #C86A45 100%)';

function Cloud({
  left,
  top,
  scale = 1,
  opacity = 0.95,
}: {
  left: number;
  top: number;
  scale?: number;
  opacity?: number;
}) {
  const lobes = [
    { x: 0, y: 12, w: 70, h: 50 },
    { x: 38, y: 0, w: 80, h: 64 },
    { x: 92, y: 6, w: 70, h: 58 },
    { x: 136, y: 16, w: 60, h: 48 },
    { x: 60, y: 30, w: 90, h: 42 },
  ];
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: 200 * scale,
        height: 90 * scale,
        display: 'flex',
        opacity,
      }}
    >
      {lobes.map((l, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: l.x * scale,
            top: l.y * scale,
            width: l.w * scale,
            height: l.h * scale,
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F5FB 60%, #C7D3E3 100%)',
            borderRadius: 999,
            boxShadow:
              '0 8px 20px rgba(31, 66, 128, 0.18), inset 0 -6px 12px rgba(143, 169, 197, 0.25), inset 0 6px 10px rgba(255,255,255,0.7)',
            display: 'flex',
          }}
        />
      ))}
    </div>
  );
}

export default async function TwitterImage() {
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
          fontFamily: 'serif',
          background:
            'linear-gradient(180deg, #1F4280 0%, #2D5894 30%, #5C8AA8 65%, #8FA9C5 100%)',
        }}
      >
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

        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 600,
            height: 400,
            background:
              'radial-gradient(circle at 75% 25%, rgba(245,240,232,0.32) 0%, transparent 65%)',
            display: 'flex',
          }}
        />

        <Cloud left={80} top={70} scale={1.3} opacity={0.95} />
        <Cloud left={780} top={50} scale={1.1} opacity={0.9} />
        <Cloud left={550} top={150} scale={0.8} opacity={0.7} />
        <Cloud left={920} top={420} scale={1.0} opacity={0.88} />
        <Cloud left={50} top={460} scale={0.95} opacity={0.85} />
        <Cloud left={380} top={490} scale={0.7} opacity={0.65} />

        <div
          style={{
            display: 'flex',
            fontSize: 16,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 10,
            color: 'rgba(245,240,232, 0.92)',
            marginBottom: 36,
            fontFamily: 'sans-serif',
            zIndex: 2,
          }}
        >
          Modern Mustard Seed
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.18,
            letterSpacing: -0.5,
            textAlign: 'center',
            color: '#FCFAF5',
            maxWidth: 980,
            textShadow: '0 2px 24px rgba(8,12,22,0.45)',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex' }}>
            &ldquo;If you have faith as small as a
          </div>
          <div
            style={{
              display: 'flex',
              backgroundImage: BRASS_GRADIENT,
              backgroundClip: 'text',
              color: 'transparent',
              fontStyle: 'normal',
              fontWeight: 600,
            }}
          >
            mustard seed,
          </div>
          <div style={{ display: 'flex' }}>
            nothing will be impossible for you.&rdquo;
          </div>
        </div>

        <div
          style={{
            width: 180,
            height: 1,
            background:
              'linear-gradient(to right, transparent, rgba(245,240,232,0.55), transparent)',
            marginTop: 38,
            marginBottom: 22,
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            fontSize: 18,
            fontWeight: 700,
            color: 'rgba(232,200,138, 0.95)',
            letterSpacing: 8,
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            zIndex: 2,
          }}
        >
          Matthew 17:20
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 32,
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 700,
            color: 'rgba(245,240,232, 0.65)',
            letterSpacing: 6,
            textTransform: 'uppercase',
            zIndex: 2,
          }}
        >
          modernmustardseed.com
        </div>

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
