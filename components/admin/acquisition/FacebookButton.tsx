'use client';

import { facebookLinkFor } from '@/lib/acq/facebook';

/**
 * One click to their Facebook page. Solid when the page is on file, outlined
 * when it opens Facebook's page search for the name and town instead. Either
 * way it opens in a new tab so the list stays where it was.
 */
export default function FacebookButton({
  lead,
  size = 'sm',
}: {
  lead: { business_name: string; city?: string | null; state?: string | null; website?: string | null; facebook_url?: string | null };
  size?: 'sm' | 'md';
}) {
  const { href, direct } = facebookLinkFor(lead);
  const pad = size === 'md' ? 'px-3 py-2 text-xs' : 'px-2 py-1 text-[11px]';
  const look = direct
    ? 'bg-[#1877F2] text-white border-[#161616] hover:bg-[#145dbf]'
    : 'bg-white text-[#161616] border-[#161616] hover:bg-[#F5B700]/30';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={direct ? `Open ${href}` : 'The page is not on file yet. Opens Facebook page search for this business and town.'}
      className={`inline-flex items-center gap-1.5 rounded-lg border-2 font-oswald font-semibold uppercase tracking-[0.08em] whitespace-nowrap ${pad} ${look}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06z" />
      </svg>
      {direct ? 'FB page' : 'Find on FB'}
    </a>
  );
}
