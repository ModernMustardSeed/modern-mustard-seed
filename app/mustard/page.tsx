import MustardDemo from '@/components/mustard/MustardDemo';
import { getSupabase } from '@/lib/supabase';
import { getSurface, readAttribution, labelSource } from '@/lib/mustard/surface';
import { resolveLink } from '@/lib/mustard/links';
import { consentVersion, CURRENT_CONSENT } from '@/lib/acq/consent';
import { buildMetadata } from '@/lib/seo';
import { SITE } from '@/lib/seo';

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
 * Deliberately not a landing page. No navbar, no footer columns, no product
 * tour, no second CTA. Everything on this screen exists to get one person to
 * hear Mr. Mustard.
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

  // Rebuild the landing URL so attribution reads exactly as it arrived.
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
    }
    // An expired or unknown token is not an error. They still get their call,
    // they just type their own number. Nothing is said about it.
  } else if (/^[0-9a-f-]{36}$/i.test(one('p'))) {
    // The campaign click route normally mints a token. This is the fallback for
    // when that mint failed, and it only ever prefills the business name: a bare
    // id in a URL should not hand out somebody's phone number.
    const db = getSupabase();
    const { data } = db ? await db.from('outbound_leads').select('business_name').eq('id', one('p')).maybeSingle() : { data: null };
    if (data?.business_name) prefill = { ...prefill, businessName: data.business_name as string };
  }

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]" data-mustard-door>
      {/*
        The site chrome is hidden HERE rather than by restructuring the root
        layout, because the root layout wraps every route in the app and moving
        it into route groups to bare one page is a large change to somebody
        else's application for a small gain. This page has one objective and a
        navbar offering eleven other products actively works against it.
      */}
      <style>{`
        body:has([data-mustard-door]) > nav,
        body:has([data-mustard-door]) footer { display: none; }
      `}</style>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true" style={halftone} />
        <div className="relative mx-auto max-w-2xl px-5 py-10 sm:py-16">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-[#E0301E]">
            {surface.seller_name}
          </p>
          <h1 className="mt-3 font-oswald text-[2.5rem] leading-[0.95] sm:text-6xl font-bold uppercase tracking-tight">
            Meet
            <br />
            Mr. Mustard
          </h1>
          <p className="mt-5 font-oswald text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[#161616]/85">
            {surface.headline}
          </p>

          <div className="mt-5 space-y-3 text-[17px] leading-relaxed text-[#161616]/75">
            <p>Do not take our word for it.</p>
            <p>
              Give him the number you want him to call. He will ring you and show you what an AI receptionist could
              sound like working for your business.
            </p>
            <p>
              You can even pretend you are one of your own customers and{' '}
              <strong className="text-[#161616]">try to stump him</strong>.
            </p>
          </div>

          <div className="mt-7">
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

          <ol className="mt-9 grid gap-3 sm:grid-cols-3">
            {[
              ['He calls you', 'In about ten seconds, from a real number.'],
              ['You test him', 'Give him the call your team actually gets.'],
              ['He builds yours', 'Free, if you want to keep poking at it later.'],
            ].map(([title, body], i) => (
              <li key={title} className="rounded-xl border-2 border-[#161616] bg-white/70 p-4 shadow-[3px_3px_0_0_#161616]">
                <p className="font-mono text-[11px] font-bold text-[#E0301E]">0{i + 1}</p>
                <p className="mt-1 font-oswald text-sm font-bold uppercase tracking-wide">{title}</p>
                <p className="mt-1 text-[13px] leading-snug text-[#161616]/70">{body}</p>
              </li>
            ))}
          </ol>

          <p className="mt-8 text-sm text-[#161616]/55">
            He is an AI and he says so in his first breath. Prefer to skip the form? His line is{' '}
            <a className="font-semibold underline" href="tel:+14063121223">
              (406) 312-1223
            </a>
            , and he answers it himself, day or night.
          </p>

          {source !== 'direct' && (
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/25">
              {labelSource(source)}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

const halftone: React.CSSProperties = {
  backgroundImage: 'radial-gradient(#161616 1.4px, transparent 1.4px)',
  backgroundSize: '11px 11px',
};
