import { ImageResponse } from 'next/og';
import { BOOTCAMP, BOOTCAMP_PROOF, bootcampTiers, usd } from '@/data/bootcamp';

/**
 * The bootcamp share card: sand, sea ink, a mustard stamp with the price.
 * Unbounded is fetched from Google Fonts when the network allows and falls
 * back to the system sans when it does not, so the card always renders.
 */
export const runtime = 'nodejs';

export const alt = `${BOOTCAMP.name}. Three live sessions, February 2 to 9, 2027, from ${usd(bootcampTiers[0].priceCents)}. Modern Mustard Seed.`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SEA = '#0b3b44';
const SAND = '#fbf5ea';
const TIFFANY = '#81d8d0';
const LAGOON = '#0a7c78';
const MUSTARD = '#f5b700';

async function unbounded(): Promise<ArrayBuffer | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const css = await fetch('https://fonts.googleapis.com/css2?family=Unbounded:wght@700&display=swap', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0' },
      signal: ctrl.signal,
    }).then((r) => r.text());
    const m = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/);
    if (!m) { clearTimeout(t); return null; }
    const buf = await fetch(m[1], { signal: ctrl.signal }).then((r) => r.arrayBuffer());
    clearTimeout(t);
    return buf;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await unbounded();
  const display = font ? 'Unbounded' : 'sans-serif';
  const ga = bootcampTiers[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: SAND,
          color: SEA,
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* The striped awning along the top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 26, display: 'flex', background: `repeating-linear-gradient(90deg, ${TIFFANY} 0 40px, #fff 40px 80px)` }} />
        {/* A low sun behind the stamp */}
        <div style={{ position: 'absolute', right: -140, bottom: -220, width: 560, height: 560, borderRadius: 280, display: 'flex', background: `radial-gradient(circle, ${MUSTARD}55 0%, ${MUSTARD}22 40%, transparent 70%)` }} />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '70px 60px 60px 72px', width: 780 }}>
          <div style={{ display: 'flex', alignItems: 'center', color: LAGOON, fontSize: 20, fontWeight: 700, letterSpacing: 5 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: MUSTARD, marginRight: 14, display: 'flex' }} />
            MODERN MUSTARD SEED PRESENTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: display, fontSize: 64, fontWeight: 700, lineHeight: 1.04, marginTop: 22, letterSpacing: -2.5 }}>
            <span>The One-Person</span>
            <span>Company <span style={{ color: LAGOON, fontWeight: 400, marginLeft: 16 }}>Bootcamp</span></span>
          </div>
          <div style={{ display: 'flex', color: SEA, fontSize: 25, marginTop: 26, lineHeight: 1.35, opacity: 0.82, maxWidth: 640 }}>
            Watch one person run an AI product studio on a crew of agents. Then build two of your own, live.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 30, fontSize: 21, fontWeight: 700, color: SEA, letterSpacing: 2 }}>
            <span>3 LIVE SESSIONS</span>
            <span style={{ margin: '0 14px', color: MUSTARD }}>·</span>
            <span>FEB 2 TO 9, 2027</span>
            <span style={{ margin: '0 14px', color: MUSTARD }}>·</span>
            <span>{usd(ga.priceCents).toUpperCase()}</span>
          </div>
        </div>

        {/* The stamp */}
        <div style={{ position: 'absolute', right: 84, top: 120, width: 300, height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(5deg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 300, height: 380, background: MUSTARD, borderRadius: 14, boxShadow: `14px 14px 0 0 ${SEA}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 262, height: 342, border: `3px solid ${SEA}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, letterSpacing: 5, color: SEA }}>LIVE</div>
              <div style={{ display: 'flex', fontFamily: display, fontSize: 108, fontWeight: 700, color: SEA, lineHeight: 1, marginTop: 10, letterSpacing: -4 }}>{usd(ga.priceCents)}</div>
              <div style={{ display: 'flex', fontSize: 17, fontWeight: 700, letterSpacing: 3, color: SEA, marginTop: 14, textAlign: 'center' }}>ONE SEAT</div>
              <div style={{ display: 'flex', fontSize: 16, color: SEA, marginTop: 24, opacity: 0.85, textAlign: 'center', lineHeight: 1.3, padding: '0 20px' }}>
                {BOOTCAMP_PROOF[1].n} laws · {BOOTCAMP_PROOF[2].n} skills · {BOOTCAMP_PROOF[5].n} products shipped
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: 72, bottom: 34, display: 'flex', fontSize: 18, fontWeight: 700, letterSpacing: 4, color: SEA, opacity: 0.6 }}>
          MODERNMUSTARDSEED.COM/BOOTCAMP
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: 'Unbounded', data: font, weight: 700 as const, style: 'normal' as const }] : undefined,
    },
  );
}
