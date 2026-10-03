import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import ApplyForm from '@/components/white-label/ApplyForm';

export const metadata = buildMetadata({
  title: 'Apply to the White Label Program',
  description:
    'Agencies apply to resell Modern Mustard Seed AI work under their own name. Your demo arrives the moment you apply; your price sheet and portal within one business day.',
  path: '/white-label/apply',
});

const NEXT = [
  { n: '1', t: 'Now', d: 'Your demo, with your agency’s name on it, arrives by email.' },
  { n: '2', t: 'Within one business day', d: 'Sarah reads your application and sends your portal and signed price sheet.' },
  { n: '3', t: 'Your first client', d: 'Agree the first result and submit the brief. Review the preview or test line, request changes, then approve launch.' },
];

export default function WhiteLabelApplyPage() {
  return (
    <div className="min-h-screen bg-[#fbf5ea] text-[#0b3b44]">
      <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-32 md:grid-cols-[0.9fr_1.1fr] md:pt-40">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-[#0a7c78]">[ White label // Apply ]</p>
          <h1 className="mt-4 font-display text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
            Sell AI under your name. <em className="italic text-[#0a7c78]">Start today.</em>
          </h1>
          <p className="mt-6 font-body text-lg leading-relaxed text-[#0b3b44]/80">
            Two minutes here. Your demo arrives the moment you press apply, already wearing your agency’s name.
          </p>
          <ol className="mt-10 space-y-6">
            {NEXT.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#0b3b44] bg-[#f5b700] font-display text-lg font-black">{s.n}</span>
                <div>
                  <p className="font-display text-lg font-black">{s.t}</p>
                  <p className="font-body text-[15px] text-[#0b3b44]/75">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-10 font-body text-sm text-[#0b3b44]/60">
            Want to see it first? <Link href="/white-label/demo" className="underline">Open the demo</Link> or read <Link href="/white-label" className="underline">how the program works</Link>.
          </p>
        </div>
        <ApplyForm />
      </section>
    </div>
  );
}
