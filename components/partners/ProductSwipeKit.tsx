'use client';

import { useState } from 'react';
import { SWIPE_OFFERS, type SwipeOffer } from '@/data/partner-swipe';

/**
 * The promo kit: every headline offer with ready-to-post copy in three formats,
 * each pre-filled with the partner's own tracked link. Copy, reword, post. The
 * partner never has to write a word or remember to add their ref.
 */

const FORMATS: { key: keyof SwipeOffer['swipes']; label: string }[] = [
  { key: 'x', label: 'X / Threads' },
  { key: 'social', label: 'Instagram / FB / LinkedIn' },
  { key: 'email', label: 'Newsletter / Email' },
];

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked; the text is selectable in the box regardless */
        }
      }}
      className={`shrink-0 px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold rounded-full border-2 border-[#14110c] transition-all ${
        copied
          ? 'bg-[#14110c] text-[#f6efe0]'
          : 'bg-[#f5b700] text-[#14110c] shadow-[2px_2px_0_0_#14110c] hover:shadow-[3px_3px_0_0_#14110c] hover:-translate-y-0.5'
      }`}
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

function OfferCard({ offer, link }: { offer: SwipeOffer; link: string }) {
  const [format, setFormat] = useState<keyof SwipeOffer['swipes']>('x');
  const body = offer.swipes[format].replace(/\{\{LINK\}\}/g, link);

  return (
    <div className="bg-white border-2 border-[#14110c] rounded-2xl shadow-[5px_5px_0_0_#14110c] overflow-hidden">
      <div className="p-5 sm:p-6 border-b-2 border-[#14110c] bg-[#f6efe0]">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className="font-display text-2xl font-semibold text-[#14110c]">{offer.name}</h3>
          <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#14110c] bg-[#f5b700] border-2 border-[#14110c] rounded-full px-2.5 py-1">{offer.earn}</span>
        </div>
        <p className="text-[#14110c]/60 font-body text-sm">{offer.bestFor}</p>
      </div>

      <div className="p-5 sm:p-6">
        {/* Their tracked link for this offer */}
        <div className="flex items-center gap-2 mb-5">
          <code className="flex-1 min-w-0 truncate font-mono text-xs text-[#8f1d22] bg-[#14110c]/[0.04] border border-[#14110c]/15 rounded-lg px-3 py-2.5">{link}</code>
          <CopyButton text={link} label="Copy link" />
        </div>

        {/* Format switch */}
        <div className="flex flex-wrap gap-2 mb-3">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFormat(f.key)}
              className={`px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-mono font-bold rounded-full border-2 transition-colors ${
                format === f.key ? 'bg-[#14110c] text-[#f6efe0] border-[#14110c]' : 'bg-white text-[#14110c]/70 border-[#14110c]/25 hover:border-[#14110c]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* The swipe */}
        <div className="relative">
          <textarea
            readOnly
            value={body}
            rows={format === 'x' ? 4 : format === 'social' ? 8 : 5}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none font-body text-sm text-[#14110c] bg-[#f6efe0] border-2 border-[#14110c] rounded-xl p-4 pr-4 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#f5b700]"
          />
          <div className="mt-3 flex justify-end">
            <CopyButton text={body} label="Copy this post" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductSwipeKit({ code, siteUrl }: { code: string; siteUrl: string }) {
  const base = siteUrl.replace(/\/$/, '');
  return (
    <div className="space-y-5">
      {SWIPE_OFFERS.map((offer) => (
        <OfferCard key={offer.key} offer={offer} link={`${base}${offer.linkPath}?ref=${code}`} />
      ))}
    </div>
  );
}
