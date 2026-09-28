import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { HUNDREDFOLD } from '@/lib/hundredfold';

export const metadata: Metadata = buildMetadata({
  title: 'You are in Hundredfold',
  path: '/hundredfold/welcome',
  noindex: true,
});

/**
 * Post-checkout. Deliberately not a receipt: Stripe already sent one. This page
 * has one job, which is to send them straight into the interview, because
 * everything the program produces is built from that transcript and a member who
 * never does it has bought an empty Command Center.
 */
export default function HundredfoldWelcomePage() {
  return (
    <main className="relative min-h-screen bg-[#fbf5ea] text-[#0b3b44] pt-36 md:pt-44 pb-24">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-6 md:px-8 text-center">
        <span className="block text-[10px] uppercase tracking-[0.45em] font-mono font-bold text-[#C4160B] mb-7">
          Welcome to {HUNDREDFOLD.spoken}
        </span>
        <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.0]">
          You are in. Now the{' '}
          <span className="text-[#f5b700]" style={{ WebkitTextStroke: '2px #0b3b44' }}>
            twenty minutes
          </span>{' '}
          that matter
        </h1>
        <p className="mt-6 text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto">
          Everything this program builds comes out of your interview. Your roadmap, your offer, your
          gates, and the list of machines we wire into your business are all written from your answers,
          so this is genuinely the highest-leverage twenty minutes of the whole year.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/hundredfold#interview"
            className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#0b3b44] rounded-xl border-2 border-[#0b3b44] hover:-translate-y-0.5 transition-all"
          >
            Do the interview now
          </Link>
          <Link
            href="/portal/hundredfold"
            className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#0b3b44] bg-white rounded-xl border-2 border-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44] hover:-translate-y-0.5 transition-all"
          >
            Open my Command Center
          </Link>
        </div>
        <p className="mt-8 text-[#0b3b44]/60 text-sm font-body max-w-xl mx-auto leading-relaxed">
          Check your email for the sign-in link to your Command Center. Sarah reads every interview
          herself and will be in touch this week.
        </p>
      </div>
    </main>
  );
}
