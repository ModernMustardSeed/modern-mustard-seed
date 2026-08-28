'use client';

import { useEffect, useState } from 'react';
import './daisy.css';

/**
 * DAISY'S CAFE, the Lakehouse Editorial reference build (Sarah's package,
 * 2026-08-24), ported from dev/mms/daisys-cafe-site so the template gallery can
 * show the whole site, interactions included: the menu tabs, the lightbox, the
 * mobile menu dialog, the ticker, the hero motion. Styles are scoped under
 * .daisy and images live under /reference/daisys-cafe/images.
 *
 * It is a reference, not a client: the copy, the prices and the addresses are
 * the package's own fictional cafe on Flathead Lake.
 */

type PictureProps = { id: string; alt: string; widths?: number[]; className?: string; eager?: boolean; sizes?: string };

const IMG = '/reference/daisys-cafe/images';

const imageIds = {
  hero: 'exec-2ec7ddc3-1353-48ec-9dfa-8b4e6fcd73bf',
  food: 'exec-b900e646-9b08-4b59-9620-eab172c1e117',
  jazz: 'exec-6a551ac1-a954-492d-baf7-36568ed35d9a',
  cafe: 'exec-2ac40fc1-0c90-44d6-9f1e-6c7582d3ff51',
  dessert: 'exec-31d0574b-5850-4f70-ae3d-ed4530e653da',
  catering: 'exec-d756142f-ac1f-4e5e-a06e-7d9b6f3cd298',
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

const menus = {
  Breakfast: [
    ['Huckleberry Cloud Cakes', 'whipped ricotta, lemon cream, warm Montana huckleberries', '$18'],
    ['Lake Trout Benedict', 'smoked trout, poached eggs, dill hollandaise, sourdough', '$22'],
    ["Daisy's Big Breakfast", 'two eggs, maple sausage, crispy potatoes, toast, jam', '$21'],
    ['Garden Skillet', 'soft eggs, summer vegetables, chèvre, chile crisp, herbs', '$19'],
    ['Morning Bun French Toast', 'brown butter custard, orchard fruit, crème fraîche', '$18'],
    ["Boatman's Bowl", 'steel-cut oats, tahini maple, berries, seeds, olive oil', '$14'],
  ],
  Lunch: [
    ['Crispy Trout Sandwich', 'lemon slaw, pickles, herb remoulade, sesame bun', '$23'],
    ['Black Garlic Patty Melt', 'grass-fed beef, caramelized onion, alpine cheese, rye', '$24'],
    ['Lakehouse Cobb', 'smoked chicken, farm egg, avocado, bacon, blue cheese', '$21'],
    ['Roasted Mushroom Dip', 'fontina, black pepper jus, horseradish, hearth roll', '$20'],
    ['Picnic Plate', 'local cheese, cured trout, garden pickles, jam, sourdough', '$26'],
    ['Market Tomato Toast', 'stracciatella, basil, grilled peach, aged balsamic', '$17'],
  ],
  'Coffee + Sweet': [
    ['Daisy House Coffee', 'seasonal single-origin, bottomless at the table', '$5'],
    ['World Coffee Flight', 'three rotating preparations, served with tasting notes', '$16'],
    ['Huckleberry Hand Pie', 'all-butter crust, lake salt, lemon sugar', '$8'],
    ['Basque Cheesecake', 'burnt honey, cultured cream', '$11'],
    ['Pistachio Rose Cake', 'olive oil sponge, rose cream, toasted pistachio', '$12'],
    ['Dark Chocolate Tart', 'single-origin chocolate, coffee caramel, sea salt', '$12'],
  ],
} as const;

type MenuTab = keyof typeof menus;

const gallery = [
  { id: imageIds.food, alt: "Huckleberry pancakes, trout eggs Benedict, potatoes and coffee at Daisy's Cafe", label: 'Breakfast, emphatically' },
  { id: imageIds.cafe, alt: "The Daisy's Cafe interior opening onto the lakefront patio", label: 'Doors open to the lake' },
  { id: imageIds.jazz, alt: 'A jazz trio performing for Saturday Supper Club guests', label: 'Saturday, after dark' },
  { id: imageIds.dessert, alt: "Daisy's collection of globally inspired desserts and coffees", label: 'A well-traveled sweet tooth' },
  { id: imageIds.catering, alt: 'A catered lunch celebration beside Flathead Lake', label: 'Lunch, wherever you are' },
  { id: imageIds.hero, alt: 'Sunrise breakfast with two sailboats anchored on Flathead Lake', label: 'First light, table for two' },
];

const widthsFor = (id: string) => (id === imageIds.food ? [480, 800, 1200] : id === imageIds.hero ? [640, 960, 1440, 1920] : undefined);

function DaisyMark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? 'daisy-mark small' : 'daisy-mark'} aria-hidden="true">
      <i /><i /><i /><i /><i /><i /><b />
    </span>
  );
}

