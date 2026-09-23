import Link from '@/components/AttributionLink';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, faqJsonLd, breadcrumbJsonLd, serviceJsonLd } from '@/lib/jsonld';

/**
 * Marketing: the fifth discipline. The studio builds the site, then keeps the
 * business in front of people: social posting, blog writing, commercials, ad
 * campaigns, email, and the Google profile. Commercials and ads live in depth
 * on /pictures; this page is the front door for all of it.
 */

export const metadata = buildMetadata({
  title: 'Marketing: Social Posting, Blog Writing, Commercials and Ads',
  description: 'Marketing from the studio that built the site. Social media posting, blog and article writing, commercials, managed ad campaigns, email newsletters, and Google Business Profile upkeep, written in your voice. Nationwide.',
  path: '/marketing',
});

const SERVICES = [
  { mark: '01', name: 'Social Posting', text: 'Designed posts written in your voice, planned on a calendar, and published to Facebook, Instagram, LinkedIn, and your Google Business Profile.' },
  { mark: '02', name: 'Blog & Article Writing', text: 'Articles that answer the questions your customers are already asking, written to be found on Google and cited by AI search, and published on your own site.' },
  { mark: '03', name: 'Commercials & Brand Films', text: 'Concept, script, production, and finished cuts for every place it runs, from Mustard Pictures.', href: '/pictures' },
  { mark: '04', name: 'Ad Campaigns', text: 'Meta and Google campaigns built and managed in your own ad accounts, with the creative and the results in the same conversation.', href: '/pictures' },
  { mark: '05', name: 'Email Newsletters', text: 'A regular letter to your customer list, written, designed, and sent, so the people who already know you keep hearing from you.' },
  { mark: '06', name: 'Google Profile & Reviews', text: 'Posts on your Google Business Profile and a reply to every review, so the first place people look stays current.' },
];

const STEPS = [
  { title: 'Learn your voice', text: 'We read your site, your reviews, and how you talk about the work, then write like you.' },
  { title: 'Plan the month', text: 'You see the calendar of posts, articles, and sends before anything goes out.' },
  { title: 'Publish and report', text: 'It goes out on schedule, and you get a plain read on what went out and what worked.' },
];

const FAQ = [
  {
    q: 'What marketing does Modern Mustard Seed do?',
    a: 'Social media posting, blog and article writing, commercials and brand films, managed Meta and Google ad campaigns, email newsletters, and Google Business Profile posts and review replies. It comes from the same studio that designs and builds the website, so everything carries one voice and one look.',
  },
  {
    q: 'Will it sound like my business?',
    a: 'Yes. We learn your voice from your site, your reviews, and how you describe the work, and you see the calendar before anything is published.',
  },
  {
    q: 'Do I own the accounts?',
    a: 'Yes. Posting, ads, and email all run in accounts you own. We never hold your pages, your ad account, or your customer list.',
  },
  {
    q: 'How is marketing priced?',
    a: 'Every engagement is scoped in one conversation and quoted as a set package price, agreed in writing before work starts. Changes to what we produce are included.',
  },
];

