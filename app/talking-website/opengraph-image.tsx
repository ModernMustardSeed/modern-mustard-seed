import { ImageResponse } from 'next/og';
import { DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';

// The Talking Website share card. It renders the page's own thesis rather than
// a generic logo lockup: the website panel and the phone panel, wired to one
// brain, saying the same thing. Price DERIVES from DEMO_BUNDLE so the card can
// never drift from the offer (see mms-price-single-source).
export const runtime = 'nodejs';

export const alt =
  'The Talking Website. A website that answers its own phone. Your site and your voice agent built as one thing off one brain, from Modern Mustard Seed.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const RED = '#E0301E';

export default function OpengraphImage() {
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
        {/* Halftone field */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: `radial-gradient(circle, ${MUSTARD} 3px, transparent 3.5px)`,
            backgroundSize: '26px 26px',
            opacity: 0.45,
          }}
        />

        {/* Left: the promise */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px',
            width: 690,
          }}
        >
          <div
            style={{
              display: 'flex',
              background: RED,
              color: CREAM,
              fontSize: 22,
              fontWeight: 700,
              padding: '10px 18px',
              border: `3px solid ${INK}`,
              alignSelf: 'flex-start',
              letterSpacing: 3,
            }}
          >
            [ THE TALKING WEBSITE ]
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30 }}>
            <span style={{ fontSize: 68, fontWeight: 800, color: INK, lineHeight: 1.04 }}>
              A website that
            </span>
            <span style={{ fontSize: 68, fontWeight: 800, color: INK, lineHeight: 1.04 }}>
              answers its
            </span>
            <span style={{ display: 'flex', marginTop: 8 }}>
              <span
                style={{
                  fontSize: 68,
                  fontWeight: 800,
                  fontStyle: 'italic',
                  color: INK,
                  background: MUSTARD,
                  padding: '0 16px',
                  border: `4px solid ${INK}`,
                }}
              >
                own phone.
              </span>
            </span>
          </div>

          <span style={{ fontSize: 25, color: '#4a4a4a', marginTop: 28, lineHeight: 1.4 }}>
            The site and the voice agent, built as one thing off one brain.
          </span>
          <span style={{ fontSize: 22, color: INK, fontWeight: 700, marginTop: 18, letterSpacing: 1 }}>
            {formatUsd(DEMO_BUNDLE.setupCents)} setup + {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo
          </span>
        </div>

        {/* Right: one brain, two mouths */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            paddingRight: 46,
          }}
        >
          {/* The website */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 330,
              background: '#fff',
              border: `5px solid ${INK}`,
              borderRadius: 20,
              boxShadow: `10px 10px 0 ${INK}`,
              padding: '18px 20px',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: RED, letterSpacing: 2 }}>
              ON THE WEBSITE
            </span>
            <span style={{ fontSize: 21, color: INK, marginTop: 10, lineHeight: 1.3 }}>
              &ldquo;The 2:15 today is open.&rdquo;
            </span>
          </div>

          {/* The shared brain */}
          <div
            style={{
              display: 'flex',
              background: MUSTARD,
              color: INK,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 3,
              padding: '9px 22px',
              margin: '16px 0',
              border: `4px solid ${INK}`,
              borderRadius: 999,
            }}
          >
            ONE BRAIN
          </div>

          {/* The phone */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 330,
              background: INK,
              border: `5px solid ${INK}`,
              borderRadius: 20,
              boxShadow: `10px 10px 0 ${MUSTARD}`,
              padding: '18px 20px',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: MUSTARD, letterSpacing: 2 }}>
              ON THE PHONE, 11PM
            </span>
            <span style={{ fontSize: 21, color: CREAM, marginTop: 10, lineHeight: 1.3 }}>
              &ldquo;The 2:15 today is open.&rdquo;
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