export default function DaisyCafe() {
  const [menuTab, setMenuTab] = useState<MenuTab>('Breakfast');
  const [openPhoto, setOpenPhoto] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = openPhoto !== null || menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [openPhoto, menuOpen]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpenPhoto(null); setMenuOpen(false); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  return (
    <main className="daisy">
      <a className="skip" href="#main-content">Skip to content</a>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Daisy's Cafe home"><DaisyMark small /><span>Daisy&apos;s</span><em>Cafe · Flathead Lake</em></a>
        <nav className="desktop-nav" aria-label="Primary navigation"><a href="#menu">Menu</a><a href="#boats">Sailboat breakfast</a><a href="#supper">Supper Club</a><a href="#gather">Gather + ship</a></nav>
        <a className="pill dark reserve-top" href="#reserve">Book a table <span>↗</span></a>
        <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu">Menu</button>
      </header>

      {menuOpen && (
        <div className="menu-panel" role="dialog" aria-modal="true" aria-label="Site menu">
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu">Close ×</button><DaisyMark />
          {[['Menu', '#menu'], ['Sailboat Breakfast', '#boats'], ['Saturday Supper Club', '#supper'], ['Catering + Shipped Sweets', '#gather'], ['Visit', '#visit']].map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
        </div>
      )}

      <section className="hero" id="top">
        <Picture id={imageIds.hero} widths={[640, 960, 1440, 1920]} alt="Sunrise breakfast on Daisy's Cafe terrace overlooking Flathead Lake with two sailboats anchored offshore" className="hero-image" eager />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow light">Bigfork, Montana · Open daily from 7</p>
          <h1>Good mornings<br />live <i>here.</i></h1>
          <div className="hero-bottom">
            <p>A café on the water for buttery breakfasts, long lunches, global sweets, and the sort of Saturdays you plan your week around.</p>
            <a href="#menu" className="circle-link" aria-label="Explore the menu"><span>See our<br />menu</span><b>↓</b></a>
          </div>
        </div>
        <div className="sunrise-tag"><span>Only at Daisy&apos;s</span><strong>Breakfast<br />by sailboat</strong></div>
        <div className="hero-caption">Two boats. One sunrise.<br />A table you&apos;ll talk about forever.</div>
      </section>

      <div className="ticker" aria-label="Daisy's offerings">
        <div>
          <span>BREAKFAST BY THE LAKE</span><DaisyMark small /><span>LUNCH WITH A VIEW</span><DaisyMark small /><span>JAZZ ALL DAY SATURDAY</span><DaisyMark small /><span>SUPPER CLUB AFTER DARK</span><DaisyMark small /><span>BREAKFAST BY THE LAKE</span><DaisyMark small /><span>LUNCH WITH A VIEW</span>
        </div>
      </div>

      <section className="intro section-pad" id="main-content">
        <div className="intro-kicker"><span>01</span> A little lake café with a big appetite</div>
        <h2>Come hungry.<br />Leave <em>sun-kissed.</em></h2>
        <div className="intro-copy">
          <DaisyMark />
          <p>We cook food with a sense of place and a passport in its pocket. Montana eggs, lake trout, orchard fruit, hand-thrown mugs, and flavors collected from the places we can&apos;t stop thinking about.</p>
          <a href="#visit" className="text-link">Our place on the lake <span>↗</span></a>
        </div>
      </section>

      <section className="photo-break">
        <Picture id={imageIds.cafe} alt="Daisy-filled cafe interior opening onto a sunny patio and Flathead Lake" />
        <div className="paper-note"><small>Our promise</small><strong>Nothing fussy.<br />Everything special.</strong><DaisyMark small /></div>
      </section>

      <section className="menu-section section-pad" id="menu">
        <div className="section-heading">
          <p className="eyebrow">On the table</p>
          <h2>Breakfast, lunch<br /><i>&amp; a little magic.</i></h2>
          <p>Seasonal, generous, and made here. We source from growers, bakers, ranchers, and cheesemakers around the Flathead.</p>
        </div>
        <div className="menu-card">
          <div className="menu-tabs" role="tablist" aria-label="Menu categories">
            {(Object.keys(menus) as MenuTab[]).map((tab) => (
              <button key={tab} role="tab" aria-selected={menuTab === tab} onClick={() => setMenuTab(tab)}>{tab}</button>
            ))}
          </div>
          <div className="menu-list" role="tabpanel">
            {menus[menuTab].map(([name, details, price], index) => (
              <article key={name} style={{ '--delay': `${index * 45}ms` } as React.CSSProperties}>
                <span className="item-no">0{index + 1}</span>
                <div><h3>{name}</h3><p>{details}</p></div>
                <strong>{price}</strong>
              </article>
            ))}
          </div>
          <div className="menu-foot"><span>GF and plant-friendly options always available</span><a href="#reserve">Save me a seat ↗</a></div>
        </div>
      </section>

      <section className="boats" id="boats">
        <Picture id={imageIds.hero} widths={[640, 960, 1440, 1920]} alt="Breakfast table at sunrise with Daisy's two sailboats on Flathead Lake" />
        <div className="boats-copy">
          <p className="eyebrow light">The first seating is offshore</p>
          <span className="outline-number">02</span>
          <h2>Rise. Sail.<br /><i>Breakfast.</i></h2>
          <p>Meet us at the dock before the lake wakes up. We&apos;ll sail you to one of our two anchored boats for a chef-packed sunrise breakfast, hot coffee, and mountain silence.</p>
          <div className="boat-details"><span><b>6:15 AM</b> departure</span><span><b>2–6</b> guests</span><span><b>90 MIN</b> on the water</span></div>
          <a href="mailto:hello@daisysflathead.com?subject=Sunrise sailboat breakfast" className="pill cream">Reserve the sunrise <span>↗</span></a>
        </div>
        <div className="boat-stamp">SAILBOAT<br />BREAKFAST<br /><b>★</b><br />FLATHEAD</div>
      </section>

      <section className="gallery-section section-pad" id="gallery">
        <div className="gallery-head">
          <div><p className="eyebrow">Lately, at Daisy&apos;s</p><h2>Crumbs, chords<br /><i>&amp; lake light.</i></h2></div>
          <p>Six little reasons to stay for one more coffee. Tap any photograph to take a closer look.</p>
        </div>
        <div className="gallery-grid">
          {gallery.map((photo, index) => (
            <button key={`${photo.id}-${index}`} className={`gallery-item g${index + 1}`} onClick={() => setOpenPhoto(index)} aria-label={`Open photo: ${photo.label}`}>
              <Picture id={photo.id} alt={photo.alt} sizes={index === 0 ? '60vw' : '35vw'} widths={widthsFor(photo.id)} />
              <span><em>0{index + 1}</em>{photo.label}<b>↗</b></span>
            </button>
          ))}
        </div>
      </section>

      {openPhoto !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={gallery[openPhoto].label} onClick={() => setOpenPhoto(null)}>
          <button className="lightbox-close" onClick={() => setOpenPhoto(null)} aria-label="Close photo">Close ×</button>
          <button className="lightbox-prev" onClick={(e) => { e.stopPropagation(); setOpenPhoto((openPhoto - 1 + gallery.length) % gallery.length); }} aria-label="Previous photo">←</button>
          <div onClick={(e) => e.stopPropagation()}>
            <Picture id={gallery[openPhoto].id} alt={gallery[openPhoto].alt} widths={widthsFor(gallery[openPhoto].id)} />
            <p><span>0{openPhoto + 1} / 06</span>{gallery[openPhoto].label}</p>
          </div>
          <button className="lightbox-next" onClick={(e) => { e.stopPropagation(); setOpenPhoto((openPhoto + 1) % gallery.length); }} aria-label="Next photo">→</button>
        </div>
      )}

      <section className="supper" id="supper">
        <div className="supper-image"><Picture id={imageIds.jazz} alt="Guests enjoying Daisy's candlelit Saturday Supper Club with a live jazz trio" /></div>
        <div className="supper-copy">
          <p className="eyebrow light">Every Saturday · Jazz from noon</p>
          <DaisyMark />
          <h2>Saturday<br /><i>Supper Club</i></h2>
          <p className="lead">One night. One destination. Four courses. Beautiful wine.</p>
          <p>Every week, our chef revisits a place that changed the way they cook, from Oaxaca to Osaka, Marseille to Marrakech, while our trio turns the room golden.</p>
          <div className="next-menu"><small>Next journey · September 5</small><strong>A long table in Sicily</strong><span>Charred octopus · Sungold tomato · Saffron arancini · Almond granita</span></div>
          <a href="mailto:supper@daisysflathead.com?subject=Saturday Supper Club reservation" className="pill cream">Join the club <span>↗</span></a>
        </div>
      </section>

      <section className="gather section-pad" id="gather">
        <div className="gather-intro"><p className="eyebrow">Daisy&apos;s, wherever</p><h2>Gather here.<br />Take us <i>home.</i></h2></div>
        <div className="service-card catering-card">
          <Picture id={imageIds.catering} alt="Daisy's catered lakeside lunch celebration under a cream canvas canopy" />
          <div>
            <span>01 / Gather</span>
            <h3>Catering that feels like you.</h3>
            <p>Lake lunches, wedding weekends, porch parties, and glorious office spreads, cooked here, finished there.</p>
            <a href="mailto:gather@daisysflathead.com?subject=Catering inquiry" className="text-link">Plan something beautiful ↗</a>
          </div>
        </div>
        <div className="service-card sweets-card">
          <Picture id={imageIds.dessert} alt="Global desserts and coffees including pistachio cake, canele, Basque cheesecake and huckleberry hand pies" />
          <div>
            <span>02 / Ship</span>
            <h3>Sweet things travel well.</h3>
            <p>Our huckleberry hand pies, coffee cake, canelés, and seasonal gift boxes ship every Tuesday across the lower 48.</p>
            <a href="mailto:sweets@daisysflathead.com?subject=Ship Daisy's desserts" className="text-link">Shop the pastry post ↗</a>
          </div>
        </div>
      </section>

      <section className="reserve" id="reserve">
        <div className="reserve-art"><DaisyMark /><DaisyMark /><DaisyMark /></div>
        <p className="eyebrow">Your table is waiting</p>
        <h2>Meet us<br /><i>by the lake.</i></h2>
        <p>Breakfast and lunch walk-ins are welcome. Reservations are encouraged for parties of six, sailboat breakfasts, and Saturday Supper Club.</p>
        <div>
          <a className="pill cream" href="mailto:hello@daisysflathead.com?subject=Table reservation">Book a table <span>↗</span></a>
          <a className="pill outline" href="tel:+14065550148">Call 406.555.0148</a>
        </div>
      </section>

      <footer id="visit">
        <div className="footer-top">
          <div className="footer-logo"><DaisyMark /><strong>Daisy&apos;s</strong><span>Cafe on Flathead Lake</span></div>
          <div><small>Find us</small><p>On the east shore<br />just north of Bigfork<br />Montana</p><a href="mailto:hello@daisysflathead.com">hello@daisysflathead.com</a></div>
          <div><small>Hours</small><p>Daily · 7am–3pm<br />Jazz Saturday · 12–3pm<br />Supper Club · 6:30pm</p><span>Closed Thanksgiving + Christmas</span></div>
          <div>
            <small>Stay in the loop</small>
            <p>Menus, music, and the next place our supper club is headed.</p>
            <form onSubmit={(e) => e.preventDefault()}>
              <label className="sr-only" htmlFor="daisy-email">Email address</label>
              <input id="daisy-email" type="email" placeholder="Your email" required />
              <button aria-label="Join newsletter">→</button>
            </form>
          </div>
        </div>
        <div className="footer-bottom"><span>© 2026 Daisy&apos;s Cafe</span><span>Made with butter, jazz &amp; lake air.</span><a href="#top">Back to top ↑</a></div>
      </footer>
    </main>
  );
}
