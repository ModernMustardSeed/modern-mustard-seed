/** Details and summary, so every answer is on the page for a reader and a crawler alike. */
export default function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mt-8 divide-y-2 divide-[#0b3b44]/10 border-y-2 border-[#0b3b44]/10">
      {items.map((f) => (
        <details key={f.q} className="py-5 group">
          <summary className="font-display text-lg font-bold cursor-pointer list-none flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <span>{f.q}</span>
            <span aria-hidden="true" className="text-[#0a7c78] group-open:rotate-45 transition-transform text-2xl leading-none shrink-0">+</span>
          </summary>
          <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-3 max-w-2xl">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
