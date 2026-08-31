'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { normalizeMailCode } from '@/lib/mailer/code';

export default function CodeEntry() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function go() {
    const code = normalizeMailCode(value);
    if (!code) {
      setError('That is not seven characters. Look under the square on the back of the card.');
      return;
    }
    router.push(`/y/${code}`);
  }

  return (
    <div>
      <label htmlFor="mail-code" className="block text-[11px] uppercase tracking-[0.22em] font-bold text-[#161616]/55 mb-2">
        Card code
      </label>
      <div className="flex gap-3">
        <input
          id="mail-code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go();
          }}
          maxLength={12}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="K7HFM2Q"
          className="flex-1 min-w-0 bg-white border-2 border-[#161616] px-4 py-3.5 text-2xl font-black tracking-[0.18em] uppercase placeholder:text-[#161616]/25 placeholder:tracking-[0.18em] focus:outline-none focus:ring-4 focus:ring-[#F5B700]/45"
        />
        <button
          type="button"
          onClick={go}
          className="bg-[#F5B700] text-[#161616] border-2 border-[#161616] px-6 font-extrabold text-sm uppercase tracking-[0.14em] transition-transform hover:-translate-y-0.5 shrink-0"
          style={{ boxShadow: '5px 5px 0 0 #161616' }}
        >
          Go
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-[#B91C1C] font-semibold leading-snug">
          {error}
        </p>
      ) : null}
    </div>
  );
}
