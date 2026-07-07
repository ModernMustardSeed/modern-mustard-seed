'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

/**
 * Meta Ads launch playbook for the Mr. Mustard commercials.
 * Campaign one: "Call Me" (voice agents, call objective).
 * Campaign two: "The Talking Website" (full system pitch, audit funnel).
 * Campaign three: "MUSTARD MODE" (the coaching product, free-play funnel).
 * Campaign four: "The Fable Mind" (free playbook lead magnet funnel).
 * Everything needed to publish lives on this one page: the cuts per
 * placement, copy-paste ad text, audience, budget, checklists, results.
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

const TW_LANDING = 'https://modernmustardseed.com/audit?utm_source=meta&utm_medium=paid&utm_campaign=talkingwebsite';

const TW_COPY_A = `Your website looks great. But does it DO anything?

The new websites talk. They greet every visitor, answer every question, and close the sale while you sleep. And behind the pretty face: a full CRM, automated follow-up, marketing funnels, even an ad studio that makes the ads for you.

We build them. Start with a free AI audit of your current site and see exactly what it is leaving on the table.`;

const TW_COPY_B = `Most websites are brochures. Yours could be a salesperson.

A Modern Mustard Seed build comes with everything baked in: an AI website that talks to visitors, a CRM that captures every lead, automated follow-up, funnels that convert, and an ad studio for the marketing. One system. It sells for you.

Get the free AI audit and see what your current site is missing.`;

const TW_HEADLINE = 'Your website should sell for you.';
const TW_DESCRIPTION = 'AI website + CRM + funnels + ad studio. Built by Modern Mustard Seed.';

const TW_CUTS = [
  { file: '/ads/talking-website-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/talking-website-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/talking-website-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the website hero.' },
];

const TW_CHECKLIST = [
  { id: 'cell', label: 'Cell C: Campaign objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the audit UTM link above. Paste Copy Variant 1.' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize placements: 9:16 for Reels/Stories, 16:9 for in-stream.' },
  { id: 'audience', label: 'Audience: same Advantage+ setup as Call Me (small business owner interests, age 25-60, United States nationwide).' },
  { id: 'captions', label: 'Decline Meta auto-captions (the video has styled captions burned in).' },
  { id: 'organic', label: 'Post the 4:5 cut organically on FB + IG the same day (free reach, warms the page). Ask Claude for the drafts.' },
  { id: 'retarget', label: 'Day 3-4: add a retargeting ad set of 50% video viewers from BOTH commercials, pointed at the audit link. Works without the pixel.' },
  { id: 'review', label: 'Day 5-7: judge on cost per audit lead. Audit submissions land in the admin inbox tagged utm_campaign=talkingwebsite.' },
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

// ============ Campaign three: MUSTARD MODE ============

const MM_LANDING = 'https://modernmustardseed.com/mustard-mode?utm_source=meta&utm_medium=paid&utm_campaign=mustardmode';

const MM_COPY_A = `Your software dreams have a coach now.

MUSTARD MODE is a personal AI coach that trains you to build real things with Claude: apps, websites, designs, whole businesses. Four tracks. 28 missions. The exact prompts a working studio runs every day.

No computer science degree. Just the Claude subscription you may already have.

Your first coaching session is free, right on the page. Type what you want to build and watch what happens.`;

const MM_COPY_B = `Everyone tells you AI will change everything. Nobody shows you the reps.

MUSTARD MODE does. A live AI coach (his name is Mr. Mustard), four tracks (Code, Design, Cowork, Ideate), 28 hands-on missions that each end with something real shipped, and the prompt library to run it all.

Play your first coaching session free on the page. If five minutes with the coach does not convince you, keep your money.`;

const MM_HEADLINE = 'One seed. 100x the output.';
const MM_DESCRIPTION = 'Your own AI coach for Claude. First session free, on the page.';

const MM_CUTS = [
  { file: '/ads/mustard-mode-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/mustard-mode-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/mustard-mode-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the landing hero.' },
];

const MM_CHECKLIST = [
  { id: 'cell', label: 'One cell to start: Campaign objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the MUSTARD MODE UTM link above. Paste Copy Variant 1.' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize placements: 9:16 for Reels/Stories, 16:9 for in-stream.' },
  { id: 'audience', label: 'Audience: Advantage+, but consumer-tilted vs the service campaigns. Suggestions: Entrepreneurship, Side project, Web development, ChatGPT/AI tools, Online courses. Age 22-55, United States.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled captions are burned in).' },
  { id: 'organic', label: 'Post the 9:16 cut as an organic Reel + the 4:5 to FB the same day (the launch post drafts are already written, ask Claude).' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 and let them fight. Kill the loser at day 6.' },
  { id: 'retarget', label: 'Day 3-4: retargeting ad set of 50% video viewers across ALL THREE commercials pointed at the MUSTARD MODE link. Builders who watched the service ads are this product’s warmest audience.' },
  { id: 'review', label: 'Day 5-7: judge on cost per free-play email (leads tagged source mustard-mode-free-play in the admin). The true metric: Stripe checkouts on Player/Builder, which land in Orders and email you on every sale.' },
];

// ============ Campaign four: The Fable Mind ============

const FM_LANDING = 'https://modernmustardseed.com/playbooks/fable-mind?utm_source=meta&utm_medium=paid&utm_campaign=fablemind';

const FM_COPY_A = `A frontier AI passed through our studio. It could not stay. So we wrote down its mind.

The Fable Mind Playbook is the exact system that makes an everyday AI think like the expensive one: the operating doctrine, the guard hook, the skeptic agent, and the multi-agent audit workflow. The same files running our studio right now.

It is free. Install it in ten minutes and watch your AI stop guessing and start verifying.`;

const FM_COPY_B = `You do not need the expensive AI for everything. You need its discipline.

We had a frontier model encode how it thinks into skills, hooks, and workflows that any model can run. The result: an everyday AI that verifies before it claims, finishes what it starts, and audits like a senior engineer.

The whole playbook is free. Copy, paste, done in ten minutes. And when the big models go to metered pricing, this is how you keep the bill small.`;

const FM_HEADLINE = 'Make any AI think like the big one.';
const FM_DESCRIPTION = 'The Fable Mind Playbook. Free from Modern Mustard Seed.';

const FM_CUTS = [
  { file: '/ads/fable-mind-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/fable-mind-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/fable-mind-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the blog/playbook hero.' },
];

const FM_CHECKLIST = [
  { id: 'cell', label: 'One cell to start: Campaign objective Traffic (switch to Conversions once the pixel is live). Budget $10/day. Learn More button → the playbook UTM link above. Paste Copy Variant 1.' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize placements: 9:16 for Reels/Stories, 16:9 for in-stream.' },
  { id: 'audience', label: 'Audience: Advantage+, builder-tilted. Suggestions: Entrepreneurship, Artificial intelligence, Software development, ChatGPT/AI tools, Small business owners. Age 22-60, United States.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled captions are burned in).' },
  { id: 'organic', label: 'Post the 9:16 cut as an organic Reel + the 4:5 to FB the same day. The blog post (/blog/when-the-frontier-model-visits) is the LinkedIn/X companion. Ask Claude for the drafts.' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the economics angle) and let them fight. Kill the loser at day 6.' },
  { id: 'retarget', label: 'Day 3-4: retargeting ad set of 50% video viewers across ALL FOUR commercials pointed at the playbook link. People who watched the service ads are exactly who steals playbooks.' },
  { id: 'review', label: 'Day 5-7: judge on cost per playbook email (the "Email this to me" captures land in Leads). The truth metric: booked calls and audit requests from playbook readers.' },
];

// ============ Campaign five: The Sidekick Forge ============

const SK_LANDING = 'https://modernmustardseed.com/sidekick?utm_source=meta&utm_medium=paid&utm_campaign=sidekick';

const SK_COPY_A = `Right now, someone is calling your business. Nobody's answering.

So we built the Sidekick Forge. Tell Mr. Mustard about your business (what you do, what you charge, what customers ask) and sixty seconds later your own AI receptionist graduates and talks to you. Live. In your browser. He can even call your cell.

The demo is free, no card. If you love him, he's answering your real phone 24/7 this week: hard-capped minutes, month to month, never a surprise bill.`;

const SK_COPY_B = `The average small business misses 4 in 10 calls. Every missed call dials your competitor next.

Your Sidekick answers every one: books appointments, takes clean messages, flags emergencies to your cell, and sends you a summary of every call. Trained on YOUR business in sixty seconds, live on your real line within a week.

Hear yours before you pay a cent. The forge is free and it is honestly just fun.`;

const SK_HEADLINE = 'Hear YOUR AI receptionist in 60 seconds.';
const SK_DESCRIPTION = 'Free demo. He talks. You decide. From Modern Mustard Seed.';

const SK_CUTS = [
  { file: '/ads/sidekick-4x5.mp4', label: '4:5 — Feed', note: 'Facebook + Instagram feed. The workhorse placement.' },
  { file: '/ads/sidekick-9x16.mp4', label: '9:16 — Reels + Stories', note: 'Full-screen vertical placements.' },
  { file: '/ads/sidekick-16x9.mp4', label: '16:9 — In-stream + site', note: 'Video feeds, search, and the landing hero.' },
];

const SK_CHECKLIST = [
  { id: 'cell', label: 'One cell to start: Campaign objective Traffic (switch to Conversions once the pixel is live). Budget $15/day. Learn More button → the forge UTM link above. Paste Copy Variant 1.' },
  { id: 'placements', label: 'Upload the 4:5 cut, then customize placements: 9:16 for Reels/Stories, 16:9 for in-stream.' },
  { id: 'audience', label: 'Audience: Advantage+, local-owner tilted. Suggestions: Small business owners, Restaurant owners, Home services, Salon owners, Missed call/answering service interest. Age 25-65, United States.' },
  { id: 'captions', label: 'Decline Meta auto-captions (styled captions are burned in).' },
  { id: 'organic', label: 'Post the 9:16 cut as an organic Reel + the 4:5 to FB the same day. Launch drafts are in social-drafts/sidekick-launch.md (ask Claude to fetch them).' },
  { id: 'abtest', label: 'Day 3: duplicate the ad with Copy Variant 2 (the missed-calls math) and let them fight. Kill the loser at day 6.' },
  { id: 'retarget', label: 'Day 3-4: retargeting ad set of 50% video viewers across all five commercials pointed at the forge. Call Me viewers are the hottest overlap.' },
  { id: 'capwatch', label: 'The free forge is capped at 20 demos/day globally. If ads fill the cap (email alert fires), raise GLOBAL_DAILY_CAP in app/api/sidekick/forge/route.ts before scaling spend.' },
  { id: 'review', label: 'Day 5-7: judge on cost per forged demo (leads tagged source sidekick-forge in the admin). The truth metric: Keep Him subscriptions, which email you on every sale, and booked calls from demo transcripts.' },
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
          className="text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
        >
          {done ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-[#161616]/85 whitespace-pre-line leading-relaxed font-sans">{text}</p>
    </div>
  );
}

type AdsTab = 'callme' | 'tw' | 'mm' | 'fm' | 'sk' | 'results';

const TABS: { key: AdsTab; num: string; label: string; blurb: string }[] = [
  { key: 'callme', num: '01', label: 'Call Me', blurb: 'Voice agents · call objective · $25/day' },
  { key: 'tw', num: '02', label: 'Talking Website', blurb: 'Full system · audit funnel · $10/day' },
  { key: 'mm', num: '03', label: 'MUSTARD MODE', blurb: 'The product · free-play funnel · $10/day' },
  { key: 'fm', num: '04', label: 'The Fable Mind', blurb: 'Free playbook · lead magnet · $10/day' },
  { key: 'sk', num: '05', label: 'Sidekick Forge', blurb: 'Instant demo · forge funnel · $15/day' },
  { key: 'results', num: '📊', label: 'Results', blurb: 'How to read them all together' },
];

export default function AdsPlaybook() {
  const [tab, setTab] = useState<AdsTab>('callme');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [checkedTw, setCheckedTw] = useState<Record<string, boolean>>({});
  const [checkedMm, setCheckedMm] = useState<Record<string, boolean>>({});
  const [checkedFm, setCheckedFm] = useState<Record<string, boolean>>({});
  const [checkedSk, setCheckedSk] = useState<Record<string, boolean>>({});

  // Remember the campaign you were working in.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mms-ads-tab') as AdsTab | null;
      if (saved && TABS.some((t) => t.key === saved)) setTab(saved);
    } catch { /* first visit */ }
  }, []);
  const switchTab = (t: AdsTab) => {
    setTab(t);
    try { localStorage.setItem('mms-ads-tab', t); } catch { /* private mode */ }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mms-ads-checklist');
      if (raw) setChecked(JSON.parse(raw));
      const rawTw = localStorage.getItem('mms-ads-checklist-tw');
      if (rawTw) setCheckedTw(JSON.parse(rawTw));
      const rawMm = localStorage.getItem('mms-ads-checklist-mm');
      if (rawMm) setCheckedMm(JSON.parse(rawMm));
      const rawFm = localStorage.getItem('mms-ads-checklist-fm');
      if (rawFm) setCheckedFm(JSON.parse(rawFm));
      const rawSk = localStorage.getItem('mms-ads-checklist-sk');
      if (rawSk) setCheckedSk(JSON.parse(rawSk));
    } catch { /* first visit */ }
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const toggleTw = (id: string) => {
    setCheckedTw((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist-tw', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const toggleMm = (id: string) => {
    setCheckedMm((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist-mm', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const toggleFm = (id: string) => {
    setCheckedFm((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist-fm', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const toggleSk = (id: string) => {
    setCheckedSk((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('mms-ads-checklist-sk', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const doneCount = CHECKLIST.filter((c) => checked[c.id]).length;
  const doneCountTw = TW_CHECKLIST.filter((c) => checkedTw[c.id]).length;
  const doneCountMm = MM_CHECKLIST.filter((c) => checkedMm[c.id]).length;
  const doneCountFm = FM_CHECKLIST.filter((c) => checkedFm[c.id]).length;
  const doneCountSk = SK_CHECKLIST.filter((c) => checkedSk[c.id]).length;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="ads" title="Meta Ads" />

      {/* Campaign switcher */}
      <div className="sticky top-0 z-30 bg-[#FBF6EA]/95 backdrop-blur border-b-2 border-[#161616]">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`text-left border-2 border-[#161616] px-3.5 py-2.5 transition-all ${
                tab === t.key
                  ? 'bg-[#161616] text-white shadow-[3px_3px_0_0_#F5B700]'
                  : 'bg-white text-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5'
              }`}
            >
              <span className={`font-mono font-bold text-[10px] tracking-[0.2em] block ${tab === t.key ? 'text-[#FFDD55]' : 'text-[#E0301E]'}`}>
                {t.num === '📊' ? 'RESULTS' : `CAMPAIGN ${t.num}`}
              </span>
              <span className="font-sans font-extrabold text-sm block mt-0.5">{t.label}</span>
              <span className={`font-sans text-[11px] hidden md:block ${tab === t.key ? 'text-white/60' : 'text-[#161616]/55'}`}>{t.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8 space-y-10">
        {tab === 'callme' && (<>
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
            <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Ads Manager</a>
            <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Events Manager (Pixel)</a>
            <a href="/admin/callers" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Callers (results)</a>
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
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
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
        </>)}

        {tab === 'tw' && (<>
        {/* ============ Campaign two: The Talking Website ============ */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Campaign two</span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-[#161616] mt-2">
            &ldquo;The Talking Website&rdquo; <span className="italic text-[#E0301E]">has arrived</span>
          </h2>
          <p className="text-[#161616]/75 mt-3 max-w-3xl font-sans">
            The full-system pitch: AI website, CRM, funnels, and ad studio, all baked in, it sells for you.
            One traffic cell at $10/day feeding the free AI audit funnel. Judge on cost per audit lead.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Ads Manager</a>
            <a href="/audit" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">The audit funnel (landing)</a>
          </div>
        </section>

        {/* Talking Website cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Same drill: upload one ad, customize per placement. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {TW_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/talking-website-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Talking Website copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1" text={TW_COPY_A} />
            <CopyBlock title="Primary text — Variant 2" text={TW_COPY_B} />
            <CopyBlock title="Headline" text={TW_HEADLINE} />
            <CopyBlock title="Description" text={TW_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (audit funnel)" text={TW_LANDING} />
          </div>
        </section>

        {/* Talking Website launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountTw}/{TW_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {TW_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedTw[item.id]}
                    onChange={() => toggleTw(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedTw[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'mm' && (<>
        {/* ============ Campaign three: MUSTARD MODE ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign three</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;MUSTARD MODE&rdquo; <span className="italic text-[#F5B700]">[ ON ]</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The product campaign. The angle: the ad IS the demo, again. The commercial sells the coach,
              the landing page delivers a real free coaching session in the first five minutes, and the
              email that saves the run is the lead. One traffic cell at $10/day into the free-play funnel,
              judged on cost per free-play email, with Player and Builder checkouts as the truth.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/mustard-mode" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The landing (free play)</a>
              <a href="/admin/leads" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Leads (free plays)</a>
            </div>
          </div>
        </section>

        {/* MUSTARD MODE cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Same drill: upload one ad, customize per placement. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {MM_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/mustard-mode-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MUSTARD MODE copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the coach)" text={MM_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the reps)" text={MM_COPY_B} />
            <CopyBlock title="Headline" text={MM_HEADLINE} />
            <CopyBlock title="Description" text={MM_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (free-play funnel)" text={MM_LANDING} />
          </div>
        </section>

        {/* MUSTARD MODE launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountMm}/{MM_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {MM_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedMm[item.id]}
                    onChange={() => toggleMm(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedMm[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'fm' && (<>
        {/* ============ Campaign four: The Fable Mind ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign four</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;The Fable Mind&rdquo; <span className="italic text-[#F5B700]">Steal the mind.</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The lead magnet campaign. A frontier AI hands its mind to the everyday robot, and the viewer
              gets to steal the same playbook free. Every email capture is a builder-profile lead who now
              associates MMS with the deepest agentic work in the space. One traffic cell at $10/day,
              judged on cost per playbook email.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/playbooks/fable-mind" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The playbook (landing)</a>
              <a href="/admin/leads" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Leads (email captures)</a>
            </div>
          </div>
        </section>

        {/* Fable Mind cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Same drill: upload one ad, customize per placement. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {FM_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/fable-mind-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fable Mind copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the story)" text={FM_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the economics)" text={FM_COPY_B} />
            <CopyBlock title="Headline" text={FM_HEADLINE} />
            <CopyBlock title="Description" text={FM_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (playbook funnel)" text={FM_LANDING} />
          </div>
        </section>

        {/* Fable Mind launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountFm}/{FM_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {FM_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedFm[item.id]}
                    onChange={() => toggleFm(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedFm[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'sk' && (<>
        {/* ============ Campaign five: The Sidekick Forge ============ */}
        <section className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,0.5) 1.5px, transparent 1.6px)', backgroundSize: '16px 16px' }} aria-hidden />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFDD55] font-mono font-bold">Campaign five</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2">
              &ldquo;The Graduate&rdquo; <span className="italic text-[#F5B700]">The demo IS the product.</span>
            </h2>
            <p className="text-white/75 mt-3 max-w-3xl font-sans">
              The forge funnel. Mr. Mustard trains a Sidekick in the spot; the viewer forges their own
              for free and HEARS it answer as their business. Every demo is a transcript-attached lead
              at roughly 45 cents of voice cost, and Keep Him subscriptions convert at the moment of
              peak delight. One traffic cell at $15/day, judged on cost per forged demo.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Open Ads Manager</a>
              <a href="/sidekick" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">The forge (landing)</a>
              <a href="/admin/leads" className="text-[12px] uppercase tracking-[0.18em] font-sans font-bold px-4 py-2.5 border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#FFDD55] hover:-translate-y-0.5 transition-transform text-[#161616]">Leads (forged demos)</a>
            </div>
          </div>
        </section>

        {/* Sidekick cuts */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-1">The creative, one cut per placement</h3>
          <p className="text-sm text-[#161616]/65 mb-5 font-sans">Same drill: upload one ad, customize per placement. Right-click any video to save it.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {SK_CUTS.map((c) => (
              <div key={c.file} className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-4">
                <video controls preload="metadata" poster="/ads/sidekick-poster.png" className="w-full border border-[#161616] bg-black" src={c.file} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616]">{c.label}</p>
                    <p className="text-xs text-[#161616]/60 font-sans">{c.note}</p>
                  </div>
                  <a href={c.file} download className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3 py-1.5 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sidekick copy */}
        <section>
          <h3 className="font-display text-2xl font-extrabold text-[#161616] mb-5">Ad copy, ready to paste</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <CopyBlock title="Primary text — Variant 1 (the story)" text={SK_COPY_A} />
            <CopyBlock title="Primary text — Variant 2 (the missed-calls math)" text={SK_COPY_B} />
            <CopyBlock title="Headline" text={SK_HEADLINE} />
            <CopyBlock title="Description" text={SK_DESCRIPTION} />
            <CopyBlock title="Landing link with UTM (forge funnel)" text={SK_LANDING} />
          </div>
        </section>

        {/* Sidekick launch checklist */}
        <section className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-2xl font-extrabold text-[#161616]">Launch checklist</h3>
            <span className="text-[11px] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] px-3 py-1 shadow-[2px_2px_0_0_#161616]">{doneCountSk}/{SK_CHECKLIST.length}</span>
          </div>
          <ol className="space-y-3">
            {SK_CHECKLIST.map((item, i) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedSk[item.id]}
                    onChange={() => toggleSk(item.id)}
                    className="mt-1 h-4 w-4 accent-[#F5B700] shrink-0"
                  />
                  <span className={`text-sm font-sans leading-relaxed ${checkedSk[item.id] ? 'text-[#161616]/40 line-through' : 'text-[#161616]/85'}`}>
                    <b className="font-mono text-[#E0301E] mr-1.5">{String(i + 1).padStart(2, '0')}</b>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
        </>)}

        {tab === 'results' && (<>
        {/* Measurement */}
        <section className="bg-[#161616] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-8 text-[#FBF6EA]">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold">How to read results</span>
          <div className="grid md:grid-cols-3 gap-6 mt-4 text-sm font-sans">
            <p><b className="text-[#F5B700]">Calls:</b> every ad-driven call hits the Mustard line and lands in <a href="/admin/callers" className="underline decoration-[#F5B700]">Callers</a> with a transcript. Bookings email you automatically.</p>
            <p><b className="text-[#F5B700]">Site:</b> paid traffic shows in GA4 + the first-party beacon under utm_campaign=callme, talkingwebsite, mustardmode, fablemind, and sidekick. MUSTARD MODE free-plays, Fable Mind playbook emails, and forged Sidekick demos land in <a href="/admin/leads" className="underline decoration-[#F5B700]">Leads</a>, and purchases hit Orders with an email on every sale. Conversions get exact once the pixel vars are set.</p>
            <p><b className="text-[#F5B700]">Weekly:</b> ask Claude to read Callers against spend and report the true cost per booked discovery call.</p>
          </div>
        </section>

        {/* Per-campaign scoreboard shortcuts */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">01 · Call Me</span>
            <p className="text-sm text-[#161616]/80 font-sans mt-2">Metric: cost per booked discovery call.</p>
            <a href="/admin/callers" className="inline-block mt-3 text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Callers →</a>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">02 · Talking Website</span>
            <p className="text-sm text-[#161616]/80 font-sans mt-2">Metric: cost per audit lead (utm_campaign=talkingwebsite).</p>
            <a href="/admin/inbox" className="inline-block mt-3 text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Inbox →</a>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">03 · MUSTARD MODE</span>
            <p className="text-sm text-[#161616]/80 font-sans mt-2">Metric: cost per free-play email, truth = Player/Builder orders.</p>
            <a href="/admin/leads" className="inline-block mt-3 text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Leads →</a>
          </div>
          <div className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">04 · The Fable Mind</span>
            <p className="text-sm text-[#161616]/80 font-sans mt-2">Metric: cost per playbook email (utm_campaign=fablemind), truth = calls booked by readers.</p>
            <a href="/admin/leads" className="inline-block mt-3 text-[11px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open Leads →</a>
          </div>
        </section>
        </>)}
      </main>
    </div>
  );
}
