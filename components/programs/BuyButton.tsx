import Link from 'next/link';
import { talkFirstHref } from '@/lib/talk-first';

/** Conversation first since 2026-10-10: a program is no longer bought on the
 *  page. The button opens a note to Sarah with the program named. A partner's
 *  ?ref still rides the mms_ref cookie set elsewhere, so attribution holds when
 *  the sale closes privately. */
export default function BuyButton({
  slug,
  label = 'Talk to Sarah about it',
  className,
  tone = 'cream',
  name,
}: {
  slug: string;
  label?: string;
  className?: string;
  /** Default button skin: the mustard pop pill. `cream` sits on a cream ground,
   *  `ink` on an ink band (cream border and shadow), `onMustard` on a mustard
   *  band (ink pill so it does not vanish into the ground). */
  tone?: 'cream' | 'ink' | 'onMustard';
  /** The program's display name for the note; falls back to the slug. */
  name?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Link
        href={talkFirstHref(name ?? slug)}
        className={
          className ||
          `inline-flex items-center justify-center px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold rounded-full border-2 hover:-translate-y-0.5 transition-all ${
            tone === 'ink'
              ? 'text-[#0b3b44] bg-[#f5b700] border-[#fbf5ea] shadow-[4px_4px_0_0_#fbf5ea]'
              : tone === 'onMustard'
                ? 'text-[#fbf5ea] bg-[#0b3b44] border-[#0b3b44] shadow-[4px_4px_0_0_#fbf5ea]'
                : 'text-[#0b3b44] bg-[#f5b700] border-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44]'
          }`
        }
      >
        {label}
      </Link>
    </div>
  );
}
