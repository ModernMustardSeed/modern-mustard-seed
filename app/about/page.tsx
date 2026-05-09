import Link from 'next/link';
import StaticBackground from '@/components/StaticBackground';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
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
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'About', url: '/about' },
        ])}
      />
      <StaticBackground />

      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
              About
            </span>
            <h1 className="font-sans text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
              Faith Meets <span className="text-gradient-mustard">Function</span>
            </h1>
          </div>

          <div className="mdx-prose space-y-6">
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

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/case-studies"
              className="glass-card p-6 hover:border-mustard-500/20 transition-all text-center"
            >
              <span className="block text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold mb-2">
                Work
              </span>
              <span className="font-sans text-base font-bold text-white">See the case studies</span>
            </Link>
            <Link
              href="/work-with-us"
              className="glass-card p-6 hover:border-mustard-500/20 transition-all text-center"
            >
              <span className="block text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold mb-2">
                Engage
              </span>
              <span className="font-sans text-base font-bold text-white">How we work</span>
            </Link>
            <Link
              href="/contact"
              className="glass-card p-6 hover:border-mustard-500/20 transition-all text-center"
            >
              <span className="block text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold mb-2">
                Talk
              </span>
              <span className="font-sans text-base font-bold text-white">Book a call</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
