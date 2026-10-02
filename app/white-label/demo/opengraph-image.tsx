import { ImageResponse } from 'next/og';

/**
 * A neutral share card for the white label demo. Without this the root card
 * (ours) shows up when an agency texts the demo link to its client, which is
 * the one place our name must never appear. No brand, no fonts from /public.
 */
export const alt = 'A live AI receptionist demo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 90, background: '#111', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, color: '#9ca3af' }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: '#22c55e' }} />
          Live demo
        </div>
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05, marginTop: 30 }}>Your new AI receptionist.</div>
        <div style={{ fontSize: 40, color: '#d1d5db', marginTop: 28 }}>Call it like a customer would. It answers and books.</div>
      </div>
    ),
    size,
  );
}
