'use client';

/**
 * WHAT IT WILL LOOK LIKE. One post rendered the way each feed shows it, so a
 * client sees the Facebook card, the Instagram square, the tweet, the
 * LinkedIn update, the Google post and the Houzz note before any of them
 * exist. Shapes are faithful, brand colors are hinted, nothing is a logo.
 */
import type { Platform } from '@/lib/posting/types';

type Props = { platform: Platform; business: string; handle?: string | null; text: string; imageUrl: string | null; link?: string | null };

function Avatar({ initials, bg }: { initials: string; bg: string }) {
  return <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-[12px] font-bold text-white" style={{ background: bg }}>{initials}</span>;
}
function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'B';
}
function Img({ src, square }: { src: string | null; square?: boolean }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={`w-full object-cover ${square ? 'aspect-square' : 'max-h-64'}`} />;
}
function Body({ text, clamp }: { text: string; clamp?: number }) {
  return <p className={`whitespace-pre-line font-body text-[13.5px] leading-snug text-[#1a1a1a] ${clamp ? `line-clamp-${clamp}` : ''}`}>{text}</p>;
}

export default function PlatformPreview({ platform, business, handle, text, imageUrl, link }: Props) {
  const ini = initialsOf(business);
  const h = (handle ?? `@${business.replace(/[^a-z0-9]+/gi, '').toLowerCase()}`).replace(/^@?/, '@');
  const frame = 'overflow-hidden rounded-xl border border-[#161616]/15 bg-white text-left shadow-sm';

  switch (platform) {
    case 'facebook':
      return (
        <div className={frame}>
          <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
            <Avatar initials={ini} bg="#1877F2" />
            <div className="leading-tight">
              <p className="font-sans text-[13px] font-bold text-[#050505]">{business}</p>
              <p className="font-sans text-[11px] text-[#65676B]">Just now · Public</p>
            </div>
          </div>
          <div className="px-3 pb-3"><Body text={text} /></div>
          <Img src={imageUrl} />
          {link && !imageUrl && <div className="border-t border-[#161616]/10 bg-[#F0F2F5] px-3 py-2 font-sans text-[11px] uppercase tracking-wide text-[#65676B]">{link.replace(/^https?:\/\//, '').split('/')[0]}</div>}
          <div className="flex justify-around border-t border-[#161616]/10 px-3 py-2 font-sans text-[12px] font-semibold text-[#65676B]"><span>Like</span><span>Comment</span><span>Share</span></div>
        </div>
      );
    case 'instagram':
      return (
        <div className={`${frame} max-w-[360px]`}>
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="rounded-full p-[2px]" style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}><Avatar initials={ini} bg="#262626" /></span>
            <p className="font-sans text-[13px] font-semibold text-[#262626]">{h.slice(1)}</p>
          </div>
          {imageUrl ? <Img src={imageUrl} square /> : <div className="flex aspect-square items-center justify-center bg-[#FAFAFA] font-sans text-[12px] text-[#8e8e8e]">Instagram needs a photo</div>}
          <div className="px-3 py-2 font-sans text-[18px] text-[#262626]">♡ &nbsp; ○ &nbsp; ▷</div>
          <div className="px-3 pb-3 font-body text-[13px] leading-snug text-[#262626]"><span className="font-semibold">{h.slice(1)}</span> <span className="whitespace-pre-line">{text}</span></div>
        </div>
      );
    case 'linkedin':
      return (
        <div className={frame}>
          <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded font-sans text-[12px] font-bold text-white" style={{ background: '#0A66C2' }}>{ini}</span>
            <div className="leading-tight">
              <p className="font-sans text-[13px] font-semibold text-[#000000E6]">{business}</p>
              <p className="font-sans text-[11px] text-[#00000099]">Now · 🌐</p>
            </div>
          </div>
          <div className="px-3 pb-3"><Body text={text} /></div>
          <Img src={imageUrl} />
          <div className="flex gap-5 border-t border-[#161616]/10 px-3 py-2 font-sans text-[12px] font-semibold text-[#00000099]"><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></div>
        </div>
      );
    case 'x':
      return (
        <div className={`${frame} px-3 py-3`}>
          <div className="flex gap-2.5">
            <Avatar initials={ini} bg="#0f1419" />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[13px] leading-tight"><span className="font-bold text-[#0f1419]">{business}</span> <span className="text-[#536471]">{h} · now</span></p>
              <p className="mt-1 whitespace-pre-line font-body text-[14px] leading-snug text-[#0f1419]">{text}</p>
              {imageUrl && <div className="mt-2 overflow-hidden rounded-2xl border border-[#161616]/10"><Img src={imageUrl} /></div>}
              <p className="mt-2 font-sans text-[11px] text-[#536471]">{text.length} / 280</p>
            </div>
          </div>
        </div>
      );
    case 'gbp':
      return (
        <div className={`${frame} max-w-[360px]`}>
          <Img src={imageUrl} />
          <div className="px-3 py-3">
            <p className="font-sans text-[11px] text-[#5f6368]">{business} · Update</p>
            <Body text={text} />
            <p className="mt-2 font-sans text-[13px] font-semibold text-[#1a73e8]">{link ? 'Learn more' : 'Call now'}</p>
          </div>
        </div>
      );
    case 'houzz':
      return (
        <div className={frame}>
          <Img src={imageUrl} />
          <div className="px-3 py-3">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#4DBC15' }}>Project update</p>
            <p className="font-sans text-[13px] font-semibold text-[#222]">{business}</p>
            <div className="mt-1"><Body text={text} /></div>
          </div>
        </div>
      );
  }
}
