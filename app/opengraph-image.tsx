import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Node runtime so we can embed the real brand logo from /public.
export const runtime = 'nodejs';

export const alt =
  'Modern Mustard Seed. Apps, sites, and specialty AI tools for your business.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
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
            top: -120,
            width: 820,
            height: 820,
            display: 'flex',
            background:
              'radial-gradient(circle, rgba(245,183,0,0.45) 0%, rgba(245,183,0,0.16) 40%, rgba(245,183,0,0) 66%)',
          }}
        />

        {/* Big brand logo (mascot + wordmark) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={395}
          height={430}
          alt=""
          style={{ filter: 'drop-shadow(8px 8px 0 rgba(22,22,22,0.16))' }}
        />

        {/* Short explainer: what we build */}
        <div
          style={{
            display: 'flex',
            marginTop: 26,
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: -0.5,
            color: INK,
            textAlign: 'center',
          }}
        >
          Apps, sites, and specialty AI tools.
        </div>

        {/* URL footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 700,
            color: RED,
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
