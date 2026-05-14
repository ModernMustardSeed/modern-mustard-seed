'use client';

import Image from 'next/image';
import { useState } from 'react';

type Props = {
  size?: number;
  className?: string;
  interactive?: boolean;
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
  priority = false,
}: Props) {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [jumping, setJumping] = useState(false);

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

        .mascot-img-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          z-index: 2;
          border-radius: 50%;
          overflow: hidden;
          animation: float 4.5s ease-in-out infinite, wobble 7s ease-in-out infinite;
          transform-origin: center bottom;
          will-change: transform;
        }

        .mascot-img-wrap :global(img) {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center !important;
          transform: scale(1.02);
        }

        .mascot-img-wrap.jumping {
          animation: jump 0.7s cubic-bezier(0.36, 0, 0.66, -0.56), wobble 7s ease-in-out infinite;
        }

        .mascot-wrap:hover .mascot-img-wrap {
          animation: float-fast 1.2s ease-in-out infinite, wobble 7s ease-in-out infinite;
        }

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

        @keyframes jump {
          0% { transform: translateY(0) scale(1, 1); }
          15% { transform: translateY(0) scale(1.1, 0.85); }
          35% { transform: translateY(-30px) scale(0.92, 1.12); }
          70% { transform: translateY(-15px) scale(1, 1); }
          90% { transform: translateY(0) scale(1.05, 0.92); }
          100% { transform: translateY(0) scale(1, 1); }
        }

        @keyframes bubble-in {
          0% { opacity: 0; transform: translate(-50%, -90%) scale(0.5); }
          15% { opacity: 1; transform: translate(-50%, -110%) scale(1.05); }
          25% { opacity: 1; transform: translate(-50%, -100%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -100%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -110%) scale(0.85); }
        }

        @media (prefers-reduced-motion: reduce) {
          .mascot-img-wrap {
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
        <div className={`mascot-img-wrap ${jumping ? 'jumping' : ''}`}>
          <Image
            src="/mascot.png"
            alt="Modern Mustard Seed mascot"
            width={size}
            height={size}
            priority={priority}
            sizes={`${size}px`}
          />
        </div>
        {greeting && <div className="bubble">{greeting}</div>}
      </div>
    </>
  );
}
