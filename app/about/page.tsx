import Link from 'next/link';
import { JsonLd, aboutPageJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'About',
  description:
    'Modern Mustard Seed is a one-person AI studio founded by Sarah Scarano. We build AI products that grow businesses, grounded in faith.',
  path: '/about',
});

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
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
              About
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight mb-6">
              Faith Meets{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                Function
              </span>
            </h1>
          </div>

          <div className="mdx-prose mdx-prose-pop space-y-6">
            <p>
              Modern Mustard Seed is a one-person AI studio. I am Sarah Scarano, the founder, the engineer, the strategist, and (when needed) the one on the call. I have shipped 40+ products across AI, e-commerce, real estate, hospitality, and SaaS, and I run four ventures from this same desk.
            </p>
            <p>
              The premise is simple: AI has collapsed the cost of building software. The result is that one operator-engineer with a strong stack and a clear point of view can deliver what used to take a team of ten. The clients I work with want that leverage. They want their product shipped, not their strategy decked.
            </p>
            <h2>The stack</h2>
            <p>
              Next.js, React, TypeScript, Tailwind, Supabase, Stripe, Vercel, Trigger.dev, OpenAI, Anthropic, Gemini, Vapi. Same stack across every engagement, refined in production every week. We do not chase frameworks. We compound.
            </p>
            <h2>The posture</h2>
            <p>
              The name comes from Matthew 13:31-32. The mustard seed is the smallest of all seeds, and yet when planted, grows to be the largest of garden plants. Faith and execution. Quiet beginnings, exponential outcomes. That is how we approach every project, every client, every line of code.
            </p>
            <h2>Who we work with</h2>
            <p>
              Founders building something they want to last. Service businesses ready to remove themselves from the inbox. Creators who treat their brand like a moat. People who have a clear vision and need a partner who can ship.
            </p>
          </div>

          {/* Signed: SAP (Sarah, Anthony & Polly) */}
          <div className="mt-14 text-center">
            <svg viewBox="0 0 250 150" className="w-44 h-auto mx-auto" role="img" aria-label="SAP signature">
              <path
                d="M 122 118 C 92 86, 58 78, 64 46 C 70 22, 108 26, 122 58 C 136 26, 174 22, 180 46 C 186 78, 152 86, 118 122 C 150 152, 208 134, 230 104"
                fill="none"
                stroke="#E0301E"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="font-serif italic text-4xl font-bold text-[#161616] -mt-3">SAP</p>
            <p className="font-body text-sm text-[#161616]/70 mt-1.5">
              Sarah, Anthony &amp; Polly   ·   Modern Mustard Seed
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/work" className="pop-card p-6 hover:-translate-y-1 transition-transform text-center">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">
                Work
              </span>
              <span className="font-display text-base font-black text-[#161616]">See the case studies</span>
            </Link>
            <Link href="/work-with-us" className="pop-card p-6 hover:-translate-y-1 transition-transform text-center">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">
                Engage
              </span>
              <span className="font-display text-base font-black text-[#161616]">How we work</span>
            </Link>
            <Link href="/contact" className="pop-card p-6 hover:-translate-y-1 transition-transform text-center">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">
                Talk
              </span>
              <span className="font-display text-base font-black text-[#161616]">Book a call</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
