import Image from 'next/image';
import { headers } from 'next/headers';
import MustardDemo from '@/components/mustard/MustardDemo';
import { getSupabase } from '@/lib/supabase';
import { getSurface, readAttribution, labelSource } from '@/lib/mustard/surface';
import { resolveLink } from '@/lib/mustard/links';
import { consentVersion, CURRENT_CONSENT } from '@/lib/acq/consent';
import { recordEventOnce } from '@/lib/acq/events';
import { classifyHit, verdictDetail } from '@/lib/acq/bots';
import { buildMetadata, SITE } from '@/lib/seo';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';
import { CALL_STATS } from '@/data/proof-stats';
import MissedMoney from '@/components/mustard/MissedMoney';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Meet Mr. Mustard',
  description:
    'Give Mr. Mustard the number you want him to call. He will ring you and show you what an AI receptionist sounds like working for your business. Three minutes, no card.',
  path: '/mustard',
});

/**
 * THE DOORWAY.
 *
 * One page, many entrances. Facebook groups, LinkedIn replies, cold email, QR
 * codes, partner links, Sarah reading the URL down the phone: they all land
 * here with a `?source=` on the end, and the funnel splits itself by channel
 * without a single new page ever being built.
 *
 * The site nav and footer show here so a visitor can poke around the rest of
 * the company. Only the floating chat launcher stays hidden (HideOnAppShell in
 * layout.tsx): it is a second Mr. Mustard that skips the consent flow.
 *
 * House grammar throughout: cream canvas, ink outlines, mustard fills, red mono
 * eyebrow, hard sticker shadows, halftone. Playfair for the display line with a
 * single italic word, DM Sans for body, JetBrains Mono for labels. Oswald is the
 * outbound cockpit's sub-brand and stays out of public pages.
 */
