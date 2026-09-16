import { ImageResponse } from 'next/og';

/**
 * The share card for /handbook. Drawn in code like every card in this set:
 * the handbook's own thesis on the studio's cream, a gold rule, the key verse
 * reference. No photograph, because the page has none; the words are the art.
 */

export const runtime = 'nodejs';

export const alt = 'The Final Word. A Christian\'s handbook for AI. The Spirit has the final word. The machine is a tool.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const GOLD = '#F5B700';
const RED = '#E0301E';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px 56px',
          position: 'relative',
          fontFamily: 'sans-serif',
          background: CREAM,
          border: `14px solid ${INK}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -120,
            width: 620,
            height: 620,
            display: 'flex',
            borderRadius: 999,
            background:
              'radial-gradient(circle, rgba(245,183,0,0.5) 0%, rgba(245,183,0,0.18) 45%, rgba(245,183,0,0) 70%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontFamily: 'monospace',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 5,
            textTransform: 'uppercase',
            color: RED,
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 999, background: GOLD, border: `3px solid ${INK}`, display: 'flex' }} />
          A Christian&apos;s handbook for AI · Free, forever
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 980 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: -2.5,
              color: INK,
            }}
          >
            The Spirit has the final word.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: -2.5,
              color: INK,
            }}
          >
            The machine is a tool.
          </div>
          <div style={{ display: 'flex', width: 160, height: 8, background: GOLD, border: `2px solid ${INK}`, marginTop: 10 }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: INK, letterSpacing: -0.5 }}>The Final Word</div>
            <div style={{ display: 'flex', fontSize: 20, color: 'rgba(22,22,22,0.6)', fontStyle: 'italic' }}>
              Examining the Scriptures daily to see if these things were so. Acts 17:11
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'monospace',
              fontSize: 15,
              fontWeight: 700,
              color: RED,
              letterSpacing: 5,
              textTransform: 'uppercase',
            }}
          >
            modernmustardseed.com/handbook
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
