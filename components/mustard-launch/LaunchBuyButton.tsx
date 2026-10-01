import Link from 'next/link';

/** Public launch services start with a scoped quote. */
export default function LaunchBuyButton({ slug, variant = 'primary' }: {
  slug: string;
  label: string;
  variant?: 'primary' | 'ghost';
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#0b3b44] px-6 py-3 font-sans font-bold transition-transform hover:translate-y-[2px]';
  const styles = variant === 'primary'
    ? 'bg-[#f5b700] text-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44]'
    : 'bg-white text-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44]';
  return <Link href={`/inquire?kind=mustard-launch&package=${encodeURIComponent(slug)}`} className={`${base} ${styles}`}>Request a quote</Link>;
}
