import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata } from '@/lib/seo';
import HotOffDownload from '@/components/press/HotOffDownload';

export const metadata = buildMetadata({
  title: 'Hot off the press',
  description: 'Order confirmed. Your print-ready file is ready.',
  path: '/press/hot-off',
  noindex: true,
});

export default async function HotOffPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const sessionId = (session_id || '').trim();

  return (
    <div className="bg-[#FBF6EA] text-[#161616] min-h-screen">
      <section className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-2xl mx-auto px-5 py-16 md:py-24 text-center">
          <Image
            src="/brand/mascot.png"
            alt="Mr. Mustard"
            width={84}
            height={84}
            className="mx-auto rounded-full border-2 border-[#161616] bg-[#F5B700] shadow-[4px_4px_0_0_#161616]"
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mt-6 mb-3">[ HOT OFF THE PRESS ]</p>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[1.02]">
            Paid, pressed, and yours.
          </h1>
          <p className="font-body text-[#161616]/70 mt-4 max-w-md mx-auto leading-relaxed">
            Order confirmed, and your receipt with next steps is on its way to your inbox. Bought THE PIECE? Your clean file is one button away.
          </p>
          {sessionId ? <HotOffDownload sessionId={sessionId} /> : null}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-5 py-14">
        <div className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616]">
          <h2 className="font-display text-lg font-black leading-tight">Printing tips from the shop</h2>
          <ul className="mt-3 space-y-2 font-body text-sm text-[#161616]/75 leading-relaxed list-disc pl-5">
            <li>US Letter, borderless if your printer offers it. Card stock (65-80 lb) makes it feel like money.</li>
            <li>Any local print shop can run it as-is; ask for &ldquo;full color on cover stock.&rdquo;</li>
            <li>Laminate the counter copy. Frame one for the wall. You earned it.</li>
          </ul>
        </div>

        <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-6 mt-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold mb-2">Kit or Hand Press order?</p>
          <p className="font-body text-sm leading-relaxed">
            Sarah is already on it: KIT lands within 2 business days, HAND PRESS starts with her email within one. Reply to your receipt with any must-haves.
          </p>
        </div>

        <p className="text-center mt-10">
          <Link href="/" className="font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#1E50C8] underline underline-offset-4">
            Back to Modern Mustard Seed →
          </Link>
        </p>
      </section>
    </div>
  );
}
