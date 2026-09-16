import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { projectForEmail } from '@/lib/client-leads';
import { campaignUrl, isCode, qrPng, qrSvg } from '@/lib/campaigns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE CODE ITSELF. ?code=<code>&format=png|svg. PNG at 1200px for a sign
 * shop, SVG for anything that scales. Drawn on request from the campaign's
 * link, so a code can never drift from where it points.
 */
export async function GET(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = projectForEmail(session.email);
  if (!sb || !project) return NextResponse.json({ error: 'Not on a project.' }, { status: 404 });
  const u = new URL(req.url);
  const code = u.searchParams.get('code') ?? '';
  const format = u.searchParams.get('format') === 'svg' ? 'svg' : 'png';
  if (!isCode(code)) return NextResponse.json({ error: 'Which code?' }, { status: 400 });
  const { data: c } = await sb.from('client_campaigns').select('code, path, label').eq('client_email', session.email).eq('code', code).maybeSingle();
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const url = campaignUrl(project, c as { code: string; path: string });
  const name = `qr-${c.code}`;
  if (format === 'svg') {
    const svg = await qrSvg(url);
    return new NextResponse(svg, { headers: { 'content-type': 'image/svg+xml', 'content-disposition': `inline; filename="${name}.svg"`, 'cache-control': 'private, max-age=3600' } });
  }
  const png = await qrPng(url, Number(u.searchParams.get('size')) >= 200 && Number(u.searchParams.get('size')) <= 4000 ? Number(u.searchParams.get('size')) : 1200);
  return new NextResponse(new Uint8Array(png), { headers: { 'content-type': 'image/png', 'content-disposition': `inline; filename="${name}.png"`, 'cache-control': 'private, max-age=3600' } });
}
