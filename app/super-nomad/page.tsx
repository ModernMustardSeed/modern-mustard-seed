import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

/**
 * /super-nomad. The door for the Super Nomad iOS app.
 *
 * Every phone image on this page is a real screenshot of the running app,
 * captured from the live web build, not a mockup. The three photographs are
 * generated atmosphere: Earth's terminator, an aurora, a sun on the horizon.
 * None of them claims to be a specific place, because the product's whole
 * promise is that it never presents a guess as a fact.
 *
 * The App Store link replaces the demo button the day the listing is approved.
 * Source repo: ModernMustardSeed/super-nomad.
 */

const DEMO = 'https://super-nomad-preview.vercel.app';

export const metadata = buildMetadata({
  title: 'Super Nomad: Where Should Your Life Happen Next?',
  description:
    'An iOS app that ranks 94 places you could live in for a month against your own Nomad DNA: five years of measured climate, live weather, your passport, your work hours, your money. Every number says whether it was measured, estimated, or written by a person.',
  path: '/super-nomad',
  image: '/super-nomad/og-super-nomad-1200.jpg',
});

/** A screenshot of the running app, in a phone-shaped frame. */
function Shot({ name, alt, eager = false }: { name: string; alt: string; eager?: boolean }) {
  const src = (w: number, ext: string) => `/super-nomad/${name}-${w}.${ext}`;
  return (
    <div className="mx-auto w-[236px] shrink-0 sm:w-[272px]">
      <div className="rounded-[2.1rem] border border-[#F4ECDC]/15 bg-[#070D1A] p-[5px] shadow-[0_30px_70px_-24px_rgba(0,0,0,0.95)]">
        <picture>
          <source
            type="image/avif"
            srcSet={`${src(390, 'avif')} 390w, ${src(780, 'avif')} 780w, ${src(1170, 'avif')} 1170w`}
            sizes="(max-width: 640px) 236px, 272px"
          />
          <source
            type="image/webp"
            srcSet={`${src(390, 'webp')} 390w, ${src(780, 'webp')} 780w, ${src(1170, 'webp')} 1170w`}
            sizes="(max-width: 640px) 236px, 272px"
          />
          <img
            src={src(1170, 'jpg')}
            alt={alt}
            width={1170}
            height={2532}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className="block w-full rounded-[1.75rem]"
          />
        </picture>
      </div>
    </div>
  );
}

