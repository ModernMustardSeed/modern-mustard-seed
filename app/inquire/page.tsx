import InquiryForm from '@/components/InquiryForm';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Inquire',
  description:
    'Modern Mustard Seed takes a small number of engagements at a time. Tell us what you are building and Sarah Scarano answers personally inside one business day.',
  path: '/inquire',
});

/**
 * THE FRONT DOOR. Every call to action on the public site lands here.
 *
 * Replaced the free demo build, the free audit funnel, and the public booking
 * calendar as the primary ask (Sarah, 2026-09-11). The calendar still exists at
 * /book and is offered by reply, after an inquiry, never as a public button.
 */

const DISCIPLINES = [
  {
    name: 'Websites and brand',
    line: 'Design-led sites for businesses that are judged on how they look before they are judged on anything else. Identity, art direction, and the build, from one hand.',
  },
  {
    name: 'Custom software',
    line: 'Applications, stores, internal tools, and agentic systems built to your operation rather than configured around somebody else’s. You own the repository outright.',
  },
  {
    name: 'Voice agents',
    line: 'A trained voice that answers every call, knows the business, books the work, and hands you the transcript. Built on the same brain as the site it belongs to.',
  },
  {
    name: 'Advisory',
    line: 'Retained counsel for operators putting AI into a business that already works. What to build, what to refuse, what to automate, and in what order.',
  },
];

const PROCESS = [
  {
    step: 'One',
    name: 'The inquiry',
    line: 'You write. Sarah reads it herself and replies inside one business day, whether or not it is a fit.',
  },
  {
    step: 'Two',
    name: 'The conversation',
    line: 'One working session, not a sales call. We map the outcome, the constraints, and what is genuinely worth building first.',
  },
  {
    step: 'Three',
    name: 'The proposal',
    line: 'A written scope with a fixed price, a fixed timeline, and an explicit list of what is out. You see the number once and it does not move.',
  },
  {
    step: 'Four',
    name: 'The build',
    line: 'You watch it happen. Changes to what we built are included, always, with no change order and no second invoice.',
  },
];

export default function InquirePage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Inquire', url: '/inquire' },
          ]),
          {
            ...webPageJsonLd({
              path: '/inquire',
              name: 'Inquire · Modern Mustard Seed',
              description:
                'Begin an engagement with Modern Mustard Seed. A small number of design and AI engagements are taken at a time.',
              type: 'ContactPage',
            }),
            mainEntity: { '@id': `${SITE.url}/#organization` },
          },
        ]}
      />

      {/* ─────────────── The invitation ─────────────── */}
      <section className="relative overflow-hidden border-b-2 border-[#161616]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(#161616 1px, transparent 1px), linear-gradient(90deg, #161616 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-32 pb-16 md:pt-44 md:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-white px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#E0301E] shadow-[3px_3px_0_0_#161616]">
              By inquiry
            </span>
            <h1 className="mt-7 font-display text-5xl font-extrabold leading-[0.98] tracking-tight text-[#161616] md:text-6xl lg:text-[4.5rem]">
              Tell us what you are{' '}
              <em className="italic text-[#B48600]">building</em>.
            </h1>
            <p className="mt-7 max-w-2xl font-body text-lg leading-relaxed text-[#3d382e] md:text-xl">
              Modern Mustard Seed is a design and AI studio in Northwest Montana. We take a small
              number of engagements at a time, which is the only way the work stays this
              considered. There is no catalog to browse and no price list, because the right
              answer depends entirely on what you are trying to make happen.
            </p>
            <p className="mt-5 max-w-2xl font-body text-lg leading-relaxed text-[#3d382e]">
              Write us a real note. You will hear back from Sarah, not a sequence.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────── The form, with the disciplines beside it ─────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <InquiryForm />

          <div className="lg:pt-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">
              What we are engaged for
            </p>
            <div className="mt-6 space-y-6">
              {DISCIPLINES.map((d) => (
                <div key={d.name} className="border-l-2 border-[#F5B700] pl-5">
                  <h2 className="font-display text-xl font-extrabold leading-snug text-[#161616]">
                    {d.name}
                  </h2>
                  <p className="mt-1.5 font-body text-[15px] leading-relaxed text-[#5c554a]">
                    {d.line}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border-2 border-[#161616] bg-[#161616] p-6 md:p-7">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#F5B700]">
                Two things we hold to
              </p>
              <p className="mt-4 font-body text-[15px] leading-relaxed text-[#FBF6EA]/85">
                Scope is fixed before work starts, so the number you agree to is the number you
                pay. And changes to what we built are included, permanently, with no change order
                and no second invoice.
              </p>
              <p className="mt-4 font-body text-[15px] leading-relaxed text-[#FBF6EA]/85">
                You own everything at the end: the repository, the deployment, the accounts, and
                the documentation to run it without us.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── How an engagement runs ─────────────── */}
      <section className="border-y-2 border-[#161616] bg-[#F5F0E8] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">
              How it runs
            </p>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-[#161616] md:text-5xl">
              Four steps, and you meet the same person at every one.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((p) => (
              <div
                key={p.step}
                className="flex flex-col rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616]"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
                  {p.step}
                </span>
                <h3 className="mt-2 font-display text-xl font-extrabold leading-tight text-[#161616]">
                  {p.name}
                </h3>
                <p className="mt-2.5 flex-1 font-body text-[14px] leading-relaxed text-[#5c554a]">
                  {p.line}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── The quiet close ─────────────── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="font-display text-2xl font-bold italic leading-snug text-[#161616] md:text-3xl">
            &ldquo;Every build here starts seed sized. Then it gets tended every day until the
            branches can hold weight.&rdquo;
          </p>
          <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#8f6600]">
            Sarah Scarano · Founder
          </p>
          <p className="mt-9 font-body text-[15px] leading-relaxed text-[#5c554a]">
            Based in {SITE.city}, {SITE.regionName}. Working with clients nationwide.
            <br className="hidden sm:block" />{' '}
            <a
              href={`mailto:${SITE.email}`}
              className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#E0301E]"
            >
              {SITE.email}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
