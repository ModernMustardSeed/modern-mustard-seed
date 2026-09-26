import Link from '@/components/AttributionLink';
import PressMedallion from '@/components/PressMedallion';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, faqJsonLd, breadcrumbJsonLd, serviceJsonLd } from '@/lib/jsonld';

/**
 * FOR THE KINGDOM (Sarah, 2026-09-23). Ministries, churches, charities and
 * kingdom organizations write to Cross + Covenant every week asking for
 * clothing lines, stores and collaborations. This is the door for them:
 * Modern Mustard Seed and Cross + Covenant together, at ministry pricing.
 *
 * Every merch number on this page is the live Your Own Collection deal on
 * crossandcovenant.co (cross-covenant src/lib/your-collection/config.ts). If
 * that deal changes, change this page with it. No discount figure is printed:
 * ministry pricing is quoted per engagement like every other set package.
 */

export const metadata = buildMetadata({
  title: 'For the Kingdom: Design, Merch and Technology for Ministries',
  description: 'Design, curated merch collections, stores, operating systems and marketing for ministries, churches, charities and organizations that serve the Kingdom, at ministry pricing. Modern Mustard Seed and Cross + Covenant, until all have heard.',
  path: '/kingdom',
  image: '/kingdom/opengraph-image',
});

const PILLARS = [
  {
    mark: '01',
    name: 'Curated merch collections',
    text: 'Three to six designs under your name with Cross + Covenant, on their store or your own. Made to order, so no inventory, no setup fee and no minimum. When supporters buy from your collection, your organization earns 40% of the profit on every piece. When you order 12 or more of one design yourself, for an event or a team, you pay 30% off retail.',
    link: { href: 'https://crossandcovenant.co/your-collection', label: 'See Your Own Collection' },
  },
  {
    mark: '02',
    name: 'Stores and websites',
    text: 'A storefront or a website that looks like the calling behind it, with giving, events and sign-ups built in. Designed bespoke, never a template, and yours to own.',
  },
  {
    mark: '03',
    name: 'Operating systems to run it all',
    text: 'The back office a small team should not have to carry by hand: supporters and volunteers in one place, event sign-ups, follow-up that goes out on time, and an agentic front desk that answers every call.',
  },
  {
    mark: '04',
    name: 'Marketing and launch',
    text: 'A plan to share it with the world: social posting, email, films and campaigns, written in your voice, so the work reaches the people it is for.',
    link: { href: '/marketing', label: 'How our marketing works' },
  },
];

const FAQ = [
  {
    q: 'Who is this for?',
    a: 'Churches, ministries, missions organizations, Christian charities and faith-based nonprofits, and the creators and leaders serving alongside them. If your work serves the Kingdom, this is the door.',
  },
  {
    q: 'How does ministry pricing work?',
    a: 'The same way every engagement here works, at a reduced rate. We scope it in one conversation and quote a set package price in writing before work starts. It does not move, and changes to what we build are included.',
  },
  {
    q: 'Do we have to buy inventory for a merch collection?',
    a: 'No. Collections are made to order through Cross + Covenant, so there is no inventory, no setup fee and no minimum. Two numbers do two different jobs. When supporters buy from your collection, your organization earns 40% of the profit on every piece: the profit is what is left after the garment cost and the 10% of profit that goes to our Charity of the Month, which works out to $8.77 on a $40 tee. When you buy for your own event or team, 12 or more of one design to one address, you pay 30% off retail, so a $40 tee is $28.',
  },
  {
    q: 'How do Modern Mustard Seed and Cross + Covenant work together?',
    a: 'Modern Mustard Seed is the design, technology and marketing studio. Cross + Covenant is the Christian apparel brand that produces and ships your collection. One founder, one mission: until all have heard. And 10% of the profit on every Cross + Covenant order fuels our Charity of the Month.',
  },
  {
    q: 'Do we own what you build?',
    a: 'Yes. The website, the store, the systems, the accounts and the code are yours. We build assets you can run without us, not a dependency on the studio.',
  },
];

