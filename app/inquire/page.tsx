import Link from '@/components/AttributionLink';
import InquiryForm from '@/components/InquiryForm';
import PopPageHero from '@/components/pop/PopPageHero';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Inquire',
  description:
    'Modern Mustard Seed is a boutique design and agentic systems studio. Tell us what you are building and you will hear back personally inside one business day.',
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
    line: 'Design-led sites for businesses that are judged on how they look before they are judged on anything else. Identity, art direction, and the build, held together as one piece of work.',
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
    line: 'Retained counsel for operators putting agentic systems into a business that already works. What to build, what to refuse, what to automate, and in what order.',
    href: '/advisory',
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
    <div data-studio-page="inquire" className="min-h-screen bg-[#f1ede4] text-[#0d0d0d]">
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
                'Begin an engagement with Modern Mustard Seed. A small number of design and agentic systems engagements are taken at a time.',
              type: 'ContactPage',
            }),
            mainEntity: { '@id': `${SITE.url}/#organization` },
          },
        ]}
      />

      {/* ─────────────── The invitation: the comic cover ─────────────── */}
      <PopPageHero
        eyebrow={<span>By inquiry</span>}
        title={<>Tell us what you are{' '}<em>building</em>.</>}
        issue={{ no: 'No.1', lines: ['Private inquiry', 'Kalispell, Montana'] }}
        art={{
          src: '/art/pages/inquire',
          alt: 'Graffiti couture painting: Mr. Mustard leans out of a cherry-red classic convertible to post a wax-sealed letter into a graffiti-painted mailbox, a painted railroad bridge behind him',
          caption: 'Write us a real note',
        }}
        sticker="Dear Sarah!"
        mascot={{ bubble: 'She reads every one!' }}
        marquee={['By inquiry', 'Answered inside one business day', 'Fixed scope', 'Fixed price', 'Changes included', 'You own all of it']}
      >
        <p>
          Modern Mustard Seed is a boutique design and agentic systems studio in Northwest Montana.
          There is no catalog to browse and no price list, because the right answer depends
          entirely on what you are trying to make happen.
        </p>
        <p>
          Write us a real note. You will hear back from Sarah, not a sequence.
        </p>
      </PopPageHero>

      {/* ─────────────── The form, with the disciplines beside it ─────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <InquiryForm />

          <div className="lg:pt-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8201a]">
              What we are engaged for
            </p>
            <div className="mt-6 space-y-6">
              {DISCIPLINES.map((d) => (
                <div key={d.name} className="min-w-0 border-l-2 border-[#ffd400] pl-5">
                  <h2 className="font-display text-xl font-extrabold leading-snug text-[#0d0d0d]">
                    {d.name}
                  </h2>
                  <p className="mt-1.5 font-body text-[15px] leading-relaxed text-[#5c554a]">
                    {d.line}
                  </p>
                  {d.href && (
                    <Link
                      href={d.href}
                      className="mt-2 inline-block font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#C4160B] transition-colors hover:text-[#0d0d0d]"
                    >
                      Read the argument →
                    </Link>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border-2 border-[#0d0d0d] bg-[#0d0d0d] p-6 md:p-7">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#ffd400]">
                Two things we hold to
              </p>
              <p className="mt-4 font-body text-[15px] leading-relaxed text-[#f1ede4]/85">
                Scope is fixed before work starts, so the number you agree to is the number you
                pay. And changes to what we built are included, permanently, with no change order
                and no second invoice.
              </p>
              <p className="mt-4 font-body text-[15px] leading-relaxed text-[#f1ede4]/85">
                You own everything at the end: the repository, the deployment, the accounts, and
                the documentation to run it without us.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── How an engagement runs ─────────────── */}
      <section className="border-y-2 border-[#0d0d0d] bg-[#F5F0E8] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8201a]">
              How it runs
            </p>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-[#0d0d0d] md:text-5xl">
              Four steps, and you meet the same person at every one.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((p) => (
              <div
                key={p.step}
                className="flex flex-col rounded-2xl border-2 border-[#0d0d0d] bg-white p-6 shadow-[5px_5px_0_0_#0d0d0d]"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
                  {p.step}
                </span>
                <h3 className="mt-2 font-display text-xl font-extrabold leading-tight text-[#0d0d0d]">
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
          <p className="font-display text-2xl font-bold italic leading-snug text-[#0d0d0d] md:text-3xl">
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
              className="font-bold text-[#c8201a] underline decoration-2 underline-offset-2 hover:text-[#c8201a]"
            >
              {SITE.email}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
