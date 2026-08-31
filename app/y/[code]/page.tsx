/**
 * /y/<code> — where the postcard lands.
 *
 * Everything above the fold has to answer one question in under two seconds:
 * "is this actually about MY business?" So the business name is the headline,
 * their real site is on the screen, and the offer sits beside it rather than
 * after a scroll.
 *
 * noindex, always. These are private pages about named businesses that never
 * asked to be on the internet, and a Google-indexed directory of "sites we
 * built for people who did not hire us" would be a genuine harm.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { lookupMailCode, touchMailView } from '@/lib/mailer/lookup';
import { prettyPhone } from '@/lib/mailer/preview';
import { DEMO_BUNDLE, DEMO_PRODUCTS } from '@/lib/demo-order';
import ClaimClient from './ClaimClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your new website',
  robots: { index: false, follow: false, nocache: true },
};

const STUDIO_PHONE = '(406) 312-1223';

export default async function MailLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const found = await lookupMailCode(code);
  if (!found) notFound();

  const { lead, spec } = found;
  // Awaited on purpose. This write is the hand raise the whole channel exists
  // to produce, and a fire-and-forget promise in a serverless function is not
  // guaranteed to survive the response.
  await touchMailView(lead.id, found.code);

  const phone = prettyPhone(lead.phone);
  const alreadyOrdered = Boolean(found.existingOrder);

  return (
    <main className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-24">
      <div className="max-w-6xl mx-auto px-6 md:px-8 pt-10 md:pt-16 pb-8">
        <span className="text-[10px] uppercase tracking-[0.45em] text-[#E0301E] font-mono font-bold mb-6 block">
          Built for you · Card {found.code}
        </span>
        <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.03] mb-5">
          {lead.business_name},{' '}
          <span className="text-[#F5B700] italic" style={{ WebkitTextStroke: '2px #161616' }}>
            this is yours.
          </span>
        </h1>
        <p className="font-body text-lg md:text-xl text-[#3a3733] leading-relaxed max-w-2xl">
          We built it before we asked. Scroll it, click it, show it to whoever you show things to. Nothing
          here is a mockup: it is a working site, and the version we put on your domain is this one with
          your photographs and your words in it.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-8 pb-24 grid lg:grid-cols-[1fr_384px] gap-8 items-start">
        {/* Their site, live, in a frame that reads as a browser. */}
        <div
          className="bg-white border-2 border-[#161616] overflow-hidden"
          style={{ boxShadow: '8px 8px 0 0 #161616' }}
        >
          <div className="flex items-center gap-2 h-11 px-4 bg-[#E9EAEC] border-b-2 border-[#161616]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C7C9CE]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#C7C9CE]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#C7C9CE]" />
            <span className="ml-3 flex-1 h-6 bg-white rounded-full text-[11px] text-[#6B7076] flex items-center px-3 font-mono truncate">
              {spec.business.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24)}.com
            </span>
          </div>
          <iframe
            src={`/api/mailer/site/${found.code}`}
            title={`Website preview for ${lead.business_name}`}
            className="block w-full h-[560px] md:h-[720px] bg-white"
            loading="eager"
          />
        </div>

        {/* The offer. */}
        <aside className="lg:sticky lg:top-28">
          <div
            className="bg-white border-2 border-[#161616] p-7"
            style={{ boxShadow: '6px 6px 0 0 #F5B700' }}
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-3">
              {DEMO_BUNDLE.name}
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-display text-4xl font-black">$497</span>
              <span className="text-sm text-[#161616]/60 font-semibold">today</span>
            </div>
            <div className="flex items-baseline gap-2 mb-5">
              <span className="font-display text-4xl font-black">$497</span>
              <span className="text-sm text-[#161616]/60 font-semibold">a month, cancel anytime</span>
            </div>

            <ul className="space-y-2.5 mb-6 text-[15px] leading-snug">
              {[
                'This site, customized with your photos and your words',
                'Your own domain, hosting and care included',
                DEMO_PRODUCTS.voice.blurb.replace('your demo', 'this site'),
                'Unlimited changes, before it goes live and forever after',
                'Live within 7 days',
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span aria-hidden className="text-[#F5B700] font-black leading-5">
                    ✦
                  </span>
                  <span className="text-[#3a3733]">{line}</span>
                </li>
              ))}
            </ul>

            {alreadyOrdered ? (
              <div className="border-2 border-[#161616] bg-[#FBF6EA] p-4 text-[15px] leading-snug">
                <b>You already claimed this one.</b> Check your email for the confirmation, or call{' '}
                <a className="underline font-bold" href={`tel:+14063121223`}>
                  {STUDIO_PHONE}
                </a>{' '}
                and we will pick up where you left off.
              </div>
            ) : (
              <ClaimClient code={found.code} knownEmail={lead.email} studioPhone={STUDIO_PHONE} />
            )}
          </div>

          <div className="mt-5 bg-[#080C16] border-2 border-[#161616] p-6 text-white" style={{ boxShadow: '6px 6px 0 0 #161616' }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold mb-2">
              Rather just talk
            </div>
            <p className="text-[15px] leading-snug text-white/85 mb-4">
              Call and ask anything. A real person, or the same voice agent that would answer{' '}
              {phone ? `${phone} for you` : 'your phone for you'}.
            </p>
            <a
              href="tel:+14063121223"
              className="inline-flex items-center gap-2 bg-[#F5B700] text-[#161616] border-2 border-[#161616] px-5 py-3 font-extrabold text-sm uppercase tracking-[0.14em]"
            >
              {STUDIO_PHONE}
            </a>
          </div>

          <p className="mt-5 text-[13px] text-[#161616]/55 leading-relaxed">
            Not interested? Nothing happens. This page expires on its own and we do not put your business
            on the internet without you. Call {STUDIO_PHONE} and we will delete it while you wait.
          </p>
        </aside>
      </div>
    </main>
  );
}
