import { treeStaff } from '@/data/mustard-tree';

/**
 * The portrait wall: the six-agent office, framed like founding staff
 * portraits (grafted from the approved Founding direction). Pure SVG busts,
 * pop-card frames, no image assets.
 */

function Bust({ color, title }: { color: string; title: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`Portrait mark for ${title}`} className="w-full h-auto block bg-[#FBF6EA] border-2 border-[#161616]">
      <rect x="0" y="0" width="100" height="100" fill={color} opacity="0.13" />
      <circle cx="50" cy="36" r="17.5" fill="none" stroke={color} strokeWidth="3.5" opacity="0.85" />
      <circle cx="50" cy="36" r="13" fill="#161616" />
      <path d="M19,92 Q50,56 81,92 L81,100 L19,100 Z" fill="#161616" />
    </svg>
  );
}

export default function StaffWall() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
      {treeStaff.map((s, i) => (
        <div
          key={s.role}
          className={`relative bg-white border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] p-3.5 pb-4 ${i % 2 === 0 ? 'rotate-[-0.6deg]' : 'rotate-[0.6deg]'}`}
        >
          {i === 0 && (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute -top-3.5 -right-3 w-9 h-9 z-10">
              <polygon
                points="12,1 15,8.5 23,9 17,14 19,22 12,17.5 5,22 7,14 1,9 9,8.5"
                fill="#F5B700"
                stroke="#161616"
                strokeWidth="1.6"
              />
            </svg>
          )}
          <Bust color={s.color} title={s.role} />
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-center mt-3">{s.role}</p>
          <p className="font-body text-[13px] leading-snug text-[#161616]/70 text-center mt-1.5">{s.job}</p>
        </div>
      ))}
    </div>
  );
}