export default function MarketingPage() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Services', url: '/services' }, { name: 'Marketing', url: '/marketing' }]),
          ...SERVICES.map((s) => serviceJsonLd({ name: s.name, description: s.text, path: '/marketing' })),
          faqJsonLd(FAQ),
        ]}
      />

      <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#F5B700]">
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#161616_1.3px,transparent_1.5px)] [background-size:11px_11px] [mask-image:linear-gradient(115deg,transparent_35%,#000_80%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 md:pt-36 pb-14 md:pb-20">
          <span className="inline-block -rotate-1 bg-[#161616] text-[#F5B700] px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em]">
            Marketing
          </span>
          <h1 className="mt-6 flex flex-col items-start font-sans font-extrabold leading-[0.95] tracking-[-0.045em] text-[2.4rem] sm:text-5xl md:text-6xl lg:text-[5.2rem]">
            <span>We build it.</span>{' '}
            <span className="my-[0.12em] -rotate-2 border-[3px] border-[#161616] bg-[#FBF6EA] px-[0.18em] pb-[0.08em] font-display italic font-medium tracking-[-0.03em] shadow-[7px_7px_0_0_#E0301E]">
              Then we get it seen.
            </span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg md:text-xl font-body font-medium leading-relaxed">
            Marketing from the same studio that built the site. Social posts, blog articles, commercials, ad campaigns, and email, written in your voice and published on a steady schedule, so the right people keep hearing from you.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/inquire" className="inline-flex items-center gap-5 border-2 border-[#161616] bg-[#161616] px-7 py-4 font-sans font-bold text-sm text-[#FBF6EA] shadow-[5px_5px_0_0_#FBF6EA] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5">
              Tell Us What You Have In Mind <span aria-hidden="true" className="text-[#F5B700] text-lg">↗</span>
            </Link>
            <Link href="/pictures" className="inline-flex items-center border-2 border-[#161616] bg-[#FBF6EA] px-7 py-4 font-sans font-bold text-sm shadow-[5px_5px_0_0_#161616] transition-transform hover:-translate-y-0.5">
              See Mustard Pictures
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#B92417]">What we handle</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.03em]">
            Every channel, <em>one voice.</em>
          </h2>
          <div className="mt-11 grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {SERVICES.map((s) => {
              const card = <>
                <span className="self-start bg-[#F5B700] border border-[#161616] px-2 py-1 font-sans text-[10px] font-bold tracking-[0.16em]">{s.mark}</span>
                <h3 className="mt-4 font-display text-2xl tracking-[-0.02em]">{s.name}</h3>
                <p className="mt-2 font-body text-sm text-[#3d382e] leading-relaxed">{s.text}</p>
                {s.href ? <span className="mt-auto pt-5 font-sans text-sm font-bold text-[#B92417]">Mustard Pictures <span aria-hidden="true">↗</span></span> : null}
              </>;
              const cls = 'flex flex-col border-2 border-[#161616] bg-white p-6 shadow-[6px_6px_0_0_#161616]';
              return s.href
                ? <Link key={s.name} href={s.href} className={cls + ' transition-transform hover:-translate-y-1'}>{card}</Link>
                : <div key={s.name} className={cls}>{card}</div>;
            })}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-[#161616] text-[#FBF6EA]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#F5B700]">How it runs</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.03em]">
            Steady, <em className="text-[#F5B700]">not sporadic.</em>
          </h2>
          <ol className="mt-11 grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-2 border-[#FBF6EA] p-6 shadow-[6px_6px_0_0_#F5B700]">
                <span className="font-sans text-xs font-bold text-[#F5B700]">0{i + 1}</span>
                <h3 className="mt-3 font-sans text-lg font-bold">{s.title}</h3>
                <p className="mt-2 font-body text-sm text-[#d9d7cc] leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-2xl font-body text-[15px] text-[#d9d7cc] leading-relaxed">
            Every page, ad account, and customer list stays in your name. Marketing runs in accounts you own, the same way everything else we build does.
          </p>
        </div>
      </section>

      <nav aria-label="Explore the studio" className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap gap-6 font-bold text-[#B92417] underline underline-offset-4">
        <Link href="/services">All services</Link>
        <Link href="/pictures">Commercials and ads</Link>
        <Link href="/websites">Websites and brand</Link>
        <Link href="/blog">Read the journal</Link>
      </nav>

      <section>
        <div className="max-w-4xl mx-auto px-6 pb-16 md:pb-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#B92417]">Straight Answers</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl leading-[1.05] tracking-[-0.03em]">Questions about marketing.</h2>
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
            Or call the studio at <a href={`tel:${SITE.phoneE164}`} className="font-bold underline underline-offset-4">{SITE.phone}</a>. It answers day or night.
          </p>
        </div>
      </section>
    </div>
  );
}
