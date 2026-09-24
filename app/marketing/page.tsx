import Link from '@/components/AttributionLink';
import PressMedallion from '@/components/PressMedallion';
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
  image: '/marketing/opengraph-image',
});

const SERVICES = [
  { mark: '01', name: 'Social Posting & Video', text: 'Designed posts and short vertical video in your voice, planned on a calendar, and published daily to Facebook, Instagram, TikTok, LinkedIn, and your Google Business Profile. Comments and messages answered.' },
  { mark: '02', name: 'Blog & Article Writing', text: 'Articles that answer the questions your customers are already asking, written to be found on Google and cited by answer engines, and published on your own site.' },
  { mark: '03', name: 'Commercials & Brand Films', text: 'Concept, script, production, and finished cuts for every place it runs, from Mustard Pictures.', href: '/pictures' },
  { mark: '04', name: 'Managed Ads', text: 'Meta and Google campaigns built in your own ad accounts and managed every week. Your spend stays on your card, never marked up, and one report a month tells you what came in.', href: '/pictures' },
  { mark: '05', name: 'Email Newsletters', text: 'A regular letter to your customer list, written, designed, and sent, so the people who already know you keep hearing from you.' },
  { mark: '06', name: 'Google Profile & Reviews', text: 'Posts on your Google Business Profile and a reply to every review, so the first place people look stays current.' },
];

/**
 * The ladder, named without numbers. The visible site sells by inquiry since
 * 2026-09-11 (#251), so the prices live in data/proposal-menu.ts (group
 * 'Marketing') and reach a buyer in a proposal, never on this page or in its
 * structured data.
 */
const PACKAGES: { chip: string; name: string; fit: string; points: string[]; featured?: boolean }[] = [
  {
    chip: 'Social',
    name: 'Daily Posting',
    fit: 'You take good photos of the work and want them seen every day.',
    points: [
      'A post every day on Facebook, Instagram, Google, and Houzz',
      'Written for each platform, never one caption pasted four times',
      'You drop photos and a few words in your portal. That is your whole job',
      'One blog post a month from the same material',
    ],
  },
  {
    chip: 'Social',
    name: 'Social Studio',
    fit: 'You want the content made for you, and the comments answered.',
    points: [
      'Designed posts and short vertical video, made from your photos and clips',
      'Up to five platforms, TikTok and LinkedIn included',
      'Comments and messages answered in your voice every business day',
      'Anyone asking for a quote handed straight to you',
    ],
  },
  {
    chip: 'Ads',
    name: 'On Air',
    fit: 'You want the phone to ring from people who have never heard of you.',
    points: [
      'A 30-second commercial produced for your business',
      'Facebook and Instagram campaigns in your own ad account',
      'Managed every week: budgets, audiences, tired creative swapped',
      'Your ad spend stays on your card, never marked up',
    ],
  },
  {
    chip: 'Ads',
    name: 'Prime Time',
    fit: 'You want to be there when someone searches for exactly what you do.',
    points: [
      'Everything in On Air, plus Google Search ads',
      'A landing page with every call and form tracked',
      'A new commercial every quarter',
      'Fresh hooks and copy every month',
    ],
  },
  {
    chip: 'Everything',
    name: 'The Marketing Department',
    fit: 'Marketing handled the way a full-time hire would, without the hire.',
    points: [
      'Social Studio and Prime Time, run together',
      'A newsletter to your customers twice a month',
      'Your Google profile current and every review answered',
      'Articles on your site, one report across every channel, one strategy call a month',
    ],
    featured: true,
  },
];

const MONTH = [
  { n: '30', label: 'posts, one a day, on every platform you are on' },
  { n: '8', label: 'short vertical videos cut from your own photos and clips' },
  { n: '1', label: 'calendar you approve before anything goes out' },
  { n: '1', label: 'plain-English report: what went out and what came in' },
];

