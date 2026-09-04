import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

/**
 * /super-nomad. The door for the Super Nomad iOS app: what it is, why it is
 * not a travel planner, what free includes, and where the legal pages live.
 * The App Store link is added here the day the listing goes live; until then
 * the page collects the launch list through the newsletter form.
 *
 * Source repo: ModernMustardSeed/super-nomad.
 */

export const metadata = buildMetadata({
  title: 'Super Nomad: Where Should Your Life Happen Next?',
  description:
    'An iOS app that ranks 94 places you could live in for a month against your own Nomad DNA: five years of measured climate, live weather, your passport, your work hours, your money. Every number says whether it was measured, estimated, or written by a person.',
  path: '/super-nomad',
});

const powers = [
  {
    eyebrow: 'Nomad DNA',
    title: 'Teach it what a good life feels like',
    body: 'Eight questions. Your temperature band, your monthly ceiling, your passport, the hours you have to be at your desk, the terrain that makes you come alive, how fast you like to move. Every answer is a constraint the engine actually uses.',
  },
  {
    eyebrow: 'Scout',
    title: 'Ask for a life, not a hotel',
    body: '"Somewhere warm next month under $2,500 with mountains and ocean." Scout reads the sentence into constraints, shows you what it understood, then runs Visa Guardian, Work Agent, Budget Agent and Atlas across every place. Each one says what it removed and why.',
  },
  {
    eyebrow: 'The Atlas',
    title: '94 places, ranked for you, any month',
    body: 'The planet as dots, every place a pin coloured by your fit. Each place carries twelve months of measured climate as a strip of colour, a live seven day forecast, the stay rule for your passport with the government source linked, and an honest weak spot.',
  },
  {
    eyebrow: 'Life Paths',
    title: 'Compare whole lives',
    body: 'Endless Spring keeps every month inside your band. Follow the Sun, Coast and Code, Wild Card, Chase Powder, Chase Waves, Chase Aurora. Atlas builds a run of months that minimises miles and clock changes, and What If puts it next to staying home.',
  },
  {
    eyebrow: 'Earth Now',
    title: 'Look what is happening on Earth',
    body: 'Cherry blossom in Kyoto. The Perseids. Whale sharks off Isla Mujeres. Aurora over Tromsø, paired with NOAA’s live K index so "the sky has a window tonight" is measured, not decorative. Sixty-two scheduled wonders with real windows.',
  },
  {
    eyebrow: 'My World',
    title: 'Now, next, later',
    body: 'Lived, saved and planned on one map. Missions counted from what you actually did. Nomad Memory notices the gap between the cities you save and the quiet places you loved. Crossroads finds where your path crosses a friend’s with a code you swap, and nothing uploaded anywhere.',
  },
];

const stamps = [
  { word: 'Measured', body: 'Five years of ERA5 climate for every place, live forecasts, time zones, daylight.' },
  { word: 'Live', body: 'Seven day weather from Open-Meteo and space weather from NOAA, refreshed while you look.' },
  { word: 'Estimate', body: 'Monthly cost for one person living mid-range, with the date it was last updated on the screen.' },
  { word: 'Editorial', body: 'Internet, safety, community, food and six more signals, written by a person and labelled as such.' },
  { word: 'Reference', body: 'Stay rules by passport with two government sources linked on every card. Never presented as settled.' },
];

