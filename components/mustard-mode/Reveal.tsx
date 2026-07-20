'use client';

/**
 * Section-entrance choreography, the moodboard's spec: the red mono eyebrow
 * types itself in, the Playfair headline slams with a shadow-lag settle, cards
 * land with a stagger, CTAs drop last with one bounce. IntersectionObserver +
 * CSS only (no motion library), full reduced-motion fallback.
 */

import { ReactNode, useEffect, useRef, useState } from 'react';

type Variant = 'eyebrow' | 'slam' | 'rise' | 'drop';

export default function Reveal({
  children,
  variant = 'rise',
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        // Also show anything already scrolled past (top above the viewport):
        // an anchor jump (#packages) lands mid-page and elements at or above
        // the landing edge would otherwise never intersect and stay invisible.
        if (entries[0].isIntersecting || entries[0].boundingClientRect.top < 0) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`mm-reveal mm-reveal-${variant} ${shown ? 'mm-shown' : ''} ${className}`} style={{ transitionDelay: `${delay}ms`, animationDelay: `${delay}ms` }}>
      <style>{`
        .mm-reveal { will-change: transform, opacity; }
        .mm-reveal-eyebrow { clip-path: inset(0 100% 0 0); opacity: 0; }
        .mm-reveal-eyebrow.mm-shown { animation: mm-typebar 700ms steps(24) forwards; }
        @keyframes mm-typebar { from { clip-path: inset(0 100% 0 0); opacity: 1; } to { clip-path: inset(0 0 0 0); opacity: 1; } }

        .mm-reveal-slam { opacity: 0; transform: translateY(34px) scale(0.985); }
        .mm-reveal-slam.mm-shown { animation: mm-slam 640ms cubic-bezier(.22,1.35,.36,1) forwards; }
        @keyframes mm-slam {
          0% { opacity: 0; transform: translateY(34px) scale(0.985); }
          70% { opacity: 1; transform: translateY(-4px) scale(1.004); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .mm-reveal-rise { opacity: 0; transform: translateY(22px); transition: opacity 560ms ease, transform 560ms cubic-bezier(.22,1,.36,1); }
        .mm-reveal-rise.mm-shown { opacity: 1; transform: translateY(0); }

        .mm-reveal-drop { opacity: 0; transform: translateY(-14px); }
        .mm-reveal-drop.mm-shown { animation: mm-coindrop 560ms cubic-bezier(.34,1.56,.64,1) forwards; }
        @keyframes mm-coindrop {
          0% { opacity: 0; transform: translateY(-14px); }
          60% { opacity: 1; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .mm-reveal, .mm-reveal.mm-shown { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; clip-path: none !important; }
        }
      `}</style>
      {children}
    </div>
  );
}
