import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { clientDeskPrompt, forgeDeskCall, type ClientDeskData } from '@/lib/mustard-desk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Forge Mr. Mustard's CLIENT desk call for the signed-in portal client. The
 * persona is built ONLY from this client's rows (same queries the portal page
 * itself uses), so the call can never say more than the page already shows.
 */
export async function POST() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const email = session.email;

  const supabase = getSupabase();
  const data: ClientDeskData = { name: '', company: null, projects: [], billing: null, orderNames: [] };

  if (supabase) {
    try {
      const { data: c } = await supabase.from('clients').select('name, company').eq('email', email).maybeSingle();
      if (c) {
        data.name = (c.name as string | null) || '';
        data.company = (c.company as string | null) ?? null;
      }
    } catch { /* clients table optional */ }
    try {
      const { data: rows } = await supabase
        .from('projects')
        .select('name, status, progress, milestones, launch_target')
        .eq('client_email', email)
        .order('created_at', { ascending: false })
        .limit(4);
      for (const p of rows ?? []) {
        const milestones = Array.isArray(p.milestones) ? (p.milestones as Array<{ title?: string; done?: boolean }>) : [];
        const next = milestones.find((m) => !m.done)?.title || null;
        data.projects.push({
          name: (p.name as string) || 'Your project',
          status: (p.status as string) || 'in progress',
          progress: Number(p.progress) || 0,
          launchTarget: (p.launch_target as string | null) ?? null,
          nextMilestone: next,
        });
      }
    } catch { /* projects table optional */ }
    try {
      const { data: prop } = await supabase
        .from('proposals')
        .select('one_time_total, monthly_total, deposit_amount, deposit_status, signed_at')
        .eq('client_email', email)
        .in('status', ['accepted', 'sent'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prop) {
        const oneTime = Number(prop.one_time_total) || 0;
        const deposit = Math.round(Number(prop.deposit_amount) || Math.round(oneTime * 0.5));
        data.billing = {
          signed: !!prop.signed_at,
          depositPaid: prop.deposit_status === 'paid',
          balanceDue: prop.deposit_status === 'paid' ? Math.max(0, oneTime - deposit) : oneTime,
          monthly: Number(prop.monthly_total) || 0,
        };
      }
    } catch { /* proposals table optional */ }
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('product_name')
        .eq('email', email)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(6);
      data.orderNames = (orders ?? []).map((o) => o.product_name as string).filter(Boolean);
    } catch { /* orders table optional */ }
  }

  if (!data.name) data.name = email.split('@')[0];

  const forged = await forgeDeskCall('client', {
    greetName: data.name,
    email,
    systemPrompt: clientDeskPrompt(data),
    keyterms: [data.company || '', data.projects[0]?.name || ''],
  });
  if (!forged.ok) return NextResponse.json({ error: forged.error }, { status: 503 });
  return NextResponse.json({ call: forged.call });
}
