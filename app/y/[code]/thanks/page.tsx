/**
 * Where a mailed order lands after Stripe.
 *
 * The webhook does the work; this page only has to make a person who just paid
 * $994 feel like something happened. It reads the order rather than the Stripe
 * session, so a webhook that has not fired yet shows "we have your payment"
 * instead of a lie in either direction.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { normalizeMailCode } from '@/lib/mailer/code';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'You are in',
  robots: { index: false, follow: false },
};

export default async function MailThanksPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = normalizeMailCode(raw);
  if (!code) notFound();

  const supabase = getSupabase();
  const { data: order } = supabase
    ? await supabase
        .from('demo_orders')
        .select('business_name,status,email')
        .eq('mail_code', code)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const business = order?.business_name || 'your business';
  const settled = order?.status && order.status !== 'pending';

  return (
    <main className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-24">
      <div className="max-w-3xl mx-auto px-6 md:px-8 pt-16 pb-28">
        <span className="text-[10px] uppercase tracking-[0.45em] text-[#E0301E] font-mono font-bold mb-6 block">
          Card {code}
        </span>
        <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.03] mb-6">
          It is{' '}
          <span className="text-[#F5B700] italic" style={{ WebkitTextStroke: '2px #161616' }}>
            yours
          </span>
          , {business}.
        </h1>

        <p className="font-body text-lg text-[#3a3733] leading-relaxed mb-8">
          {settled
            ? 'Your payment went through and the build is on our board.'
            : 'Your payment is going through now. If the receipt has not arrived in a few minutes it is on its way, not lost.'}{' '}
          Here is exactly what happens next, with no chasing required from you.
        </p>

        <ol className="space-y-5 mb-10">
          {[
            ['Today', 'You get a receipt and a short intake: your logo if you have one, your photos, your hours, and the phone number the site should ring.'],
            ['Within 2 days', 'We customize the site you looked at with your real photographs and your real words, and we build your voice agent on the same brain.'],
            ['Within 7 days', 'It goes live on your own domain, and the phone starts getting answered 24 hours a day.'],
            ['After that', 'Changes are unlimited and never billed. Email or call and we just do them.'],
          ].map(([when, what]) => (
            <li key={when} className="flex gap-5">
              <span className="text-[10px] uppercase tracking-[0.24em] font-mono font-bold text-[#161616]/45 w-28 shrink-0 pt-1">
                {when}
              </span>
              <span className="text-[#3a3733] leading-relaxed">{what}</span>
            </li>
          ))}
        </ol>

        <div className="bg-[#080C16] border-2 border-[#161616] p-7 text-white" style={{ boxShadow: '6px 6px 0 0 #F5B700' }}>
          <p className="text-[15px] leading-relaxed text-white/85 mb-4">
            Anything at all, any hour: call the studio line. That is a real number and it is answered.
          </p>
          <a
            href="tel:+14063121223"
            className="inline-flex items-center gap-2 bg-[#F5B700] text-[#161616] border-2 border-[#161616] px-6 py-3.5 font-extrabold text-sm uppercase tracking-[0.14em]"
          >
            (406) 312-1223
          </a>
        </div>
      </div>
    </main>
  );
}