const faq = [
  {
    q: 'Is this a travel planner?',
    a: 'No. It does not book anything and never guesses a fare. It decides. Given what you told it about a good life, it ranks the places you could actually live in for a month, for any month of the year, and shows the receipt behind every score. The flight and stay links open a search with your route filled in, with no referral attached.',
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
    a: 'Nowhere. The app runs on your phone. No account, no analytics, no tracking. The only bytes that leave are the coordinates in a weather request, and, if you turn it on, an optional backup tied to an email code.',
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
      <div className="relative min-h-screen bg-[#070D1A] text-[#F4ECDC] pt-36 md:pt-44 pb-28 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[520px] pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(255,122,69,0.22) 0%, rgba(245,183,0,0.12) 45%, rgba(7,13,26,0) 100%)' }}
        />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8">
          <div className="text-center mb-20">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#F5B700] font-mono font-bold mb-6 block">
              Super Nomad · an iOS app by Modern Mustard Seed
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.02]">
              Where should your life happen next?
            </h1>
            <p className="text-[#E6DCC6] text-lg md:text-xl font-body leading-relaxed max-w-2xl mx-auto">
              Not a travel planner. A way of deciding. Tell it what a good life feels like and it reads the planet for you: five years of measured climate for 94 places, live weather, your passport, your work hours, your money. One score per place, with the receipt.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#launch"
                className="inline-flex items-center justify-center rounded-full bg-[#F5B700] px-7 py-3.5 text-sm font-semibold text-[#070D1A] hover:bg-[#FFD24D] transition-colors"
              >
                Get the launch note
              </a>
              <Link
                href="/work"
                className="inline-flex items-center justify-center rounded-full border border-[#F4ECDC]/20 px-7 py-3.5 text-sm font-semibold text-[#F4ECDC] hover:border-[#F4ECDC]/50 transition-colors"
              >
                See what else we build
              </Link>
            </div>
            <p className="mt-6 text-xs font-mono text-[#98A1B4]">Coming to the App Store. Free, with an Everywhere subscription.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-24">
            {[
              ['94', 'places you could live in for a month'],
              ['56', 'countries, stay rules for five passports'],
              ['5 yr', 'of measured climate, per place, offline'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-[#F4ECDC]/10 bg-[#101B30] p-6">
                <div className="font-display text-4xl font-black text-[#F5B700]">{n}</div>
                <div className="mt-1 text-sm text-[#98A1B4] font-mono uppercase tracking-wider">{l}</div>
              </div>
            ))}
          </div>

          <section className="mb-24">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#43D1B8] font-mono font-bold mb-8 block">Six powers</span>
            <div className="grid gap-6 md:grid-cols-2">
              {powers.map((p) => (
                <article key={p.eyebrow} className="rounded-2xl border border-[#F4ECDC]/10 bg-[#101B30]/70 p-7">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-[#E6DCC6] font-mono font-bold">{p.eyebrow}</span>
                  <h2 className="font-display text-2xl font-bold mt-2 mb-3 tracking-tight">{p.title}</h2>
                  <p className="text-[#E6DCC6]/85 leading-relaxed">{p.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mb-24">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold mb-3 block">The truth stamp</span>
            <h2 className="font-display text-3xl md:text-4xl font-black tracking-tight mb-8">Every number says what it is.</h2>
            <div className="divide-y divide-[#F4ECDC]/10 rounded-2xl border border-[#F4ECDC]/10 bg-[#101B30]/50">
              {stamps.map((s) => (
                <div key={s.word} className="grid gap-2 sm:grid-cols-[140px_1fr] p-5">
                  <div className="font-mono text-sm uppercase tracking-[0.2em] text-[#F5B700]">{s.word}</div>
                  <div className="text-[#E6DCC6]/85">{s.body}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-[#98A1B4]">Fares are never guessed. Nothing is simulated. If the app cannot know something, it says so and links the source.</p>
          </section>

          <section className="mb-24 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#F4ECDC]/10 bg-[#101B30] p-7">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#E6DCC6] font-mono font-bold">Free</span>
              <h3 className="font-display text-2xl font-bold mt-2 mb-3">The whole thing, with limits.</h3>
              <ul className="space-y-2 text-[#E6DCC6]/85">
                <li>Your Nomad DNA, every question</li>
                <li>Scout, three answers per ask</li>
                <li>All 94 places, measured climate, your fit</li>
                <li>Five saved places</li>
                <li>Endless Spring, What If, Earth Now, Radar, Missions</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#F5B700]/50 bg-[#F5B700]/10 p-7">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold">Everywhere</span>
              <h3 className="font-display text-2xl font-bold mt-2 mb-3">Takes the limits off.</h3>
              <ul className="space-y-2 text-[#E6DCC6]/85">
                <li>Unlimited saves and windows</li>
                <li>Ten answers per ask, the full agent receipt</li>
                <li>All seven chase modes, paths from any month</li>
                <li>What If in your own words</li>
                <li>The morning briefing, window codes, export</li>
              </ul>
              <p className="mt-4 font-mono text-sm text-[#F5B700]">$6.99 a month · $49.99 a year · seven days free</p>
            </div>
          </section>

          <section className="mb-24">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E6DCC6] font-mono font-bold mb-8 block">Questions</span>
            <div className="space-y-6">
              {faq.map((f) => (
                <div key={f.q} className="border-t border-[#F4ECDC]/10 pt-6">
                  <h3 className="font-display text-xl font-bold mb-2">{f.q}</h3>
                  <p className="text-[#E6DCC6]/85 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="launch" className="rounded-3xl border border-[#F4ECDC]/10 bg-[#101B30] p-8 md:p-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold mb-3 block">The launch note</span>
            <h2 className="font-display text-3xl font-black tracking-tight mb-3">One email the day it lands.</h2>
            <p className="text-[#E6DCC6]/85 mb-6 max-w-xl">The App Store link, the free tier, and the first month of Earth Now. Nothing else, ever.</p>
            <NewsletterSignup variant="inline" />
            <p className="mt-8 text-sm text-[#98A1B4]">
              <Link href="/super-nomad/privacy" className="underline underline-offset-4 hover:text-[#F4ECDC]">Privacy</Link>
              {' · '}
              <Link href="/super-nomad/terms" className="underline underline-offset-4 hover:text-[#F4ECDC]">Terms</Link>
              {' · '}
              <a href="mailto:sarah@modernmustardseed.com" className="underline underline-offset-4 hover:text-[#F4ECDC]">Support</a>
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
