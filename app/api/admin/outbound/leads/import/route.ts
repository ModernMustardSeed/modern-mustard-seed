import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody, fetchAllRows } from '@/lib/outbound-server';
import { importRowsSchema, phoneKey, isEmail } from '@/lib/outbound';

export const runtime = 'nodejs';

/**
 * Bulk CSV import. A lead needs BOTH an email and a phone to make the list
 * (Sarah's rule), so rows without a valid email are dropped and counted. Dedupes
 * on phone inside the batch and against the WHOLE table (fetchAllRows, not a
 * capped select, so an older duplicate still catches).
 */
export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, importRowsSchema);
  if ('error' in parsed) return parsed.error;

  const { data: existing, error: readErr } = await fetchAllRows<{ phone: string }>(
    () => guard.supabase.from('outbound_leads').select('phone').order('id', { ascending: true }),
  );
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  const known = new Set((existing ?? []).map((l) => phoneKey(l.phone)).filter((k) => k.length >= 7));

  const toInsert = [];
  let skipped = 0;
  let skippedNoEmail = 0;
  for (const row of parsed.data.rows) {
    if (!isEmail(row.email)) {
      skippedNoEmail += 1;
      continue;
    }
    const key = phoneKey(row.phone);
    if (key.length < 7 || known.has(key)) {
      skipped += 1;
      continue;
    }
    known.add(key);
    toInsert.push(row);
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const { error } = await guard.supabase.from('outbound_leads').insert(chunk);
    if (error) {
      return NextResponse.json({ error: error.message, inserted, skipped, skippedNoEmail }, { status: 500 });
    }
    inserted += chunk.length;
  }

  return NextResponse.json({ inserted, skipped, skippedNoEmail });
}
