'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Proof-of-polish on /work-with-us: a real screen recording of the client
 * portal a customer gets after a build. Framed in pop-art browser chrome.
 * Autoplays muted + loops only while in view (perf), and honors
 * prefers-reduced-motion by holding on the poster with a tap-to-play.
 */

const FEATURES = [
  { label: 'Live project status', detail: 'Progress, milestones, and a real launch countdown.' },
  { label: 'Secure payments', detail: 'Pay a balance or start a plan without an invoice chase.' },
  { label: 'An AI guide', detail: 'Ask where your build stands and get a real answer.' },
];

export default function PortalShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video || !wrap || reduced) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section className="max-w-6xl mx-auto px-6 md:px-8 py-20">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-5 block">
          What you actually get
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mb-4">
          Every client gets a{' '}
          <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
            portal
          </span>
          , not a folder of files
        </h2>
        <p className="text-[#3a3733] text-base font-body leading-relaxed">
          One home base for your build. Track progress, grab files, pay securely, and ask the in-house AI guide where things stand. This is a real recording, not a mockup.
        </p>
      </div>

      {/* Browser-chrome frame */}
      <div ref={wrapRef} className="pop-card overflow-hidden p-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#161616] bg-[#FFFDF6]">
          <span className="w-3 h-3 rounded-full bg-[#E0301E] border border-[#161616]" aria-hidden />
          <span className="w-3 h-3 rounded-full bg-[#F5B700] border border-[#161616]" aria-hidden />
          <span className="w-3 h-3 rounded-full bg-[#8FA98F] border border-[#161616]" aria-hidden />
          <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full bg-white border-2 border-[#161616] text-[10px] md:text-[11px] font-mono text-[#161616]/70 tracking-tight">
            modernmustardseed.com/portal
          </span>
        </div>
        <video
          ref={videoRef}
          className="block w-full h-auto"
          poster="/video/portal-walkthrough-poster.jpg"
          muted
          loop
          playsInline
          preload="metadata"
          controls={reduced}
          aria-label="A screen recording of the Modern Mustard Seed client portal: project progress, billing, milestones, and the in-portal AI guide answering a question about project status."
        >
          <source src="/video/portal-walkthrough.webm" type="video/webm" />
          <source src="/video/portal-walkthrough.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Feature captions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        {FEATURES.map((f) => (
          <div key={f.label} className="pop-card p-5">
            <h3 className="font-display text-base font-black text-[#161616] tracking-tight mb-1.5">{f.label}</h3>
            <p className="text-[#3a3733] text-sm font-body leading-6">{f.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
