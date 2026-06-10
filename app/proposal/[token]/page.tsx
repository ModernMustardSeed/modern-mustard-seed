import { notFound } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import { byId } from '@/data/proposal-menu';
import ProposalSignPay from '@/components/ProposalSignPay';
import ProposalDoc, { type ProposalLine } from '@/components/ProposalDoc';

export const dynamic = 'force-dynamic';
export const metadata = buildMetadata({ title: 'Your Proposal', noindex: true });

type Line = ProposalLine;

export default async function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabase();
  if (!supabase) notFound();

  const { data: p } = await supabase!.from('proposals').select('*').eq('share_token', token).maybeSingle();
  if (!p) notFound();

  const lines: Line[] = Array.isArray(p.lines) ? p.lines : [];
  const prose = (p.prose || {}) as { intro?: string; situation?: string; recommendation?: string; close?: string };
  const oneTime = Number(p.one_time_total) || 0;
  const monthly = Number(p.monthly_total) || 0;
  const depositDue = Math.round(Number(p.deposit_amount) || Math.round(oneTime * 0.5));
  const balanceDue = oneTime - depositDue;
  const hasVariable = lines.some((l) => byId(l.id)?.variable);
  const preparedFor = [p.client_name, p.client_company].filter(Boolean).join(', ');

  return (
    <main className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-10 pb-24 px-5">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
      <div className="relative max-w-3xl mx-auto">
        <ProposalDoc
          preparedFor={preparedFor || undefined}
          siteUrl={p.site_url as string | null}
          prose={prose}
          situationFallback={(p.situation as string) || null}
          lines={lines}
          oneTime={oneTime}
          monthly={monthly}
          depositDue={depositDue}
          balanceDue={balanceDue}
          hasVariable={hasVariable}
        />

        {/* Sign + pay */}
        <ProposalSignPay
          token={token}
          signedName={(p.signed_name as string) || null}
          depositStatus={(p.deposit_status as string) || 'unpaid'}
          depositDue={depositDue}
        />

        <p className="text-center text-[#161616]/40 text-xs font-body mt-8">
          Questions? Reply to Sarah&rsquo;s email or write sarah@modernmustardseed.com.
        </p>
      </div>
    </main>
  );
}
