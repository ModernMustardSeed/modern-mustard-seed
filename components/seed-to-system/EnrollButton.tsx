import Link from 'next/link';
import { talkFirstHref } from '@/lib/talk-first';

/** Conversation first since 2026-10-10: a founding seat is settled with Sarah
 *  directly, not bought on the page. */
export default function EnrollButton() {
  return (
    <div className="mt-6">
      <Link
        href={talkFirstHref('Seed to System, founding seat')}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-[#0b3b44] bg-[#f5b700] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44] transition-transform hover:-translate-y-0.5"
      >
        Ask Sarah for a founding seat
      </Link>
    </div>
  );
}
