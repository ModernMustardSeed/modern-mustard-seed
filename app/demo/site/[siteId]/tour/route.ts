import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

/**
 * The hostess tour manifest for one forged site: her script, where each line
 * belongs on the page, and a signed URL per clip.
 *
 * Public on purpose. The demo site it belongs to is already reachable by anyone
 * holding the link, and the tour is the business's own published words read
 * aloud. Nothing here is more sensitive than the page itself.
 */

const BUCKET = 'booth';
// Comfortably longer than any visit, short enough that a scraped URL rots.
const PLAYBACK_TTL = 60 * 60 * 6;

type TourBeat = { id: string; anchor: string; text: string; ms: number; key: string };
type TourManifest = {
  business: string;
  palette: { bg: string; accent: string };
  beats: TourBeat[];
  totalMs: number;
};

export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId: id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ tour: null }, { status: 400 });

  const client = getSupabase();
  if (!client) return NextResponse.json({ tour: null });

  const { data } = await client.from('app_state').select('value').eq('key', `site_tour:${id}`).maybeSingle();
  const manifest = data?.value as TourManifest | undefined;
  // No tour built for this site is a normal state, not an error: the shell just
  // renders without a guide.
  if (!manifest?.beats?.length) return NextResponse.json({ tour: null });

  const store = client.storage.from(BUCKET);
  const beats = [];
  for (const b of manifest.beats) {
    const { data: signed } = await store.createSignedUrl(b.key, PLAYBACK_TTL);
    // A beat whose audio will not sign is dropped rather than left silent: the
    // player advances on the audio's own `ended` event, so a beat with no src
    // would stall the whole tour.
    if (!signed?.signedUrl) continue;
    beats.push({ id: b.id, anchor: b.anchor, text: b.text, ms: b.ms, src: signed.signedUrl });
  }
  if (!beats.length) return NextResponse.json({ tour: null });

  return NextResponse.json({
    tour: { business: manifest.business, palette: manifest.palette, beats, totalMs: manifest.totalMs },
  });
}
