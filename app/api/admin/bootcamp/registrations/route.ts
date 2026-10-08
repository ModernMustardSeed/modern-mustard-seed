import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { listRegistrations } from '@/lib/bootcamp/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIERS = new Set(['masterclass', 'ga', 'vip', 'platinum', 'operator']);

const CSV_COLUMNS = ['name', 'email', 'business', 'website', 'trade', 'phone', 'tier', 'amount_cents', 'host_slug', 'source', 'why', 'unsubscribed_at', 'created_at'] as const;

/** RFC 4180: wrap when the value holds a comma, a quote or a line break; double the quotes. */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = Array.isArray(v) ? v.join(' ') : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET ?tier=&q=&format=csv&limit=
 * JSON by default. CSV downloads every matching row for the list in a
 * spreadsheet, quotes escaped.
 */
export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const tierParam = (url.searchParams.get('tier') || '').trim().toLowerCase();
  const tier = TIERS.has(tierParam) ? tierParam : undefined;
  const q = (url.searchParams.get('q') || '').trim().slice(0, 120) || undefined;
  const format = (url.searchParams.get('format') || '').trim().toLowerCase();
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = format === 'csv' ? 10_000 : Number.isFinite(limitParam) && limitParam > 0 ? Math.min(2000, Math.round(limitParam)) : 500;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  try {
    const rows = await listRegistrations(sb, { tier, q, limit });

    if (format === 'csv') {
      const lines = [CSV_COLUMNS.join(',')];
      for (const r of rows) {
        const rec = r as Record<string, unknown>;
        lines.push(CSV_COLUMNS.map((c) => csvCell(rec[c])).join(','));
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const name = `bootcamp-registrations${tier ? `-${tier}` : ''}-${stamp}.csv`;
      return new NextResponse(`﻿${lines.join('\r\n')}\r\n`, {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${name}"`,
          'cache-control': 'no-store',
        },
      });
    }

    return NextResponse.json({ ok: true, rows, count: rows.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not load registrations.' }, { status: 500 });
  }
}
