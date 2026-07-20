'use client';

import type { VoiceGender } from '@/lib/sidekick-voice';

/**
 * Female / male receptionist voice picker. A tiny segmented control shared by
 * every receptionist demo surface (the forge, the cockpit demo, the on-site
 * widget) so anyone can choose the voice before the call. Purely presentational:
 * the parent holds the chosen gender and injects the matching Vapi voice into
 * the call, so flipping this mid-idle costs nothing.
 *
 * `tone="light"` sits on a light card; `tone="dark"` sits on the ink panels.
 */
export default function VoiceGenderToggle({
  value,
  onChange,
  tone = 'light',
  className = '',
}: {
  value: VoiceGender;
  onChange: (g: VoiceGender) => void;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const opts: { key: VoiceGender; label: string }[] = [
    { key: 'female', label: 'Female voice' },
    { key: 'male', label: 'Male voice' },
  ];
  const dark = tone === 'dark';
  const track = dark ? 'border-[#F5B700]/70 bg-[#161616]' : 'border-[#161616] bg-white';
  const labelColor = dark ? 'text-[#FBF6EA]/60' : 'text-[#161616]/55';

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <span className={`mb-1.5 font-mono text-[9px] uppercase tracking-[0.28em] font-bold ${labelColor}`}>
        Pick the voice
      </span>
      <div role="radiogroup" aria-label="Receptionist voice" className={`inline-flex rounded-full border-2 p-0.5 ${track}`}>
        {opts.map((o) => {
          const on = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.key)}
              className={`rounded-full px-3.5 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                on
                  ? 'bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616]'
                  : dark
                    ? 'text-[#FBF6EA]/70 hover:text-[#FBF6EA]'
                    : 'text-[#161616]/55 hover:text-[#161616]'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
