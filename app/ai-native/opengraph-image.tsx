import { ImageResponse } from 'next/og';
import { STUDIO_PROOF } from '@/data/ai-native';

// The AI Native share card: the tagline, and the studio's own numbers as the proof.
export const runtime = 'nodejs';

export const alt = 'AI Native by Modern Mustard Seed. Your company, running on AI. Your team, running it.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const RED = '#E0301E';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: CREAM,
          border: `14px solid ${INK}`,
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: `radial-gradient(circle, ${INK} 2px, transparent 2.5px)`,
            backgroundSize: '28px 28px',
            opacity: 0.08,
          }}
        />

        {/* Left: the words */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 48px 56px 64px', width: 640 }}>
          <div
            style={{
              display: 'flex',
              background: RED,
              color: CREAM,
              fontSize: 22,
              fontWeight: 700,
              padding: '8px 16px',
              border: `3px solid ${INK}`,
              alignSelf: 'flex-start',
              letterSpacing: 4,
            }}
          >
            AI NATIVE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', color: INK, fontSize: 60, fontWeight: 900, lineHeight: 1.02, marginTop: 28, letterSpacing: -2 }}>
            <span>Your company,</span>
            <span>running on AI.</span>
            <span style={{ color: MUSTARD, WebkitTextStroke: `2px ${INK}` }}>Your team, running it.</span>
          </div>
          <div style={{ display: 'flex', color: INK, fontSize: 24, marginTop: 26, lineHeight: 1.3, opacity: 0.8 }}>
            Every workflow mapped. The first five moved onto AI. Built in your accounts, and your people coached to run it.
          </div>
          <div style={{ display: 'flex', color: INK, fontSize: 20, marginTop: 30, letterSpacing: 3, fontWeight: 700, opacity: 0.7 }}>
            MODERNMUSTARDSEED.COM/AI-NATIVE
          </div>
        </div>

        {/* Right: the studio's own numbers on a sticker */}
        <div style={{ display: 'flex', position: 'absolute', right: 56, top: 96, width: 440, height: 438, alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 440,
              padding: '32px 36px',
              border: `4px solid ${INK}`,
              background: INK,
              boxShadow: `12px 12px 0 0 ${MUSTARD}, 12px 12px 0 4px ${INK}`,
              transform: 'rotate(-2deg)',
            }}
          >
            <div style={{ display: 'flex', color: MUSTARD, fontSize: 16, letterSpacing: 4, fontWeight: 700 }}>HOW THE STUDIO RUNS</div>
            {STUDIO_PROOF.map((p) => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}>
                <span style={{ display: 'flex', color: MUSTARD, fontSize: 44, fontWeight: 900, width: 120, letterSpacing: -1 }}>{p.n}</span>
                <span style={{ display: 'flex', color: CREAM, fontSize: 20, opacity: 0.85 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