/** A full-bleed photograph behind a section. */
function Backdrop({ name, alt, position = 'center' }: { name: string; alt: string; position?: string }) {
  const src = (w: number, ext: string) => `/super-nomad/${name}-${w}.${ext}`;
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${src(640, 'avif')} 640w, ${src(1280, 'avif')} 1280w, ${src(1920, 'avif')} 1920w`}
        sizes="100vw"
      />
      <source
        type="image/webp"
        srcSet={`${src(640, 'webp')} 640w, ${src(1280, 'webp')} 1280w, ${src(1920, 'webp')} 1920w`}
        sizes="100vw"
      />
      <img
        src={src(1920, 'jpg')}
        alt={alt}
        width={1920}
        height={960}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: position }}
      />
    </picture>
  );
}

const powers = [
  {
    eyebrow: 'Scout',
    title: 'Ask for a life, not a hotel.',
    body: 'Say it in a sentence. "Somewhere warm next month in Europe under $2,500 with mountains and ocean." Scout reads the money, the weather, the month, the terrain and your work hours out of it, shows you exactly what it understood, then puts Visa Guardian, Work Agent, Budget Agent and Atlas across all 94 places.',
    note: 'Every agent says what it removed and why. Nothing is hidden and nothing is invented.',
    shot: 'shot-scout-results',
    alt: 'Scout results ranking Chania at 91 and Kotor at 91, each with a climate strip, monthly cost and time difference',
  },
  {
    eyebrow: 'The Atlas',
    title: '94 places, ranked for you, any month.',
    body: 'The planet drawn as a field of dots, every place a pin coloured by how well it fits you. Tap a different month and the whole map re-ranks, because a place that is perfect in October can be wrong in July.',
    note: 'Filters are honest subsets. Nothing is ever re-sorted by anyone paying.',
    shot: 'shot-atlas',
    alt: 'The Atlas world map with pins coloured by fit, a month strip, and filters for continent and terrain',
  },
  {
    eyebrow: 'Every place',
    title: 'Twelve months of measured weather, as one strip of colour.',
    body: 'Five years of reanalysis climate for every place, drawn as a band you read in a second. Under it: the live seven-day forecast, the distance and flight time from home, the stay rule for your passport with both government sources linked, the cost, and the one thing that is genuinely weakest about it.',
    note: 'The honest weak spot is on every card. A page that only flatters a place is a brochure.',
    shot: 'shot-place',
    alt: 'The Madeira page showing an 89 fit, a twelve month climate strip, and the reasons behind the score',
  },
  {
    eyebrow: 'Life Paths',
    title: 'Compare whole lives, not hotel tabs.',
    body: 'Seven chase modes. Endless Spring keeps every month inside your temperature band. Follow the Sun, Coast and Code, Wild Card, Chase Powder, Chase Waves, Chase Aurora. Atlas builds the run of months that stays inside what you asked for while spending the fewest miles and clock changes getting there.',
    note: 'Six months, four countries, every month in your band, priced to the dollar.',
    shot: 'shot-paths',
    alt: 'A six month Endless Spring path across Montreal, Madeira, Malaga, Taghazout and Las Palmas with the route mapped',
  },
  {
    eyebrow: 'What If',
    title: 'Put leaving next to staying.',
    body: 'The question nobody answers honestly. What does the next six months at home actually cost, in money and in weather and in the number of new countries, against the same six months spent moving? Four lives, side by side, with the same arithmetic applied to each.',
    note: 'Directional, and the screen says so. Costs are estimates; the climate behind them is measured.',
    shot: 'shot-whatif',
    alt: 'What If comparing staying home at $21,600 against an Endless Spring path at $14,600 with weather and adventure scored',
  },
  {
    eyebrow: 'My World',
    title: 'Now, next, later.',
    body: 'Where you are, where you are going, and everywhere you have saved, on one map. Missions counted from what you actually did, never from opening the app. Nomad Memory watches the gap between the cities you keep saving and the quiet places you actually loved, and tells you about it.',
    note: 'Crossroads finds where your path crosses a friend’s, from a code you swap. No server, no account.',
    shot: 'shot-me',
    alt: 'My World showing the current location, the next planned stay in Madeira, saved places and mission progress',
  },
];

const stamps = [
  { word: 'Measured', body: 'Five years of ERA5 reanalysis climate for every place, plus time zones, distance and daylight. Computed, not guessed.', tone: '#43D1B8' },
  { word: 'Live', body: 'Seven day weather from Open-Meteo and the planetary K index from NOAA, fetched while you look at it.', tone: '#43D1B8' },
  { word: 'Estimate', body: 'Monthly cost for one person living mid-range, with the month it was last updated printed next to it.', tone: '#F5B700' },
  { word: 'Editorial', body: 'Internet, safety, community, food and six more signals. Written by a person, and labelled as written by a person.', tone: '#A99BF0' },
  { word: 'Reference', body: 'Stay rules by passport, with two government sources linked on every card and a flag when the rules moved recently.', tone: '#E6DCC6' },
];

const faq = [
  {
    q: 'Is this a travel planner?',
    a: 'No. It does not book anything and it never guesses a fare. It decides. Given what you told it about a good life, it ranks the places you could actually live in for a month, for any month of the year, and shows the receipt behind every score. The flight and stay links open a search with your route already filled in, with no referral attached.',
  },
  {
    q: 'Can I try it before the App Store?',
    a: 'Yes. The whole app runs in a browser at the demo link on this page. It is the real product, not a mockup: the same engine, the same 94 places, the same live weather. The only things missing are the subscription and the morning notification, both of which need the App Store.',
  },
  {
    q: 'What does free include?',
    a: 'The whole thing, with limits. Your Nomad DNA, Scout with three answers per ask, all 94 places with measured climate and your fit, five saved places, the Endless Spring path, the standard What If lives, Earth Now, Radar and Missions.',
  },
  {
    q: 'What does Everywhere add?',
    a: 'Unlimited saves, ten answers per ask with the full agent receipt, all seven chase modes and paths from any month for any length, What If in your own words, the morning briefing, window codes for Crossroads, and export. $6.99 a month or $49.99 a year, with seven days free.',
  },
  {
    q: 'Where does my data go?',
    a: 'Nowhere. The app runs on your phone. No account, no analytics, no tracking. The only bytes that leave are the coordinates in a weather request, and, if you switch it on, an optional backup tied to an email code.',
  },
];

export default function SuperNomadPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Super Nomad', url: '/super-nomad' },
          ]),
          faqJsonLd(faq),
        ]}
      />
      <div className="relative bg-[#070D1A] text-[#F4ECDC]">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <picture>
              <source
                type="image/avif"
                srcSet="/super-nomad/hero-earth-terminator-640.avif 640w, /super-nomad/hero-earth-terminator-1280.avif 1280w, /super-nomad/hero-earth-terminator-1920.avif 1920w"
                sizes="100vw"
              />
              <source
                type="image/webp"
                srcSet="/super-nomad/hero-earth-terminator-640.webp 640w, /super-nomad/hero-earth-terminator-1280.webp 1280w, /super-nomad/hero-earth-terminator-1920.webp 1920w"
                sizes="100vw"
              />
              <img
                src="/super-nomad/hero-earth-terminator-1920.jpg"
                alt="Earth's curved horizon seen from high altitude at the day and night line, a band of gold atmosphere glowing along the curve above scattered city lights"
                width={1920}
                height={960}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_88%] md:object-[center_62%]"
              />
            </picture>
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(7,13,26,0.88) 0%, rgba(7,13,26,0.42) 42%, rgba(7,13,26,0.78) 80%, #070D1A 100%)' }}
            />
          </div>

          <div className="relative mx-auto max-w-6xl px-6 pt-36 pb-20 md:px-8 md:pt-48 md:pb-28">
            <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
              <div>
                <span className="mb-6 block font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5B700]">
                  Super Nomad · an iOS app by Modern Mustard Seed
                </span>
                <h1 className="font-display text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
                  Where should your life happen next?
                </h1>
                <p className="mt-7 max-w-xl font-body text-lg leading-relaxed text-[#E6DCC6] md:text-xl">
                  Not a travel planner. A way of deciding. Tell it what a good life feels like and it reads the planet for you: five years of measured climate for 94 places, live weather, your passport, your work hours, your money. One score per place, with the receipt.
                </p>
                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <a
                    href={DEMO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-[#F5B700] px-8 py-4 text-sm font-semibold text-[#070D1A] transition-colors hover:bg-[#FFD24D]"
                  >
                    Open the working demo
                  </a>
                  <a
                    href="#launch"
                    className="inline-flex items-center justify-center rounded-full border border-[#F4ECDC]/25 px-8 py-4 text-sm font-semibold text-[#F4ECDC] transition-colors hover:border-[#F4ECDC]/60"
                  >
                    Get the launch note
                  </a>
                </div>
                <p className="mt-6 font-mono text-xs text-[#98A1B4]">
                  The demo is the real app in a browser. Coming to the App Store, free, with an Everywhere subscription.
                </p>
              </div>

              <div className="lg:justify-self-end">
                <Shot
                  name="shot-today"
                  eager
                  alt="The Today screen: sunrise and sunset for Whitefish, Montana, and the best move this month scored at 89"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Proof strip */}
        <section className="relative border-y border-[#F4ECDC]/10 bg-[#0A1122]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 md:grid-cols-4 md:px-8">
            {[
              ['94', 'places you could live for a month'],
              ['56', 'countries, stay rules for five passports'],
              ['5 yr', 'of measured climate, per place, offline'],
              ['62', 'scheduled wonders with real windows'],
            ].map(([n, l]) => (
              <div key={l} className="py-10">
                <div className="font-display text-4xl font-black text-[#F5B700] md:text-5xl">{n}</div>
                <div className="mt-2 max-w-[15rem] font-mono text-[11px] uppercase leading-relaxed tracking-wider text-[#98A1B4]">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The six powers */}
        <section className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32">
          <div className="mb-20 max-w-2xl">
            <span className="mb-4 block font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#43D1B8]">
              What it actually does
            </span>
            <h2 className="font-display text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Six things no travel app does.
            </h2>
          </div>

          <div className="space-y-24 md:space-y-32">
            {powers.map((p, i) => (
              <article
                key={p.eyebrow}
                className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-20 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
              >
                <div>
                  <span className="mb-4 block font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#F5B700]">
                    {p.eyebrow}
                  </span>
                  <h3 className="font-display text-3xl font-black leading-tight tracking-tight md:text-4xl">{p.title}</h3>
                  <p className="mt-5 font-body text-base leading-relaxed text-[#E6DCC6]/90 md:text-lg">{p.body}</p>
                  <p className="mt-5 border-l-2 border-[#43D1B8]/60 pl-4 font-body text-sm leading-relaxed text-[#98A1B4]">
                    {p.note}
                  </p>
                </div>
                <Shot name={p.shot} alt={p.alt} />
              </article>
            ))}
          </div>
        </section>

        {/* Earth Now, full bleed */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Backdrop
              name="earth-now-aurora"
              alt="Green and violet aurora ribbons over a dark arctic ridgeline reflected in still black water"
              position="center 40%"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, #070D1A 0%, rgba(7,13,26,0.62) 30%, rgba(7,13,26,0.78) 70%, #070D1A 100%)' }}
            />
          </div>
          <div className="relative mx-auto max-w-6xl px-6 py-28 md:px-8 md:py-36">
            <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <span className="mb-4 block font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#FF7A45]">
                  Earth Now
                </span>
                <h2 className="font-display text-4xl font-black leading-tight tracking-tight md:text-5xl">
                  Look what is happening on Earth.
                </h2>
                <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-[#E6DCC6]">
                  Cherry blossom in Kyoto. The Perseids. Whale sharks off Isla Mujeres. Sixty-two scheduled wonders with real windows, sorted by how far each one is from where you are standing.
                </p>
                <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-[#98A1B4]">
                  Every aurora card is paired with the live planetary K index from NOAA, so when the app says the sky has a window tonight, that is a measurement and not a mood. Dates that follow a lunar calendar say so, because they move every year.
                </p>
              </div>
              <div className="lg:justify-self-end">
                <Shot
                  name="shot-earth"
                  alt="Earth Now listing open windows including aurora season over Tromso and the distance to each one"
                />
              </div>
            </div>
          </div>
        </section>

        {/* The truth stamp */}
        <section className="mx-auto max-w-4xl px-6 py-24 md:px-8 md:py-32">
          <span className="mb-4 block font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5B700]">
            The truth stamp
          </span>
          <h2 className="font-display text-4xl font-black leading-tight tracking-tight md:text-5xl">
            Every number says what it is.
          </h2>
          <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-[#E6DCC6]/90">
            Most apps blur the line between a fact, a guess and an opinion, because blurring it makes the product look smarter. This one draws the line on every screen.
          </p>
          <div className="mt-12 divide-y divide-[#F4ECDC]/10 rounded-2xl border border-[#F4ECDC]/10 bg-[#101B30]/60">
            {stamps.map((s) => (
              <div key={s.word} className="grid gap-3 p-6 sm:grid-cols-[150px_1fr] sm:gap-6">
                <div className="flex items-start">
                  <span
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{ borderColor: `${s.tone}66`, color: s.tone }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.tone }} />
                    {s.word}
                  </span>
                </div>
                <div className="font-body leading-relaxed text-[#E6DCC6]/90">{s.body}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 font-body text-base leading-relaxed text-[#98A1B4]">
            Fares are never guessed, so the app does not print one. Nothing is simulated. If it cannot know something, it says so and links the source that can.
          </p>
        </section>

        {/* Pricing */}
        <section className="relative overflow-hidden border-y border-[#F4ECDC]/10">
          <div className="absolute inset-0">
            <Backdrop
              name="horizon-sun"
              alt="A golden sun sitting exactly on a flat ocean horizon at first light"
              position="center 68%"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, #070D1A 0%, rgba(7,13,26,0.66) 42%, rgba(7,13,26,0.84) 78%, #070D1A 100%)' }}
            />
          </div>
          <div className="relative mx-auto max-w-5xl px-6 py-24 md:px-8 md:py-32">
            <h2 className="mb-12 max-w-2xl font-display text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Free is the whole product. Everywhere takes the limits off.
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[#F4ECDC]/12 bg-[#101B30]/80 p-8">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E6DCC6]">Free</span>
                <h3 className="mb-5 mt-3 font-display text-2xl font-bold">Everything, with limits.</h3>
                <ul className="space-y-3 font-body text-[#E6DCC6]/90">
                  <li>Your Nomad DNA, every question</li>
                  <li>Scout, three answers per ask</li>
                  <li>All 94 places, measured climate, your fit</li>
                  <li>Five saved places</li>
                  <li>Endless Spring, What If, Earth Now, Radar, Missions</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[#F5B700]/50 bg-[#F5B700]/10 p-8">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5B700]">Everywhere</span>
                <h3 className="mb-5 mt-3 font-display text-2xl font-bold">No ceiling.</h3>
                <ul className="space-y-3 font-body text-[#E6DCC6]/90">
                  <li>Unlimited saves and planned windows</li>
                  <li>Ten answers per ask, the full agent receipt</li>
                  <li>All seven chase modes, paths from any month</li>
                  <li>What If in your own words</li>
                  <li>The morning briefing, window codes, export</li>
                </ul>
                <p className="mt-6 font-mono text-sm text-[#F5B700]">$6.99 a month · $49.99 a year · seven days free</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-4xl px-6 py-24 md:px-8 md:py-32">
          <span className="mb-8 block font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#E6DCC6]">
            Questions
          </span>
          <div className="space-y-8">
            {faq.map((f) => (
              <div key={f.q} className="border-t border-[#F4ECDC]/10 pt-8">
                <h3 className="mb-3 font-display text-xl font-bold md:text-2xl">{f.q}</h3>
                <p className="font-body leading-relaxed text-[#E6DCC6]/90">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Launch */}
        <section id="launch" className="mx-auto max-w-4xl px-6 pb-28 md:px-8">
          <div className="rounded-3xl border border-[#F4ECDC]/10 bg-[#101B30] p-8 md:p-14">
            <span className="mb-4 block font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5B700]">
              The launch note
            </span>
            <h2 className="mb-4 font-display text-3xl font-black tracking-tight md:text-4xl">
              One email the day it lands.
            </h2>
            <p className="mb-8 max-w-xl font-body text-lg leading-relaxed text-[#E6DCC6]/90">
              The App Store link, the free tier, and the first month of Earth Now. Nothing else, ever.
            </p>
            <NewsletterSignup variant="inline" />
            <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 font-body text-sm text-[#98A1B4]">
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[#F4ECDC]">
                Open the demo
              </a>
              <span aria-hidden="true">·</span>
              <Link href="/super-nomad/privacy" className="underline underline-offset-4 hover:text-[#F4ECDC]">
                Privacy
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/super-nomad/terms" className="underline underline-offset-4 hover:text-[#F4ECDC]">
                Terms
              </Link>
              <span aria-hidden="true">·</span>
              <a href="mailto:sarah@modernmustardseed.com" className="underline underline-offset-4 hover:text-[#F4ECDC]">
                Support
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
