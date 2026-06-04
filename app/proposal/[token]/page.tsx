import { notFound } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import {
  byId,
  isRecurring,
  isHourly,
  formatMoney as money,
  TERMS,
  type Service,
} from '@/data/proposal-menu';
import ProposalSignPay from '@/components/ProposalSignPay';

export const dynamic = 'force-dynamic';
export const metadata = buildMetadata({ title: 'Your Proposal', noindex: true });

type Line = { id: string; price: number; qty: number; scope: string[]; framing?: string };

function linePriceLabel(s: Service, l: Line): string {
  if (s.unit === 'free') return 'Included';
  if (isHourly(s.unit)) return `${money(l.price)}/hr × ${l.qty} = ${money(l.price * l.qty)}`;
  if (isRecurring(s.unit)) return `${money(l.price)}/mo`;
  const base = money(l.price * (l.qty || 1));
  return s.unit === 'fixed_from' ? `from ${base}` : base;
}

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
        {/* Doc */}
        <div className="proposal-doc bg-white border-2 border-[#161616] rounded-2xl overflow-hidden shadow-[6px_6px_0_0_#161616]">
          <div className="bg-[#F5B700] px-8 py-7 text-center border-b-2 border-[#161616]">
            <div className="text-[10px] tracking-[0.4em] uppercase text-[#161616] font-extrabold">Modern Mustard Seed</div>
            <div className="text-[#161616] text-sm italic font-bold mt-2" style={{ fontFamily: 'Georgia, serif' }}>
              Proposal
            </div>
          </div>

          <div className="px-8 py-8">
            {preparedFor && (
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#E0301E] font-bold mb-1">
                Prepared for {preparedFor}
              </p>
            )}
            {p.site_url && <p className="text-[13px] text-[#8A8378] mb-4">{p.site_url}</p>}

            {prose.intro && <p className="text-[15px] leading-relaxed mb-5">{prose.intro}</p>}
            {(prose.situation || p.situation) && (
              <Section title="Where you are">{prose.situation || (p.situation as string)}</Section>
            )}
            {prose.recommendation && <Section title="What we recommend">{prose.recommendation}</Section>}

            <h3 className="text-[11px] uppercase tracking-[0.25em] text-[#E0301E] font-bold mt-7 mb-3">
              Scope and pricing
            </h3>
            <div className="space-y-4">
              {lines.map((l, i) => {
                const s = byId(l.id);
                if (!s) return null;
                return (
                  <div key={i} className="border-2 border-[#161616] rounded-lg p-4">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="font-black text-[16px]" style={{ fontFamily: 'Georgia, serif' }}>
                        {s.name}
                      </span>
                      <span className="text-right whitespace-nowrap">
                        <span className="text-[14px] font-semibold text-[#161616]">{linePriceLabel(s, l)}</span>
                        {s.variable && (
                          <span className="block text-[10px] text-[#8A8378]">at cost, varies with usage</span>
                        )}
                      </span>
                    </div>
                    {l.framing && <p className="text-[13.5px] text-[#3a3733] leading-relaxed mb-2">{l.framing}</p>}
                    <ul className="space-y-1">
                      {(l.scope || []).map((b, j) => (
                        <li key={j} className="text-[13px] text-[#3a3733] leading-relaxed pl-4 relative">
                          <span className="absolute left-0 text-[#F5B700]">•</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Totals: three buckets */}
            <div className="mt-6 border-t-2 border-[#161616]/10 pt-4 space-y-3">
              {oneTime > 0 && (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] text-[#3a3733]">Project total</span>
                    <span className="text-[20px] font-black" style={{ fontFamily: 'Georgia, serif' }}>
                      {money(oneTime)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#FFF3CC] border-2 border-[#161616] p-3.5 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] text-[#3a3733]">To start, 50% deposit</span>
                      <span className="text-[15px] font-bold">{money(depositDue)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] text-[#3a3733]">Balance on delivery</span>
                      <span className="text-[15px] font-bold">{money(balanceDue)}</span>
                    </div>
                  </div>
                </>
              )}
              {monthly > 0 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px] text-[#3a3733]">Monthly{hasVariable ? ', estimated' : ''}</span>
                  <span className="text-[16px] font-bold">{money(monthly)}/mo</span>
                </div>
              )}
              {hasVariable && (
                <p className="text-[12px] text-[#8A8378] leading-relaxed">
                  Software and compute is billed at cost and moves with the compute used each month. The
                  monthly figure is an estimate, not a fixed charge.
                </p>
              )}
            </div>

            <h3 className="text-[11px] uppercase tracking-[0.25em] text-[#E0301E] font-bold mt-7 mb-2">Terms</h3>
            <ul className="space-y-1">
              {TERMS.map((t, i) => (
                <li key={i} className="text-[12.5px] text-[#3a3733] leading-relaxed pl-4 relative">
                  <span className="absolute left-0 text-[#F5B700]">•</span>
                  {t}
                </li>
              ))}
            </ul>

            {prose.close && <p className="text-[15px] leading-relaxed mt-6">{prose.close}</p>}
          </div>
        </div>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-[11px] uppercase tracking-[0.25em] text-[#E0301E] font-bold mb-1.5">{title}</h3>
      <p className="text-[14.5px] text-[#3a3733] leading-relaxed whitespace-pre-line">{children}</p>
    </div>
  );
}
