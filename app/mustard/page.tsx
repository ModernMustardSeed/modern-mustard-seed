import Image from 'next/image';
import MustardDemo from '@/components/mustard/MustardDemo';
import { getSupabase } from '@/lib/supabase';
import { getSurface, readAttribution, labelSource } from '@/lib/mustard/surface';
import { resolveLink } from '@/lib/mustard/links';
import { consentVersion, CURRENT_CONSENT } from '@/lib/acq/consent';
import { recordEventOnce } from '@/lib/acq/events';
import { buildMetadata, SITE } from '@/lib/seo';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';

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
 * Deliberately not a landing page. The navbar hides itself here (isAppShell in
 * Navbar.tsx) and the footer is suppressed below, because this screen has one
 * job and a nav offering fifteen other departments is fifteen ways to leave
 * before the phone rings.
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
  const attribution = readAttribution(url, new Headers());

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
    // One line per prospect per fifteen minutes: a refresh is not a second visit.
    await recordEventOnce(
      getSupabase(),
      {
        leadId: visitorLeadId,
        type: 'permission_visited',
        label: `Landed on the permission page${source ? ` (${labelSource(source)})` : ''}`,
        detail: { source, campaign: one('utm_campaign') || null, variant: one('utm_content') || null },
      },
      15,
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
        <div className="relative mx-auto grid max-w-6xl items-start gap-x-14 gap-y-8 px-5 pt-8 pb-12 sm:px-8 sm:pt-12 sm:pb-16 lg:grid-cols-[1.05fr_minmax(0,26rem)]">
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
              Meet <span className="italic">Mr. Mustard</span>.
            </h1>

            <p className="mt-3 font-display text-[1.5rem] sm:text-[2.1rem] leading-[1.1] font-bold text-[#161616]">
              Want my AI receptionist to call <span className="italic">you</span>?
            </p>
          </div>

          {/* the ask */}
          <div className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-8">
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
                <li key={title} className="rounded-xl border-2 border-[#161616] bg-[#FBF6EA]/80 p-3.5">
                  <p className="font-mono text-[10px] font-bold text-[#C4160B]">0{i + 1}</p>
                  <p className="mt-1 font-display text-[15px] font-bold leading-tight">{title}</p>
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
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#C4160B]">
            While you wait for the phone to ring
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-[2.1rem] sm:text-[3rem] font-extrabold leading-[0.95] tracking-tight">
            So what <span className="italic">is</span> he?
          </h2>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[#161616]/80">
            He is a voice agent. He answers your phone in your business name, at two in the afternoon and at two in the
            morning, and he never once puts somebody on hold to go find you.
          </p>

          <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Answers on the first ring', 'Every call, all night, no voicemail. The nine p m caller who would have rung the next name on the list gets a person instead.'],
              ['Books the job', 'Straight into your real calendar, with the address and the problem written down the way you would have written it.'],
              ['Knows your business', 'Your services, your hours, your prices, your service area. He answers the question instead of taking a message about it.'],
              ['Hands you the ones that matter', 'A big job or an angry customer gets warmed up and transferred to your cell, with a summary before you say hello.'],
              ['Writes everything down', 'Name, number, what they wanted, what you promised. In your inbox before the call ends.'],
              ['Remembers repeat callers', 'Somebody who called last month gets greeted like it. That alone sounds more human than most front desks.'],
            ].map(([title, body]) => (
              <li key={title} className="rounded-xl border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616]">
                <p className="font-display text-[17px] font-bold leading-tight">{title}</p>
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
