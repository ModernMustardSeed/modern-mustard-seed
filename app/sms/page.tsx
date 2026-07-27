import Link from 'next/link';
import Image from 'next/image';
import SmsOptIn from '@/components/SmsOptIn';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'The Text Line',
  description:
    'Give Modern Mustard Seed your mobile number and we text you first, so the thread is already open. See the exact message before you agree to it. Reply STOP any time.',
  path: '/sms',
});

/**
 * /sms — THE TEXT LINE.
 *
 * This page is two things at once, on purpose:
 *  1. A real conversion surface: the fastest way for a visitor to start a
 *     conversation with Sarah.
 *  2. The canonical opt-in disclosure for our A2P 10DLC campaign. Carriers and
 *     TCR reviewers open this URL directly and must find the opt-in mechanism,
 *     the consent language, the message samples, and the policy links, all
 *     without JavaScript-gated surprises or env-dependent modes.
 *
 * Everything below the fold is written for a human first and satisfies the
 * carrier checklist as a side effect. Do not gate any of it behind
 * smsConfigured/smsSendable: an opt-in page that disappears when Twilio is
 * unarmed is exactly what failed the campaign on 2026-07-20.
 */

const SAMPLES = [
  {
    tag: 'The opener',
    body:
      'Hey Jordan! Sarah’s team at Modern Mustard Seed here. You asked for a text from our site about: "missed calls are costing us jobs". What are you working on? Reply here and a human answers. Reply STOP to opt out.',
  },
  {
    tag: 'A follow-up',
    body:
      'Thanks Jordan, here is the demo we built you: https://modernmustardseed.com/demos. Reply with questions, a human answers. Msg and data rates may apply. Reply STOP to opt out, HELP for help.',
  },
];

const FACTS = [
  { k: 'Who texts you', v: 'Modern Mustard Seed, from (406) 407-9405. A real person is on the other end.' },
  { k: 'What we send', v: 'A reply to what you asked about, the demo or link you requested, and the occasional check-in on a project. No blasts, no drip campaigns you did not ask for.' },
  { k: 'How often', v: 'Message frequency varies. It is a conversation, so it moves at your pace.' },
  { k: 'What it costs', v: 'Nothing from us. Message and data rates may apply from your carrier.' },
  { k: 'How to stop', v: 'Reply STOP to any message and we stop immediately. Reply HELP for help, or email sarah@modernmustardseed.com.' },
  { k: 'Is it required', v: 'No. Consent to receive texts is never a condition of any purchase.' },
];

export default function SmsPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'The Text Line', url: '/sms' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'The Text Line',
            url: `${SITE.url}/sms`,
            description:
              'Opt in to text messages from Modern Mustard Seed. Consent terms, message samples, frequency, rates, and how to opt out.',
            publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
          },
        ]}
      />

      {/* ───────────────  HERO + OPT-IN  ─────────────── */}
      <section className="relative overflow-hidden border-b-2 border-[#161616] halftone-bg">
        <div className="relative z-[2] max-w-6xl mx-auto px-6 pt-28 md:pt-36 pb-16 md:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] font-bold bg-white text-[#C4160B] border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">
              📱 The Text Line
            </span>
            <h1 className="mt-6 font-display font-extrabold leading-[0.98] tracking-tight text-5xl md:text-6xl lg:text-[4.4rem] text-[#161616]">
              Text me <em className="italic text-[#8f6600]">back</em>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg md:text-xl text-[#3d382e] font-body leading-relaxed">
              Forms go into a void. A text thread goes to a person. Drop your number and we send the first message, so
              you never have to wonder whether it landed.
            </p>
          </div>

          <div className="mt-12">
            <SmsOptIn />
          </div>
        </div>
      </section>

      {/* ───────────────  WHAT YOU ARE AGREEING TO  ─────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-[#C4160B]">The fine print, unhidden</p>
            <h2 className="mt-3 font-display font-extrabold text-4xl md:text-5xl leading-[1.02]">
              Exactly what you are <em className="italic text-[#8f6600]">agreeing to</em>.
            </h2>
            <p className="mt-4 font-body text-[16px] text-[#3d382e] leading-relaxed">
              Most companies bury this in a policy nobody opens. Here it is on the same page as the button.
            </p>
          </div>

          <dl className="mt-10 grid md:grid-cols-2 gap-5">
            {FACTS.map((f) => (
              <div
                key={f.k}
                className="bg-white border-2 border-[#161616] rounded-2xl p-5 shadow-[5px_5px_0_0_#161616]"
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#8f6600]">{f.k}</dt>
                <dd className="mt-2 font-body text-[14.5px] text-[#161616]/80 leading-relaxed">{f.v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 font-body text-[14.5px] text-[#161616]/75 leading-relaxed max-w-3xl">
            Full details live in our{' '}
            <Link href="/privacy" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#C4160B]">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#C4160B]">
              Terms of Service
            </Link>
            . We never buy, rent, or sell phone numbers, and no mobile information is shared with third parties or
            affiliates for marketing or promotional purposes.
          </p>
        </div>
      </section>

      {/* ───────────────  MESSAGE SAMPLES  ─────────────── */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-[#161616] border-[3px] border-[#161616] rounded-3xl p-8 md:p-12 shadow-[10px_10px_0_0_#F5B700]">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-[#F5B700]">Real message samples</p>
            <h2 className="mt-3 font-display font-extrabold text-3xl md:text-4xl text-[#FBF6EA] leading-[1.05]">
              This is the whole program.
            </h2>
            <p className="mt-3 font-body text-[15px] text-[#FBF6EA]/70 max-w-2xl leading-relaxed">
              Two messages, both triggered by something you did. Nothing else goes out on this line.
            </p>

            <div className="mt-8 grid md:grid-cols-2 gap-5">
              {SAMPLES.map((s) => (
                <div key={s.tag} className="rounded-2xl border-2 border-[#FBF6EA]/25 bg-[#FBF6EA]/5 p-5">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] font-bold text-[#F5B700]">{s.tag}</p>
                  <p className="mt-3 font-body text-[14px] text-[#FBF6EA]/90 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────  OTHER WAYS  ─────────────── */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white border-[3px] border-[#161616] rounded-3xl p-8 md:p-10 shadow-[8px_8px_0_0_#1E50C8] flex flex-col md:flex-row items-center gap-8">
            <Image
              src="/mascot.png"
              alt="The Modern Mustard Seed mascot"
              width={120}
              height={120}
              className="w-24 h-24 md:w-28 md:h-28 object-contain shrink-0"
            />
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-display font-extrabold text-2xl md:text-3xl leading-tight">Not a texter? That is fine.</h2>
              <p className="mt-2.5 font-body text-[15px] text-[#3d382e] leading-relaxed">
                Send a note from the{' '}
                <Link href="/contact" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#C4160B]">
                  contact page
                </Link>
                , grab{' '}
                <Link href="/book" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#C4160B]">
                  a free 30 minutes
                </Link>
                , or email{' '}
                <a href="mailto:sarah@modernmustardseed.com" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#C4160B]">
                  sarah@modernmustardseed.com
                </a>
                . A human answers inside a day either way.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
