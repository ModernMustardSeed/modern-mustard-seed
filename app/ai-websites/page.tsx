import Link from '@/components/AttributionLink';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, serviceJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { SITE_RUNGS, DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';

const description = 'AI-native website design from Kalispell, Montana. Custom websites, shared-brain voice agents and AI search foundations for businesses nationwide.';
export const metadata = buildMetadata({ title: 'AI Website Design in Montana, Built in Kalispell', description, path: '/ai-websites' });
const linkStyle = 'font-bold text-[#1E50C8] underline decoration-2 underline-offset-4';

export default function AIWebsitesPage() {
  return (
    <article className="bg-[#FBF6EA] text-[#161616] pt-28 md:pt-40 pb-20">
      <JsonLd data={[
        webPageJsonLd({ path: '/ai-websites', name: 'AI Website Design in Montana', description }),
        serviceJsonLd({ path: '/ai-websites', name: 'AI-native website design and development', description }),
        breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: 'AI Websites', url: '/ai-websites' }]),
      ]} />
      <header className="max-w-6xl mx-auto px-6 pb-16">
        <p className="font-mono text-xs tracking-widest uppercase font-bold text-[#C4160B]">Built in Kalispell · Working nationwide</p>
        <div className="mt-6 grid lg:grid-cols-[1.3fr_1fr] gap-10 items-end">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.02]">An AI website should<br /><em>carry its share.</em></h1>
            <p className="mt-6 text-lg leading-relaxed max-w-2xl">Modern Mustard Seed is an AI-native product studio in Kalispell, Montana. We build custom websites that explain your business clearly, connect the enquiry to the next job, and work with the systems behind the counter.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/demos" className="pop-card-yellow px-6 py-4 font-bold">Build My Free Demo</Link>
              <Link href="/book" className="pop-card px-6 py-4 font-bold">Talk With Sarah</Link>
            </div>
          </div>
          <aside className="pop-card p-7 md:p-9 rotate-1">
            <p className="font-mono text-xs font-bold uppercase text-[#C4160B]">The test we build around</p>
            <p className="font-display text-3xl font-bold mt-4">A customer arrives.<br />What happens next?</p>
            <p className="mt-5 leading-relaxed">A roofer needs the address, the roof problem and permission to call back. A lodge needs dates and a real availability check. A studio needs a useful brief. Start with that handoff. Then decide where AI earns its place.</p>
          </aside>
        </div>
      </header>

      <section className="border-y-2 border-[#161616] bg-white py-14">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-black">Two meanings. Both need doing properly.</h2>
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="pop-card-cream p-7"><h3 className="font-display text-2xl font-bold">AI-optimized: understandable from the outside.</h3><p className="mt-4 leading-relaxed">An AI-optimized website gives search engines and retrieval systems clear, accessible evidence about a business. That means useful visible copy, crawlable pages, accurate structured data, a consistent identity and links to real work. Adding a chatbot does not do this job.</p></div>
            <div className="pop-card-yellow p-7"><h3 className="font-display text-2xl font-bold">AI-native: useful on the inside.</h3><p className="mt-4 leading-relaxed">We use AI-native to describe a website designed around AI-assisted workflows from the start. A visitor can explain a job, get an answer from approved business information, and reach the right next step. The data model, permissions and human handoff are part of the build.</p></div>
          </div>
          <p className="mt-7 max-w-3xl leading-relaxed">These are working definitions, not certification labels. A traditional website can be fast, accessible and excellent at converting visitors. AI earns its place when it handles a specific task better. Our <Link href="/blog/ai-native-website-vs-traditional-website" className={linkStyle}>website comparison</Link> shows the difference using an actual customer journey.</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12">
        <div><p className="font-mono text-xs font-bold text-[#C4160B] uppercase">The Talking Website</p><h2 className="font-display text-3xl md:text-4xl font-black mt-3">The page and the phone should agree.</h2><p className="mt-5 leading-relaxed">Change a service area once. The website should describe the same boundary the receptionist uses to qualify a caller. Change a booking rule once. Both channels should hand the customer to the same process.</p><p className="mt-4 leading-relaxed"><Link href="/talking-website" className={linkStyle}>The Talking Website</Link> combines a custom site and an AI voice agent around one shared business brain. It connects the answers people read with the answers callers hear. The <Link href="/voice-agents" className={linkStyle}>voice agent</Link> can also be a separate product for a business with an existing website.</p></div>
        <div className="bg-[#161616] text-[#FBF6EA] p-8 rounded-2xl border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700]"><h3 className="font-display text-2xl font-bold">One brain needs boundaries.</h3><p className="mt-5 leading-relaxed">An answer about your published services is different from a promise that a crew will arrive tomorrow. We scope which facts the assistant can quote, which systems it can read, which actions it can take and when it must hand off to a person.</p><p className="mt-4 leading-relaxed">A booking only counts when the booking system confirms it. A lead only counts when it is saved. The conversation is the front end. The verified action is the product.</p></div>
      </section>

      <section className="border-y-2 border-[#161616] bg-white py-16">
        <div className="max-w-6xl mx-auto px-6"><h2 className="font-display text-3xl md:text-4xl font-black">Found, understood, then chosen.</h2><p className="mt-5 max-w-3xl leading-relaxed">GEO means generative engine optimization. AEO means answer engine optimization. Both concern how a business becomes understandable in answer-based search. Our work starts with ordinary engineering and useful evidence, not a special file that makes an assistant recommend you.</p>
          <ol className="mt-8 grid md:grid-cols-2 gap-6 list-decimal list-inside">
            {[
              ['Make the pages reachable.', 'Public HTML, correct status codes, intentional robots rules, clean canonicals and a sitemap of real pages.'],
              ['Say what the business actually does.', 'One name, real contact details, a real base in Kalispell, defined services and honest service areas.'],
              ['Give the answer somewhere to point.', 'Specific service explanations, author-attributed resources, functioning examples and evidence with a source.'],
              ['Measure the handoff.', 'Track identifiable AI referrals through demo requests, enquiries and bookings. Separate visits from citations and revenue.'],
            ].map(([title, text]) => <li key={title} className="pop-card p-6 font-bold"><h3 className="inline">{title}</h3><p className="mt-3 font-normal leading-relaxed">{text}</p></li>)}
          </ol>
          <p className="mt-8 leading-relaxed">Start with the <Link href="/blog/ai-readable-website-checklist" className={linkStyle}>technical checklist</Link> or run the existing <Link href="/website-audit" className={linkStyle}>GEO Desk website audit</Link>. Google says its AI search features use existing SEO foundations and require no special AI markup. <a href="https://developers.google.com/search/docs/appearance/ai-features" target="_blank" rel="noopener noreferrer" className={linkStyle}>Read Google&apos;s guidance</a>.</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-display text-3xl md:text-4xl font-black">Pick the build that fits the business.</h2>
        <p className="mt-5 max-w-3xl leading-relaxed">The productized website has three published sizes. Every page needs its own reason to exist. A larger package is room for useful service detail and proof, not permission to duplicate a paragraph across fifty towns.</p>
        <div className="mt-8 grid md:grid-cols-3 gap-6">{Object.values(SITE_RUNGS).map((rung) => <div key={rung.key} className="pop-card p-6"><h3 className="font-display text-2xl font-bold">{rung.label}</h3><p className="mt-5 font-bold">Website: {formatUsd(rung.setupCents)} setup + {formatUsd(rung.monthlyCents)}/month</p><p className="mt-3">Talking Website: {formatUsd(rung.bundleSetupCents)} setup + {formatUsd(rung.bundleMonthlyCents)}/month</p></div>)}</div>
        <p className="mt-6 leading-relaxed">Website packages include domain, hosting, care and unlimited edits to existing pages. Productized plans are month to month. The standalone Voice Agent is {formatUsd(DEMO_PRODUCTS.voice.setupCents)} setup + {formatUsd(DEMO_PRODUCTS.voice.monthlyCents)}/month. See <Link href="/websites" className={linkStyle}>website package details</Link> for page scope and delivery terms.</p>
        <p className="mt-4 leading-relaxed">Custom applications, AI automation, CRM and workflow systems, lead-generation systems, agentic infrastructure, branding and rebranding are scoped as <Link href="/services" className={linkStyle}>custom engagements</Link> at a set package price. The <Link href="/command-center" className={linkStyle}>Command Center</Link> is a separate product. It is not included in the Talking Website bundle.</p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-14 grid md:grid-cols-2 gap-10">
        <div><h2 className="font-display text-3xl font-black">Built for owners with work to do.</h2><p className="mt-5 leading-relaxed">Service businesses, hospitality operators, retailers and founders with a defined customer problem. Especially the operator building a second business who needs the product built without assembling an engineering team. Explore the <Link href="/for" className={linkStyle}>industries we build for</Link>.</p><p className="mt-4 leading-relaxed">Productized websites usually go live about a week after kickoff. Custom builds have a scoped delivery schedule. You receive the repository, accounts and documentation. Changes to what we built are included. A new deliverable is a separately scoped engagement.</p></div>
        <div><h2 className="font-display text-3xl font-black">Meet the builder. Inspect the work.</h2><p className="mt-5 leading-relaxed"><Link href="/about" className={linkStyle}>Sarah Scarano</Link> founded MMS and builds from <Link href="/montana/kalispell" className={linkStyle}>Kalispell</Link>. We serve <Link href="/montana" className={linkStyle}>Northwest Montana</Link> and work remotely with clients nationwide.</p><p className="mt-4 leading-relaxed">The <Link href="/work/cross-and-covenant" className={linkStyle}>Cross + Covenant storefront</Link> shows commerce and brand work. The <Link href="/work/wild-daisy-command-center" className={linkStyle}>Wild Daisy build record</Link> describes an operations system. Read the scope and evidence in <Link href="/work" className={linkStyle}>our work</Link>, then judge a demo built for your business.</p></div>
      </section>
      <section className="bg-[#F5B700] border-y-2 border-[#161616] px-6 py-14 text-center"><h2 className="font-display text-3xl md:text-4xl font-black">Put your business in the driver&apos;s seat.</h2><p className="mt-4">See a working website and voice-agent demo before you buy. No card required.</p><div className="mt-7 flex flex-wrap justify-center gap-4"><Link href="/demos" className="pop-card px-7 py-4 font-bold">Build My Free Demo</Link><a href={`tel:${SITE.phoneE164}`} className="pop-card px-7 py-4 font-bold">Call {SITE.phone}</a></div></section>
    </article>
  );
}