const NEED = [
  { title: 'Photos and clips', text: 'Shot on your phone on the job. Drop them in your portal as they happen and we handle the edit.' },
  { title: 'Twenty minutes a month', text: 'One call to plan promos, seasons, and anything new. Everything else runs without you.' },
  { title: 'Access, in your name', text: 'You add us to your pages and ad accounts as a partner. You stay the owner of every one.' },
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
    q: 'Do I approve posts before they go out?',
    a: 'You approve the month. The calendar lands before the month starts, you mark anything you want changed, and we change it. After that it runs every day without waiting on you.',
  },
  {
    q: 'Do you answer comments and messages?',
    a: 'On Social Studio and The Marketing Department, yes. Comments and messages are answered in your voice every business day, and anyone asking for a quote or a booking is handed straight to you.',
  },
  {
    q: 'Where does my ad spend go?',
    a: 'Straight from your card to Meta and Google, inside your own ad account. We never touch it and never mark it up. Our fee is a set monthly package, never a percentage of what you spend.',
  },
  {
    q: 'How much should I spend on ads?',
    a: 'Most local businesses start at $10 to $20 a day. We set the starting number with you in week one from your average job value, then move it with what the results say.',
  },
  {
    q: 'Can you promise leads?',
    a: 'No one honest can. We promise the work: real creative made for your business, a person watching the account every week, and a report every month that tells you the truth. When something underperforms, we change the creative.',
  },
  {
    q: 'Is there a contract?',
    a: 'No. Every marketing package runs month to month. Stop whenever you like and everything we made stays yours.',
  },
  {
    q: 'How is marketing priced?',
    a: 'Every package is a set monthly price, with a one-time setup on the packages that start with a commercial or a template kit. You see the number in writing before anything starts. Changes to what we produce are included.',
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

      <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#F7DC8A]">
        <PressMedallion />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#161616_1.3px,transparent_1.5px)] [background-size:11px_11px] [mask-image:linear-gradient(115deg,transparent_35%,#000_80%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-28 md:pt-36 pb-14 md:pb-20 xl:pr-[460px]">
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
            Marketing from the same studio that built the site. Social posts and short video, managed ads, articles, and email, written in your voice and published on a steady schedule, so the right people keep hearing from you.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/inquire" className="inline-flex items-center gap-5 border-2 border-[#161616] bg-[#161616] px-7 py-4 font-sans font-bold text-sm text-[#FBF6EA] shadow-[5px_5px_0_0_#FBF6EA] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5">
              Tell Us What You Have In Mind <span aria-hidden="true" className="text-[#F5B700] text-lg">↗</span>
            </Link>
            <a href="#packages" className="inline-flex items-center border-2 border-[#161616] bg-[#FBF6EA] px-7 py-4 font-sans font-bold text-sm shadow-[5px_5px_0_0_#161616] transition-transform hover:-translate-y-0.5">
              See The Packages
            </a>
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

      <section id="packages" className="scroll-mt-20 border-b-2 border-[#161616] bg-[#F3EBD6]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#B92417]">The packages</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.03em]">
            Start with one channel. <em>Grow into all of them.</em>
          </h2>
          <p className="mt-5 max-w-2xl font-body text-base text-[#3d382e] leading-relaxed">
            Every package is a set monthly price, month to month. Tell us where you are and we will name the one that fits in the first conversation.
          </p>
          <div className="mt-11 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {PACKAGES.map((p) => (
              <div
                key={p.name}
                className={
                  'flex flex-col border-2 border-[#161616] p-6 ' +
                  (p.featured
                    ? 'bg-[#161616] text-[#FBF6EA] shadow-[6px_6px_0_0_#E0301E] md:col-span-2'
                    : 'bg-white shadow-[6px_6px_0_0_#161616]')
                }
              >
                <span className={'self-start border px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.16em] ' + (p.featured ? 'border-[#F5B700] text-[#F5B700]' : 'border-[#161616] bg-[#F5B700]')}>
                  {p.chip}
                </span>
                <h3 className="mt-4 font-display text-2xl tracking-[-0.02em]">{p.name}</h3>
                <p className={'mt-2 font-body text-sm italic leading-relaxed ' + (p.featured ? 'text-[#F7DC8A]' : 'text-[#3d382e]')}>{p.fit}</p>
                <ul className="mt-5 mb-6 space-y-2.5">
                  {p.points.map((pt) => (
                    <li key={pt} className={'flex gap-3 font-body text-sm leading-relaxed ' + (p.featured ? 'text-[#d9d7cc]' : 'text-[#3d382e]')}>
                      <span aria-hidden="true" className={p.featured ? 'text-[#F5B700]' : 'text-[#B92417]'}>+</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/inquire" className={'mt-auto font-sans text-sm font-bold ' + (p.featured ? 'text-[#F5B700]' : 'text-[#B92417]')}>
                  Ask About {p.name} <span aria-hidden="true">↗</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid gap-14 lg:grid-cols-2">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#B92417]">A month on Social Studio</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.02] tracking-[-0.03em]">What actually goes out.</h2>
            <dl className="mt-9 grid grid-cols-2 gap-5">
              {MONTH.map((m) => (
                <div key={m.label} className="border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616]">
                  <dt className="font-display text-5xl leading-none tracking-[-0.04em]">{m.n}</dt>
                  <dd className="mt-3 font-body text-sm text-[#3d382e] leading-snug">{m.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-bold text-[#B92417]">What we need from you</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.02] tracking-[-0.03em]">Less than you think.</h2>
            <ol className="mt-9 space-y-5">
              {NEED.map((n, i) => (
                <li key={n.title} className="flex gap-5 border-b-2 border-[#161616]/15 pb-5">
                  <span className="shrink-0 grid h-9 w-9 place-items-center bg-[#161616] font-sans text-xs font-bold text-[#F5B700]">0{i + 1}</span>
                  <div>
                    <h3 className="font-sans text-lg font-bold">{n.title}</h3>
                    <p className="mt-1 font-body text-sm text-[#3d382e] leading-relaxed">{n.text}</p>
                  </div>
                </li>
              ))}
            </ol>
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
