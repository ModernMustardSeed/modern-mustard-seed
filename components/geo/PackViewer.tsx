'use client';

/**
 * The delivered GEO Fix Pack: every artifact with a copy button, the
 * platform-matched install guide, and the metered re-scan (regenerates the
 * pack from the live site and re-grades, GEO.freeRerunsPerPack included).
 */

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { GEO } from '@/data/geo';
import type { GeoPack } from '@/lib/geo-store';

function CopyCard({ title, note, content }: { title: string; note?: string; content: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch { /* clipboard blocked */ }
  };
  return (
    <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b-2 border-[#161616] bg-[#FBF6EA]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E0301E] font-bold">{title}</p>
          {note && <p className="font-body text-[11px] text-[#161616]/55">{note}</p>}
        </div>
        <button
          onClick={copy}
          className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] px-4 py-2 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
        >
          {done ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-5 font-mono text-[12px] leading-relaxed text-[#161616]/85 whitespace-pre-wrap max-h-72 overflow-y-auto">{content}</pre>
    </div>
  );
}

export default function PackViewer({ sessionId, pack: initial }: { sessionId: string; pack: GeoPack }) {
  const [pack, setPack] = useState(initial);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const rescansLeft = Math.max(0, GEO.freeRerunsPerPack - (pack.rerunsUsed ?? 0));

  const rescan = async () => {
    if (scanning || rescansLeft <= 0) return;
    setScanning(true);
    setMsg(null);
    trackEvent('geo_rescan', {});
    try {
      const res = await fetch('/api/geo/rescan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.pack) {
        setMsg(data?.message || 'The re-scan sputtered. Try again in a minute.');
      } else {
        setPack(data.pack as GeoPack);
        setMsg(`Re-graded: ${data.pack.lastGrade ?? '?'} (${data.pack.lastScore ?? '?'}/100). Signals regenerated from the live site.`);
      }
    } catch {
      setMsg('The re-scan sputtered. Try again in a minute.');
    }
    setScanning(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-14 md:py-20">
      <div className="text-center mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3">[ YOUR GEO FIX PACK ]</p>
        <h1 className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.02]">
          {pack.business}
        </h1>
        <p className="font-body text-[#161616]/65 mt-3">
          {pack.url} · platform detected: <strong>{pack.artifacts.platform}</strong>
          {pack.lastGrade ? <> · current grade <strong>{pack.lastGrade} ({pack.lastScore}/100)</strong></> : null}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={rescan}
            disabled={scanning || rescansLeft <= 0}
            className="rounded-full bg-[#161616] border-2 border-[#161616] px-6 py-3 font-sans font-extrabold text-[#FBF6EA] text-xs uppercase tracking-[0.18em] shadow-[3px_3px_0_0_#F5B700] transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            {scanning ? 'Re-grading…' : `Re-scan + regenerate (${rescansLeft} left)`}
          </button>
        </div>
        {msg && <p className="mt-3 font-body text-sm font-semibold text-[#161616]/80">{msg}</p>}
      </div>

      <div className="space-y-6">
        <CopyCard title="llms.txt" note="Serve at yourdomain.com/llms.txt" content={pack.artifacts.llmsTxt} />
        <CopyCard title=".well-known/ai.txt" note="Serve at yourdomain.com/.well-known/ai.txt" content={pack.artifacts.aiTxt} />
        {pack.artifacts.jsonLd.map((block, i) => (
          <CopyCard key={i} title={`JSON-LD block ${i + 1}`} note='Paste inside <script type="application/ld+json"> in your page head' content={block} />
        ))}
        <CopyCard
          title="Meta rewrites"
          note="Title + description per page"
          content={pack.artifacts.metaRewrites.map((m) => `${m.page}\nTitle: ${m.title}\nDescription: ${m.description}`).join('\n\n')}
        />
        <CopyCard title="Citable FAQ block" note="Add as a visible section (AI engines quote what humans can read)" content={pack.artifacts.faqBlock} />
      </div>

      <div className="mt-10 rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold mb-4">Install guide · {pack.artifacts.platform}</p>
        <ol className="space-y-3 list-decimal pl-5 font-body text-sm leading-relaxed text-[#FBF6EA]/85">
          {pack.artifacts.installSteps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {pack.artifacts.notes && (
          <p className="mt-5 pt-4 border-t border-[#FBF6EA]/15 font-body text-sm text-[#F5B700]">{pack.artifacts.notes}</p>
        )}
        <p className="mt-4 font-body text-xs text-[#FBF6EA]/50">
          Stuck on an install step? Reply to your receipt email; it reaches Sarah directly. Want it all installed for you? Ask about white glove.
        </p>
      </div>

      <p className="text-center mt-8 font-body text-sm text-[#161616]/60">
        Bookmark this page; it rebuilds from your receipt anytime. Print it for your web person.
      </p>
    </div>
  );
}
