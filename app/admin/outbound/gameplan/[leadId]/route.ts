import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { gameplanSheetHtml } from '@/lib/gameplan-sheet';
import type { OutboundLead } from '@/lib/outbound';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = Promise<{ leadId: string }>;

/**
 * The printable AI Game Plan sheet for one lead, straight from the cockpit.
 * Renders the same letter-size one-pager the batch print packs use, with live
 * QR codes for whatever exists on the lead right now (hub, forged site,
 * integration plan), plus an on-screen Print button. Sits under /admin so the
 * middleware login guard covers it; the QR targets themselves are public.
 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { leadId } = await params;

  const { data, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', leadId).single();
  if (error || !data) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const lead = data as OutboundLead;

  const qr = (url: string | null) =>
    url ? QRCode.toString(url, { type: 'svg', margin: 0, color: { dark: '#221C10', light: '#FFFFFF00' } }) : Promise.resolve(null);
  const [hubQr, siteQr, planQr] = await Promise.all([
    qr(lead.hub_demo_url),
    qr(lead.site_demo_status === 'ready' ? lead.site_demo_url : null),
    qr(lead.integration_plan_status === 'ready' ? lead.integration_plan_url : null),
  ]);

  return new NextResponse(gameplanSheetHtml(lead, { hubQr, siteQr, planQr }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
