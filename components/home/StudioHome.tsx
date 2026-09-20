import Link from '@/components/AttributionLink';
import Image from 'next/image';
import styles from './StudioHome.module.css';

const projects = [
  { name: 'Wild Hope', type: 'Hospitality / Brand experience', image: 'wild-hope', url: 'https://wildhopehq.com', description: 'A place worth believing in.', detail: 'A Flathead Lake retreat, brought to life through seventeen original oil paintings and an immersive digital experience.' },
  { name: 'Cross + Covenant', type: 'Commerce / Identity / Engineering', image: 'cross-covenant', url: 'https://crossandcovenant.co', description: 'Conviction, made tangible.', detail: 'A direct-to-consumer apparel house, taken from first sketch to a working storefront and live collection.' },
  { name: 'Lago Society', type: 'Fashion / Commerce / AI', image: 'lago-society', url: 'https://lagosociety.com', description: 'A different pace of luxury.', detail: 'A lakeside fashion house with an editorial storefront and an AI personal stylist behind the experience.' },
];
const disciplines = [
  { title: 'Websites & Brand', href: '/websites', text: 'A presence that makes the right people stop. Art direction, identity, and a beautifully engineered website, with search and conversion built in.', tags: 'Strategy · Identity · Digital experiences' },
  { title: 'Custom Software', href: '/services', text: 'The product you wish existed, built around the way your business actually works. From the first specification to the system you own.', tags: 'Applications · Commerce · Internal systems' },
  { title: 'Voice & Applied AI', href: '/voice-agents', text: 'Intelligence with a real job to do. Answer the call, book the work, and keep the operation moving long after the office closes.', tags: 'Voice agents · Automations · AI systems' },
  { title: 'Advisory', href: '/advisory', text: 'A clear-eyed technical partner for your next move. Decide what deserves to be built, what to simplify, and where AI belongs.', tags: 'Direction · Architecture · Ongoing counsel' },
];
function Arrow() { return <span aria-hidden="true">↗</span>; }
function ProjectImage({ name, alt, sizes }: { name: string; alt: string; sizes: string }) {
  return <picture>
    <source type="image/avif" srcSet={'/images/editorial/' + name + '-640.avif 640w, /images/editorial/' + name + '-1280.avif 1280w'} sizes={sizes} />
    <source type="image/webp" srcSet={'/images/editorial/' + name + '-640.webp 640w, /images/editorial/' + name + '-1280.webp 1280w'} sizes={sizes} />
    <img src={'/images/editorial/' + name + '-1280.jpg'} alt={alt} width={1280} height={800} loading="lazy" decoding="async" />
  </picture>;
}
export default function StudioHome({ faq }: { faq: { q: string; a: string }[] }) {
  return <div className={styles.studio} data-design="mms-editorial-2026">
    <section className={styles.hero} aria-labelledby="studio-heading">
      <div className={styles.heroTop}><span>Independent Design & AI Studio</span><span>Kalispell, Montana · Working Everywhere</span></div>
      <div className={styles.heroArt}>
        <picture>
          <source type="image/avif" srcSet="/images/editorial/seed-sculpture-640.avif 640w, /images/editorial/seed-sculpture-1280.avif 1280w" sizes="(max-width: 760px) 240px, 45vw" />
          <source type="image/webp" srcSet="/images/editorial/seed-sculpture-640.webp 640w, /images/editorial/seed-sculpture-1280.webp 1280w" sizes="(max-width: 760px) 240px, 45vw" />
          <img src="/images/editorial/seed-sculpture-1280.jpg" alt="A luminous mustard-yellow seed sculpture encircled by a polished silver ribbon" width={1024} height={1536} fetchPriority="high" />
        </picture>
      </div>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><span className={styles.dot} /> Small beginnings. Remarkable outcomes.</p>
        <h1 id="studio-heading">Exceptional<br />by <em>design.</em><br /><span>Intelligent</span><br />by nature.</h1>
        <div className={styles.heroIntro}><p>Distinctive websites. Custom software. AI with purpose. For people building something worth owning.</p><Link href="/inquire" className={styles.primary}>Tell Us What You Have In Mind <Arrow /></Link></div>
      </div>
      <div className={styles.heroBottom}><a href="#selected-work">Explore The Work <span aria-hidden="true">↓</span></a><span>Strategy, design & engineering. One studio.</span><span className={styles.edition}>MMS / 01</span></div>
    </section>
    <section id="selected-work" className={styles.work} aria-labelledby="work-heading">
      <div className={styles.sectionTop}><p className={styles.eyebrow}>01 / Selected Work</p><span>Made here. Out in the world.</span></div>
      <div className={styles.workIntro}><h2 id="work-heading">The work<br />speaks <em>first.</em></h2><div><p>A retreat that feels like arriving. A brand with something to say. A business with intelligence built in. Each one, its own world.</p><Link href="/work" className={styles.textLink}>Explore The Portfolio <Arrow /></Link></div></div>
      <div className={styles.projectGrid}>{projects.map((project, i) => <a key={project.name} href={project.url} target="_blank" rel="noopener noreferrer" className={styles.project}>
        <div className={styles.projectImage}><ProjectImage name={project.image} alt={project.name + ' website, designed and built by Modern Mustard Seed'} sizes={i === 0 ? '(max-width: 760px) 92vw, 88vw' : '(max-width: 760px) 92vw, 43vw'} /><span className={styles.visit}>Visit Live Site <Arrow /></span></div>
        <div className={styles.projectCaption}><div><p className={styles.eyebrow}>{project.type}</p><h3>{project.name}</h3></div><span className={styles.projectNumber}>0{i + 1}</span></div>
        <p className={styles.projectStatement}>{project.description}</p><p className={styles.projectDetail}>{project.detail}</p>
      </a>)}</div>
    </section>
    <section className={styles.statement} aria-label="Studio philosophy"><span className={styles.eyebrow}>Good looks are only the beginning.</span><p>Make it <em>beautiful.</em><br />Make it work <span>beautifully.</span></p><div>Design earns the attention. The engineering earns the trust.<br />We build the whole thing.</div></section>
    <section className={styles.disciplines} aria-labelledby="disciplines-heading"><div className={styles.disciplineIntro}><p className={styles.eyebrow}>02 / The Practice</p><h2 id="disciplines-heading">Considered<br />from every<br /><em>angle.</em></h2><p>Four disciplines. One person holding the vision from the first conversation to the final detail.</p><Link href="/work-with-us" className={styles.textLink}>How We Work <Arrow /></Link></div><div className={styles.disciplineList}>{disciplines.map((d, i) => <Link href={d.href} className={styles.discipline} key={d.title}><span className={styles.disciplineIndex}>0{i + 1}</span><div><h3>{d.title}</h3><p>{d.text}</p><span className={styles.tags}>{d.tags}</span></div><Arrow /></Link>)}</div></section>
    <section className={styles.founder} aria-labelledby="founder-heading"><div className={styles.founderHeading}><p className={styles.eyebrow}>03 / Personally Built</p><h2 id="founder-heading">An independent<br />studio. An<br /><em>invested founder.</em></h2></div><div className={styles.founderBody}><span className={styles.founderInitial}>S.</span><p className={styles.founderLead}>You work directly with the person who designs it. And the person who builds it.</p><p>I’m Sarah Scarano, founder, designer, and engineer. I bring the creative direction and the technical work together, so the thing we imagined is the thing that ships.</p><p>Based in Kalispell, Montana. Building for businesses with ambition, wherever they call home.</p><Link href="/about" className={styles.textLink}>Meet Sarah <Arrow /></Link><div className={styles.ownership}><span>Your idea. Your asset.</span><p>You own the code, the accounts, and the finished work. Changes to what we build are included.</p></div></div></section>
    <section className={styles.concierge} aria-labelledby="mustard-heading"><div className={styles.mascotFrame}><span className={styles.mascotOrbit} aria-hidden="true" /><Image src="/images/editorial/mascot-480.webp" alt="Mr. Mustard, the smiling mustard-seed mascot and studio AI concierge" width={440} height={590} sizes="(max-width: 760px) 160px, 220px" className={styles.mascot} /><span className={styles.mascotLabel}>A Small Seed With A Real Job.</span></div><div><p className={styles.eyebrow}>A Little Character. A Lot Of Capability.</p><h2 id="mustard-heading">Still Mr. Mustard.<br /><em>Always at your service.</em></h2><p>The name has a story. The little guy has a job. Meet the studio’s AI concierge, here to answer questions and help you find your next step.</p><Link href="/mustard" className={styles.primary}>Meet Mr. Mustard <Arrow /></Link><a href="tel:+14063121223" className={styles.phone}>Or Call The Studio · (406) 312-1223</a></div></section>
    <section className={styles.faq} aria-labelledby="faq-heading"><div><p className={styles.eyebrow}>Before We Begin</p><h2 id="faq-heading">Good questions.<br /><em>Straight answers.</em></h2></div><div className={styles.faqList}>{faq.map(f => <details key={f.q}><summary>{f.q}<span aria-hidden="true">+</span></summary><p>{f.a}</p></details>)}</div></section>
    <section className={styles.close} aria-labelledby="close-heading"><p className={styles.eyebrow}>The Next Remarkable Thing Starts Somewhere.</p><h2 id="close-heading">Let’s make<br /><em>your mark.</em></h2><Link href="/inquire" className={styles.closeLink}>Begin A Conversation <Arrow /></Link><p>A considered scope. A set package price. Your vision, built.</p></section>
  </div>;
}
