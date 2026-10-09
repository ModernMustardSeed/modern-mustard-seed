import Link from 'next/link';
import { Shrikhand } from 'next/font/google';
import Navbar from '@/components/Navbar';
import { flatheadWork } from '@/data/flathead-work';
import { flatheadFilms } from '@/data/flathead-films';
import { HOME_QUESTIONS } from '@/data/home-faq';
import { STUDIO_STATS, OFFICE_URL } from '@/data/studio-stats';
import { StorybookHeroFilm, StorybookTV } from './StorybookClient';
import './storybook.css';

/**
 * The storybook homepage: the look of the studio's cartoon music films (They
 * Say Your Name, Does It Work for You?, the crew song) carried onto the site.
 * Cream paper, ink linework, mustard flowers, the seed cast, Shrikhand on top.
 * The art in /public/storybook is cut from those films' own stills.
 */
const display = Shrikhand({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--sb-display' });

const NAV = [
  { href: '/websites', label: 'Websites' },
  { href: '/voice-agents', label: 'AI Voice Agents' },
  { href: '/services', label: 'Custom Software' },
  { href: '/ai', label: 'Agentic Systems' },
  { href: '/marketing', label: 'Marketing' },
  { href: '/work', label: 'Our Work' },
];

const SERVICES = [
  {
    art: 'websites',
    alt: 'Sarah and Anthony stand beside a giant colorful website mockup while the mustard seed crew cheers.',
    title: 'Websites & Brand',
    line: 'A website that looks like nobody else in your town and turns visitors into calls.',
    tags: 'Design · Identity · Booking · Online stores',
    href: '/websites',
    cta: 'Websites & brand',
  },
  {
    art: 'found',
    alt: 'A golden magnifying glass shines down on a storybook lakeside town, with a speech bubble above it.',
    title: 'Found on Google & ChatGPT',
    line: 'Search built in, so Google, Maps and AI assistants say your name when people ask.',
    tags: 'SEO · Google Business Profile · AI search',
    href: '/agentic-websites',
    cta: 'Get found',
  },
  {
    art: 'voice',
    alt: 'A smiling mustard seed answers an old rotary phone at a desk late at night.',
    title: 'AI Voice Agents',
    line: 'Every call answered in a real voice, day or night. Questions handled, jobs booked.',
    tags: 'AI receptionist · Booking · After hours',
    href: '/voice-agents',
    cta: 'Voice agents',
  },
  {
    art: 'software',
    alt: 'A mustard seed checks off a giant calendar while a paper airplane message flies to a happy customer.',
    title: 'Custom Software',
    line: 'The app, portal or back office you wish existed, built around how you already work.',
    tags: 'Web apps · Portals · Mobile apps · Back office',
    href: '/services',
    cta: 'Custom software',
  },
  {
    art: 'crew',
    alt: 'Rows of mustard seed characters, each dressed for a different job, smile from a long wooden shelf.',
    title: 'Agentic Systems',
    line: 'AI agents that follow up, file, post and report, so the busywork stops landing on you.',
    tags: 'Automations · AI agents · Integrations',
    href: '/ai',
    cta: 'AI for your business',
  },
  {
    art: 'marketing',
    alt: 'One mustard seed films with a vintage camera while another paints a flower on an easel.',
    title: 'Marketing & Films',
    line: 'Posts, articles, ads and films like the ones on this page, in your voice, on schedule.',
    tags: 'Social · Blog · Ads · Commercials',
    href: '/marketing',
    cta: 'Marketing',
  },
];

const PATHS = [
  {
    art: 'business',
    alt: 'Dale the plumber, wrench raised, grins in a sunny kitchen with a happy family behind him.',
    kicker: 'Your business',
    title: 'Grow what works.',
    body: 'More calls, more bookings, less busywork. We connect your sales, marketing and operations.',
    href: '#services',
    cta: 'See what we build',
  },
  {
    art: 'venture',
    alt: 'Sarah and Anthony assemble a giant website on a stage while a crane lowers the final panel.',
    kicker: 'Your next venture',
    title: 'Make it real.',
    body: 'From the first idea to a working product you own, scoped, built, launched and handed over.',
    href: '#chapters',
    cta: 'From idea to hand off',
  },
  {
    art: 'agency',
    alt: 'Sarah and Anthony peek out from behind giant flowers with the mustard seed crew.',
    kicker: 'Your agency',
    title: 'Your brand. Our build.',
    body: 'White-label websites, software and AI systems, delivered with your name in front.',
    href: '#white-label',
    cta: 'Work behind the scenes',
  },
];

const REVIEWS = [
  {
    stat: '30 minutes',
    label: 'Days of back-office work, now this.',
    quote: 'Our new back office saved my team from drowning, and now days of work is literally only thirty minutes.',
    by: 'Beverly P.',
    when: 'July 2026',
  },
  {
    stat: '80% more',
    label: 'Deals closed, in the client’s words.',
    quote: 'Since then I have closed 80% more deals and the best part is I have more time to grow the business.',
    by: 'Jaxson Smitty',
    when: 'September 2026',
  },
  {
    stat: 'Same day',
    label: 'An update, live that night.',
    quote: 'I reached out to them on a Tuesday morning, and by the time I went to sleep that night, my AI agent and website were already updated and running smoothly.',
    by: 'Easton Parker',
    when: 'September 2026',
  },
];

const CHAPTERS = [
  { title: 'Scope and Sequence', body: 'Your idea becomes a specified, sequenced build plan with a set package price.' },
  { title: 'Build and Ship', body: 'The product gets built and put in front of real users.' },
  { title: 'Launch', body: 'It goes to market with the surrounding system in place.' },
  { title: 'Hand Off', body: 'The code, the accounts and the know-how transfer to you.' },
];

const FOOTER = [
  {
    title: 'What We Build',
    links: [
      ['/websites', 'Websites And Brand'],
      ['/talking-website', 'The Talking Website'],
      ['/voice-agents', 'AI Voice Agents'],
      ['/services', 'Custom Software'],
      ['/ai', 'AI for Your Business'],
      ['/marketing', 'Marketing'],
      ['/launch-film', 'The Launch Film'],
      ['/advisory', 'Advisory'],
      ['/claude', 'Claude Setup'],
      ['/kingdom', 'For the Kingdom'],
    ],
  },
  {
    title: 'The Studio',
    links: [
      ['/work', 'The Work'],
      ['/work-with-us', 'How We Work'],
      ['/about', 'About'],
      ['/sarahscarano', 'Sarah Scarano'],
      ['/mustard', 'Meet Mr. Mustard'],
      ['/pictures', 'Mustard Pictures'],
      ['/blog', 'Journal'],
      ['/resources', 'Answer Engine Resources'],
    ],
  },
  {
    title: 'Who We Build For',
    links: [
      ['/nationwide', 'Nationwide Reach'],
      ['/montana', 'Northwest Montana'],
      ['/montana/kalispell', 'Kalispell'],
      ['/for', 'Industries We Build For'],
      ['/for/contractors', 'Builders and Contractors'],
      ['/for/health', 'Health Practices'],
      ['/white-label', 'White Label For Agencies'],
      ['/partners', 'Partner Program'],
    ],
  },
  {
    title: 'Start Here',
    links: [
      ['/presence-audit', 'The Free Presence Audit'],
      ['/book', 'Book A Call'],
      ['/inquire', 'Or Write Instead'],
      ['/contact', 'Contact'],
      ['/portal', 'Client Portal'],
      ['/privacy', 'Privacy'],
      ['/terms', 'Terms'],
    ],
  },
];

function Art({ name, alt, sizes = '(max-width: 760px) 92vw, 420px', priority = false }: { name: string; alt: string; sizes?: string; priority?: boolean }) {
  return (
    <img
      src={`/storybook/${name}-1600.webp`}
      srcSet={`/storybook/${name}-800.webp 800w, /storybook/${name}-1600.webp 1600w`}
      sizes={sizes}
      width={1600}
      height={900}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

/** A five-petal mustard flower in the films' ink line. */
function Bloom({ className }: { className: string }) {
  return (
    <svg className={`sb-bloom ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="50" cy="27" rx="17" ry="23" transform={`rotate(${r} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="11" className="sb-bloom-heart" />
    </svg>
  );
}

const ARROW = <span aria-hidden="true">↗</span>;

export default function StorybookHome() {
  const firstFilm = flatheadFilms[0];
  return (
    <div id="sb" className={display.variable} data-design="mms-editorial-2026" data-edition="storybook-2026-10">
      <div id="sbk">
        <header className="sb-header">
          <Link className="sb-brand" href="/" aria-label="Modern Mustard Seed home">
            <img src="/storybook/seed-mark.webp" width={44} height={44} alt="" />
            <span>Modern Mustard Seed</span>
          </Link>
          <nav className="sb-nav" aria-label="What we build">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}>{n.label}</Link>
            ))}
          </nav>
          <div className="sb-header-end">
            <Link className="sb-btn sb-btn-small" href="/inquire">Let’s talk {ARROW}</Link>
            <button type="button" className="sb-menu" data-site-menu-toggle aria-label="Open menu" aria-expanded="false" aria-controls="site-mega-menu">
              <span /><span /><span />
            </button>
          </div>
        </header>

        <section className="sb-hero" aria-labelledby="sb-hero-title">
          <Bloom className="b1" />
          <Bloom className="b2" />
          <Bloom className="b3" />
          <p className="sb-pill">Kalispell, Montana <span aria-hidden="true">·</span> building for businesses across the US</p>
          <h1 id="sb-hero-title">
            <span className="sb-h1-lead">We build</span>{' '}
            <mark>websites</mark>, <mark>AI voice agents</mark> <span className="sb-amp">&amp;</span> <mark>custom software</mark>.
          </h1>
          <p className="sb-hero-sub">
            Get found on Google and ChatGPT. Answer every call. Hand the busywork to AI agents.
            Set package prices, and you own every piece of it.
          </p>
          <div className="sb-hero-ctas">
            <Link className="sb-btn" href="/inquire">Start your build {ARROW}</Link>
            <Link className="sb-btn sb-btn-ghost" href="/presence-audit">Free website audit {ARROW}</Link>
          </div>
          <StorybookHeroFilm />
          <ul className="sb-chips" aria-label="Services">
            {SERVICES.map((s) => (
              <li key={s.href}><Link href={s.href}>{s.title}</Link></li>
            ))}
            <li><Link href="/advisory">Advisory</Link></li>
          </ul>
        </section>

        <section id="services" className="sb-section" aria-labelledby="sb-services-title">
          <div className="sb-intro">
            <p className="sb-kicker">What we build</p>
            <h2 id="sb-services-title">Everything your business needs <em>to be found, booked and running.</em></h2>
            <p>Modern Mustard Seed is a design and AI product studio. We build the face of your business and the systems behind it, one studio, start to finish.</p>
          </div>
          <div className="sb-cards">
            {SERVICES.map((s) => (
              <article key={s.href} className="sb-card">
                <div className="sb-card-art"><Art name={s.art} alt={s.alt} /></div>
                <div className="sb-card-body">
                  <h3>{s.title}</h3>
                  <p>{s.line}</p>
                  <p className="sb-tags">{s.tags}</p>
                  <Link className="sb-link" href={s.href}>{s.cta} {ARROW}</Link>
                </div>
              </article>
            ))}
          </div>
          <p className="sb-crew-note">
            Behind the studio: {STUDIO_STATS.specialists} AI specialists, one human in charge.{' '}
            <a className="sb-link" href={OFFICE_URL} target="_blank" rel="noopener noreferrer">Meet the crew {ARROW}</a>
          </p>
        </section>

        <section className="sb-section sb-paths" aria-label="Three ways to work with the studio">
          {PATHS.map((p) => (
            <a key={p.kicker} href={p.href} className="sb-path">
              <div className="sb-path-art"><Art name={p.art} alt={p.alt} sizes="(max-width: 760px) 92vw, 380px" /></div>
              <p className="sb-kicker">{p.kicker}</p>
              <h2>{p.title}</h2>
              <p>{p.body}</p>
              <span className="sb-link">{p.cta} {ARROW}</span>
            </a>
          ))}
        </section>

        <section id="work" className="sb-section sb-work" aria-labelledby="sb-work-title">
          <div className="sb-intro sb-intro-row">
            <div>
              <p className="sb-kicker">Selected work</p>
              <h2 id="sb-work-title">Out in <em>the world.</em></h2>
            </div>
            <Link className="sb-link" href="/work">All the work {ARROW}</Link>
          </div>
          <div className="sb-rail" role="region" aria-label="Portfolio. Scroll sideways to see more." tabIndex={0}>
            {flatheadWork.map((w) => {
              const img = 'image' in w && w.image ? w.image : w.id;
              return (
                <a key={w.id} className="sb-work-card" href={w.url} target="_blank" rel="noopener noreferrer">
                  <span className="sb-work-frame">
                    <img src={`/flathead/portfolio/${img}-800.webp`} width={800} height={556} loading="lazy" decoding="async" alt={`${w.name}: a preview of the website built by Modern Mustard Seed.`} />
                  </span>
                  <span className="sb-work-kind">{w.kind}</span>
                  <strong>{w.name}</strong>
                  <span className="sb-work-desc">{w.description}</span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="sb-section sb-results" aria-labelledby="sb-results-title">
          <div className="sb-results-art"><Art name="results" alt="The whole town cheers and lifts Dale the plumber onto their shoulders as confetti falls." sizes="(max-width: 760px) 92vw, 1100px" /></div>
          <div className="sb-intro sb-intro-row">
            <div>
              <p className="sb-kicker">From the people we build for</p>
              <h2 id="sb-results-title">More room <em>to run.</em></h2>
            </div>
            <a className="sb-link" href="https://www.google.com/maps?cid=8255098141806810627" target="_blank" rel="noopener noreferrer">Read the Google reviews {ARROW}</a>
          </div>
          <div className="sb-reviews">
            {REVIEWS.map((r) => (
              <figure key={r.by} className="sb-review">
                <strong className="sb-stat">{r.stat}</strong>
                <span className="sb-stat-label">{r.label}</span>
                <blockquote>“{r.quote}”</blockquote>
                <figcaption>
                  <span className="sb-stars" aria-label="5 out of 5 stars">★★★★★</span>
                  {r.by} <span>· Google review, {r.when}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="chapters" className="sb-section sb-chapters" aria-labelledby="sb-chapters-title">
          <div className="sb-intro">
            <p className="sb-kicker">Idea to Product</p>
            <h2 id="sb-chapters-title">Four chapters. <em>One happy ending.</em></h2>
            <p>Every build follows the same story, with a set package price agreed before chapter one. Changes along the way are included.</p>
          </div>
          <ol className="sb-chapter-list">
            {CHAPTERS.map((c, i) => (
              <li key={c.title}>
                <span className="sb-chapter-no" aria-hidden="true">{i + 1}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </li>
            ))}
          </ol>
          <Link className="sb-link" href="/work-with-us">How we work {ARROW}</Link>
        </section>

        <section id="studio" className="sb-section sb-studio" aria-labelledby="sb-studio-title">
          <div className="sb-studio-main">
            <div className="sb-studio-art"><Art name="sarah" alt="Sarah, in braids, and Anthony smile in a field of mustard flowers with the seed crew." sizes="(max-width: 760px) 92vw, 620px" /></div>
            <p className="sb-kicker">One studio. Personally built.</p>
            <h2 id="sb-studio-title">A direct line <em>to the builder.</em></h2>
            <p className="sb-lead">You work with the person who designs it, and the person who builds it.</p>
            <p>I’m Sarah Scarano, founder, designer and engineer. I bring the creative direction and the technical work together, from the first conversation to the finished detail. Based in Kalispell, Montana. Building for businesses across the United States.</p>
            <Link className="sb-link" href="/about">Meet Sarah {ARROW}</Link>
          </div>
          <aside className="sb-concierge" aria-labelledby="sb-concierge-title">
            <div className="sb-concierge-art"><Art name="concierge" alt="Mr. Mustard in a headset works an old switchboard beside a red rotary phone." sizes="(max-width: 760px) 92vw, 420px" /></div>
            <p className="sb-kicker">A little character. A real job.</p>
            <h3 id="sb-concierge-title">Mr. Mustard, <em>at your service.</em></h3>
            <p>Our AI concierge answers the phone right now. Call him and hear what a voice agent sounds like on your line.</p>
            <a className="sb-btn" href="tel:+14063121223">Call (406) 312-1223</a>
            <Link className="sb-link" href="/mustard">Meet Mr. Mustard {ARROW}</Link>
            <div className="sb-own">
              <strong>Your business. Your asset.</strong>
              <p>You own the code, the accounts and the finished work. Changes to what we build are included.</p>
            </div>
          </aside>
        </section>

        <section id="white-label" className="sb-section sb-split" aria-labelledby="sb-agency-title">
          <div className="sb-split-art"><Art name="hive" alt="A golden honeycomb shelf where every cell holds a mustard seed busy at a different craft." sizes="(max-width: 760px) 92vw, 560px" /></div>
          <div>
            <p className="sb-kicker">For agencies and creative partners</p>
            <h2 id="sb-agency-title">More capability. <em>Still your name.</em></h2>
            <p>Bring us behind the scenes for websites, custom software, AI systems and creative production. You keep the client relationship. We build to the scope you agree.</p>
            <Link className="sb-link" href="/white-label">White-label services {ARROW}</Link>
          </div>
        </section>

        <section className="sb-section sb-split sb-split-flip" aria-labelledby="sb-first-title">
          <div className="sb-split-art"><Art name="first-look" alt="A cheerful laptop character pins colorful notes to a planning board." sizes="(max-width: 760px) 92vw, 560px" /></div>
          <div>
            <p className="sb-kicker">See it before you leap</p>
            <h2 id="sb-first-title">A first look, <em>free.</em></h2>
            <p>Send us your current website. We’ll audit your site, your Google profile and your reviews, and show you exactly what’s costing you calls.</p>
            <div className="sb-hero-ctas sb-left">
              <Link className="sb-btn" href="/presence-audit">Get the free audit {ARROW}</Link>
              <Link className="sb-link" href="/book">Or book a call {ARROW}</Link>
            </div>
          </div>
        </section>

        <section id="mustard-tv" className="sb-section sb-tv" aria-labelledby="sb-tv-title">
          <div className="sb-intro">
            <p className="sb-kicker">Mustard TV</p>
            <h2 id="sb-tv-title">A little studio <em>with a lot to say.</em></h2>
            <p>Original films and songs, made in house. Pick one and press play.</p>
          </div>
          <StorybookTV films={flatheadFilms} first={firstFilm} />
          <Link className="sb-link" href="/launch-film">A film for your own launch {ARROW}</Link>
        </section>

        <section id="faq" className="sb-section sb-faq" aria-labelledby="sb-faq-title">
          <div className="sb-intro">
            <p className="sb-kicker">Before we begin</p>
            <h2 id="sb-faq-title">Good questions. <em>Straight answers.</em></h2>
          </div>
          <div className="sb-faq-list">
            {HOME_QUESTIONS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}<span aria-hidden="true">+</span></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="sb-close" aria-labelledby="sb-close-title">
          <div className="sb-close-art"><Art name="close" alt="Sarah, Anthony and Dale wave under a great golden mustard tree with the whole seed crew." sizes="100vw" /></div>
          <div className="sb-close-card">
            <h2 id="sb-close-title">Let’s build the tree.</h2>
            <p>A clear scope. A set package price. The finished work belongs to you.</p>
            <Link className="sb-btn" href="/inquire">Start a conversation {ARROW}</Link>
          </div>
        </section>

        <footer className="sb-footer">
          <div className="sb-footer-top">
            <div>
              <p className="sb-footer-brand">Modern Mustard Seed</p>
              <p>A design and AI product studio in Kalispell, Montana. Websites, AI voice agents, custom software and agentic systems for businesses across the United States.</p>
              <p className="sb-footer-contact">
                <a href="mailto:sarah@modernmustardseed.com">sarah@modernmustardseed.com</a>
                <a href="tel:+14062506076">Sarah: (406) 250-6076</a>
              </p>
            </div>
            <blockquote className="sb-parable">
              “Though it is the smallest of all seeds, yet when it grows, it is the largest of garden plants and becomes a tree, so that the birds come and perch in its branches.”
              <cite>Matthew 13:32</cite>
            </blockquote>
          </div>
          <div className="sb-footer-cols">
            {FOOTER.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p>{col.title}</p>
                <ul>
                  {col.links.map(([href, label]) => (
                    <li key={href}><Link href={href}>{label}</Link></li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="sb-footer-bottom">
            <span>© 2026 Modern Mustard Seed. Montana roots. Nationwide reach.</span>
            <span className="sb-social">
              <a href="https://www.facebook.com/modernmustardseed" target="_blank" rel="noopener noreferrer">Facebook</a>
              <a href="https://instagram.com/modernmustardseed" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://www.linkedin.com/in/sarahmscarano/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://github.com/ModernMustardSeed" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="/review">Review on Google</a>
              <button type="button" data-cookie-preferences>Cookie preferences</button>
            </span>
          </div>
        </footer>
      </div>
      <Navbar menuOnly />
    </div>
  );
}
