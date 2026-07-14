'use client';

import { useState } from 'react';

/**
 * The post-purchase intake: everything we need to turn the demo they toured into
 * THEIR site, and release it within 7 days.
 *
 * It used to be seven text boxes and NO WAY TO SEND A FILE. A buyer could describe
 * their logo but never hand it over, which meant the single most important asset in
 * the build arrived (if at all) as an email attachment Sarah had to shuttle by hand.
 * The uploads are the point of this form now. Everything else is secondary.
 *
 * Saves once; a thank-you state replaces the form. No login, keyed by the Stripe
 * session, so it works straight from the receipt email.
 */

type Asset = { url: string; name: string; kind: 'logo' | 'photo' | 'product' };

const FIELDS: { key: string; label: string; hint: string; placeholder: string; area?: boolean; products?: string[] }[] = [
  { key: 'hours', label: 'Your business hours', hint: 'So the receptionist knows when you are open and the site says the truth.', placeholder: 'Mon-Fri 8-5, Sat 9-noon, closed Sunday' },
  { key: 'services', label: 'What you sell or do', hint: 'The 3-6 things customers actually call about.', placeholder: 'Water heater replacement, drain cleaning, emergency calls...' },
  { key: 'greeting', label: 'How should the phone be answered?', hint: 'The exact first line, in your words.', placeholder: 'Thanks for calling Rico Roofing, this is Rosie, how can I help?', products: ['voice', 'bundle'] },
  { key: 'domain', label: 'Your website domain', hint: 'The one you own. If you do not have one yet, say so and we will get it for you.', placeholder: 'ricoroofing.com', products: ['site', 'bundle'] },
  { key: 'brand', label: 'Look and feel', hint: 'Colors, vibe, anything you love or hate.', placeholder: 'Our trucks are navy and orange. Keep it bold, no cursive.' },
  { key: 'audience', label: 'Who is your customer?', hint: 'Who you want more of, and who you would rather not hear from.', placeholder: 'Homeowners in the valley. Not big commercial jobs.' },
  { key: 'contact', label: 'Best number and email for you', hint: 'Where we send drafts and the go-live word.', placeholder: '(406) 555-0123, rico@gmail.com' },
  { key: 'notes', label: 'Anything else we should know?', hint: 'Optional, but gold when you fill it.', placeholder: 'We are closed the first week of August...', area: true },
];

