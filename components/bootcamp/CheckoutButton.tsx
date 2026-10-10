import Link from 'next/link';
import type { BootcampPaidSlug } from '@/data/bootcamp';
import { talkFirstHref } from '@/lib/talk-first';

const TIER_NAME: Record<BootcampPaidSlug, string> = {
  ga: 'Bootcamp, General Admission',
  vip: 'Bootcamp, VIP',
  platinum: 'Bootcamp, Platinum',
  operator: 'Operator Program',
};

/**
 * One button, one tier. Conversation first since 2026-10-10: the seat is no
 * longer bought on the page. The button opens a note to Sarah with the tier
 * already named, and the seat and its price are settled with her directly.
 * When enrollment is closed the button says so and does nothing.
 * `email` and `host` are kept for the room, which still passes them.
 */
export default function CheckoutButton({
  tier,
  label,
  open,
  className,
  closedLabel = 'Enrollment closed',
}: {
  tier: BootcampPaidSlug;
  label: string;
  open: boolean;
  className: string;
  closedLabel?: string;
  email?: string;
  host?: string | null;
}) {
  if (!open) {
    return (
      <div className="mt-7">
        <button type="button" disabled aria-disabled className={`${className} w-full`}>
          {closedLabel}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-7">
      <Link href={talkFirstHref(TIER_NAME[tier])} className={`${className} w-full inline-flex items-center justify-center`}>
        {label}
      </Link>
    </div>
  );
}
