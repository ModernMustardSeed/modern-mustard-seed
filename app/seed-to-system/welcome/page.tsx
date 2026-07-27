import Link from 'next/link';
import { Check, Mail, Sprout } from 'lucide-react';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Welcome to SEED TO SYSTEM',
  robots: { index: false, follow: false },
};

export default async function SeedToSystemWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const stripe = getStripe();
  let paid = false;
  let email = '';

  if (stripe && sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === 'paid';
      email = session.customer_details?.email || session.customer_email || '';
    } catch {
      paid = false;
    }
  }

  return (
    <main className="min-h-screen bg-[#FBF6EA] px-6 py-28 text-[#161616]">
      <div className="mx-auto max-w-2xl">
        <Sprout className="h-10 w-10 text-[#167D56]" aria-hidden="true" />
        <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#B62618]">
          SEED TO SYSTEM
        </p>
        <h1 className="mt-4 font-display text-5xl font-black leading-tight md:text-7xl">
          {paid ? 'Your seat is planted.' : 'Let’s confirm your seat.'}
        </h1>

        {paid ? (
          <>
            <div className="mt-8 border-y-2 border-[#161616] py-7">
              <div className="flex gap-3">
                <Check className="mt-0.5 h-6 w-6 shrink-0 text-[#167D56]" aria-hidden="true" />
                <p className="font-body text-lg leading-relaxed">
                  Payment is confirmed{email ? ` for ${email}` : ''}. Sarah will send the founding cohort intake,
                  schedule, and first mission within one business day.
                </p>
              </div>
            </div>
            <p className="mt-7 font-display text-2xl font-black">
              For now, write down the one idea you most want to test.
            </p>
          </>
        ) : (
          <div className="mt-8 border-y-2 border-[#161616] py-7">
            <p className="font-body text-lg leading-relaxed">
              This page could not verify a completed Stripe payment. Check your receipt, or email Sarah so she can
              look up the enrollment.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href="mailto:sarah@modernmustardseed.com?subject=SEED%20TO%20SYSTEM%20enrollment"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#161616] bg-[#F5B700] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[4px_4px_0_0_#161616]"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email Sarah
          </a>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#161616] bg-white px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#161616]"
          >
            Back to Modern Mustard Seed
          </Link>
        </div>
      </div>
    </main>
  );
}
