import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Modern Mustard Seed. Your vision, beautifully built. Design and technology with character.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const work = readFileSync(join(process.cwd(), 'public/images/editorial/dd-social.png'));
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#fbf6ea', color: '#080c16', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif', border: '3px solid #080c16' }}>
      <div style={{ position: 'absolute', display: 'flex', right: 0, top: 0, bottom: 0, width: 490, background: '#f5b700', borderLeft: '3px solid #080c16' }} />
      <div style={{ position: 'absolute', display: 'flex', width: 425, height: 308, right: 27, top: 135, padding: 12, background: '#fbf6ea', border: '3px solid #080c16', boxShadow: '8px 8px 0 #080c16', transform: 'rotate(7deg)', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 12, marginBottom: 12 }}>01 / D & D LANDSCAPING</div>
        <img src={'data:image/png;base64,' + work.toString('base64')} width={395} height={247} alt="D & D Landscaping website by Modern Mustard Seed" />
      </div>
      <div style={{ position: 'absolute', right: 30, bottom: 32, display: 'flex', width: 110, height: 110, background: '#1e50c8', borderRadius: 60, alignItems: 'center', justifyContent: 'center', border: '2px solid #080c16' }}>
        <span style={{ fontSize: 80, color: "#fbf6ea", lineHeight: 1 }}>+</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '44px 48px', width: 730 }}>
        <div style={{ display: 'flex', fontSize: 19 }}>Modern Mustard Seed</div>
        <div style={{ display: 'flex', fontSize: 13, letterSpacing: 2, color: '#b92417', marginTop: 51 }}>DESIGN & TECHNOLOGY, WITH CHARACTER.</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 22, fontSize: 86, lineHeight: 1.04, letterSpacing: -5, fontWeight: 700 }}>
          <span>Your vision.</span><span style={{ color: '#b92417' }}>Beautifully</span><span>built.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 34, fontSize: 15 }}>Websites · Custom Software · AI Systems</div>
        <div style={{ display: 'flex', marginTop: 20, fontSize: 11, letterSpacing: 2 }}>KALISPELL, MONTANA / WORKING EVERYWHERE</div>
      </div>
    </div>,
    size,
  );
}
