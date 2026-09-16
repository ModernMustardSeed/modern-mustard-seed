import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WHAT IS SITTING IN THE PRINT BUCKET RIGHT NOW.
 *
 * The door drop runs are built on a laptop and pushed to public storage by
 * scripts/door-drop/publish.mjs. Nothing about them lives in Postgres, and
 * nothing about them should: the artifacts ARE the record, and the moment this
 * page starts keeping its own copy of the page count the two go out of step and
 * the printed number stops being the true one.
 *
 * So this lists the bucket. Every run publishes a run.json beside its PDFs
 * carrying the page count, the towns and the date, which means a rebuild shows
 * up here on the next page load with no deploy and no edit. A run whose
 * run.json has not been written yet, because it predates that change, still
 * lists its files and simply reports no count rather than a guessed one.
 *
 * Read only. Sending is a separate route, because sending is the thing with a
 * consequence.
 */

const BUCKET = 'print-runs';

/** The order a run is read in: print it, walk it, hand the shop the spec. */
const ORDER = [
  'flyers-letter.pdf',
  'route-by-town.pdf',
  'printer-spec.pdf',
  'flyers-press.pdf',
  'route-sheet.pdf',
  'route-sheet.csv',
];

const BLURB: Record<string, string> = {
  'flyers-letter.pdf': 'The print job. Letter, no crop marks, what a copy counter needs.',
  'route-by-town.pdf': 'One sheet per town, every stop in driving order with address and phone.',
  'printer-spec.pdf': 'One page of specs to hand the shop.',
  'flyers-press.pdf': 'Oversized with crop marks. Only for a shop that trims to bleed.',
  'route-sheet.pdf': 'The whole route as one list.',
  'route-sheet.csv': 'The same stops as a spreadsheet.',
};

type Entry = { name: string; id?: string | null; updated_at?: string; metadata?: { size?: number } | null };

export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const sb = guard.supabase;

  const base = process.env.supabase_url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const publicUrl = (key: string) => `${base}/storage/v1/object/public/${BUCKET}/${key}`;

  // Top level is one folder per print date, newest first.
  const { data: labels, error } = await sb.storage.from(BUCKET).list('', { limit: 100 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const runs: unknown[] = [];

  for (const label of (labels ?? []) as Entry[]) {
    // A folder has no id in the storage listing; a file does. Skip stray files.
    if (label.id) continue;
    const { data: regions } = await sb.storage.from(BUCKET).list(label.name, { limit: 100 });

    for (const region of (regions ?? []) as Entry[]) {
      if (region.id) continue;
      const prefix = `${label.name}/${region.name}`;
      const { data: entries } = await sb.storage.from(BUCKET).list(prefix, { limit: 100 });
      const files = ((entries ?? []) as Entry[]).filter((f) => f.id);
      if (!files.length) continue;

      let meta: Record<string, unknown> | null = null;
      if (files.some((f) => f.name === 'run.json')) {
        try {
          const res = await fetch(publicUrl(`${prefix}/run.json`), { cache: 'no-store' });
          if (res.ok) meta = (await res.json()) as Record<string, unknown>;
        } catch {
          // A run that cannot describe itself still lists its files. Better a
          // card with no page count than no card at all.
        }
      }

      runs.push({
        label: label.name,
        region: region.name,
        meta,
        updated_at: files.map((f) => f.updated_at ?? '').sort().at(-1) ?? null,
        files: files
          .filter((f) => f.name !== 'run.json')
          .sort((a, b) => {
            const ai = ORDER.indexOf(a.name);
            const bi = ORDER.indexOf(b.name);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name);
          })
          .map((f) => ({
            name: f.name,
            url: publicUrl(`${prefix}/${f.name}`),
            size: f.metadata?.size ?? null,
            blurb: BLURB[f.name] ?? null,
          })),
      });
    }
  }

  runs.sort((a, b) => {
    const x = a as { label: string; region: string };
    const y = b as { label: string; region: string };
    return y.label.localeCompare(x.label) || x.region.localeCompare(y.region);
  });

  return NextResponse.json({ runs });
}
