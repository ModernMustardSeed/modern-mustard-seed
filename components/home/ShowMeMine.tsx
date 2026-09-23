'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '@/lib/analytics';
import { PREVIEW } from '@/data/preview-promise';

/**
 * "Show me mine." Paste a website on the homepage and the intake opens right
 * there: the few details the Demo Station needs, plus a site or two to match
 * the style of. It posts to /api/demo-station, the same pipeline as /demos: the
 * voice agent opens at once, the website is queued to the build floor, the
 * presence audit rides along, and the welcome and suite-ready emails go out.
 *
 * The modal follows the house rule for overlays: a height-capped flex column,
 * pinned header, scrolling body, so its top never clips on a short screen.
 */

const NICHES = [
  { value: 'home_service', label: 'Home services (roofing, plumbing, HVAC...)' },
  { value: 'restaurant', label: 'Restaurant / food' },
  { value: 'dental_medspa', label: 'Dental / medical / medspa' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'other', label: 'Something else' },
];

type Phase = 'form' | 'sending' | 'done' | 'error';
const SITE_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i;
const tidy = (u: string) => u.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');

export default function ShowMeMine({ className }: { className: string }) {
  const [site, setSite] = useState('');
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, string>>({ niche: 'home_service' });
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState('');
  const [hub, setHub] = useState('');
  const first = useRef<HTMLInputElement | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const siteOk = SITE_RE.test(tidy(site));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'sending') { setOpen(false); return; }
      // Keep Tab inside the dialog while it is open.
      if (e.key !== 'Tab' || !dialog.current) return;
      const items = [...dialog.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([type=hidden]):not([tabindex="-1"]), select, textarea')].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (phase === 'form') first.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, phase]);

  // Focus goes back to whatever opened the dialog when it closes.
  useEffect(() => {
    if (open) return;
    opener.current?.focus();
    opener.current = null;
  }, [open]);

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteOk) return;
    trackEvent('show_me_mine', { location: 'home' });
    opener.current = document.activeElement as HTMLElement | null;
    setPhase('form');
    setError('');
    setOpen(true);
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === 'sending') return;
    setPhase('sending');
    setError('');
    const style = [v.style1, v.style2].map((s) => tidy(s || '')).filter(Boolean).join(', ');
    try {
      const res = await fetch('/api/demo-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: v.business, name: v.name, email: v.email, phone: v.phone,
          niche: v.niche, website: tidy(site), style_refs: style, notes: v.notes, company_url: v.company_url,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; message?: string };
      if (data.ok && data.url) {
        setHub(data.url);
        setPhase('done');
        trackEvent('show_me_mine_submit', { niche: v.niche || 'other' });
        return;
      }
      setPhase('error');
      setError(data.message || 'That did not go through. Try again, or call us at (406) 312-1223.');
    } catch {
      setPhase('error');
      setError('That did not go through. Try again, or call us at (406) 312-1223.');
    }
  };

  const field = 'mt-1.5 w-full border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 text-[15px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';
  const label = 'text-[11px] font-bold uppercase tracking-[0.14em] text-[#161616]';

  return (
    <>
      <form onSubmit={start} className={className}>
        <label>
          <span className="sr-only">Your website</span>
          <input type="text" inputMode="url" autoComplete="url" spellCheck={false} value={site} onChange={(e) => setSite(e.target.value)} placeholder="yourbusiness.com" />
        </label>
        <button type="submit" disabled={!siteOk}>Show Me Mine <span aria-hidden="true">↗</span></button>
      </form>

      {open && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#080c16]/70 p-4" onClick={(e) => { if (e.target === e.currentTarget && phase !== 'sending') setOpen(false); }}>
          <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="smm-title" className="flex max-h-[90vh] w-full max-w-[560px] flex-col border-[3px] border-[#161616] bg-white text-[#161616] shadow-[10px_10px_0_0_#F5B700]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-[#161616] bg-[#F5B700] px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Show me mine · {tidy(site)}</p>
                <h2 id="smm-title" className="mt-1.5 text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em]">
                  {phase === 'done' ? 'It’s happening.' : 'Let’s build yours.'}
                </h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={phase === 'sending'} aria-label="Close" className="h-9 w-9 shrink-0 border-2 border-[#161616] bg-white text-xl leading-none text-[#161616]">×</button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              {phase === 'done' ? (
                <div aria-live="polite">
                  <p className="text-[16px] leading-relaxed">
                    Your website preview is being sketched from scratch, and it lands at your private hub <strong>within 24 hours</strong>, with a free audit of your current site, Google profile and reviews. We email you the moment it is ready.</p>
                  <p className="mt-4 border-l-4 border-[#F5B700] pl-4 text-[14px] leading-relaxed text-[#42454a]"><strong className="text-[#161616]">{PREVIEW.eyebrow}.</strong> {PREVIEW.body}
                  </p>
                  <a href={hub} className="mt-6 flex min-h-[54px] items-center justify-center gap-3 border-2 border-[#161616] bg-[#161616] px-6 text-[15px] font-bold text-[#FBF6EA] shadow-[5px_5px_0_0_#F5B700]">
                    Open my demo hub <span aria-hidden="true" className="text-[#F5B700]">↗</span>
                  </a>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <p className="text-[14px] leading-relaxed text-[#42454a]">
                    Free, in your look, within 24 hours, with a free audit of what you have now. No card, no meeting. {PREVIEW.short}
                  </p>
                  <label className="mt-5 block"><span className={label}>Business name <span className="text-[#b92417]">*</span></span>
                    <input ref={first} required value={v.business || ''} onChange={set('business')} placeholder="Rico Roofing" className={field} /></label>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className={label}>Your name <span className="text-[#b92417]">*</span></span>
                      <input required value={v.name || ''} onChange={set('name')} placeholder="Rico Alvarez" autoComplete="name" className={field} /></label>
                    <label className="block"><span className={label}>Email <span className="text-[#b92417]">*</span></span>
                      <input required type="email" value={v.email || ''} onChange={set('email')} placeholder="rico@gmail.com" autoComplete="email" className={field} /></label>
                    <label className="block"><span className={label}>Business phone <span className="text-[#b92417]">*</span></span>
                      <input required type="tel" value={v.phone || ''} onChange={set('phone')} placeholder="(406) 555-0134" autoComplete="tel" className={field} /></label>
                    <label className="block"><span className={label}>Kind of business</span>
                      <select value={v.niche} onChange={set('niche')} className={field}>{NICHES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}</select></label>
                  </div>
                  <fieldset className="mt-5">
                    <legend className={label}>A favorite site or two to style-match</legend>
                    <p className="mt-1 text-[12px] text-[#5b5d61]">Optional. We match the feel, never copy the content.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input value={v.style1 || ''} onChange={set('style1')} placeholder="asiteyoulove.com" aria-label="First site to style-match" className={field} />
                      <input value={v.style2 || ''} onChange={set('style2')} placeholder="anotherone.com" aria-label="Second site to style-match" className={field} />
                    </div>
                  </fieldset>
                  <label className="mt-5 block"><span className={label}>What should it do for you?</span>
                    <textarea rows={3} maxLength={600} value={v.notes || ''} onChange={set('notes')} placeholder="The jobs you want more of, what you want to be known for, anything you hate about your current site." className={`${field} resize-y leading-relaxed`} /></label>
                  <input type="text" tabIndex={-1} autoComplete="off" value={v.company_url || ''} onChange={set('company_url')} className="hidden" aria-hidden />
                  <p className="mt-4 text-[12px] leading-relaxed text-[#5b5d61]">Your phone number goes on your preview site, and it is how we reach you about the build. Nobody calls unless you ask.</p>
                  <button type="submit" disabled={phase === 'sending'} className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-3 border-2 border-[#161616] bg-[#F5B700] text-[15px] font-extrabold shadow-[5px_5px_0_0_#161616] disabled:opacity-60">
                    {phase === 'sending' ? 'Starting your build…' : <>Build mine, free <span aria-hidden="true">↗</span></>}
                  </button>
                  {phase === 'error' && <p role="alert" className="mt-3 text-center text-[13px] font-bold text-[#b92417]">{error}</p>}
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
