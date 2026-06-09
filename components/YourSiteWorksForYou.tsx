import Link from 'next/link';

/**
 * YourSiteWorksForYou. The new flagship-offer pitch. Frames a Modern Mustard
 * Seed site not as a brochure but as a working business engine: AI SDR, built-
 * in funnels, lead magnets, back-office dashboard, and embedded AI agents.
 */
const FEATURES = [
  {
    title: 'A custom AI chatbot, trained on your business',
    body:
      "Your own AI concierge, built from the ground up on your offers, your content, your voice, and your knowledge base. It greets every visitor, answers questions exactly the way you would, qualifies the lead, and captures the pain point. Not a generic widget and not a copy of ours. Mr. Mustard on this site is ours. Yours is built the same way, trained entirely on you.",
  },
  {
    title: 'AI SDR built in',
    body:
      'A sales-development rep that lives inside your site, captures every lead the moment it lands, qualifies it against your real criteria, and routes it into your inbox or CRM with notes. 24/7. Never sleeps. Never lets a warm lead go cold.',
  },
  {
    title: 'Voice agents that answer the phone',
    body:
      'A 24/7 AI receptionist that picks up every call in a natural, human voice, books appointments, answers your FAQs, and routes the urgent ones straight to you. It never takes a sick day and costs less than a part-time hire. Missed calls stop being lost revenue.',
  },
  {
    title: 'Bespoke booking services with embedded CRM',
    body:
      'Real-time availability, calendar booking, automated reminders, and a CRM that captures every interaction in one place. Zoho, HubSpot, Acuity, or a custom build. The booking flow and the customer record are one system, not eight tabs.',
  },
  {
    title: 'Personalized client care software',
    body:
      'Intake forms that ask the right thing. Onboarding sequences that walk a new client through your process. Status updates that fire automatically. Retention flows that bring them back. Software that treats clients the way you would if you had ten more hours a day.',
  },
  {
    title: 'Funnels and lead magnets, live on day one',
    body:
      'Not coming-soon. Live. The site ships with a primary funnel, a secondary funnel for the slower buyer, and at least one lead magnet that converts strangers into your email list. Tested before launch.',
  },
  {
    title: 'Verticals: shops, restaurants, academies, studios, command centers',
    body:
      'Ordering apps for restaurants. Ecommerce for shops. Custom courses and academies. Rendering studios. Ad command centers. Zero-to-one software for founders building something new. The engine adapts to the vertical. The pattern stays the same.',
  },
  {
    title: 'A back office that surfaces the right thing',
    body:
      'One dashboard. Leads, revenue, content queue, social schedule, ops, and inventory in one view. Replace the eight tools you are paying for and barely using. Built for the way you actually work.',
  },
  {
    title: 'AI agents on the site AND inside the back office',
    body:
      'Public-facing agents that answer questions, qualify leads, take orders, and recommend next steps. Internal agents that draft your follow-ups, summarize your week, and triage your inbox. The same brain, on both sides of the wall.',
  },
  {
    title: 'Innovation as the default, not the upsell',
    body:
      'We ship the build using the latest models, the latest patterns, the latest infrastructure (Next.js 16, Vercel, Anthropic, Gemini, Vapi, multi-agent orchestration). What is bleeding-edge today is the baseline of every engagement.',
  },
  {
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
          <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
            What we actually build
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.05] mb-6">
            Your site should work{' '}
            <span className="text-[#F5B700] italic" style={{ WebkitTextStroke: '2px #161616' }}>
              for you
            </span>
          </h2>
          <p className="font-display italic font-bold text-xl md:text-2xl text-[#161616] leading-snug mb-4">
            Not just sit there looking nice
          </p>
          <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed mb-5">
            A Modern Mustard Seed build is not a brochure. It is a working business engine. Bespoke booking with embedded CRM. Personalized client care software. A custom AI chatbot trained on your own business. Voice agents that answer the phone 24/7. Ordering apps for restaurants. Ecommerce shops. Custom courses, academies, rendering studios, ad command centers. Zero-to-one software for the founder building something new.
          </p>
          <p className="font-display italic font-bold text-xl md:text-2xl text-[#E0301E] leading-snug">
            What is your pain point? Let us fix it.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-20">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="pop-card p-8 md:p-10 hover:-translate-y-1 transition-transform duration-300">
              <span className="font-display text-3xl md:text-4xl font-black text-[#F5B700] tracking-tight block mb-4" style={{ WebkitTextStroke: '1.5px #161616' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-3 leading-snug">
                {f.title}
              </h3>
              <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">{f.body}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="font-display italic font-bold text-xl md:text-2xl text-[#161616] leading-snug mb-3">
            One build. One operator. One engine.
          </p>
          <p className="text-[#3a3733] text-sm md:text-base font-body leading-relaxed mb-10">
            Shipped in 30 days. Yours forever. Start with a free audit, then we scope the build around what moves your numbers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/build-queue"
              className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Build my engine
            </Link>
            <Link
              href="/audit"
              className="px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Run the Bottleneck Breaker
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
