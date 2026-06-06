import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Node runtime so we can embed the real brand logo from /public.
export const runtime = 'nodejs';

export const alt =
  'Modern Mustard Seed. You bring the seed, we build the tree. Apps, sites, and AI tools for founders and small businesses.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const YELLOW = '#F5B700';
const RED = '#E0301E';

export default async function OpengraphImage() {
  const logo = readFileSync(join(process.cwd(), 'public/brand/logo-lockup.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          fontFamily: 'sans-serif',
          background: CREAM,
          border: `14px solid ${INK}`,
          overflow: 'hidden',
        }}
      >
        {/* Sunburst glow */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: 120,
            width: 760,
            height: 760,
            display: 'flex',
            background:
              'radial-gradient(circle, rgba(245,183,0,0.45) 0%, rgba(245,183,0,0.16) 40%, rgba(245,183,0,0) 66%)',
          }}
        />

        {/* Logo lockup (mascot + wordmark) */}
        <div style={{ display: 'flex', paddingLeft: 64, paddingRight: 40, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={300} height={326} alt="" style={{ filter: 'drop-shadow(8px 8px 0 rgba(22,22,22,0.16))' }} />
        </div>

        {/* Headline column */}
        <div style={{ display: 'flex', flexDirection: 'column', paddingRight: 64, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 17,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 9,
              color: RED,
              fontFamily: 'monospace',
              marginBottom: 22,
            }}
          >
            Modern Mustard Seed
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', color: INK }}>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, lineHeight: 1.04, letterSpacing: -1.5 }}>
              You bring
            </div>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, lineHeight: 1.04, letterSpacing: -1.5 }}>
              the seed,
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <span style={{ display: 'flex', fontSize: 64, fontWeight: 900, letterSpacing: -1.5 }}>we build the</span>
            </div>
            {/* "tree" as a pop-art sticker */}
            <div style={{ display: 'flex', marginTop: 14 }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 78,
                  fontWeight: 900,
                  color: INK,
                  background: YELLOW,
                  border: `5px solid ${INK}`,
                  borderRadius: 18,
                  padding: '4px 34px',
                  boxShadow: `8px 8px 0 ${INK}`,
                  letterSpacing: -1,
                }}
              >
                tree
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 500,
              color: '#3A3733',
              lineHeight: 1.3,
              maxWidth: 560,
              marginTop: 30,
            }}
          >
            Apps, sites, and specialty AI tools for founders and small businesses.
          </div>
        </div>

        {/* URL footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 26,
            right: 64,
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 700,
            color: '#8A8378',
            letterSpacing: 5,
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
