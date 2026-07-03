'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

/**
 * Meta Ads launch playbook for the "Call Me" Mr. Mustard commercial.
 * Everything needed to publish the campaign lives on this one page:
 * the three cuts (per placement), copy-paste ad text, audience, budget,
 * the pixel prerequisite, the day-one checklist, and how to read results.
 */

const PHONE = '(406) 312-1223';
const LANDING = 'https://modernmustardseed.com/voice-agents?utm_source=meta&utm_medium=paid&utm_campaign=callme';

const COPY_A = `Meet Mr. Mustard. He answers our phones 24/7, takes bookings, gives estimates, and makes outbound sales calls. He never sleeps, never misses a call, and never lets a lead go cold.

Don't take our word for it. Call him right now: ${PHONE}. He picks up.

Then imagine him trained on YOUR business.`;

const COPY_B = `Every missed call is a customer who called your competitor next. Mr. Mustard picks up every single time: orders, appointments, estimates, even outbound follow-up. All day. All night.

Hear him live right now: ${PHONE}. Your business could sound like this by next week.`;

const HEADLINE = 'Your 24/7 AI receptionist. Hear it live.';
const DESCRIPTION = 'Built by Modern Mustard Seed.';

const CUTS = [
  { file: '/ads/call-me-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/call-me-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/call-me-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the website hero.' },
];

const CHECKLIST = [
  { id: 'pixel', label: 'Pixel (one-time): in Meta Events Manager copy the Pixel ID + create a Conversions API token, then paste both to Claude (or add NEXT_PUBLIC_META_PIXEL_ID + META_CONVERSIONS_API_TOKEN in Vercel and redeploy). Unlocks conversion tracking + retargeting. You can launch Cell A without it.' },
  { id: 'page', label: 'In Ads Manager, run ads from the Modern Mustard Seed Facebook Page with @modernmustardseed selected for Instagram.' },
  { id: 'cellA', label: 'Cell A (main): Campaign objective Leads → Calls. Budget $15/day. Upload the 4:5 cut, customize placements (9:16 for Reels/Stories). Call Now button → (406) 312-1223. Paste Copy Variant 1.' },
  { id: 'cellB', label: 'Cell B: Campaign objective Traffic (switch to Conversions once pixel is live). Budget $10/day. Same creative per placement. Learn More button → the UTM landing link below. Paste Copy Variant 2.' },
  { id: 'audience', label: 'Audience (both cells): Advantage+ audience. Suggestions only: Small business owners, Business owner, Restaurant owner, Home improvement. Age 25-60, United States. Do NOT restrict to Montana.' },
  { id: 'captions', label: 'Decline Meta auto-captions (the video has styled captions burned in).' },
  { id: 'organic', label: 'Post the 4:5 cut organically on FB + IG the same day (free reach, warms the page). Ask Claude for the drafts.' },
  { id: 'retarget', label: 'Day 3-4: create a Custom Audience of 50% video viewers and point a third ad set at them with the landing link. Works without the pixel.' },
  { id: 'review', label: 'Day 5-7: judge with the scale rules below. Check Callers for booked calls from the ad line.' },
];

function CopyBlock({ title, text }: { title: string; text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch { /* clipboard blocked */ }
  };
  return (
    <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">{title}</span>
        <button
          onClick={copy}
          className="text-[11px] uppercase tracking-[0.18em] font-sans font-bold px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
        >
          {done ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-[#161616]/85 whitespace-pre-line leading-relaxed font-sans">{text}</p>
    </div>
  );
}

export default function AdsPlaybook() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mms-ads-checklist');
      if (raw) setChecked(JSON.parse(raw));
    } catch { /* first visit */ }
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const doneCount = CHECKLIST.filter((c) => checked[c.id]).length;

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="ads" title="Meta Ads" />

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8 space-y-10">
        {/* Hero strip */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Campaign one</span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-[#161616] mt-2">
            &ldquo;Call Me&rdquo; <span className="italic text-[#E0301E]">Mr. Mustard</span> on Meta
          </h2>
          <p className="text-[#161616]/75 mt-3 max-w-3xl font-sans">
            The ad IS the demo: every viewer who dials {PHONE} gets Mr. Mustard live, and he captures the lead
            and books the discovery call himself. Two cells, $25/day total, judge on cost per booked call.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Ads Manager</a>
            <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Events Manager (Pixel)</a>
            <a href="/admin/callers" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Callers (results)</a>
          </div>
        </section>

        {/* The three cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Upload one ad, then use &ldquo;customize per placement&rdquo; to assign each cut. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/call-me-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Copy blocks */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (Cell A)" text={COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (Cell B)" text={COPY_B} />
            <CopyBlock title="Headline" text={HEADLINE} />
            <CopyBlock title="Description" text={DESCRIPTION} />
            <CopyBlock title="Call Now number (Cell A)" text={PHONE} />
            <CopyBlock title="Landing link with UTM (Cell B)" text={LANDING} />
          </div>
        </section>

        {/* Settings cards */}
        <section className="grid md:grid-cols-3 gap-5">
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Audience</span>
            <ul className="mt-3 space-y-2 text-sm text-[#161616]/85 font-sans list-disc list-inside">
              <li>Advantage+ audience (let Meta&rsquo;s delivery AI work)</li>
              <li>Suggestions: Small business owners, Business owner, Restaurant owner, Home improvement</li>
              <li>Age 25-60, United States nationwide</li>
              <li>No Montana-only restriction (the service is remote)</li>
            </ul>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Budget</span>
            <ul className="mt-3 space-y-2 text-sm text-[#161616]/85 font-sans list-disc list-inside">
              <li><b>$25/day total:</b> $15 Cell A (calls) + $10 Cell B (traffic)</li>
              <li>Touch nothing for 4-5 days (learning phase)</li>
              <li>~$750/month cap; one client covers a year of it</li>
            </ul>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Kill / scale rules</span>
            <ul className="mt-3 space-y-2 text-sm text-[#161616]/85 font-sans list-disc list-inside">
              <li>Cost per call &gt; ~$25 or zero calls by day 5: swap copy variant</li>
              <li>Cost per call &lt; ~$10: raise budget 20% every 3 days (never double overnight)</li>
              <li>The real metric: <b>cost per booked discovery call</b> (check Callers + booking emails)</li>
            </ul>
          </div>
        </section>

        {/* Launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCount}/{CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={() => toggle(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checked[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>

        {/* Measurement */}
        <section className="bg-[#161616] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 text-[#FBF6EA]">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold">How to read results</span>
          <div className="grid md:grid-cols-3 gap-6 mt-4 text-sm font-sans">
            <p><b className="text-[#F5B700]">Calls:</b> every ad-driven call hits the Mustard line and lands in <a href="/admin/callers" className="underline decoration-[#F5B700]">Callers</a> with a transcript. Bookings email you automatically.</p>
            <p><b className="text-[#F5B700]">Site:</b> Cell B traffic shows in GA4 + the first-party beacon under utm_campaign=callme. Conversions get exact once the pixel vars are set.</p>
            <p><b className="text-[#F5B700]">Weekly:</b> ask Claude to read Callers against spend and report the true cost per booked discovery call.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
