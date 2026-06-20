import Image from 'next/image';
import { byId, isRecurring, isHourly, formatMoney as money, TERMS, type Service } from '@/data/proposal-menu';

/**
 * The shared, on-brand proposal document. Pop-art system: cream + ink,
 * mustard header, Playfair display for names and money, JetBrains mono
 * eyebrows, DM Sans body, hard sticker shadows. Used by the live token
 * proposal and the public sample so they never drift.
 */

export type ProposalLine = { id: string; price: number; qty: number; scope?: string[]; framing?: string };

export type ProposalDocProps = {
  preparedFor?: string;
  siteUrl?: string | null;
  prose: { intro?: string; situation?: string; recommendation?: string; close?: string };
  situationFallback?: string | null;
  lines: ProposalLine[];
  oneTime: number;
  monthly: number;
  depositDue: number;
  balanceDue: number;
  hasVariable: boolean;
  /** Hide dollar figures (used by the public sample so we never publish hard
   * prices that scare off a fit before the call). Shows "Quoted per project"
   * per line and a words-only payment note instead of the totals. */
  hidePrices?: boolean;
};

function linePriceLabel(s: Service, l: ProposalLine, hidePrices = false): string {
  if (s.unit === 'free') return 'Included';
  if (hidePrices) return s.variable ? 'Billed at cost' : 'Quoted per project';
  if (isHourly(s.unit)) return `${money(l.price)}/hr × ${l.qty} = ${money(l.price * l.qty)}`;
  if (isRecurring(s.unit)) return `${money(l.price)}/mo`;
  const base = money(l.price * (l.qty || 1));
  return s.unit === 'fixed_from' ? `from ${base}` : base;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <Eyebrow>{title}</Eyebrow>
      <p className="mt-2 text-[15px] text-[#3a3733] font-body leading-relaxed whitespace-pre-line">{children}</p>
    </div>
  );
}

export default function ProposalDoc({
  preparedFor,
  siteUrl,
  prose,
  situationFallback,
  lines,
  oneTime,
  monthly,
  depositDue,
  balanceDue,
  hasVariable,
  hidePrices = false,
}: ProposalDocProps) {
  const situation = prose.situation || situationFallback || '';

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl overflow-hidden shadow-[6px_6px_0_0_#161616]">
      {/* Pop-art header band with mascot */}
      <div className="relative bg-[#F5B700] border-b-2 border-[#161616] px-8 py-8 text-center overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(22,22,22,0.18) 1.3px, transparent 1.4px)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="relative">
          <Image
            src="/brand/mascot.png"
            alt=""
            width={885}
            height={1180}
            className="h-12 w-auto mx-auto mb-3 drop-shadow-[3px_3px_0_rgba(22,22,22,0.18)]"
          />
          <div className="text-[10px] tracking-[0.4em] uppercase text-[#161616] font-mono font-bold">
            Modern Mustard Seed
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mt-1">
            Proposal
          </h1>
        </div>
      </div>

      <div className="px-7 md:px-9 py-8">
        {preparedFor && <Eyebrow>Prepared for {preparedFor}</Eyebrow>}
        {siteUrl && <p className="text-[13px] text-[#161616]/45 font-mono mt-1 mb-5">{siteUrl}</p>}

        {prose.intro && (
          <p className="text-[16px] text-[#3a3733] font-body leading-relaxed mb-7 mt-3">{prose.intro}</p>
        )}
        {situation && <Section title="Where you are">{situation}</Section>}
        {prose.recommendation && <Section title="What we recommend">{prose.recommendation}</Section>}

        {/* Scope and pricing */}
        <Eyebrow>Scope and pricing</Eyebrow>
        <div className="space-y-4 mt-3.5">
          {lines.map((l, i) => {
            const s = byId(l.id);
            if (!s) return null;
            const scope = l.scope?.length ? l.scope : s.scope ?? [];
            return (
              <div
                key={i}
                className="border-2 border-[#161616] rounded-xl p-5"
                style={{ boxShadow: `inset 6px 0 0 0 ${s.variable ? '#1E50C8' : '#F5B700'}` }}
              >
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="font-display font-black text-[19px] text-[#161616] tracking-tight leading-snug">
                    {s.name}
                  </span>
                  <span className="text-right whitespace-nowrap">
                    <span className="font-display text-[16px] font-black text-[#161616]">
                      {linePriceLabel(s, l, hidePrices)}
                    </span>
                    {s.variable && (
                      <span className="block text-[10px] text-[#161616]/45 font-mono uppercase tracking-wider">
                        at cost, varies with usage
                      </span>
                    )}
                  </span>
                </div>
                {l.framing && (
                  <p className="text-[13.5px] text-[#3a3733] font-body leading-relaxed mb-3">{l.framing}</p>
                )}
                <ul className="space-y-1.5">
                  {scope.map((b, j) => (
                    <li key={j} className="text-[13px] text-[#3a3733] font-body leading-relaxed pl-4 relative">
                      <span className="absolute left-0 text-[#E0301E] font-black">&bull;</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        {hidePrices ? (
          <div className="mt-7 rounded-xl bg-[#FFF3CC] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] p-5">
            <p className="text-[14px] text-[#3a3733] font-body leading-relaxed">
              Every line is quoted per project, in writing, before any work begins. Most builds run on a
              50% deposit to start and the balance on delivery, with software and compute billed at cost.
              You will see your exact, fixed numbers on your own proposal after a free call.
            </p>
          </div>
        ) : (
        <div className="mt-7 space-y-4">
          {oneTime > 0 && (
            <>
              <div className="flex items-baseline justify-between border-t-2 border-[#161616]/10 pt-4">
                <span className="text-[12px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/55">
                  Project total
                </span>
                <span className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
                  {money(oneTime)}
                </span>
              </div>
              <div className="rounded-xl bg-[#FFF3CC] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] p-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-[#3a3733] font-body">To start, 50% deposit</span>
                  <span className="font-display text-[17px] font-black text-[#161616]">{money(depositDue)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-[#3a3733] font-body">Balance on delivery</span>
                  <span className="font-display text-[17px] font-black text-[#161616]">{money(balanceDue)}</span>
                </div>
              </div>
            </>
          )}
          {monthly > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[#3a3733] font-body">
                Monthly{hasVariable ? ', estimated' : ''}
              </span>
              <span className="font-display text-[18px] font-black text-[#161616]">{money(monthly)}/mo</span>
            </div>
          )}
          {hasVariable && (
            <p className="text-[12px] text-[#161616]/45 font-body leading-relaxed">
              Software and compute is billed at cost and moves with the compute used each month. The monthly
              figure is an estimate, not a fixed charge.
            </p>
          )}
        </div>
        )}

        {/* Terms */}
        <div className="mt-8">
          <Eyebrow>Terms</Eyebrow>
          <ul className="space-y-1.5 mt-3">
            {TERMS.map((t, i) => (
              <li key={i} className="text-[12.5px] text-[#3a3733] font-body leading-relaxed pl-4 relative">
                <span className="absolute left-0 text-[#E0301E] font-black">&bull;</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {prose.close && (
          <p className="text-[16px] text-[#3a3733] font-body leading-relaxed mt-7 pt-6 border-t-2 border-[#161616]/10">
            {prose.close}
          </p>
        )}
      </div>
    </div>
  );
}
