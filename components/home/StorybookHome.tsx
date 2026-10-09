import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { flatheadWork } from '@/data/flathead-work';
import { flatheadFilms } from '@/data/flathead-films';
import { HOME_QUESTIONS } from '@/data/home-faq';
import { STUDIO_STATS, OFFICE_URL } from '@/data/studio-stats';
import { StorybookStage, StorybookTV } from './StorybookClient';
import './storybook.css';

/**
 * The studio homepage: Mustard Studio's editorial system (tight DM Sans,
 * Shrikhand emphasis, JetBrains Mono labels, ruled grids, solid bands and
 * engraved botanicals) carrying the cartoon film world (They Say Your Name,
 * Does It Work for You?, the crew song). The hero garden is Three.js.
 */

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

const ARROW = <span aria-hidden="true">↗</span>;
const TICKER = ['Websites', 'AI voice agents', 'Custom software', 'Agentic systems', 'Google and ChatGPT search', 'Marketing', 'Films', 'Advisory'];

export default function StorybookHome() {
  return (
    <div id="sb" data-design="mms-editorial-2026" data-edition="studio-storybook-2026-10">
      <div id="sbk">
        <header className="sb-header">
          <Link className="sb-brand" href="/" aria-label="Modern Mustard Seed home">
            <img src="/storybook/seed-mark.webp" width={40} height={40} alt="" />
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
          <div className="sb-hero-copy">
            <p className="sb-label">Design and AI product studio <span aria-hidden="true">/</span> Kalispell, MT <span aria-hidden="true">/</span> Nationwide</p>
            <h1 id="sb-hero-title">
              We build websites, AI voice agents <br /><em>&amp; custom software.</em>
            </h1>
            <p className="sb-hero-sub">
              Get found on Google and ChatGPT. Answer every call. Hand the busywork to AI agents.
              Set package prices, and you own every piece of it.
            </p>
            <div className="sb-ctas">
              <Link className="sb-btn" href="/inquire">Start your build {ARROW}</Link>
              <Link className="sb-btn sb-btn-line" href="/presence-audit">Free website audit {ARROW}</Link>
            </div>
            <p className="sb-hero-call">Or call Mr. Mustard, our AI receptionist: <a href="tel:+14063121223">(406) 312-1223</a></p>
          </div>
          <StorybookStage />
        </section>

        <div className="sb-ticker" aria-hidden="true">
          <div className="sb-ticker-track">
            {[0, 1].map((k) => (
              <span key={k}>
                {TICKER.map((t) => (
                  <span key={t}>{t}<b>+</b></span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section id="services" className="sb-section" aria-labelledby="sb-services-title">
          <div className="sb-head">
            <p className="sb-label">01 <span aria-hidden="true">/</span> What we build</p>
            <h2 id="sb-services-title">Found, booked and running. <em>One studio behind it.</em></h2>
            <p>Modern Mustard Seed builds the face of your business and the systems behind it, start to finish, in one place.</p>
          </div>
          <div className="sb-grid">
            {SERVICES.map((s, i) => (
              <article key={s.href} className={`sb-cell${i === 2 ? ' is-mustard' : ''}`}>
                <p className="sb-label">{String(i + 1).padStart(2, '0')} <span aria-hidden="true">/</span> {s.tags.split(' · ')[0]}</p>
                <div className="sb-cell-art"><Art name={s.art} alt={s.alt} sizes="(max-width: 760px) 92vw, 400px" /></div>
                <h3>{s.title}</h3>
                <p>{s.line}</p>
                <p className="sb-tags">{s.tags}</p>
                <Link className="sb-link" href={s.href}>{s.cta} {ARROW}</Link>
              </article>
            ))}
          </div>
          <div className="sb-crew">
            <p><strong>Behind the studio:</strong> {STUDIO_STATS.specialists} AI specialists and one human in charge.</p>
            <a className="sb-btn sb-btn-line" href={OFFICE_URL} target="_blank" rel="noopener noreferrer">Meet the crew {ARROW}</a>
          </div>
        </section>

        <section className="sb-band sb-teal" aria-labelledby="sb-paths-title">
          <div className="sb-band-in">
            <div className="sb-head">
              <p className="sb-label">02 <span aria-hidden="true">/</span> Three ways in</p>
              <h2 id="sb-paths-title">Whatever you’re growing, <em>we build the tree.</em></h2>
            </div>
            <div className="sb-paths">
              {PATHS.map((p, i) => (
                <a key={p.kicker} href={p.href} className="sb-path">
                  <div className="sb-path-art"><Art name={p.art} alt={p.alt} sizes="(max-width: 760px) 92vw, 380px" /></div>
                  <p className="sb-label">0{i + 1} <span aria-hidden="true">/</span> {p.kicker}</p>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                  <span className="sb-link">{p.cta} {ARROW}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="work" className="sb-section" aria-labelledby="sb-work-title">
          <div className="sb-head sb-head-row">
            <div>
              <p className="sb-label">03 <span aria-hidden="true">/</span> Selected work</p>
              <h2 id="sb-work-title">Out in <em>the world.</em></h2>
            </div>
            <Link className="sb-btn sb-btn-line" href="/work">All the work {ARROW}</Link>
          </div>
          <div className="sb-rail" role="region" aria-label="Portfolio. Scroll sideways to see more." tabIndex={0}>
            {flatheadWork.map((w, i) => {
              const img = 'image' in w && w.image ? w.image : w.id;
              return (
                <a key={w.id} className="sb-work" href={w.url} target="_blank" rel="noopener noreferrer">
                  <span className="sb-work-frame">
                    <span className="sb-work-bar" aria-hidden="true"><i /><i /><i /> {new URL(w.url).hostname.replace('www.', '')}</span>
                    <img src={`/flathead/portfolio/${img}-800.webp`} width={800} height={556} loading="lazy" decoding="async" alt={`${w.name}: a preview of the website built by Modern Mustard Seed.`} />
                  </span>
                  <span className="sb-label">{String(i + 1).padStart(2, '0')} <span aria-hidden="true">/</span> {w.kind}</span>
                  <strong>{w.name}</strong>
                  <span className="sb-work-desc">{w.description}</span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="sb-band sb-mustard" aria-labelledby="sb-results-title">
          <div className="sb-band-in">
            <div className="sb-head sb-head-row">
              <div>
                <p className="sb-label">04 <span aria-hidden="true">/</span> From the people we build for</p>
                <h2 id="sb-results-title">More room <em>to run.</em></h2>
              </div>
              <a className="sb-btn sb-btn-ink" href="https://www.google.com/maps?cid=8255098141806810627" target="_blank" rel="noopener noreferrer">Read the Google reviews {ARROW}</a>
            </div>
            <div className="sb-results-art"><Art name="results" alt="The whole town cheers and lifts Dale the plumber onto their shoulders as confetti falls." sizes="(max-width: 760px) 92vw, 1240px" /></div>
            <div className="sb-results">
              {REVIEWS.map((r) => (
                <figure key={r.by} className="sb-review">
                  <strong className="sb-stat">{r.stat}</strong>
                  <span className="sb-stat-label">{r.label}</span>
                  <blockquote>“{r.quote}”</blockquote>
                  <figcaption>
                    <span className="sb-stars" aria-label="5 out of 5 stars">★★★★★</span>
                    {r.by} <span>/ Google review, {r.when}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="chapters" className="sb-band sb-ink" aria-labelledby="sb-chapters-title">
          <img className="sb-ink-flower" src="/storybook/ms-ivory-cosmos-cut-1024.webp" width={1024} height={1024} alt="" loading="lazy" decoding="async" />
          <div className="sb-band-in">
            <div className="sb-head">
              <p className="sb-label">05 <span aria-hidden="true">/</span> Idea to Product</p>
              <h2 id="sb-chapters-title">Four chapters. <em>One happy ending.</em></h2>
              <p>Every build follows the same story, with a set package price agreed before chapter one. Changes along the way are included.</p>
            </div>
            <ol className="sb-chapters">
              {CHAPTERS.map((c, i) => (
                <li key={c.title}>
                  <span className="sb-chapter-no" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </li>
              ))}
            </ol>
            <Link className="sb-btn" href="/work-with-us">How we work {ARROW}</Link>
          </div>
        </section>

        <section id="studio" className="sb-section sb-team" aria-labelledby="sb-studio-title">
          <div className="sb-head sb-head-row">
            <div>
              <p className="sb-label">06 <span aria-hidden="true">/</span> The team</p>
              <h2 id="sb-studio-title">Two people, one studio. <em>A direct line to both.</em></h2>
              <p>You work with the people who design it, build it and bring it to market. Based in Kalispell, Montana, building for businesses across the United States.</p>
            </div>
            <Link className="sb-btn sb-btn-line" href="/about">About the studio {ARROW}</Link>
          </div>
          <div className="sb-team-art"><Art name="team-duo" alt="Sarah and Anthony stand side by side in the sunny studio, surrounded by mustard flowers and the cheering seed crew." sizes="(max-width: 760px) 92vw, 1240px" /></div>
          <div className="sb-team-grid">
            <article className="sb-person">
              <div className="sb-person-art"><Art name="team-sarah" alt="Sarah sketches a website on a tablet at the build bench while two seed characters help." sizes="(max-width: 760px) 92vw, 400px" /></div>
              <p className="sb-label">Founder <span aria-hidden="true">/</span> Design and engineering</p>
              <h3>Sarah Scarano</h3>
              <p>Sarah designs and builds every website, voice agent and system we ship, and stays on it from the first conversation to the finished detail.</p>
              <Link className="sb-link" href="/sarahscarano">Meet Sarah {ARROW}</Link>
            </article>
            <article className="sb-person">
              <div className="sb-person-art"><Art name="team-anthony" alt="Anthony laughs on an old phone and gives a thumbs up beside a board of campaign cards, with seed characters holding a megaphone and a camera." sizes="(max-width: 760px) 92vw, 400px" /></div>
              <p className="sb-label">Sales <span aria-hidden="true">/</span> Marketing</p>
              <h3>Anthony</h3>
              <p>Anthony leads sales and marketing. He helps you choose the right build, then keeps your marketing moving once it is live.</p>
              <Link className="sb-link" href="/book">Book a call {ARROW}</Link>
            </article>
          <aside className="sb-concierge" aria-labelledby="sb-concierge-title">
            <div className="sb-seal">
              <img src="/storybook/ms-mustard-blossom-cut-256.webp" width={256} height={256} alt="" loading="lazy" />
              <span>Mr. Mustard<br />AI receptionist</span>
            </div>
            <div className="sb-concierge-art"><Art name="concierge" alt="Mr. Mustard in a headset works an old switchboard beside a red rotary phone." sizes="(max-width: 760px) 92vw, 460px" /></div>
            <h3 id="sb-concierge-title">Mr. Mustard, <em>at your service.</em></h3>
            <p>Our AI receptionist answers the phone right now. Call him and hear what a voice agent sounds like on your line.</p>
            <a className="sb-btn" href="tel:+14063121223">Call (406) 312-1223</a>
            <Link className="sb-link" href="/mustard">Meet Mr. Mustard {ARROW}</Link>
            <div className="sb-own">
              <strong>Your business. Your asset.</strong>
              <p>You own the code, the accounts and the finished work. Changes to what we build are included.</p>
            </div>
          </aside>
          </div>
        </section>

        <section id="white-label" className="sb-section sb-split" aria-labelledby="sb-agency-title">
          <div className="sb-split-art"><Art name="hive" alt="A golden honeycomb shelf where every cell holds a mustard seed busy at a different craft." sizes="(max-width: 760px) 92vw, 600px" /></div>
          <div className="sb-split-copy">
            <p className="sb-label">07 <span aria-hidden="true">/</span> For agencies and creative partners</p>
            <h2 id="sb-agency-title">More capability. <em>Still your name.</em></h2>
            <p>Bring us behind the scenes for websites, custom software, AI systems and creative production. You keep the client relationship. We build to the scope you agree.</p>
            <Link className="sb-btn sb-btn-line" href="/white-label">White-label services {ARROW}</Link>
          </div>
        </section>

        <section className="sb-section sb-split sb-flip" aria-labelledby="sb-first-title">
          <div className="sb-split-art"><Art name="first-look" alt="A cheerful laptop character pins colorful notes to a planning board." sizes="(max-width: 760px) 92vw, 600px" /></div>
          <div className="sb-split-copy">
            <p className="sb-label">08 <span aria-hidden="true">/</span> See it before you leap</p>
            <h2 id="sb-first-title">A first look, <em>free.</em></h2>
            <p>Send us your current website. We’ll audit your site, your Google profile and your reviews, and show you exactly what’s costing you calls.</p>
            <div className="sb-ctas">
              <Link className="sb-btn" href="/presence-audit">Get the free audit {ARROW}</Link>
              <Link className="sb-link" href="/book">Or book a call {ARROW}</Link>
            </div>
          </div>
        </section>

        <section id="mustard-tv" className="sb-section" aria-labelledby="sb-tv-title">
          <div className="sb-head sb-head-row">
            <div>
              <p className="sb-label">09 <span aria-hidden="true">/</span> Mustard TV</p>
              <h2 id="sb-tv-title">From “what if” <em>to there it is.</em></h2>
              <p>Original films and songs, made in house. The same studio makes yours.</p>
            </div>
            <Link className="sb-btn sb-btn-line" href="/launch-film">A film for your launch {ARROW}</Link>
          </div>
          <StorybookTV films={flatheadFilms} />
        </section>

        <section id="faq" className="sb-section sb-faq" aria-labelledby="sb-faq-title">
          <div className="sb-faq-head">
            <p className="sb-label">10 <span aria-hidden="true">/</span> Before we begin</p>
            <h2 id="sb-faq-title">Good questions. <em>Straight answers.</em></h2>
            <img src="/storybook/ms-mustard-dahlia-cut-640.webp" width={640} height={640} alt="" loading="lazy" decoding="async" />
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
          <div className="sb-close-art"><Art name="close" alt="Sarah, Anthony and Dale wave under a great golden mustard tree with the whole seed crew." sizes="(max-width: 760px) 92vw, 760px" /></div>
          <div className="sb-close-copy">
            <p className="sb-label">Your next step</p>
            <h2 id="sb-close-title">A new venture. A stronger business. <em>Let’s build the tree.</em></h2>
            <p>A clear scope. A set package price. The finished work belongs to you.</p>
            <div className="sb-ctas">
              <Link className="sb-btn sb-btn-ink" href="/inquire">Start a conversation {ARROW}</Link>
              <Link className="sb-link" href="/book">Book a call {ARROW}</Link>
            </div>
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
                <p className="sb-label">{col.title}</p>
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
