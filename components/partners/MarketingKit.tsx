'use client';

import { useState } from 'react';

/**
 * Done-for-you promo kit: ready-to-post captions (pre-filled with the partner's
 * ref link), one-tap share to X / LinkedIn / email, a QR code, and the share image.
 * The whole point is that the partner never has to write a word.
 */
export default function MarketingKit({
  code,
  firstName,
  siteUrl,
  primaryUrl,
}: {
  code: string;
  firstName: string;
  siteUrl: string;
  primaryUrl: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const captions = [
    {
      key: 'x',
      label: 'For X',
      text: `If you have an idea but no dev team, talk to Modern Mustard Seed. AI-powered audits, custom builds, real software shipped fast. This is who I trust. ${primaryUrl}`,
    },
    {
      key: 'li',
      label: 'For LinkedIn',
      text: `Most founders sit on great ideas because building software feels out of reach. Modern Mustard Seed closes that gap: a free AI website audit, then custom builds and automation that actually ship. I recommend them without hesitation. Start with the free audit: ${primaryUrl}`,
    },
    {
      key: 'email',
      label: 'For email / DM',
      text: `Hey, wanted to point you to Modern Mustard Seed. They build custom software and AI tools for small businesses and they are genuinely excellent. There is a free website audit to start, no strings. Here is my link: ${primaryUrl}`,
    },
  ];

  const blurb = `Modern Mustard Seed builds custom software, AI tools, and automation for small businesses. Founder-led, fast, and honest. Start with a free AI website audit.`;

  const shareX = `https://twitter.com/intent/tweet?text=${encodeURIComponent(captions[0].text)}`;
  const shareLI = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(primaryUrl)}`;
  const shareEmail = `mailto:?subject=${encodeURIComponent('You should see this')}&body=${encodeURIComponent(captions[2].text)}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(primaryUrl)}`;

  return (
    <div className="bg-[#FFFDF6] border-2 border-[#161616] rounded-2xl p-6">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">Marketing kit</span>
      <p className="text-[#161616]/60 font-body text-xs mb-5">Everything pre-filled with your link, {firstName}. Copy, share, done.</p>

      {/* One-tap share */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a href={shareX} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all">Share on X</a>
        <a href={shareLI} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all">Share on LinkedIn</a>
        <a href={shareEmail} className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">Share by email</a>
      </div>

      {/* Captions */}
      <div className="space-y-3 mb-6">
        {captions.map((c) => (
          <div key={c.key} className="rounded-lg bg-white border border-[#161616]/15 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono">{c.label}</span>
              <button
                onClick={() => copy(c.key, c.text)}
                className="px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full hover:bg-[#FFD23F] transition-all"
              >
                {copied === c.key ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[#3A3733] font-body text-[13px] leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>

      {/* Blurb + assets */}
      <div className="grid sm:grid-cols-[1fr_auto] gap-5 items-start">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono">One-line blurb</span>
            <button
              onClick={() => copy('blurb', blurb)}
              className="px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all"
            >
              {copied === 'blurb' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[#3A3733] font-body text-[13px] leading-relaxed mb-4">{blurb}</p>
          <a
            href={`${siteUrl}/opengraph-image`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-semibold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all"
          >
            Download share image
          </a>
        </div>

        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code for your referral link" width={120} height={120} className="rounded-lg bg-white border border-[#161616]/15 p-1.5" />
          <a href={qr} download="modern-mustard-seed-qr.png" target="_blank" rel="noopener noreferrer" className="text-[9px] uppercase tracking-[0.2em] text-[#1E50C8] font-mono hover:text-[#161616]">QR code ↓</a>
        </div>
      </div>
    </div>
  );
}
