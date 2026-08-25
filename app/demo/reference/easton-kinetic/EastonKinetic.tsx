'use client';

import { useEffect, useState } from 'react';
import './easton.css';

/**
 * EASTON KINETIC EVENT STUDIO, the reference build for the Easton Kinetic
 * template (Sarah's package v2, 2026-08-25), ported whole from
 * dev/mms/easton-kinetic-event-template-v2/source so the gallery can show the
 * entire site with its motion: the scroll progress bar, sticky project stack,
 * view-timeline reveals, orbit rings, ticker, scan lines, the lightbox and the
 * mobile drawer. Styles are scoped under .easton, images under
 * /reference/easton-kinetic/images.
 *
 * It is a reference, not a client: Easton's copy, metrics and contacts are the
 * package's own demo content and never ship on a new business.
 */

type PictureProps = { id: string; alt: string; widths?: number[]; className?: string; eager?: boolean; sizes?: string };

const IMG = '/reference/easton-kinetic/images';

const images = {
  hero: 'exec-aff70d6a-1e12-449b-ba8c-b179b9a50c78',
  trade: 'exec-f1a69a21-b44e-4aa9-bc25-6f2425a79e35',
  keynote: 'exec-8bd0d479-3468-444d-bec5-5450cc845623',
  festival: 'exec-e275b709-97a6-454c-a507-cf7fb7cf4734',
  crew: 'exec-4498b6e3-c5a1-4331-bcc6-fc2f9060d8cb',
  gala: 'exec-7c71a081-66a6-4263-804b-e7180e25fd13',
};

