'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewFeedback({ id, reviewKey, slug }: { id: string; reviewKey: string; slug?: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  return <form className="mt-4 space-y-3" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true); setMessage(''); setFailed(false);
    try {
      const res = await fetch(`/api/white-label/review/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ k: reviewKey, slug, feedback }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Please retry your change request.');
      setMessage('Saved. Your agency and delivery team can see this request. Changes are included.'); setFeedback(''); router.refresh();
    } catch (err) { setFailed(true); setMessage(err instanceof Error ? err.message : 'Your request was not saved. Please retry.'); }
    finally { setBusy(false); }
  }}>
    <label className="block text-sm font-semibold">What should change?
      <textarea required minLength={10} maxLength={3000} value={feedback} onChange={(e) => setFeedback(e.target.value)} className="mt-2 block min-h-28 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm font-normal text-neutral-900 focus:outline-2 focus:outline-neutral-900" placeholder="Name the page or step, what happens now, and what you want instead." />
    </label>
    <button disabled={busy} className="min-h-11 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving request' : 'Request changes'}</button>
    {message && <p role={failed ? 'alert' : 'status'} className={`text-sm ${failed ? 'text-red-700' : 'text-green-800'}`}>{message}</p>}
  </form>;
}
