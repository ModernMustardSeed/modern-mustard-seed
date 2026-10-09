import type { BootcampDeliverable, DeliverableFile } from '@/data/bootcamp';
import { btn } from '@/components/bootcamp/ui';

/**
 * The tier deliverables in a person's room. Before Day 3 ends every card
 * shows the date it opens; after, each file is a signed download. Server-safe.
 */

export type DeliverableView = Omit<BootcampDeliverable, 'files'> & {
  files: (DeliverableFile & { href: string; size: string })[];
};

export default function Deliverables({ items, released, opensOn }: { items: DeliverableView[]; released: boolean; opensOn: string }) {
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {items.map((d) => (
        <li key={d.slug} className="flex flex-col rounded-2xl border-2 border-[#0b3b44] bg-white p-6 shadow-[6px_6px_0_0_#0b3b44]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#0a7c78]">{d.minTier === 'vip' ? 'VIP and up' : 'Platinum and cohort'}</p>
          <h3 className="mt-2 font-display text-2xl font-black leading-tight text-[#0b3b44]">{d.name}</h3>
          <p className="mt-3 flex-1 font-body text-[15px] leading-relaxed text-[#0b3b44]/75">{d.blurb}</p>
          {released ? (
            <div className="mt-5 flex flex-col gap-2.5">
              {d.files.map((f, i) => (
                <a key={f.name} href={f.href} className={i === 0 ? btn.gold : btn.white} download={f.name}>
                  {f.label}, {f.kind}
                  {f.size ? <span className="font-mono text-[10px] font-bold normal-case tracking-normal opacity-70">{f.size}</span> : null}
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border-2 border-dashed border-[#0b3b44]/40 bg-[#fbf5ea] px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0b3b44]">
              Opens here {opensOn}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
