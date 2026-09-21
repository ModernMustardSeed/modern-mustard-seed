import Link from '@/components/AttributionLink';
import { buildMetadata, SITE } from '@/lib/seo';
import MustardNetworkTV from '@/components/ads/MustardNetworkTV';

const description = 'Commercials, brand films, and managed advertising from one studio. Mustard Pictures brings creative direction, production, and campaign management together. Contact Modern Mustard Seed to discuss your project.';
export const metadata = buildMetadata({ title: 'Mustard Pictures | Films & Advertising', description, path: '/pictures', image: '/pictures/opengraph-image' });
const steps = [
  { title: 'Find the story.', text: 'We start with your business, your audience, and what you want them to do. The concept, script, and visual direction are built around that.' },
  { title: 'Make the film.', text: 'We direct, edit, score, and finish the commercial. You review the work before it goes out, with cuts shaped for the places it will run.' },
  { title: 'Put it to work.', text: 'We build and manage the campaign in your own Meta and Google accounts. Creative and performance stay in the same conversation.' },
];
const faq = [
  { q: 'Are Pictures and Broadcast one service now?', a: 'Yes. Mustard Pictures brings our film production and Broadcast campaign management together. One conversation covers the creative and how it reaches your audience.' },
  { q: 'Can we start with a film?', a: 'Yes. Tell us where you want to use it. We shape the project around what you need, whether that is the finished film or production and an ongoing campaign.' },
  { q: 'Who owns the work and the ad accounts?', a: 'You do. Your finished creative belongs to your business, and campaigns run in accounts you own. You keep access to the work, the audience, and the reporting.' },
  { q: 'How do we get started?', a: 'Reach out with a little about your business, the audience you want to reach, and the idea or launch you have in mind. Sarah will reply personally to talk through the project.' },
];
const cta = 'inline-flex items-center justify-center gap-8 border-2 border-[#161616] bg-[#F5B700] px-7 py-4 font-sans text-sm font-bold text-[#161616] shadow-[5px_5px_0_0_#161616] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#1E50C8]';
export default function PicturesPage() {
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Service', name: 'Mustard Pictures', serviceType: 'Commercial and brand film production with managed advertising', description, url: SITE.url + '/pictures', provider: { '@type': 'Organization', name: SITE.name, url: SITE.url }, areaServed: 'US' },
    { '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ] };
  return <div data-offer="pictures-and-broadcast" className="bg-[#FBF6EA] text-[#161616]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <section className="relative overflow-hidden border-b-2 border-[#161616] px-6 pb-20 pt-32 md:px-[6vw] md:pb-28 md:pt-40">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap justify-between gap-4 border-b border-[#161616] pb-5 font-mono text-[10px] uppercase tracking-[.2em]"><span>Mustard Pictures</span><span>Films &amp; Advertising / Modern Mustard Seed</span></div>
        <div className="mt-14 grid items-end gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-20">
          <div><p className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-[#C4160B]">A good story deserves an audience.</p><h1 className="mt-6 font-display text-[clamp(2.7rem,7.5vw,7rem)] font-black leading-[.98] tracking-[-.05em]">Make a scene.<em className="mt-3 block w-fit bg-[#F5B700] px-2 py-1 leading-[1.08]">Make it count.</em></h1></div>
          <div className="lg:pb-2"><p className="max-w-lg font-body text-lg leading-relaxed">A film worth watching. A campaign built to carry it. We bring commercial production and managed advertising together, from the first idea to the work your customers see.</p><Link href="/inquire" className={cta + ' mt-8'}>Tell Us About Your Project <span aria-hidden="true">↗</span></Link><a href="#network" className="mt-7 block w-fit font-sans text-sm font-bold underline underline-offset-4">Watch The Studio Reel ↓</a></div>
        </div>
      </div>
    </section>
    <div className="border-b-2 border-[#161616] bg-[#1E50C8] px-6 py-5 text-center font-mono text-xs uppercase tracking-[.16em] leading-7 text-[#FBF6EA]">Creative direction <span aria-hidden="true"> / </span> Film production <span aria-hidden="true"> / </span> Campaign management</div>
    <section className="mx-auto max-w-7xl px-6 py-20 md:px-[6vw] md:py-28" aria-labelledby="one-studio"><div className="grid gap-8 md:grid-cols-2 md:gap-16"><h2 id="one-studio" className="font-display text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">From first frame<br />to the right audience.</h2><div className="font-body text-base leading-relaxed"><p>Mustard Pictures and Broadcast are now one offer. The same studio shapes the story, makes the commercial, and manages the campaign that puts it in front of people.</p><p className="mt-4">Brand films, commercial spots, and social cuts. Meta and Google campaigns, with ongoing refinement and reporting you can read. Everything begins with a conversation about your business.</p></div></div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">{steps.map((step, i) => <article key={step.title} className="border-2 border-[#161616] bg-white p-7 shadow-[5px_5px_0_0_#161616]"><span className="font-mono text-xs font-bold text-[#C4160B]">0{i + 1}</span><h3 className="mt-5 font-display text-3xl font-bold">{step.title}</h3><p className="mt-4 font-body text-sm leading-relaxed text-[#45484e]">{step.text}</p></article>)}</div>
    </section>
    <MustardNetworkTV />
    <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-[.8fr_1.2fr] md:gap-20 md:px-[6vw] md:py-28" aria-labelledby="questions"><h2 id="questions" className="font-display text-4xl font-bold leading-tight md:text-5xl">Before we<br /><em>roll.</em></h2><div>{faq.map(f => <details key={f.q} className="group border-b border-[#161616] py-6"><summary className="flex cursor-pointer list-none justify-between gap-5 font-sans text-base font-bold">{f.q}<span aria-hidden="true" className="text-xl group-open:rotate-45">+</span></summary><p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-[#45484e]">{f.a}</p></details>)}</div></section>
    <section id="contact" className="border-y-2 border-[#161616] bg-[#F5B700] px-6 py-20 md:py-28"><div className="mx-auto max-w-4xl text-center"><p className="font-mono text-xs uppercase tracking-[.2em]">Your next production starts here.</p><h2 className="mt-6 font-display text-5xl font-black leading-none tracking-tight md:text-7xl">What are we<br /><em>putting into the world?</em></h2><p className="mx-auto mt-7 max-w-xl font-body text-lg leading-relaxed">Tell us about your business and what you want people to see. We will take it from there.</p><Link href="/inquire" className={cta + ' mt-8 !bg-[#FBF6EA]'}>Reach Out To The Studio <span aria-hidden="true">↗</span></Link><a href={'mailto:' + SITE.email} className="mx-auto mt-7 block w-fit font-body text-sm font-bold underline underline-offset-4">{SITE.email}</a></div></section>
  </div>;
}
