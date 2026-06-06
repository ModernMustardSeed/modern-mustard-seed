import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { byId, isRecurring, isHourly, formatMoney as money, TERMS, type Service } from '@/data/proposal-menu';

export const metadata = buildMetadata({
  title: 'See a Sample Proposal',
  description:
    'A real example of a Modern Mustard Seed proposal. See exactly what you get: clear scope, deliverables, three-bucket pricing, and one-tap sign and pay.',
  path: '/sample-proposal',
});

type Line = { id: string; price: number; qty: number; scope: string[]; framing?: string };

const SAMPLE = {
  client_name: 'Dave Rios',
  client_company: 'Rios Heating & Air',
  site_url: 'riosheatingair.com',
  prose: {
    intro:
      'Hey Dave, thanks for the call. Here is exactly what we would build to get Rios Heating & Air found, answered, and booked, with no surprises on scope or price.',
    situation:
      'You are on a Wix site that no AI assistant surfaces, so when a homeowner asks ChatGPT or Google for HVAC nearby, you are invisible. Your reviews are great, but new customers cannot find you, and after-hours calls go to voicemail.',
    recommendation:
      'Rebuild the site for AI discovery from the first line, then put an agent on the phones so no call is missed. The software line keeps the agent and tools running, billed at cost.',
    close:
      'Sign below and we begin the moment the deposit clears. Thirty days later you have a site that gets found and an agent that never misses a call. All of it yours.',
  },
  lines: [
    { id: 'website_build', price: 5750, qty: 1, framing: 'A fast, brand-aligned site built so AI assistants surface Rios Heating & Air when nearby homeowners ask.' },
    { id: 'ai_agent_build', price: 8500, qty: 1, framing: 'A voice agent that answers every call, books the job, and routes the urgent ones, day or night.' },
    { id: 'software_compute', price: 275, qty: 1, framing: 'Keeps the agent, voice minutes, and hosting running. Billed at cost.' },
  ] as Line[],
};

function withScope(l: Line): Line & { service: Service | undefined } {
  const s = byId(l.id);
  return { ...l, scope: l.scope?.length ? l.scope : s?.scope ?? [], service: s };
}

function linePriceLabel(s: Service, l: Line): string {
  if (s.unit === 'free') return 'Included';
  if (isHourly(s.unit)) return `${money(l.price)}/hr × ${l.qty} = ${money(l.price * l.qty)}`;
  if (isRecurring(s.unit)) return `${money(l.price)}/mo`;
  const base = money(l.price * (l.qty || 1));
  return s.unit === 'fixed_from' ? `from ${base}` : base;
}

export default function SampleProposalPage() {
  const lines = SAMPLE.lines.map(withScope);
  const oneTime = lines.filter((l) => l.service && !isRecurring(l.service.unit) && l.service.unit !== 'free').reduce((s, l) => s + l.price * (l.qty || 1), 0);
  const monthly = lines.filter((l) => l.service && isRecurring(l.service.unit)).reduce((s, l) => s + l.price * (l.qty || 1), 0);
  const depositDue = Math.round(oneTime * 0.5);
  const balanceDue = oneTime - depositDue;
  const hasVariable = lines.some((l) => l.service?.variable);

  return (
    <main className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-28 pb-24 px-5">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: 'Sample Proposal', url: '/sample-proposal' }])} />
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
      <div className="relative max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <span className="inline-block text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-4 py-1.5">
            Sample · this is what you get
          </span>
        </div>

        {/* Doc */}
        <div className="bg-white border-2 border-[#161616] rounded-2xl overflow-hidden shadow-[6px_6px_0_0_#161616]">
          <div className="bg-[#F5B700] px-8 py-7 text-center border-b-2 border-[#161616]">
            <div className="text-[10px] tracking-[0.4em] uppercase text-[#161616] font-extrabold">Modern Mustard Seed</div>
            <div className="text-[#161616] text-sm italic font-bold mt-2" style={{ fontFamily: 'Georgia, serif' }}>
              Proposal
            </div>
          </div>
          <div className="px-8 py-8">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#E0301E] font-bold mb-1">
              Prepared for {SAMPLE.client_name}, {SAMPLE.client_company}
            </p>
            <p className="text-[13px] text-[#8A8378] mb-4">{SAMPLE.site_url}</p>

            <p className="text-[15px] leading-relaxed mb-5">{SAMPLE.prose.intro}</p>
            <Section title="Where you are">{SAMPLE.prose.situation}</Section>
            <Section title="What we recommend">{SAMPLE.prose.recommendation}</Section>

            <h3 className="text-[11px] uppercase tracking-[0.25em] text-[#E0301E] font-bold mt-7 mb-3">Scope and pricing</h3>
            <div className="space-y-4">
              {lines.map((l, i) => {
                const s = l.service;
                if (!s) return null;
                return (
                  <div key={i} className="border-2 border-[#161616] rounded-lg p-4">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="font-black text-[16px]" style={{ fontFamily: 'Georgia, serif' }}>{s.name}</span>
                      <span className="text-right whitespace-nowrap">
                        <span className="text-[14px] font-semibold">{linePriceLabel(s, l)}</span>
                        {s.variable && <span className="block text-[10px] text-[#8A8378]">at cost, varies with usage</span>}
                      </span>
                    </div>
                    {l.framing && <p className="text-[13.5px] text-[#3a3733] leading-relaxed mb-2">{l.framing}</p>}
                    <ul className="space-y-1">
                      {l.scope.map((b, j) => (
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

            <div className="mt-6 border-t-2 border-[#161616]/10 pt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] text-[#3a3733]">Project total</span>
                <span className="text-[20px] font-black" style={{ fontFamily: 'Georgia, serif' }}>{money(oneTime)}</span>
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
              {monthly > 0 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px] text-[#3a3733]">Monthly{hasVariable ? ', estimated' : ''}</span>
                  <span className="text-[16px] font-bold">{money(monthly)}/mo</span>
                </div>
              )}
              {hasVariable && (
                <p className="text-[12px] text-[#8A8378] leading-relaxed">
                  Software and compute is billed at cost and moves with the compute used each month. The monthly figure is an estimate, not a fixed charge.
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
            <p className="text-[15px] leading-relaxed mt-6">{SAMPLE.prose.close}</p>
          </div>
        </div>

        {/* Sample sign/pay preview (disabled) */}
        <div className="mt-6 pop-card p-7 text-center">
          <h2 className="font-display text-xl font-black text-[#161616] mb-1">On a real proposal, you sign and pay right here</h2>
          <p className="text-[#3a3733] text-sm font-body mb-5">
            Type your name to sign, pay the 50% deposit, and your project space goes live instantly. This is a sample, so the buttons are off.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center opacity-60 pointer-events-none mb-6">
            <span className="px-6 py-3 rounded-lg text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616]">Sign and accept</span>
            <span className="px-6 py-3 rounded-lg text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] border-2 border-[#161616]">Pay deposit to begin</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/website-audit" className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">
              Start with a free audit
            </Link>
            <Link href="/build-queue" className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">
              Get your own proposal
            </Link>
          </div>
        </div>
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
