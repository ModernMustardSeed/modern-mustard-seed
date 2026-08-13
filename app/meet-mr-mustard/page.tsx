import Link from 'next/link';
import MeetMrMustardForm from '@/components/acq/MeetMrMustardForm';
import { getSupabase } from '@/lib/supabase';
import { CURRENT_CONSENT } from '@/lib/acq/consent';
import { recordEvent } from '@/lib/acq/events';
import { buildMetadata } from '@/lib/seo';
import { OFFER } from '@/lib/acq/types';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Mr. Mustard Wants Your Job',
  description:
    'Mr. Mustard is the Modern Mustard Seed AI receptionist. Give him three minutes on the phone, then try to stump him. He will even pretend he works for your company.',
  path: '/meet-mr-mustard',
});

/**
 * THE PERMISSION PAGE.
 *
 * The one screen between "I got a strange email" and "my phone is ringing and
 * that is an AI". Everything on it serves one action, and the copy is written
 * to be read by a contractor standing in a truck bay, not by a SaaS buyer.
 *
 * Arriving with ?p=<prospect id> prefills the form from what we already know,
 * which is the difference between a form and a courtesy.
 */
export default async function MeetMrMustardPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; v?: string; s?: string }>;
}) {
  const params = await searchParams;
  const leadId = params.p && /^[0-9a-f-]{36}$/i.test(params.p) ? params.p : null;
  const variant = params.v ?? null;

  let prefill = { firstName: '', businessName: '', website: '', phone: '' };
  let trade: string | null = null;

  if (leadId) {
    const db = getSupabase();
    if (db) {
      const { data } = await db
        .from('outbound_leads')
        .select('contact_name,business_name,website,phone,trade')
        .eq('id', leadId)
        .maybeSingle();
      if (data) {
        prefill = {
          firstName: String(data.contact_name ?? '').trim().split(/\s+/)[0] ?? '',
          businessName: String(data.business_name ?? ''),
          website: String(data.website ?? ''),
          phone: '',
        };
        trade = (data.trade as string) ?? null;
      }
      await recordEvent(db, {
        leadId,
        type: 'permission_visited',
        label: 'Opened the Mr. Mustard permission page',
        detail: { variant, step: params.s ?? null },
      });
    }
  }

  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <section className="relative overflow-hidden border-b-[3px] border-[#161616]">
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden="true" style={halftone} />
        <div className="relative max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20 grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-start">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-[#E0301E]">
              Modern Mustard Seed
            </p>
            <h1 className="mt-4 font-oswald text-[2.6rem] leading-[0.95] sm:text-6xl md:text-7xl font-bold uppercase tracking-tight">
              Mr. Mustard
              <br />
              wants your job.
            </h1>
            <p className="mt-6 text-xl md:text-2xl font-semibold leading-snug">
              Not your whole job.
              <br />
              <span className="text-[#161616]/70">
                Just the part where somebody calls at 10:47 PM and nobody answers.
              </span>
            </p>

            <div className="mt-8 space-y-4 text-[17px] leading-relaxed text-[#161616]/80 max-w-xl">
              <p>Mr. Mustard is Modern Mustard Seed&apos;s AI receptionist.</p>
              <p>Give him about three minutes.</p>
              <p>
                Then <strong className="text-[#161616]">try to stump him</strong>. He can even pretend he works for your
                company{trade && trade !== 'other' ? `, and he already speaks ${tradeWord(trade)}` : ''}.
              </p>
            </div>

            <ul className="mt-8 grid sm:grid-cols-3 gap-3">
              {[
                ['He calls you', 'In about ten seconds, from (406) 312-1223.'],
                ['You test him', 'Give him the call your team actually gets.'],
                ['He builds yours', 'Free, if you want to keep poking at it later.'],
              ].map(([title, body]) => (
                <li
                  key={title}
                  className="rounded-xl border-2 border-[#161616] bg-white/70 p-4 shadow-[3px_3px_0_0_#161616]"
                >
                  <p className="font-oswald text-sm font-bold uppercase tracking-wide">{title}</p>
                  <p className="mt-1 text-[13px] leading-snug text-[#161616]/70">{body}</p>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm text-[#161616]/60 max-w-xl">
              He is an AI and he says so in his first breath. If you would rather skip the form, his line is{' '}
              <a className="font-semibold underline" href="tel:+14063121223">
                (406) 312-1223
              </a>
              . He answers it himself, day or night.
            </p>
          </div>

          <div className="lg:sticky lg:top-8">
            <MeetMrMustardForm
              leadId={leadId}
              variant={variant}
              consentVersion={CURRENT_CONSENT.id}
              consentText={CURRENT_CONSENT.text}
              prefill={prefill}
            />
          </div>
        </div>
      </section>

      <section className="border-b-[3px] border-[#161616] bg-[#161616] text-[#FBF6EA]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-16">
          <h2 className="font-oswald text-3xl md:text-4xl font-bold uppercase tracking-tight">
            What he does on the call
          </h2>
          <div className="mt-8 grid md:grid-cols-4 gap-5">
            {[
              ['01', 'Tells you what he is', 'An AI, in the first sentence. No gimmick, no reveal.'],
              ['02', 'Asks one question', 'What customer call would you most hate to miss?'],
              ['03', 'Becomes your front desk', 'He answers as your company and takes the call you just described.'],
              ['04', 'Offers to build yours', 'Free, no card. You keep poking at it whenever you want.'],
            ].map(([n, title, body]) => (
              <div key={n} className="border-2 border-[#F5B700]/40 rounded-xl p-5">
                <p className="font-mono text-xs font-bold text-[#F5B700]">{n}</p>
                <p className="mt-2 font-oswald text-lg font-bold uppercase tracking-wide">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#FBF6EA]/70">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-9 text-sm text-[#FBF6EA]/60 max-w-3xl">
            If you decide you want him on your real phone, a Voice Agent is {OFFER.line}, month to month, cancel any
            time. Your number does not change. Nothing on this page obligates you to any of that.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="font-oswald text-2xl font-bold uppercase tracking-tight">Fair questions</h2>
            <dl className="mt-5 space-y-5">
              {[
                ['Is this a robocall?', 'No. Nothing dials you unless you check the box and press the button on this page, and you can tell him to stop at any point and he will.'],
                ['Will he try to sell me?', 'He will show you what he does and offer to build you one. If you say no he says thank you and hangs up.'],
                ['Do I have to change my phone number?', 'No. If you ever go live, your existing number forwards. Your phones stay exactly as they are.'],
                ['What happens to my number?', 'It is used to place this call and to reach you about it. We do not sell it, and you can tell him to remove you on the call.'],
              ].map(([q, a]) => (
                <div key={q}>
                  <dt className="font-semibold">{q}</dt>
                  <dd className="mt-1 text-[15px] leading-relaxed text-[#161616]/70">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl border-[3px] border-[#161616] bg-[#F5B700]/30 p-6 shadow-[6px_6px_0_0_#161616]">
            <p className="font-oswald text-xl font-bold uppercase tracking-tight">Do not let him present</p>
            <p className="mt-3 text-[15px] leading-relaxed text-[#161616]/80">
              The demo everybody remembers is the one where they tried to break him. Give him the 11pm emergency, the
              caller who will not say what is wrong, the one who wants a price over the phone. That is the real test,
              and it is the same test your front desk fails on a busy Tuesday.
            </p>
            <p className="mt-4 text-sm text-[#161616]/60">
              Curious what we build?{' '}
              <Link href="/voice-agents" className="font-semibold underline">
                Voice agents
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function tradeWord(trade: string): string {
  if (trade === 'hvac') return 'no-cool calls';
  if (trade === 'plumbing') return 'burst pipes';
  if (trade === 'roofing') return 'storm damage';
  return 'your trade';
}

const halftone: React.CSSProperties = {
  backgroundImage: 'radial-gradient(#161616 1.4px, transparent 1.4px)',
  backgroundSize: '11px 11px',
};
