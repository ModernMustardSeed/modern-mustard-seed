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
      className={`shrink-0 px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold rounded-full border-2 border-[#161616] transition-all ${
        copied
          ? 'bg-emerald-500 text-white'
          : 'bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5'
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
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] overflow-hidden">
      <div className="p-5 sm:p-6 border-b-2 border-[#161616] bg-[#FBF6EA]">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className="font-display text-2xl font-semibold text-[#161616]">{offer.name}</h3>
          <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-1">{offer.earn}</span>
        </div>
        <p className="text-[#161616]/60 font-body text-sm">{offer.bestFor}</p>
      </div>

      <div className="p-5 sm:p-6">
        {/* Their tracked link for this offer */}
        <div className="flex items-center gap-2 mb-5">
          <code className="flex-1 min-w-0 truncate font-mono text-xs text-[#1E50C8] bg-[#161616]/[0.04] border border-[#161616]/15 rounded-lg px-3 py-2.5">{link}</code>
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
                format === f.key ? 'bg-[#161616] text-[#FBF6EA] border-[#161616]' : 'bg-white text-[#161616]/70 border-[#161616]/25 hover:border-[#161616]'
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
            className="w-full resize-none font-body text-sm text-[#161616] bg-[#FBF6EA] border-2 border-[#161616] rounded-xl p-4 pr-4 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
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