function Picture({ id, alt, widths = [640, 960, 1440], className, eager, sizes = '100vw' }: PictureProps) {
  const largest = widths[widths.length - 1];
  const srcSet = (ext: string) => widths.map((width) => `${IMG}/${id}-${width}.${ext} ${width}w`).join(', ');
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${IMG}/${id}-${largest}.jpg`} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" />
    </picture>
  );
}

const widthsFor = (id: string) => (id === images.festival ? [480, 800, 1200] : undefined);

const projects = [
  { kind: 'Trade show', title: 'A city inside a convention hall.', copy: 'Immersive environments that make a brand impossible to walk past.', image: images.trade, alt: 'A futuristic trade show floor with immersive booths and sculptural lighting', color: 'lime' },
  { kind: 'Conference', title: 'The room, completely switched on.', copy: 'Keynotes, breakouts, and the connective tissue between them, built as one living system.', image: images.keynote, alt: 'A keynote speaker on a glowing stage facing an engaged audience', color: 'violet' },
  { kind: 'Concert', title: 'Turn volume into a skyline.', copy: 'Touring shows and one-night spectacles with the precision to make chaos look choreographed.', image: images.festival, alt: 'An outdoor festival crowd beneath a monumental stage and colorful light beams', color: 'coral' },
  { kind: 'Experience', title: 'Make the impossible feel obvious.', copy: 'Launches, galas, and brand worlds with a point of view strong enough to leave a mark.', image: images.gala, alt: 'An immersive gala dinner beneath a glowing ring sculpture', color: 'cyan' },
];

const steps = [
  ['01', 'Find the voltage', 'We get obsessed with the why, then pull the one sharp idea that can carry a room.'],
  ['02', 'Build the world', 'From stage architecture to show flow, every handoff is designed to feel inevitable.'],
  ['03', 'Make it move', 'Light, sound, people, timing. The choreography is where a plan becomes a memory.'],
  ['04', 'Leave a mark', 'The room empties. The feeling stays. That is the only post-event metric we care about.'],
];

const gallery = [
  { image: images.hero, alt: 'Massive concert crowd beneath electric stage lights and confetti', label: 'North / Live' },
  { image: images.crew, alt: 'Event production crew taping a cable backstage beside road cases', label: 'Before / Doors' },
  { image: images.trade, alt: 'Immersive trade show floor with bright sculptural installations', label: 'Future / Expo' },
  { image: images.gala, alt: 'Guests gathered for a luminous immersive gala dinner', label: 'Night / Table' },
  { image: images.keynote, alt: 'Conference keynote with a speaker and a glowing abstract backdrop', label: 'Signal / Summit' },
  { image: images.festival, alt: 'Blue-hour outdoor music festival with a colorful stage', label: 'Open / Air' },
];

function Arrow() {
  return <span className="arrow" aria-hidden="true">↗</span>;
}

export default function EastonKinetic() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openPhoto, setOpenPhoto] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max ? (window.scrollY / max) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || openPhoto !== null ? 'hidden' : '';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); setOpenPhoto(null); }
    };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', close); };
  }, [menuOpen, openPhoto]);

  return (
    <main className="easton">
      <div className="scroll-progress" style={{ width: `${progress}%` }} />
      <a className="skip" href="#main-content">Skip to content</a>
      <header className="nav">
        <a href="#top" className="brand" aria-label="Easton Events home"><span className="brand-mark">E</span><span className="brand-name">Easton<br /><i>Events</i></span></a>
        <nav className="nav-links" aria-label="Primary navigation"><a href="#work">Work</a><a href="#method">Method</a><a href="#about">About</a><a href="#contact">Start a project</a></nav>
        <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><span /> <span /> Menu</button>
      </header>

      {menuOpen && (
        <div className="nav-drawer" role="dialog" aria-modal="true" aria-label="Site navigation">
          <button className="drawer-close" onClick={() => setMenuOpen(false)}>Close <b>×</b></button>
          <div className="drawer-orbit">E</div>
          <nav>
            <a href="#work" onClick={() => setMenuOpen(false)}>Work <small>01</small></a>
            <a href="#method" onClick={() => setMenuOpen(false)}>Method <small>02</small></a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About <small>03</small></a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Start a project <small>04</small></a>
          </nav>
          <p>Large-scale events for people who would rather feel the future than hear about it.</p>
        </div>
      )}

      <section className="hero" id="top">
        <div className="hero-backdrop">
          <Picture id={images.hero} widths={[640, 960, 1440, 1920]} alt="A massive live concert with a sea of people, electric stage lighting and confetti" className="hero-image" eager />
          <div className="hero-vignette" />
        </div>
        <div className="hero-noise" />
        <div className="hero-content">
          <div className="eyebrow"><span className="pulse-dot" /> Easton Events / EST. 2008</div>
          <h1>Make the<br /><em>moment</em><br />massive<span className="period">.</span></h1>
          <p className="hero-intro">We design and produce large-scale events that turn a room full of people into one undeniable feeling.</p>
          <a href="#work" className="hero-cta"><span>Enter the work</span><Arrow /></a>
        </div>
        <div className="hero-rail"><span>Scroll to begin</span><b /></div>
        <div className="hero-coordinates"><span>40° 42′ 46″ N</span><span>74° 00′ 21″ W</span><i>signal acquired</i></div>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-orbit orbit-three" />
        <div className="hero-sticker"><span>NO</span><strong>SMALL<br />IDEAS</strong><i>↘</i></div>
      </section>

      <div className="ticker">
        <div>
          <span>TRADE SHOWS</span><b>✳</b><span>CONFERENCES</span><b>✳</b><span>CONCERTS</span><b>✳</b><span>BRAND WORLDS</span><b>✳</b><span>TRADE SHOWS</span><b>✳</b><span>CONFERENCES</span><b>✳</b><span>CONCERTS</span><b>✳</b>
        </div>
      </div>

      <section className="statement section" id="main-content">
        <div className="statement-label"><span>00 /</span> The brief</div>
        <div className="statement-content">
          <p className="microcopy">Easton Events is an independent production studio for the moments that need to matter.</p>
          <h2>Events aren&apos;t<br /><span>attended.</span><br />They&apos;re entered.</h2>
          <div className="statement-footer">
            <p>We bring strategy, creative, production, and the right amount of beautiful chaos under one roof.</p>
            <a href="#contact">Tell us the big idea <Arrow /></a>
          </div>
        </div>
        <div className="statement-glyph">+</div>
      </section>

      <section className="work section" id="work">
        <div className="work-header">
          <div><div className="section-index">01 / Selected capabilities</div><h2>Big rooms.<br /><i>Big energy.</i></h2></div>
          <p>From the first impossible sketch to the last light fading out, we make complexity look like a good time.</p>
        </div>
        <div className="project-stack">
          {projects.map((project, index) => (
            <article className={`project-card ${project.color}`} key={project.kind} style={{ '--card-index': index } as React.CSSProperties}>
              <div className="project-image"><Picture id={project.image} alt={project.alt} widths={widthsFor(project.image)} /><div className="image-scan" /></div>
              <div className="project-copy">
                <span className="project-kind">0{index + 1} / {project.kind}</span>
                <h3>{project.title}</h3>
                <p>{project.copy}</p>
                <a href="#contact" aria-label={`Discuss ${project.kind} projects`}>Build this feeling <Arrow /></a>
              </div>
              <span className="project-corner">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="numbers">
        <div className="number-row"><strong>17</strong><span>years making<br />the room move</span><strong>42</strong><span>cities with<br />a live signal</span><strong>1</strong><span>very good<br />reason to call</span></div>
        <div className="numbers-marquee">NO TWO EVENTS / EVER / REPEAT / NO TWO EVENTS / EVER / REPEAT /</div>
      </section>

      <section className="method section" id="method">
        <div className="method-sticky">
          <div className="section-index">02 / How it happens</div>
          <h2>The art of<br /><i>the handoff.</i></h2>
          <p>Good production is a chain reaction. We obsess over every link.</p>
          <div className="method-signal"><span>LIVE SYSTEM</span><b><i /><i /><i /><i /><i /></b></div>
        </div>
        <div className="method-steps">
          {steps.map(([number, title, copy]) => (
            <article key={number} className="method-step">
              <span className="step-number">{number}</span>
              <div className="step-line"><i /></div>
              <div><h3>{title}</h3><p>{copy}</p></div>
              <span className="step-arrow">↘</span>
            </article>
          ))}
        </div>
      </section>

      <section className="gallery section" id="gallery">
        <div className="gallery-head"><div className="section-index">03 / Proof of life</div><h2>Scenes from<br /><i>the signal.</i></h2><p>Every project has a pulse. These are a few frames from ours.</p></div>
        <div className="gallery-grid">
          {gallery.map((item, index) => (
            <button key={item.label} className={`gallery-photo gallery-${index + 1}`} onClick={() => setOpenPhoto(index)} aria-label={`Open ${item.label} image`}>
              <Picture id={item.image} alt={item.alt} widths={widthsFor(item.image)} />
              <span><small>0{index + 1}</small>{item.label}<b>↗</b></span>
            </button>
          ))}
        </div>
      </section>

      {openPhoto !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={gallery[openPhoto].label}>
          <button className="lightbox-backdrop" onClick={() => setOpenPhoto(null)} aria-label="Close image viewer" />
          <button className="lightbox-close" onClick={() => setOpenPhoto(null)}>Close ×</button>
          <button className="lightbox-prev" onClick={() => setOpenPhoto((openPhoto - 1 + gallery.length) % gallery.length)}>←</button>
          <div>
            <Picture id={gallery[openPhoto].image} alt={gallery[openPhoto].alt} widths={widthsFor(gallery[openPhoto].image)} />
            <p><small>0{openPhoto + 1} / 06</small>{gallery[openPhoto].label}</p>
          </div>
          <button className="lightbox-next" onClick={() => setOpenPhoto((openPhoto + 1) % gallery.length)}>→</button>
        </div>
      )}

      <section className="about section" id="about">
        <div className="about-image"><Picture id={images.crew} alt="Event production crew working with cable and lighting equipment backstage" /><div className="about-image-label">THE PEOPLE<br />BEHIND THE<br />PULSE</div></div>
        <div className="about-copy">
          <div className="section-index">04 / The studio</div>
          <h2>Calm in<br /><i>the chaos.</i></h2>
          <p>We are producers, designers, show callers, fixers, and deeply curious people. The best version of an event is the one that feels effortless to everyone except the team that made it happen.</p>
          <p>Easton is small by design and large by capability. One accountable crew, a trusted global network, and zero interest in making a moment feel ordinary.</p>
          <a href="#contact" className="outline-link">Meet your new production partner <Arrow /></a>
        </div>
      </section>

      <section className="contact" id="contact">
        <div className="contact-glow" />
        <div className="section-index">05 / Your move</div>
        <h2>Have a big<br /><i>one?</i></h2>
        <p>Tell us the venue, the ambition, and the thing you can&apos;t stop thinking about. We&apos;ll bring the first spark.</p>
        <a className="contact-button" href="mailto:hello@eastonevents.co?subject=Start a project with Easton Events"><span>Start a project</span><Arrow /></a>
        <div className="contact-code"><span>EE / 2026</span><span>THE ROOM IS YOURS</span></div>
      </section>

      <footer>
        <div className="footer-top">
          <a href="#top" className="footer-brand"><span className="brand-mark">E</span><span>Easton<br /><i>Events</i></span></a>
          <div><small>New business</small><a href="mailto:hello@eastonevents.co">hello@eastonevents.co</a><a href="tel:+12125550182">+1 212 555 0182</a></div>
          <div><small>Elsewhere</small><a href="#work">Work</a><a href="#method">Method</a><a href="#about">Studio</a></div>
          <div>
            <small>Dispatches</small>
            <p>Occasional notes from inside the room.</p>
            <form onSubmit={(e) => e.preventDefault()}>
              <label className="sr-only" htmlFor="easton-email">Email address</label>
              <input id="easton-email" type="email" placeholder="Your email" required />
              <button aria-label="Subscribe">↗</button>
            </form>
          </div>
        </div>
        <div className="footer-bottom"><span>© 2026 Easton Events</span><span>Built for the big moment.</span><a href="#top">Back to top ↑</a></div>
      </footer>
    </main>
  );
}
