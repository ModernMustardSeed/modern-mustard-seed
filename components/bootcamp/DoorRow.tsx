import Link from 'next/link';
import { bootcampDoors } from '@/data/bootcamp';

/** The three doors out of Day 3, in the order we say them on screen. */
export default function DoorRow() {
  return (
    <div className="grid md:grid-cols-3 gap-5 mt-10">
      {bootcampDoors.map((d, i) => (
        <Link
          key={d.slug}
          href={d.href}
          className="group flex flex-col rounded-[4px] border-2 border-[#141210] bg-white p-6 sm:p-7 transition-transform hover:-translate-y-1"
        >
          <p className="font-display text-4xl font-black text-[#f5b700] leading-none" aria-hidden="true">{i + 1}</p>
          <h3 className="font-display text-xl sm:text-2xl font-black mt-4">{d.title}</h3>
          <p className="font-body text-[15px] text-[#141210]/75 leading-relaxed mt-3 flex-1">{d.body}</p>
          <span className="mt-6 font-sans text-xs font-extrabold uppercase tracking-[0.16em] text-[#0f4c47] group-hover:text-[#141210]">
            {d.cta} <span aria-hidden="true">→</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
