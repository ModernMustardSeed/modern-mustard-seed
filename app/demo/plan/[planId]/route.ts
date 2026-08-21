import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * The finished AI Integration Plan as a real document. Print-ready: the page
 * carries its own @page rules, so the browser's print dialog is the PDF. Served
 * raw like /demo/site/<id>/raw so nothing wraps or reflows it.
 *
 * THE BIGGER PICTURE rides in at serve time (Sarah, 2026-08-21): every plan,
 * past and future, closes with the wider truth: what else AI can do for a
 * small business beyond the phone and the website, the fact that owners can
 * now bring ideas to life in a terminal at a fraction of the old cost, and
 * the free playbook shelf. The plan page is the personalized front door to
 * MMS as the local authority on helping small businesses thrive, so the
 * section is injected here rather than baked per-plan: one edit upgrades all
 * of them at once, printed copies included on the next print.
 */
function biggerPicture(business: string, hubUrl: string | null): string {
  return `
<section style="page-break-before: always; font-family: 'Barlow', 'Segoe UI', system-ui, sans-serif; color: #221C10; max-width: 7.3in; margin: 0 auto; padding: 0.4in 0 0.2in;">
  <div style="border-top: 4px solid #221C10; padding-top: 14px;">
    <span style="display: inline-block; font-weight: 700; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #3A2E00; background: #FBEED3; border-radius: 4px; padding: 2px 8px;">The Bigger Picture</span>
    <h2 style="font-size: 26px; line-height: 1.1; margin: 10px 0 8px; text-transform: uppercase; font-weight: 800;">The world just changed, and it changed in your favor</h2>
    <p style="font-size: 14px; line-height: 1.55; max-width: 65ch;">Everything in this plan, the agent, the website, this document itself, was built by AI directed by one person in Kalispell. That is the part worth sitting with: you can now describe an idea in plain English and watch working software come out the other side, in days instead of quarters, at a fraction of what it cost even two years ago. The tools that used to belong to companies with IT departments now belong to anyone willing to learn a little or hire a guide. Owners are building things themselves in a terminal with an AI at the keyboard. We teach exactly that, and we build alongside you when you would rather run your business than learn ours.</p>
    <h3 style="font-size: 16px; text-transform: uppercase; letter-spacing: 0.04em; margin: 16px 0 6px; font-weight: 800;">What else AI can already do for ${business}</h3>
    <ul style="font-size: 13.5px; line-height: 1.55; padding-left: 20px; max-width: 66ch; margin: 0;">
      <li>Turn job-site photos into written quotes and estimates in minutes</li>
      <li>Answer every review, good or bad, in your own voice, the same day</li>
      <li>Sort a shoebox of receipts into clean bookkeeping categories</li>
      <li>Write your job postings, screen the applicants, and draft the training checklists</li>
      <li>Turn one finished job into a month of social posts with photos you already took</li>
      <li>Draft the SOPs, safety sheets, and how-we-do-it-here docs nobody ever has time to write</li>
    </ul>
    <div style="display: flex; gap: 16px; margin-top: 18px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 240px; background: #FBEED3; border-left: 4px solid #F5B700; border-radius: 6px; padding: 12px 16px;">
        <p style="font-weight: 800; font-size: 13px; text-transform: uppercase; margin: 0 0 4px;">The free shelf</p>
        <p style="font-size: 13px; line-height: 1.5; margin: 0;">Our playbooks on AI for real businesses are free, no email wall: <b>modernmustardseed.com/playbooks</b>. Read them, use them, share them.</p>
      </div>
      <div style="flex: 1; min-width: 240px; background: #221C10; color: #FAF6EC; border-radius: 6px; padding: 12px 16px;">
        <p style="font-weight: 800; font-size: 13px; text-transform: uppercase; margin: 0 0 4px; color: #F5B700;">Talk to one right now</p>
        <p style="font-size: 13px; line-height: 1.5; margin: 0;">Mr. Mustard answers our own phone: <b>(406) 312-1223</b>. Yes, an AI runs our front desk too. Call and ask him anything about yours.${hubUrl ? ` Your live demos: <b>${hubUrl.replace('https://', '')}</b>` : ''}</p>
      </div>
    </div>
    <p style="font-size: 12px; color: #6B6250; margin: 14px 0 0;">Modern Mustard Seed is Kalispell's AI product studio. We build assets you own and can run without us. Set package pricing, changes included, no hourly billing, ever.</p>
  </div>
</section>`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const sb = getSupabase();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(planId)) {
    return new Response('Not found', { status: 404 });
  }
  const { data: plan } = await sb.from('integration_plans').select('html, status, lead_id, business_name').eq('id', planId).maybeSingle();
  if (!plan?.html || plan.status !== 'ready') {
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Being written</title><body style="font-family:system-ui;background:#FAF6EC;color:#221C10;display:grid;place-items:center;min-height:100vh;margin:0"><div style="text-align:center;max-width:36ch"><h1 style="font-size:22px">Your AI Integration Plan is being written</h1><p style="color:#6B6250">Give it a few minutes and refresh. It is being prepared specifically for your business.</p></div>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } },
    );
  }
  let hubUrl: string | null = null;
  if (plan.lead_id) {
    const { data: lead } = await sb.from('outbound_leads').select('hub_demo_url').eq('id', plan.lead_id).maybeSingle();
    hubUrl = (lead?.hub_demo_url as string | null) ?? null;
  }
  const section = biggerPicture((plan.business_name as string) || 'your business', hubUrl);
  const html = /<\/body>/i.test(plan.html as string)
    ? (plan.html as string).replace(/<\/body>/i, `${section}</body>`)
    : `${plan.html}${section}`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  });
}
