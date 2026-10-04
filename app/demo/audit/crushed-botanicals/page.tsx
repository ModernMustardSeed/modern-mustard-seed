import type { CSSProperties, ReactNode } from 'react';
import { buildMetadata } from '@/lib/seo';
import CopyMappings from './CopyMappings';
import { URL_MAPPINGS } from './mappings';

export const metadata = buildMetadata({ title: 'Crushed Botanicals Apothecary: Store Audit', noindex: true });

/**
 * A HAND-BUILT STORE AUDIT for Crushed Botanicals Apothecary (Nicole Bowen-Wiley, North Georgia).
 *
 * The presence engine grades contractors on reviews and a Google listing. This is an online store whose
 * orders stopped after a platform move, so the question is different and so is the page: what still
 * works, why the traffic stopped, and the exact fix she can do herself. Every finding was read off the
 * live site, the Wayback Machine index or a real cart on 2026-10-04. Nothing here is guessed.
 *
 * It sits at a static segment beside /demo/audit/[auditId], so Next serves it ahead of the dynamic route.
 */

const SEA = '#0b3b44';
const SAND = '#fbf5ea';
const TIFFANY = '#81d8d0';
const LAGOON = '#0a7c78';
const FOAM = '#d8f3f0';
const MUSTARD = '#f5b700';
const CORAL = '#ff6f59';

const DISPLAY: CSSProperties = { fontFamily: "var(--font-riviera), 'Unbounded', system-ui, sans-serif" };
const READ: CSSProperties = { fontFamily: "var(--font-caps), 'Figtree', system-ui, sans-serif" };
const CARD = 'rounded-[26px] bg-white p-6 sm:p-9 shadow-[0_30px_60px_-38px_#0b3b4455] ring-1 ring-[#0b3b44]/[0.07]';
const SITE = 'https://www.crushedbotanicals.com';

function Kicker({ children, onSea = false }: { children: ReactNode; onSea?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2.5 text-[11.5px] sm:text-[12px] font-semibold uppercase tracking-[0.18em]"
      style={{ ...READ, color: onSea ? TIFFANY : LAGOON }}
    >
      <span aria-hidden className="h-[0.7em] w-[0.7em] rounded-full shrink-0" style={{ background: MUSTARD, boxShadow: '0 0 0 3px #f5b70033' }} />
      {children}
    </span>
  );
}

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[26px] sm:text-[34px] font-bold leading-[1.08] tracking-[-0.03em] mt-3 mb-5 [text-wrap:balance]" style={{ ...DISPLAY, color: SEA }}>
      {children}
    </h2>
  );
}

