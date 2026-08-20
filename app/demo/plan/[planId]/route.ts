import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * The finished AI Integration Plan as a real document. Print-ready: the page
 * carries its own @page rules, so the browser's print dialog is the PDF. Served
 * raw like /demo/site/<id>/raw so nothing wraps or reflows it.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const sb = getSupabase();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(planId)) {
    return new Response('Not found', { status: 404 });
  }
  const { data: plan } = await sb.from('integration_plans').select('html, status').eq('id', planId).maybeSingle();
  if (!plan?.html || plan.status !== 'ready') {
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Being written</title><body style="font-family:system-ui;background:#FAF6EC;color:#221C10;display:grid;place-items:center;min-height:100vh;margin:0"><div style="text-align:center;max-width:36ch"><h1 style="font-size:22px">Your AI Integration Plan is being written</h1><p style="color:#6B6250">Give it a few minutes and refresh. It is being prepared specifically for your business.</p></div>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } },
    );
  }
  return new Response(plan.html as string, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  });
}
