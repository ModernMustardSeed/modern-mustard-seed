/** Skeleton while the calendar reads social_posts. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fcfaf3] text-[#141210]" aria-busy="true" aria-live="polite">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4a4339]">Loading the social calendar</p>
        <div className="h-12 w-2/3 rounded-[3px] bg-[#141210]/[0.07] animate-pulse motion-reduce:animate-none" />
        <div className="grid grid-cols-3 border-t border-l border-[#141210]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 border-r border-b border-[#141210] bg-[#141210]/[0.04]" />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-[3px] border border-[#141210]/20 bg-white animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
