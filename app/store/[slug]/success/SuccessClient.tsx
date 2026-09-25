'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackPurchase } from '@/lib/analytics';

type Download = { name: string; url: string };

type DownloadState =
  | { status: 'loading' }
  | { status: 'ready'; downloads: Download[]; email: string | null }
  | { status: 'pending' }
  | { status: 'error'; message: string };

export default function SuccessClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [state, setState] = useState<DownloadState>({ status: 'loading' });

  useEffect(() => {
    if (!sessionId) {
      setState({ status: 'error', message: 'No order ID. Check your email for the download link.' });
      return;
    }
    fetch(`/api/store/download/${sessionId}`)
      .then(async (r) => {
        if (r.status === 402) {
          setState({ status: 'pending' });
          return;
        }
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: 'failed' }));
          setState({ status: 'error', message: err.error || 'Failed to load download.' });
          return;
        }
        const data = (await r.json()) as {
          downloads: Download[];
          customerEmail: string | null;
          amountTotal: number | null;
          currency?: string;
          itemName?: string;
        };
        setState({ status: 'ready', downloads: data.downloads, email: data.customerEmail });
        if (data.amountTotal != null) {
          trackPurchase({
            value: data.amountTotal,
            currency: data.currency,
            id: sessionId ?? undefined,
            itemName: data.itemName,
          });
        }
      })
      .catch(() => setState({ status: 'error', message: 'Network error. Try refreshing.' }));
  }, [sessionId, slug]);

  return (
    <section className="pop-card p-8 md:p-10 mb-12">
      <span className="text-[10px] uppercase tracking-[0.45em] text-[#B92417] font-mono font-bold mb-5 block">
        Your download{state.status === 'ready' && state.downloads.length > 1 ? 's' : ''}
      </span>

      {state.status === 'loading' && (
        <p className="text-[#3a3733] text-sm font-body">Pulling your download link from Stripe…</p>
      )}

      {state.status === 'pending' && (
        <div>
          <p className="text-[#3a3733] text-base font-body leading-relaxed mb-3">
            Payment is still processing. This usually clears in a few seconds. Refresh the page once your email confirmation arrives.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-[11px] uppercase tracking-[0.22em] font-mono font-bold text-[#B92417] hover:text-[#E0301E] transition-colors"
          >
            Refresh →
          </button>
        </div>
      )}

      {state.status === 'error' && (
        <p className="text-[#3a3733] text-sm font-body leading-relaxed">
          {state.message} If you have not received an email within 5 minutes, contact sarah@modernmustardseed.com with your order ID:{' '}
          <code className="text-[#161616] font-bold font-mono text-xs">{sessionId}</code>
        </p>
      )}

      {state.status === 'ready' && (
        <div>
          <div className="space-y-3 mb-5">
            {state.downloads.map((d) => (
              <a
                key={d.name}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 p-5 rounded-xl border-2 border-[#161616] bg-[#FFFDF6] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 hover:bg-[#F5B700] transition-all group"
              >
                <div>
                  <p className="font-display text-base md:text-lg text-[#161616] font-black tracking-tight leading-snug mb-1">
                    {d.name}
                  </p>
                  <p className="text-[#161616]/60 text-[10px] font-mono uppercase tracking-[0.25em]">PDF · 24h signed link</p>
                </div>
                <span className="text-[11px] uppercase tracking-[0.22em] font-mono font-bold text-[#B92417] group-hover:text-[#161616] flex-shrink-0">
                  Download →
                </span>
              </a>
            ))}
          </div>
          <p className="text-[#161616]/60 text-xs font-mono uppercase tracking-[0.22em]">
            Receipt and download links also sent to{' '}
            {state.email ? <span className="text-[#161616] font-bold normal-case">{state.email}</span> : 'your email'}
          </p>
        </div>
      )}
    </section>
  );
}
