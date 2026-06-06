import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { renderProposalPdf } from '@/lib/proposal-pdf';

export const runtime = 'nodejs';

/** Re-download the signed proposal PDF for the signed-in client. */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Not available' }, { status: 500 });

  const { data: p } = await supabase
    .from('proposals')
    .select('*')
    .eq('client_email', session.email)
    .not('signed_at', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: 'No signed proposal found.' }, { status: 404 });

  try {
    const bytes = await renderProposalPdf({
      client_name: p.client_name,
      client_company: p.client_company,
      client_email: p.client_email,
      site_url: p.site_url,
      situation: p.situation,
      prose: p.prose,
      lines: p.lines,
      one_time_total: p.one_time_total,
      monthly_total: p.monthly_total,
      deposit_amount: p.deposit_amount,
      signed_name: p.signed_name,
      signed_at: p.signed_at,
    });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="Modern-Mustard-Seed-Proposal.pdf"',
      },
    });
  } catch (err) {
    console.error('portal proposal-pdf error', err);
    return NextResponse.json({ error: 'Could not generate the PDF.' }, { status: 500 });
  }
}