export default function KingdomPage() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Services', url: '/services' }, { name: 'For the Kingdom', url: '/kingdom' }]),
          ...PILLARS.map((p) => serviceJsonLd({ name: `${p.name} for ministries`, description: p.text, path: '/kingdom' })),
          faqJsonLd(FAQ),
        ]}
      />

      <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#F7DC8A]">
        <PressMedallion />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#161616_1.3px,transparent_1.5px)] [background-size:11px_11px] [mask-image:linear-gradient(115deg,transparent_35%,#000_80%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-28 md:pt-36 pb-14 md:pb-20 xl:pr-[460px]">
          <span className="inline-block -rotate-1 bg-[#161616] text-[#F5B700] px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em]">
            For the Kingdom · Ministry pricing
          </span>
          <h1 className="mt-6 flex flex-col items-start font-sans font-extrabold leading-[0.95] tracking-[-0.045em] text-[2.3rem] sm:text-5xl md:text-6xl lg:text-[5rem]">
            <span>Build what the calling needs.</span>{' '}
            <span className="my-[0.12em] -rotate-2 border-[3px] border-[#161616] bg-[#FBF6EA] px-[0.18em] pb-[0.08em] font-display italic font-medium tracking-[-0.03em] shadow-[7px_7px_0_0_#E0301E]">
              Until all have heard.
            </span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg md:text-xl font-body font-medium leading-relaxed">
            Design, technology and marketing for ministries, churches, charities and organizations that serve the Kingdom, at ministry pricing. Modern Mustard Seed and Cross + Covenant work side by side: curated merch collections, stores, the systems to run it all, and the launch that shares it with the world.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/inquire?kind=kingdom" className="inline-flex items-center gap-5 border-2 border-[#161616] bg-[#161616] px-7 py-4 font-sans font-bold text-sm text-[#FBF6EA] shadow-[5px_5px_0_0_#FBF6EA] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5">
              Tell Us About Your Ministry <span aria-hidden="true" className="text-[#F5B700] text-lg">↗</span>
            </Link>
            <a href="https://crossandcovenant.co/kingdom" target="_blank" rel="noopener noreferrer" className="inline-flex items-center border-2 border-[#161616] bg-[#FBF6EA] px-7 py-4 font-sans font-bold text-sm shadow-[5px_5px_0_0_#161616] transition-transform hover:-translate-y-0.5">
              See it on Cross + Covenant
            </a>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#B92417]">What we build together</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.03em]">
            One mission, <em>four ways in.</em>
          </h2>
          <div className="mt-11 grid sm:grid-cols-2 gap-7">
            {PILLARS.map((p) => (
              <div key={p.name} className="flex flex-col border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
                <span className="self-start bg-[#F5B700] border border-[#161616] px-2 py-1 font-sans text-[10px] font-bold tracking-[0.16em]">{p.mark}</span>
                <h3 className="mt-4 font-display text-2xl md:text-3xl tracking-[-0.02em]">{p.name}</h3>
                <p className="mt-3 font-body text-[15px] text-[#3d382e] leading-relaxed">{p.text}</p>
                {p.link ? (
                  p.link.href.startsWith('http') ? (
                    <a href={p.link.href} target="_blank" rel="noopener noreferrer" className="mt-auto pt-5 font-sans text-sm font-bold text-[#B92417]">{p.link.label} <span aria-hidden="true">↗</span></a>
                  ) : (
                    <Link href={p.link.href} className="mt-auto pt-5 font-sans text-sm font-bold text-[#B92417]">{p.link.label} <span aria-hidden="true">↗</span></Link>
                  )
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-[#161616] text-[#FBF6EA]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-[1fr_1fr] gap-10 md:gap-16 items-start">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#F5B700]">Two studios, one mission</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.03em]">
              Made for impact, <em className="text-[#F5B700]">not for margin.</em>
            </h2>
          </div>
          <div className="space-y-5 font-body text-[16px] leading-relaxed text-[#d9d7cc]">
            <p><strong className="text-[#FBF6EA]">Modern Mustard Seed</strong> is the design, creative and engineering studio: the brand, the store, the systems and the launch.</p>
            <p><strong className="text-[#FBF6EA]">Cross + Covenant</strong> is the Christian apparel brand that designs, produces and ships your collection, made to order, and puts 10% of the profit on every order toward our Charity of the Month.</p>
            <p>Same founder, same conviction: the good news belongs in every place people look, and the ministries carrying it deserve work as beautiful as the message.</p>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-[#F5B700]">
        <div className="max-w-4xl mx-auto px-6 py-14 md:py-20 text-center">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold">Ministry pricing</p>
          <h2 className="mt-3 font-display text-3xl md:text-5xl leading-[1.05] tracking-[-0.03em]">Set packages, at a <em>reduced rate for Kingdom work.</em></h2>
          <p className="mt-5 max-w-2xl mx-auto font-body text-[16px] leading-relaxed">
            Scoped in one conversation, quoted as a set package price in writing before work starts, and it does not move. Changes to what we build are included. You own all of it.
          </p>
          <Link href="/inquire?kind=kingdom" className="mt-8 inline-flex items-center gap-5 border-2 border-[#161616] bg-[#161616] px-7 py-4 font-sans font-bold text-sm text-[#FBF6EA] shadow-[5px_5px_0_0_#FBF6EA]">
            Start the conversation <span aria-hidden="true" className="text-[#F5B700] text-lg">↗</span>
          </Link>
        </div>
      </section>

      <section>
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#B92417]">Straight Answers</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl leading-[1.05] tracking-[-0.03em]">Questions from ministries.</h2>
          <div className="mt-8 space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616]">
                <summary className="cursor-pointer list-none font-sans font-bold text-[15px] flex items-start justify-between gap-4">
                  {f.q}
                  <span aria-hidden="true" className="text-[#B92417] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 font-body text-sm text-[#3d382e] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-10 font-body text-sm text-[#3d382e]">
            Or call the studio at <a href={`tel:${SITE.phoneE164}`} className="font-bold underline underline-offset-4">{SITE.phone}</a>. It answers day or night. Or reach Sarah directly at <a href={`tel:${SITE.sarahPhoneE164}`} className="font-bold underline underline-offset-4">{SITE.sarahPhone}</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