function P({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[15.5px] leading-relaxed ${className}`} style={{ ...READ, color: `${SEA}cc` }}>
      {children}
    </p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md px-1.5 py-0.5 text-[13px] break-all" style={{ background: FOAM, color: SEA }}>
      {children}
    </code>
  );
}

const SEVERITY = {
  critical: { label: 'Critical', bg: CORAL, fg: SEA },
  high: { label: 'High', bg: MUSTARD, fg: SEA },
  medium: { label: 'Medium', bg: FOAM, fg: SEA },
} as const;

type Finding = { sev: keyof typeof SEVERITY; title: string; body: ReactNode };

const WORKS = [
  'The store is live and open: 92 products, every one priced and photographed.',
  'Add to cart works. We put Granny K’s All-Purpose Salve in a real cart and the cart counted it.',
  'Checkout opens on a secure page and calculates sales tax ($18.00 salve, $1.26 tax, $19.26 total).',
  'Subscribe and save is on: the salve offers $16.20 a month against $18.00 once.',
  'HTTPS is on, the bare domain forwards to www, and a sitemap of 115 pages is published for Google.',
  'Every product page carries Product and Offer data that Google can read.',
  'Shipping, returns, privacy, terms and an FDA disclaimer page are all published and linked in the footer.',
];

const ERAS = [
  { years: '2024 to early 2025', platform: 'Shopify', example: '/products/black-elderberry-syrup' },
  { years: '2025', platform: 'GoDaddy', example: '/shop/ols/products/organic-elderberry-syrup' },
  { years: 'August 2026 to now', platform: 'Squarespace', example: '/shop/p/organic-elderberry-syrup' },
];

const FINDINGS: Finding[] = [
  {
    sev: 'critical',
    title: 'Every link to your old store now opens an error page',
    body: (
      <>
        <P>
          Each platform move gave every product a new web address, and none of the old addresses were pointed at the new
          ones. The Wayback Machine has 318 addresses saved for crushedbotanicals.com from the Shopify and GoDaddy
          years. We tested them against the live site today. Every product, collection, blog and page address
          from before August returns <strong>404 Page Not Found</strong>.
        </P>
        <P className="mt-3">
          That is where the orders went. Google ranked the old addresses, so a search sends a buyer to a dead page. Every
          Pinterest pin, Facebook and Instagram post, email link and customer bookmark from the last two years lands on the
          same error. Google drops pages that keep returning 404, and the new addresses start from zero.
        </P>
      </>
    ),
  },
  {
    sev: 'critical',
    title: 'Google Shopping sends buyers to a website that no longer exists',
    body: (
      <>
        <P>
          Your Google Shopping listings are tied to <Code>elementalrocksnherbs.com</Code>. On October 4 that domain was not
          registered to anyone: it has no DNS records and the .com registry has no record of it. Every Shopping click goes
          to a site that does not load, and Google stops showing listings whose website does not answer.
        </P>
        <P className="mt-3">
          The domain is open to buy. Buying it back and forwarding it to crushedbotanicals.com recovers every old link that
          still points there, and keeps anyone else from buying a name your customers know.
        </P>
      </>
    ),
  },
  {
    sev: 'critical',
    title: 'Google does not show your site when someone searches your name',
    body: (
      <P>
        A search for <Code>crushedbotanicals.com</Code> on October 4 returned other botanical companies and not your
        store. A search for <Code>crushed botanicals herbal shop</Code> returned a directory listing for Elemental Rocks
        and Herbs in Dawsonville, and not crushedbotanicals.com. Someone who already knows your name and wants to reorder
        cannot find the store from a search.
      </P>
    ),
  },
  {
    sev: 'high',
    title: 'No analytics and no Facebook pixel',
    body: (
      <P>
        The site has no Google Analytics and no Meta (Facebook) pixel. You cannot see how many people visit, where they
        come from, or where they leave. Any Facebook or Instagram ad you run has no way to count a sale, so it cannot learn
        who buys. Squarespace&rsquo;s own Analytics panel helps, but it does not feed Google or Meta.
      </P>
    ),
  },
  {
    sev: 'high',
    title: 'The homepage Salves picture links to a dead address',
    body: (
      <P>
        The Salves image on the homepage links to <Code>https://salves</Code>, which is not a real web address. A shopper
        who taps it gets a browser error. It should link to <Code>/shop/salves-balms</Code>.
      </P>
    ),
  },
  {
    sev: 'medium',
    title: 'Product listings that need a fix',
    body: (
      <ul className="space-y-2.5 list-disc pl-5" style={{ ...READ, color: `${SEA}cc` }}>
        <li className="text-[15px] leading-relaxed">
          <strong>Pregnancy Blend</strong> has a $3.00 size next to $17.95 and $37.95. If that is a typo, every buyer
          who picks it gets the blend for $3.
        </li>
        <li className="text-[15px] leading-relaxed">
          <strong>Gut Heal Herbal Tea</strong>: the description calls the product &ldquo;Debloat &amp; Glow&rdquo; twice.
          Its address is <Code>/shop/p/gut-harmony-rhwlh</Code>, which is the name of a different tea.
        </li>
        <li className="text-[15px] leading-relaxed">
          <strong>Blue Sky Bliss</strong> is listed twice. The second copy&rsquo;s page title is &ldquo;Crushed Botanicals
          | A Little Peace, Bottled&rdquo;, so Google sees two pages competing for one product.
        </li>
        <li className="text-[15px] leading-relaxed">
          <strong>Addresses that do not match the product</strong>: <Code>spearmint-leaves-1-oz-htp5n</Code> opens
          Peppermint Leaves, and <Code>baby-whipped-tallow-butter</Code> opens Magnesium Whipped Tallow Butter.
        </li>
        <li className="text-[15px] leading-relaxed">
          <strong>14 of 92 products</strong> have a main image named like &ldquo;ChatGPT Image Nov 7, 2025&rdquo;, and on
          pages like Granny K&rsquo;s Salve that file name is the image description Google reads.
        </li>
        <li className="text-[15px] leading-relaxed">
          <strong>Sold out sizes</strong>: Blood Pressure Blend has 4 of 6 options at zero, Yoni Oil has 28 of 40, and
          the largest Chill and Heal Extract is at zero.
        </li>
        <li className="text-[15px] leading-relaxed">
          <strong>Product reviews and restock alerts are both switched off.</strong> Both are free in Squarespace, and
          reviews are what a first-time herbal buyer looks for.
        </li>
      </ul>
    ),
  },
  {
    sev: 'medium',
    title: 'Search titles and the FAQ',
    body: (
      <ul className="space-y-2.5 list-disc pl-5" style={{ ...READ, color: `${SEA}cc` }}>
        <li className="text-[15px] leading-relaxed">
          Page titles read like ad slogans: &ldquo;Our Story | Experience Natural Wellness &ndash; Shop Now&rdquo;,
          &ldquo;Returns &amp; Refunds | Shop Confidently - Explore Returns &amp; Refunds&rdquo;. None says what people search
          for: herbal apothecary, North Georgia, tallow skincare, elderberry syrup.
        </li>
        <li className="text-[15px] leading-relaxed">
          The FAQ page has no search description, and its address is <Code>/faqs-5</Code>. Its questions and answers are
          stored out of order, so Google and screen readers read &ldquo;What makes Crushed Botanicals different?&rdquo;
          followed by the answer about where products are made.
        </li>
        <li className="text-[15px] leading-relaxed">
          The store has no email address at crushedbotanicals.com (the domain has no mail records), so customers write to a
          Gmail address. That works, but a store address reads as more established.
        </li>
      </ul>
    ),
  },
];

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: 'Paste the redirects (this brings the old traffic back)',
    body: (
      <P>
        In Squarespace open <strong>Settings</strong>, then <strong>Developer Tools</strong>, then{' '}
        <strong>URL Mappings</strong> (type &ldquo;URL mappings&rdquo; in the settings search if the menu has moved).
        Paste the whole block below and save. Each line sends one old address to the page that replaces it, with a 301,
        the signal that tells Google the page moved for good and to carry its ranking over. Order matters: the specific
        lines are first and the catch-all lines with <Code>[name]</Code> are last.
      </P>
    ),
  },
  {
    title: 'Point Google Shopping at the new store',
    body: (
      <P>
        Buy <Code>elementalrocksnherbs.com</Code> back (Squarespace Domains or any registrar) and set it to forward to{' '}
        <Code>https://www.crushedbotanicals.com</Code>. Then in{' '}
        <a className="underline" style={{ color: LAGOON }} href="https://merchants.google.com" target="_blank" rel="noopener noreferrer">Google Merchant Center</a>{' '}
        change the business website to crushedbotanicals.com, verify and claim it, and send the product feed from the
        Squarespace store so every listing links to a page that loads.
      </P>
    ),
  },
  {
    title: 'Tell Google the store moved',
    body: (
      <P>
        Open <a className="underline" style={{ color: LAGOON }} href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Google Search Console</a>{' '}
        and add crushedbotanicals.com as a Domain property. Squarespace has a built-in connection for this (search &ldquo;Search Console&rdquo; in the Squarespace settings).
        Then submit <Code>{SITE}/sitemap.xml</Code> under Sitemaps. In a few days the Pages report will list every
        old address Google still tries. Any it lists that is not in the redirect block gets one more line.
      </P>
    ),
  },
  {
    title: 'Turn on tracking',
    body: (
      <P>
        Create a Google Analytics 4 property and a Meta pixel, then paste each ID into Squarespace (search
        &ldquo;Google Analytics&rdquo; and &ldquo;Facebook Pixel&rdquo; in the settings search). From that day on you can
        see visits, sources and sales, and ads can learn who buys.
      </P>
    ),
  },
  {
    title: 'Fix the listings',
    body: (
      <P>
        Point the homepage Salves image at <Code>/shop/salves-balms</Code>. Check the $3.00 Pregnancy Blend size, fix the
        Gut Heal description, delete the second Blue Sky Bliss, rename the image files, restock or hide the sold out
        sizes, and switch on product reviews and restock alerts under Commerce, Merchandising.
      </P>
    ),
  },
  {
    title: 'Rewrite the titles',
    body: (
      <P>
        In each page&rsquo;s SEO settings, write the title the way a buyer searches, for example &ldquo;Herbal Apothecary
        in North Georgia | Crushed Botanicals&rdquo; for the homepage and &ldquo;Herbal Teas | Crushed Botanicals
        Apothecary&rdquo; for the tea collection. Give the FAQ page a description and the address <Code>/faq</Code>. If you
        change an address, add one line to the redirects for the old one.
      </P>
    ),
  },
];

const QUESTIONS = [
  'When did the orders drop: right after the Squarespace launch in late August, or back when the store moved from Shopify to GoDaddy?',
  'Is there a Facebook or Instagram Shop, or product tags on your posts? If the catalog was linked to Shopify or GoDaddy, those tags now point at a store that is gone.',
  'Did you have Google Search Console set up before? If so, it still holds your old search history and shows exactly which pages lost traffic.',
  'Did your customer email list come over from Shopify and GoDaddy? A short "we moved, here is the new store" email is the fastest way to bring past buyers back.',
];

const RECEIPTS = [
  ['Live site', 'www.crushedbotanicals.com read on October 4, 2026, served by Squarespace'],
  ['Old addresses', '318 archived by the Wayback Machine from the Shopify (2024 to 2025) and GoDaddy (2025) stores'],
  ['Old stores', 'The Shopify and GoDaddy stores no longer answer; Squarespace is the only store'],
  ['Redirect targets', 'All 73 destination pages in the redirect block fetched and returned 200 on October 4'],
  ['Store data', '92 products, prices and stock read from the live Squarespace shop'],
  ['Cart test', 'Real add to cart and checkout page on October 4; we stopped before entering any details'],
  ['Search', 'Google searches for the domain and the business name on October 4'],
  ['Old domain', 'elementalrocksnherbs.com: no DNS answer and no .com registry record (RDAP 404) on October 4'],
  ['Mail', 'Public DNS for crushedbotanicals.com returns no MX records'],
];

export default function CrushedBotanicalsAudit() {
  return (
    <main
      data-audit-edition="riviera"
      className="min-h-screen px-4 sm:px-6 py-8 sm:py-14 print:py-0"
      style={{ ...READ, background: SAND, color: SEA }}
    >
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* the verdict */}
        <header className="rounded-[30px] bg-white p-6 sm:p-10 lg:p-12 shadow-[0_40px_80px_-44px_#0b3b4466] ring-1 ring-[#0b3b44]/[0.07]">
          <Kicker>Store Audit &middot; October 4, 2026</Kicker>
          <h1 className="text-[32px] sm:text-[48px] font-bold leading-[1.04] tracking-[-0.035em] mt-4 [text-wrap:balance]" style={{ ...DISPLAY, color: SEA }}>
            Crushed Botanicals Apothecary
          </h1>
          <p className="mt-2 text-[14px] font-semibold uppercase tracking-[0.14em]" style={{ ...READ, color: `${SEA}80` }}>
            crushedbotanicals.com &middot; Prepared for Nicole Bowen-Wiley
          </p>
          <p className="mt-7 text-[22px] sm:text-[28px] font-bold leading-[1.2] tracking-[-0.02em] [text-wrap:balance]" style={{ ...DISPLAY, color: LAGOON }}>
            Your store works. The links that used to bring people to it don&rsquo;t.
          </p>
          <P className="mt-4 max-w-3xl">
            The checkout works, the products are good, and the site looks right. The orders stopped because the store has
            moved platforms twice, the old addresses that Google, Pinterest and your past posts point to now open error
            pages, and Google Shopping still points at a domain that has expired. Most of this you can fix yourself in an afternoon, and the exact steps and the redirect list
            are below.
          </P>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {[
              ['318', 'old addresses that now return an error'],
              ['3', 'stores since 2024: Shopify, GoDaddy, Squarespace'],
              ['0', 'analytics or ad tracking tools'],
              ['Works', 'cart and checkout, tested live'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl p-4" style={{ background: n === 'Works' ? FOAM : SAND }}>
                <span className="block text-[34px] font-bold leading-none tabular-nums tracking-[-0.04em]" style={{ ...DISPLAY, color: n === 'Works' ? LAGOON : SEA }}>
                  {n}
                </span>
                <span className="block mt-2 text-[13px] leading-snug font-semibold" style={{ ...READ, color: `${SEA}b3` }}>{l}</span>
              </div>
            ))}
          </div>
        </header>

        {/* what works */}
        <section className={CARD}>
          <Kicker>What is working</Kicker>
          <H2>The store itself is sound</H2>
          <ul>
            {WORKS.map((w) => (
              <li key={w} className="flex gap-4 py-3 border-t first:border-t-0 first:pt-0" style={{ borderColor: `${SEA}14` }}>
                <span className="shrink-0 mt-0.5 grid place-items-center h-7 w-7 rounded-full text-[13px] font-bold" style={{ ...READ, background: LAGOON, color: '#fff' }} aria-label="Pass">
                  ✓
                </span>
                <span className="text-[15.5px] leading-relaxed" style={{ ...READ, color: `${SEA}cc` }}>{w}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* the history */}
        <section className={CARD}>
          <Kicker>Why the orders stopped</Kicker>
          <H2>Three stores, three sets of addresses</H2>
          <P>One product, the elderberry syrup, has lived at three different addresses. Only the last one works today.</P>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-[14.5px]" style={READ}>
              <thead>
                <tr style={{ color: `${SEA}80` }}>
                  <th className="py-2 pr-4 font-semibold uppercase text-[11.5px] tracking-[0.14em]">When</th>
                  <th className="py-2 pr-4 font-semibold uppercase text-[11.5px] tracking-[0.14em]">Platform</th>
                  <th className="py-2 pr-4 font-semibold uppercase text-[11.5px] tracking-[0.14em]">Elderberry syrup lived at</th>
                  <th className="py-2 font-semibold uppercase text-[11.5px] tracking-[0.14em]">Today</th>
                </tr>
              </thead>
              <tbody>
                {ERAS.map((e, i) => {
                  const live = i === ERAS.length - 1;
                  return (
                    <tr key={e.platform} className="border-t" style={{ borderColor: `${SEA}14`, color: SEA }}>
                      <td className="py-3 pr-4 whitespace-nowrap">{e.years}</td>
                      <td className="py-3 pr-4 font-semibold">{e.platform}</td>
                      <td className="py-3 pr-4"><Code>{e.example}</Code></td>
                      <td className="py-3">
                        <span className="rounded-full px-3 py-0.5 text-[13px] font-bold whitespace-nowrap" style={{ background: live ? LAGOON : CORAL, color: live ? '#fff' : SEA }}>
                          {live ? '200 Works' : '404 Error'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* findings */}
        <section className="space-y-5">
          <div className="px-1">
            <Kicker>Findings</Kicker>
            <H2>What needs fixing, most urgent first</H2>
          </div>
          {FINDINGS.map((f) => {
            const s = SEVERITY[f.sev];
            return (
              <article key={f.title} className={CARD}>
                <span className="inline-block rounded-full px-3 py-0.5 text-[12px] font-bold uppercase tracking-[0.12em]" style={{ ...READ, background: s.bg, color: s.fg }}>
                  {s.label}
                </span>
                <h3 className="text-[20px] sm:text-[24px] font-bold leading-[1.15] tracking-[-0.02em] mt-3 mb-3" style={{ ...DISPLAY, color: SEA }}>
                  {f.title}
                </h3>
                {f.body}
              </article>
            );
          })}
        </section>

        {/* the plan */}
        <section className={CARD}>
          <Kicker>The fix</Kicker>
          <H2>Six steps, in this order</H2>
          <ol className="space-y-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="shrink-0 grid place-items-center h-9 w-9 rounded-full text-[15px] font-bold" style={{ ...DISPLAY, background: MUSTARD, color: SEA }}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[17px] sm:text-[19px] font-bold leading-snug mb-1.5" style={{ ...READ, color: SEA }}>{s.title}</h3>
                  {s.body}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* the redirect block */}
        <section className="rounded-[26px] p-6 sm:p-9" style={{ background: SEA }}>
          <Kicker onSea>Step 1, ready to paste</Kicker>
          <h2 className="text-[26px] sm:text-[34px] font-bold leading-[1.08] tracking-[-0.03em] mt-3 mb-3" style={{ ...DISPLAY, color: '#fff' }}>
            Your redirect list
          </h2>
          <p className="text-[15.5px] leading-relaxed max-w-3xl" style={{ ...READ, color: '#ffffffcc' }}>
            {URL_MAPPINGS.length} lines. Every old address the archive saw, sent to its matching product where one exists
            today and to the closest collection where it does not. Every destination was checked and loads.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <CopyMappings lines={URL_MAPPINGS} />
          </div>
          <pre
            className="mt-5 max-h-[420px] overflow-auto rounded-2xl p-4 sm:p-5 text-[12.5px] leading-[1.6] whitespace-pre print:max-h-none"
            style={{ background: '#072a31', color: FOAM, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
          >
            {URL_MAPPINGS.join('\n')}
          </pre>
        </section>

        {/* questions */}
        <section className={CARD}>
          <Kicker>Four questions for you</Kicker>
          <H2>What we could not see from outside</H2>
          <ol className="space-y-3 list-decimal pl-5">
            {QUESTIONS.map((q) => (
              <li key={q} className="text-[15.5px] leading-relaxed" style={{ ...READ, color: `${SEA}cc` }}>{q}</li>
            ))}
          </ol>
        </section>

        {/* the door */}
        <section className="rounded-[26px] p-6 sm:p-10" style={{ background: FOAM }}>
          <Kicker>If you would rather not do it yourself</Kicker>
          <H2>Or we build the next one, found from day one</H2>
          <P className="max-w-3xl">
            Everything above is yours to do, and it works. If you would rather hand it off, Modern Mustard Seed builds stores
            that are wired for Google before launch: redirects, search titles, product data, tracking and a feed for Google
            Shopping. You own all of it when we are done. We would rather show you than pitch you, mostly because we are
            terrible at pitching and pretty good at building.
          </P>
          <a
            href="https://modernmustardseed.com/contact"
            className="inline-block mt-6 rounded-full px-6 py-3 text-[15px] font-bold"
            style={{ ...READ, background: SEA, color: '#fff' }}
          >
            Talk to Sarah
          </a>
        </section>

        {/* receipts */}
        <footer className="pt-4">
          <Kicker>Where every finding came from</Kicker>
          <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {RECEIPTS.map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[13.5px]" style={{ ...READ, color: `${SEA}a6` }}>
                <dt className="font-semibold whitespace-nowrap" style={{ color: SEA }}>{k}:</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ ...READ, color: `${SEA}80` }}>
            <a href="https://modernmustardseed.com" className="hover:opacity-80" style={{ color: MUSTARD }}>Modern Mustard Seed</a>
            {' '}&middot; Kalispell, Montana
          </p>
        </footer>
      </div>
    </main>
  );
}
