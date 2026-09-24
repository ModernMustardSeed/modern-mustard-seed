import Link from '@/components/AttributionLink';
import s from './HeroDirections.module.css';
import NowShowing from './NowShowing';
import ShowMeMine from './ShowMeMine';
import { PREVIEW } from '@/data/preview-promise';

/* Three candidate homepage heroes, 2026-09-24. Each one replaces PosterHero
   whole; /hero-lab shows them in the real page so one can be picked. */

const SITES = [
  { name: 'D & D Landscaping', place: 'Tallahassee, Florida', slug: 'dd-landscaping', url: 'https://ddlandscapingfl.com', host: 'ddlandscapingfl.com' },
  { name: 'Cross + Covenant', place: 'Apparel, nationwide', slug: 'cross-covenant-current', url: 'https://crossandcovenant.co', host: 'crossandcovenant.co' },
  { name: 'Built Right in Montana', place: 'Flathead Valley, Montana', slug: 'brim-homes', url: 'https://brimhomes.com', host: 'brimhomes.com' },
  { name: 'Bare Earth', place: 'Flathead Valley, Montana', slug: 'bare-earth', url: 'https://bare-earth.vercel.app', host: 'bare-earth.vercel.app' },
  { name: 'Wildmere Honey Co.', place: 'Montana honey', slug: 'wildmere', url: 'https://wildmere.vercel.app', host: 'wildmere.vercel.app' },
];

function Shot({ slug, alt, sizes, eager }: { slug: string; alt: string; sizes: string; eager?: boolean }) {
  return <picture>
    <source type="image/avif" srcSet={'/images/editorial/' + slug + '-640.avif 640w, /images/editorial/' + slug + '-960.avif 960w, /images/editorial/' + slug + '-1440.avif 1440w'} sizes={sizes} />
    <source type="image/webp" srcSet={'/images/editorial/' + slug + '-640.webp 640w, /images/editorial/' + slug + '-960.webp 960w, /images/editorial/' + slug + '-1440.webp 1440w'} sizes={sizes} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={'/images/editorial/' + slug + '-1440.jpg'} alt={alt} width={1440} height={900} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" />
  </picture>;
}

function TopRule({ className }: { className: string }) {
  return <div className={className}><span>Design &amp; Agentic Systems Studio</span><span>Nationwide Reach · Hometown: Kalispell, Montana</span></div>;
}

/* A. The Wall: the work itself is the hero. Real, live sites fanned on the
   table, the promise set in the studio serif beside them. */
export function HeroWall() {
  const fan = [SITES[2], SITES[0], SITES[1]];
  return <section className={s.wall} aria-labelledby="studio-heading">
    <TopRule className={s.top} />
    <div className={s.wallGrid}>
      <div className={s.wallCopy}>
        <p className={s.chip}>Websites · Custom Software · Agentic Systems</p>
        <h1 id="studio-heading">Your vision,<br /><em>beautifully</em> built.</h1>
        <p className={s.lead}>Designed and engineered by Sarah Scarano in Montana, for people with something of their own to build. You own every line of it.</p>
        <div className={s.actions}>
          <Link href="/inquire" className={s.cta}>Tell Us What You Have In Mind <span aria-hidden="true">↗</span></Link>
          <a href="#selected-work" className={s.quiet}>See The Work <span aria-hidden="true">↓</span></a>
        </div>
      </div>
      <div className={s.fan}>
        {fan.map((x, n) => <a key={x.slug} href={x.url} target="_blank" rel="noopener noreferrer" className={s.card + ' ' + s['card' + n]}>
          <span className={s.bar}><i /><i /><i /><b>{x.host}</b></span>
          <Shot slug={x.slug} alt={x.name + ' website, designed and built by Modern Mustard Seed'} sizes="(max-width: 760px) 80vw, 36vw" eager={n === 1} />
          <span className={s.label}>{x.name}<span aria-hidden="true">↗</span></span>
        </a>)}
        <span className={s.sticker} aria-hidden="true">Real sites.<br />Live now.</span>
      </div>
    </div>
    <div className={s.roll}><span>On the wall</span>{SITES.map(x => <a key={x.slug} href={x.url} target="_blank" rel="noopener noreferrer">{x.name}</a>)}</div>
  </section>;
}

/* B. Night Screen: ink ground, one sentence that says what the studio does,
   and a monitor that plays the real work. */
export function HeroNight() {
  return <section className={s.night} aria-labelledby="studio-heading">
    <TopRule className={s.top + ' ' + s.topNight} />
    <div className={s.nightGrid}>
      <div className={s.nightCopy}>
        <p className={s.chip + ' ' + s.chipNight}>A studio in Kalispell, Montana</p>
        <h1 id="studio-heading">Websites that look the part.<em>Systems that do the work.</em></h1>
        <p className={s.lead}>Design, custom software and agentic systems from one studio, built for businesses that already work and want something of their own. You own it outright.</p>
        <div className={s.actions}>
          <Link href="/inquire" className={s.cta + ' ' + s.ctaNight}>Tell Us What You Have In Mind <span aria-hidden="true">↗</span></Link>
          <a href="tel:+14063121223" className={s.quiet + ' ' + s.quietNight}>Or Call (406) 312-1223</a>
        </div>
      </div>
      <NowShowing reels={SITES} className={s.monitor} screenClass={s.screen} chipsClass={s.channels} captionClass={s.caption} />
    </div>
  </section>;
}

/* C. The Offer: the hero is the free sketch itself. Paste a site, get a new
   one in your look within 24 hours, with the audit riding along. */
export function HeroOffer() {
  return <section className={s.offer} aria-labelledby="studio-heading">
    <TopRule className={s.top} />
    <div className={s.offerGrid}>
      <div className={s.offerCopy}>
        <p className={s.chip}>Free · Within 24 hours · No call needed</p>
        <h1 id="studio-heading">Paste your website.<em>We&rsquo;ll sketch you a new one.</em></h1>
        <p className={s.lead}>In your look, within 24 hours, with a free audit of your site, Google profile and reviews. {PREVIEW.line}</p>
        <ShowMeMine className={s.offerForm} />
        <p className={s.offerAlt}><Link href="/inquire">Already know what you want built? Begin a conversation <span aria-hidden="true">↗</span></Link></p>
      </div>
      <ol className={s.ticket} aria-label="What happens next">
        <li><b>01</b><div><strong>Paste your site.</strong><span>The address you have now. That is the whole form, to start.</span></div></li>
        <li><b>02</b><div><strong>We sketch a new one.</strong><span>In your look and your words, sent within 24 hours. Free.</span></div></li>
        <li><b>03</b><div><strong>Your audit rides along.</strong><span>Your site, Google profile and reviews, read and scored.</span></div></li>
        <li className={s.stamp} aria-hidden="true">Free</li>
      </ol>
    </div>
    <div className={s.strip}><span>Recent work</span><div>{SITES.slice(0, 4).map(x => <a key={x.slug} href={x.url} target="_blank" rel="noopener noreferrer"><Shot slug={x.slug} alt={x.name + ' website'} sizes="(max-width: 760px) 44vw, 20vw" /><em>{x.name}</em></a>)}</div></div>
  </section>;
}
