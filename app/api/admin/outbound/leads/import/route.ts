import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { importRowsSchema, phoneKey } from '@/lib/outbound';

export const runtime = 'nodejs';

/** Bulk CSV import. Dedupes on phone inside the batch and against the table. */
export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, importRowsSchema);
  if ('error' in parsed) return parsed.error;

  const { data: existing, error: readErr } = await guard.supabase.from('outbound_leads').select('phone').limit(10000);
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  const known = new Set((existing ?? []).map((l) => phoneKey(l.phone)).filter((k) => k.length >= 7));

  const toInsert = [];
  let skipped = 0;
  for (const row of parsed.data.rows) {
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
      return NextResponse.json({ error: error.message, inserted, skipped }, { status: 500 });
    }
    inserted += chunk.length;
  }

  return NextResponse.json({ inserted, skipped });
}
