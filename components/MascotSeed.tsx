'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

type Props = {
  size?: number;
  className?: string;
  interactive?: boolean;
  showGlow?: boolean;
  priority?: boolean;
};

const GREETINGS = [
  'Hi there.',
  'Plant something.',
  'Ship something.',
  'Hello, friend.',
  "Let's build.",
  'Faith and execution.',
  'Mustard energy.',
  'Small seed, big tree.',
];

export default function MascotSeed({
  size = 200,
  className = '',
  interactive = true,
  showGlow = true,
  priority = false,
}: Props) {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [jumping, setJumping] = useState(false);
  const [blinks, setBlinks] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Random blink trigger (re-applies the CSS animation by toggling a key)
  useEffect(() => {
    if (!interactive) return;
    const tick = () => {
      setBlinks((b) => b + 1);
      const next = 3000 + Math.random() * 4000;
      timerRef.current = setTimeout(tick, next);
    };
    timerRef.current = setTimeout(tick, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [interactive]);

  const handleClick = () => {
    if (!interactive) return;
    if (jumping) return;
    setJumping(true);
    const greet = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setGreeting(greet);
    setTimeout(() => setJumping(false), 700);
    setTimeout(() => setGreeting(null), 2200);
  };

  return (
    <>
      <style jsx>{`
        .mascot-wrap {
          position: relative;
          display: inline-block;
          width: ${size}px;
          height: ${size}px;
          cursor: ${interactive ? 'pointer' : 'default'};
          user-select: none;
        }

        .mascot-glow {
          position: absolute;
          inset: -22%;
          background: radial-gradient(
            circle at center,
            rgba(200, 164, 21, 0.32) 0%,
            rgba(200, 164, 21, 0.14) 30%,
            transparent 65%
          );
          filter: blur(20px);
          animation: glow-pulse 5s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
        }

        .mascot-img-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          z-index: 2;
          animation: float 4.5s ease-in-out infinite, wobble 7s ease-in-out infinite;
          transform-origin: center bottom;
          will-change: transform;
        }

        .mascot-img-wrap.jumping {
          animation: jump 0.7s cubic-bezier(0.36, 0, 0.66, -0.56), wobble 7s ease-in-out infinite;
        }

        .mascot-wrap:hover .mascot-img-wrap {
          animation: float-fast 1.2s ease-in-out infinite, wobble 7s ease-in-out infinite;
        }

        .mascot-wrap:hover .mascot-glow {
          background: radial-gradient(
            circle at center,
            rgba(200, 164, 21, 0.5) 0%,
            rgba(200, 164, 21, 0.2) 30%,
            transparent 65%
          );
        }

        /* Eyelid overlay synced with random blink trigger */
        .blink-mask {
          position: absolute;
          inset: 28% 25% 45% 25%;
          z-index: 3;
          pointer-events: none;
          opacity: 0;
        }
        .blink-mask.blink {
          animation: blink-anim 0.22s ease-in-out;
        }

        /* Speech bubble */
        .bubble {
          position: absolute;
          top: -10%;
          left: 50%;
          transform: translate(-50%, -100%) scale(0.6);
          background: linear-gradient(135deg, #C8A415, #FFE082);
          color: #0a0804;
          font-family: 'Manrope', system-ui, sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.3px;
          padding: 8px 14px;
          border-radius: 999px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          box-shadow: 0 4px 18px rgba(200, 164, 21, 0.35);
          animation: bubble-in 2.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 5;
        }

        .bubble::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 10px;
          height: 10px;
          background: #C8A415;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes float-fast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        @keyframes wobble {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        @keyframes jump {
          0% { transform: translateY(0) scale(1, 1); }
          15% { transform: translateY(0) scale(1.1, 0.85); }
          35% { transform: translateY(-30px) scale(0.92, 1.12); }
          70% { transform: translateY(-15px) scale(1, 1); }
          90% { transform: translateY(0) scale(1.05, 0.92); }
          100% { transform: translateY(0) scale(1, 1); }
        }

        @keyframes blink-anim {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        @keyframes bubble-in {
          0% { opacity: 0; transform: translate(-50%, -90%) scale(0.5); }
          15% { opacity: 1; transform: translate(-50%, -110%) scale(1.05); }
          25% { opacity: 1; transform: translate(-50%, -100%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -100%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -110%) scale(0.85); }
        }

        @media (prefers-reduced-motion: reduce) {
          .mascot-img-wrap,
          .mascot-glow {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className={`mascot-wrap ${className}`}
        onClick={handleClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={(e) => {
          if (interactive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={interactive ? 'Modern Mustard Seed mascot. Click for a greeting.' : 'Modern Mustard Seed mascot'}
      >
        {showGlow && <div className="mascot-glow" />}
        <div className={`mascot-img-wrap ${jumping ? 'jumping' : ''}`}>
          <Image
            src="/mascot.png"
            alt="Modern Mustard Seed mascot"
            width={size}
            height={size}
            priority={priority}
            sizes={`${size}px`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <div
          key={blinks}
          className="blink-mask blink"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 35% 50% at 35% 50%, #0f0c08 0%, #0f0c08 50%, transparent 60%), radial-gradient(ellipse 35% 50% at 65% 50%, #0f0c08 0%, #0f0c08 50%, transparent 60%)',
          }}
        />
        {greeting && <div className="bubble">{greeting}</div>}
      </div>
    </>
  );
}
