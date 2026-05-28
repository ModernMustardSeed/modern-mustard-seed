import Link from 'next/link';

/**
 * YourSiteWorksForYou. The new flagship-offer pitch. Frames a Modern Mustard
 * Seed site not as a brochure but as a working business engine: AI SDR, built-
 * in funnels, lead magnets, back-office dashboard, and embedded AI agents.
 */
const FEATURES = [
  {
    eyebrow: '01',
    title: 'AI SDR built in',
    body:
      'A sales-development rep that lives inside your site, captures every lead the moment it lands, qualifies it against your real criteria, and routes it into your inbox or CRM with notes. 24/7. Never sleeps. Never lets a warm lead go cold.',
  },
  {
    eyebrow: '02',
    title: 'Full booking system with embedded CRM',
    body:
      'Real-time availability, calendar booking, automated reminders, and a CRM that captures every interaction in one place. Zoho, HubSpot, Acuity, or a custom build. The booking flow and the customer record are one system, not eight tabs.',
  },
  {
    eyebrow: '03',
    title: 'Funnels and lead magnets, live on day one',
    body:
      'Not coming-soon. Live. The site ships with a primary funnel, a secondary funnel for the slower buyer, and at least one lead magnet that converts strangers into your email list. Tested before launch.',
  },
  {
    eyebrow: '04',
    title: 'Restaurants, shops, services, MVPs',
    body:
      'Ordering apps for restaurants. Ecommerce for shops. Booking flows for service businesses. Zero-to-one software for founders building something new. The engine adapts to the vertical. The pattern stays the same.',
  },
  {
    eyebrow: '05',
    title: 'A back office that surfaces the right thing',
    body:
      'One dashboard. Leads, revenue, content queue, social schedule, ops, and inventory in one view. Replace the eight tools you are paying for and barely using. Built for the way you actually work.',
  },
  {
    eyebrow: '06',
    title: 'AI agents on the site AND inside the back office',
    body:
      'Public-facing agents that answer questions, qualify leads, take orders, and recommend next steps. Internal agents that draft your follow-ups, summarize your week, and triage your inbox. The same brain, on both sides of the wall.',
  },
  {
    eyebrow: '07',
    title: 'Innovation as the default, not the upsell',
    body:
      'We ship the build using the latest models, the latest patterns, the latest infrastructure (Next.js 16, Vercel, Anthropic, Gemini, Vapi, multi-agent orchestration). What is bleeding-edge today is the baseline of every engagement.',
  },
  {
    eyebrow: '08',
    title: 'It is yours, fully',
    body:
      'No vendor lock-in, no per-seat fee, no agency retainer required. The code, the database, the deploy, the AI prompts, and every account are transferred to you the day we launch. Hire any other engineer later. Or call us back when you grow.',
  },
];

export default function YourSiteWorksForYou() {
  return (
    <section className="relative w-full px-6 md:px-16 lg:px-24 xl:px-32 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-[10px] uppercase tracking-[0.5em] text-gold-light/85 font-mono font-medium mb-6 block">
            What we actually build
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-medium text-cream-50 tracking-tight leading-[1.05] mb-6">
            Your site should work{' '}
            <span className="text-gradient-brass italic">for you</span>.
          </h2>
          <p className="font-display italic text-xl md:text-2xl text-cream-100/90 font-light leading-snug mb-4">
            Not just sit there looking nice.
          </p>
          <p className="text-cream-100/70 text-base md:text-lg font-body font-light leading-relaxed">
            A Modern Mustard Seed build is not a brochure. It is a working business engine. Booking systems with embedded CRMs. Ordering apps for restaurants. Ecommerce shops. Zero-to-one software for the founder building something new. The site captures leads, qualifies them, runs funnels, hosts the lead magnets, and feeds it all into a back office where you actually run the operation. AI agents live on both sides: in front of customers, and behind the curtain.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-20">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass-card p-8 md:p-10 hover:border-gold-light/30 transition-all duration-500"
            >
              <span className="font-display text-3xl md:text-4xl font-semibold text-gradient-brass tracking-tight block mb-4">
                {f.eyebrow}
              </span>
              <h3 className="font-display text-xl md:text-2xl font-medium text-cream-50 tracking-tight mb-3 leading-snug">
                {f.title}
              </h3>
              <p className="text-cream-100/65 text-sm md:text-base font-body font-light leading-7">
                {f.body}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="font-display italic text-xl md:text-2xl text-cream-100/95 font-light leading-snug mb-3">
            One build. One operator. One engine.
          </p>
          <p className="text-cream-100/65 text-sm md:text-base font-body font-light leading-relaxed mb-10">
            Shipped in 30 days. Yours forever. Most full-service builds fall between $8,500 and $22,000 depending on scope and the depth of the AI work. Audits free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/build-queue"
              className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_55px_rgba(255,107,53,0.55)] transition-all"
            >
              Build my engine
            </Link>
            <Link
              href="/audit"
              className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-cream-100 border border-cream-100/35 rounded-full bg-midnight-700/30 backdrop-blur-sm hover:bg-midnight-700/55 hover:border-cream-100/60 transition-all"
            >
              Run the Free AI Audit
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
