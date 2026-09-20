import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Modern Mustard Seed. Exceptional by design. Intelligent by nature. Independent design and AI studio.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const art = readFileSync(join(process.cwd(), 'public/images/editorial/seed-sculpture-1280.jpg'));
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#080c16', color: '#fbf6ea', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', position: 'absolute', top: 0, right: 0, width: 465, height: 630 }}>
        <img src={'data:image/jpeg;base64,' + art.toString('base64')} width={420} height={630} alt="Mustard seed sculpture with a silver ribbon" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '48px 58px', width: 785 }}>
        <div style={{ display: 'flex', fontSize: 18, letterSpacing: 1 }}>Modern Mustard Seed</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 70, fontSize: 73, lineHeight: 1.03, letterSpacing: -4 }}>
          <span>Exceptional</span><span style={{ color: '#f5b700' }}>by design.</span><span>Intelligent by nature.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 42, fontSize: 18, color: '#c6c8cc' }}>Websites · Custom Software · Applied AI</div>
        <div style={{ display: 'flex', marginTop: 38, fontSize: 13, letterSpacing: 2, color: '#f5b700' }}>KALISPELL, MONTANA / WORKING EVERYWHERE</div>
      </div>
    </div>,
    size,
  );
}