export default async function MustardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (k: string): string => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? '';
  };

  const url = new URL(`${SITE.url}/mustard`);
  for (const [k, v] of Object.entries(params)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) url.searchParams.set(k, val);
  }
  // Real request headers, not an empty bag. The attribution reader wants the
  // referer, and the machine filter below wants the agent.
  const requestHeaders = await headers();
  const attribution = readAttribution(url, requestHeaders as unknown as Headers);

  const surface = await getSurface(one('s') || undefined);
  const version = consentVersion(surface.consent_version) ?? CURRENT_CONSENT;

  /* A magic link fills the form in. It never consents and it never dials. */
  const token = one('t');
  let prefill = { phone: '', businessName: '', contactName: '' };
  let knownAs: string | null = null;
  let source = attribution.source;
  // Who arrived. A resolved token or a bare prospect id names the visitor, and
  // landing on this page is a step in its own right: it is the moment between
  // "clicked" and "gave permission" where most people fall out, and the
  // engagement board needs to show exactly who got this far.
  let visitorLeadId: string | null = null;
  if (token) {
    const link = await resolveLink(getSupabase(), token);
    if (link.ok) {
      prefill = {
        phone: link.prefill.phone ?? '',
        businessName: link.prefill.businessName ?? '',
        contactName: link.prefill.contactName ?? '',
      };
      knownAs = link.prefill.contactName?.split(/\s+/)[0] ?? link.prefill.businessName ?? null;
      source = link.prefill.source || source;
      visitorLeadId = link.prefill.leadId;
    }
    // An expired or unknown token is not an error. They still get their call,
    // they just type their own number. Nothing is said about it.
  } else if (/^[0-9a-f-]{36}$/i.test(one('p'))) {
    // The campaign click route normally mints a token. This is the fallback for
    // when that mint failed, and it only ever prefills the business name: a bare
    // id in a URL should not hand out somebody's phone number.
    const db = getSupabase();
    const { data } = db ? await db.from('outbound_leads').select('id,business_name').eq('id', one('p')).maybeSingle() : { data: null };
    if (data?.business_name) {
      prefill = { ...prefill, businessName: data.business_name as string };
      visitorLeadId = data.id as string;
    }
  }
  if (visitorLeadId) {
    // A security gateway that follows the button lands here too, and renders
    // the whole page doing it. It gets a row that says so rather than a row
    // that says a contractor showed up.
    const hit = await classifyHit(getSupabase(), {
      leadId: visitorLeadId,
      type: 'permission_visited',
      headers: requestHeaders as unknown as Headers,
    });
    // One line per prospect per fifteen minutes: a refresh is not a second visit.
    await recordEventOnce(
      getSupabase(),
      {
        leadId: visitorLeadId,
        type: 'permission_visited',
        label: hit.machine
          ? `Security scanner opened the permission page${source ? ` (${labelSource(source)})` : ''}`
          : `Landed on the permission page${source ? ` (${labelSource(source)})` : ''}`,
        detail: {
          source,
          campaign: one('utm_campaign') || null,
          variant: one('utm_content') || null,
          ...verdictDetail(hit),
        },
      },
      15,
      // A scanner arriving first must not eat the visit from the person it
      // was scanning on behalf of.
      { machine: hit.machine },
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616]">
      {/* ── the poster: words and the ask, together, above the fold ── */}
      <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#F5B700]">
        <div className="absolute inset-0 halftone-ink" aria-hidden="true" />

        {/*
          Reading order differs by device on purpose.

          PHONE: hook, then the ask, then the reassurance. Most people arrive
          here from the Facebook or LinkedIn app on a handset, and three
          paragraphs between the headline and the phone field is three
          paragraphs of scroll before anyone can act.

          DESKTOP: the poster. Words on the left, the ask on the right, both on
          one screen. Explicit grid placement rather than source order, so the
          markup can stay in the order a screen reader should hear it.
        */}
        <div className="relative mx-auto grid max-w-6xl items-start gap-x-14 gap-y-8 px-5 pt-24 pb-12 sm:px-8 sm:pt-28 sm:pb-16 lg:grid-cols-[1.05fr_minmax(0,26rem)]">
          {/* the hook */}
          <div className="order-1 max-w-xl lg:col-start-1 lg:row-start-1">
            <div className="flex items-center gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#161616] bg-[#FBF6EA]">
                <Image src="/brand/mascot.png" alt="" fill sizes="48px" className="object-contain p-0.5" priority />
              </span>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#C4160B]">
                {surface.seller_name}
              </p>
            </div>

            <h1 className="mt-5 font-display text-[2.9rem] leading-[0.92] sm:text-[4.5rem] font-extrabold tracking-tight text-[#161616]">
              Meet{' '}
              <span className="italic sm:inline-block sm:-rotate-1 sm:border-2 sm:border-[#161616] sm:bg-[#FBF6EA] sm:px-4 sm:pb-1 sm:shadow-[6px_6px_0_0_#161616]">
                Mr. Mustard
              </span>
              .
            </h1>

            <p className="mt-4 font-display text-[1.5rem] sm:text-[2.1rem] leading-[1.1] font-bold text-[#161616]">
              Want my AI receptionist to call{' '}
              <span className="italic underline decoration-[#161616] decoration-4 underline-offset-[6px]">you</span>?
            </p>

            {/*
              Sticker chips: the three fears, answered before anybody reads a
              paragraph. Hidden on phones, where the reading order is hook then
              form and every pixel above the phone field is paid for in calls;
              the form card makes the same three promises in its own footer.
            */}
            <div className="mt-6 hidden flex-wrap items-center gap-3 sm:flex">
              {([
                ['Free call', 'bg-[#FBF6EA]', '-rotate-2'],
                ['No card', 'bg-white', 'rotate-1'],
                ['He rings in ten seconds', 'bg-[#FBF6EA]', '-rotate-1'],
              ] as const).map(([label, bg, rot]) => (
                <span
                  key={label}
                  className={`${bg} ${rot} inline-block rounded-full border-2 border-[#161616] px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] shadow-[3px_3px_0_0_#161616]`}
                >
                  {label}
                </span>
              ))}
            </div>

            {/*
              ── THE FIRST LINE, SITTING IN THE HOLE THE GRID LEAVES ──────────

              On desktop the form is taller than the hook, so the left column
              ended and left roughly 170px of empty mustard between the subhead
              and the reassurance. Sarah asked for something pretty in it.

              What went in is the sentence they will actually hear, roughly ten
              seconds after they press the button, in a speech bubble with the
              ring waves already going. It is decoration that does the work of a
              screenshot: it answers "what happens when I do this" before the
              question is asked, in his voice rather than ours.

              ⚠️ DESKTOP ONLY, and that is not laziness. On a phone the reading
              order is hook, form, reassurance, with no gap to fill, so this
              block would insert itself between the headline and the phone field
              and push the one thing that matters below the fold. There is no
              hole on mobile, so there is nothing here.

              The waves reuse .ring-wave from the calling state, which already
              carries its own prefers-reduced-motion stop in globals.css.
            */}
            <div className="mt-9 hidden lg:block" aria-hidden="true">
              <div className="flex items-start gap-4">
                <div className="relative mt-1 h-14 w-14 shrink-0">
                  <span className="ring-wave h-12 w-12 -translate-x-1/2 -translate-y-1/2" style={{ borderColor: 'rgba(22,22,22,.5)' }} />
                  <span className="ring-wave h-12 w-12 -translate-x-1/2 -translate-y-1/2" style={{ borderColor: 'rgba(22,22,22,.3)', animationDelay: '1.4s' }} />
                  <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#161616] bg-[#FBF6EA] text-lg">
                    📞
                  </span>
                </div>

                <div
                  className="relative max-w-md rounded-2xl rounded-bl-none border-2 border-[#161616] bg-[#FBF6EA] px-5 py-4 shadow-[5px_5px_0_0_#161616]"
                  style={{ transform: 'rotate(-0.6deg)' }}
                >
                  <p className="font-display text-[19px] leading-snug font-bold text-[#161616]">
                    &ldquo;Thanks for calling Modern Mustard Seed. This is{' '}
                    <span className="italic">Mr. Mustard</span>, Sarah&apos;s AI assistant. What can I help you with
                    today?&rdquo;
                  </p>
                  <p className="mt-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
                    What you hear in about ten seconds
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* the ask */}
          <div id="ask" className="order-2 scroll-mt-24 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24">
            {/*
              The card gets its two pop-art companions: Mr. Mustard himself
              standing on the top edge of his own form, and a FREE CALL
              starburst stamped over the corner. Both are decoration with a
              job: the mascot says a character answers, the burst kills the
              "what does this cost" hesitation at the exact spot the eye lands.
              pt-14 reserves the headroom so neither one clips or overlaps the
              headline above on mobile.
            */}
            <div className="relative pt-14">
              <Image
                src="/brand/mascot.png"
                alt=""
                width={885}
                height={1180}
                sizes="80px"
                priority
                className="pointer-events-none absolute right-7 top-0 z-10 h-20 w-auto rotate-3 drop-shadow-[3px_3px_0_rgba(22,22,22,0.35)]"
              />
              <div className="absolute -left-2 -top-5 z-10 -rotate-12 sm:-left-10 sm:-top-2" aria-hidden="true">
                <div className="relative flex h-[92px] w-[92px] items-center justify-center">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[3px_3px_0_rgba(22,22,22,0.9)]">
                    <polygon points="50.0,1.0 59.6,14.3 74.5,7.6 76.2,23.8 92.4,25.5 85.7,40.4 99.0,50.0 85.7,59.6 92.4,74.5 76.2,76.2 74.5,92.4 59.6,85.7 50.0,99.0 40.4,85.7 25.5,92.4 23.8,76.2 7.6,74.5 14.3,59.6 1.0,50.0 14.3,40.4 7.6,25.5 23.8,23.8 25.5,7.6 40.4,14.3" fill="#E0301E" stroke="#161616" strokeWidth="2.5" />
                  </svg>
                  <span className="relative text-center font-display text-[15px] font-extrabold uppercase leading-[1.05] text-[#FBF6EA]">
                    Free
                    <br />
                    call
                  </span>
                </div>
              </div>
              <MustardDemo
                surface={surface.slug}
                headline={surface.headline}
                ctaLabel={surface.cta_label}
                sellerName={surface.seller_name}
                consentVersion={version.id}
                consentText={version.text}
                source={source}
                token={token || null}
                landingUrl={url.toString()}
                prefill={prefill}
                knownAs={knownAs}
              />
            </div>
          </div>

          {/* the reassurance */}
          <div className="order-3 max-w-xl lg:col-start-1 lg:row-start-2 lg:-mt-2">
            <div className="space-y-3 text-[16.5px] leading-relaxed text-[#161616]/80">
              <p>Do not take our word for it.</p>
              <p>
                Give him the number you want him to call. He rings you and shows you what an AI receptionist sounds like
                working for your business.
              </p>
              <p className="font-semibold text-[#161616]">
                You can pretend to be your own customer and try to stump him.
              </p>
            </div>

            {/*
              STEP THREE USED TO SAY "Free, and yours to keep poking at."

              Three problems with it. It said free twice on a page that has
              already said no card. It made the thing we sell sound like a
              giveaway, which is what people who want a free toy respond to
              rather than people who want a receptionist. And it ended the
              sequence on a shrug: poke at it, and then what?

              "Buy it only if you love it" is the stronger offer and the more
              confident one. It says we are not worried about you saying no,
              which is only sayable by somebody who has heard their own demo.
            */}
            <ol className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['He calls you', 'Ten seconds from now, from a real number.'],
                ['You try to break him', 'The call your team gets on a bad night.'],
                ['Then you decide', 'Hear him answering as your business. Buy it only if you love it.'],
              ].map(([title, body], i) => (
                <li
                  key={title}
                  className={`rounded-xl border-2 border-[#161616] p-3.5 shadow-[4px_4px_0_0_#161616] ${
                    i === 1 ? 'rotate-[0.7deg] bg-white' : '-rotate-[0.7deg] bg-[#FBF6EA]'
                  }`}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#161616] bg-[#E0301E] font-mono text-[10px] font-bold text-[#FBF6EA]">
                    {i + 1}
                  </span>
                  <p className="mt-2 font-display text-[15px] font-bold leading-tight">{title}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-[#161616]/70">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* screenprint rule between the plates */}
        <div className="stripe-ink h-3 w-full opacity-90" aria-hidden="true" />
      </section>

      {/*
        THE NIGHT SHIFT TICKER.

        House device, already used for the sample-night call log elsewhere, and
        it earns its place here rather than decorating: every line is a call
        that arrives when nobody is at the desk, with the hour attached. That is
        the entire argument for a voice agent, made in the two seconds somebody
        spends scrolling past it, and it is the only thing on this page that
        moves.

        `.marquee-track` carries its own prefers-reduced-motion stop in
        globals.css, and the strip is aria-hidden because a screen reader
        reading a looping list of fake timestamps is noise, not information.
        The same argument is made in words in the section below it.
      */}
      <div className="overflow-hidden border-b-2 border-[#161616] bg-[#080C16] py-3" aria-hidden="true">
        <div className="marquee-track gap-8">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-8 pr-8">
              {[
                ['9:14 pm', 'burst pipe in Bigfork', 'booked for 7am'],
                ['11:48 pm', 'quote on a metal roof', 'name and number taken'],
                ['2:03 am', 'no heat, two kids at home', 'transferred to the on-call'],
                ['5:31 am', 'is this the place that does gutters', 'answered, then booked'],
                ['12:09 pm', 'caller who would not say what was wrong', 'got it out of them'],
                ['7:52 pm', 'price shopper from three towns over', 'quoted and calendared'],
              ].map(([time, what, outcome]) => (
                <span key={`${copy}-${time}`} className="flex shrink-0 items-center gap-2.5 font-mono text-[12px] tracking-wide">
                  <span className="font-bold text-[#F5B700]">{time}</span>
                  <span className="text-[#FBF6EA]/75">{what}</span>
                  <span className="text-[#FBF6EA]/30">&rarr;</span>
                  <span className="font-bold text-[#FBF6EA]">{outcome}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/*
        ── what he is, and what the thing costs ──────────────────────────────

        Added 2026-08-18 (Sarah): "make /mustard a bit more welcoming and
        helpful, intro them to our voice agents and what they do and also
        talking websites, so it completes the knowledge gap in the campaign."

        THE KNOWLEDGE GAP IS REAL AND IT IS SPECIFIC. Somebody arriving from a
        cold email has been told a robot will call them and nothing else. They
        do not know what it does when it answers, they do not know a website is
        part of it, and they do not know what any of it costs. Every one of
        those is a reason to close the tab instead of typing a number.

        IT SITS BELOW THE ASK, NOT ABOVE IT. The form stays the first thing on
        the screen, because the demo IS the pitch and reading about a voice
        agent is a poor substitute for hearing one. This is for the person who
        scrolled instead of typing, which is the person we were losing.

        PRICES ARE DERIVED, NEVER TYPED. Everything below reads from
        lib/demo-order.ts, the same source the checkout and Mr. Mustard's own
        script use, so the page cannot drift from what he says on the phone or
        what Stripe charges.
      */}
      <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#FBF6EA]">
        <div className="relative mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="flex items-center gap-3">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#161616] bg-[#F5B700]">
              <Image src="/brand/mascot.png" alt="" fill sizes="44px" className="object-contain p-0.5" />
            </span>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#C4160B]">
              While you wait for the phone to ring
            </p>
          </div>
          <h2 className="mt-5 max-w-2xl font-display text-[2.1rem] sm:text-[3rem] font-extrabold leading-[0.95] tracking-tight">
            So what <span className="italic">is</span> he?
          </h2>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[#161616]/80">
            He is a voice agent. He answers your phone in your business name, at two in the afternoon and at two in the
            morning, and he never once puts somebody on hold to go find you.
          </p>

          {/*
            THE COMMERCIAL, WHICH ARGUES BETTER THAN THE PARAGRAPH ABOVE IT.

            This is the 16:9 cut of the "Your 24/7 voice agent, hear it live"
            spot, the one the ads playbook already marks for site use. Showing
            it here closes the same gap the cards below close, faster, for the
            people who would rather watch than read.

            `preload="none"` with a poster is deliberate: the file is 18MB and
            most of this traffic is a phone on cell data opening an email. The
            poster is 260KB and paints instantly, and nothing downloads until
            somebody actually presses play. A hero that costs 18MB to scroll
            past would cost more calls than the film wins.
          */}
          <figure className="relative mt-8 max-w-3xl">
            <span
              className="absolute -right-3 -top-3.5 z-10 rotate-6 rounded-lg border-2 border-[#161616] bg-[#E0301E] px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#FBF6EA] shadow-[3px_3px_0_0_#161616]"
              aria-hidden="true"
            >
              Press play &#9654;
            </span>
            <div className="overflow-hidden rounded-2xl border-2 border-[#161616] bg-black shadow-[6px_6px_0_0_#161616]">
              <video
                controls
                preload="none"
                playsInline
                poster="/ads/call-me-poster.png"
                src="/ads/call-me-16x9.mp4"
                className="block w-full"
              />
            </div>
            <figcaption className="mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#161616]/50">
              That is him, working
            </figcaption>
          </figure>

          <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['📞', 'Answers on the first ring', 'Every call, all night, no voicemail. The nine p m caller who would have rung the next name on the list gets a person instead.'],
              ['📅', 'Books the job', 'Straight into your real calendar, with the address and the problem written down the way you would have written it.'],
              ['🧠', 'Knows your business', 'Your services, your hours, your prices, your service area. He answers the question instead of taking a message about it.'],
              ['📲', 'Hands you the ones that matter', 'A big job or an angry customer gets warmed up and transferred to your cell, with a summary before you say hello.'],
              ['✍️', 'Writes everything down', 'Name, number, what they wanted, what you promised. In your inbox before the call ends.'],
              ['👋', 'Remembers repeat callers', 'Somebody who called last month gets greeted like it. That alone sounds more human than most front desks.'],
            ].map(([emoji, title, body], i) => (
              <li
                key={title}
                className={`rounded-xl border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616] transition-transform duration-200 hover:-translate-y-1 ${
                  i % 2 === 0 ? '-rotate-[0.4deg]' : 'rotate-[0.4deg]'
                }`}
              >
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#161616] bg-[#F5B700] text-base shadow-[2px_2px_0_0_#161616]"
                  aria-hidden="true"
                >
                  {emoji}
                </span>
                <p className="mt-3 font-display text-[17px] font-bold leading-tight">{title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#161616]/70">{body}</p>
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-[#161616]/70">
            The one on the phone with you is the same product, running Sarah&apos;s business instead of yours. Nothing on
            this page is a mockup.
          </p>

          {/*
            THE BUNDLE, WHICH IS THE ACTUAL OFFER.

            A voice agent alone is the thing they clicked for. The Talking
            Website is the thing most of them need, and it is genuinely cheaper
            than the two pieces bought separately, so saying it plainly here is
            service rather than upsell. The command center riding free inside it
            is the whole reason the bundle is not a discount trick.
          */}
          <div className="mt-14 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <div className="relative overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-7 shadow-[6px_6px_0_0_#161616] sm:p-9">
              <div className="absolute inset-0 halftone-ink opacity-60" aria-hidden="true" />
              <div className="relative">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#C4160B]">
                  The one most people take
                </p>
                <h3 className="mt-3 font-display text-[2rem] sm:text-[2.6rem] font-extrabold leading-[0.95] tracking-tight">
                  {DEMO_BUNDLE.name}
                </h3>
                <p className="mt-3 text-[16.5px] leading-relaxed text-[#161616]/85">
                  A website that answers its own phone. The site and the voice agent built as one thing, off one brain,
                  so the answer somebody reads at noon is the answer they hear at midnight.
                </p>
                <p className="mt-5 inline-block rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-4 py-2 font-mono text-[15px] font-bold tracking-wide">
                  {formatUsd(DEMO_BUNDLE.setupCents)} to build, then {formatUsd(DEMO_BUNDLE.monthlyCents)} a month
                </p>
                <p className="mt-4 text-[14px] leading-relaxed text-[#161616]/75">
                  The {DEMO_PRODUCTS.os.name} rides along free inside it: every call transcribed, plus your traffic,
                  leads, customers, reviews and money on one board. On its own it is{' '}
                  {formatUsd(DEMO_PRODUCTS.os.setupCents)} and {formatUsd(DEMO_PRODUCTS.os.monthlyCents)} a month.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {[DEMO_PRODUCTS.voice, DEMO_PRODUCTS.site].map((p) => (
                <div key={p.key} className="flex-1 rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616]">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#161616]/45">
                    On its own
                  </p>
                  <h3 className="mt-2 font-display text-[1.5rem] font-extrabold leading-tight tracking-tight">{p.name}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#161616]/70">{p.blurb}</p>
                  <p className="mt-3 font-mono text-[13.5px] font-bold">
                    {formatUsd(p.setupCents)} to build, {formatUsd(p.monthlyCents)} a month
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-7 text-[14px] leading-relaxed text-[#161616]/60">
            Month to month. Cancel any time. Your phone number does not change, it forwards. Nothing is due today and
            the call above costs you nothing either way.
          </p>

          {/*
            ── THE MATH, AND THE FOUR NUMBERS BEHIND IT ────────────────────────

            Sarah, 2026-08-18: "maybe add small calculator on page too so they
            can see the math, and add a few of the stats we have, but in small
            popart bubbles around the page. keep it simple and clear, put those
            towards the bottom."

            Both sit at the very bottom on purpose. Somebody who came to hear
            him does not need convincing with arithmetic first, and a page that
            argues before it demonstrates is a worse page. This is for the
            reader who got all the way down here and is doing sums in their
            head anyway, so we may as well do them accurately and in public.

            ⚠️ THE STATS ARE THE PROOF BANK, NOT WRITING. data/proof-stats.ts
            only admits a figure with a named, dated, published source, and it
            keeps a list of the widely circulated industry numbers it REFUSES
            because nobody can trace them. Quote from there or do not quote.
            Every bubble carries its source under the figure for that reason.
          */}
          <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
            <MissedMoney monthlyPrice={formatUsd(DEMO_BUNDLE.monthlyCents)} />

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4160B]">
                Why the phone is the leak
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {/*
                  An odd count would leave the last bubble orphaned beside a
                  hole, so it spans the row instead and reads as deliberate.
                  This matters because the list is DATA: pulling the 52% figure
                  on 2026-08-18 took the set from four to three, and the next
                  edit to the proof bank should not be able to break the layout
                  either.
                */}
                {CALL_STATS.map((s, i) => (
                  <div
                    key={s.id}
                    className={`rounded-2xl border-2 border-[#161616] p-4 shadow-[4px_4px_0_0_#161616] ${
                      i % 3 === 0 ? 'bg-[#F5B700]' : i % 3 === 1 ? 'bg-white' : 'bg-[#080C16] text-[#FBF6EA]'
                    } ${CALL_STATS.length % 2 === 1 && i === CALL_STATS.length - 1 ? 'col-span-2' : ''}`}
                    style={{ transform: `rotate(${i % 2 === 0 ? '-0.8' : '0.8'}deg)` }}
                  >
                    <p className="font-display text-[2rem] font-extrabold leading-none tracking-tight tabular-nums">
                      {s.figure}
                    </p>
                    <p className="mt-1.5 font-display text-[14px] font-bold leading-tight">{s.label}</p>
                    <p className={`mt-1.5 text-[12.5px] leading-snug ${i % 3 === 2 ? 'text-[#FBF6EA]/70' : 'text-[#161616]/65'}`}>
                      {s.body}
                    </p>
                    <p
                      className={`mt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] ${
                        i % 3 === 2 ? 'text-[#FBF6EA]/40' : 'text-[#161616]/40'
                      }`}
                    >
                      {s.source}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/*
        ── THE SKILL SHEET ─────────────────────────────────────────────────

        Sarah, 2026-08-20: "tell what the agent can do for service
        businesses, and that we can make it multilingual, and other
        features... closer to bottom of page maybe but not all the way at
        bottom."

        So it sits between the math and the ink close: the reader who got
        this far has heard the pitch and done the sums, and this is the
        concrete inventory that converts "impressive demo" into "it could
        run MY desk." The six cards up top are outcomes; these are the
        skills themselves, named the way an owner would name them.

        Two showpieces get real artifacts instead of adjectives: the
        mid-call text card shows the actual SMS bubble, and the language
        card opens in Spanish. The ninth card is dashed on purpose: it is
        the blank line on the sheet, because every agent is custom-built.

        HONESTY LINE: nothing on this sheet is aspirational. Booking,
        orders, mid-call SMS links, price answers, warm transfer, playbook
        rules, and language switching all ship today; "more on request" is
        the only promise, and it is one Sarah keeps by building it.
      */}
      <section className="relative overflow-hidden border-b-2 border-t-2 border-[#161616] bg-[#F5B700]">
        <div className="absolute inset-0 halftone-ink" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#C4160B]">The skill sheet</p>
          <h2 className="mt-4 max-w-2xl font-display text-[2.1rem] sm:text-[3rem] font-extrabold leading-[0.95] tracking-tight">
            Answering is the <span className="italic">easy</span> part.
          </h2>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[#161616]/80">
            Here is the rest of the job, done the way a service business needs it done.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* the everyday skills */}
            {[
              ['📅', 'Books the appointment', 'Finds an open slot, books it, reschedules it, cancels it. Your real calendar, not a copy of it.'],
              ['🧾', 'Takes the order', 'Name, number, the order read back right, and a pickup time that is actually open.'],
              ['💬', 'Answers the everyday twenty', 'Hours, prices, service area, do you do this. Answered on the spot instead of taken as a message.'],
            ].map(([emoji, title, body], i) => (
              <li
                key={title}
                className={`rounded-xl border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616] ${
                  i % 2 === 0 ? '-rotate-[0.5deg]' : 'rotate-[0.5deg]'
                }`}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#161616] bg-[#F5B700] text-base shadow-[2px_2px_0_0_#161616]" aria-hidden="true">
                  {emoji}
                </span>
                <p className="mt-3 font-display text-[17px] font-bold leading-tight">{title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#161616]/70">{body}</p>
              </li>
            ))}

            {/* showpiece: the mid-call text, shown as the text itself */}
            <li className="rounded-xl border-2 border-[#161616] bg-[#FBF6EA] p-5 shadow-[4px_4px_0_0_#161616] rotate-[0.5deg] sm:col-span-2 lg:col-span-1">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#161616] bg-[#F5B700] text-base shadow-[2px_2px_0_0_#161616]" aria-hidden="true">
                {'🔗'}
              </span>
              <p className="mt-3 font-display text-[17px] font-bold leading-tight">Texts links mid-call</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#161616]/70">
                Booking page, menu, estimate form, directions. The caller asks and their phone buzzes before the call ends.
              </p>
              <div className="mt-3 max-w-[240px] rounded-2xl rounded-bl-none border-2 border-[#161616] bg-white px-3.5 py-2.5 shadow-[3px_3px_0_0_#161616]" aria-hidden="true">
                <p className="font-mono text-[12px] leading-snug text-[#161616]">Here is that booking link: your-shop.com/book</p>
              </div>
            </li>

            {/* showpiece: the language switch, opening in Spanish */}
            <li className="relative overflow-hidden rounded-xl border-2 border-[#161616] bg-[#080C16] p-5 text-[#FBF6EA] shadow-[4px_4px_0_0_#161616] -rotate-[0.5deg] sm:col-span-2">
              <div className="absolute inset-0 halftone-ink opacity-40" aria-hidden="true" />
              <div className="relative">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FBF6EA] bg-[#F5B700] text-base shadow-[2px_2px_0_0_#FBF6EA]" aria-hidden="true">
                  {'🌍'}
                </span>
                <p className="mt-3 font-display text-[1.5rem] sm:text-[1.8rem] font-extrabold italic leading-tight">
                  &iquest;C&oacute;mo puedo ayudarle?
                </p>
                <p className="mt-1.5 font-display text-[17px] font-bold leading-tight">Speaks the caller&apos;s language</p>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#FBF6EA]/70">
                  He switches when the caller does, mid-sentence if he has to. Spanish out of the box, more on request, same manners in every one.
                </p>
                <p className="mt-4 font-display text-[15px] italic text-[#FBF6EA]/40">
                  Bonjour. Hallo. Ciao. Tudo bem.
                </p>
              </div>
            </li>

            {[
              ['🚫', 'Hangs up on robocalls', 'Spam and robodialers get two polite seconds. Customers get all night.'],
              ['💵', 'Quotes your prices', 'Your price list, said out loud. Never invented, never rounded up.'],
              ['📖', 'Runs your playbook', 'Who gets transferred, what gets booked, what waits for morning. Your rules, kept at two in the morning.'],
            ].map(([emoji, title, body], i) => (
              <li
                key={title}
                className={`rounded-xl border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616] ${
                  i % 2 === 0 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]'
                }`}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#161616] bg-[#F5B700] text-base shadow-[2px_2px_0_0_#161616]" aria-hidden="true">
                  {emoji}
                </span>
                <p className="mt-3 font-display text-[17px] font-bold leading-tight">{title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#161616]/70">{body}</p>
              </li>
            ))}

            {/* the blank line on the sheet, wide like one */}
            <li className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-[#161616] bg-[#F5B700] p-5 sm:col-span-2 sm:flex-row sm:items-center sm:gap-4 lg:col-span-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#161616] bg-[#FBF6EA] text-base shadow-[2px_2px_0_0_#161616]" aria-hidden="true">
                {'🧰'}
              </span>
              <div>
                <p className="font-display text-[17px] font-bold leading-tight">The one your desk does</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#161616]/75">
                  Every agent is custom-built. If your front desk does it, he learns it. Bring the weird ones.
                </p>
              </div>
            </li>
          </ul>

          {/* who this sheet was written for */}
          <div className="mt-9 flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#161616]/55">
              On the phones for
            </span>
            {['HVAC', 'Plumbing', 'Roofing', 'Landscaping', 'Salons', 'Dental', 'Med spas', 'Restaurants', 'Auto repair', 'Cleaning crews'].map((trade) => (
              <span key={trade} className="rounded-full border-2 border-[#161616] bg-[#FBF6EA] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                {trade}
              </span>
            ))}
          </div>

          {/* the sheet ends where the proof starts */}
          <div className="mt-10">
            <a
              href="#ask"
              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-6 py-3.5 font-display text-lg font-extrabold tracking-tight text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616] active:translate-y-0 active:shadow-[3px_3px_0_0_#161616]"
            >
              Have him prove it {'↑'}
            </a>
            <p className="mt-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#161616]/55">
              Every skill on this sheet, live on the call he makes you
            </p>
          </div>
        </div>
      </section>

      {/* ── the ink close ── */}
      <section className="relative overflow-hidden bg-[#080C16] text-[#FBF6EA]">
        <div className="absolute inset-0 halftone-ink" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#F5B700]">
            Do not let him present
          </p>
          <p className="mt-4 font-display text-2xl sm:text-3xl leading-tight font-bold">
            The demo everybody remembers is the one where they tried to <span className="italic">break him</span>.
          </p>
          <p className="mt-4 text-[16px] leading-relaxed text-[#FBF6EA]/75">
            Give him the eleven o&apos;clock emergency. The caller who will not say what is wrong. The one who wants a
            price over the phone. That is the real test, and it is the same test a front desk fails on a busy Tuesday.
          </p>
          <p className="mt-6 text-sm text-[#FBF6EA]/60">
            He is an AI and he says so in his first breath. Prefer to skip the form? His own line is{' '}
            <a className="font-bold text-[#F5B700] underline underline-offset-4" href="tel:+14063121223">
              (406) 312-1223
            </a>
            , and he answers it himself, day or night.
          </p>

          {/*
            THE ONE WAY OFF THIS PAGE THAT IS NOT A DEAD END.

            The nav and footer are hidden here on purpose: this screen has a
            single objective and fifteen departments in a menu are fifteen ways
            to leave. But a reader who wants to know what the thing costs and
            what it does before handing over their number is not a distraction,
            they are a buyer doing their homework, and sending them away
            empty-handed loses them entirely. So exactly two links, at the
            bottom, after the ask rather than above it.
          */}
          <p className="mt-4 text-sm text-[#FBF6EA]/60">
            Want to read about it first?{' '}
            <a className="font-bold text-[#F5B700] underline underline-offset-4" href="/voice-agents">
              How the voice agent works
            </a>{' '}
            and{' '}
            <a className="font-bold text-[#F5B700] underline underline-offset-4" href="/demos">
              what it costs
            </a>
            .
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#FBF6EA]/15 pt-5 text-[11px] text-[#FBF6EA]/45">
            <a href="/privacy" className="underline underline-offset-4 hover:text-[#FBF6EA]/80">
              Privacy
            </a>
            <a href="/terms" className="underline underline-offset-4 hover:text-[#FBF6EA]/80">
              Terms
            </a>
            <a href={SITE.url} className="underline underline-offset-4 hover:text-[#FBF6EA]/80">
              Modern Mustard Seed
            </a>
            {source !== 'direct' && (
              <span className="ml-auto font-mono uppercase tracking-[0.2em]">{labelSource(source)}</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
