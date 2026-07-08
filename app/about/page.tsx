import Link from 'next/link';
import { JsonLd, aboutPageJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'About',
  description:
    'Modern Mustard Seed is a small AI studio. We build AI voice and chat agents, websites, and custom AI tools that grow businesses, shipped in weeks and grounded in faith.',
  path: '/about',
});

// The standard we hold on every build.
const STANDARD: { k: string; v: string }[] = [
  { k: 'Ship complete', v: 'We hand over finished, polished work. No drafts, no almost-done, no "we will fix it later."' },
  { k: 'Design like it matters', v: 'Every screen is held to an Apple and Linear bar. We never ship the generic template look.' },
  { k: 'Honest and flat', v: 'One fixed price, agreed before we build. No surprise invoices, no meter running.' },
  { k: 'You own everything', v: 'The code, the accounts, the keys. When we are done, it is yours, free and clear.' },
];

// The one stack we build on, refined in production every week.
const STACK = ['Next.js', 'React', 'TypeScript', 'Tailwind', 'Supabase', 'Stripe', 'Vercel', 'Trigger.dev', 'Anthropic Claude', 'Gemini', 'Vapi'];

// What we make for the businesses we work with.
const OFFERINGS: { t: string; d: string }[] = [
  { t: 'AI voice + chat agents', d: 'A 24/7 receptionist that answers the phone and books the job, plus a helper that never lets a lead go cold.' },
  { t: 'Websites that sell', d: 'Not a brochure. A clear offer, real proof, and an obvious next step, live in weeks and yours to keep.' },
  { t: 'Custom apps + AI tools', d: 'The one clean tool built for exactly how a business runs, instead of five apps held together by a spreadsheet.' },
  { t: 'The Studio', d: 'Instant, self-serve wow: Sidekick, Pictures, Press, and GEO Desk. Free to try, yours in a click.' },
  { t: 'Mustard Mode', d: 'Rather build it yourself? We coach you to ship with AI, in your own hands, one mission at a time.' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">
      {children}
    </span>
  );
}

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={[
          aboutPageJsonLd(),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'About', url: '/about' },
          ]),
        ]}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 md:px-8">
          {/* ─── Hero ─── */}
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">About</span>
            <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight mb-6">
              Faith Meets{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                Function
              </span>
            </h1>
            <p className="font-body text-lg md:text-xl text-[#3A3733] leading-relaxed max-w-2xl mx-auto">
              We are a small AI studio that builds the tools businesses actually need, and ships them in weeks, not months.
            </p>
          </div>

          {/* ─── Who we are ─── */}
          <div className="space-y-5 text-[#3A3733] font-body text-[17px] leading-relaxed max-w-2xl mx-auto">
            <p>
              Modern Mustard Seed is a small team of builders. Not an agency with a sales floor and a waitlist, and not a freelancer with a template. We design, engineer, and ship real products for real businesses, and we stay close enough to care how every one of them turns out.
            </p>
            <p>
              We build the way AI finally made possible. A focused team with a strong stack and a clear point of view can now deliver what used to take a room of ten. That leverage is the entire point. Our clients do not want a strategy deck. They want the thing built, shipped, and working, and they want it to look and feel like it cost far more than it did.
            </p>
          </div>

          {/* ─── The signature "why" band ─── */}
          <div className="relative mt-16 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-3xl shadow-[6px_6px_0_0_#F5B700] overflow-hidden">
            <div aria-hidden className="absolute inset-0 halftone-bg opacity-[0.15]" />
            <div className="relative p-8 md:p-12">
              <SectionLabel>Why we do this</SectionLabel>
              <p className="font-display text-2xl md:text-4xl font-black tracking-tight leading-[1.12]">
                Good software was priced out of reach for too long. We are here to end that.
              </p>
              <p className="mt-5 text-[#FBF6EA]/80 font-body text-[16px] leading-relaxed max-w-2xl">
                The corner shop. The founder with one real shot. The operator drowning in busywork. They were all told that serious tools were for companies with serious budgets. That is over. Putting an elite product in the hands of someone who was never supposed to be able to afford one is the work we love most. It is the reason we do any of this.
              </p>
            </div>
          </div>

          {/* ─── Faith posture ─── */}
          <div className="mt-16 text-center max-w-2xl mx-auto">
            <SectionLabel>The posture</SectionLabel>
            <p className="font-serif italic text-2xl md:text-3xl font-medium text-[#161616] leading-snug">
              &ldquo;The smallest of all seeds, yet when it is planted it grows into the largest of garden plants.&rdquo;
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#161616]/50 mt-3">Matthew 13:31-32</p>
            <p className="font-body text-[16px] text-[#3A3733] leading-relaxed mt-5">
              Small beginnings, outsized outcomes. Faith and execution in the same hand. That is how we approach every project, every client, and every line of code.
            </p>
          </div>

          {/* ─── The standard (excellence) ─── */}
          <div className="mt-20">
            <div className="text-center mb-8">
              <SectionLabel>The standard we hold</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">Excellence, every time</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {STANDARD.map((s) => (
                <div key={s.k} className="pop-card p-6">
                  <h3 className="font-display text-lg font-black text-[#161616] mb-1.5">{s.k}</h3>
                  <p className="font-body text-[15px] text-[#3A3733] leading-relaxed">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── The stack (tools we use) ─── */}
          <div className="mt-16">
            <div className="text-center mb-6">
              <SectionLabel>The tools we build on</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">One stack, sharpened weekly</h2>
            </div>
            <div className="pop-card p-7 md:p-8">
              <div className="flex flex-wrap justify-center gap-2.5">
                {STACK.map((tool) => (
                  <span
                    key={tool}
                    className="font-mono text-[13px] font-semibold text-[#161616] bg-[#FBF6EA] border-2 border-[#161616] rounded-full px-3.5 py-1.5"
                  >
                    {tool}
                  </span>
                ))}
              </div>
              <p className="font-body text-[15px] text-[#3A3733] leading-relaxed text-center mt-6 max-w-xl mx-auto">
                One refined stack across every engagement, proven in production every single week. We do not chase frameworks. We compound.
              </p>
            </div>
          </div>

          {/* ─── What we build (offer) ─── */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <SectionLabel>What we build</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">The work we offer</h2>
            </div>
            <div className="space-y-3">
              {OFFERINGS.map((o, i) => (
                <div key={o.t} className="pop-card p-6 flex items-start gap-4">
                  <span className="shrink-0 font-mono text-sm font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg w-9 h-9 flex items-center justify-center">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-black text-[#161616] mb-1">{o.t}</h3>
                    <p className="font-body text-[15px] text-[#3A3733] leading-relaxed">{o.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Who we work with ─── */}
          <div className="mt-16 text-center max-w-2xl mx-auto">
            <SectionLabel>Who we work with</SectionLabel>
            <p className="font-body text-[17px] text-[#3A3733] leading-relaxed">
              Founders building something meant to last. Service businesses ready to get out of the inbox. Creators who treat their brand like a moat. People with a clear vision who need a partner that can actually ship.
            </p>
          </div>

          {/* ─── Signed: SAP (Sarah, Anthony & Polly) ─── */}
          <div className="mt-16 text-center">
            <svg viewBox="0 0 200 185" className="w-28 h-auto mx-auto" role="img" aria-label="SAP signature heart">
              <path
                d="M100 165 C 55 130, 18 96, 18 58 C 18 32, 41 16, 65 22 C 83 27, 95 43, 100 59 C 105 43, 117 27, 135 22 C 159 16, 182 32, 182 58 C 182 96, 145 130, 100 165 Z"
                fill="#FFFFFF"
                stroke="#161616"
                strokeWidth="6"
                strokeLinejoin="round"
              />
            </svg>
            <p className="font-serif italic text-4xl font-bold text-[#161616] -mt-3">SAP</p>
            <p className="font-body text-sm text-[#161616]/70 mt-1.5">Sarah, Anthony &amp; Polly   ·   Modern Mustard Seed</p>
          </div>

          {/* ─── CTAs ─── */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/work" className="pop-card p-6 hover:-translate-y-1 transition-transform text-center">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">Work</span>
              <span className="font-display text-base font-black text-[#161616]">See the case studies</span>
            </Link>
            <Link href="/work-with-us" className="pop-card p-6 hover:-translate-y-1 transition-transform text-center">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">Engage</span>
              <span className="font-display text-base font-black text-[#161616]">How we work</span>
            </Link>
            <Link href="/contact" className="pop-card p-6 hover:-translate-y-1 transition-transform text-center">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">Talk</span>
              <span className="font-display text-base font-black text-[#161616]">Book a call</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
