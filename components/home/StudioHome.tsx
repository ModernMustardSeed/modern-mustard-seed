import Link from '@/components/AttributionLink';
import Image from 'next/image';
import styles from './StudioHome.module.css';

const projects = [
  { name: 'D & D Landscaping', type: 'Landscaping / Client website', image: 'dd-landscaping', url: 'https://ddlandscapingfl.com', description: 'A local business, unmistakable.', detail: 'A Tallahassee landscaping site with service selection, walkthrough booking, and a voice concierge.' },
  { name: 'Cross + Covenant', type: 'Commerce / Studio brand', image: 'cross-covenant-current', url: 'https://crossandcovenant.co', description: 'Wear the Gospel.', detail: 'An apparel storefront with original collections, a free Bible, daily devotionals, and a prayer wall.' },
  { name: 'Built Right in Montana', type: 'Custom homes / Client website', image: 'brim-homes', url: 'https://brimhomes.com', description: 'Built for the way Montana lives.', detail: 'A Flathead Valley homebuilder’s website, with a project showcase and a direct path to a build conversation.' },
  { name: 'Bare Earth', type: 'Landscape & construction / Concept', image: 'bare-earth', url: 'https://bare-earth.vercel.app', description: 'Grounds worthy of the valley.', detail: 'A landscape and construction concept for the Flathead Valley, with service pages and an instant-quote experience.' },
  { name: 'Wildmere Honey Co.', type: 'Brand experience / Studio concept', image: 'wildmere', url: 'https://wildmere.vercel.app', description: 'Montana honey, in full character.', detail: 'An original honey-brand concept with a scroll-led product story, audio tour, and voice concierge.' },
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
    <source type="image/avif" srcSet={'/images/editorial/' + name + '-640.avif 640w, /images/editorial/' + name + '-960.avif 960w, /images/editorial/' + name + '-1440.avif 1440w'} sizes={sizes} />
    <source type="image/webp" srcSet={'/images/editorial/' + name + '-640.webp 640w, /images/editorial/' + name + '-960.webp 960w, /images/editorial/' + name + '-1440.webp 1440w'} sizes={sizes} />
    <img src={'/images/editorial/' + name + '-1440.jpg'} alt={alt} width={1440} height={900} loading="lazy" decoding="async" />
  </picture>;
}
export default function StudioHome({ faq }: { faq: { q: string; a: string }[] }) {
  return <div className={styles.studio} data-design="mms-editorial-2026" data-edition="pop-art-studio">
    <section className={styles.hero} aria-labelledby="studio-heading">
      <div className={styles.heroTop}><span>Bespoke Design &amp; Technology Studio</span><span>Kalispell, Montana · Working Everywhere</span></div>
      <div className={styles.heroArt} role="group" aria-label="A collage of websites built by Modern Mustard Seed">
        <div className={styles.printField} aria-hidden="true" />
        <span className={styles.printIndex}>The studio / In full color</span>
        <div className={styles.workPrint + ' ' + styles.printOne}><span>01 / D & D Landscaping</span><Image unoptimized src="/images/editorial/dd-landscaping-640.webp" alt="D & D Landscaping’s current website, with a bold green identity and a sunlit lawn beneath oak trees" width={640} height={400} fetchPriority="high" /></div>
        <div className={styles.workPrint + ' ' + styles.printTwo}><span>02 / Cross + Covenant</span><Image unoptimized src="/images/editorial/cross-covenant-current-640.webp" alt="The current Cross + Covenant storefront, featuring the Wear the Gospel collection" width={640} height={400} /></div>
        <div className={styles.mascotSeal}><Image src="/images/editorial/mascot-160.webp" alt="Mr. Mustard, the studio’s mustard-seed mascot" width={120} height={161} sizes="100px" /><span>Mr.<br />Mustard.</span></div>
        <span className={styles.registration} aria-hidden="true">+</span>
      </div>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><span className={styles.dot} /> Design & technology, with character.</p>
        <h1 id="studio-heading">Your vision.<br /><em>Beautifully</em><br />built.</h1>
        <div className={styles.heroIntro}><p>Websites, custom software, and AI systems. Designed and built by Sarah Scarano in Montana, for people with something of their own to build.</p><Link href="/inquire" className={styles.primary}>Tell Us What You Have In Mind <Arrow /></Link></div>
      </div>
      <div className={styles.heroBottom}><a href="#selected-work">Explore The Work <span aria-hidden="true">↓</span></a><span>Strategy, design & engineering. One studio.</span><span className={styles.edition}>MMS / 01</span></div>
    </section>
    <div className={styles.colorBand}><span>Bespoke by design.</span><span aria-hidden="true">✳</span><span>Built with character.</span><span aria-hidden="true">✳</span><span>Made to work.</span></div>
    <section id="selected-work" className={styles.work} aria-labelledby="work-heading">
      <div className={styles.sectionTop}><p className={styles.eyebrow}>01 / Selected Work</p><span>Made here. Out in the world.</span></div>
      <div className={styles.workIntro}><h2 id="work-heading">The work<br />speaks <em>first.</em></h2><div><p>A landscaper in Tallahassee. A homebuilder in Montana. A brand with something to say. Real client work, our own ventures, and original studio concepts.</p><Link href="/work" className={styles.textLink}>Explore The Portfolio <Arrow /></Link></div></div>
      <div className={styles.projectGrid}>{projects.map((project, i) => <a key={project.name} href={project.url} target="_blank" rel="noopener noreferrer" className={styles.project}>
        <div className={styles.projectImage}><ProjectImage name={project.image} alt={project.name + ' website, designed and built by Modern Mustard Seed'} sizes={i === 0 ? '(max-width: 760px) 92vw, 88vw' : '(max-width: 760px) 92vw, 43vw'} /><span className={styles.visit}>Visit Live Site <Arrow /></span></div>
        <div className={styles.projectCaption}><div><p className={styles.eyebrow}>{project.type}</p><h3>{project.name}</h3></div><span className={styles.projectNumber}>0{i + 1}</span></div>
        <p className={styles.projectStatement}>{project.description}</p><p className={styles.projectDetail}>{project.detail}</p>
      </a>)}</div>
    </section>
    <section className={styles.statement} aria-label="Studio philosophy"><span className={styles.eyebrow}>Good looks are only the beginning.</span><p>Make it <em>beautiful.</em><br />Make it work <span>beautifully.</span></p><div>Design earns the attention. The engineering earns the trust.<br />We build the whole thing.</div></section>
    <section className={styles.disciplines} aria-labelledby="disciplines-heading"><div className={styles.disciplineIntro}><p className={styles.eyebrow}>02 / The Practice</p><h2 id="disciplines-heading">Considered<br />from every<br /><em>angle.</em></h2><p>Four disciplines. One person holding the vision from the first conversation to the final detail.</p><Link href="/work-with-us" className={styles.textLink}>How We Work <Arrow /></Link></div><div className={styles.disciplineList}>{disciplines.map((d, i) => <Link href={d.href} className={styles.discipline} key={d.title}><span className={styles.disciplineIndex}>0{i + 1}</span><div><h3>{d.title}</h3><p>{d.text}</p><span className={styles.tags}>{d.tags}</span></div><Arrow /></Link>)}</div></section>
    <section className={styles.founder} aria-labelledby="founder-heading"><div className={styles.founderHeading}><p className={styles.eyebrow}>03 / Personally Built</p><h2 id="founder-heading">A bespoke<br />studio. An<br /><em>invested founder.</em></h2></div><div className={styles.founderBody}><span className={styles.founderInitial}>S.</span><p className={styles.founderLead}>You work directly with the person who designs it. And the person who builds it.</p><p>I’m Sarah Scarano, founder, designer, and engineer. I bring the creative direction and the technical work together, so the thing we imagined is the thing that ships.</p><p>Based in Kalispell, Montana. Building for businesses with ambition, wherever they call home.</p><Link href="/about" className={styles.textLink}>Meet Sarah <Arrow /></Link><div className={styles.ownership}><span>Your idea. Your asset.</span><p>You own the code, the accounts, and the finished work. Changes to what we build are included.</p></div></div></section>
    <section className={styles.concierge} aria-labelledby="mustard-heading"><div className={styles.mascotFrame}><span className={styles.mascotOrbit} aria-hidden="true" /><Image src="/images/editorial/mascot-480.webp" alt="Mr. Mustard, the smiling mustard-seed mascot and studio AI concierge" width={440} height={590} sizes="(max-width: 760px) 160px, 220px" className={styles.mascot} /><span className={styles.mascotLabel}>A Small Seed With A Real Job.</span></div><div><p className={styles.eyebrow}>A Little Character. A Lot Of Capability.</p><h2 id="mustard-heading">Still Mr. Mustard.<br /><em>Always at your service.</em></h2><p>The name has a story. The little guy has a job. Meet the studio’s AI concierge, here to answer questions and help you find your next step.</p><Link href="/mustard" className={styles.primary}>Meet Mr. Mustard <Arrow /></Link><a href="tel:+14063121223" className={styles.phone}>Or Call The Studio · (406) 312-1223</a></div></section>
    <section className={styles.faq} aria-labelledby="faq-heading"><div><p className={styles.eyebrow}>Before We Begin</p><h2 id="faq-heading">Good questions.<br /><em>Straight answers.</em></h2></div><div className={styles.faqList}>{faq.map(f => <details key={f.q}><summary>{f.q}<span aria-hidden="true">+</span></summary><p>{f.a}</p></details>)}</div></section>
    <section className={styles.close} aria-labelledby="close-heading"><p className={styles.eyebrow}>The Next Remarkable Thing Starts Somewhere.</p><h2 id="close-heading">Let’s make<br /><em>your mark.</em></h2><Link href="/inquire" className={styles.closeLink}>Begin A Conversation <Arrow /></Link><p>A considered scope. A set package price. Your vision, built.</p></section>
  </div>;
}
