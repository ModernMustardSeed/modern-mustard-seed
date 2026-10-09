import type { Player as PlayerSpec } from '@/lib/bootcamp/sessions';

/**
 * One stream or one replay on screen. YouTube and Vimeo play in the page at
 * 16:9; any other link (a Zoom webinar, a Zoho Meeting) is a door that opens
 * in a new tab, with a line telling people to keep the room open for
 * questions. Server-safe.
 */
export default function Player({ player, title, live = false, dark = false }: { player: PlayerSpec; title: string; live?: boolean; dark?: boolean }) {
  if (player.kind === 'link') {
    return (
      <div className={`rounded-[4px] border-2 border-[#141210] p-6 sm:p-8 text-center ${dark ? 'bg-[#0f4c47] text-[#fcfaf3]' : 'bg-[#fcfaf3] text-[#141210]'}`}>
        <p className={`font-mono text-[10px] uppercase tracking-[0.24em] font-bold ${dark ? 'text-[#e8ecd0]' : 'text-[#0f4c47]'}`}>{live ? 'The live room' : 'The replay'}</p>
        <p className="font-display text-2xl sm:text-3xl font-black mt-2 leading-tight">{title}</p>
        <a
          href={player.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#141210] bg-[#f5b700] px-8 py-4 font-sans text-xs font-extrabold uppercase tracking-[0.18em] text-[#141210] transition-all hover:-translate-y-0.5"
        >
          {live ? 'Join the live session' : 'Watch the replay'} <span aria-hidden="true">↗</span>
        </a>
        <p className={`font-body text-[13px] mt-4 ${dark ? 'text-[#fcfaf3]/70' : 'text-[#141210]/65'}`}>
          Opens in a new tab. {live ? 'Keep this one open: the questions box is right here.' : 'Your place in the room stays here.'}
        </p>
      </div>
    );
  }
  return (
    <div className="relative w-full overflow-hidden rounded-[4px] border-2 border-[#141210] bg-[#06262c] shadow-[6px_6px_0_0_#f5b700]" style={{ aspectRatio: '16 / 9' }}>
      <iframe
        src={player.src}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading={live ? 'eager' : 'lazy'}
      />
    </div>
  );
}
