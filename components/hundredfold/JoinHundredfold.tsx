import Link from 'next/link';

/** Custom coaching and implementation are scoped before payment. */
export default function JoinHundredfold({ interviewId }: { interviewId?: string }) {
  const query = new URLSearchParams({ kind: 'hundredfold' });
  if (interviewId) query.set('interview', interviewId);
  return (
    <div>
      <Link href={'/inquire?' + query.toString()} className="inline-flex rounded-xl border-2 border-[#0b3b44] bg-[#0b3b44] px-6 py-4 font-sans text-sm font-extrabold text-white">
        Request a Hundredfold quote
      </Link>
      <p className="mt-3 text-sm text-[#0b3b44]/75">We discuss your goals and quote the coaching and build work before you commit.</p>
    </div>
  );
}
