import Link from 'next/link';
import { talkFirstHref } from '@/lib/talk-first';

/**
 * Conversation first since 2026-10-10: playbooks and courses are no longer
 * bought on the page. The button opens a note to Sarah with the title named.
 * `configured` is kept for callers; a title that is not released yet still
 * says so.
 */
export default function StoreBuyButton({
  slug,
  configured,
  label = 'Ask Sarah about this playbook →',
  title,
}: {
  slug: string;
  configured: boolean;
  label?: string;
  title?: string;
}) {
  if (!configured) {
    return (
      <div className="md:text-right">
        <span className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-[12px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#0b3b44] border-2 border-[#0b3b44] bg-white">
          Launching shortly
        </span>
        <p className="text-[#0b3b44]/55 text-[10px] font-mono uppercase tracking-[0.22em] mt-3 md:text-right">
          Notify list opens at launch
        </p>
      </div>
    );
  }

  return (
    <div className="md:text-right">
      <Link
        href={talkFirstHref(title ?? slug)}
        className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-[12px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#0b3b44] border-2 border-[#0b3b44] shadow-[4px_4px_0_0_rgba(11,59,68,0.3)] hover:-translate-y-0.5 transition-all"
      >
        {label}
      </Link>
    </div>
  );
}
