import Link from 'next/link';

/** Public Chief offers start with a scoped quote. */
export default function ChiefCheckoutButton({ tier, className }: {
  tier: string;
  className?: string;
  children: React.ReactNode;
}) {
  return <Link href={`/inquire?kind=chief&package=${encodeURIComponent(tier)}`} className={className}>Request a quote</Link>;
}
