import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { byId, isRecurring, type Service } from '@/data/proposal-menu';
import ProposalDoc from '@/components/ProposalDoc';

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
      'Sign below and we begin the moment the deposit clears. A few weeks later you have a site that gets found and an agent that never misses a call. All of it yours.',
  },
  lines: [
    { id: 'website_build', price: 5750, qty: 1, framing: 'A fast, brand-aligned site built so AI assistants surface Rios Heating & Air when nearby homeowners ask.' },
    { id: 'ai_agent_build', price: 8500, qty: 1, framing: 'A voice agent that answers every call, books the job, and routes the urgent ones, day or night.' },
    { id: 'software_compute', price: 275, qty: 1, framing: 'Keeps the agent, voice minutes, and hosting running. Billed at cost.' },
  ] as Line[],
};

function svc(l: Line): Service | undefined {
  return byId(l.id);
}

export default function SampleProposalPage() {
  const lines = SAMPLE.lines;
  const oneTime = lines.filter((l) => { const s = svc(l); return s && !isRecurring(s.unit) && s.unit !== 'free'; }).reduce((sum, l) => sum + l.price * (l.qty || 1), 0);
  const monthly = lines.filter((l) => { const s = svc(l); return s && isRecurring(s.unit); }).reduce((sum, l) => sum + l.price * (l.qty || 1), 0);
  const depositDue = Math.round(oneTime * 0.5);
  const balanceDue = oneTime - depositDue;
  const hasVariable = lines.some((l) => svc(l)?.variable);

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
        <ProposalDoc
          preparedFor={`${SAMPLE.client_name}, ${SAMPLE.client_company}`}
          siteUrl={SAMPLE.site_url}
          prose={SAMPLE.prose}
          lines={lines}
          oneTime={oneTime}
          monthly={monthly}
          depositDue={depositDue}
          balanceDue={balanceDue}
          hasVariable={hasVariable}
        />

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
