'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const ROTATING_WORDS = [
  'founders',
  'operators',
  'makers',
  'second-act dreamers',
  'small-town builders',
  'first-time creators',
];

const HEADLINE_WORDS = ['The', 'Era', 'of', 'the', 'Entrepreneur.'];

export default function EraOfEntrepreneur() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setWordIdx((i) => (i + 1) % ROTATING_WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      ref={ref}
      className="relative w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40 overflow-hidden"
    >
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float-spark {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.35; }
          50% { transform: translateY(-12px) scale(1.2); opacity: 0.7; }
        }
        @keyframes word-rise {
          from { opacity: 0; transform: translateY(28px) skewY(2deg); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0) skewY(0); filter: blur(0); }
        }
        @keyframes rotate-in {
          from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .headline-shimmer {
          background: linear-gradient(
            90deg,
            #c8a415 0%,
            #f0d878 25%,
            #ffe8a8 50%,
            #f0d878 75%,
            #c8a415 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 6s linear infinite;
        }
        .word-reveal {
          display: inline-block;
          opacity: 0;
        }
        .word-reveal.in {
          animation: word-rise 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .spark {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 220, 130, 0.9), transparent 70%);
          animation: float-spark 6s ease-in-out infinite;
          pointer-events: none;
        }
        .rotator {
          display: inline-block;
          min-width: 240px;
          text-align: left;
        }
        .rotator-word {
          display: inline-block;
          animation: rotate-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .word-reveal { opacity: 1 !important; animation: none !important; }
          .headline-shimmer { animation: none; }
          .spark { animation: none; }
          .rotator-word { animation: none; }
        }
      `}</style>

      <div className="spark" style={{ top: '18%', left: '12%', animationDelay: '0s' }} />
      <div className="spark" style={{ top: '32%', right: '18%', animationDelay: '1.4s' }} />
      <div className="spark" style={{ top: '68%', left: '22%', animationDelay: '2.8s' }} />
      <div className="spark" style={{ top: '78%', right: '14%', animationDelay: '0.7s' }} />
      <div className="spark" style={{ top: '50%', left: '50%', animationDelay: '3.5s' }} />

      <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-7 block">
          A manifesto
        </span>

        <h2 className="font-sans text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-10">
          {HEADLINE_WORDS.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className={`word-reveal ${visible ? 'in' : ''} ${i === 1 || i === 4 ? 'headline-shimmer' : 'text-white'} mr-3`}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              {w}
            </span>
          ))}
        </h2>

        <p className="text-white/75 text-lg md:text-2xl font-body font-light leading-relaxed max-w-3xl mx-auto mb-6">
          One person with the right tools can now build what used to take a team of fifty.
        </p>
        <p className="text-mustard-200/80 text-base md:text-lg font-body font-medium leading-relaxed max-w-2xl mx-auto mb-14">
          That is the era we are in. We are here to give you the tools.
        </p>

        <div className="text-base md:text-xl font-body text-white/55 mb-12 flex items-center justify-center flex-wrap gap-x-3 gap-y-2">
          <span>Built for</span>
          <span className="rotator">
            <span
              key={wordIdx}
              className="rotator-word font-serif italic text-mustard-300 text-xl md:text-2xl tracking-tight"
            >
              {ROTATING_WORDS[wordIdx]}
            </span>
          </span>
          <span className="text-white/35">·</span>
          <span className="text-white/55">no AI degree required.</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/build-queue"
            className="group relative px-10 py-4 text-[12px] uppercase tracking-[0.22em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_50px_rgba(200,164,21,0.45)] transition-all duration-500 hover:scale-[1.03]"
          >
            <span className="relative z-10">Get in the build queue</span>
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-mustard-400 to-mustard-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Link>
          <Link
            href="/work"
            className="px-8 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white/55 hover:text-mustard-300 transition-all"
          >
            See what we ship →
          </Link>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
        <div className="w-px h-24 bg-gradient-to-t from-transparent via-mustard-500/30 to-transparent" />
      </div>
    </section>
  );
}
