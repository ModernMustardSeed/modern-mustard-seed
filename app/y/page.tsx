/**
 * /y with no code.
 *
 * Somebody typed the URL off the card and stopped at the slash, or their thumb
 * covered the last character. Without this they get a 404 and the postage is
 * gone. With it they get a box, and the box forgives the four character
 * confusions the code alphabet was designed around.
 */

import type { Metadata } from 'next';
import CodeEntry from './CodeEntry';

export const metadata: Metadata = {
  title: 'Enter your card code',
  robots: { index: false, follow: false },
};

export default function MailCodeEntryPage() {
  return (
    <main className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-24">
      <div className="max-w-xl mx-auto px-6 md:px-8 pt-20 pb-32">
        <span className="text-[10px] uppercase tracking-[0.45em] text-[#E0301E] font-mono font-bold mb-6 block">
          Your card
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[1.05] mb-5">
          Type the seven characters.
        </h1>
        <p className="font-body text-lg text-[#3a3733] leading-relaxed mb-8">
          They are on the back of the card, under the square. Capitals or lowercase, it does not matter.
        </p>
        <CodeEntry />
        <p className="mt-8 text-[15px] text-[#161616]/60 leading-relaxed">
          Card lost, or it will not go through? Call{' '}
          <a className="underline font-bold text-[#161616]" href="tel:+14063121223">
            (406) 312-1223
          </a>{' '}
          and we will pull it up for you.
        </p>
      </div>
    </main>
  );
}
