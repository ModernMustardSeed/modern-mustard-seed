import Link from '@/components/AttributionLink';
import { JsonLd, aboutPageJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import SarahPortrait from '@/components/sarah/SarahPortrait';

export const metadata = buildMetadata({
  title: 'Sarah and Anthony Scarano, the AI Studio Serving Businesses Nationwide',
  description:
    'Meet the team at Modern Mustard Seed: Sarah Scarano, founder, designer and engineer, and Anthony Scarano, who leads sales and marketing. A design and AI product studio in Kalispell building websites, AI voice agents and custom software for clients nationwide.',
  path: '/about',
});

// The about page wears the homepage's Flathead editorial grammar (Sarah,
// 2026-10-05): cream ground, ruled eyebrows, Instrument Serif with the blue
// italic, the gold-topped card and one dark ink band. It speaks in the first
// person, as the studio.

// The standard we hold on every build.
const STANDARD: { k: string; v: string }[] = [
  { k: 'Ship complete', v: 'We hand over finished, polished work. No drafts, no almost-done, no "we will fix it later."' },
  { k: 'Design like it matters', v: 'Every screen is held to an Apple and Linear bar. We never ship the generic template look.' },
  { k: 'Honest and flat', v: 'One set package price, agreed before we build. Refinements to what we built are included.' },
  { k: 'You own everything', v: 'The code, the accounts, the keys. When we are done, it is yours, free and clear.' },
];

// What we build: the same six doors as the site menu.
const OFFERS: { t: string; d: string; href: string }[] = [
  { t: 'AI For Your Business', d: 'AI websites, receptionists and agents that answer, book and follow up.', href: '/ai' },
  { t: 'Websites And Brand', d: 'Design-led, built to be found, with a clear offer and an obvious next step.', href: '/websites' },
  { t: 'Voice Agents', d: 'A phone line that answers every call, day and night, and books the job.', href: '/voice-agents' },
  { t: 'Custom Software', d: 'The one clean tool built for exactly how your business runs.', href: '/services' },
  { t: 'Marketing', d: 'Social, blog, ads and email, written in your voice and published on schedule.', href: '/marketing' },
  { t: 'Advisory', d: 'Retained counsel by the quarter on what to build and where agents belong.', href: '/advisory' },
];

// The one stack we build on, refined in production every week.
const STACK = ['Next.js', 'React', 'TypeScript', 'Tailwind', 'Supabase', 'Stripe', 'Vercel', 'Trigger.dev', 'Anthropic Claude', 'Gemini', 'Vapi'];

// The global theme sets every <p> in main to the body face; serif lines say so inline.
const SERIF = { fontFamily: 'var(--font-flathead-display), Georgia, serif' };

function Overline({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={`inline-block border-t pt-1.5 mb-6 text-[10px] font-bold uppercase tracking-[0.17em] leading-relaxed ${
        light ? 'border-[#f5b700]/60 text-[#f5b700]' : 'border-[#103c54]/60 text-[#103c54]'
      }`}
    >
      {children}
    </p>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between gap-7 min-h-[44px] border-b border-[#103c54]/30 py-1.5 text-[13px] font-semibold text-[#103c54] hover:text-[#1e50c8] hover:border-[#1e50c8] transition-colors"
    >
      {children}
      <span aria-hidden="true" className="text-xl leading-none">↗</span>
    </Link>
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
      <div data-studio-page="about" className="relative min-h-screen bg-[#fcf8eb] text-[#103c54] overflow-x-clip">
        {/* ─── Hero: the builder ─── */}
        <section className="px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))] pt-32 md:pt-40 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-14 lg:gap-24 items-center">
            <div>
              <Overline>About the studio</Overline>
              <h1 className="text-[clamp(52px,6.4vw,92px)] leading-[0.98]">
                Faith meets <em>function.</em>
              </h1>
              <p style={SERIF} className="text-[24px] md:text-[28px] leading-[1.35] mt-8 max-w-[520px]">
                A direct line to the builder.
              </p>
              <div className="mt-6 space-y-4 text-[16px] leading-[1.85] max-w-[540px]">
                <p>
                  I&apos;m Sarah Scarano, founder, designer and engineer of Modern Mustard Seed. You work with the person who designs it and the person who builds it, from the first conversation to the finished detail.
                </p>
                <p>
                  We are a boutique design and agentic systems studio in Kalispell, Montana, building websites and brand, custom software and voice agents for businesses across the United States.
                </p>
              </div>
              <div className="flex flex-wrap gap-x-10 gap-y-2 mt-9">
                <TextLink href="/sarahscarano">See my portfolio</TextLink>
                <TextLink href="/book">Book a call</TextLink>
              </div>
            </div>
            <SarahPortrait
              priority
              caption="Sarah Scarano · Founder · Kalispell, Montana"
              className="w-full max-w-[420px] justify-self-center lg:justify-self-end"
            />
          </div>
        </section>

        {/* ─── The team (2026-10-09): Sarah builds, Anthony runs sales and marketing ─── */}
        <section id="team" className="px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))] pb-20 md:pb-28" aria-labelledby="team-title">
          <Overline>The team</Overline>
          <h2 id="team-title" className="text-[clamp(38px,4.4vw,64px)] max-w-[900px]">
            Two people, one studio. <em>A direct line to both.</em>
          </h2>
          <div className="mt-10 overflow-hidden rounded-[4px] border border-[#141210] bg-white">
            <img src="/storybook/team-duo-1600.webp" srcSet="/storybook/team-duo-800.webp 800w, /storybook/team-duo-1600.webp 1600w" sizes="(min-width: 1200px) 1200px, 92vw" width={1600} height={1067} loading="lazy" decoding="async" alt="Sarah and Anthony stand side by side in the sunny studio, surrounded by mustard flowers and the cheering seed crew." className="w-full h-auto" />
          </div>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <article className="rounded-[4px] border border-[#141210] bg-white p-6">
              <p className="font-mono uppercase text-[11px] tracking-[.14em]">Founder / Design and engineering</p>
              <h3 className="mt-2 text-[30px]">Sarah Scarano</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-[#4a4339]">Sarah designs and builds every website, voice agent and system we ship. Creative direction and engineering in one person, from the first conversation to the finished detail.</p>
              <Link href="/sarahscarano" className="mt-4 inline-block font-bold border-b-2 border-[#f5b700]">Meet Sarah ↗</Link>
            </article>
            <article className="rounded-[4px] border border-[#141210] bg-white p-6">
              <p className="font-mono uppercase text-[11px] tracking-[.14em]">Sales / Marketing</p>
              <h3 className="mt-2 text-[30px]">Anthony Scarano</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-[#4a4339]">Anthony Scarano leads sales and marketing. He helps you choose the right build, then keeps your marketing moving once it is live.</p>
              <Link href="/book" className="mt-4 inline-block font-bold border-b-2 border-[#f5b700]">Book a call ↗</Link>
            </article>
          </div>
        </section>

        {/* ─── Why we do this: the ink band ─── */}
        <section className="relative bg-[#103c54] text-[#fcf8eb] overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.16) 1.3px, transparent 1.4px)', backgroundSize: '18px 18px' }}
          />
          <div className="relative px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))] py-20 md:py-28 grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-24 items-end">
            <div>
              <Overline light>Why we do this</Overline>
              <h2 className="!text-[#fcf8eb] text-[clamp(38px,4.4vw,64px)]">
                Good software was priced out of reach for too long. <em className="!text-[#f5b700]">We are here to end that.</em>
              </h2>
            </div>
            <p className="!text-[#fcf8eb]/80 text-[16px] leading-[1.9]">
              The corner shop. The founder with one real shot. The operator drowning in busywork. They were all told that serious tools were for companies with serious budgets. That is over. Putting an elite product in the hands of someone who was never supposed to afford one is the work we love most.
            </p>
          </div>
        </section>

        {/* ─── The standard ─── */}
        <section className="px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))] py-20 md:py-28">
          <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-10 lg:gap-24">
            <div>
              <Overline>The standard we hold</Overline>
              <h2 className="text-[clamp(42px,4.2vw,62px)]">
                Excellence, <em>every time.</em>
              </h2>
              <p className="mt-6 text-[16px] leading-[1.85] max-w-[380px]">
                Small beginnings, outsized outcomes. Faith and execution in the same hand, on every project and every line of code.
              </p>
            </div>
            <ol className="grid sm:grid-cols-2 border-t border-[#103c54]/20">
              {STANDARD.map((s, i) => (
                <li key={s.k} className={`py-8 border-b border-[#103c54]/20 ${i % 2 === 0 ? 'sm:pr-10' : 'sm:pl-10 sm:border-l'}`}>
                  <span className="font-display text-[15px] text-[#1e50c8]">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="text-[28px] leading-tight mt-2">{s.k}</h3>
                  <p className="mt-2.5 text-[15px] leading-[1.8] text-[#103c54]/85">{s.v}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── What we build ─── */}
        <section className="bg-[#f3ecd5] px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))] py-20 md:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div>
              <Overline>What we build</Overline>
              <h2 className="text-[clamp(42px,4.2vw,62px)]">
                Six doors, <em>one standard.</em>
              </h2>
            </div>
            <TextLink href="/work">See the work</TextLink>
          </div>
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 border-t border-[#103c54]/25">
            {OFFERS.map((o) => (
              <li key={o.href} className="border-b border-[#103c54]/25">
                <Link href={o.href} className="group flex h-full flex-col py-8 md:pr-10">
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="font-display text-[30px] leading-tight group-hover:text-[#1e50c8] transition-colors">{o.t}</span>
                    <span aria-hidden="true" className="text-xl group-hover:text-[#1e50c8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition">↗</span>
                  </span>
                  <span className="mt-2.5 text-[15px] leading-[1.75] text-[#103c54]/80">{o.d}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ─── The verse ─── */}
        <section className="px-[6%] py-20 md:py-28 text-center">
          <blockquote className="max-w-[820px] mx-auto">
            <p style={SERIF} className="italic text-[clamp(30px,3.4vw,46px)] leading-[1.25] text-[#103c54]">
              &ldquo;If you have faith as small as a mustard seed, nothing will be impossible for you.&rdquo;
            </p>
            <footer className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#103c54]/60">Matthew 17:20</footer>
          </blockquote>
        </section>

        {/* ─── Tools, who we work with, the signature ─── */}
        <section className="px-[6%] lg:px-[max(6%,calc((100vw-1200px)/2))] pb-24 md:pb-32">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-24 border-t border-[#103c54]/20 pt-14">
            <div>
              <Overline>The tools we build on</Overline>
              <p style={SERIF} className="text-[26px] md:text-[30px] leading-[1.35]">
                {STACK.join(' · ')}
              </p>
              <p className="mt-5 text-[15px] leading-[1.85] text-[#103c54]/85 max-w-[460px]">
                One refined stack across every engagement, proven in production every week. We do not chase frameworks. We compound.
              </p>
            </div>
            <div>
              <Overline>Who we work with</Overline>
              <p className="text-[16px] leading-[1.9]">
                Founders building something meant to last. Service businesses ready to get out of the inbox. Creators who treat their brand like a moat. People with a clear vision who need a partner that can actually ship.
              </p>
              <p style={SERIF} className="italic text-[44px] leading-none mt-10">With love, Sarah</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#103c54]/60">Modern Mustard Seed</p>
            </div>
          </div>

          <p className="mt-16 text-[15px] leading-[1.85] text-[#103c54]/85 max-w-[760px]">
            Read our <Link href="/resources" className="underline decoration-[#103c54]/40 underline-offset-4 hover:text-[#1e50c8]">technical field notes</Link>, see how we build <Link href="/agentic-websites" className="underline decoration-[#103c54]/40 underline-offset-4 hover:text-[#1e50c8]">agentic websites</Link>, or visit our <Link href="/montana/kalispell" className="underline decoration-[#103c54]/40 underline-offset-4 hover:text-[#1e50c8]">Kalispell studio</Link>.
          </p>
          <div className="flex flex-wrap gap-x-10 gap-y-2 mt-8">
            <TextLink href="/work">See the case studies</TextLink>
            <TextLink href="/work-with-us">How we work</TextLink>
            <TextLink href="/book">Book a call</TextLink>
          </div>
        </section>
      </div>
    </>
  );
}