/** Where they already exist online. This is what we point search engines and AI at. */
const LINKS: { key: string; label: string; placeholder: string }[] = [
  { key: 'gbp', label: 'Google Business Profile', placeholder: 'Paste your Google listing link, or type "help me"' },
  { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/yourbusiness' },
  { key: 'instagram', label: 'Instagram', placeholder: '@yourbusiness' },
];

const inputCls =
  'mt-2 w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[14px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';

function UploadBox({
  title,
  hint,
  kind,
  accept,
  multiple,
  assets,
  hubId,
  sessionId,
  onAdd,
  onRemove,
}: {
  title: string;
  hint: string;
  kind: Asset['kind'];
  accept: string;
  multiple?: boolean;
  assets: Asset[];
  hubId: string;
  sessionId: string;
  onAdd: (a: Asset[]) => void;
  onRemove: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mine = assets.filter((a) => a.kind === kind);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    setErr(null);
    const done: Asset[] = [];
    for (const file of files.slice(0, 8)) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('kind', kind);
        form.append('hubId', hubId);
        form.append('sessionId', sessionId);
        const res = await fetch('/api/demo-order/upload', { method: 'POST', body: form });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.url) throw new Error(j?.error || 'Upload failed');
        done.push({ url: j.url as string, name: file.name, kind });
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : 'That file would not upload. Try a smaller one?');
      }
    }
    if (done.length) onAdd(done);
    setBusy(false);
    e.target.value = '';
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-[#161616]/35 bg-[#FBF6EA] p-4">
      <span className="font-sans text-[12px] uppercase tracking-[0.14em] font-bold text-[#161616]">{title}</span>
      <span className="block font-body text-[12.5px] text-[#161616]/55 mt-0.5">{hint}</span>

      {mine.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {mine.map((a) => (
            <li key={a.url} className="flex items-center justify-between gap-3 rounded-lg bg-white border border-[#161616]/20 px-3 py-1.5">
              <span className="font-body text-[13px] text-[#161616] truncate">{a.name}</span>
              <button
                type="button"
                onClick={() => onRemove(a.url)}
                className="flex-shrink-0 font-sans text-[10px] uppercase tracking-[0.15em] font-bold text-[#E0301E] hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-3 inline-block cursor-pointer">
        <input type="file" accept={accept} multiple={multiple} onChange={pick} disabled={busy} className="hidden" />
        <span className="inline-block rounded-lg border-2 border-[#161616] bg-white px-4 py-2 font-sans text-[11px] uppercase tracking-[0.14em] font-bold text-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">
          {busy ? 'Uploading…' : mine.length ? 'Add another' : 'Choose file'}
        </span>
      </label>
      {err ? <p className="font-body text-[12.5px] text-[#E0301E] mt-2">{err}</p> : null}
    </div>
  );
}

export default function DemoOrderIntake({
  hubId,
  sessionId,
  products,
  business,
}: {
  hubId: string;
  sessionId: string;
  products: string[];
  business: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [assets, setAssets] = useState<Asset[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = FIELDS.filter((f) => !f.products || f.products.some((p) => products.includes(p)));
  const wantsSite = products.includes('site') || products.includes('bundle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/demo-order/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubId, sessionId, answers: values, assets }),
      });
      if (!res.ok) throw new Error('Save hiccuped. Try once more?');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save hiccuped. Try once more?');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mascot.png" alt="" width={72} height={72} className="mx-auto" />
        <h2 className="font-display text-2xl font-bold mt-4">Got it. We are on it.</h2>
        <p className="font-body text-[#161616]/70 mt-2 max-w-md mx-auto">
          Everything lands with Sarah right now, and it is all waiting in your portal too. You get{' '}
          <strong>two free edits</strong> before {business} goes live, and you request them right in the portal.
        </p>
        <a
          href="/portal"
          className="mt-5 inline-block bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-[12px] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
        >
          Open my portal →
        </a>
        <p className="font-body text-[12px] text-[#161616]/45 mt-4">
          Sign in with the email you bought with. No password. Questions any time: (406) 312-1223.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 sm:p-8 space-y-5">
      {/* The files come FIRST. They are the thing that turns a template into their
          brand, and burying them under seven text boxes is how they get skipped. */}
      <div className="space-y-3">
        <div>
          <h3 className="font-display text-xl font-bold text-[#161616]">Send us your stuff</h3>
          <p className="font-body text-[13px] text-[#161616]/60">
            This is what makes it yours instead of a template. Skip anything you do not have and we will build around it.
          </p>
        </div>

        <UploadBox
          title="Your logo"
          hint="Any format you have. A photo of your sign or a truck door works too."
          kind="logo"
          accept="image/*,.pdf,.svg,.ai,.eps"
          assets={assets}
          hubId={hubId}
          sessionId={sessionId}
          onAdd={(a) => setAssets((prev) => [...prev, ...a])}
          onRemove={(url) => setAssets((prev) => prev.filter((x) => x.url !== url))}
        />

        <UploadBox
          title="Photos of your work"
          hint="Real photos beat anything we could make up. Job sites, your team, your storefront, your food. Up to 8."
          kind="photo"
          accept="image/*"
          multiple
          assets={assets}
          hubId={hubId}
          sessionId={sessionId}
          onAdd={(a) => setAssets((prev) => [...prev, ...a])}
          onRemove={(url) => setAssets((prev) => prev.filter((x) => x.url !== url))}
        />

        {wantsSite && (
          <UploadBox
            title="Your products, menu, or price list"
            hint="A menu, a price sheet, a product list. A photo or PDF is fine. We will typeset it properly."
            kind="product"
            accept="image/*,.pdf,.csv,.xlsx,.doc,.docx,.txt"
            multiple
            assets={assets}
            hubId={hubId}
            sessionId={sessionId}
            onAdd={(a) => setAssets((prev) => [...prev, ...a])}
            onRemove={(url) => setAssets((prev) => prev.filter((x) => x.url !== url))}
          />
        )}
      </div>

      <div className="pt-2 space-y-5 border-t-2 border-[#161616]/10">
        {visible.map((f) => (
          <label key={f.key} className="block">
            <span className="font-sans text-[12px] uppercase tracking-[0.14em] font-bold text-[#161616]">{f.label}</span>
            <span className="block font-body text-[12.5px] text-[#161616]/55 mt-0.5">{f.hint}</span>
            {f.area ? (
              <textarea
                rows={3}
                value={values[f.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={`${inputCls} resize-y`}
              />
            ) : (
              <input
                type="text"
                value={values[f.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={inputCls}
              />
            )}
          </label>
        ))}
      </div>

      {/* Where they already exist online. This is the raw material for getting them
          found, by Google and by the AI assistants people now ask instead. */}
      <div className="pt-2 border-t-2 border-[#161616]/10">
        <h3 className="font-display text-xl font-bold text-[#161616]">Where you already are online</h3>
        <p className="font-body text-[13px] text-[#161616]/60 mb-3">
          We link these up so you show up when people search, and when they ask an AI assistant. Leave blank what you do not have.
        </p>
        <div className="space-y-3">
          {LINKS.map((f) => (
            <label key={f.key} className="block">
              <span className="font-sans text-[12px] uppercase tracking-[0.14em] font-bold text-[#161616]">{f.label}</span>
              <input
                type="text"
                value={values[f.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={inputCls}
              />
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-7 py-3.5 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-transform disabled:opacity-60"
      >
        {busy ? 'Sending…' : 'Send it to Sarah →'}
      </button>
      {error ? <p className="font-body text-[13px] text-[#E0301E] text-center">{error}</p> : null}
      <p className="font-body text-[12px] text-[#161616]/45 text-center">
        Skip anything you are unsure about. Sarah confirms every detail personally before go-live.
      </p>
    </form>
  );
}
